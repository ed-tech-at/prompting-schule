import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';

// Genau eine einfache Adresse: keine Display-Namen, Listen, Kommentare oder Leerzeichen,
// damit nodemailer den String nicht als Adressliste interpretiert.
const SINGLE_EMAIL = /^[^\s@",<>;:()[\]\\]{1,64}@[A-Za-z0-9.-]{1,253}\.[A-Za-z]{2,}$/;

export function isSingleEmailAddress(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 && SINGLE_EMAIL.test(value);
}

export const sendMail = async (
  to: string,
  subject: string,
  text: string
): Promise<void> => {
  if (!isSingleEmailAddress(to)) {
    throw new Error('Ungültiger Mail-Empfänger.');
  }

  const transporter = nodemailer.createTransport({
    host: env.MAIL_HOST,       // dein Mailserver
    port: Number(env.MAIL_PORT),                          // Submission Port
    secure: false,                      // STARTTLS statt SSL
    auth: {
      user: env.MAIL_USER,    // oder eine andere Adresse
      pass: env.MAIL_PW
    },
    tls: {
      rejectUnauthorized: false        // Nur falls du ein Self-Signed-Zertifikat hast
    }
  });

  await transporter.sendMail({
    from: env.MAIL_FROM,
    to: { name: '', address: to },
    envelope: { from: env.MAIL_FROM, to: [to] },
    subject,
    text
  });
};
