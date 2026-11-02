import { describe, expect, it } from 'vitest';
import {
  COURSE_EXPORT_FORMAT_VERSION,
  diffCourseImport,
  parseCourseExportFile,
  serializeCourse as serializeRows,
  suggestCopyCourseUrl,
  type CourseExport,
  type ExistingCourseSnapshot
} from './exportImport';

// The fixtures are written in export shape; serializeCourse takes Prisma rows,
// which only differ in how translations are stored.
const serializeCourse = (course: unknown, exportedAt?: Date) =>
  serializeRows(course as Parameters<typeof serializeRows>[0], exportedAt);

function makeElement(overrides: Partial<CourseExport['lessons'][number]['elements'][number]> = {}) {
  return {
    type: 'text',
    title: null,
    description: '<p>Hallo</p>',
    taskA: null,
    devPromptA: null,
    taskB: null,
    devPromptB: null,
    devPromptC: null,
    position: 1,
    ...overrides
  };
}

function makeQuestion(overrides: Partial<CourseExport['lessons'][number]['quizQuestions'][number]> = {}) {
  return {
    question: 'Was ist ein Prompt?',
    type: 's',
    options: ['A', 'B'],
    correct: ['A'],
    position: 1,
    ...overrides
  };
}

function makeCourse(overrides: Partial<CourseExport> = {}): CourseExport {
  return {
    name: 'Testkurs',
    URL: 'testkurs',
    description: null,
    introDescription: null,
    introDescriptionSuffix: null,
    active: 1,
    position: 1,
    displayType: null,
    lang: 'de',
    lessons: [
      {
        lessonName: 'Lektion 1',
        lessonEmoji: '🧭',
        URL: 'lektion-1',
        active: 1,
        starsNeeded: 0,
        position: 1,
        elements: [makeElement()],
        quizQuestions: [makeQuestion()]
      }
    ],
    ...overrides
  };
}

function makeSnapshot(overrides: Partial<ExistingCourseSnapshot> = {}): ExistingCourseSnapshot {
  const course = makeCourse();
  return {
    ...course,
    id: 1,
    lessons: [
      {
        ...course.lessons[0],
        id: 11,
        elements: [{ ...makeElement(), id: 111 }],
        quizQuestions: [{ ...makeQuestion(), id: 211 }]
      }
    ],
    ...overrides
  };
}

describe('serializeCourse', () => {
  it('strips ids, sorts by position and sets the format version', () => {
    const serialized = serializeCourse(
      {
        ...makeCourse(),
        id: 99,
        lessons: [
          {
            ...makeCourse().lessons[0],
            id: 12,
            URL: 'lektion-2',
            lessonName: 'Lektion 2',
            position: 2,
            elements: [
              { ...makeElement(), id: 5, position: 2 },
              { ...makeElement(), id: 6, position: 1, type: 'note' }
            ],
            quizQuestions: []
          },
          {
            ...makeCourse().lessons[0],
            id: 11,
            position: 1
          }
        ]
      },
      new Date('2026-08-15T00:00:00.000Z')
    );

    expect(serialized.formatVersion).toBe(COURSE_EXPORT_FORMAT_VERSION);
    expect(serialized.exportedAt).toBe('2026-08-15T00:00:00.000Z');
    expect(serialized.course).not.toHaveProperty('id');
    expect(serialized.course.lessons.map((lesson) => lesson.URL)).toEqual([
      'lektion-1',
      'lektion-2'
    ]);
    expect(serialized.course.lessons[1].elements.map((element) => element.type)).toEqual([
      'note',
      'text'
    ]);
    expect(serialized.course.lessons[0]).not.toHaveProperty('id');
    expect(serialized.course.lessons[0].elements[0]).not.toHaveProperty('id');
  });
});

