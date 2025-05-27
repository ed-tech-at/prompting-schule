import { redirect } from '@sveltejs/kit';

export function load({ url }) {

  if (url.hostname === 'prompting.school' && url.pathname === '/') {
    console.log('load +layout.server.ts', url);
    console.log('Redirecting to /en');
    throw redirect(301, '/en');
  }

  return {
    pathname: url.pathname
  };
}