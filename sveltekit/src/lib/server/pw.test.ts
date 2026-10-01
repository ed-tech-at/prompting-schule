import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  bcryptCompare: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: mocks.bcryptCompare,
    hash: vi.fn()
  }
}));

vi.mock('$env/dynamic/private', () => ({
  env: {
    SERVER_PW_SALT: 'test-salt',
    SERVER_PW_PEPPER: 'test-pepper',
    JWT_SECRET: 'test-jwt-secret',
    SUBFOLDER: ''
  }
}));

import { login, loginSso } from './pw';

beforeEach(() => {
  vi.clearAllMocks();
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
