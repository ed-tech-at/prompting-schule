import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  priv: { SUBFOLDER: 'prompting-schule' as string | undefined, KEYCLOAK_ISSUER: 'https://idp.example/realms/x' },
  pub: {
    PUBLIC_APP_URL: 'https://flaait-test.tugraz.at/prompting-schule' as string | undefined,
    PUBLIC_REDIRECT_URI: undefined as string | undefined,
    PUBLIC_POST_LOGOUT_REDIRECT: undefined as string | undefined
  }
}));

vi.mock('$env/dynamic/private', () => ({ env: mocks.priv }));
vi.mock('$env/dynamic/public', () => ({ env: mocks.pub }));

import { getPostLogoutRedirect, getRedirectUri } from './oidc';

const req = new URL('http://localhost:3000/prompting-schule/login-sso/start-login');

beforeEach(() => {
  mocks.pub.PUBLIC_REDIRECT_URI = undefined;
  mocks.pub.PUBLIC_POST_LOGOUT_REDIRECT = undefined;
});

describe('OIDC redirect URIs', () => {
  it('derives redirect_uri from PUBLIC_APP_URL origin + SUBFOLDER', () => {
    expect(getRedirectUri(req)).toBe('https://flaait-test.tugraz.at/prompting-schule/login-sso/callback');
    expect(getPostLogoutRedirect(req)).toBe('https://flaait-test.tugraz.at/prompting-schule/');
  });

  it('lets explicit env vars override the derived values', () => {
    mocks.pub.PUBLIC_REDIRECT_URI = 'https://other.example/cb';
    mocks.pub.PUBLIC_POST_LOGOUT_REDIRECT = 'https://other.example/bye';
    expect(getRedirectUri(req)).toBe('https://other.example/cb');
    expect(getPostLogoutRedirect(req)).toBe('https://other.example/bye');
  });
});
