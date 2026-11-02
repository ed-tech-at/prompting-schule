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
  linkableLanguagesOfCourse,
  slugsForLangs,
  type LangSlugs
} from '$lib/server/courseTranslations';
import { EDITOR_LEVEL } from '$lib/server/editor';
import { COURSE_LANGS, COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';
import type { JwtUserPayload } from '$lib/server/jwt';

// Shared loaders for the German (/kurs/...) and English (/en/course/...) course
// pages. The routes only pick the language; content and rules live here.

type CourseEvent = { params: Record<string, string>; cookies: Cookies; url: URL };

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

type CoursePaths = ReturnType<typeof coursePaths>;
type PathFor = (paths: CoursePaths, slugs: LangSlugs) => string;

// A page reached through another slug than the one of its language (e.g. an
// old link with the source slug before the slug was translated) moves
// permanently to the canonical URL, so every page has exactly one address.
function redirectToCanonical(
  { params, url }: CourseEvent,
  lang: CourseLang,
  slugs: LangSlugs,
  pathFor: PathFor
) {
  const lessonMoved = slugs.lesson !== null && params.lessonUrl !== slugs.lesson;
  if (params.kursUrl !== slugs.course || lessonMoved) {
    throw redirect(301, withBase(pathFor(coursePaths(lang), slugs)) + url.search);
  }
}

// Targets for the language flags in the header: the same page in every
// language the course exists in, each with the slugs of that language.
async function languageLinks(
  courseId: number,
  lessonId: number | undefined,
  lang: CourseLang,
  user: JwtUserPayload,
  pathFor: PathFor
): Promise<Partial<Record<CourseLang, string>>> {
  const [linkable, slugsFor] = await Promise.all([
    linkableLanguagesOfCourse(courseId, user.isAdmin >= EDITOR_LEVEL),
    slugsForLangs(courseId, lessonId)
  ]);
  const langs = new Set(linkable);
  // The current page is always its own target, even while it is still hidden.
  langs.add(lang);
  return Object.fromEntries([...langs].map((target) => [target, pathFor(coursePaths(target), slugsFor(target))]));
}

const coursePath: PathFor = (paths, slugs) => paths.course(slugs.course);
const lessonPath: PathFor = (paths, slugs) => paths.lesson(slugs.course, slugs.lesson!);
const quizPath: PathFor = (paths, slugs) => paths.quiz(slugs.course, slugs.lesson!);
const badgePath: PathFor = (paths, slugs) => paths.badge(slugs.course, slugs.lesson!);

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

  const langLinks = Object.fromEntries(COURSE_LANGS.map((other) => [other, coursePaths(other).courses]));

  return { courses, user, infoBlocks, lang, langLinks };
}

export async function loadCoursePage(event: CourseEvent, lang: CourseLang) {
  const user = requireLogin(event.cookies);
  const course = await requireCourse(event.params, lang);
  redirectToCanonical(event, lang, { course: course.URL, lesson: null }, coursePath);
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

  const langLinks = await languageLinks(course.id, undefined, lang, user, coursePath);

  return { course, lessons, user, latestBadge, lang, langLinks };
}

export async function loadLessonPage(event: CourseEvent, lang: CourseLang) {
  const user = requireLogin(event.cookies);
  const course = await requireCourse(event.params, lang);
  const lesson = await requireLesson(course.id, event.params, lang);
  redirectToCanonical(event, lang, { course: course.URL, lesson: lesson.URL }, lessonPath);

  const elements = redactElementPrompts(await findElementsForLang(lesson.id, lang));
  const langLinks = await languageLinks(course.id, lesson.id, lang, user, lessonPath);

  return { course, lesson, elements, user, lang, langLinks };
}

export async function loadQuizPage(event: CourseEvent, lang: CourseLang) {
  const user = requireLogin(event.cookies);
  const course = await requireCourse(event.params, lang);
  const lesson = await requireLesson(course.id, event.params, lang);
  redirectToCanonical(event, lang, { course: course.URL, lesson: lesson.URL }, quizPath);

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

  const langLinks = await languageLinks(course.id, lesson.id, lang, user, quizPath);

  return { course, lesson, quizQuestions, user, lang, langLinks };
}

export async function loadBadgePage(event: CourseEvent, lang: CourseLang) {
  const user = requireLogin(event.cookies);
  const course = await requireCourse(event.params, lang);
  const lesson = await requireLesson(course.id, event.params, lang);
  redirectToCanonical(event, lang, { course: course.URL, lesson: lesson.URL }, badgePath);
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

  const langLinks = await languageLinks(course.id, lesson.id, lang, user, badgePath);

  return { course, lesson, bestQuiz, badges, user, maxPrompts, lang, langLinks };
}
