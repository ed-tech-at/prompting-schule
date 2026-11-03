// Pure (Prisma-free) logic for course translations: which fields are
// translatable, how a translation is laid over the source text and whether a
// translated field is missing or out of date.

import { createHash } from 'node:crypto';

export const COURSE_TRANSLATABLE_FIELDS = [
  'name',
  'description',
  'introDescription',
  'introDescriptionSuffix'
] as const;

export const LESSON_TRANSLATABLE_FIELDS = ['lessonName'] as const;

export const ELEMENT_TRANSLATABLE_FIELDS = [
  'title',
  'description',
  'taskA',
  'devPromptA',
  'taskB',
  'devPromptB',
  'devPromptC'
] as const;

export const QUIZ_TRANSLATABLE_FIELDS = ['question'] as const;

export type TranslationRecord = Record<string, unknown> & { sourceHashes?: unknown };

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

// Empty translated fields fall back to the source text, so a half-finished
// translation never shows blank spots to learners.
export function overlayTranslation<T extends Record<string, unknown>>(
  source: T,
  translation: TranslationRecord | null | undefined,
  fields: readonly (keyof T & string)[]
): T {
  if (!translation) return source;

  const result = { ...source };
  for (const field of fields) {
    const value = translation[field];
    if (hasText(value)) {
      (result as Record<string, unknown>)[field] = value;
    }
  }
  return result;
}

// Options are translated index by index. A missing or empty entry keeps the
// source option, so the list always has the same length as the original.
export function overlayOptions(sourceOptions: string[], translatedOptions: string[] | null | undefined): string[] {
  return sourceOptions.map((option, index) => {
    const translated = translatedOptions?.[index];
    return hasText(translated) ? translated : option;
  });
}

export function hashSource(text: string | null | undefined): string {
  return createHash('sha256').update(text ?? '').digest('hex').slice(0, 16);
}

export function hashOptions(options: string[]): string {
  return hashSource(JSON.stringify(options));
}

export type FieldStatus = 'notNeeded' | 'missing' | 'outdated' | 'done';

function readHashes(sourceHashes: unknown): Record<string, string> {
  if (typeof sourceHashes !== 'object' || sourceHashes === null || Array.isArray(sourceHashes)) {
    return {};
  }
  return sourceHashes as Record<string, string>;
}

// A field is outdated when the source text changed after it was translated.
export function fieldStatus(
  sourceText: string | null | undefined,
  translatedText: string | null | undefined,
  storedHash: string | undefined
): FieldStatus {
  if (!hasText(sourceText)) return 'notNeeded';
  if (!hasText(translatedText)) return 'missing';
  if (storedHash !== undefined && storedHash !== hashSource(sourceText)) return 'outdated';
  return 'done';
}

export function translationFieldStatuses<T extends Record<string, unknown>>(
  source: T,
  translation: TranslationRecord | null | undefined,
  fields: readonly (keyof T & string)[]
): Record<string, FieldStatus> {
  const hashes = readHashes(translation?.sourceHashes);
  const statuses: Record<string, FieldStatus> = {};
  for (const field of fields) {
    statuses[field] = fieldStatus(
      source[field] as string | null | undefined,
      translation?.[field] as string | null | undefined,
      hashes[field]
    );
  }
  return statuses;
}

export function optionsStatus(
  sourceOptions: string[],
  translatedOptions: string[] | null | undefined,
  sourceHashes: unknown
): FieldStatus {
  if (sourceOptions.length === 0) return 'notNeeded';
  const complete = sourceOptions.every((option, index) => !hasText(option) || hasText(translatedOptions?.[index]));
  if (!complete) return 'missing';
  const stored = readHashes(sourceHashes).options;
  if (stored !== undefined && stored !== hashOptions(sourceOptions)) return 'outdated';
  return 'done';
}

// Records the source hash of every field that has a translation, so the
// translate view can later tell when the original moved on.
export function buildSourceHashes<T extends Record<string, unknown>>(
  source: T,
  translated: Record<string, string | null>,
  fields: readonly (keyof T & string)[]
): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const field of fields) {
    if (hasText(translated[field])) {
      hashes[field] = hashSource(source[field] as string | null | undefined);
    }
  }
  return hashes;
}

export type StatusCounts = { total: number; done: number; missing: number; outdated: number };

export function countStatuses(statuses: FieldStatus[]): StatusCounts {
  const counts: StatusCounts = { total: 0, done: 0, missing: 0, outdated: 0 };
  for (const status of statuses) {
    if (status === 'notNeeded') continue;
    counts.total += 1;
    counts[status] += 1;
  }
  return counts;
}

// Which language a course can be shown in, and whether it is listed there.
// The source language follows Course.active; any other language needs a
// translation and follows its own active flag. Without a translation the
// course does not exist in that language at all (404 on direct URLs).
export function courseAvailability(
  course: { lang: string; active: number },
  translation: { active: number } | null | undefined,
  lang: string
): { available: boolean; active: number } {
  if (course.lang === lang) return { available: true, active: course.active };
  if (translation) return { available: true, active: translation.active };
  return { available: false, active: 0 };
}