describe('parseCourseExportFile', () => {
  it('round-trips a serialized course', () => {
    const serialized = serializeCourse(makeCourse());
    const parsed = parseCourseExportFile(JSON.stringify(serialized));

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.course).toEqual(serialized.course);
    }
  });

  it('rejects broken JSON', () => {
    const parsed = parseCourseExportFile('{nope');
    expect(parsed).toEqual({ ok: false, errors: ['Die Datei enthält kein gültiges JSON.'] });
  });

  it('rejects an unsupported format version', () => {
    const parsed = parseCourseExportFile(JSON.stringify({ formatVersion: 99, course: {} }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors[0]).toContain('Formatversion');
    }
  });

  it('rejects a missing course URL', () => {
    const serialized = serializeCourse(makeCourse({ URL: '' }));
    const parsed = parseCourseExportFile(JSON.stringify(serialized));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((message) => message.includes('Kurs-URL'))).toBe(true);
    }
  });

  it('rejects duplicate lesson URLs within the file', () => {
    const course = makeCourse();
    course.lessons.push({ ...course.lessons[0], position: 2 });
    const parsed = parseCourseExportFile(JSON.stringify(serializeCourse(course)));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((message) => message.includes('mehrfach'))).toBe(true);
    }
  });

  it('rejects an invalid quiz type and non-array options', () => {
    const course = makeCourse();
    course.lessons[0].quizQuestions[0].type = 'ranking';
    const parsed = parseCourseExportFile(JSON.stringify(serializeCourse(course)));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((message) => message.includes('s, m'))).toBe(true);
    }

    const broken = JSON.parse(JSON.stringify(serializeCourse(makeCourse())));
    broken.course.lessons[0].quizQuestions[0].options = 'A,B';
    const parsedBroken = parseCourseExportFile(JSON.stringify(broken));
    expect(parsedBroken.ok).toBe(false);
    if (!parsedBroken.ok) {
      expect(parsedBroken.errors.some((message) => message.includes('options'))).toBe(true);
    }
  });
});

describe('translations in the export', () => {
  function makeTranslatedCourse() {
    const course = makeCourse();
    return {
      ...course,
      translations: [
        { lang: 'en', active: 0, name: 'Test course', description: null, introDescription: null, introDescriptionSuffix: null, URL: 'test-course', sourceHashes: { name: 'abc' } }
      ],
      lessons: course.lessons.map((lesson) => ({
        ...lesson,
        translations: [{ lang: 'en', lessonName: 'Lesson 1', URL: 'lesson-1', sourceHashes: null }],
        elements: lesson.elements.map((element) => ({
          ...element,
          translations: [{ lang: 'en', description: '<p>Hello</p>', sourceHashes: { description: 'def' } }]
        })),
        quizQuestions: lesson.quizQuestions.map((question) => ({
          ...question,
          translations: [{ lang: 'en', question: 'What is a prompt?', options: ['A (en)', 'B (en)'], sourceHashes: null }]
        }))
      }))
    };
  }

  it('exports translations keyed by language and round-trips them', () => {
    const serialized = serializeCourse(makeTranslatedCourse());

    expect(serialized.formatVersion).toBe(2);
    expect(serialized.course.translations).toEqual({
      en: {
        active: 0,
        name: 'Test course',
        description: null,
        introDescription: null,
        introDescriptionSuffix: null,
        URL: 'test-course',
        sourceHashes: { name: 'abc' }
      }
    });
    expect(serialized.course.lessons[0].translations?.en.URL).toBe('lesson-1');
    expect(serialized.course.lessons[0].elements[0].translations?.en).toMatchObject({
      description: '<p>Hello</p>',
      title: null,
      sourceHashes: { description: 'def' }
    });
    expect(serialized.course.lessons[0].quizQuestions[0].translations?.en.options).toEqual(['A (en)', 'B (en)']);

    const parsed = parseCourseExportFile(JSON.stringify(serialized));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.course).toEqual(serialized.course);
    }
  });

  it('keeps translations undefined for version 1 files so imports leave them alone', () => {
    const v1 = JSON.parse(JSON.stringify(serializeCourse(makeCourse())));
    v1.formatVersion = 1;
    delete v1.course.translations;
    for (const lesson of v1.course.lessons) {
      delete lesson.translations;
      for (const element of lesson.elements) delete element.translations;
      for (const question of lesson.quizQuestions) delete question.translations;
    }

    const parsed = parseCourseExportFile(JSON.stringify(v1));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.course.translations).toBeUndefined();
      expect(parsed.data.course.lessons[0].elements[0].translations).toBeUndefined();
    }
  });

  it('drops translated slugs that are invalid or lead to another lesson', () => {
    const file = JSON.parse(JSON.stringify(serializeCourse(makeTranslatedCourse())));
    file.course.translations.en.URL = 'Not a slug!';
    const second = { ...file.course.lessons[0], URL: 'lektion-2', translations: { en: { lessonName: null, URL: 'lektion-1' } } };
    file.course.lessons.push(second);

    const parsed = parseCourseExportFile(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.course.translations?.en.URL).toBeNull();
      expect(parsed.data.course.lessons[0].translations?.en.URL).toBe('lesson-1');
      // "lektion-1" is the source URL of the first lesson.
      expect(parsed.data.course.lessons[1].translations?.en.URL).toBeNull();
    }
  });

  it('rejects unknown languages and more translated options than source options', () => {
    const broken = JSON.parse(JSON.stringify(serializeCourse(makeTranslatedCourse())));
    broken.course.translations.fr = { name: 'Cours' };
    broken.course.lessons[0].quizQuestions[0].translations.en.options = ['1', '2', '3'];

    const parsed = parseCourseExportFile(JSON.stringify(broken));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.some((message) => message.includes('Übersetzung fr: unbekannte Sprache'))).toBe(true);
      expect(parsed.errors.some((message) => message.includes('mehr übersetzte Antworten'))).toBe(true);
    }
  });
});

