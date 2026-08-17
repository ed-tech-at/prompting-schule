// Shared info block vocabulary. Lives outside $lib/server because both the
// admin UI and the render component need the labels and type guards; the
// filtering logic itself stays server-side in $lib/server/infoblocks/filter.ts.

export const INFOBLOCK_PLACEMENTS = ['startseite', 'kursuebersicht', 'profil'] as const;
export const INFOBLOCK_VARIANTS = ['info', 'warning', 'success'] as const;
export const INFOBLOCK_LANGS = ['de', 'en', 'both'] as const;

export type InfoBlockPlacement = (typeof INFOBLOCK_PLACEMENTS)[number];
export type InfoBlockVariant = (typeof INFOBLOCK_VARIANTS)[number];
export type InfoBlockLang = (typeof INFOBLOCK_LANGS)[number];

export const INFOBLOCK_PLACEMENT_LABELS: Record<InfoBlockPlacement, string> = {
  startseite: 'Startseite',
  kursuebersicht: 'Kursübersicht',
  profil: 'Profilseite'
};

export const INFOBLOCK_VARIANT_LABELS: Record<InfoBlockVariant, string> = {
  info: 'Info',
  warning: 'Warnung',
  success: 'Erfolg'
};

export const INFOBLOCK_LANG_LABELS: Record<InfoBlockLang, string> = {
  de: 'Deutsch',
  en: 'Englisch',
  both: 'Beide'
};

export const MAX_INFOBLOCK_CONTENT_LENGTH = 20000;
export const MAX_EMAIL_PATTERN_LENGTH = 200;

// The only shape that reaches the browser. The email pattern and the time
// window stay on the server.
export type InfoBlockView = {
  id: number;
  content: string;
  variant: InfoBlockVariant;
};

export function isInfoBlockPlacement(value: string): value is InfoBlockPlacement {
  return (INFOBLOCK_PLACEMENTS as readonly string[]).includes(value);
}

export function isInfoBlockVariant(value: string): value is InfoBlockVariant {
  return (INFOBLOCK_VARIANTS as readonly string[]).includes(value);
}

export function isInfoBlockLang(value: string): value is InfoBlockLang {
  return (INFOBLOCK_LANGS as readonly string[]).includes(value);
}

export function normalizeVariant(value: string): InfoBlockVariant {
  return isInfoBlockVariant(value) ? value : 'info';
}
