import { error, redirect, type Cookies } from '@sveltejs/kit';
import type { Badge } from '@prisma/client';
import { prisma } from '$lib/server/db';
import { requireLogin } from '$lib/server/jwt';
import { withBase } from '$lib/server/subfolder';
import { hasEnoughStars } from '$lib/server/lessonStars';
import { redactElementPrompts } from '$lib/server/lessonElements';
import { loadInfoBlocks } from '$lib/server/infoblocks';
import {
  findCourseForLang,
  findElementsForLang,
  findLessonForLang,
  findLessonsForLang,
  findQuizQuestionsForLang,
  listCoursesForLang,
  listedLanguagesOfCourse
} from '$lib/server/courseTranslations';
import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';

// Shared loaders for the German (/kurs/...) and English (/en/course/...) course
// pages. The routes only pick the language; content and rules live here.

type CourseEvent = { params: Record<string, string>; cookies: Cookies };

async function requireCourse(params: Record<string, string>, lang: CourseLang) {
  // active ist bewusst nur "publicActive": Es steuert die Sichtbarkeit in der Kursliste.
  // Über die direkte URL bleiben auch nicht aktive Kurse/Lektionen/Sprachfassungen
  // erreichbar – das ist gewollt, damit sie vor der Freischaltung getestet werden können.
  const course = await findCourseForLang(params.kursUrl, lang);
  if (!course) {
    throw error(404, COURSE_TEXTS[lang].courseNotFound);
  }
  return course;
}

async function requireLesson(courseId: number, params: Record<string, string>, lang: CourseLang) {
  // Lektion an den Kurs binden; ohne Treffer 404, sonst entfiele der lessonId-Filter.
  const lesson = await findLessonForLang(courseId, params.lessonUrl, lang);
  if (!lesson) {
    throw error(404, COURSE_TEXTS[lang].lessonNotFound);
  }
  return lesson;
}

export async function loadCourseList({ cookies }: Pick<CourseEvent, 'cookies'>, lang: CourseLang) {
  const user = requireLogin(cookies);

  const [courses, infoBlocks] = await Promise.all([
    listCoursesForLang(lang),
    loadInfoBlocks({ placement: 'kursuebersicht', lang, email: user.email })
  ]);

  return { courses, user, infoBlocks, lang };
}

export async function loadCoursePage({ params, cookies }: CourseEvent, lang: CourseLang) {
  const user = requireLogin(cookies);
  const course = await requireCourse(params, lang);
  const lessons = await findLessonsForLang(course.id, lang);

  const badges = await prisma.badge.findMany({
    where: { userId: user.id, lessonId: { in: lessons.map((lesson) => lesson.id) } },
    orderBy: { createdAt: 'desc' }
  });

  const latestBadge: Record<number, Badge> = {};
  for (const badge of badges) {
    if (badge.lessonId !== null && !latestBadge[badge.lessonId]) {
      latestBadge[badge.lessonId] = badge;
    }
  }

  const otherLangs = (await listedLanguagesOfCourse(course.id)).filter((other) => other !== lang);

  return { course, lessons, user, latestBadge, lang, otherLangs };
}

export async function loadLessonPage({ params, cookies }: CourseEvent, lang: CourseLang) {
  const user = requireLogin(cookies);
  const course = await requireCourse(params, lang);
  const lesson = await requireLesson(course.id, params, lang);

  const elements = redactElementPrompts(await findElementsForLang(lesson.id, lang));

  return { course, lesson, elements, user, lang };
}

export async function loadQuizPage({ params, cookies }: CourseEvent, lang: CourseLang) {
  const user = requireLogin(cookies);
  const course = await requireCourse(params, lang);
  const lesson = await requireLesson(course.id, params, lang);

  // Das Quiz ist erst mit genügend Sternen freigeschaltet (wie in QuizStarRender).
  if (!(await hasEnoughStars(user.id, lesson))) {
    throw redirect(302, withBase(coursePaths(lang).lesson(course.URL, lesson.URL)));
  }

  const quizQuestions = await findQuizQuestionsForLang(lesson.id, lang);

  for (const question of quizQuestions) {
    for (let i = question.options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [question.options[i], question.options[j]] = [question.options[j], question.options[i]];
    }
  }

  return { course, lesson, quizQuestions, user, lang };
}

export async function loadBadgePage({ params, cookies }: CourseEvent, lang: CourseLang) {
  const user = requireLogin(cookies);
  const course = await requireCourse(params, lang);
  const lesson = await requireLesson(course.id, params, lang);
  const coursesPath = withBase(coursePaths(lang).courses);

  const bestQuiz = await prisma.userQuizAttempt.findFirst({
    where: { userId: user.id, lessonId: lesson.id },
    orderBy: { percentReached: 'desc' }
  });

  const badges = await prisma.badge.findMany({
    where: { lessonId: lesson.id, userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  if (lesson.starsNeeded > 0) {
    if (!(await hasEnoughStars(user.id, lesson))) throw redirect(302, coursesPath);
    //  TODO 75
    if (!bestQuiz || bestQuiz.percentReached < 75) throw redirect(302, coursesPath);
  }

  const aggregate = await prisma.userProgress.aggregate({
    where: { userId: user.id, lessonId: lesson.id },
    _sum: { promptsTried: true }
  });

  const maxPrompts = aggregate._sum.promptsTried || 0;

  if (maxPrompts == 0) {
    throw redirect(302, coursesPath);
  }

  return { course, lesson, bestQuiz, badges, user, maxPrompts, lang };
}
