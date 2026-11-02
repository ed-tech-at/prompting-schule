import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import {
  EDITOR_AUDIT_ACTIONS,
  editorAuditFailure,
  editorErrorMessage,
  readInt,
  readString,
  requireEditor,
  writeEditorAuditLog
} from '$lib/server/editor';
import {
  COURSE_TRANSLATABLE_FIELDS,
  ELEMENT_TRANSLATABLE_FIELDS,
  LESSON_TRANSLATABLE_FIELDS,
  QUIZ_TRANSLATABLE_FIELDS,
  buildSourceHashes,
  countStatuses,
  hashOptions,
  optionsStatus,
  translationFieldStatuses,
  type FieldStatus
} from '$lib/server/courseTranslations/core';
import { isCourseLang, type CourseLang } from '$lib/courseLang';

async function requireCourseAndLang(params: { courseId?: string; lang?: string }) {
  const courseId = Number.parseInt(params.courseId ?? '', 10);
  if (!Number.isInteger(courseId)) {
    throw error(400, 'Ungültige Kurs-ID.');
  }
  if (!isCourseLang(params.lang)) {
    throw error(404, 'Unbekannte Sprache.');
  }
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { translations: { where: { lang: params.lang } } }
  });
  if (!course) {
    throw error(404, 'Kurs wurde nicht gefunden.');
  }
  if (course.lang === params.lang) {
    throw error(400, 'Das ist die Ausgangssprache des Kurses. Sie wird im Kurs-Editor bearbeitet.');
  }
  const translation = course.translations[0];
  if (!translation) {
    throw error(404, 'Für diese Sprache gibt es noch keine Übersetzung. Legen Sie sie im Kurs-Editor an.');
  }
  return { course, translation, lang: params.lang as CourseLang };
}

export const load: PageServerLoad = async ({ cookies, params }) => {
  const actor = await requireEditor(cookies);
  const { course, translation, lang } = await requireCourseAndLang(params);

  // Deliberately unredacted: translators need the devPrompts, too.
  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: {
      translations: { where: { lang } },
      elements: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        include: { translations: { where: { lang } } }
      },
      quizQuestions: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        include: { translations: { where: { lang } } }
      }
    }
  });

  const allStatuses: FieldStatus[] = [];
  const track = (statuses: Record<string, FieldStatus>) => {
    allStatuses.push(...Object.values(statuses));
    return statuses;
  };

  const { translations: _courseTranslations, ...courseSource } = course;

  const lessonRows = lessons.map((lesson) => {
    const lessonTranslation = lesson.translations[0] ?? null;
    return {
      id: lesson.id,
      URL: lesson.URL,
      lessonEmoji: lesson.lessonEmoji,
      active: lesson.active,
      source: { lessonName: lesson.lessonName },
      translation: { lessonName: lessonTranslation?.lessonName ?? '' },
      status: track(translationFieldStatuses(lesson, lessonTranslation, LESSON_TRANSLATABLE_FIELDS)),
      elements: lesson.elements.map((element) => {
        const elementTranslation = element.translations[0] ?? null;
        return {
          id: element.id,
          type: element.type,
          source: Object.fromEntries(ELEMENT_TRANSLATABLE_FIELDS.map((field) => [field, element[field] ?? ''])),
          translation: Object.fromEntries(
            ELEMENT_TRANSLATABLE_FIELDS.map((field) => [field, elementTranslation?.[field] ?? ''])
          ),
          status: track(translationFieldStatuses(element, elementTranslation, ELEMENT_TRANSLATABLE_FIELDS))
        };
      }),
      quizQuestions: lesson.quizQuestions.map((question) => {
        const questionTranslation = question.translations[0] ?? null;
        const status = track({
          ...translationFieldStatuses(question, questionTranslation, QUIZ_TRANSLATABLE_FIELDS),
          options: optionsStatus(question.options, questionTranslation?.options, questionTranslation?.sourceHashes)
        });
        return {
          id: question.id,
          type: question.type,
          correct: question.correct,
          source: { question: question.question, options: question.options },
          translation: {
            question: questionTranslation?.question ?? '',
            options: question.options.map((_, index) => questionTranslation?.options[index] ?? '')
          },
          status
        };
      })
    };
  });

  const courseStatus = track(translationFieldStatuses(courseSource, translation, COURSE_TRANSLATABLE_FIELDS));

  return {
    actor,
    lang,
    course: courseSource,
    courseTranslation: {
      active: translation.active,
      updatedAt: translation.updatedAt,
      fields: Object.fromEntries(COURSE_TRANSLATABLE_FIELDS.map((field) => [field, translation[field] ?? '']))
    },
    courseStatus,
    lessons: lessonRows,
    counts: countStatuses(allStatuses)
  };
};

function readTranslatedFields<F extends string>(formData: FormData, fields: readonly F[]) {
  // Empty means "not translated yet": the learner pages fall back to the source.
  return Object.fromEntries(
    fields.map((field) => [field, readString(formData, field) || null])
  ) as Record<F, string | null>;
}

type TranslationActionResult = { success: boolean; action: string; message: string; entityKey?: string };

