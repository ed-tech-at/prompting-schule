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
  writeEditorAuditLog
} from '$lib/server/editor';
import { requireInfoBlock } from '$lib/server/infoblocks';
import { isInfoBlockPlacement, type InfoBlockPlacement } from '$lib/server/infoblocks/filter';

export const load: PageServerLoad = async ({ cookies }) => {
  const actor = await requireEditor(cookies);

  const infoBlocks = await prisma.infoBlock.findMany({
    orderBy: [{ position: 'asc' }, { id: 'asc' }]
  });

  return { actor, infoBlocks };
};

function readPlacements(formData: FormData): InfoBlockPlacement[] {
  const values = formData
    .getAll('placements')
    .filter((value): value is string => typeof value === 'string');

  const placements = [...new Set(values)];
  if (placements.length === 0) {
    throw error(400, 'Wählen Sie mindestens eine Platzierung.');
  }
  for (const placement of placements) {
    if (!isInfoBlockPlacement(placement)) {
      throw error(400, `Unbekannte Platzierung: ${placement}`);
    }
  }

  return placements as InfoBlockPlacement[];
}

export const actions: Actions = {
  createInfoBlock: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const title = readString(formData, 'title');

    try {
      if (!title) throw error(400, 'Der Titel darf nicht leer sein.');
      const placements = readPlacements(formData);

      const maxPosition = await prisma.infoBlock.aggregate({ _max: { position: true } });
      const infoBlock = await prisma.infoBlock.create({
        data: {
          title,
          content: '',
          placements,
          active: 0,
          position: (maxPosition._max.position ?? 0) + 1
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.INFOBLOCK_CREATED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'infoBlock', infoBlockId: infoBlock.id, title }
      });

      return {
        success: true,
        action: 'createInfoBlock',
        message: `Der Infoblock "${title}" wurde angelegt. Jetzt Inhalt und Filter hinterlegen.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.INFOBLOCK_CREATED, caught, {
        entityType: 'infoBlock',
        title
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'createInfoBlock',
        message: editorErrorMessage(caught)
      });
    }
  },

  moveInfoBlock: async ({ cookies, request }) => {
    await requireEditor(cookies);
    const formData = await request.formData();
    const infoBlockId = readInt(formData, 'infoBlockId');
    const direction = readString(formData, 'direction');

    try {
      await requireInfoBlock(infoBlockId);
      if (direction !== 'up' && direction !== 'down') {
        throw error(400, 'Ungültige Verschieberichtung.');
      }

      const infoBlocks = await prisma.infoBlock.findMany({
        orderBy: [{ position: 'asc' }, { id: 'asc' }],
        select: { id: true }
      });

      const updates = reorderSwap(infoBlocks, infoBlockId, direction);
      if (updates) {
        await prisma.$transaction(
          updates.map(({ id, position }) =>
            prisma.infoBlock.update({ where: { id }, data: { position } })
          )
        );
      }

      return {
        success: true,
        action: 'moveInfoBlock',
        message: 'Die Reihenfolge wurde aktualisiert.'
      };
    } catch (caught) {
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'moveInfoBlock',
        message: editorErrorMessage(caught)
      });
    }
  },

  setInfoBlockActive: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const infoBlockId = readInt(formData, 'infoBlockId');
    const active = readString(formData, 'active') === '1' ? 1 : 0;

    try {
      const infoBlock = await requireInfoBlock(infoBlockId);
      if (active === 1 && !infoBlock.content.trim()) {
        throw error(400, 'Ein Infoblock ohne Inhalt kann nicht aktiviert werden.');
      }

      await prisma.infoBlock.update({ where: { id: infoBlock.id }, data: { active } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.INFOBLOCK_UPDATED,
        outcome: 'SUCCESS',
        metadata: {
          entityType: 'infoBlock',
          infoBlockId: infoBlock.id,
          title: infoBlock.title,
          active
        }
      });

      return {
        success: true,
        action: 'setInfoBlockActive',
        message: active ? 'Der Infoblock ist jetzt sichtbar.' : 'Der Infoblock ist jetzt inaktiv.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.INFOBLOCK_UPDATED, caught, {
        entityType: 'infoBlock',
        infoBlockId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'setInfoBlockActive',
        message: editorErrorMessage(caught)
      });
    }
  },

  deleteInfoBlock: async ({ cookies, request }) => {
    const actor = await requireEditor(cookies);
    const formData = await request.formData();
    const infoBlockId = readInt(formData, 'infoBlockId');

    try {
      const infoBlock = await requireInfoBlock(infoBlockId);
      await prisma.infoBlock.delete({ where: { id: infoBlock.id } });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.INFOBLOCK_DELETED,
        outcome: 'SUCCESS',
        metadata: { entityType: 'infoBlock', infoBlockId: infoBlock.id, title: infoBlock.title }
      });

      return {
        success: true,
        action: 'deleteInfoBlock',
        message: `Der Infoblock "${infoBlock.title}" wurde gelöscht.`
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.INFOBLOCK_DELETED, caught, {
        entityType: 'infoBlock',
        infoBlockId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteInfoBlock',
        message: editorErrorMessage(caught)
      });
    }
  }
};
