import type { Cookies } from '@sveltejs/kit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  requireLogin: vi.fn(),
  auditCreate: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique
    },
    adminAuditLog: {
      create: mocks.auditCreate
    }
  }
}));

vi.mock('$lib/server/jwt', () => ({
  requireLogin: mocks.requireLogin
}));

import { EDITOR_LEVEL, reorderSwap, requireEditor, writeEditorAuditLog } from './editor';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('editor authorization', () => {
  const cookies = {} as Cookies;

  function mockActor(overrides: Record<string, unknown>) {
    const actor = {
      id: 'editor',
      email: 'editor@example.at',
      isAdmin: EDITOR_LEVEL,
      isDeleted: 0,
      blockedAt: null,
      ...overrides
    };
    mocks.requireLogin.mockReturnValue({
      id: actor.id,
      email: actor.email,
      isAdmin: actor.isAdmin
    });
    mocks.findUnique.mockResolvedValue(actor);
  }

  it.each([5, 6, 7])('allows role level %i', async (isAdmin) => {
    mockActor({ isAdmin });

    await expect(requireEditor(cookies)).resolves.toMatchObject({ isAdmin });
  });

  it('rejects role level 4', async () => {
    mockActor({ isAdmin: 4 });

    await expect(requireEditor(cookies)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects blocked accounts', async () => {
    mockActor({ blockedAt: new Date() });

    await expect(requireEditor(cookies)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects deleted accounts', async () => {
    mockActor({ isDeleted: 1 });

    await expect(requireEditor(cookies)).rejects.toMatchObject({ status: 403 });
  });
});

describe('writeEditorAuditLog', () => {
  it('stores an empty target user id and the given metadata', async () => {
    await writeEditorAuditLog({
      actorUserId: 'editor',
      action: 'COURSE_UPDATED',
      outcome: 'SUCCESS',
      metadata: { entityType: 'course', courseId: 7 }
    });

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: {
        actorUserId: 'editor',
        targetUserId: '',
        action: 'COURSE_UPDATED',
        outcome: 'SUCCESS',
        metadata: { entityType: 'course', courseId: 7 }
      }
    });
  });
});

describe('reorderSwap', () => {
  const items = [{ id: 10 }, { id: 20 }, { id: 30 }];

  it('swaps an item with its predecessor and renumbers from 1', () => {
    expect(reorderSwap(items, 20, 'up')).toEqual([
      { id: 20, position: 1 },
      { id: 10, position: 2 },
      { id: 30, position: 3 }
    ]);
  });

  it('swaps an item with its successor', () => {
    expect(reorderSwap(items, 20, 'down')).toEqual([
      { id: 10, position: 1 },
      { id: 30, position: 2 },
      { id: 20, position: 3 }
    ]);
  });

  it('returns null at the edges and for unknown ids', () => {
    expect(reorderSwap(items, 10, 'up')).toBeNull();
    expect(reorderSwap(items, 30, 'down')).toBeNull();
    expect(reorderSwap(items, 99, 'up')).toBeNull();
  });
});
