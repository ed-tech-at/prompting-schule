// import { PrismaClient } from '@prisma/client';
import type { PageServerLoad, Actions } from './$types';

import { error } from '@sveltejs/kit';


// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { redirect, type Cookies } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies }) => {

  
  const { hash, email } = params;

	// Badge anhand des Hashes suchen
	const badge = await prisma.badge.findFirst({
		where: {
			hash: hash,
			user: {
				email: email
			}
		},
		include: {
			user: true,
			lesson: {
				include: {
					course: true
				}
			}
		}
	});

  if (!badge) {
    throw error(404, 'Badge nicht gefunden');
  }

  return {
    badgeEmail: badge.user.email,
    badgeHash: badge.hash,
    badgeLesson: badge.lesson.lessonName,
    badgeLessonStars: badge.lesson?.starsNeeded,
    badgeCourse: badge.lesson.course.name,
    badgeDate: badge.createdAt.toLocaleDateString('de-DE'),
  };
};