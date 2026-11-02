import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { requireLogin } from '$lib/server/jwt';
import { error, redirect } from '@sveltejs/kit';
import { withBase } from '$lib/server/subfolder';
import { hasEnoughStars } from '$lib/server/lessonStars';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const user = requireLogin(cookies);
  const course = await prisma.course.findUnique({ where: { URL: params.kursUrl } });
  if (!course) {
    throw error(404, 'Course not found');
  }

  const lesson = await prisma.lesson.findFirst({
    where: { URL: params.lessonUrl, courseId: course.id }
  });
  if (!lesson) {
    throw error(404, 'Lesson not found');
  }

  // The quiz unlocks only with enough stars (same rule as the lesson page).
  if (!(await hasEnoughStars(user.id, lesson))) {
    throw redirect(302, withBase(`/en/course/${course.URL}/${lesson.URL}`));
  }

  const questionsWithAnswers = await prisma.quizQuestion.findMany({
    where: { lessonId: lesson.id },
    orderBy: { position: 'asc' }
  });
  const quizQuestions = questionsWithAnswers.map(({ correct, ...question }) => question);

  return {
    course,
    lesson,
    quizQuestions,
    user
  };
};
