import { describe, expect, it } from 'vitest';
import {
  INFOBLOCK_PLACEMENTS,
  INFOBLOCK_PLACEMENT_LABELS,
  isInfoBlockPlacement,
  MAX_EMAIL_DOMAINS,
  MAX_EMAIL_PATTERN_LENGTH,
  formatDateTimeInput,
  isInfoBlockVisible,
  isWithinDateWindow,
  matchesEmailPattern,
  matchesLang,
  matchesPlacement,
  normalizeEmailPattern,
  normalizeVariant,
  parseDateTimeInput,
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

describe('validateEmailPattern', () => {
  it('accepts an empty list as "visible to everyone"', () => {
    expect(validateEmailPattern('')).toBeNull();
  });

  it.each(['tugraz.at', '@tugraz.at', 'tugraz.at, student.tugraz.at', 'uni-graz.at;tugraz.at', 'TUGraz.AT'])(
    'accepts %j',
    (pattern) => {
      expect(validateEmailPattern(pattern)).toBeNull();
    }
  );

  it.each(['@tugraz\\.at$', 'tugraz', '*.tugraz.at', 'tu graz.at', '-tugraz.at', 'tugraz..at', 'a@b.at'])(
    'rejects %j',
    (pattern) => {
      expect(validateEmailPattern(pattern)).not.toBeNull();
    }
  );

  it('rejects a list that is too long', () => {
    expect(validateEmailPattern('a.at,'.repeat(MAX_EMAIL_PATTERN_LENGTH))).not.toBeNull();
  });

  it('rejects too many domains', () => {
    const domains = Array.from({ length: MAX_EMAIL_DOMAINS + 1 }, (_, i) => `d${i}.at`).join(',');
    expect(validateEmailPattern(domains)).not.toBeNull();
  });
});

describe('normalizeEmailPattern', () => {
  it('stores a canonical, de-duplicated list', () => {
    expect(normalizeEmailPattern(' @TUGraz.at;student.tugraz.at\n tugraz.at ')).toBe(
      'tugraz.at, student.tugraz.at'
    );
  });

  it('stores null for an empty list', () => {
    expect(normalizeEmailPattern('  ,  ')).toBeNull();
  });
});

describe('matchesEmailPattern', () => {
  it('matches everyone without a list, including logged-out visitors', () => {
    expect(matchesEmailPattern(null, null)).toBe(true);
    expect(matchesEmailPattern('', 'max@example.test')).toBe(true);
  });

  it('hides restricted blocks from logged-out visitors', () => {
    expect(matchesEmailPattern('tugraz.at', null)).toBe(false);
  });

  it('matches the domain and its subdomains, case-insensitively', () => {
    expect(matchesEmailPattern('tugraz.at', 'Max@TUGraz.at')).toBe(true);
    expect(matchesEmailPattern('tugraz.at', 'max@student.tugraz.at')).toBe(true);
  });

  it('does not match look-alike domains or the local part', () => {
    expect(matchesEmailPattern('tugraz.at', 'max@nottugraz.at')).toBe(false);
    expect(matchesEmailPattern('tugraz.at', 'max@tugraz.at.evil.example')).toBe(false);
    expect(matchesEmailPattern('tugraz.at', 'tugraz.at@example.test')).toBe(false);
  });

  it('matches any domain of the list', () => {
    expect(matchesEmailPattern('uni-graz.at, tugraz.at', 'max@uni-graz.at')).toBe(true);
  });

  it('stays fast for long adversarial addresses', () => {
    const email = '1'.repeat(10000) + '@' + 'a.'.repeat(5000) + 'at';
    const start = performance.now();
    for (let i = 0; i < 100; i++) matchesEmailPattern('tugraz.at, student.tugraz.at', email);
    expect(performance.now() - start).toBeLessThan(200);
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
      emailPattern: 'tugraz.at'
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
      makeBlock({ id: 3, emailPattern: 'tugraz.at' })
    ];
    expect(selectVisibleInfoBlocks(blocks, makeContext()).map((b) => b.id)).toEqual([1]);
  });

  it('never leaks the email pattern or the time window to the client', () => {
    const blocks = [
      makeBlock({ emailPattern: 'tugraz.at', validUntil: new Date(2026, 11, 31) })
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
