import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolve } from '$app/paths';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ cookies, url }) => {
  

  const token = cookies.get('jwt');


  const SUBFOLDER = env.SUBFOLDER ?? "";
  const path = "/" + SUBFOLDER;

  // Cookie löschen
  cookies.set('jwt', '', {
    path: path,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0
  });

  if (env.KEYCLOAK_CLIENT_SECRET) {
    throw redirect(302, resolve('/login-sso/logout/'));
  }
  
  
  // if (typeof(token) === 'string') {
  //   throw redirect(303, "/logout"); // Seite neu laden nach Cookie-Delete
  // }

  return {};
};
