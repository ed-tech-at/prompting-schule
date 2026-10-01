import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { withBase } from '$lib/server/subfolder';
import { env } from '$env/dynamic/private';

export const load: PageServerLoad = async () => {
  if (env.KEYCLOAK_CLIENT_SECRET) {
    throw redirect(302, withBase('/mehr/benutzerrichtlinien/tu-graz-flaait'));
  }
};
