import { json } from '@sveltejs/kit';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { comparePassword, comparePasswordV2, login } from '$lib/server/pw.js';
import { createJWT } from '$lib/server/jwt.js';


export async function POST({ request, params }) {
  try {
      let { formData, action } = await request.json();
      
      // if (typeof form === 'string') {
      //     form = JSON.parse(form);
      // }

      // console.log('form', form);

      if (action == "login") {

        return login(formData.email, formData.password);

      
        const user = await prisma.user.findUnique({ where: { email: form.email } });
        
        if (!user) {
          return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." }, { status: 401 });
        }

        console.log('chekcing user', user);

        if (user.cryptVersion == 1) {

          const passwordMatch = await comparePassword(form.password, user.password);
          // console.log('passwordMatch', passwordMatch);
          if (!passwordMatch) {
            return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." }, { status: 401 });
          }
        }

        if (user.cryptVersion == 2) {


          const passwordMatch = await comparePasswordV2(form.password, user.password, user.id);
          // console.log('passwordMatch', passwordMatch);
          if (!passwordMatch) {
            return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." }, { status: 401 });
          }
        }

        const token = createJWT({
          id: user.id,
          email: user.email,
          isAdmin: user.isAdmin
        });

        return new Response(
          JSON.stringify({ success: true }),
          // JSON.stringify({ success: true, user: { email: user.email, isAdmin: user.isAdmin } }),
          {
            status: 200,
            headers: {
              'Set-Cookie': `jwt=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`, // 7 Tage
              'Content-Type': 'application/json'
            }
          }
        );

        
        // return json({ success: true, user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
      


    } 
  } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
  }
}
