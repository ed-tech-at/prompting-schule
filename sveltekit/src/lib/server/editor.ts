import { isHttpError, type Cookies } from '@sveltejs/kit';
import {
  requireAdminManager,
  writeAdminAuditLog,
  type AdminActor
} from '$lib/server/admin';

export const EDITOR_LEVEL = 5;

// Every element type ElementRender.svelte knows how to display.
export const ELEMENT_TYPES = [
  'text',
  'text-negativeMarginTop',
  'note',
  'aiSide',
  'ai1',
  'ai1only',
  'ai2',
  'ai2only',
  'ai12',
  'directDevUser',
  'directDevUserUser',
  'labor',
  'star'
] as const;

// The quiz renderer and grader only know the short codes:
// 's' = Single Choice, 'm' = Multiple Choice.
export const QUIZ_QUESTION_TYPES = ['s', 'm'] as const;

export const SLUG_PATTERN = /^[a-z0-9-]+$/;

export const EDITOR_AUDIT_ACTIONS = {
  COURSE_CREATED: 'COURSE_CREATED',
  COURSE_UPDATED: 'COURSE_UPDATED',
  COURSE_DELETED: 'COURSE_DELETED',
  COURSE_EXPORTED: 'COURSE_EXPORTED',
  COURSE_IMPORT_UPDATED: 'COURSE_IMPORT_UPDATED',
  COURSE_IMPORT_COPIED: 'COURSE_IMPORT_COPIED',
  LESSON_CREATED: 'LESSON_CREATED',
  LESSON_UPDATED: 'LESSON_UPDATED',
  LESSON_DELETED: 'LESSON_DELETED',
  ELEMENT_CREATED: 'ELEMENT_CREATED',
  ELEMENT_UPDATED: 'ELEMENT_UPDATED',
  ELEMENT_DELETED: 'ELEMENT_DELETED',
  QUIZ_QUESTION_CREATED: 'QUIZ_QUESTION_CREATED',
  QUIZ_QUESTION_UPDATED: 'QUIZ_QUESTION_UPDATED',
  QUIZ_QUESTION_DELETED: 'QUIZ_QUESTION_DELETED'
} as const;

export function requireEditor(cookies: Cookies): Promise<AdminActor> {
  return requireAdminManager(cookies, EDITOR_LEVEL);
}

// Content actions have no target user. AdminAuditLog.targetUserId is a required
// string column, so store '' and describe the entity in metadata instead.
export async function writeEditorAuditLog(input: {
  actorUserId: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await writeAdminAuditLog({ ...input, targetUserId: '' });
}

export async function editorAuditFailure(
  actorUserId: string,
  action: string,
  caught: unknown,
  metadata?: Record<string, string | number | boolean | null>
) {
  try {
    await writeEditorAuditLog({
      actorUserId,
      action,
      outcome: 'FAILED',
      metadata: {
        ...metadata,
        reason: isHttpError(caught) ? `HTTP_${caught.status}` : 'ACTION_FAILED'
      }
    });
  } catch (auditError) {
    console.error('Failed to write editor audit log:', auditError);
  }
}

export function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function readInt(formData: FormData, key: string): number {
  return Number.parseInt(readString(formData, key), 10);
}

export function editorErrorMessage(caught: unknown): string {
  if (isHttpError(caught)) {
    return caught.body.message;
  }

  if (caught instanceof Error && caught.message) {
    return caught.message;
  }

  return 'Die Aktion konnte nicht ausgeführt werden.';
}

// Pure reorder helper: `items` must already be in display order. Returns the
// full 1-based renumbering with the target swapped against its neighbour, or
// null when the move is impossible (unknown id or already at the edge).
export function reorderSwap(
  items: { id: number }[],
  targetId: number,
  direction: 'up' | 'down'
): { id: number; position: number }[] | null {
  const index = items.findIndex((item) => item.id === targetId);
  if (index === -1) return null;

  const neighborIndex = direction === 'up' ? index - 1 : index + 1;
  if (neighborIndex < 0 || neighborIndex >= items.length) return null;

  const order = items.map((item) => item.id);
  [order[index], order[neighborIndex]] = [order[neighborIndex], order[index]];

  return order.map((id, position) => ({ id, position: position + 1 }));
}
