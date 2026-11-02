import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import {
  EDITOR_AUDIT_ACTIONS,
  editorAuditFailure,
  editorErrorMessage,
  readInt,
  readString,
  reorderSwap,
  requireEditor,
  SLUG_PATTERN,
  writeEditorAuditLog
} from '$lib/server/editor';
import { COURSE_LANGS, COURSE_LANG_LABELS, isCourseLang } from '$lib/courseLang';

async function requireCourseParam(params: { courseId?: string }) {
  const courseId = Number.parseInt(params.courseId ?? '', 10);
  if (!Number.isInteger(courseId)) {
    throw error(400, 'Ungültige Kurs-ID.');
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw error(404, 'Kurs wurde nicht gefunden.');
  }
  return course;
}

export const load: PageServerLoad = async ({ cookies, params }) => {
  const actor = await requireEditor(cookies);
  const course = await requireCourseParam(params);

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { elements: true, quizQuestions: true } } }
  });

  const translations = await prisma.courseTranslation.findMany({
    where: { courseId: course.id },
    orderBy: { lang: 'asc' },
    select: { lang: true, active: true, updatedAt: true }
  });

  return { actor, course, lessons, translations, courseLangs: [...COURSE_LANGS] };
};

async function requireLessonInCourse(courseId: number, lessonId: number) {
  if (!Number.isInteger(lessonId)) {
    throw error(400, 'Ungültige Lektions-ID.');
  }
  const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
  if (!lesson || lesson.courseId !== courseId) {
    throw error(404, 'Lektion wurde nicht gefunden.');
  }
  return lesson;
}

