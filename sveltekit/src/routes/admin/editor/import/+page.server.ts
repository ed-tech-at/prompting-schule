import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import {
  EDITOR_AUDIT_ACTIONS,
  editorAuditFailure,
  editorErrorMessage,
  readString,
  requireEditor,
  SLUG_PATTERN,
  writeEditorAuditLog
} from '$lib/server/editor';
import {
  diffCourseImport,
  parseCourseExportFile,
  suggestCopySlugs,
  type CourseExport,
  type ExistingCourseSnapshot
} from '$lib/server/editor/exportImport';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export const load: PageServerLoad = async ({ cookies }) => {
  const actor = await requireEditor(cookies);
  return { actor };
};

async function loadSnapshot(courseUrl: string): Promise<ExistingCourseSnapshot | null> {
  const course = await prisma.course.findUnique({
    where: { URL: courseUrl },
    include: {
      lessons: {
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        include: {
          elements: { orderBy: [{ position: 'asc' }, { id: 'asc' }] },
          quizQuestions: { orderBy: [{ position: 'asc' }, { id: 'asc' }] }
        }
      }
    }
  });
  return course;
}

async function loadForeignLessonUrls(ownCourseId: number | null): Promise<Set<string>> {
  const lessons = await prisma.lesson.findMany({
    where: ownCourseId === null ? {} : { courseId: { not: ownCourseId } },
    select: { URL: true }
  });
  return new Set(lessons.map((lesson) => lesson.URL));
}

async function buildPreview(incoming: CourseExport) {
  const existing = await loadSnapshot(incoming.URL);
  const foreignLessonUrls = await loadForeignLessonUrls(existing?.id ?? null);
  const diff = diffCourseImport(incoming, existing, foreignLessonUrls);

  const allCourses = await prisma.course.findMany({ select: { URL: true } });
  const allLessons = await prisma.lesson.findMany({ select: { URL: true } });
  const suggested = suggestCopySlugs(
    incoming,
    new Set(allCourses.map((course) => course.URL)),
    new Set(allLessons.map((lesson) => lesson.URL))
  );

  return { existing, diff, suggested };
}

function parsePayloadOrFail(text: string): CourseExport {
  if (text.length > MAX_IMPORT_BYTES) {
    throw error(400, 'Die Datei ist zu groß (maximal 2 MB).');
  }
  const parsed = parseCourseExportFile(text);
  if (!parsed.ok) {
    throw error(400, `Die Datei ist ungültig: ${parsed.errors[0]}`);
  }
  return parsed.data.course;
}

