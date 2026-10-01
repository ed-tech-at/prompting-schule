import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCookiePath, withBase } from '$lib/server/subfolder';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ cookies, url }) => {
  

  const token = cookies.get('jwt');


  // Cookie löschen – gleicher Path wie beim Setzen (pw.ts)
  cookies.set('jwt', '', {
    path: getCookiePath(),
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0
  });

  if (env.KEYCLOAK_CLIENT_SECRET) {
    throw redirect(302, withBase('/login-sso/logout/'));
  }
  
  
  // if (typeof(token) === 'string') {
  //   throw redirect(303, "/logout"); // Seite neu laden nach Cookie-Delete
  // }

  return {};
};
