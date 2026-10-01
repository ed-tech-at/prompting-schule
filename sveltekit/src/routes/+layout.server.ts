import { redirect } from '@sveltejs/kit';
import { withBase } from '$lib/server/subfolder';

export function load({ url }) {

  if (url.hostname === 'prompting.school' && url.pathname === '/') {
    console.log('load +layout.server.ts', url);
    console.log('Redirecting to /en');
    throw redirect(301, withBase('/en'));
  }

  return {
    pathname: url.pathname
  };
}