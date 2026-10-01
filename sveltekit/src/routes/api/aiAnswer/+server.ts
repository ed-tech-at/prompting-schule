// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { error, json } from '@sveltejs/kit';

import { marked } from 'marked';


import { requireLogin } from '$lib/server/jwt';
import {
  parseBirthDateWithAi,
  summarizeConversationMemory,
  streamAiResponse
} from '$lib/server/openAiResponses';

function parseGermanDate(value: string): Date | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;

  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.getFullYear() === Number(year)
    && date.getMonth() === Number(month) - 1
    && date.getDate() === Number(day)
    ? date
    : null;
}

function formatGermanDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function calculateDaysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function delayedToolResponse(chunks: string[], usage: { promptTokens?: number; completionTokens?: number }): Response {
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

  if (action === 'memorySummarize') {
    const previousSummary = typeof data.summary === 'string' ? data.summary.slice(0, maxLength) : '';
    const message = typeof data.message === 'string' ? data.message.slice(0, maxLength) : '';
    const assistantResponse = typeof data.assistantResponse === 'string'
      ? data.assistantResponse.slice(0, maxLength)
      : '';

    if (!message || !assistantResponse) {
      return json({ success: false, error: 'Conversation data is missing.' }, { status: 400 });
    }

    const summary = await summarizeConversationMemory(previousSummary, message, assistantResponse);
    return json({ success: true, summary });
  }

  if (action === 'memoryNoHistory' || action === 'memoryWithHistory') {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
    if (!element?.devPromptA) {
      return json({ success: false, error: 'Memory exercise not found.' }, { status: 404 });
    }

    const summary = action === 'memoryWithHistory' && typeof data.summary === 'string'
      ? data.summary.slice(0, maxLength)
      : '';

    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA },
        ...(summary
          ? [{ role: 'developer' as const, content: `Kurzzeitgedächtnis (Zusammenfassung):\n${summary}` }]
          : []),
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
            ai1Result: await marked.parse(text),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }

  if (action === 'aiSide1') {
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const userInput = element.type === 'aiSideTool'
      ? `Geburtsdatum: ${data.ai1}\nHeutiges Datum: ${todayIso}`
      : data.ai1;
  
  
    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA },
        { role: 'user', content: userInput }
      ],
      reasoningEffort: element?.type === 'aiSideTool' ? 'minimal' : 'low',
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

    if (element.type === 'aiSideTool') {
      const today = new Date();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const formattedEnd = formatGermanDate(end);
      const parsedBirthDate = await parseBirthDateWithAi(data.ai2);
      const start = parsedBirthDate.birthDate ? parseGermanDate(parsedBirthDate.birthDate) : null;
      let text: string;
      let responseChunks: string[] | null = null;

      if (start !== null && start <= end) {
        const days = calculateDaysBetween(start, end);
        const formattedDays = days.toLocaleString('de-AT');
        responseChunks = [
          `Ich habe dein Geburtsdatum als ${formatGermanDate(start)} erkannt und benötige eine exakte Berechnung. Dafür rufe ich ein Werkzeug auf.\n\n`,
          `<div class="tool-call">🔧 <strong>Werkzeug-Aufruf:</strong> <code>calculate_days_between(${formatGermanDate(start)}, ${formattedEnd})</code></div>\n\n`,
          `<div class="tool-result">✅ <strong>Werkzeug-Ergebnis:</strong> ${formattedDays} Tage</div>\n\n`,
          `Du bist heute ${formattedDays} Tage alt.`
        ];
        text = responseChunks.join('');
      } else {
        text = 'Ich konnte kein eindeutiges, gültiges Geburtsdatum erkennen. Bitte nenne es noch einmal, zum Beispiel „Ich wurde am 3. Mai 2008 geboren.“';
      }
      const usage = parsedBirthDate.usage;

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

      if (responseChunks !== null) {
        return delayedToolResponse(responseChunks, usage);
      }

      return new Response(`${text}\n[__FOOTER__]${JSON.stringify({ __footer: true, ...usage })}`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  
  
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
