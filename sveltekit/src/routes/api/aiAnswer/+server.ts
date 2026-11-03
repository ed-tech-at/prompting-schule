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
import { findElementForLang } from '$lib/server/courseTranslations';
import { isCourseLang, type CourseLang } from '$lib/courseLang';

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

function formatIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Texts the server adds around the element prompts. The element prompts
// themselves come translated from the database (findElementForLang).
const SERVER_TEXTS: Record<CourseLang, {
  requestTooLong: string;
  memoryPrefix: string;
  birthDateLabel: string;
  todayLabel: string;
  formatDate: (date: Date) => string;
  numberLocale: string;
  toolIntro: (birthDate: string) => string;
  toolCall: string;
  toolResult: string;
  days: string;
  ageInDays: (days: string) => string;
  invalidBirthDate: string;
  starPrompt: string;
  noAnswer: string;
}> = {
  de: {
    requestTooLong: 'Anfrage zu lang',
    memoryPrefix: 'Kurzzeitgedächtnis (Zusammenfassung)',
    birthDateLabel: 'Geburtsdatum',
    todayLabel: 'Heutiges Datum',
    formatDate: formatGermanDate,
    numberLocale: 'de-AT',
    toolIntro: (birthDate) => `Ich habe dein Geburtsdatum als ${birthDate} erkannt und benötige eine exakte Berechnung. Dafür rufe ich ein Werkzeug auf.`,
    toolCall: 'Werkzeug-Aufruf',
    toolResult: 'Werkzeug-Ergebnis',
    days: 'Tage',
    ageInDays: (days) => `Du bist heute ${days} Tage alt.`,
    invalidBirthDate: 'Ich konnte kein eindeutiges, gültiges Geburtsdatum erkennen. Bitte nenne es noch einmal, zum Beispiel „Ich wurde am 3. Mai 2008 geboren.“',
    starPrompt: `
Wenn die Aufgabe vom User erfüllt ist, antworte **ausschließlich** im folgenden JSON-Format: {"star": true, "feedback": feedbackText} 
Wenn sie nicht erfüllt ist, schreibe: {"star": false, "feedback": feedbackText}
Schreibe ein freundliches hilfreiches Feedback in feedbackText
Gib keine Lösung. Keine zusätzlichen Texte. Keine Markdown-Formatierung.
`,
    noAnswer: 'Keine Antwort.'
  },
  en: {
    requestTooLong: 'Request too long',
    memoryPrefix: 'Short-term memory (summary)',
    birthDateLabel: 'Date of birth',
    todayLabel: "Today's date",
    formatDate: formatIsoDate,
    numberLocale: 'en-GB',
    toolIntro: (birthDate) => `I recognised your date of birth as ${birthDate} and need an exact calculation, so I am calling a tool.`,
    toolCall: 'Tool call',
    toolResult: 'Tool result',
    days: 'days',
    ageInDays: (days) => `You are ${days} days old today.`,
    invalidBirthDate: 'I could not recognise a clear, valid date of birth. Please give it again, for example "I was born on 3 May 2008."',
    starPrompt: `
If the task is completed by the user, respond only in the following JSON format: {"star": true, "feedback": feedbackText}
If it is not completed, write: {"star": false, "feedback": feedbackText}
Write friendly and helpful feedback in feedbackText
Do not give a solution. No additional text. No Markdown formatting.
`,
    noAnswer: 'No answer.'
  }
};

function calculateDaysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function elementNotFound(): Response {
  return json({ success: false, error: 'Element not found.' }, { status: 404 });
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
	let { data,  action, lang: requestedLang } = await request.json();
  const lang: CourseLang = isCourseLang(requestedLang) ? requestedLang : 'de';
  const texts = SERVER_TEXTS[lang];

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
        ai1: `!${texts.requestTooLong}! ` + data.ai1?.length,
        ai2: `!${texts.requestTooLong}! ` + data.ai2?.length,
        promptsTried: 0,
      }
    });
    return new Response(`<i>${texts.requestTooLong}</i>`, { status: 200 });
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

    const summary = await summarizeConversationMemory(previousSummary, message, assistantResponse, lang);
    return json({ success: true, summary });
  }

  if (action === 'memoryNoHistory' || action === 'memoryWithHistory') {
    const element = await findElementForLang(data.elementId, lang);
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
          ? [{ role: 'developer' as const, content: `${texts.memoryPrefix}:\n${summary}` }]
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
            ai1Result: marked.parse(text, { async: false }),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }

  if (action === 'aiSide1') {
    const element = await findElementForLang(data.elementId, lang);
    if (!element) return elementNotFound();
    const userInput = element.type === 'aiSideTool'
      ? `${texts.birthDateLabel}: ${data.ai1}\n${texts.todayLabel}: ${formatIsoDate(new Date())}`
      : data.ai1;
  
  
    return streamAiResponse({
      messages: [
        { role: 'developer', content: element.devPromptA ?? '' },
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
            ai1Result: marked.parse(text, { async: false }),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  


  if (action === 'aiSide2') {
    const element = await findElementForLang(data.elementId, lang);
    if (!element) return elementNotFound();

    if (element.type === 'aiSideTool') {
      const today = new Date();
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const formattedEnd = texts.formatDate(end);
      const parsedBirthDate = await parseBirthDateWithAi(data.ai2);
      const start = parsedBirthDate.birthDate ? parseGermanDate(parsedBirthDate.birthDate) : null;
      let text: string;
      let responseChunks: string[] | null = null;

      if (start !== null && start <= end) {
        const days = calculateDaysBetween(start, end);
        const formattedDays = days.toLocaleString(texts.numberLocale);
        const formattedStart = texts.formatDate(start);
        responseChunks = [
          `${texts.toolIntro(formattedStart)}\n\n`,
          `<div class="tool-call">🔧 <strong>${texts.toolCall}:</strong> <code>calculate_days_between(${formattedStart}, ${formattedEnd})</code></div>\n\n`,
          `<div class="tool-result">✅ <strong>${texts.toolResult}:</strong> ${formattedDays} ${texts.days}</div>\n\n`,
          texts.ageInDays(formattedDays)
        ];
        text = responseChunks.join('');
      } else {
        text = texts.invalidBirthDate;
      }
      const usage = parsedBirthDate.usage;

      await prisma.userProgress.create({
        data: {
          userId: data.userId,
          elementId: data.elementId,
          courseId: data.courseId,
          lessonId: data.lessonId,
          ai2: data.ai2,
          ai2Result: marked.parse(text, { async: false }),
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
            ai2Result: marked.parse(text, { async: false }),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'ai1') {

    const element = await findElementForLang(data.elementId, lang);
    if (!element) return elementNotFound();
  
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
            ai1Result: marked.parse(text, { async: false }),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  
  if (action === 'ai2') {
    const element = await findElementForLang(data.elementId, lang);
    if (!element) return elementNotFound();

    let messages: { role: 'developer' | 'user' | 'assistant'; content: string }[] = [
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
            ai2Result: marked.parse(text, { async: false }),
            ...usage,
            promptsTried: 1
          }
        });
      }
    });
  }
  

  if (action === 'ai12') {
    const element = await findElementForLang(data.elementId, lang);
    if (!element) return elementNotFound();
  

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
            ai1Result: marked.parse(text, { async: false }),
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
  const element = await findElementForLang(data.elementId, lang);
  if (!element) return elementNotFound();

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
  const element = await findElementForLang(data.elementId, lang);
  if (!element) return elementNotFound();

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
  const element = await findElementForLang(data.elementId, lang);
  if (!element) return elementNotFound();

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
          ai1Result: marked.parse(text, { async: false }),
          ...usage,
          promptsTried: 1,
          attempts: 3
        }
      });
    }
  });
}


if (action === 'star') {
  const element = await findElementForLang(data.elementId, lang);
  if (!element) return elementNotFound();

  const starPrompt = texts.starPrompt;

  return streamAiResponse({
    messages: [
      { role: 'developer', content: starPrompt + '\n' + (element.devPromptA ?? '') },
      { role: 'user', content: data.ai1 }
    ],
    saveToDb: async (text, usage) => {
      let starData: { star: boolean; feedback: string } = {
        star: false,
        feedback: texts.noAnswer
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