export const actions: Actions = {
  updateCourse: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();

    try {
      const course = await requireCourseParam(params);

      const name = readString(formData, 'name');
      const URL = readString(formData, 'URL');
      const lang = readString(formData, 'lang');
      const displayType = readString(formData, 'displayType');
      const description = readString(formData, 'description');
      const introDescription = readString(formData, 'introDescription');
      const introDescriptionSuffix = readString(formData, 'introDescriptionSuffix');

      if (!name) throw error(400, 'Der Kursname darf nicht leer sein.');
      if (!SLUG_PATTERN.test(URL)) {
        throw error(400, 'Die URL darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.');
      }
      if (!isCourseLang(lang)) throw error(400, 'Wählen Sie eine Sprache (de oder en).');
      if (lang !== course.lang) {
        const clash = await prisma.courseTranslation.findUnique({
          where: { courseId_lang: { courseId: course.id, lang } }
        });
        if (clash) {
          throw error(
            400,
            `Für ${COURSE_LANG_LABELS[lang]} gibt es bereits eine Übersetzung. Löschen Sie sie zuerst, bevor ${COURSE_LANG_LABELS[lang]} Ausgangssprache wird.`
          );
        }
      }

      if (URL !== course.URL) {
        const existing = await prisma.course.findUnique({ where: { URL } });
        if (existing) throw error(400, `Die Kurs-URL "${URL}" ist bereits vergeben.`);
      }

      await prisma.course.update({
        where: { id: course.id },
        data: {
          name,
          URL,
          lang,
          displayType: displayType || null,
          description: description || null,
          introDescription: introDescription || null,
          introDescriptionSuffix: introDescriptionSuffix || null
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.COURSE_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'course', courseId: course.id, courseUrl: URL }
      });

      return { success: true, action: 'updateCourse', message: 'Der Kurs wurde gespeichert.' };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.COURSE_UPDATED, caught, {
        entityType: 'course',
        courseId: params.courseId ?? null
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'updateCourse',
        message: editorErrorMessage(caught)
      });
    }
  },

  createLesson: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lessonName = readString(formData, 'lessonName');
    const lessonEmoji = readString(formData, 'lessonEmoji');
    const URL = readString(formData, 'URL');

    try {
      const course = await requireCourseParam(params);

      if (!lessonName) throw error(400, 'Der Lektionsname darf nicht leer sein.');
      if (!SLUG_PATTERN.test(URL)) {
        throw error(400, 'Die URL darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.');
      }

      const existing = await prisma.lesson.findUnique({ where: { courseId_URL: { courseId: course.id, URL } } });
      if (existing) {
        throw error(400, `Die Lektions-URL "${URL}" ist in diesem Kurs bereits vergeben.`);
      }

      const maxPosition = await prisma.lesson.aggregate({
        where: { courseId: course.id },
        _max: { position: true }
      });

      const lesson = await prisma.lesson.create({
        data: {
          lessonName,
          lessonEmoji: lessonEmoji || null,
          URL,
          courseId: course.id,
          active: 0,
          starsNeeded: 0,
          position: (maxPosition._max.position ?? 0) + 1
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.LESSON_CREATED,
        outcome: 'SUCCESS',
        metadata: {
          entityType: 'lesson',
          lessonId: lesson.id,
          lessonUrl: lesson.URL,
          courseId: course.id
        }
      });

      return {
        success: true,
        action: 'createLesson',
        message: `Die Lektion "${lessonName}" wurde angelegt.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.LESSON_CREATED, caught, {
        entityType: 'lesson',
        lessonUrl: URL
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'createLesson',
        message: editorErrorMessage(caught)
      });
    }
  },

  updateLesson: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lessonId = readInt(formData, 'lessonId');

    try {
      const course = await requireCourseParam(params);
      const lesson = await requireLessonInCourse(course.id, lessonId);

      const lessonName = readString(formData, 'lessonName');
      const lessonEmoji = readString(formData, 'lessonEmoji');
      const URL = readString(formData, 'URL');
      const starsNeeded = readInt(formData, 'starsNeeded');

      if (!lessonName) throw error(400, 'Der Lektionsname darf nicht leer sein.');
      if (!SLUG_PATTERN.test(URL)) {
        throw error(400, 'Die URL darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.');
      }
      if (!Number.isInteger(starsNeeded) || starsNeeded < 0) {
        throw error(400, 'Die benötigten Sterne müssen 0 oder größer sein.');
      }

      if (URL !== lesson.URL) {
        const existing = await prisma.lesson.findUnique({ where: { courseId_URL: { courseId: course.id, URL } } });
        if (existing) {
          throw error(400, `Die Lektions-URL "${URL}" ist in diesem Kurs bereits vergeben.`);
        }
      }

      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          lessonName,
          lessonEmoji: lessonEmoji || null,
          URL,
          starsNeeded
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.LESSON_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'lesson', lessonId: lesson.id, lessonUrl: URL }
      });

      return { success: true, action: 'updateLesson', message: 'Die Lektion wurde gespeichert.' };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.LESSON_UPDATED, caught, {
        entityType: 'lesson',
        lessonId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'updateLesson',
        message: editorErrorMessage(caught)
      });
    }
  },

  moveLesson: async ({ cookies, request, params }) => {
    await requireEditor(cookies);
    const formData = await request.formData();
    const lessonId = readInt(formData, 'lessonId');
    const direction = readString(formData, 'direction');

    try {
      const course = await requireCourseParam(params);
      await requireLessonInCourse(course.id, lessonId);
      if (direction !== 'up' && direction !== 'down') {
        throw error(400, 'Ungültige Verschieberichtung.');
      }

      const lessons = await prisma.lesson.findMany({
        where: { courseId: course.id },
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true }
      });

      const updates = reorderSwap(lessons, lessonId, direction);
      if (updates) {
        await prisma.$transaction(
          updates.map(({ id, position }) =>
            prisma.lesson.update({ where: { id }, data: { position } })
          )
        );
      }

      return { success: true, action: 'moveLesson', message: 'Die Reihenfolge wurde aktualisiert.' };
    } catch (caught) {
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'moveLesson',
        message: editorErrorMessage(caught)
      });
    }
  },

  setLessonActive: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lessonId = readInt(formData, 'lessonId');
    const active = readString(formData, 'active') === '1' ? 1 : 0;

    try {
      const course = await requireCourseParam(params);
      const lesson = await requireLessonInCourse(course.id, lessonId);

      await prisma.lesson.update({ where: { id: lesson.id }, data: { active } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.LESSON_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'lesson', lessonId: lesson.id, lessonUrl: lesson.URL, active }
      });

      return {
        success: true,
        action: 'setLessonActive',
        message: active ? 'Die Lektion ist jetzt aktiv.' : 'Die Lektion ist jetzt inaktiv.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.LESSON_UPDATED, caught, {
        entityType: 'lesson',
        lessonId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'setLessonActive',
        message: editorErrorMessage(caught)
      });
    }
  },

  deleteLesson: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lessonId = readInt(formData, 'lessonId');
    const confirmation = readString(formData, 'confirmation');

    try {
      const course = await requireCourseParam(params);
      const lesson = await requireLessonInCourse(course.id, lessonId);

      if (confirmation !== lesson.URL) {
        throw error(400, 'Die eingegebene Lektions-URL stimmt nicht überein.');
      }

      await prisma.lesson.delete({ where: { id: lesson.id } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.LESSON_DELETED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'lesson', lessonId: lesson.id, lessonUrl: lesson.URL }
      });

      return {
        success: true,
        action: 'deleteLesson',
        message: `Die Lektion "${lesson.lessonName}" wurde mit allen Elementen und Nutzerdaten gelöscht.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.LESSON_DELETED, caught, {
        entityType: 'lesson',
        lessonId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteLesson',
        message: editorErrorMessage(caught)
      });
    }
  },

  createTranslation: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lang = readString(formData, 'lang');

    try {
      const course = await requireCourseParam(params);
      if (!isCourseLang(lang)) throw error(400, 'Unbekannte Sprache.');
      if (lang === course.lang) throw error(400, 'Das ist bereits die Ausgangssprache des Kurses.');

      const existing = await prisma.courseTranslation.findUnique({
        where: { courseId_lang: { courseId: course.id, lang } }
      });
      if (existing) throw error(400, `Für ${COURSE_LANG_LABELS[lang]} gibt es bereits eine Übersetzung.`);

      // Starts hidden: reachable by direct URL for testing, not listed yet.
      await prisma.courseTranslation.create({ data: { courseId: course.id, lang, active: 0 } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.TRANSLATION_CREATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'courseTranslation', courseId: course.id, lang }
      });

      return {
        success: true,
        action: 'createTranslation',
        message: `Die Übersetzung ${COURSE_LANG_LABELS[lang]} wurde angelegt. Sie ist noch nicht in der Kursliste sichtbar.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.TRANSLATION_CREATED, caught, {
        entityType: 'courseTranslation',
        courseId: params.courseId ?? null,
        lang
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'createTranslation',
        message: editorErrorMessage(caught)
      });
    }
  },

  setTranslationActive: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lang = readString(formData, 'lang');
    const active = readInt(formData, 'active');

    try {
      const course = await requireCourseParam(params);
      if (!isCourseLang(lang)) throw error(400, 'Unbekannte Sprache.');
      if (![0, 1, 2].includes(active)) throw error(400, 'Ungültiger Sichtbarkeitswert.');

      await prisma.courseTranslation.update({
        where: { courseId_lang: { courseId: course.id, lang } },
        data: { active }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.TRANSLATION_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'courseTranslation', courseId: course.id, lang, active }
      });

      return {
        success: true,
        action: 'setTranslationActive',
        message: active
          ? `${COURSE_LANG_LABELS[lang]} ist jetzt in der Kursliste sichtbar.`
          : `${COURSE_LANG_LABELS[lang]} ist jetzt versteckt (per Link weiter erreichbar).`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.TRANSLATION_UPDATED, caught, {
        entityType: 'courseTranslation',
        courseId: params.courseId ?? null,
        lang
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'setTranslationActive',
        message: editorErrorMessage(caught)
      });
    }
  },

  deleteTranslation: async ({ cookies, request, params }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const lang = readString(formData, 'lang');
    const confirmation = readString(formData, 'confirmation');

    try {
      const course = await requireCourseParam(params);
      if (!isCourseLang(lang)) throw error(400, 'Unbekannte Sprache.');
      if (confirmation !== lang) throw error(400, 'Die eingegebene Sprachkürzel stimmt nicht überein.');

      // Lesson, element and quiz translations hang off the source rows, not off
      // CourseTranslation, so they are removed explicitly.
      await prisma.$transaction([
        prisma.elementTranslation.deleteMany({ where: { lang, element: { lesson: { courseId: course.id } } } }),
        prisma.quizQuestionTranslation.deleteMany({
          where: { lang, quizQuestion: { lesson: { courseId: course.id } } }
        }),
        prisma.lessonTranslation.deleteMany({ where: { lang, lesson: { courseId: course.id } } }),
        prisma.courseTranslation.delete({ where: { courseId_lang: { courseId: course.id, lang } } })
      ]);

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.TRANSLATION_DELETED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'courseTranslation', courseId: course.id, lang }
      });

      return {
        success: true,
        action: 'deleteTranslation',
        message: `Die Übersetzung ${COURSE_LANG_LABELS[lang]} wurde gelöscht. Fortschritt und Badges bleiben erhalten.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.TRANSLATION_DELETED, caught, {
        entityType: 'courseTranslation',
        courseId: params.courseId ?? null,
        lang
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteTranslation',
        message: editorErrorMessage(caught)
      });
    }
  }
};
