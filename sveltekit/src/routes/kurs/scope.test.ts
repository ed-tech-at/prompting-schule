import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  courseFindUnique: vi.fn(),
  lessonFindFirst: vi.fn(),
  lessonFindMany: vi.fn(),
  elementFindMany: vi.fn(),
  quizFindMany: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: {
    course: { findUnique: mocks.courseFindUnique },
    lesson: { findFirst: mocks.lessonFindFirst, findMany: mocks.lessonFindMany },
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

const event = (params: Record<string, string>) => ({ params, cookies: {} }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.elementFindMany.mockResolvedValue([]);
  mocks.quizFindMany.mockResolvedValue([]);
  mocks.lessonFindMany.mockResolvedValue([]);
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
    mocks.courseFindUnique.mockResolvedValue({ id: 1, URL: 'kurs' });
    mocks.lessonFindFirst.mockResolvedValue(null);

    await expect(load(event({ kursUrl: 'kurs', lessonUrl: 'gibt-es-nicht' }))).rejects.toMatchObject({
      status: 404
    });
    expect(mocks.lessonFindFirst).toHaveBeenCalledWith({
      where: { URL: 'gibt-es-nicht', courseId: 1 }
    });
    expect(childQuery).not.toHaveBeenCalled();
  });

  it('queries elements only for the resolved lesson', async () => {
    mocks.courseFindUnique.mockResolvedValue({ id: 1, URL: 'kurs' });
    mocks.lessonFindFirst.mockResolvedValue({ id: 10, URL: 'lektion', courseId: 1 });

    await lessonLoad(event({ kursUrl: 'kurs', lessonUrl: 'lektion' }));

    expect(mocks.elementFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lessonId: 10 } })
    );
  });
});
