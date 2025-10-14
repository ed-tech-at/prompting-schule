// import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { requireLogin } from '$lib/server/jwt';
import type { Badge } from '@prisma/client';


export const load: PageServerLoad = async ({ params, cookies }) => {

  const user = requireLogin(cookies);


  const courseUrl = params.kursUrl as String;

  const course = await prisma.course.findUnique({ where: { URL: courseUrl } });

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course?.id, active: 1 },
    orderBy: { position: 'asc' }
  });

  const badges = await prisma.badge.findMany({
    where: { userId: user.id, lessonId: { in: lessons.map((lesson) => lesson.id) } },
    
    orderBy: { createdAt: 'desc' }
  });

  let latestBadge = [] as Badge[];
  for (const badge of badges) {
    if (!latestBadge[badge.lessonId]) {
      latestBadge[badge.lessonId] = badge;
    }
  }

  return {
    course,
    lessons,
    user,
    latestBadge: latestBadge
  };
};