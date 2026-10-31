import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  bcryptCompare: vi.fn(),
  env: {
    SERVER_PW_SALT: 'test-salt',
    SERVER_PW_PEPPER: 'test-pepper',
    JWT_SECRET: 'test-jwt-secret',
    SUBFOLDER: ''
  } as Record<string, string | undefined>
}));

vi.mock('$lib/server/db', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: vi.fn(),
      create: mocks.create
    }
  }
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: vi.fn()
  }
}));

vi.mock('$env/dynamic/private', () => ({ env: mocks.env }));

import { login, loginSso, register } from './pw';

beforeEach(() => {
  vi.clearAllMocks();
  delete mocks.env.KEYCLOAK_CLIENT_SECRET;
});

describe('blocked account login', () => {
  const blockedUser = {
    id: 'blocked-user',
    email: 'blocked@example.at',
    password: 'hash',
    isAdmin: 0,
    cryptVersion: 2,
    isDeleted: 0,
    blockedAt: new Date(),
    createdAt: new Date()
  };

  it('prevents a new local login before checking the password', async () => {
    mocks.findUnique.mockResolvedValue(blockedUser);

    const response = await login(blockedUser.email, 'valid-password');

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Dieses Benutzerkonto ist gesperrt.'
    });
    expect(mocks.bcryptCompare).not.toHaveBeenCalled();
  });

  it('prevents a new SSO login for an existing blocked account', async () => {
    mocks.findFirst.mockResolvedValue({
      ...blockedUser,
      cryptVersion: 3,
      password: 'external-subject'
    });

    const response = await loginSso({
      preferred_username: 'external-subject',
      given_name: 'Blocked',
      family_name: 'User',
      email: blockedUser.email
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Dieses Benutzerkonto ist gesperrt.'
    });
  });
});

describe('SSO-only mode', () => {
  beforeEach(() => {
    mocks.env.KEYCLOAK_CLIENT_SECRET = 'test-client-secret';
  });

  it('rejects local password registration', async () => {
    const response = await register('outsider@example.test', 'pw');

    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('rejects local password login', async () => {
    const response = await login('someone@example.test', 'pw');

    expect(response.status).toBe(403);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it('answers a first SSO login with a taken email in a controlled way', async () => {
    mocks.findFirst.mockResolvedValue(null);
    mocks.findUnique.mockResolvedValue({ id: 'local', email: 'victim@uni.test', cryptVersion: 2 });

    const response = await loginSso({
      preferred_username: 'victim',
      given_name: 'V',
      family_name: 'Ictim',
      email: 'victim@uni.test'
    });

    expect(response.status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
