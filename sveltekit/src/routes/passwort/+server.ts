import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';




const prisma = new PrismaClient();

import type { User } from '@prisma/client';

import { newUserUUID } from '$lib/server/dbUtils.js';
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
        await sendMail(formData.email, "passwort reset", "passwort text");

        return json({ success: true }, { status: 200 });
    } 
  } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
  }
}
