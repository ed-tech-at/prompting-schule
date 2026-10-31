// import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { requireLogin } from '$lib/server/jwt';
import { error, redirect } from '@sveltejs/kit';
import { withBase } from '$lib/server/subfolder';
import { hasEnoughStars } from '$lib/server/lessonStars';


export const load: PageServerLoad = async ({ params, cookies }) => {

  const user = requireLogin(cookies);


  const courseUrl = params.kursUrl as String;
  const lessonUrl = params.lessonUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });
  if (!course) {
    throw error(404, 'Kurs nicht gefunden');
  }

  
  // Lektion an den Kurs binden; ohne Treffer 404, sonst entfiele der lessonId-Filter unten.
  const lesson = await prisma.lesson.findFirst({ where: { URL: lessonUrl, courseId: course.id } });
  if (!lesson) {
    throw error(404, 'Lektion nicht gefunden');
  }

  // Das Quiz ist erst mit genügend Sternen freigeschaltet (wie in QuizStarRender).
  if (!(await hasEnoughStars(user.id, lesson))) {
    throw redirect(302, withBase(`/kurs/${course.URL}/${lesson.URL}`));
  }

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { lessonId: lesson.id },
    orderBy: { position: 'asc' }
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