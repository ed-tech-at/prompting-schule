import { prisma } from '$lib/server/db';
import { COURSE_LANGS, type CourseLang } from '$lib/courseLang';
import {
  COURSE_TRANSLATABLE_FIELDS,
  ELEMENT_TRANSLATABLE_FIELDS,
  LESSON_TRANSLATABLE_FIELDS,
  QUIZ_TRANSLATABLE_FIELDS,
  courseAvailability,
  overlayOptions,
  overlayTranslation
} from '$lib/server/courseTranslations/core';
import type { Course, Element, Lesson, QuizQuestion } from '@prisma/client';

// Loads course content in one language. Ids stay those of the source rows, so
// progress, quiz attempts and badges are shared across all languages.

function stripTranslations<T extends { translations?: unknown }>(row: T): Omit<T, 'translations'> {
  const { translations: _translations, ...rest } = row;
  return rest;
}

function localizeCourse(course: Course & { translations?: Record<string, unknown>[] }, lang: CourseLang) {
  const translation = course.translations?.[0] as ({ active: number } & Record<string, unknown>) | undefined;
  const { available, active } = courseAvailability(course, translation, lang);
  if (!available) return null;

  return {
    ...overlayTranslation(stripTranslations(course) as Course, translation, COURSE_TRANSLATABLE_FIELDS),
    // `active` is per language: the list visibility of this language version.
    active
  };
}

// Returns null when the course does not exist in this language. A translation
// that is not active is still returned: direct URLs keep working for testing,
// just like inactive courses in their source language.
export async function findCourseForLang(courseUrl: string, lang: CourseLang) {
  const course = await prisma.course.findUnique({
    where: { URL: courseUrl },
    include: { translations: { where: { lang } } }
  });
  if (!course) return null;
  return localizeCourse(course, lang);
}

// Other languages in which this course is listed, for a "also available in" link.
export async function listedLanguagesOfCourse(courseId: number): Promise<CourseLang[]> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { lang: true, active: true, translations: { select: { lang: true, active: true } } }
  });
  if (!course) return [];

  const langs = new Set(
    course.translations.filter((translation) => translation.active > 0).map((translation) => translation.lang)
  );
  if (course.active > 0) langs.add(course.lang);
  return COURSE_LANGS.filter((lang) => langs.has(lang));
}

export async function listCoursesForLang(lang: CourseLang) {
  const courses = await prisma.course.findMany({
    where: {
      OR: [
        { lang, active: { gt: 0 } },
        { translations: { some: { lang, active: { gt: 0 } } } }
      ]
    },
    include: { translations: { where: { lang } } },
    orderBy: { position: 'asc' }
  });

  return courses
    .map((course) => localizeCourse(course, lang))
    .filter((course): course is NonNullable<typeof course> => course !== null && course.active > 0);
}

export function localizeLesson(lesson: Lesson & { translations?: Record<string, unknown>[] }) {
  return overlayTranslation(stripTranslations(lesson) as Lesson, lesson.translations?.[0], LESSON_TRANSLATABLE_FIELDS);
}

export async function findLessonsForLang(courseId: number, lang: CourseLang) {
  const lessons = await prisma.lesson.findMany({
    where: { courseId, active: 1 },
    orderBy: { position: 'asc' },
    include: { translations: { where: { lang } } }
  });
  return lessons.map(localizeLesson);
}

export async function findLessonForLang(courseId: number, lessonUrl: string, lang: CourseLang) {
  const lesson = await prisma.lesson.findFirst({
    where: { URL: lessonUrl, courseId },
    include: { translations: { where: { lang } } }
  });
  return lesson ? localizeLesson(lesson) : null;
}

function localizeElement(element: Element & { translations?: Record<string, unknown>[] }) {
  return overlayTranslation(stripTranslations(element) as Element, element.translations?.[0], ELEMENT_TRANSLATABLE_FIELDS);
}

export async function findElementsForLang(lessonId: number, lang: CourseLang) {
  const elements = await prisma.element.findMany({
    where: { lessonId },
    orderBy: { position: 'asc' },
    include: { translations: { where: { lang } } }
  });
  return elements.map(localizeElement);
}

// For api/aiAnswer: the system prompts must match the language the learner
// sees, otherwise the AI answers an English course in German.
export async function findElementForLang(elementId: number, lang: CourseLang) {
  const element = await prisma.element.findUnique({
    where: { id: elementId },
    include: { translations: { where: { lang } } }
  });
  return element ? localizeElement(element) : null;
}

export type LocalizedQuizOption = { index: number; text: string };

// Quiz options are sent to the browser with their source index. The grader
// maps the index back to the source option, so translations never need their
// own list of correct answers.
export async function findQuizQuestionsForLang(lessonId: number, lang: CourseLang) {
  const questions = await prisma.quizQuestion.findMany({
    where: { lessonId },
    orderBy: { position: 'asc' },
    include: { translations: { where: { lang } } }
  });

  return questions.map((question) => {
    const translation = question.translations[0];
    const localized = overlayTranslation(
      stripTranslations(question) as QuizQuestion,
      translation,
      QUIZ_TRANSLATABLE_FIELDS
    );
    return {
      id: localized.id,
      question: localized.question,
      type: localized.type,
      position: localized.position,
      options: overlayOptions(question.options, translation?.options).map(
        (text, index): LocalizedQuizOption => ({ index, text })
      )
    };
  });
}
