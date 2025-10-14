// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { error, json } from '@sveltejs/kit';

import { marked } from 'marked';


import { requireLogin } from '$lib/server/jwt';
import { streamAiResponse } from '$lib/server/azureAi';
export async function POST({ request, cookies }) {
	let { data,  action } = await request.json();

  const user = requireLogin(cookies);
  
  // console.log('data', data);
  // console.log('action', action);

  if (data.userId != user.id) {
    return json({ success: false, error: "Unauthorized user" });
  }

  const maxLength = 3000;

  if ((data.ai1 && data.ai1.length > maxLength)
      || (data.ai2 && data.ai2.length > maxLength)
      || (data.developer && data.developer.length > maxLength)
      ) {

    await prisma.userProgress.create({
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai1: "!Anfrage zu lang! " + data.ai1?.length,
        ai2: "!Anfrage zu lang! " + data.ai2?.length,
        promptsTried: 0,
      }
    });
    return new Response('<i>Anfrage zu lang</i>', { status: 200 });
  }

  if (action === 'aiSide1') {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
  
  
    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA },
        { role: 'user', content: data.ai1 }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai1Result: marked.parse(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  


  if (action === 'aiSide2') {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
  
  
    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptB },
        { role: 'user', content: data.ai2 }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai2: data.ai2,
            ai2Result: marked.parse(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'ai1') {

    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
  
    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA },
        { role: 'user', content: data.ai1 },
        { role: 'user', content: element.devPromptB }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai1Result: marked.parse(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  
  if (action === 'ai2') {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    let messages = [
      { role: 'developer', content: element.devPromptA },
      { role: 'user', content: element.devPromptB },
      { role: 'user', content: data.ai2 }
    ];
    if (element?.type == 'ai2only') {
      messages = [
        { role: 'developer', content: element.devPromptA },
        { role: 'user', content: data.ai2 }
      ];
    }
  
    return streamAiResponse({
      messages: messages,
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai2: data.ai2,
            ai2Result: marked.parse(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'ai12') {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
  

    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA },
        { role: 'user', content: data.ai1 },
        { role: 'user', content: data.ai2 }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai2: data.ai2,
            ai1Result: marked.parse(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  
  if (action === 'directDevUser') {

    
    return streamAiResponse({
      messages: [
        { role: 'developer', content: data.developer },
        { role: 'user', content: data.ai1 }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai1Result: text.replace(/\n/g, '<br>\n'),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'directDevUserUser') {

    
    return streamAiResponse({
      messages: [
        { role: 'developer', content: data.developer },
        { role: 'user', content: data.ai1 },
        { role: 'user', content: data.ai2 }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai2: data.ai2,
            ai1Result: text.replace(/\n/g, '<br>\n'),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }


  const laborPrompt = `Develop a new prompt for the AI based on the user prompt, which can be used later. Do not execute the request itself. Integrate the user prompt, the content will follow later. Please output the new prompt in Planetext directly. `

  if (action === 'labor1') {
  const element = await prisma.element.findUnique({ where: { id: data.elementId } });

  const laborPromptBetter = laborPrompt + `Make the prompt BETTER. `;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: laborPromptBetter + element.devPromptB },
      { role: 'user', content: data.ai1 }
    ],
    maxTokens: 2000,
    saveToDb: async (text, usage) => {
      await prisma.userProgress.create({
        data: {
          userId: data.userId,
          elementId: data.elementId,
          courseId: data.courseId,
          lessonId: data.lessonId,
          ai1: data.ai1,
          ai1Result: text.replace(/\n/g, '<br>'),
          ...usage,
          attempts: 1,
          promptsTried: 1
        }
      });
    }
  });
}

if (action === 'labor2') {
  const element = await prisma.element.findUnique({ where: { id: data.elementId } });

  const laborPromptWorse = laborPrompt + `Make the prompt WORSE. `;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: laborPromptWorse + element.devPromptC },
      { role: 'user', content: data.ai1 }
    ],
    
    saveToDb: async (text, usage) => {
      await prisma.userProgress.create({
        data: {
          userId: data.userId,
          elementId: data.elementId,
          courseId: data.courseId,
          lessonId: data.lessonId,
          ai1: data.ai1,
          ai1Result: text.replace(/\n/g, '<br>'),
          ...usage,
          attempts: 2,
          promptsTried: 1
        }
      });
    }
  });
}


if (action === 'labor3') {
  const element = await prisma.element.findUnique({ where: { id: data.elementId } });

  return streamAiResponse({
    messages: [
      { role: 'developer', content: element.devPromptA },
      { role: 'user', content: data.ai1 },
      { role: 'user', content: data.ai2 }
    ],
    saveToDb: async (text, usage) => {
      await prisma.userProgress.create({
        data: {
          userId: data.userId,
          elementId: data.elementId,
          courseId: data.courseId,
          lessonId: data.lessonId,
          ai1: data.ai1,
          ai2: data.ai2,
          ai1Result: marked.parse(text),
          ...usage,
          promptsTried: 1,
          attempts: 3
        }
      });
    }
  });
}


if (action === 'star') {
  const element = await prisma.element.findUnique({ where: { id: data.elementId } });

  const starPrompt = `
Wenn die Aufgabe vom User erfüllt ist, antworte **ausschließlich** im folgenden JSON-Format: {"star": true, "feedback": feedbackText} 
Wenn sie nicht erfüllt ist, schreibe: {"star": false, "feedback": feedbackText}
Schreibe ein freundliches hilfreiches Feedback in feedbackText
Gib keine Lösung. Keine zusätzlichen Texte. Keine Markdown-Formatierung.
`;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: starPrompt + '\n' + element.devPromptA },
      { role: 'user', content: data.ai1 }
    ],
    saveToDb: async (text, usage) => {
      let starData: { star: boolean; feedback: string } = {
        star: false,
        feedback: 'Keine Antwort.'
      };

      try {
        const clean = text
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();

        starData = JSON.parse(clean);
      } catch (e) {
        console.error('Fehler beim Parsen der JSON-Antwort für Stern:', e);
      }

      await prisma.userProgress.create({
        data: {
          userId: data.userId,
          elementId: data.elementId,
          courseId: data.courseId,
          lessonId: data.lessonId,
          stars: starData.star ? 1 : 0,
          ai1: data.ai1,
          ai1Result: JSON.stringify(starData),
          ...usage,
          promptsTried: 1
        }
      });
    }
  });
}


}