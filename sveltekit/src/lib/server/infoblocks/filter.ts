// Pure (Prisma-free) visibility logic for info blocks: which block is shown to
// whom, on which page, in which language and in which time window. Kept free of
// database access so it stays unit-testable without a database.

// The vocabulary (placements, variants, languages, labels, type guards) is
// shared with the admin UI and therefore lives outside $lib/server; re-exported
// here so server code has a single import.
import {
  MAX_EMAIL_PATTERN_LENGTH,
  normalizeVariant,
  type InfoBlockPlacement,
  type InfoBlockView
} from '$lib/infoblocks';

export {
  INFOBLOCK_PLACEMENTS,
  INFOBLOCK_VARIANTS,
  INFOBLOCK_LANGS,
  INFOBLOCK_PLACEMENT_LABELS,
  INFOBLOCK_VARIANT_LABELS,
  INFOBLOCK_LANG_LABELS,
  MAX_INFOBLOCK_CONTENT_LENGTH,
  MAX_EMAIL_PATTERN_LENGTH,
  isInfoBlockPlacement,
  isInfoBlockVariant,
  isInfoBlockLang,
  normalizeVariant,
  type InfoBlockPlacement,
  type InfoBlockVariant,
  type InfoBlockLang,
  type InfoBlockView
} from '$lib/infoblocks';

// Everything the visibility check needs. Deliberately narrower than the Prisma
// model so the pure logic does not depend on the schema.
export type InfoBlockRecord = {
  id: number;
  content: string;
  variant: string;
  lang: string;
  placements: string[];
  emailPattern: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  active: number;
};

export type InfoBlockContext = {
  placement: InfoBlockPlacement;
  lang: 'de' | 'en';
  email: string | null;
  now: Date;
};

export function matchesPlacement(
  block: Pick<InfoBlockRecord, 'placements'>,
  placement: InfoBlockPlacement
): boolean {
  return block.placements.includes(placement);
}

export function matchesLang(block: Pick<InfoBlockRecord, 'lang'>, lang: 'de' | 'en'): boolean {
  return block.lang === lang || block.lang === 'both';
}

// Both bounds are inclusive; null means "open end".
export function isWithinDateWindow(
  block: Pick<InfoBlockRecord, 'validFrom' | 'validUntil'>,
  now: Date
): boolean {
  if (block.validFrom && now.getTime() < block.validFrom.getTime()) return false;
  if (block.validUntil && now.getTime() > block.validUntil.getTime()) return false;
  return true;
}

// --- E-Mail-Zielgruppe ------------------------------------------------------
//
// Bewusst kein regulärer Ausdruck: Ein frei eingegebenes Regex konnte bei
// ungünstigen Adressen den Server blockieren (Security-Audit run-1, C12).
// Stattdessen eine Liste von Domains, verglichen per endsWith – das läuft immer
// in linearer Zeit. "tugraz.at" trifft "x@tugraz.at" und "x@student.tugraz.at",
// aber nicht "x@nottugraz.at".

const DOMAIN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
export const MAX_EMAIL_DOMAINS = 20;

// Zerlegt die Eingabe in Domains. Trennzeichen: Komma, Semikolon, Leerzeichen,
// Zeilenumbruch. Ein führendes "@" ist erlaubt und wird entfernt.
export function parseEmailDomains(pattern: string | null): string[] {
  if (!pattern) return [];
  return pattern
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((entry) => entry.replace(/^@/, ''))
    .filter(Boolean);
}

// Kanonische Speicherform, z. B. "student.tugraz.at, tugraz.at"; null = für alle.
export function normalizeEmailPattern(pattern: string): string | null {
  const domains = [...new Set(parseEmailDomains(pattern))];
  return domains.length ? domains.join(', ') : null;
}

// Returns a German error message, or null when the pattern is valid.
// An empty pattern is valid and means "visible to everyone".
export function validateEmailPattern(pattern: string): string | null {
  if (pattern.length > MAX_EMAIL_PATTERN_LENGTH) {
    return `Die Domain-Liste darf höchstens ${MAX_EMAIL_PATTERN_LENGTH} Zeichen lang sein.`;
  }

  const domains = parseEmailDomains(pattern);
  if (domains.length > MAX_EMAIL_DOMAINS) {
    return `Es sind höchstens ${MAX_EMAIL_DOMAINS} Domains erlaubt.`;
  }

  const invalid = domains.find((domain) => !DOMAIN.test(domain));
  if (invalid) {
    return `"${invalid}" ist keine gültige Domain (Beispiel: tugraz.at).`;
  }

  return null;
}

export function matchesEmailPattern(pattern: string | null, email: string | null): boolean {
  const domains = parseEmailDomains(pattern);
  // No pattern means the block is for everyone, including logged-out visitors.
  if (domains.length === 0) return true;
  if (!email) return false;

  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const emailDomain = email.slice(at + 1).toLowerCase();

  return domains.some((domain) => emailDomain === domain || emailDomain.endsWith('.' + domain));
}

export function isInfoBlockVisible(block: InfoBlockRecord, ctx: InfoBlockContext): boolean {
  return (
    block.active > 0 &&
    matchesPlacement(block, ctx.placement) &&
    matchesLang(block, ctx.lang) &&
    isWithinDateWindow(block, ctx.now) &&
    matchesEmailPattern(block.emailPattern, ctx.email)
  );
}

// `blocks` must already be in display order; the order is preserved.
export function selectVisibleInfoBlocks(
  blocks: InfoBlockRecord[],
  ctx: InfoBlockContext
): InfoBlockView[] {
  return blocks
    .filter((block) => isInfoBlockVisible(block, ctx))
    .map((block) => ({
      id: block.id,
      content: block.content,
      variant: normalizeVariant(block.variant)
    }));
}

// --- <input type="datetime-local"> helpers ----------------------------------
//
// The browser submits wall-clock text without a timezone, so the value is
// interpreted in the server's timezone. Built from date components rather than
// Date.parse so the behaviour does not depend on the runtime's string parsing.

export function parseDateTimeInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hours, minutes] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    0,
    0
  );

  // Rejects impossible dates such as 2026-02-31, which JavaScript would roll over.
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day) ||
    date.getHours() !== Number(hours) ||
    date.getMinutes() !== Number(minutes)
  ) {
    return null;
  }

  return date;
}

export function formatDateTimeInput(date: Date | null): string {
  if (!date || Number.isNaN(date.getTime())) return '';

  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
