import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { passwordResetLimitReached, sendPasswordResetLink } from '$lib/server/passwordReset';
import { isSingleEmailAddress } from '$lib/server/email';


export async function POST({ request }) {
  try {
      const { formData, action } = await request.json();

      if (action == "passwort") {
        if (!isSingleEmailAddress(formData?.email)) {
            return json({ success: false, error: "Benutzer nicht gefunden." }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { email: formData.email } });

        if (!user || user.isDeleted || user.blockedAt || ![1, 2].includes(user.cryptVersion)) {
            return json({ success: false, error: "Benutzer nicht gefunden." }, { status: 400 });
        }

        if (await passwordResetLimitReached(user.id)) {
            return json({ success: false, error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." }, { status: 429 });
        }

        await sendPasswordResetLink(user);

        return json({ success: true }, { status: 200 });
      }

      return json({ success: false, error: "Ungültige Aktion." }, { status: 400 });
  } catch (error) {
      return json({ success: false, error: "Mail konnte nicht gesendet werden." }, { status: 500 });
  }
}
