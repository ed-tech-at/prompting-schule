import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
const prisma = new PrismaClient();

import { requireLogin } from '$lib/server/jwt';


export const load: PageServerLoad = async ({ params, cookies }) => {

  const user = requireLogin(cookies);


  const courseUrl = params.kursUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course?.id, active: 1 },
    orderBy: { position: 'asc' }
  });


  return {
    course,
    lessons,
    user
  };
};