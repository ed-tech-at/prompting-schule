import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';




const prisma = new PrismaClient();


import { comparePassword, hashPassword } from '$lib/server/pw.js';


export async function POST({ request, params }) {
  try {
      console.log('params', params);
      let { form, action } = await request.json();
      console.log('action', action);
      
      if (typeof form === 'string') {
          form = JSON.parse(form);
      }

      console.log('form', form);

      if (action == "login") {
      
        const user = await prisma.user.findUnique({ where: { email: form.email } });
        
        if (!user) {
          return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." }, { status: 401 });
        }

        console.log('chekcing user', user);

        const passwordMatch = await comparePassword(form.password, user.password);
        console.log('passwordMatch', passwordMatch);
        if (!passwordMatch) {
          return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." }, { status: 401 });
        }
        
        return json({ success: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
      


    } 
  } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
  }
}
