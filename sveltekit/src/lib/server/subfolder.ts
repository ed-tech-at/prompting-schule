import { env } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';

/**
 * Laufzeit-Basispfad aus der ENV-Variable SUBFOLDER.
 * Normalisiert wie svelte.config.js: führende/abschließende Slashes entfernt.
 * Ergibt z. B. "/prompting-schule" oder "" (kein Subfolder).
 */
export function getBasePath(): string {
  const s = env.SUBFOLDER?.trim().replace(/^\/+|\/+$/g, '');
  return s ? `/${s}` : '';
}

/** Cookie-Path: "/prompting-schule" bzw. "/" ohne Subfolder. */
export function getCookiePath(): string {
  return getBasePath() || '/';
}

/** withBase('/profil') → "/prompting-schule/profil" */
export function withBase(path: string): string {
  return getBasePath() + (path.startsWith('/') ? path : `/${path}`);
}

/**
 * Absolute URL inkl. Subfolder, z. B. für OIDC redirect_uri.
 * Origin kommt aus PUBLIC_APP_URL (nur Origin, Pfad wird ignoriert),
 * sonst aus dem Request – hinter einem Proxy ohne ORIGIN/PROTOCOL_HEADER
 * wäre url.origin meist http://…, daher PUBLIC_APP_URL bevorzugen.
 */
export function absoluteUrl(path: string, requestUrl: URL): string {
  let origin = requestUrl.origin;
  if (envPublic.PUBLIC_APP_URL) {
    try {
      origin = new URL(envPublic.PUBLIC_APP_URL).origin;
    } catch {
      /* ungültige PUBLIC_APP_URL → Request-Origin */
    }
  }
  return origin + withBase(path);
}
