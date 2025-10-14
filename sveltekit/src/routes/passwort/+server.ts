import { json } from '@sveltejs/kit';
// import { PrismaClient } from '@prisma/client';

import { env } from '$env/dynamic/private';



// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import type { User } from '@prisma/client';

import { newPwResetToken, newUserUUID } from '$lib/server/dbUtils.js';
import { hashPassword, register } from '$lib/server/pw.js';
import { comparePassword } from '$lib/server/pw.js';
import { sendMail } from '$lib/server/email.js';


export async function POST({ request, params }) {
  try {
      // console.log('params', params);
      let { formData, action } = await request.json();
      // console.log('action', action);
      
      // if (typeof form === 'string') {
          // form = JSON.parse(form);
      // }

      // console.log('form', form);

      if (action == "passwort") {

        const user = await prisma.user.findUnique({ where: { email: formData.email } });

        if (!user) {
            
            return json({ success: false, error: "Benutzer nicht gefunden." }, { status: 400 });
        }

        const pwToken = await newPwResetToken();

        const pwTokenDb = await prisma.userPasswordReset.create({
            data: {
                token: pwToken,
                userId: user.id,
                // expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
            }
        });

        await sendMail(user.email, "Passwort zurücksetzen", "Guten Tag,\n\nfür die E-Mail Adresse " + user.email + " wurde ein Passwort zurücksetzen angefordert.\n\nBitte öffnen Sie folgenden Link, um Ihr Passwort zurückzusetzen:\n\n" + env.APP_URL + "/passwort/" + user.email + "/" + pwToken + " \n\nWenn Sie diese E-Mail nicht angefordert haben, ignorieren Sie bitte diese Nachricht.\n\nMit freundlichen Grüßen,\nIhr Team der prompting.schule");

        return json({ success: true }, { status: 200 });
    } 
  } catch (error) {
      return json({ success: false, error: "Mail konnte nicht gesendet werden." }, { status: 500 });
  }
}
