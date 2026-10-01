import type { PageServerLoad } from './$types';
import { requireAdminManager } from '$lib/server/admin';
import { EDITOR_LEVEL } from '$lib/server/editor';

export const load: PageServerLoad = async ({ cookies }) => {
  const actor = await requireAdminManager(cookies, EDITOR_LEVEL);

  return { actor };
};
