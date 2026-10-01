import type { RequestHandler } from './$types';
import { getOIDC, getPostLogoutRedirect } from '$lib/sso/oidc';
import { env as envPrivate } from '$env/dynamic/private';
import { getCookiePath } from '$lib/server/subfolder';

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

    // Clear session cookie – same path as it was set with (see pw.ts)
    cookies.delete('jwt', { path: getCookiePath() });

    // Build logout URL
    const OIDC = await getOIDC();
    const u = new URL(OIDC.end_session_endpoint);

    u.searchParams.set('client_id', envPrivate.KEYCLOAK_CLIENT_ID ?? '');
    if (id_token_hint) u.searchParams.set('id_token_hint', id_token_hint);

    u.searchParams.set('post_logout_redirect_uri', normalizeRedirect(getPostLogoutRedirect(url)));

    // Redirect to Keycloak logout
    return new Response(null, { status: 302, headers: { Location: u.toString() } });
};