export const actions: Actions = {
  preview: async ({ cookies, request }) => {
    await requireEditor(cookies);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return fail(400, {
        step: 'upload',
        success: false,
        message: 'Bitte wählen Sie eine JSON-Datei aus.'
      });
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return fail(400, {
        step: 'upload',
        success: false,
        message: 'Die Datei ist zu groß (maximal 2 MB).'
      });
    }

    const text = await file.text();
    const parsed = parseCourseExportFile(text);
    if (!parsed.ok) {
      return fail(400, {
        step: 'upload',
        success: false,
        message: 'Die Datei konnte nicht gelesen werden.',
        errors: parsed.errors
      });
    }

    const incoming = parsed.data.course;
    const { diff, suggested } = await buildPreview(incoming);

    return {
      step: 'preview',
      success: true,
      courseName: incoming.name,
      courseUrl: incoming.URL,
      lessonCount: incoming.lessons.length,
      diff,
      suggested,
      rawJson: text
    };
  },

  applyUpdate: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const payload = formData.get('payload');
    const deleteMissing = formData.get('deleteMissing') === 'on';

    try {
      if (typeof payload !== 'string' || payload.trim() === '') {
        throw error(400, 'Die Importdaten fehlen. Laden Sie die Datei erneut hoch.');
      }

      const incoming = parsePayloadOrFail(payload);

      // Re-diff against the current DB state: the preview may be stale.
      const existing = await loadSnapshot(incoming.URL);
      const foreignLessonUrls = await loadForeignLessonUrls(existing?.id ?? null);
      const diff = diffCourseImport(incoming, existing, foreignLessonUrls);

      if (diff.blocking.length > 0) {
        throw error(400, diff.blocking[0]);
      }

      const counters = {
        lessonsCreated: 0,
        lessonsUpdated: 0,
        lessonsDeleted: 0,
        elementsCreated: 0,
        elementsUpdated: 0,
        elementsDeleted: 0
      };

      await prisma.$transaction(async (tx) => {
        const courseData = {
          name: incoming.name,
          description: incoming.description,
          introDescription: incoming.introDescription,
          introDescriptionSuffix: incoming.introDescriptionSuffix,
          active: incoming.active,
          position: incoming.position,
          displayType: incoming.displayType,
          lang: incoming.lang
        };

        const course = existing
          ? await tx.course.update({ where: { id: existing.id }, data: courseData })
          : await tx.course.create({ data: { ...courseData, URL: incoming.URL } });

        const existingLessonsByUrl = new Map(
          (existing?.lessons ?? []).map((lesson) => [lesson.URL, lesson])
        );

        for (const incomingLesson of incoming.lessons) {
          const lessonData = {
            lessonName: incomingLesson.lessonName,
            lessonEmoji: incomingLesson.lessonEmoji,
            active: incomingLesson.active,
            starsNeeded: incomingLesson.starsNeeded,
            position: incomingLesson.position
          };

          const existingLesson = existingLessonsByUrl.get(incomingLesson.URL);
          let lessonId: number;

          if (existingLesson) {
            await tx.lesson.update({ where: { id: existingLesson.id }, data: lessonData });
            lessonId = existingLesson.id;
            counters.lessonsUpdated += 1;
          } else {
            const created = await tx.lesson.create({
              data: { ...lessonData, URL: incomingLesson.URL, courseId: course.id }
            });
            lessonId = created.id;
            counters.lessonsCreated += 1;
          }

          // Pair elements by position order so existing ids (and therefore
          // user progress) survive updates.
          const incomingElements = [...incomingLesson.elements].sort(
            (a, b) => a.position - b.position
          );
          const existingElements = existingLesson?.elements ?? [];

          for (let index = 0; index < incomingElements.length; index += 1) {
            const elementData = {
              type: incomingElements[index].type,
              title: incomingElements[index].title,
              description: incomingElements[index].description,
              taskA: incomingElements[index].taskA,
              devPromptA: incomingElements[index].devPromptA,
              taskB: incomingElements[index].taskB,
              devPromptB: incomingElements[index].devPromptB,
              devPromptC: incomingElements[index].devPromptC,
              position: incomingElements[index].position
            };

            const existingElement = existingElements[index];
            if (existingElement) {
              await tx.element.update({ where: { id: existingElement.id }, data: elementData });
              counters.elementsUpdated += 1;
            } else {
              await tx.element.create({ data: { ...elementData, lessonId } });
              counters.elementsCreated += 1;
            }
          }

          const surplusElementIds = existingElements
            .slice(incomingElements.length)
            .map((element) => element.id);
          if (deleteMissing && surplusElementIds.length > 0) {
            await tx.element.deleteMany({ where: { id: { in: surplusElementIds } } });
            counters.elementsDeleted += surplusElementIds.length;
          }

          // Quiz questions carry no user data: replace wholesale.
          await tx.quizQuestion.deleteMany({ where: { lessonId } });
          if (incomingLesson.quizQuestions.length > 0) {
            await tx.quizQuestion.createMany({
              data: incomingLesson.quizQuestions.map((question) => ({
                question: question.question,
                type: question.type,
                options: question.options,
                correct: question.correct,
                position: question.position,
                lessonId
              }))
            });
          }
        }

        if (deleteMissing) {
          for (const removed of diff.removedLessons) {
            await tx.lesson.delete({ where: { id: removed.id } });
            counters.lessonsDeleted += 1;
          }
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.COURSE_IMPORT_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'course', courseUrl: incoming.URL, ...counters }
      });

      return {
        step: 'done',
        success: true,
        action: 'applyUpdate',
        message:
          `Der Kurs "${incoming.name}" wurde importiert: ` +
          `${counters.lessonsCreated} Lektionen neu, ${counters.lessonsUpdated} aktualisiert, ${counters.lessonsDeleted} gelöscht; ` +
          `${counters.elementsCreated} Elemente neu, ${counters.elementsUpdated} aktualisiert, ${counters.elementsDeleted} gelöscht.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.COURSE_IMPORT_UPDATED, caught, {
        entityType: 'course'
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        step: 'upload',
        success: false,
        action: 'applyUpdate',
        message: editorErrorMessage(caught)
      });
    }
  },

  applyCopy: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const payload = formData.get('payload');
    const newCourseUrl = readString(formData, 'newCourseUrl');

    try {
      if (typeof payload !== 'string' || payload.trim() === '') {
        throw error(400, 'Die Importdaten fehlen. Laden Sie die Datei erneut hoch.');
      }

      const incoming = parsePayloadOrFail(payload);

      if (!SLUG_PATTERN.test(newCourseUrl)) {
        throw error(400, 'Die neue Kurs-URL darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.');
      }

      const existingCourse = await prisma.course.findUnique({ where: { URL: newCourseUrl } });
      if (existingCourse) {
        throw error(400, `Die Kurs-URL "${newCourseUrl}" ist bereits vergeben.`);
      }

      // Regenerate lesson slugs against the current DB state.
      const allLessons = await prisma.lesson.findMany({ select: { URL: true } });
      const { lessonUrls } = suggestCopySlugs(
        incoming,
        new Set([newCourseUrl]),
        new Set(allLessons.map((lesson) => lesson.URL))
      );

      const maxPosition = await prisma.course.aggregate({ _max: { position: true } });

      const created = await prisma.course.create({
        data: {
          name: incoming.name,
          URL: newCourseUrl,
          description: incoming.description,
          introDescription: incoming.introDescription,
          introDescriptionSuffix: incoming.introDescriptionSuffix,
          // Copies always start inactive so they can be reviewed first.
          active: 0,
          position: (maxPosition._max.position ?? 0) + 1,
          displayType: incoming.displayType,
          lang: incoming.lang,
          lessons: {
            create: incoming.lessons.map((lesson) => ({
              lessonName: lesson.lessonName,
              lessonEmoji: lesson.lessonEmoji,
              URL: lessonUrls[lesson.URL],
              active: lesson.active,
              starsNeeded: lesson.starsNeeded,
              position: lesson.position,
              elements: {
                create: lesson.elements.map((element) => ({
                  type: element.type,
                  title: element.title,
                  description: element.description,
                  taskA: element.taskA,
                  devPromptA: element.devPromptA,
                  taskB: element.taskB,
                  devPromptB: element.devPromptB,
                  devPromptC: element.devPromptC,
                  position: element.position
                }))
              },
              quizQuestions: {
                create: lesson.quizQuestions.map((question) => ({
                  question: question.question,
                  type: question.type,
                  options: question.options,
                  correct: question.correct,
                  position: question.position
                }))
              }
            }))
          }
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.COURSE_IMPORT_COPIED,
        outcome: 'SUCCESS',
        metadata: {
          entityType: 'course',
          courseId: created.id,
          courseUrl: newCourseUrl,
          sourceUrl: incoming.URL
        }
      });

      return {
        step: 'done',
        success: true,
        action: 'applyCopy',
        message: `Der Kurs wurde als Kopie unter der URL "${newCourseUrl}" importiert (inaktiv).`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.COURSE_IMPORT_COPIED, caught, {
        entityType: 'course',
        courseUrl: newCourseUrl
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        step: 'upload',
        success: false,
        action: 'applyCopy',
        message: editorErrorMessage(caught)
      });
    }
  }
};
