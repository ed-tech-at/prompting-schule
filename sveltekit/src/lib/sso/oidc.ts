// src/lib/oidc.ts
// =======================================
// 🔐 OpenID Connect (Keycloak) Configuration
// =======================================

import { env as envPrivate } from '$env/dynamic/private';
import { env as envPublic } from '$env/dynamic/public';

// ---------------------------------------
// Discovery Support (recommended)
// Loads dynamic endpoints from the OIDC discovery document at:
//   https://auth-test.tugraz.at/auth/realms/tugraz/.well-known/openid-configuration
// ---------------------------------------

export type OIDCConfig = {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint: string;
    end_session_endpoint?: string;
    jwks_uri: string;
};

let cached: OIDCConfig | null = null;

export function hasOIDCConfig() {
    return Boolean(envPrivate.KEYCLOAK_ISSUER);
}

/**
 * Loads the OIDC configuration once from the issuer’s discovery endpoint.
 * Caches the result for all subsequent calls.
 */
export async function getOIDC(): Promise<OIDCConfig> {
    if (cached) return cached;

    if (!envPrivate.KEYCLOAK_ISSUER) {
        throw new Error('OIDC is not configured: KEYCLOAK_ISSUER is missing');
    }

    const res = await fetch(`${envPrivate.KEYCLOAK_ISSUER}/.well-known/openid-configuration`);
    if (!res.ok) {
        throw new Error(`OIDC discovery failed: ${res.status}`);
    }

    const conf = await res.json();

    // If Keycloak does not return the logout endpoint, derive it manually
    if (!conf.end_session_endpoint) {
        conf.end_session_endpoint = `${envPrivate.KEYCLOAK_ISSUER}/protocol/openid-connect/logout`;
    }

    cached = conf;
    return cached;
}

// ---------------------------------------
// Helper functions for PKCE + OAuth state
// ---------------------------------------

/**
 * Encodes a byte array into Base64 URL-safe format.
 * Used for PKCE verifier/challenge encoding.
 */
export function b64url(bytes: Uint8Array) {
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

/**
 * Calculates the SHA-256 hash of a string input.
 * Used to derive the PKCE code challenge.
 */
export async function sha256(input: string) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
}

/**
 * Generates a PKCE verifier and its corresponding code challenge.
 * Returns both as URL-safe Base64 strings.
 */
export async function makePKCE() {
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64url(await sha256(verifier));
    return { verifier, challenge };
}

/**
 * Generates a random OAuth 2.0 state value.
 * Used to prevent CSRF attacks during the login redirect flow.
 */
export function randomState() {
    return b64url(crypto.getRandomValues(new Uint8Array(16)));
}

// ---------------------------------------
// Debug Output
// ---------------------------------------
console.log('OIDC DEBUG', {
    issuer: envPrivate.KEYCLOAK_ISSUER,
    client_id: envPrivate.KEYCLOAK_CLIENT_ID,
    redirect_uri: envPublic.PUBLIC_REDIRECT_URI
});
