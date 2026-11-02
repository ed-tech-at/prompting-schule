import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  sendMail: vi.fn()
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({ sendMail: mocks.sendMail })
  }
}));

vi.mock('$env/dynamic/private', () => ({
  env: { MAIL_FROM: 'noreply@example.test', MAIL_PORT: '587' }
}));

import { isSingleEmailAddress, sendMail } from './email';

const RECIPIENT_LIST =
  '"Sicherheitswarnung: bitte sofort https://evil.example/login besuchen" <victim1@example.test>, victim2@example.test';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('isSingleEmailAddress', () => {
  it('accepts a plain address', () => {
    expect(isSingleEmailAddress('anna.muster+kurs@schule.example.at')).toBe(true);
  });

  it.each([
    RECIPIENT_LIST,
    'a@example.test, b@example.test',
    'Name <a@example.test>',
    ' a@example.test',
    'a@example.test\nBcc: b@example.test',
    'kein-at-zeichen',
    42
  ])('rejects %j', (value) => {
    expect(isSingleEmailAddress(value)).toBe(false);
  });
});

describe('sendMail', () => {
  it('refuses a recipient list without contacting SMTP', async () => {
    await expect(sendMail(RECIPIENT_LIST, 'Betreff', 'Text')).rejects.toThrow();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('pins the envelope to the single recipient', async () => {
    await sendMail('anna@example.test', 'Betreff', 'Text');

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: { name: '', address: 'anna@example.test' },
        envelope: { from: 'noreply@example.test', to: ['anna@example.test'] }
      })
    );
  });
});
