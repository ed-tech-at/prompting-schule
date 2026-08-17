import { error, type RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { EDITOR_AUDIT_ACTIONS, requireEditor, writeEditorAuditLog } from '$lib/server/editor';
import { serializeCourse } from '$lib/server/editor/exportImport';

export const GET: RequestHandler = async ({ params, cookies }) => {
  const actor = await requireEditor(cookies);

  const courseId = Number.parseInt(params.courseId ?? '', 10);
  if (!Number.isInteger(courseId)) {
    throw error(400, 'Ungültige Kurs-ID.');
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: {
        orderBy: { position: 'asc' },
        include: {
          elements: { orderBy: { position: 'asc' } },
          quizQuestions: { orderBy: { position: 'asc' } }
        }
      }
    }
  });

  if (!course) {
    throw error(404, 'Kurs wurde nicht gefunden.');
  }

  const payload = serializeCourse(course);

  await writeEditorAuditLog({
    actorUserId: actor.id,
    action: EDITOR_AUDIT_ACTIONS.COURSE_EXPORTED,
    outcome: 'SUCCESS',
    metadata: { entityType: 'course', courseId: course.id, courseUrl: course.URL }
  });

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="kurs-${course.URL}.json"`
    }
  });
};
