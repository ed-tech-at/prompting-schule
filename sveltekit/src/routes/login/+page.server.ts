import type { PageServerLoad } from './$types';
import { checkLogin } from '$lib/server/jwt';
import { resolve } from '$app/paths';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async ({ cookies }) => {
  if (env.KEYCLOAK_CLIENT_SECRET) {
    throw redirect(302, resolve('/login-sso'));
  }

  const user = checkLogin(cookies);

  return {
    user
  };
}
