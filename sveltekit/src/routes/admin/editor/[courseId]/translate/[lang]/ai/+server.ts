import { error, json, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireEditor } from '$lib/server/editor';
import { translateWithAi } from '$lib/server/openAiResponses';
import {
  AI_TRANSLATABLE_FIELDS,
  AI_TRANSLATION_MAX_LENGTH,
  buildTranslationInstructions
} from '$lib/server/courseTranslations/aiPrompt';
import { isCourseLang } from '$lib/courseLang';

// Suggests a translation for one field. Nothing is stored here: the text goes
// into the form field and is saved with the normal save button.
export const POST: RequestHandler = async ({ cookies, params, request }) => {
  await requireEditor(cookies);

  const courseId = Number.parseInt(params.courseId ?? '', 10);
  if (!Number.isInteger(courseId) || !isCourseLang(params.lang)) {
    throw error(400, 'Ungültige Kurs-ID oder Sprache.');
  }

  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { lang: true } });
  if (!course) throw error(404, 'Kurs wurde nicht gefunden.');
  if (course.lang === params.lang) throw error(400, 'Das ist die Ausgangssprache des Kurses.');

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text : '';
  const field = typeof body?.field === 'string' ? body.field : '';

  if (!AI_TRANSLATABLE_FIELDS.includes(field)) throw error(400, 'Unbekanntes Feld.');
  if (text.trim() === '') return json({ translation: '' });
  if (text.length > AI_TRANSLATION_MAX_LENGTH) throw error(400, 'Der Text ist zu lang für die KI-Übersetzung.');

  try {
    const translation = await translateWithAi(buildTranslationInstructions(field, course.lang, params.lang), text);
    return json({ translation });
  } catch (caught) {
    console.error('AI translation failed:', caught);
    throw error(502, 'Die KI-Übersetzung ist fehlgeschlagen. Bitte später erneut versuchen.');
  }
};
