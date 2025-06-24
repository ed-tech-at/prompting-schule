import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/jwt';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = requireLogin(cookies);

  return {
    user
  };
}
