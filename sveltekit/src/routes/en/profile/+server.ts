import { json } from '@sveltejs/kit';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';
import { hasOIDCConfig } from '$lib/sso/oidc';
import { comparePasswordV2, hashPasswordV2 } from '$lib/server/pw.js';
import { requireLogin } from '$lib/server/jwt.js';

export async function POST({ request, params, cookies }) {
  try {
      let { formData, action } = await request.json();
      
     

      if (action == "pwChange") {

          const user = requireLogin(cookies);
        
          const userDb = await prisma.user.findUnique({ where: { id: user.id } });
          if (!userDb) {
              return json({ success: false, error: "User not found" }, { status: 404 });
          }

          const pwStatus = await comparePasswordV2(formData.oldPassword, userDb.password, user.id);

          if (!pwStatus) {
              return json({ success: false, error: "Altes Passwort ist falsch" }, { status: 401 });
          }
          const newHashedPassword = await hashPasswordV2(formData.newPassword, user.id);
          await prisma.user.update({
              where: { id: user.id },
              data: {
                  password: newHashedPassword,
                  cryptVersion: 2
              }
          });
          return json({ success: true, message: "Passwort erfolgreich geändert" });

    } 
 
  
  if (action == "delAccount") {

          const user = requireLogin(cookies);
        
          const userDb = await prisma.user.findUnique({ where: { id: user.id } });
          if (!userDb) {
              return json({ success: false, error: "User not found" }, { status: 404 });
          }

          if (userDb.email != formData.email) {
              return json({ success: false, error: "E-Mail stimmt nicht überein" }, { status: 401 });
          }

          if (!hasOIDCConfig()) {
              const pwStatus = await comparePasswordV2(formData.password, userDb.password, user.id);

              if (!pwStatus) {
                  return json({ success: false, error: "Passwort ist falsch" }, { status: 401 });
              }
          }
          
          await prisma.user.update({
              where: { id: user.id },
              data: {
                  email:  "_deleted_" + new Date().getTime() + "_" + user.id,
                  password: "_deleted_" + new Date().getTime(),
                  cryptVersion: 2,
                  isDeleted: 1
              }
          });
          
          return json({ success: true, message: "Benutzeraccount gelöscht" });

    } 
  } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed.';
      return json({ success: false, error: message }, { status: 500 });
  }
}
