import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { error, json } from '@sveltejs/kit';


import { newBadgeHash } from '$lib/server/dbUtils';

import { requireLogin } from '$lib/server/jwt';

export async function POST({ request, cookies }) {

  

  let { formData,  action } = await request.json();

  const user = requireLogin(cookies);

  

  if (action === 'createLessonBadge') {
    console.log('formData', formData);
    const { lessonId } = formData;
    
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return json({ success: false, error: 'Lesson not found' });
    }
    const bestQuiz = await prisma.userQuizAttempt.findFirst({
      where: {
        userId: user.id,
        lessonId: lesson.id
      },
      orderBy: {
        percentReached: 'desc'
      }
    });
    if (!bestQuiz) {
      return json({ success: false, error: 'No quiz attempt found' });
    }
    if (bestQuiz.percentReached < 30) {
      //  todo
      return json({ success: false, error: 'Not enough points' });
    }

    console.log('bestQuiz', bestQuiz);

    const aggregate = await prisma.userProgress.aggregate({
      where: {
        userId: user.id,
        lessonId: lesson.id
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        promptsTried: true,

      }
    });

    console.log('aggregate', aggregate);

    const hash = await newBadgeHash(user.id, lessonId);

    const badge = await prisma.badge.create({
      data: {
        userId: user.id,
        type: 'lesson',
        lessonId: lesson.id,
        promptsTried: aggregate._sum.promptTokens,
        promptTokens: aggregate._sum.promptTokens,
        completionTokens: aggregate._sum.completionTokens,
        hash: hash,
      }
    });
    
    console.log('badge', badge);
    return json({ success: true, badge });
  }
}