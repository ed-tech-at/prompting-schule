import { beforeEach, describe, expect, it } from 'vitest';
import {
  INFOBLOCK_PLACEMENTS,
  INFOBLOCK_PLACEMENT_LABELS,
  isInfoBlockPlacement,
  MAX_EMAIL_PATTERN_LENGTH,
  MAX_MATCHED_EMAIL_LENGTH,
  MAX_PATTERN_PROBE_MS,
  buildProbeInputs,
  formatDateTimeInput,
  isInfoBlockVisible,
  isWithinDateWindow,
  matchesEmailPattern,
  matchesLang,
  matchesPlacement,
  measurePatternCost,
  normalizeVariant,
  parseDateTimeInput,
  resetEmailPatternCache,
  selectVisibleInfoBlocks,
  validateEmailPattern,
  type InfoBlockContext,
  type InfoBlockRecord
} from './filter';

function makeBlock(overrides: Partial<InfoBlockRecord> = {}): InfoBlockRecord {
  return {
    id: 1,
    content: '<p>Hinweis</p>',
    variant: 'info',
    lang: 'both',
    placements: ['startseite'],
    emailPattern: null,
    validFrom: null,
    validUntil: null,
    active: 1,
    ...overrides
  };
}

function makeContext(overrides: Partial<InfoBlockContext> = {}): InfoBlockContext {
  return {
    placement: 'startseite',
    lang: 'de',
    email: null,
    now: new Date(2026, 7, 15, 12, 0),
    ...overrides
  };
}

beforeEach(() => {
  resetEmailPatternCache();
});

describe('validateEmailPattern', () => {
  it('accepts an empty pattern as "visible to everyone"', () => {
    expect(validateEmailPattern('')).toBeNull();
  });

  it.each([
    '@tugraz\\.at$',
    '^[a-z0-9._%+-]+@tugraz\\.at$',
    '@(student\\.)?tugraz\\.at$',
    '@(tugraz|uni-graz)\\.at$',
    '^vorname\\.nachname@tugraz\\.at$'
  ])('accepts the realistic pattern %s', (pattern) => {
    expect(validateEmailPattern(pattern)).toBeNull();
  });

  it('rejects a pattern that is too long', () => {
    expect(validateEmailPattern('a'.repeat(MAX_EMAIL_PATTERN_LENGTH + 1))).toMatch(/höchstens/);
  });

  it.each([
    ['(a+)+$', /Gruppen/],
    ['(a|b)*c', /Gruppen/],
    ['(ab){2,5}c', /Gruppen/],
    ['(x)\\1', /Rückwärtsverweise/],
    ['\\k<name>', /Rückwärtsverweise/],
    ['(?=foo)bar', /Vorausschau/],
    ['(?!foo)bar', /Vorausschau/],
    ['(?<=foo)bar', /Vorausschau/],
    ['a{0,5000}', /Wiederholungen über/],
    ['[a-z', /Zeichenklasse/],
    ['abc\\', /Escape/],
    ['[a-z]*[0-9]*[a-z]*[0-9]*', /offene Wiederholungen/],
    ['a?b?c?d?e?f?', /zu viele Wiederholungszeichen/]
  ])('rejects %s', (pattern, expected) => {
    expect(validateEmailPattern(pattern)).toMatch(expected);
  });

  it('rejects a pattern that does not compile', () => {
    expect(validateEmailPattern('(unclosed')).toMatch(/gültiger regulärer Ausdruck/);
  });

  it('treats metacharacters inside a character class as literals', () => {
    // "[*+]" is a class of two literal characters, not two quantifiers.
    expect(validateEmailPattern('[*+?]@tugraz\\.at$')).toBeNull();
  });

  it('does not treat an escaped parenthesis as a group', () => {
    expect(validateEmailPattern('\\(intern\\)@tugraz\\.at$')).toBeNull();
  });

  it('allows a lazy quantifier without counting it twice', () => {
    expect(validateEmailPattern('^.+?@.+?\\.at$')).toBeNull();
  });

  it('rejects a polynomial pattern that passes the structural checks', () => {
    // Structurally legal (3 unbounded + 1 bounded quantifier, no quantified
    // group), but it backtracks badly — only the runtime probe catches this.
    const pattern = '^[a-z]*[a-z]*[a-z]*[a-z]{0,100}!$';

    expect(measurePatternCost(pattern)).toBeGreaterThan(MAX_PATTERN_PROBE_MS);
    expect(validateEmailPattern(pattern)).toMatch(/Rechenzeit/);
  });

  it('aborts the probe early instead of running the worst case at full length', () => {
    // The staged probe must stop at the first over-budget length, so validating
    // even a pathological pattern stays fast enough for a form submission.
    const start = performance.now();
    validateEmailPattern('^[a-z]*[a-z]*[a-z]*[a-z]{0,100}!$');
    expect(performance.now() - start).toBeLessThan(1000);
  });

  it('leaves realistic patterns far below the probe budget', () => {
    expect(measurePatternCost('@tugraz\\.at$')).toBeLessThan(MAX_PATTERN_PROBE_MS);
  });
});

