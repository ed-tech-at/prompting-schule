import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import { courseSlugTaken } from '$lib/server/editor/slugs';
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
  suggestCopyCourseUrl,
  type CourseExport,
  type ExistingCourseSnapshot
} from '$lib/server/editor/exportImport';

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

// Translations from the file as Prisma create rows. The source language of the
// course is skipped: its texts live in the source rows themselves.
function translationRows<T extends { sourceHashes: Record<string, string> | null }>(
  translations: Record<string, T> | undefined,
  sourceLang: string
) {
  return Object.entries(translations ?? {})
    .filter(([lang]) => lang !== sourceLang)
    .map(([lang, { sourceHashes, ...fields }]) => ({ lang, ...fields, sourceHashes: sourceHashes ?? undefined }));
}

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

async function buildPreview(incoming: CourseExport) {
  const existing = await loadSnapshot(incoming.URL);
  const diff = diffCourseImport(incoming, existing);

  const allCourses = await prisma.course.findMany({ select: { URL: true } });
  const suggested = {
    courseUrl: suggestCopyCourseUrl(incoming.URL, new Set(allCourses.map((course) => course.URL)))
  };

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
      const diff = diffCourseImport(incoming, existing);

      const counters = {
        lessonsCreated: 0,
        lessonsUpdated: 0,
        lessonsDeleted: 0,
        elementsCreated: 0,
        elementsUpdated: 0,
        elementsDeleted: 0
      };

      // Translated course slugs must not lead to another course; clashing ones
      // fall back to the source URL.
      for (const translation of Object.values(incoming.translations ?? {})) {
        if (translation.URL && (await courseSlugTaken(translation.URL, existing ? { courseId: existing.id } : undefined))) {
          translation.URL = null;
        }
      }

      await prisma.$transaction(async (tx) => {
        const courseData = {
          name: incoming.name,
          description: incoming.description,
          introDescription: incoming.introDescription,
          introDescriptionSuffix: incoming.introDescriptionSuffix,
          active: incoming.active,
          position: incoming.position,
          displayType: incoming.displayType,
          // Exporte ohne Sprache stammen aus der Zeit vor der Ausgangssprache.
          lang: incoming.lang ?? 'de'
        };

        const course = existing
          ? await tx.course.update({ where: { id: existing.id }, data: courseData })
          : await tx.course.create({ data: { ...courseData, URL: incoming.URL } });

        // Files without translations (format version 1) leave them untouched.
        if (incoming.translations !== undefined) {
          await tx.courseTranslation.deleteMany({ where: { courseId: course.id } });
          await tx.courseTranslation.createMany({
            data: translationRows(incoming.translations, courseData.lang).map((row) => ({ ...row, courseId: course.id }))
          });
        }

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

          if (incomingLesson.translations !== undefined) {
            await tx.lessonTranslation.deleteMany({ where: { lessonId } });
            await tx.lessonTranslation.createMany({
              data: translationRows(incomingLesson.translations, courseData.lang).map((row) => ({ ...row, lessonId }))
            });
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
            let elementId: number;
            if (existingElement) {
              await tx.element.update({ where: { id: existingElement.id }, data: elementData });
              elementId = existingElement.id;
              counters.elementsUpdated += 1;
            } else {
              elementId = (await tx.element.create({ data: { ...elementData, lessonId } })).id;
              counters.elementsCreated += 1;
            }

            const elementTranslations = incomingElements[index].translations;
            if (elementTranslations !== undefined) {
              await tx.elementTranslation.deleteMany({ where: { elementId } });
              await tx.elementTranslation.createMany({
                data: translationRows(elementTranslations, courseData.lang).map((row) => ({ ...row, elementId }))
              });
            }
          }

          const surplusElementIds = existingElements
            .slice(incomingElements.length)
            .map((element) => element.id);
          if (deleteMissing && surplusElementIds.length > 0) {
            await tx.element.deleteMany({ where: { id: { in: surplusElementIds } } });
            counters.elementsDeleted += surplusElementIds.length;
          }

          // Quiz questions carry no user data: replace wholesale (with their
          // translations, which cascade on delete).
          await tx.quizQuestion.deleteMany({ where: { lessonId } });
          for (const question of incomingLesson.quizQuestions) {
            await tx.quizQuestion.create({
              data: {
                question: question.question,
                type: question.type,
                options: question.options,
                correct: question.correct,
                position: question.position,
                lessonId,
                translations: { create: translationRows(question.translations, courseData.lang) }
              }
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

      if (await courseSlugTaken(newCourseUrl)) {
        throw error(400, `Die Kurs-URL "${newCourseUrl}" ist bereits vergeben.`);
      }

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
          lang: incoming.lang ?? 'de',
          // Copied translations start hidden as well. Their course slug still
          // belongs to the original course, so the copy uses its source URL.
          translations: {
            create: translationRows(incoming.translations, incoming.lang ?? 'de').map((row) => ({
              ...row,
              active: 0,
              URL: null
            }))
          },
          lessons: {
            create: incoming.lessons.map((lesson) => ({
              lessonName: lesson.lessonName,
              lessonEmoji: lesson.lessonEmoji,
              URL: lesson.URL,
              active: lesson.active,
              starsNeeded: lesson.starsNeeded,
              position: lesson.position,
              translations: { create: translationRows(lesson.translations, incoming.lang ?? 'de') },
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
                  position: element.position,
                  translations: { create: translationRows(element.translations, incoming.lang ?? 'de') }
                }))
              },
              quizQuestions: {
                create: lesson.quizQuestions.map((question) => ({
                  question: question.question,
                  type: question.type,
                  options: question.options,
                  correct: question.correct,
                  position: question.position,
                  translations: { create: translationRows(question.translations, incoming.lang ?? 'de') }
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
