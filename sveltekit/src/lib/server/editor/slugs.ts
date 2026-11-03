import { prisma } from '$lib/server/db';
import type { CourseLang } from '$lib/courseLang';

// Slugs can be translated per language (CourseTranslation.URL,
// LessonTranslation.URL). A URL must still lead to exactly one course or
// lesson, so these checks look at source and translated slugs together.

// Course slugs are unique across all source and translated slugs. Slugs of the
// course itself never clash: they all lead to the same course. With `lang`,
// only that one translation of the course counts as its own (the others are
// still checked, the database keeps translated slugs unique).
export async function courseSlugTaken(slug: string, own?: { courseId: number; lang?: CourseLang }) {
  const [course, translation] = await Promise.all([
    prisma.course.findFirst({
      where: { URL: slug, ...(own ? { id: { not: own.courseId } } : {}) },
      select: { id: true }
    }),
    prisma.courseTranslation.findFirst({
      where: {
        URL: slug,
        ...(own
          ? { NOT: own.lang ? { courseId: own.courseId, lang: own.lang } : { courseId: own.courseId } }
          : {})
      },
      select: { id: true }
    })
  ]);
  return course !== null || translation !== null;
}

// Lesson slugs are unique per course and language. A source slug resolves in
// every language, so without `lang` it is checked against all translations.
export async function lessonSlugTaken(
  courseId: number,
  slug: string,
  own?: { lessonId: number; lang?: CourseLang }
) {
  const [lesson, translation] = await Promise.all([
    prisma.lesson.findFirst({
      where: { courseId, URL: slug, ...(own ? { id: { not: own.lessonId } } : {}) },
      select: { id: true }
    }),
    prisma.lessonTranslation.findFirst({
      where: {
        URL: slug,
        lesson: { courseId },
        ...(own?.lang ? { lang: own.lang } : {}),
        ...(own ? { lessonId: { not: own.lessonId } } : {})
      },
      select: { id: true }
    })
  ]);
  return lesson !== null || translation !== null;
}
