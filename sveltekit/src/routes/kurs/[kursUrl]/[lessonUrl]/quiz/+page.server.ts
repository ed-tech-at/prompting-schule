// import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { requireLogin } from '$lib/server/jwt';


export const load: PageServerLoad = async ({ params, cookies }) => {

  const user = requireLogin(cookies);


  const courseUrl = params.kursUrl as String;
  const lessonUrl = params.lessonUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });

  
  const lesson = await prisma.lesson.findUnique({ where: { URL: lessonUrl } });

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { lessonId: lesson?.id },
    orderBy: { id: 'asc' }
  });

  quizQuestions.forEach((question) => {
    delete question.correct;
    if (Array.isArray(question.options) && question.options.length > 1) {
      for (let i = question.options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [question.options[i], question.options[j]] = [question.options[j], question.options[i]];
      }
    }
  });

  return {
    course,
    lesson,
    quizQuestions,
    user
  };
};