import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  courseFindUnique: vi.fn(),
  courseFindFirst: vi.fn(),
  courseFindUniqueOrThrow: vi.fn(),
  lessonFindUniqueOrThrow: vi.fn(),
  lessonFindFirst: vi.fn(),
  lessonFindMany: vi.fn(),
  elementFindMany: vi.fn(),
  quizFindMany: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: {
    course: {
      findUnique: mocks.courseFindUnique,
      findFirst: mocks.courseFindFirst,
      findUniqueOrThrow: mocks.courseFindUniqueOrThrow
    },
    lesson: {
      findFirst: mocks.lessonFindFirst,
      findMany: mocks.lessonFindMany,
      findUniqueOrThrow: mocks.lessonFindUniqueOrThrow
    },
    element: { findMany: mocks.elementFindMany },
    quizQuestion: { findMany: mocks.quizFindMany },
    badge: { findMany: vi.fn().mockResolvedValue([]) }
  }
}));

vi.mock('$lib/server/jwt', () => ({
  requireLogin: () => ({ id: 'learner', email: 'learner@example.test', isAdmin: 0 })
}));

import { load as courseLoad } from './[kursUrl]/+page.server';
import { load as lessonLoad } from './[kursUrl]/[lessonUrl]/+page.server';
import { load as quizLoad } from './[kursUrl]/[lessonUrl]/quiz/+page.server';
import { load as englishLessonLoad } from '../en/course/[kursUrl]/[lessonUrl]/+page.server';
import { load as englishQuizLoad } from '../en/course/[kursUrl]/[lessonUrl]/quiz/+page.server';
import type { loadLessonPage } from '$lib/server/coursePages';

const event = (params: Record<string, string>) =>
  ({ params, cookies: {}, url: new URL('http://localhost/?tab=1') }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.elementFindMany.mockResolvedValue([]);
  mocks.quizFindMany.mockResolvedValue([]);
  mocks.lessonFindMany.mockResolvedValue([]);
  // No translated slug matches unless a test says so.
  mocks.courseFindFirst.mockResolvedValue(null);
  mocks.courseFindUniqueOrThrow.mockResolvedValue({ URL: 'kurs', translations: [] });
  mocks.lessonFindUniqueOrThrow.mockResolvedValue({ URL: 'lektion', translations: [] });
});

describe('German course loads keep the course/lesson scope', () => {
  it('returns 404 for an unknown course instead of listing lessons of all courses', async () => {
    mocks.courseFindUnique.mockResolvedValue(null);

    await expect(courseLoad(event({ kursUrl: 'gibt-es-nicht' }))).rejects.toMatchObject({ status: 404 });
    expect(mocks.lessonFindMany).not.toHaveBeenCalled();
  });

  it.each([
    ['lesson', lessonLoad, mocks.elementFindMany],
    ['quiz', quizLoad, mocks.quizFindMany]
  ])('%s load returns 404 for an unknown lesson and runs no unscoped query', async (_, load, childQuery) => {
    mocks.courseFindUnique.mockResolvedValue({ id: 1, URL: 'kurs', lang: 'de', active: 1, translations: [] });
    mocks.lessonFindFirst.mockResolvedValue(null);

    await expect(load(event({ kursUrl: 'kurs', lessonUrl: 'gibt-es-nicht' }))).rejects.toMatchObject({
      status: 404
    });
    expect(mocks.lessonFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { URL: 'gibt-es-nicht', courseId: 1 } })
    );
    expect(childQuery).not.toHaveBeenCalled();
  });

  it('queries elements only for the resolved lesson', async () => {
    mocks.courseFindUnique.mockResolvedValue({ id: 1, URL: 'kurs', lang: 'de', active: 1, translations: [] });
    mocks.lessonFindFirst.mockResolvedValue({ id: 10, URL: 'lektion', courseId: 1 });

    await lessonLoad(event({ kursUrl: 'kurs', lessonUrl: 'lektion' }));

    expect(mocks.elementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lessonId: 10 } })
    );
  });
});

