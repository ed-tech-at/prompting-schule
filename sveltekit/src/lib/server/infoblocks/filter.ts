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

// RFC 5321 maximum. Emails longer than this can never be legitimate and are the
// only lever an attacker has on regex runtime, so they are rejected outright.
export const MAX_MATCHED_EMAIL_LENGTH = 254;
export const MAX_PATTERN_QUANTIFIERS = 5;
// Unbounded quantifiers (*, +, {n,}) are what create polynomial backtracking
// degree; three of them stay measurable, more would let the safety probe below
// hang instead of the request it is meant to protect.
export const MAX_UNBOUNDED_QUANTIFIERS = 3;
export const MAX_PATTERN_REPETITION = 100;
// A legitimate email pattern matches in microseconds, so anything that needs
// milliseconds on a worst-case input is already a denial-of-service lever.
export const MAX_PATTERN_PROBE_MS = 10;
// Probing short inputs first keeps the probe itself cheap: matching cost grows
// monotonically with input length, so a short input that is already over budget
// proves the full-length one is worse without ever running it.
export const PATTERN_PROBE_LENGTHS = [24, 64, MAX_MATCHED_EMAIL_LENGTH];

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

// --- Regex safety -----------------------------------------------------------
//
// The pattern is written by a trusted editor, but the string it is matched
// against is not: User.email is unbounded TEXT and anybody can register. A
// harmless-looking but super-linear pattern would therefore turn every page
// view into a denial-of-service lever. Three layers guard against that:
//
//   1. validateEmailPattern() rejects the constructs that make backtracking
//      blow up (backreferences, lookaround, quantified groups, huge {n,m}).
//   2. measurePatternCost() times the pattern against worst-case inputs of
//      exactly MAX_MATCHED_EMAIL_LENGTH characters before it is ever stored.
//   3. matchesEmailPattern() caps the tested email at that same length, which
//      is what makes step 2 a valid bound at runtime.
//
// Node has no regex timeout and node:vm timeouts do not interrupt backtracking,
// so static rejection plus length-matched probing is the available defence.

function scanPattern(pattern: string): string | null {
  let inClass = false;
  let quantifiers = 0;
  let unbounded = 0;
  let afterGroupEnd = false;
  let afterQuantifier = false;

  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];

    if (char === '\\') {
      const next = pattern[i + 1];
      if (next === undefined) {
        return 'Das E-Mail-Muster endet mit einem unvollständigen Escape (\\).';
      }
      if (!inClass && /[1-9k]/.test(next)) {
        return 'Rückwärtsverweise (\\1, \\k<…>) sind im E-Mail-Muster nicht erlaubt.';
      }
      i += 1;
      afterGroupEnd = false;
      afterQuantifier = false;
      continue;
    }

    // Inside [...] every metacharacter is a literal, so nothing else applies.
    if (inClass) {
      if (char === ']') inClass = false;
      continue;
    }

    if (char === '[') {
      inClass = true;
      afterGroupEnd = false;
      afterQuantifier = false;
      continue;
    }

    if (char === '(') {
      if (pattern[i + 1] === '?') {
        const marker = pattern.slice(i + 1, i + 4);
        if (
          marker.startsWith('?=') ||
          marker.startsWith('?!') ||
          marker.startsWith('?<=') ||
          marker.startsWith('?<!')
        ) {
          return 'Vorausschau-Ausdrücke ((?=…), (?!…), (?<=…), (?<!…)) sind im E-Mail-Muster nicht erlaubt.';
        }
        // "(?:" or "(?<name>": the "?" is group syntax, not a quantifier.
        i += 1;
      }
      afterGroupEnd = false;
      afterQuantifier = false;
      continue;
    }

    if (char === ')') {
      afterGroupEnd = true;
      afterQuantifier = false;
      continue;
    }

    if (char === '*' || char === '+') {
      if (afterGroupEnd) {
        return 'Wiederholungen ganzer Gruppen ((…)*, (…)+) sind im E-Mail-Muster nicht erlaubt.';
      }
      quantifiers += 1;
      unbounded += 1;
      afterGroupEnd = false;
      afterQuantifier = true;
      continue;
    }

    if (char === '?') {
      // "a*?" is the lazy modifier of the preceding quantifier, not a new one.
      // "(…)?" stays allowed: an optional group only doubles the work, and
      // "@(student\.)?tugraz\.at$" is the realistic pattern for this feature.
      if (!afterQuantifier) quantifiers += 1;
      afterGroupEnd = false;
      afterQuantifier = false;
      continue;
    }

    if (char === '{') {
      const closing = pattern.indexOf('}', i);
      const body = closing === -1 ? null : pattern.slice(i + 1, closing);
      if (body === null || !/^\d+(,\d*)?$/.test(body)) {
        // Not a valid repetition: JavaScript treats such a brace as a literal.
        afterGroupEnd = false;
        afterQuantifier = false;
        continue;
      }
      if (afterGroupEnd) {
        return 'Wiederholungen ganzer Gruppen ((…){n,m}) sind im E-Mail-Muster nicht erlaubt.';
      }
      const [minRaw, maxRaw] = body.split(',');
      const max =
        maxRaw === undefined
          ? Number(minRaw)
          : maxRaw === ''
            ? Number.POSITIVE_INFINITY
            : Number(maxRaw);
      if (max === Number.POSITIVE_INFINITY) {
        // "{n,}" is as open-ended as "*", so it counts the same way.
        unbounded += 1;
      } else if (max > MAX_PATTERN_REPETITION) {
        return `Wiederholungen über ${MAX_PATTERN_REPETITION} sind im E-Mail-Muster nicht erlaubt.`;
      }
      quantifiers += 1;
      i = closing;
      afterGroupEnd = false;
      afterQuantifier = true;
      continue;
    }

    afterGroupEnd = false;
    afterQuantifier = false;
  }

  if (inClass) {
    return 'Das E-Mail-Muster enthält eine nicht geschlossene Zeichenklasse ([).';
  }
  if (unbounded > MAX_UNBOUNDED_QUANTIFIERS) {
    return `Das E-Mail-Muster enthält zu viele offene Wiederholungen (*, +, {n,}) — maximal ${MAX_UNBOUNDED_QUANTIFIERS}.`;
  }
  if (quantifiers > MAX_PATTERN_QUANTIFIERS) {
    return `Das E-Mail-Muster enthält zu viele Wiederholungszeichen (maximal ${MAX_PATTERN_QUANTIFIERS}).`;
  }

  return null;
}

