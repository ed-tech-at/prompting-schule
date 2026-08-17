import type { PageServerLoad } from './$types';
import { requireLogin } from '$lib/server/jwt';
import { hasOIDCConfig } from '$lib/sso/oidc';
import { loadInfoBlocks } from '$lib/server/infoblocks';

export const load: PageServerLoad = async ({ cookies }) => {
  const user = requireLogin(cookies);

  const infoBlocks = await loadInfoBlocks({
    placement: 'profil',
    lang: 'de',
    email: user.email
  });

  return {
    user,
    hasKeycloakIssuer: hasOIDCConfig(),
    infoBlocks
  };
}
