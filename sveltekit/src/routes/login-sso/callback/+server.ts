import type { RequestHandler } from './$types';
import { getOIDC } from '$lib/sso/oidc';
import {
    // KEYCLOAK_CLIENT_ID,
    // KEYCLOAK_CLIENT_SECRET,
    env as envPrivate
    // SESSION_JWT_SECRET
} from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';
import { resolve } from '$app/paths';

import { loginSso } from '$lib/server/pw';
import { env } from '$env/dynamic/private';

// import { SignJWT } from 'jose';

const enc = new TextEncoder();
// const jwtSecret = enc.encode(SESSION_JWT_SECRET);

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

    // Build token request
    const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: envPublic.PUBLIC_REDIRECT_URI,
        client_id: envPrivate.KEYCLOAK_CLIENT_ID,
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


    // const maxAge = tokens.expires_in ?? 3600;
    const maxAge = 3600;


    const SUBFOLDER = env.SUBFOLDER ?? "";

    const path = "/" + SUBFOLDER;

    try {
        cookies.delete('pkce_verifier', { path: path });
        cookies.delete('oauth_state', { path: path });
        if (path !== '/') {
            cookies.delete('pkce_verifier', { path: '/' });
            cookies.delete('oauth_state', { path: '/' });
        }
    } catch (e) {
        console.warn('Failed to delete PKCE/state cookies:', e);
    }

    return loginSso(user);
    
    return new Response(null, {
        status: 302,
        headers: { Location: resolve('/profil') }
    });

    // Create signed JWT session cookie
    const jwt = await new SignJWT({
        user,
        // id_token: tokens.id_token,
        // access_token: tokens.access_token,
        // refresh_token: tokens.refresh_token,
        // iss: 'app',
        // aud: KEYCLOAK_CLIENT_ID
    })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(user.sub ?? user.preferred_username ?? user.email ?? 'user')
        .setIssuedAt()
        // pass expiration as a relative time string (e.g. "3600s") so jose sets exp = now + maxAge
        .setExpirationTime(`${maxAge}s`)
        .sign(jwtSecret);

    cookies.set('jwt', jwt, {
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
        path: resolve('/'),
        maxAge
    });

    // Clean up temporary PKCE and state cookies
    const basePath = resolve('/');
    try {
        cookies.delete('pkce_verifier', { path: basePath });
        cookies.delete('oauth_state', { path: basePath });
        if (basePath !== '/') {
            cookies.delete('pkce_verifier', { path: '/' });
            cookies.delete('oauth_state', { path: '/' });
        }
    } catch (e) {
        console.warn('Failed to delete PKCE/state cookies:', e);
    }

    // Redirect to app root
    return new Response(null, {
        status: 302,
        headers: { Location: resolve('/') }
    });
};
