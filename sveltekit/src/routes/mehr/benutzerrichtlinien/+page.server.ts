import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
  if (env.KEYCLOAK_CLIENT_SECRET) {
    throw redirect(302, resolve('/mehr/benutzerrichtlinien/tu-graz-flaait'));
  }
};
