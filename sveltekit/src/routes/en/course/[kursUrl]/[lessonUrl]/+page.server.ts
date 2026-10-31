import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { requireLogin } from '$lib/server/jwt';
import { error } from '@sveltejs/kit';
import { redactElementPrompts } from '$lib/server/lessonElements';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const user = requireLogin(cookies);

  // active ist bewusst nur "publicActive": Es steuert die Sichtbarkeit in der Kursliste.
  // Über die direkte URL bleiben auch nicht aktive Kurse/Lektionen erreichbar – das ist gewollt.
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
