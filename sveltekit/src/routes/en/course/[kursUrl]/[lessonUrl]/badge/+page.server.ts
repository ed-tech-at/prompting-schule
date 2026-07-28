import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { requireLogin } from '$lib/server/jwt';
import { error, redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';

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

  const bestQuiz = await prisma.userQuizAttempt.findFirst({
    where: {
      userId: user.id,
      lessonId: lesson.id
    },
    orderBy: {
      percentReached: 'desc'
    }
  });

  const badges = await prisma.badge.findMany({
    where: {
      lessonId: lesson.id,
      userId: user.id
    },
    orderBy: { createdAt: 'desc' }
  });


  if (lesson.starsNeeded > 0 && (!bestQuiz || bestQuiz.percentReached < 75)) {
    throw redirect(302, resolve('/en/courses'));
  }

  const aggregate = await prisma.userProgress.aggregate({
    where: {
      userId: user.id,
      lessonId: lesson.id
    },
    _sum: {
      promptsTried: true,
    }
  });

  const maxPrompts = aggregate._sum.promptsTried || 0;

  if (maxPrompts == 0) {
    throw redirect(302, resolve('/en/courses'));
  }

  return {
    course,
    lesson,
    bestQuiz,
    badges,
    user,
    maxPrompts
  };
};