describe('buildProbeInputs', () => {
  it('produces deterministic inputs of the requested length', () => {
    const first = buildProbeInputs('@tugraz\\.at$', 64);
    const second = buildProbeInputs('@tugraz\\.at$', 64);

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    for (const probe of first) {
      expect(probe).toHaveLength(64);
    }
  });

  it('defaults to the maximum matched email length', () => {
    for (const probe of buildProbeInputs('@tugraz\\.at$')) {
      expect(probe).toHaveLength(MAX_MATCHED_EMAIL_LENGTH);
    }
  });
});

describe('matchesEmailPattern', () => {
  it('shows patternless blocks to everyone, including logged-out visitors', () => {
    expect(matchesEmailPattern(null, null)).toBe(true);
    expect(matchesEmailPattern(null, 'max@tugraz.at')).toBe(true);
    expect(matchesEmailPattern('', 'max@example.com')).toBe(true);
  });

  it('hides patterned blocks from logged-out visitors', () => {
    expect(matchesEmailPattern('@tugraz\\.at$', null)).toBe(false);
    expect(matchesEmailPattern('@tugraz\\.at$', '')).toBe(false);
  });

  it('matches the TU Graz use case', () => {
    expect(matchesEmailPattern('@tugraz\\.at$', 'max.muster@tugraz.at')).toBe(true);
    expect(matchesEmailPattern('@tugraz\\.at$', 'max@example.com')).toBe(false);
  });

  it('ignores case', () => {
    expect(matchesEmailPattern('@tugraz\\.at$', 'MAX@TUGRAZ.AT')).toBe(true);
  });

  it('returns the same result on repeated calls', () => {
    // Guards against an accidental "g" flag, whose lastIndex would otherwise
    // make the same email alternate between match and no-match.
    for (let i = 0; i < 4; i += 1) {
      expect(matchesEmailPattern('tugraz', 'max@tugraz.at')).toBe(true);
    }
  });

  it('rejects emails beyond the RFC 5321 maximum length', () => {
    const local = 'a'.repeat(MAX_MATCHED_EMAIL_LENGTH - '@tugraz.at'.length);
    const email = `${local}@tugraz.at`;

    expect(email).toHaveLength(MAX_MATCHED_EMAIL_LENGTH);
    expect(matchesEmailPattern('@tugraz\\.at$', email)).toBe(true);
    expect(matchesEmailPattern('@tugraz\\.at$', `a${email}`)).toBe(false);
  });

  it('fails closed for an invalid pattern', () => {
    expect(matchesEmailPattern('(unclosed', 'max@tugraz.at')).toBe(false);
  });
});

describe('isWithinDateWindow', () => {
  const now = new Date(2026, 7, 15, 12, 0);

  it('is open when no dates are set', () => {
    expect(isWithinDateWindow({ validFrom: null, validUntil: null }, now)).toBe(true);
  });

  it('hides a block before validFrom', () => {
    expect(
      isWithinDateWindow({ validFrom: new Date(2026, 7, 16), validUntil: null }, now)
    ).toBe(false);
  });

  it('hides a block after validUntil', () => {
    expect(
      isWithinDateWindow({ validFrom: null, validUntil: new Date(2026, 7, 14) }, now)
    ).toBe(false);
  });

  it('shows a block inside the window', () => {
    expect(
      isWithinDateWindow(
        { validFrom: new Date(2026, 7, 14), validUntil: new Date(2026, 7, 16) },
        now
      )
    ).toBe(true);
  });

  it('treats both bounds as inclusive', () => {
    expect(isWithinDateWindow({ validFrom: now, validUntil: now }, now)).toBe(true);
  });
});

describe('matchesLang', () => {
  it.each([
    ['de', 'de' as const, true],
    ['de', 'en' as const, false],
    ['en', 'en' as const, true],
    ['en', 'de' as const, false],
    ['both', 'de' as const, true],
    ['both', 'en' as const, true]
  ])('block lang %s on a %s page is %s', (blockLang, pageLang, expected) => {
    expect(matchesLang({ lang: blockLang }, pageLang)).toBe(expected);
  });
});

