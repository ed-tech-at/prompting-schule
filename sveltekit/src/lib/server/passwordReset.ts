import { env } from '$env/dynamic/public';
import { prisma } from '$lib/server/db';
import { newPwResetToken } from '$lib/server/dbUtils';
import { sendMail } from '$lib/server/email';

export const PASSWORD_RESET_LIFETIME_MS = 60 * 60 * 1000;

export function passwordResetExpiry(from = new Date()): Date {
  return new Date(from.getTime() + PASSWORD_RESET_LIFETIME_MS);
}

export function isPasswordResetExpired(
  reset: { createdAt: Date | null; expiresAt: Date | null },
  now = new Date()
): boolean {
  const expiresAt =
    reset.expiresAt ??
    (reset.createdAt ? passwordResetExpiry(reset.createdAt) : new Date(0));

  return expiresAt.getTime() <= now.getTime();
}

export async function sendPasswordResetLink(user: { id: string; email: string }) {
  const now = new Date();
  const token = await newPwResetToken();

  await prisma.$transaction([
    prisma.userPasswordReset.updateMany({
      where: {
        userId: user.id,
        finishedAt: null
      },
      data: {
        finishedAt: now
      }
    }),
    prisma.userPasswordReset.create({
      data: {
        token,
        userId: user.id,
        expiresAt: passwordResetExpiry(now)
      }
    })
  ]);

  const resetUrl = `${env.PUBLIC_APP_URL}/passwort/${encodeURIComponent(user.email)}/${token}`;

  try {
    await sendMail(
      user.email,
      'Passwort zurücksetzen',
      `Guten Tag,

für die E-Mail-Adresse ${user.email} wurde das Zurücksetzen des Passworts angefordert.

Bitte öffnen Sie innerhalb von 60 Minuten folgenden Link, um ein neues Passwort festzulegen:

${resetUrl}

Wenn Sie diese E-Mail nicht angefordert haben, ignorieren Sie bitte diese Nachricht.

Mit freundlichen Grüßen
Ihr Team der prompting.schule`
    );
  } catch (mailError) {
    await prisma.userPasswordReset.update({
      where: { token },
      data: { finishedAt: new Date() }
    });
    throw mailError;
  }
}

export async function sendManagerPasswordChangedNotice(email: string) {
  await sendMail(
    email,
    'Ihr Passwort wurde geändert',
    `Guten Tag,

das Passwort Ihres Kontos bei prompting.schule wurde von einem Manager geändert.

Falls Sie diese Änderung nicht erwartet haben, wenden Sie sich bitte umgehend an die für Sie zuständige Betreuung.

Mit freundlichen Grüßen
Ihr Team der prompting.schule`
  );
}