// Deterministic worst-case inputs of exactly `length` characters: generic
// filler plus strings built from the pattern's own literal alphabet, each also
// in a variant that fails on the very last character (the classic backtracking
// trigger).
export function buildProbeInputs(
  pattern: string,
  length: number = MAX_MATCHED_EMAIL_LENGTH
): string[] {
  const counts = new Map<string, number>();
  for (const char of pattern.toLowerCase()) {
    if (/[a-z0-9]/.test(char)) counts.set(char, (counts.get(char) ?? 0) + 1);
  }
  const alphabet = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, 2)
    .map(([char]) => char);

  const probes = new Set<string>();

  for (const filler of ['a', ...alphabet]) {
    const filled = filler.repeat(length);
    probes.add(filled);
    // Same input, but failing on the very last character: the classic trigger.
    probes.add(filled.slice(0, length - 1) + ' ');
  }
  probes.add('a@'.repeat(Math.ceil(length / 2)).slice(0, length));

  return [...probes];
}

// Milliseconds the pattern needs for its worst-case inputs, probing short
// lengths first and stopping as soon as the budget is exceeded. Returns 0 for
// patterns that do not compile — those are rejected by validateEmailPattern.
export function measurePatternCost(
  pattern: string,
  lengths: number[] = PATTERN_PROBE_LENGTHS
): number {
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, 'i');
  } catch {
    return 0;
  }

  let total = 0;
  for (const length of lengths) {
    for (const probe of buildProbeInputs(pattern, length)) {
      const start = performance.now();
      try {
        regex.test(probe);
      } catch {
        // A pattern that throws while matching is simply not slow.
      }
      total += performance.now() - start;
      // Checked per probe, not per stage: a single pathological probe at the
      // shortest length must not be able to stall the request.
      if (total > MAX_PATTERN_PROBE_MS) return total;
    }
  }

  return total;
}

// Returns a German error message, or null when the pattern is safe to store.
// An empty pattern is valid and means "visible to everyone".
export function validateEmailPattern(pattern: string): string | null {
  if (pattern.length === 0) return null;

  if (pattern.length > MAX_EMAIL_PATTERN_LENGTH) {
    return `Das E-Mail-Muster darf höchstens ${MAX_EMAIL_PATTERN_LENGTH} Zeichen lang sein.`;
  }

  const structural = scanPattern(pattern);
  if (structural) return structural;

  try {
    new RegExp(pattern, 'i');
  } catch {
    return 'Das E-Mail-Muster ist kein gültiger regulärer Ausdruck.';
  }

  if (measurePatternCost(pattern) > MAX_PATTERN_PROBE_MS) {
    return 'Das E-Mail-Muster benötigt zu viel Rechenzeit. Bitte vereinfachen Sie es.';
  }

  return null;
}

// Compiling a regex is not free, and the same handful of patterns is matched on
// every request, so keep the compiled objects around.
const MAX_COMPILED_PATTERNS = 200;
const compiledPatterns = new Map<string, RegExp | null>();

export function compileEmailPattern(pattern: string): RegExp | null {
  const cached = compiledPatterns.get(pattern);
  if (cached !== undefined) return cached;

  let compiled: RegExp | null = null;
  try {
    // Never the "g" flag: a global regex keeps lastIndex between calls and
    // would alternate between match and no-match across requests.
    compiled = new RegExp(pattern, 'i');
  } catch {
    compiled = null;
  }

  if (compiledPatterns.size >= MAX_COMPILED_PATTERNS) compiledPatterns.clear();
  compiledPatterns.set(pattern, compiled);
  return compiled;
}

export function resetEmailPatternCache(): void {
  compiledPatterns.clear();
}

export function matchesEmailPattern(pattern: string | null, email: string | null): boolean {
  // No pattern means the block is for everyone, including logged-out visitors.
  if (pattern === null || pattern === '') return true;
  if (email === null || email === '') return false;
  if (email.length > MAX_MATCHED_EMAIL_LENGTH) return false;

  const regex = compileEmailPattern(pattern);
  // Fail closed: a broken pattern hides its block instead of breaking the page.
  if (regex === null) return false;

  try {
    return regex.test(email);
  } catch {
    return false;
  }
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
