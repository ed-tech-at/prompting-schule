import { describe, expect, it } from 'vitest';
import { AI_TRANSLATABLE_FIELDS, buildTranslationInstructions } from './aiPrompt';
import { ELEMENT_TRANSLATABLE_FIELDS, COURSE_TRANSLATABLE_FIELDS } from './core';

describe('buildTranslationInstructions', () => {
  it('names both languages and protects markup', () => {
    const instructions = buildTranslationInstructions('description', 'de', 'en');
    expect(instructions).toContain('from German to English');
    expect(instructions).toContain('Keep all HTML tags');
    expect(instructions).not.toContain('system prompt');
  });

  it('adapts system prompts to answer in the target language', () => {
    const instructions = buildTranslationInstructions('devPromptA', 'de', 'en');
    expect(instructions).toContain('system prompt');
    expect(instructions).toContain('answer in German, make it answer in English');
  });

  it('allows every translatable text field', () => {
    for (const field of [...COURSE_TRANSLATABLE_FIELDS, ...ELEMENT_TRANSLATABLE_FIELDS, 'lessonName', 'question', 'option']) {
      expect(AI_TRANSLATABLE_FIELDS).toContain(field);
    }
  });
});
