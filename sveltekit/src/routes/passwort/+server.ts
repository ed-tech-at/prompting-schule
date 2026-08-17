import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { sendPasswordResetLink } from '$lib/server/passwordReset';


export async function POST({ request }) {
  try {
      const { formData, action } = await request.json();

      if (action == "passwort") {
        const user = await prisma.user.findUnique({ where: { email: formData.email } });

        if (!user || user.isDeleted || user.blockedAt || ![1, 2].includes(user.cryptVersion)) {
            return json({ success: false, error: "Benutzer nicht gefunden." }, { status: 400 });
        }

        await sendPasswordResetLink(user);

        return json({ success: true }, { status: 200 });
      }

      return json({ success: false, error: "Ungültige Aktion." }, { status: 400 });
  } catch (error) {
      return json({ success: false, error: "Mail konnte nicht gesendet werden." }, { status: 500 });
  }
}
