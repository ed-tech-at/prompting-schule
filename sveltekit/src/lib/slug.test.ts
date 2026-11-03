import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('keeps only lowercase letters, digits and single hyphens', () => {
    expect(slugify('  Prompting: The Basics (Part 2)! ')).toBe('prompting-the-basics-part-2');
  });

  it('spells out German umlauts and strips other accents', () => {
    expect(slugify('Größere Übungen für Café')).toBe('groessere-uebungen-fuer-cafe');
  });
});
