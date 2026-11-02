import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  count: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: { userPasswordReset: { count: mocks.count } }
}));

import {
  isPasswordResetExpired,
  PASSWORD_RESET_LIFETIME_MS,
  passwordResetExpiry,
  passwordResetLimitReached
} from './passwordReset';

describe('password reset expiry', () => {
  const createdAt = new Date('2026-07-28T10:00:00.000Z');

  it('creates a reset expiry exactly 60 minutes later', () => {
    expect(passwordResetExpiry(createdAt).getTime() - createdAt.getTime()).toBe(
      PASSWORD_RESET_LIFETIME_MS
    );
  });

  it('uses expiresAt when present', () => {
    expect(
      isPasswordResetExpired(
        {
          createdAt,
          expiresAt: new Date('2026-07-28T11:00:00.000Z')
        },
        new Date('2026-07-28T10:59:59.000Z')
      )
    ).toBe(false);

    expect(
      isPasswordResetExpired(
        {
          createdAt,
          expiresAt: new Date('2026-07-28T11:00:00.000Z')
        },
        new Date('2026-07-28T11:00:00.000Z')
      )
    ).toBe(true);
  });

  it('applies the 60 minute fallback to legacy rows', () => {
    expect(
      isPasswordResetExpired(
        { createdAt, expiresAt: null },
        new Date('2026-07-28T11:00:00.000Z')
      )
    ).toBe(true);
  });
});

describe('password reset rate limit', () => {
  const now = new Date('2026-07-28T10:00:00.000Z');

  it('allows up to 5 reset mails per hour', async () => {
    mocks.count.mockResolvedValue(4);
    await expect(passwordResetLimitReached('user-1', now)).resolves.toBe(false);

    mocks.count.mockResolvedValue(5);
    await expect(passwordResetLimitReached('user-1', now)).resolves.toBe(true);
  });

  it('only counts resets of this account from the last hour', async () => {
    mocks.count.mockResolvedValue(0);
    await passwordResetLimitReached('user-1', now);

    expect(mocks.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', createdAt: { gt: new Date('2026-07-28T09:00:00.000Z') } }
    });
  });
});
