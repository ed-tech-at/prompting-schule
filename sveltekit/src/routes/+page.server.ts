import type { PageServerLoad } from './$types';
import { checkLogin } from '$lib/server/jwt';
import { loadInfoBlocks } from '$lib/server/infoblocks';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = checkLogin(cookies);

  const infoBlocks = await loadInfoBlocks({
    placement: 'startseite',
    lang: 'de',
    email: user?.email ?? null
  });

  return {
    user,
    infoBlocks
  };
}