describe('matchesPlacement', () => {
  it('matches only the listed placements', () => {
    expect(matchesPlacement({ placements: ['startseite'] }, 'startseite')).toBe(true);
    expect(matchesPlacement({ placements: ['startseite'] }, 'kursuebersicht')).toBe(false);
    expect(matchesPlacement({ placements: [] }, 'startseite')).toBe(false);
    expect(
      matchesPlacement({ placements: ['startseite', 'kursuebersicht'] }, 'kursuebersicht')
    ).toBe(true);
  });

  it('supports the profile placement', () => {
    expect(matchesPlacement({ placements: ['profil'] }, 'profil')).toBe(true);
    expect(matchesPlacement({ placements: ['profil'] }, 'startseite')).toBe(false);
    expect(matchesPlacement({ placements: ['startseite'] }, 'profil')).toBe(false);
  });

  it('knows every placement offered in the admin UI', () => {
    expect([...INFOBLOCK_PLACEMENTS]).toEqual(['startseite', 'kursuebersicht', 'profil']);
    for (const placement of INFOBLOCK_PLACEMENTS) {
      expect(isInfoBlockPlacement(placement)).toBe(true);
      expect(INFOBLOCK_PLACEMENT_LABELS[placement]).toBeTruthy();
    }
    expect(isInfoBlockPlacement('lektion')).toBe(false);
  });
});

describe('normalizeVariant', () => {
  it.each([
    ['info', 'info'],
    ['warning', 'warning'],
    ['success', 'success'],
    ['danger', 'info'],
    ['', 'info']
  ])('maps %s to %s', (value, expected) => {
    expect(normalizeVariant(value)).toBe(expected);
  });
});

describe('isInfoBlockVisible', () => {
  it('shows a plain active block', () => {
    expect(isInfoBlockVisible(makeBlock(), makeContext())).toBe(true);
  });

  it('hides an inactive block regardless of everything else', () => {
    expect(isInfoBlockVisible(makeBlock({ active: 0 }), makeContext())).toBe(false);
  });

  it('hides a block on a different page', () => {
    expect(
      isInfoBlockVisible(makeBlock(), makeContext({ placement: 'kursuebersicht' }))
    ).toBe(false);
  });

  it('covers the TU Graz course-overview case', () => {
    const block = makeBlock({
      placements: ['kursuebersicht'],
      lang: 'de',
      emailPattern: '@tugraz\\.at$'
    });

    expect(
      isInfoBlockVisible(
        block,
        makeContext({ placement: 'kursuebersicht', email: 'max@tugraz.at' })
      )
    ).toBe(true);
    expect(
      isInfoBlockVisible(
        block,
        makeContext({ placement: 'kursuebersicht', email: 'max@example.com' })
      )
    ).toBe(false);
    expect(
      isInfoBlockVisible(
        block,
        makeContext({ placement: 'kursuebersicht', lang: 'en', email: 'max@tugraz.at' })
      )
    ).toBe(false);
  });

  it('covers the expired maintenance-banner case', () => {
    const block = makeBlock({ validUntil: new Date(2026, 7, 15, 6, 0) });
    expect(isInfoBlockVisible(block, makeContext())).toBe(false);
  });
});

describe('selectVisibleInfoBlocks', () => {
  it('preserves the input order', () => {
    const blocks = [makeBlock({ id: 7 }), makeBlock({ id: 3 }), makeBlock({ id: 9 })];
    expect(selectVisibleInfoBlocks(blocks, makeContext()).map((b) => b.id)).toEqual([7, 3, 9]);
  });

  it('drops invisible blocks', () => {
    const blocks = [
      makeBlock({ id: 1 }),
      makeBlock({ id: 2, active: 0 }),
      makeBlock({ id: 3, emailPattern: '@tugraz\\.at$' })
    ];
    expect(selectVisibleInfoBlocks(blocks, makeContext()).map((b) => b.id)).toEqual([1]);
  });

  it('never leaks the email pattern or the time window to the client', () => {
    const blocks = [
      makeBlock({ emailPattern: '@tugraz\\.at$', validUntil: new Date(2026, 11, 31) })
    ];
    const [view] = selectVisibleInfoBlocks(blocks, makeContext({ email: 'max@tugraz.at' }));

    expect(Object.keys(view).sort()).toEqual(['content', 'id', 'variant']);
  });

  it('normalizes an unknown variant', () => {
    const [view] = selectVisibleInfoBlocks([makeBlock({ variant: 'danger' })], makeContext());
    expect(view.variant).toBe('info');
  });
});

describe('parseDateTimeInput / formatDateTimeInput', () => {
  it('parses a datetime-local value into local wall-clock time', () => {
    const date = parseDateTimeInput('2026-08-15T22:30');

    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(15);
    expect(date?.getHours()).toBe(22);
    expect(date?.getMinutes()).toBe(30);
  });

  it('round-trips through formatDateTimeInput', () => {
    expect(formatDateTimeInput(parseDateTimeInput('2026-01-05T07:05'))).toBe('2026-01-05T07:05');
  });

  it('accepts an optional seconds part', () => {
    expect(formatDateTimeInput(parseDateTimeInput('2026-08-15T22:30:00'))).toBe('2026-08-15T22:30');
  });

  it.each(['', '   ', 'morgen', '2026-08-15', '2026-13-01T10:00', '2026-02-31T10:00'])(
    'returns null for %s',
    (value) => {
      expect(parseDateTimeInput(value)).toBeNull();
    }
  );

  it('formats null as an empty string', () => {
    expect(formatDateTimeInput(null)).toBe('');
  });
});