async function runTranslationAction(
  actorId: string,
  action: string,
  entityKey: string,
  metadata: Record<string, string | number | null>,
  work: () => Promise<string>
) {
  try {
    const message = await work();
    await writeEditorAuditLog({
      actorUserId: actorId,
      action: EDITOR_AUDIT_ACTIONS.TRANSLATION_UPDATED,
      outcome: 'SUCCESS',
      metadata
    });
    return { success: true, action, message, entityKey } satisfies TranslationActionResult;
  } catch (caught) {
    await editorAuditFailure(actorId, EDITOR_AUDIT_ACTIONS.TRANSLATION_UPDATED, caught, metadata);
    return fail(isHttpError(caught) ? caught.status : 500, {
      success: false,
      action,
      message: editorErrorMessage(caught),
      entityKey
    } satisfies TranslationActionResult);
  }
}

export const actions: Actions = {
  saveCourse: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();

    return runTranslationAction(
      actor.id,
      'saveCourse',
      'course',
      { entityType: 'courseTranslation', courseId: params.courseId ?? null, lang: params.lang ?? null },
      async () => {
        const { course, lang } = await requireCourseAndLang(params);
        const fields = readTranslatedFields(formData, COURSE_TRANSLATABLE_FIELDS);
        await prisma.courseTranslation.update({
          where: { courseId_lang: { courseId: course.id, lang } },
          data: { ...fields, sourceHashes: buildSourceHashes(course, fields, COURSE_TRANSLATABLE_FIELDS) }
        });
        return 'Die Kursdaten wurden gespeichert.';
      }
    );
  },

  saveLesson: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lessonId = readInt(formData, 'lessonId');

    return runTranslationAction(
      actor.id,
      'saveLesson',
      `lesson-${lessonId}`,
      { entityType: 'lessonTranslation', lessonId, lang: params.lang ?? null },
      async () => {
        const { course, lang } = await requireCourseAndLang(params);
        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
        if (!lesson || lesson.courseId !== course.id) throw error(404, 'Lektion wurde nicht gefunden.');

        const fields = readTranslatedFields(formData, LESSON_TRANSLATABLE_FIELDS);
        const data = { ...fields, sourceHashes: buildSourceHashes(lesson, fields, LESSON_TRANSLATABLE_FIELDS) };
        await prisma.lessonTranslation.upsert({
          where: { lessonId_lang: { lessonId: lesson.id, lang } },
          create: { lessonId: lesson.id, lang, ...data },
          update: data
        });
        return `Lektion "${lesson.lessonName}" gespeichert.`;
      }
    );
  },

  saveElement: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const elementId = readInt(formData, 'elementId');

    return runTranslationAction(
      actor.id,
      'saveElement',
      `element-${elementId}`,
      { entityType: 'elementTranslation', elementId, lang: params.lang ?? null },
      async () => {
        const { course, lang } = await requireCourseAndLang(params);
        const element = await prisma.element.findUnique({
          where: { id: elementId },
          include: { lesson: { select: { courseId: true } } }
        });
        if (!element || element.lesson.courseId !== course.id) throw error(404, 'Element wurde nicht gefunden.');

        const fields = readTranslatedFields(formData, ELEMENT_TRANSLATABLE_FIELDS);
        const data = { ...fields, sourceHashes: buildSourceHashes(element, fields, ELEMENT_TRANSLATABLE_FIELDS) };
        await prisma.elementTranslation.upsert({
          where: { elementId_lang: { elementId: element.id, lang } },
          create: { elementId: element.id, lang, ...data },
          update: data
        });
        return 'Element gespeichert.';
      }
    );
  },

  saveQuizQuestion: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const quizQuestionId = readInt(formData, 'quizQuestionId');

    return runTranslationAction(
      actor.id,
      'saveQuizQuestion',
      `quiz-${quizQuestionId}`,
      { entityType: 'quizQuestionTranslation', quizQuestionId, lang: params.lang ?? null },
      async () => {
        const { course, lang } = await requireCourseAndLang(params);
        const question = await prisma.quizQuestion.findUnique({
          where: { id: quizQuestionId },
          include: { lesson: { select: { courseId: true } } }
        });
        if (!question || question.lesson.courseId !== course.id) {
          throw error(404, 'Quizfrage wurde nicht gefunden.');
        }

        const fields = readTranslatedFields(formData, QUIZ_TRANSLATABLE_FIELDS);
        // Index-aligned with the source options; the grader maps back by index.
        const options = question.options.map((_, index) => readString(formData, `option-${index}`));
        const sourceHashes: Record<string, string> = buildSourceHashes(question, fields, QUIZ_TRANSLATABLE_FIELDS);
        if (options.some((option) => option !== '')) {
          sourceHashes.options = hashOptions(question.options);
        }

        const data = { ...fields, options, sourceHashes };
        await prisma.quizQuestionTranslation.upsert({
          where: { quizQuestionId_lang: { quizQuestionId: question.id, lang } },
          create: { quizQuestionId: question.id, lang, ...data },
          update: data
        });
        return 'Quizfrage gespeichert.';
      }
    );
  },

  setActive: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const active = readInt(formData, 'active');

    return runTranslationAction(
      actor.id,
      'setActive',
      'course',
      { entityType: 'courseTranslation', courseId: params.courseId ?? null, lang: params.lang ?? null, active },
      async () => {
        if (![0, 1, 2].includes(active)) throw error(400, 'Ungültiger Sichtbarkeitswert.');
        const { course, lang } = await requireCourseAndLang(params);
        await prisma.courseTranslation.update({
          where: { courseId_lang: { courseId: course.id, lang } },
          data: { active }
        });
        return active === 0
          ? 'Die Sprachfassung ist nicht mehr in der Kursliste sichtbar (per Link weiter erreichbar).'
          : 'Die Sprachfassung ist jetzt in der Kursliste sichtbar.';
      }
    );
  }
};
