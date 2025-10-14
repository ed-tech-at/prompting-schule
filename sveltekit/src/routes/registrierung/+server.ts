import { json } from '@sveltejs/kit';
// import { PrismaClient } from '@prisma/client';




// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import type { User } from '@prisma/client';

import { newUserUUID } from '$lib/server/dbUtils.js';
import { hashPassword, register } from '$lib/server/pw.js';
import { comparePassword } from '$lib/server/pw.js';


export async function POST({ request, params }) {
  try {
      // console.log('params', params);
      let { formData, action } = await request.json();
      // console.log('action', action);
      
      // if (typeof form === 'string') {
          // form = JSON.parse(form);
      // }

      // console.log('form', form);

      if (action == "create") {

        return register(formData.email, formData.password);

    //     const user = await prisma.user.findUnique({ where: { email: formData.email } });

    //     if (user) {
    //         const passwordMatch = await comparePassword(formData.password, user.password);
             
    //         if (!passwordMatch) {
    //             return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." }, { status: 401 });
    //           }
              
    //         return json({ success: true, user: { id: user.id, email: user.email } });

    //       }
          
    //   const uuid = await newUserUUID();

    //   let password = form.password;

      

    //   console.log('password:', password);

    //   password = await hashPassword(password);
    //   console.log('password ahesd:', password);



    //   const newUser = await prisma.user.create({
    //       data: {
    //           id: uuid,
    //           password: password,
    //           email: form.email,
    //       }
    //   });

    //   console.log('newUser', newUser);


    // //   return json({ success: true, newUser: newUser });

    //   return json({ success: true, user: { id: newUser.id, email: newUser.email } });

    } 
  } catch (error) {
      return json({ success: false, error: error.message }, { status: 500 });
  }
}
