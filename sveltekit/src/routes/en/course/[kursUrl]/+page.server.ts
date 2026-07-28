import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { requireLogin } from '$lib/server/jwt';
import type { Badge } from '@prisma/client';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const user = requireLogin(cookies);
  const course = await prisma.course.findUnique({ where: { URL: params.kursUrl } });
  if (!course) {
    throw error(404, 'Course not found');
  }

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id, active: 1 },
    orderBy: { position: 'asc' }
  });

  const badges = await prisma.badge.findMany({
    where: { userId: user.id, lessonId: { in: lessons.map((lesson) => lesson.id) } },
    
    orderBy: { createdAt: 'desc' }
  });

  const latestBadge: Record<number, Badge> = {};
  for (const badge of badges) {
    if (badge.lessonId !== null && !latestBadge[badge.lessonId]) {
      latestBadge[badge.lessonId] = badge;
    }
  }

  return {
    course,
    lessons,
    user,
    latestBadge
  };
};
