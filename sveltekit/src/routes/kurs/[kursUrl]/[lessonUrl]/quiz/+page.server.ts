import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
const prisma = new PrismaClient();

export const load: PageServerLoad = async ({ params }) => {
  const courseUrl = params.kursUrl as String;
  const lessonUrl = params.lessonUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });

  
  const lesson = await prisma.lesson.findUnique({ where: { URL: lessonUrl } });

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { lessonId: lesson?.id }
  });

  quizQuestions.forEach((question) => {
    delete question.correct;
  });

  return {
    course,
    lesson,
    quizQuestions,
  };
};