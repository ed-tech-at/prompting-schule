import type { PageServerLoad } from './$types';
import { checkLogin } from '$lib/server/jwt';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = checkLogin(cookies);

  return {
    user
  };
}
