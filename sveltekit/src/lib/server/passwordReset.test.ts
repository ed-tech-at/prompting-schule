import { describe, expect, it } from 'vitest';
import {
  isPasswordResetExpired,
  PASSWORD_RESET_LIFETIME_MS,
  passwordResetExpiry
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
