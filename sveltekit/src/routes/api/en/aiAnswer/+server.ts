// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { error, json } from '@sveltejs/kit';

import { marked } from 'marked';


import { requireLogin } from '$lib/server/jwt';

import { streamAiResponse } from '$lib/server/openAiResponses';



type PromptMessage = {
  role: 'developer' | 'user' | 'assistant';
  content: string;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

function renderMarkdown(text: string): string {
  return marked.parse(text, { async: false });
}

async function getElementOrThrow(elementId: number) {
  const element = await prisma.element.findUnique({ where: { id: elementId } });
  if (!element) {
    throw error(404, 'Lesson element not found');
  }
  return element;
}

// The English tool lesson asks for an unambiguous date, so ISO (YYYY-MM-DD) is
// the documented format. The dotted German form is still accepted because the
// same course content is sometimes copied over from the German version.
function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(trimmed);

  let year: number;
  let month: number;
  let day: number;

  if (iso) {
    [, year, month, day] = iso.map(Number) as [number, number, number, number];
  } else if (dotted) {
    const [, dottedDay, dottedMonth, dottedYear] = dotted.map(Number) as [number, number, number, number];
    year = dottedYear;
    month = dottedMonth;
    day = dottedDay;
  } else {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : null;
}

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// The tool call is simulated, not streamed from a model. The delay between the
// chunks is what makes the "the AI calls a tool" step visible to learners.
function delayedToolResponse(chunks: string[], usage: { promptTokens: number; completionTokens: number }): Response {
  const encoder = new TextEncoder();
  const delayMs = 800;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (let index = 0; index < chunks.length; index += 1) {
        controller.enqueue(encoder.encode(chunks[index]));

        if (index < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      controller.enqueue(encoder.encode(`\n[__FOOTER__]${JSON.stringify({ __footer: true, ...usage })}`));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

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
      || (data.message && data.message.length > maxLength)
      ) {

    await prisma.userProgress.create({
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai1: "!Request too long! " + data.ai1?.length,
        ai2: "!Request too long! " + data.ai2?.length,
        promptsTried: 0,
      }
    });
    return new Response('<i>Request too long</i>', { status: 200 });
  }

  if (action === 'memoryNoHistory' || action === 'memoryWithHistory') {
    const element = await getElementOrThrow(data.elementId);

    const history: ConversationMessage[] = action === 'memoryWithHistory' && Array.isArray(data.history)
      ? data.history
          .filter((message: unknown) =>
            typeof message === 'object'
            && message !== null
            && ('role' in message)
            && ('content' in message)
            && ((message as { role: string }).role === 'user' || (message as { role: string }).role === 'assistant')
            && typeof (message as { content: unknown }).content === 'string'
          )
          .map((message: unknown) => ({
            role: (message as ConversationMessage).role,
            content: (message as ConversationMessage).content
          }))
          .slice(-20)
      : [];

    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA ?? '' },
        ...history,
        { role: 'user', content: data.message }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.message,
            ai1Result: renderMarkdown(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }

  if (action === 'aiSide1') {
    const element = await getElementOrThrow(data.elementId);
    const userInput = element.type === 'aiSideTool'
      ? `Date of birth: ${data.ai1}\nToday's date: ${formatIsoDate(new Date())}`
      : data.ai1;


    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA ?? '' },
        { role: 'user', content: userInput }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai1Result: renderMarkdown(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  


  if (action === 'aiSide2') {
    const element = await getElementOrThrow(data.elementId);

    if (element.type === 'aiSideTool') {
      const today = new Date();
      const start = parseDateInput(data.ai2 ?? '');
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      let text: string;
      let responseChunks: string[] | null = null;

      if (start !== null && start <= end) {
        const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000);
        const formattedDays = days.toLocaleString('en-GB');
        responseChunks = [
          '**AI:** I need an exact calculation, so I am calling a tool.\n\n',
          `<div class="tool-call">🔧 <strong>Tool call:</strong> <code>calculate_days_between(${formatIsoDate(start)}, ${formatIsoDate(end)})</code></div>\n\n`,
          `<div class="tool-result">✅ <strong>Tool result:</strong> ${formattedDays} days</div>\n\n`,
          `**AI:** You are ${formattedDays} days old today.`
        ];
        text = responseChunks.join('');
      } else {
        text = '⚠️ Please enter a valid date of birth in the format YYYY-MM-DD that is not in the future.';
      }
      const usage = { promptTokens: 0, completionTokens: 0 };

      await prisma.userProgress.create({
        data: {
          userId: data.userId,
          elementId: data.elementId,
          courseId: data.courseId,
          lessonId: data.lessonId,
          ai2: data.ai2,
          ai2Result: renderMarkdown(text),
          ...usage,
          promptsTried: 1
        }
      });

      if (responseChunks !== null) {
        return delayedToolResponse(responseChunks, usage);
      }

      return new Response(`${text}\n[__FOOTER__]${JSON.stringify({ __footer: true, ...usage })}`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }


    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptB ?? '' },
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
            ai2Result: renderMarkdown(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'ai1') {

    const element = await getElementOrThrow(data.elementId);
  
    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA ?? '' },
        { role: 'user', content: data.ai1 },
        { role: 'user', content: element.devPromptB ?? '' }
      ],
      saveToDb: async (text, usage) => {
        await prisma.userProgress.create({
          data: {
            userId: data.userId,
            elementId: data.elementId,
            courseId: data.courseId,
            lessonId: data.lessonId,
            ai1: data.ai1,
            ai1Result: renderMarkdown(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  
  if (action === 'ai2') {
    const element = await getElementOrThrow(data.elementId);

    let messages: PromptMessage[] = [
      { role: 'developer', content: element.devPromptA ?? '' },
      { role: 'user', content: element.devPromptB ?? '' },
      { role: 'user', content: data.ai2 }
    ];
    if (element?.type == 'ai2only') {
      messages = [
        { role: 'developer', content: element.devPromptA ?? '' },
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
            ai2Result: renderMarkdown(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'ai12') {
    const element = await getElementOrThrow(data.elementId);
  

    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA ?? '' },
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
            ai1Result: renderMarkdown(text),
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
  const element = await getElementOrThrow(data.elementId);

  const laborPromptBetter = laborPrompt + `Make the prompt BETTER. `;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: laborPromptBetter + (element.devPromptB ?? '') },
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
  const element = await getElementOrThrow(data.elementId);

  const laborPromptWorse = laborPrompt + `Make the prompt WORSE. `;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: laborPromptWorse + (element.devPromptC ?? '') },
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
  const element = await getElementOrThrow(data.elementId);

  return streamAiResponse({
    messages: [
      { role: 'developer', content: element.devPromptA ?? '' },
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
          ai1Result: renderMarkdown(text),
          ...usage,
          promptsTried: 1,
          attempts: 3
        }
      });
    }
  });
}


if (action === 'star') {
  const element = await getElementOrThrow(data.elementId);

  const starPrompt = `
If the task is completed by the user, respond only in the following JSON format: {"star": true, "feedback": feedbackText}
If it is not completed, write: {"star": false, "feedback": feedbackText}
Write friendly and helpful feedback in feedbackText
Do not give a solution. No additional text. No Markdown formatting.
`;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: starPrompt + '\n' + (element.devPromptA ?? '') },
      { role: 'user', content: data.ai1 }
    ],
    saveToDb: async (text, usage) => {
      let starData: { star: boolean; feedback: string } = {
        star: false,
        feedback: 'No answer.'
      };

      try {
        const clean = text
          .replace(/^```json/, '')
          .replace(/```$/, '')
          .trim();

        starData = JSON.parse(clean);
      } catch (e) {
        console.error('Error parsing JSON response for star:', e);
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
