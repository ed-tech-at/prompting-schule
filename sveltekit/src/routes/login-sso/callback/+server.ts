import type { RequestHandler } from './$types';
import { getOIDC, getRedirectUri } from '$lib/sso/oidc';
import { env as envPrivate } from '$env/dynamic/private';
import { loginSso } from '$lib/server/pw';
import { getCookiePath } from '$lib/server/subfolder';

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
    // Read OAuth parameters from the redirect callback
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const expectedState = cookies.get('oauth_state');
    const verifier = cookies.get('pkce_verifier');

    // Validate OAuth state and PKCE verifier
    if (!code || !state || !verifier || state !== expectedState) {
        return new Response('Invalid OAuth state', { status: 400 });
    }

    // Load OIDC discovery info
    const OIDC = await getOIDC();

    // Build token request – redirect_uri must match start-login byte for byte
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(url),
        client_id: envPrivate.KEYCLOAK_CLIENT_ID ?? '',
        code_verifier: verifier
    });
    if (envPrivate.KEYCLOAK_CLIENT_SECRET) body.set('client_secret', envPrivate.KEYCLOAK_CLIENT_SECRET);

    // Exchange authorization code for tokens
    const tokenRes = await fetch(OIDC.token_endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
    });

    if (!tokenRes.ok) {
        console.error('Token exchange failed', tokenRes.status, await tokenRes.text());
        return new Response('Token exchange failed', { status: 401 });
    }

    const tokens = await tokenRes.json();

    // Retrieve user info
    const meRes = await fetch(OIDC.userinfo_endpoint, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    if (!meRes.ok) return new Response('Userinfo failed', { status: 401 });
    const user = await meRes.json();

    // Clean up temporary PKCE and state cookies
    const path = getCookiePath();
    try {
        cookies.delete('pkce_verifier', { path });
        cookies.delete('oauth_state', { path });
        if (path !== '/') {
            cookies.delete('pkce_verifier', { path: '/' });
            cookies.delete('oauth_state', { path: '/' });
        }
    } catch (e) {
        console.warn('Failed to delete PKCE/state cookies:', e);
    }

    // Creates/updates the local user, sets the jwt cookie and redirects to /profil
    return loginSso(user);
};
