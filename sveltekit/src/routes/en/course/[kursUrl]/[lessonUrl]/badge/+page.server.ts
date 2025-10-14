// import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';
// const prisma = new PrismaClient();

import { requireLogin } from '$lib/server/jwt';

import { redirect, type Cookies } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {

  const user = requireLogin(cookies);


  const courseUrl = params.kursUrl as String;
  const lessonUrl = params.lessonUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });

  
  const lesson = await prisma.lesson.findUnique({ where: { URL: lessonUrl } });

  const bestQuiz = await prisma.userQuizAttempt.findFirst({
    where: {
      userId: user.id,
      lessonId: lesson?.id
    },
    orderBy: {
      percentReached: 'desc'
    }
  });

  const badges = await prisma.badge.findMany({
    where: {
      lessonId: lesson?.id,
      userId: user.id
    },
    orderBy: { createdAt: 'desc' }
  });


  if (lesson?.starsNeeded > 0) {
    if (!bestQuiz || bestQuiz?.percentReached < 75) throw redirect(302, '/kurse');
    //  TODO 75
  } 

  

  const aggregate = await prisma.userProgress.aggregate({

    where: {
      userId: user.id,
      lessonId: lesson?.id
    },
    _sum: {
      promptsTried: true,
    }
  });

  const maxPrompts = aggregate._sum.promptsTried || 0;

  if (maxPrompts == 0) {
    throw redirect(302, '/kurse'); 
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