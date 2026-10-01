import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  priv: { SUBFOLDER: '' as string | undefined },
  pub: { PUBLIC_APP_URL: '' as string | undefined }
}));

vi.mock('$env/dynamic/private', () => ({ env: mocks.priv }));
vi.mock('$env/dynamic/public', () => ({ env: mocks.pub }));

import { absoluteUrl, getBasePath, getCookiePath, withBase } from './subfolder';

const req = new URL('http://localhost:3000/prompting-schule/login-sso/start-login');

beforeEach(() => {
  mocks.priv.SUBFOLDER = '';
  mocks.pub.PUBLIC_APP_URL = '';
});

describe('subfolder helpers', () => {
  it('returns root paths when SUBFOLDER is empty', () => {
    expect(getBasePath()).toBe('');
    expect(getCookiePath()).toBe('/');
    expect(withBase('/profil')).toBe('/profil');
    expect(absoluteUrl('/login-sso/callback', req)).toBe('http://localhost:3000/login-sso/callback');
  });

  it('prefixes paths with the normalized subfolder', () => {
    mocks.priv.SUBFOLDER = ' /prompting-schule/ ';
    expect(getBasePath()).toBe('/prompting-schule');
    expect(getCookiePath()).toBe('/prompting-schule');
    expect(withBase('/profil')).toBe('/prompting-schule/profil');
    expect(withBase('kurse')).toBe('/prompting-schule/kurse');
  });

  it('uses the origin of PUBLIC_APP_URL and ignores its path', () => {
    mocks.priv.SUBFOLDER = 'prompting-schule';
    mocks.pub.PUBLIC_APP_URL = 'https://flaait-test.tugraz.at/prompting-schule';
    expect(absoluteUrl('/login-sso/callback', req)).toBe(
      'https://flaait-test.tugraz.at/prompting-schule/login-sso/callback'
    );
    expect(absoluteUrl('/', req)).toBe('https://flaait-test.tugraz.at/prompting-schule/');
  });

  it('falls back to the request origin when PUBLIC_APP_URL is invalid', () => {
    mocks.priv.SUBFOLDER = 'prompting-schule';
    mocks.pub.PUBLIC_APP_URL = 'not a url';
    expect(absoluteUrl('/', req)).toBe('http://localhost:3000/prompting-schule/');
  });
});
