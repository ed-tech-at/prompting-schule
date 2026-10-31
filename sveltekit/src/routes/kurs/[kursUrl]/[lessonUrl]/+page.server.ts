// import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { requireLogin } from '$lib/server/jwt';
import { error } from '@sveltejs/kit';
import { redactElementPrompts } from '$lib/server/lessonElements';


export const load: PageServerLoad = async ({ params, cookies }) => {

  const user = requireLogin(cookies);

  const courseUrl = params.kursUrl as String;
  const lessonUrl = params.lessonUrl as String;

  // active ist bewusst nur "publicActive": Es steuert die Sichtbarkeit in der Kursliste.
  // Über die direkte URL bleiben auch nicht aktive Kurse/Lektionen erreichbar – das ist gewollt.
  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });
  if (!course) {
    throw error(404, 'Kurs nicht gefunden');
  }

  
  // Lektion an den Kurs binden; ohne Treffer 404, sonst entfiele der lessonId-Filter unten.
  const lesson = await prisma.lesson.findFirst({ where: { URL: lessonUrl, courseId: course.id } });
  if (!lesson) {
    throw error(404, 'Lektion nicht gefunden');
  }

  const elementsWithPrompts = await prisma.element.findMany({
    where: { lessonId: lesson.id },
    orderBy: { position: 'asc' }
  });

  const elements = redactElementPrompts(elementsWithPrompts);

  return {
    course,
    lesson,
    elements,
    user
  };
};