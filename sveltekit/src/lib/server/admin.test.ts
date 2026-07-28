import type { Cookies } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  requireLogin: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique
    },
    adminAuditLog: {
      create: vi.fn()
    }
  }
}));

vi.mock('$lib/server/jwt', () => ({
  requireLogin: mocks.requireLogin
}));

import {
  generateManagedPassword,
  MAX_MANAGED_PASSWORD_LENGTH,
  MIN_MANAGED_PASSWORD_LENGTH,
  requireAdminManager,
  requireManageableTarget,
  validateManagedPassword
} from './admin';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('managed passwords', () => {
  it('generates a 20 character password with all required character groups', () => {
    const password = generateManagedPassword();

    expect(password).toHaveLength(20);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
    expect(password).toMatch(/[!@#$%&*+\-=?]/);
  });

  it('rejects passwords outside the configured length limits', () => {
    expect(validateManagedPassword('a'.repeat(MIN_MANAGED_PASSWORD_LENGTH - 1))).toContain(
      'mindestens'
    );
    expect(validateManagedPassword('a'.repeat(MIN_MANAGED_PASSWORD_LENGTH))).toBeNull();
    expect(validateManagedPassword('a'.repeat(MAX_MANAGED_PASSWORD_LENGTH + 1))).toContain(
      'höchstens'
    );
  });
});

describe('admin authorization', () => {
  const cookies = {} as Cookies;
  const actor = {
    id: 'manager',
    email: 'manager@example.at',
    isAdmin: 6
  };

  it('checks the current database role instead of trusting a stale JWT role', async () => {
    mocks.requireLogin.mockReturnValue({
      id: actor.id,
      email: actor.email,
      isAdmin: 99
    });
    mocks.findUnique.mockResolvedValue({
      ...actor,
      isAdmin: 5,
      isDeleted: 0,
      blockedAt: null
    });

    await expect(requireAdminManager(cookies)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects blocked managers', async () => {
    mocks.requireLogin.mockReturnValue(actor);
    mocks.findUnique.mockResolvedValue({
      ...actor,
      isDeleted: 0,
      blockedAt: new Date()
    });

    await expect(requireAdminManager(cookies)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects self-management and targets on the same role level', async () => {
    mocks.findUnique.mockResolvedValueOnce({
      ...actor,
      password: 'hash',
      cryptVersion: 2,
      isDeleted: 0,
      blockedAt: null,
      createdAt: new Date()
    });
    await expect(requireManageableTarget(actor, actor.id)).rejects.toMatchObject({ status: 403 });

    mocks.findUnique.mockResolvedValueOnce({
      id: 'peer',
      email: 'peer@example.at',
      password: 'hash',
      cryptVersion: 2,
      isAdmin: 6,
      isDeleted: 0,
      blockedAt: null,
      createdAt: new Date()
    });
    await expect(requireManageableTarget(actor, 'peer')).rejects.toMatchObject({ status: 403 });
  });
});
