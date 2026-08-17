import type { RequestHandler } from './$types';
import { getOIDC } from '$lib/sso/oidc';
import { env as envPublic } from '$env/dynamic/public';
// import { PUBLIC_POST_LOGOUT_REDIRECT } from '$env/static/public';
// import { KEYCLOAK_CLIENT_ID } from '$env/static/private';
import { env as envPrivate } from '$env/dynamic/private';
import { resolve } from '$app/paths';

function normalizeRedirect(u: string) {
    const url = new URL(u);
    url.hostname = url.hostname.replace(/\.$/, '');
    if (!url.pathname.endsWith('/')) url.pathname += '/';
    return url.toString();
}

export const GET: RequestHandler = async ({ url, cookies }) => {
    // Read the current session and extract id_token_hint if available
    const raw = cookies.get('jwt');
    let id_token_hint: string | undefined;
    if (raw) {
        try {
            id_token_hint = JSON.parse(raw).id_token;
        } catch {}
    }

    // Clear session cookie
    cookies.delete('jwt', { path: resolve('/') });

    // Build logout URL
    const OIDC = await getOIDC();
    const u = new URL(OIDC.end_session_endpoint);

    u.searchParams.set('client_id', envPrivate.KEYCLOAK_CLIENT_ID);
    if (id_token_hint) u.searchParams.set('id_token_hint', id_token_hint);

    let redirect = normalizeRedirect(envPublic.PUBLIC_POST_LOGOUT_REDIRECT);
    u.searchParams.set('post_logout_redirect_uri', redirect);

    console.log('ENV', envPublic.PUBLIC_POST_LOGOUT_REDIRECT);
    console.log('HOST', url.origin);

    // Redirect to Keycloak logout
    return new Response(null, { status: 302, headers: { Location: u.toString() } });
};
