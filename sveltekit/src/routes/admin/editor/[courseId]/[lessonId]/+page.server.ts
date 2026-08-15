import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import {
  EDITOR_AUDIT_ACTIONS,
  editorAuditFailure,
  editorErrorMessage,
  ELEMENT_TYPES,
  QUIZ_QUESTION_TYPES,
  readInt,
  readString,
  reorderSwap,
  requireEditor,
  writeEditorAuditLog
} from '$lib/server/editor';

async function requireCourseAndLesson(params: { courseId?: string; lessonId?: string }) {
  const courseId = Number.parseInt(params.courseId ?? '', 10);
  const lessonId = Number.parseInt(params.lessonId ?? '', 10);
  if (!Number.isInteger(courseId) || !Number.isInteger(lessonId)) {
    throw error(400, 'Ungültige Kurs- oder Lektions-ID.');
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw error(404, 'Kurs wurde nicht gefunden.');

  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== course.id) {
    throw error(404, 'Lektion wurde nicht gefunden.');
  }

  return { course, lesson };
}

export const load: PageServerLoad = async ({ cookies, params }) => {
  const actor = await requireEditor(cookies);
  const { course, lesson } = await requireCourseAndLesson(params);

  // Deliberately unredacted: editors need the devPrompts. The public lesson
  // load keeps stripping devPromptA.
  const elements = await prisma.element.findMany({
    where: { lessonId: lesson.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  });

  const quizQuestions = await prisma.quizQuestion.findMany({
    where: { lessonId: lesson.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  });

  return {
    actor,
    course,
    lesson,
    elements,
    quizQuestions,
    elementTypes: [...ELEMENT_TYPES],
    quizQuestionTypes: [...QUIZ_QUESTION_TYPES]
  };
};

async function requireElementInLesson(lessonId: number, elementId: number) {
  if (!Number.isInteger(elementId)) {
    throw error(400, 'Ungültige Element-ID.');
  }
  const element = await prisma.element.findUnique({ where: { id: elementId } });
  if (!element || element.lessonId !== lessonId) {
    throw error(404, 'Element wurde nicht gefunden.');
  }
  return element;
}

async function requireQuestionInLesson(lessonId: number, questionId: number) {
  if (!Number.isInteger(questionId)) {
    throw error(400, 'Ungültige Fragen-ID.');
  }
  const question = await prisma.quizQuestion.findUnique({ where: { id: questionId } });
  if (!question || question.lessonId !== lessonId) {
    throw error(404, 'Quizfrage wurde nicht gefunden.');
  }
  return question;
}

function readElementFields(formData: FormData) {
  const type = readString(formData, 'type');
  if (!(ELEMENT_TYPES as readonly string[]).includes(type)) {
    throw error(400, 'Unbekannter Element-Typ.');
  }

  const readNullable = (key: string): string | null => {
    const value = formData.get(key);
    return typeof value === 'string' && value.trim() !== '' ? value : null;
  };

  return {
    type,
    title: readNullable('title'),
    description: readNullable('description'),
    taskA: readNullable('taskA'),
    devPromptA: readNullable('devPromptA'),
    taskB: readNullable('taskB'),
    devPromptB: readNullable('devPromptB'),
    devPromptC: readNullable('devPromptC')
  };
}

function readLines(formData: FormData, key: string): string[] {
  const value = formData.get(key);
  if (typeof value !== 'string') return [];
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function readQuestionFields(formData: FormData) {
  const question = readString(formData, 'question');
  const type = readString(formData, 'questionType');
  const options = readLines(formData, 'options');
  const correct = readLines(formData, 'correct');

  if (!question) throw error(400, 'Der Fragetext darf nicht leer sein.');
  if (!(QUIZ_QUESTION_TYPES as readonly string[]).includes(type)) {
    throw error(400, 'Unbekannter Fragetyp.');
  }
  if (options.length < 2) {
    throw error(400, 'Geben Sie mindestens zwei Antwortoptionen an (eine pro Zeile).');
  }
  if (correct.length === 0) {
    throw error(400, 'Geben Sie mindestens eine richtige Antwort an (eine pro Zeile).');
  }

  return { question, type, options, correct };
}

export const actions: Actions = {
  updateLesson: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();

    try {
      const { lesson } = await requireCourseAndLesson(params);

      const lessonName = readString(formData, 'lessonName');
      const lessonEmoji = readString(formData, 'lessonEmoji');
      const starsNeeded = readInt(formData, 'starsNeeded');

      if (!lessonName) throw error(400, 'Der Lektionsname darf nicht leer sein.');
      if (!Number.isInteger(starsNeeded) || starsNeeded < 0) {
        throw error(400, 'Die benötigten Sterne müssen 0 oder größer sein.');
      }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          lessonName,
          lessonEmoji: lessonEmoji || null,
          starsNeeded
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.LESSON_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'lesson', lessonId: lesson.id, lessonUrl: lesson.URL }
      });

      return { success: true, action: 'updateLesson', message: 'Die Lektion wurde gespeichert.' };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.LESSON_UPDATED, caught, {
        entityType: 'lesson',
        lessonId: params.lessonId ?? null
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'updateLesson',
        message: editorErrorMessage(caught)
      });
    }
  },

  createElement: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();

    try {
      const { lesson } = await requireCourseAndLesson(params);
      const fields = readElementFields(formData);

      const maxPosition = await prisma.element.aggregate({
        where: { lessonId: lesson.id },
        _max: { position: true }
      });

      const element = await prisma.element.create({
        data: {
          ...fields,
          lessonId: lesson.id,
          position: (maxPosition._max.position ?? 0) + 1
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.ELEMENT_CREATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'element', elementId: element.id, lessonId: lesson.id, type: fields.type }
      });

      return {
        success: true,
        action: 'createElement',
        message: `Ein neues Element vom Typ "${fields.type}" wurde angelegt.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.ELEMENT_CREATED, caught, {
        entityType: 'element',
        lessonId: params.lessonId ?? null
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'createElement',
        message: editorErrorMessage(caught)
      });
    }
  },

  updateElement: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const elementId = readInt(formData, 'elementId');

    try {
      const { lesson } = await requireCourseAndLesson(params);
      const element = await requireElementInLesson(lesson.id, elementId);
      const fields = readElementFields(formData);

      await prisma.element.update({ where: { id: element.id }, data: fields });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.ELEMENT_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'element', elementId: element.id, lessonId: lesson.id, type: fields.type }
      });

      return {
        success: true,
        action: 'updateElement',
        elementId,
        message: 'Das Element wurde gespeichert.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.ELEMENT_UPDATED, caught, {
        entityType: 'element',
        elementId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'updateElement',
        elementId,
        message: editorErrorMessage(caught)
      });
    }
  },

  moveElement: async ({ cookies, request, params }) => {
    await requireEditor(cookies);
    const formData = await request.formData();
    const elementId = readInt(formData, 'elementId');
    const direction = readString(formData, 'direction');

    try {
      const { lesson } = await requireCourseAndLesson(params);
      await requireElementInLesson(lesson.id, elementId);
      if (direction !== 'up' && direction !== 'down') {
        throw error(400, 'Ungültige Verschieberichtung.');
      }

      const elements = await prisma.element.findMany({
        where: { lessonId: lesson.id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true }
      });

      const updates = reorderSwap(elements, elementId, direction);
      if (updates) {
        await prisma.$transaction(
          updates.map(({ id, position }) =>
            prisma.element.update({ where: { id }, data: { position } })
          )
        );
      }

      return { success: true, action: 'moveElement', message: 'Die Reihenfolge wurde aktualisiert.' };
    } catch (caught) {
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'moveElement',
        message: editorErrorMessage(caught)
      });
    }
  },

  deleteElement: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const elementId = readInt(formData, 'elementId');
    const confirmation = readString(formData, 'confirmation');

    try {
      const { lesson } = await requireCourseAndLesson(params);
      const element = await requireElementInLesson(lesson.id, elementId);

      if (confirmation !== 'LÖSCHEN') {
        throw error(400, 'Geben Sie zur Bestätigung LÖSCHEN ein.');
      }

      await prisma.element.delete({ where: { id: element.id } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.ELEMENT_DELETED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'element', elementId: element.id, lessonId: lesson.id, type: element.type }
      });

      return {
        success: true,
        action: 'deleteElement',
        message: 'Das Element wurde mit allen zugehörigen Nutzerfortschritten gelöscht.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.ELEMENT_DELETED, caught, {
        entityType: 'element',
        elementId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteElement',
        message: editorErrorMessage(caught)
      });
    }
  },

  createQuizQuestion: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();

    try {
      const { lesson } = await requireCourseAndLesson(params);
      const fields = readQuestionFields(formData);

      const maxPosition = await prisma.quizQuestion.aggregate({
        where: { lessonId: lesson.id },
        _max: { position: true }
      });

      const created = await prisma.quizQuestion.create({
        data: {
          ...fields,
          lessonId: lesson.id,
          position: (maxPosition._max.position ?? 0) + 1
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.QUIZ_QUESTION_CREATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'quizQuestion', questionId: created.id, lessonId: lesson.id }
      });

      return {
        success: true,
        action: 'createQuizQuestion',
        message: 'Die Quizfrage wurde angelegt.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.QUIZ_QUESTION_CREATED, caught, {
        entityType: 'quizQuestion',
        lessonId: params.lessonId ?? null
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'createQuizQuestion',
        message: editorErrorMessage(caught)
      });
    }
  },

  updateQuizQuestion: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const questionId = readInt(formData, 'questionId');

    try {
      const { lesson } = await requireCourseAndLesson(params);
      const question = await requireQuestionInLesson(lesson.id, questionId);
      const fields = readQuestionFields(formData);

      await prisma.quizQuestion.update({ where: { id: question.id }, data: fields });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.QUIZ_QUESTION_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'quizQuestion', questionId: question.id, lessonId: lesson.id }
      });

      return {
        success: true,
        action: 'updateQuizQuestion',
        questionId,
        message: 'Die Quizfrage wurde gespeichert.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.QUIZ_QUESTION_UPDATED, caught, {
        entityType: 'quizQuestion',
        questionId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'updateQuizQuestion',
        questionId,
        message: editorErrorMessage(caught)
      });
    }
  },

  moveQuizQuestion: async ({ cookies, request, params }) => {
    await requireEditor(cookies);
    const formData = await request.formData();
    const questionId = readInt(formData, 'questionId');
    const direction = readString(formData, 'direction');

    try {
      const { lesson } = await requireCourseAndLesson(params);
      await requireQuestionInLesson(lesson.id, questionId);
      if (direction !== 'up' && direction !== 'down') {
        throw error(400, 'Ungültige Verschieberichtung.');
      }

      const questions = await prisma.quizQuestion.findMany({
        where: { lessonId: lesson.id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true }
      });

      const updates = reorderSwap(questions, questionId, direction);
      if (updates) {
        await prisma.$transaction(
          updates.map(({ id, position }) =>
            prisma.quizQuestion.update({ where: { id }, data: { position } })
          )
        );
      }

      return {
        success: true,
        action: 'moveQuizQuestion',
        message: 'Die Reihenfolge wurde aktualisiert.'
      };
    } catch (caught) {
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'moveQuizQuestion',
        message: editorErrorMessage(caught)
      });
    }
  },

  deleteQuizQuestion: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const questionId = readInt(formData, 'questionId');

    try {
      const { lesson } = await requireCourseAndLesson(params);
      const question = await requireQuestionInLesson(lesson.id, questionId);

      await prisma.quizQuestion.delete({ where: { id: question.id } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.QUIZ_QUESTION_DELETED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'quizQuestion', questionId: question.id, lessonId: lesson.id }
      });

      return {
        success: true,
        action: 'deleteQuizQuestion',
        message: 'Die Quizfrage wurde gelöscht.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.QUIZ_QUESTION_DELETED, caught, {
        entityType: 'quizQuestion',
        questionId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteQuizQuestion',
        message: editorErrorMessage(caught)
      });
    }
  }
};
