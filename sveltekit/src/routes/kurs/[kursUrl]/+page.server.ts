import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
const prisma = new PrismaClient();

export const load: PageServerLoad = async ({ params }) => {
  const courseUrl = params.kursUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course?.id, active: 1 },
    orderBy: { position: 'asc' }
  });


  return {
    course,
    lessons
  };
};