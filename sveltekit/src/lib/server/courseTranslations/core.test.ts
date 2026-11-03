import { describe, expect, it } from 'vitest';
import {
  ELEMENT_TRANSLATABLE_FIELDS,
  buildSourceHashes,
  countStatuses,
  courseAvailability,
  fieldStatus,
  hashOptions,
  hashSource,
  optionsStatus,
  overlayOptions,
  overlayTranslation,
  translationFieldStatuses
} from './core';

describe('overlayTranslation', () => {
  it('uses translated text and falls back to the source for empty fields', () => {
    const source = { id: 1, title: 'Titel', description: 'Beschreibung', taskA: null };
    const result = overlayTranslation(source, { title: 'Title', description: '   ', taskA: 'Task' }, [
      'title',
      'description',
      'taskA'
    ]);

    expect(result).toEqual({ id: 1, title: 'Title', description: 'Beschreibung', taskA: 'Task' });
    expect(source.title).toBe('Titel');
  });

  it('returns the source unchanged without a translation', () => {
    const source = { title: 'Titel' };
    expect(overlayTranslation(source, null, ['title'])).toBe(source);
  });

  it('only touches the listed fields', () => {
    const result = overlayTranslation({ type: 'text', title: 'Titel' }, { type: 'star', title: 'Title' }, ['title']);
    expect(result.type).toBe('text');
  });
});

describe('overlayOptions', () => {
  it('keeps the source length and falls back per option', () => {
    expect(overlayOptions(['Ja', 'Nein', 'Vielleicht'], ['Yes', ''])).toEqual(['Yes', 'Nein', 'Vielleicht']);
  });
});

describe('field status', () => {
  it('distinguishes not needed, missing, outdated and done', () => {
    expect(fieldStatus('', 'x', undefined)).toBe('notNeeded');
    expect(fieldStatus(null, null, undefined)).toBe('notNeeded');
    expect(fieldStatus('Original', '', undefined)).toBe('missing');
    expect(fieldStatus('Original', 'Translation', hashSource('Original'))).toBe('done');
    expect(fieldStatus('Original geändert', 'Translation', hashSource('Original'))).toBe('outdated');
  });

  it('treats a translation without stored hash as done', () => {
    expect(fieldStatus('Original', 'Translation', undefined)).toBe('done');
  });

  it('builds hashes only for translated fields and detects later source changes', () => {
    const source = { title: 'Titel', description: 'Text', taskA: null } as Record<string, string | null>;
    const hashes = buildSourceHashes(source, { title: 'Title', description: '', taskA: null }, [
      'title',
      'description',
      'taskA'
    ]);
    expect(Object.keys(hashes)).toEqual(['title']);

    const changedSource: Record<string, string | null> = { ...source, title: 'Neuer Titel' };
    const statuses = translationFieldStatuses(
      changedSource,
      { title: 'Title', description: null, sourceHashes: hashes },
      ['title', 'description', 'taskA']
    );
    expect(statuses).toEqual({ title: 'outdated', description: 'missing', taskA: 'notNeeded' });
    expect(countStatuses(Object.values(statuses))).toEqual({ total: 2, done: 0, missing: 1, outdated: 1 });
  });

  it('covers every element text field', () => {
    expect(ELEMENT_TRANSLATABLE_FIELDS).toEqual([
      'title',
      'description',
      'taskA',
      'devPromptA',
      'taskB',
      'devPromptB',
      'devPromptC'
    ]);
  });

  it('checks quiz options as a whole', () => {
    expect(optionsStatus([], [], null)).toBe('notNeeded');
    expect(optionsStatus(['A', 'B'], ['A'], null)).toBe('missing');
    expect(optionsStatus(['A', 'B'], ['a', 'b'], { options: hashOptions(['A', 'B']) })).toBe('done');
    expect(optionsStatus(['A', 'C'], ['a', 'b'], { options: hashOptions(['A', 'B']) })).toBe('outdated');
  });
});

describe('courseAvailability', () => {
  const germanCourse = { lang: 'de', active: 1 };

  it('uses Course.active in the source language', () => {
    expect(courseAvailability(germanCourse, null, 'de')).toEqual({ available: true, active: 1 });
  });

  it('needs a translation for other languages and uses its own active flag', () => {
    expect(courseAvailability(germanCourse, null, 'en')).toEqual({ available: false, active: 0 });
    expect(courseAvailability(germanCourse, { active: 0 }, 'en')).toEqual({ available: true, active: 0 });
    expect(courseAvailability(germanCourse, { active: 2 }, 'en')).toEqual({ available: true, active: 2 });
  });

  it('keeps an English-only course out of the German pages', () => {
    expect(courseAvailability({ lang: 'en', active: 1 }, null, 'de').available).toBe(false);
  });
});
