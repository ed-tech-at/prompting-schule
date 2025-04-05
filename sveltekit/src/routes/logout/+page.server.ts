import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, url }) => {
  const token = cookies.get('jwt');

  // Cookie löschen
  cookies.set('jwt', '', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 0
  });

  console.log("token type", typeof(token));
  console.log("token", token);

  
  // if (typeof(token) === 'string') {
  //   throw redirect(303, "/logout"); // Seite neu laden nach Cookie-Delete
  // }

  return {};
};