describe('diffCourseImport', () => {
  it('marks everything as new for an unknown course', () => {
    const diff = diffCourseImport(makeCourse(), null);

    expect(diff.courseStatus).toBe('new');
    expect(diff.lessons[0].status).toBe('new');
    expect(diff.lessons[0].elements[0].status).toBe('new');
    expect(diff.removedLessons).toEqual([]);
  });

  it('reports unchanged when the file matches the snapshot', () => {
    const diff = diffCourseImport(makeCourse(), makeSnapshot());

    expect(diff.courseStatus).toBe('exists');
    expect(diff.changedCourseFields).toEqual([]);
    expect(diff.lessons[0].status).toBe('unchanged');
    expect(diff.lessons[0].quizReplaced).toBe(false);
  });

  it('detects changed course and lesson fields', () => {
    const incoming = makeCourse({ name: 'Neuer Name' });
    incoming.lessons[0].starsNeeded = 3;

    const diff = diffCourseImport(incoming, makeSnapshot());

    expect(diff.changedCourseFields).toEqual(['name']);
    expect(diff.lessons[0].status).toBe('changed');
    expect(diff.lessons[0].changedFields).toEqual(['starsNeeded']);
  });

  it('pairs elements by position and flags additions, removals and type changes', () => {
    const incoming = makeCourse();
    incoming.lessons[0].elements = [
      makeElement({ type: 'note', position: 1 }),
      makeElement({ position: 2 })
    ];

    const diff = diffCourseImport(incoming, makeSnapshot());

    expect(diff.lessons[0].elements[0].status).toBe('changed');
    expect(diff.lessons[0].elements[0].typeChanged).toBe(true);
    expect(diff.lessons[0].elements[0].existingId).toBe(111);
    expect(diff.lessons[0].elements[1].status).toBe('new');

    const removalIncoming = makeCourse();
    removalIncoming.lessons[0].elements = [];
    const removalDiff = diffCourseImport(removalIncoming, makeSnapshot());
    expect(removalDiff.lessons[0].elementIdsToDelete).toEqual([111]);
  });

  it('lists lessons that exist in the database but not in the file', () => {
    const incoming = makeCourse({ lessons: [] });
    const diff = diffCourseImport(incoming, makeSnapshot());

    expect(diff.removedLessons).toEqual([{ URL: 'lektion-1', lessonName: 'Lektion 1', id: 11 }]);
  });
});

describe('suggestCopyCourseUrl', () => {
  it('keeps a free course URL', () => {
    expect(suggestCopyCourseUrl('testkurs', new Set())).toBe('testkurs');
  });

  it('increments the suffix until a course URL is free', () => {
    expect(suggestCopyCourseUrl('testkurs', new Set(['testkurs', 'testkurs-kopie']))).toBe('testkurs-kopie-2');
  });
});
