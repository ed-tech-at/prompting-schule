import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCookiePath } from '$lib/server/subfolder';

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

  
  
  // if (typeof(token) === 'string') {
  //   throw redirect(303, "/logout"); // Seite neu laden nach Cookie-Delete
  // }

  return {};
};
