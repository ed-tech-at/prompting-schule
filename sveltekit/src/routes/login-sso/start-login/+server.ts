import type { RequestHandler } from './$types';
import { getOIDC, getRedirectUri, makePKCE, randomState } from '$lib/sso/oidc';
import { env as envPrivate } from '$env/dynamic/private';
import { getCookiePath } from '$lib/server/subfolder';

export const GET: RequestHandler = async ({ cookies, url }) => {
    // Generate PKCE values (verifier + challenge)
    const { verifier, challenge } = await makePKCE();
    const state = randomState();

    const path = getCookiePath();

    // Store temporary cookies for PKCE + state
    cookies.set('pkce_verifier', verifier, {
        httpOnly: true, sameSite: 'lax', secure: true,
        path, maxAge: 600
    });
    cookies.set('oauth_state', state, {
        httpOnly: true, sameSite: 'lax', secure: true,
        path, maxAge: 600
    });

    // Build authorization request URL
    const OIDC = await getOIDC();
    const u = new URL(OIDC.authorization_endpoint);
    u.searchParams.set('client_id', envPrivate.KEYCLOAK_CLIENT_ID ?? '');
    u.searchParams.set('redirect_uri', getRedirectUri(url));
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('scope', 'openid profile email');
    u.searchParams.set('code_challenge', challenge);
    u.searchParams.set('code_challenge_method', 'S256');
    u.searchParams.set('state', state);

    console.log('AUTH URL →', u.toString());

    // Redirect user to Keycloak login page
    return new Response(null, { status: 302, headers: { Location: u.toString() } });
};
