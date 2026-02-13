// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';

import { error, json } from '@sveltejs/kit';

import OpenAI, { AzureOpenAI } from 'openai';

import { marked } from 'marked';


import { requireLogin } from '$lib/server/jwt';



export async function POST({ request, cookies }) {
	let { data,  action } = await request.json();

  const user = requireLogin(cookies);
  
  // console.log('data', data);
  // console.log('action', action);

  if (data.userId != user.id) {
    return json({ success: false, error: "Unauthorized user" });
  }

  
  if (action == "note") {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    if (data.ai1.length > 50000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    
    const promptTokens = data.ai1.length;
    

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai1: data.ai1,
        ai1Result: "Gespeicherte Notiz",
        promptTokens: promptTokens,
        promptsTried: 0
      }
    });

    return json( {success: true, ai1Result: "Notiz gespeichert", promptTokens });
  }

  

  if (action === 'getUserProgressElementAi1') {
    // data = JSON.parse(data);
    // console.log('getUserProgressElementAi1', data);
    // console.log('elementId', data.userId);
    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: data.userId, elementId: data.elementId, ai1Result: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    if (!userProgress) {
      // console.log('userProgress', userProgress);
      return json({ success: false });
    }
    if (userProgress.ai1 == '\n') {
      userProgress.ai1 = '';
    }
    if (userProgress.ai1 == '<br>') {
      userProgress.ai1 = '';
    }
    // console.log('userProgress', userProgress);
    return json({ success: true, userProgress });

  }
  if (action === 'getUserProgressElementAi2') {
    // data = JSON.parse(data);

    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: data.userId, elementId: data.elementId, ai2Result: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    // console.log(' data.elementId',  data);
    // console.log('userProgress', userProgress);

    if (!userProgress) {
      // console.log('userProgress', userProgress);
      return json({ success: false });
    }

    if (userProgress.ai2 == '\n') {
      userProgress.ai2 = '';
    }
    if (userProgress.ai2 == '<br>') {
      userProgress.ai2 = '';
    }

    return json({ success: true, userProgress });

  }


  if (action === 'getUserProgressElementStar') {
    // data = JSON.parse(data);
    // console.log('getUserProgressElementAi1', data);
    // console.log('elementId', data.userId);
    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: data.userId, elementId: data.elementId, ai1Result: { not: null } },
      orderBy: [{ stars: 'desc' }, { createdAt: 'desc' }]
    });

    if (!userProgress) {
      // console.log('userProgress', userProgress);
      return json({ success: false });
    }

    if (userProgress.ai1 == '\n') {
      userProgress.ai1 = '';
    }
    if (userProgress.ai1 == '<br>') {
      userProgress.ai1 = '';
    }

    // console.log('userProgress', userProgress);
    return json({ success: true, userProgress });

  }

  if (action === 'getLessonStars') {
    // data = JSON.parse(data);
    // console.log('getLessonStars', data);
    // console.log('elementId', data.userId);
    const userProgress = await prisma.userProgress.groupBy({
      by: ['elementId'],
      where: { userId: data.userId, lessonId: data.lessonId, stars: { not: 0 } }
    });

    // console.log('userProgress', userProgress);

    // const totalStars = userProgress.reduce((sum, progress) => sum + (progress._sum.stars || 0), 0);
    
    // console.log('userProgress', userProgress);
    return json({ success: true, stars: userProgress.length });

  }

  
}

