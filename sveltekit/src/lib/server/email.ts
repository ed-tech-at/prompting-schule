import nodemailer from 'nodemailer';
import { env } from '$env/dynamic/private';


export const sendMail = async (
  to: string,
  subject: string,
  text: string
): Promise<void> => {
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
    to,
    subject,
    text
  });
};