describe('Course languages', () => {
  it('returns 404 for a German course without English translation on the English pages', async () => {
    mocks.courseFindUnique.mockResolvedValue({ id: 1, URL: 'kurs', lang: 'de', active: 1, translations: [] });

    await expect(
      englishLessonLoad(event({ kursUrl: 'kurs', lessonUrl: 'lektion' }))
    ).rejects.toMatchObject({ status: 404 });
    expect(mocks.lessonFindFirst).not.toHaveBeenCalled();
  });

  it('shows an inactive translation by direct URL and lays it over the source texts', async () => {
    mocks.courseFindUnique.mockResolvedValue({
      id: 1,
      URL: 'kurs',
      name: 'Prompten lernen',
      description: 'Beschreibung',
      lang: 'de',
      active: 1,
      translations: [{ lang: 'en', active: 0, name: 'Learning to prompt', description: '' }]
    });
    mocks.lessonFindFirst.mockResolvedValue({
      id: 10,
      URL: 'lektion',
      courseId: 1,
      lessonName: 'Erste Schritte',
      translations: [{ lang: 'en', lessonName: 'First steps' }]
    });
    mocks.elementFindMany.mockResolvedValue([
      {
        id: 100,
        type: 'text',
        title: null,
        description: '<p>Hallo</p>',
        taskA: null,
        devPromptA: 'Antworte auf Deutsch',
        taskB: null,
        devPromptB: null,
        devPromptC: null,
        translations: [{ lang: 'en', description: '<p>Hello</p>', devPromptA: 'Answer in English' }]
      }
    ]);

    const data = (await englishLessonLoad(event({ kursUrl: 'kurs', lessonUrl: 'lektion' }))) as Awaited<
      ReturnType<typeof loadLessonPage>
    >;

    expect(data.lang).toBe('en');
    expect(data.course.name).toBe('Learning to prompt');
    // Empty translated fields fall back to the source text.
    expect(data.course.description).toBe('Beschreibung');
    expect(data.course.active).toBe(0);
    expect(data.lesson.lessonName).toBe('First steps');
    expect(data.elements[0].description).toBe('<p>Hello</p>');
    // System prompts never reach the browser, translated or not.
    expect(data.elements[0].devPromptA).toBeNull();
    expect(data.elements[0]).not.toHaveProperty('translations');
    // Learners get no flag link to the hidden English version from German
    // pages, but on the English page itself the flag points to this page.
    expect(data.langLinks).toEqual({
      de: '/kurs/kurs/lektion',
      en: '/en/course/kurs/lektion'
    });
  });

  it('links the flags only to listed language versions', async () => {
    mocks.courseFindUnique.mockResolvedValue({
      id: 1,
      URL: 'kurs',
      lang: 'de',
      active: 1,
      translations: [{ lang: 'en', active: 0 }]
    });
    mocks.lessonFindFirst.mockResolvedValue({ id: 10, URL: 'lektion', courseId: 1, translations: [] });

    const data = (await lessonLoad(event({ kursUrl: 'kurs', lessonUrl: 'lektion' }))) as Awaited<
      ReturnType<typeof loadLessonPage>
    >;

    expect(data.langLinks).toEqual({ de: '/kurs/kurs/lektion' });
  });

  it('resolves translated slugs and links each language with its own slugs', async () => {
    const course = {
      id: 1,
      URL: 'kurs',
      lang: 'de',
      active: 1,
      translations: [{ lang: 'en', active: 1, URL: 'course' }]
    };
    mocks.courseFindFirst.mockResolvedValue(course);
    mocks.courseFindUnique.mockResolvedValue(course);
    mocks.lessonFindFirst.mockResolvedValue({
      id: 10,
      URL: 'lektion',
      courseId: 1,
      translations: [{ lang: 'en', URL: 'lesson' }]
    });
    mocks.courseFindUniqueOrThrow.mockResolvedValue({ URL: 'kurs', translations: [{ lang: 'en', URL: 'course' }] });
    mocks.lessonFindUniqueOrThrow.mockResolvedValue({ URL: 'lektion', translations: [{ lang: 'en', URL: 'lesson' }] });

    const data = (await englishLessonLoad(event({ kursUrl: 'course', lessonUrl: 'lesson' }))) as Awaited<
      ReturnType<typeof loadLessonPage>
    >;

    expect(mocks.courseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { translations: { some: { lang: 'en', URL: 'course' } } } })
    );
    expect(data.course.URL).toBe('course');
    expect(data.lesson.URL).toBe('lesson');
    expect(data.langLinks).toEqual({ de: '/kurs/kurs/lektion', en: '/en/course/course/lesson' });
  });

  it('redirects the source slugs permanently to the translated ones', async () => {
    const course = { id: 1, URL: 'kurs', lang: 'de', active: 1, translations: [{ lang: 'en', active: 1, URL: 'course' }] };
    mocks.courseFindUnique.mockResolvedValue(course);
    mocks.lessonFindFirst.mockResolvedValue({
      id: 10,
      URL: 'lektion',
      courseId: 1,
      translations: [{ lang: 'en', URL: 'lesson' }]
    });

    await expect(englishQuizLoad(event({ kursUrl: 'kurs', lessonUrl: 'lektion' }))).rejects.toMatchObject({
      status: 301,
      location: expect.stringMatching(/\/en\/course\/course\/lesson\/quiz\?tab=1$/)
    });
  });
});
