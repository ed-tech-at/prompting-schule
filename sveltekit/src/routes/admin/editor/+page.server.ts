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

export const load: PageServerLoad = async ({ cookies }) => {
  const actor = await requireEditor(cookies);

  const courses = await prisma.course.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    include: { _count: { select: { lessons: true } } }
  });

  return { actor, courses };
};

async function requireCourse(courseId: number) {
  if (!Number.isInteger(courseId)) {
    throw error(400, 'Ungültige Kurs-ID.');
  }
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) {
    throw error(404, 'Kurs wurde nicht gefunden.');
  }
  return course;
}

export const actions: Actions = {
  createCourse: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const name = readString(formData, 'name');
    const URL = readString(formData, 'URL');
    const lang = readString(formData, 'lang');

    try {
      if (!name) throw error(400, 'Der Kursname darf nicht leer sein.');
      if (!SLUG_PATTERN.test(URL)) {
        throw error(400, 'Die URL darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.');
      }
      if (!['de', 'en'].includes(lang)) throw error(400, 'Wählen Sie eine Sprache (de oder en).');

      const existing = await prisma.course.findUnique({ where: { URL } });
      if (existing) throw error(400, `Die Kurs-URL "${URL}" ist bereits vergeben.`);

      const maxPosition = await prisma.course.aggregate({ _max: { position: true } });
      const course = await prisma.course.create({
        data: {
          name,
          URL,
          lang,
          active: 0,
          position: (maxPosition._max.position ?? 0) + 1
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.COURSE_CREATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'course', courseId: course.id, courseUrl: course.URL }
      });

      return {
        success: true,
        action: 'createCourse',
        message: `Der Kurs "${name}" wurde angelegt.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.COURSE_CREATED, caught, {
        entityType: 'course',
        courseUrl: URL
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'createCourse',
        message: editorErrorMessage(caught)
      });
    }
  },

  moveCourse: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const courseId = readInt(formData, 'courseId');
    const direction = readString(formData, 'direction');

    try {
      await requireCourse(courseId);
      if (direction !== 'up' && direction !== 'down') {
        throw error(400, 'Ungültige Verschieberichtung.');
      }

      const courses = await prisma.course.findMany({
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true }
      });

      const updates = reorderSwap(courses, courseId, direction);
      if (updates) {
        await prisma.$transaction(
          updates.map(({ id, position }) =>
            prisma.course.update({ where: { id }, data: { position } })
          )
        );
      }

      return { success: true, action: 'moveCourse', message: 'Die Reihenfolge wurde aktualisiert.' };
    } catch (caught) {
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'moveCourse',
        message: editorErrorMessage(caught)
      });
    }
  },

  setCourseActive: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const courseId = readInt(formData, 'courseId');
    const active = readString(formData, 'active') === '1' ? 1 : 0;

    try {
      const course = await requireCourse(courseId);
      await prisma.course.update({ where: { id: course.id }, data: { active } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.COURSE_UPDATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'course', courseId: course.id, courseUrl: course.URL, active }
      });

      return {
        success: true,
        action: 'setCourseActive',
        message: active ? 'Der Kurs ist jetzt aktiv.' : 'Der Kurs ist jetzt inaktiv.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.COURSE_UPDATED, caught, {
        entityType: 'course',
        courseId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'setCourseActive',
        message: editorErrorMessage(caught)
      });
    }
  },

  deleteCourse: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const courseId = readInt(formData, 'courseId');
    const confirmation = readString(formData, 'confirmation');

    try {
      const course = await requireCourse(courseId);
      if (confirmation !== course.URL) {
        throw error(400, 'Die eingegebene Kurs-URL stimmt nicht überein.');
      }

      await prisma.course.delete({ where: { id: course.id } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.COURSE_DELETED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'course', courseId: course.id, courseUrl: course.URL }
      });

      return {
        success: true,
        action: 'deleteCourse',
        message: `Der Kurs "${course.name}" wurde mit allen Lektionen, Elementen und Nutzerdaten gelöscht.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.COURSE_DELETED, caught, {
        entityType: 'course',
        courseId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteCourse',
        message: editorErrorMessage(caught)
      });
    }
  }
};
