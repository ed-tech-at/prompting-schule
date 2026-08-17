import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/db';
import {
  EDITOR_AUDIT_ACTIONS,
  editorAuditFailure,
  editorErrorMessage,
  readString,
  requireEditor,
  writeEditorAuditLog
} from '$lib/server/editor';
import { requireInfoBlock } from '$lib/server/infoblocks';
import {
  isInfoBlockLang,
  isInfoBlockPlacement,
  isInfoBlockVariant,
  matchesEmailPattern,
  MAX_EMAIL_PATTERN_LENGTH,
  MAX_INFOBLOCK_CONTENT_LENGTH,
  parseDateTimeInput,
  validateEmailPattern,
  type InfoBlockPlacement
} from '$lib/server/infoblocks/filter';

function readInfoBlockId(params: { infoBlockId?: string }): number {
  return Number.parseInt(params.infoBlockId ?? '', 10);
}

export const load: PageServerLoad = async ({ cookies, params }) => {
  const actor = await requireEditor(cookies);
  const infoBlock = await requireInfoBlock(readInfoBlockId(params));

  return { actor, infoBlock };
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

// Reads an optional <input type="datetime-local"> value. Empty means "open end".
function readOptionalDate(formData: FormData, key: string, label: string): Date | null {
  const raw = readString(formData, key);
  if (!raw) return null;

  const parsed = parseDateTimeInput(raw);
  if (!parsed) throw error(400, `${label} ist kein gültiger Zeitpunkt.`);
  return parsed;
}

export const actions: Actions = {
  updateInfoBlock: async ({ cookies, params, request }) => {
    const actor = await requireEditor(cookies);
    const infoBlockId = readInfoBlockId(params);
    const formData = await request.formData();

    const title = readString(formData, 'title');
    const content = readString(formData, 'content');
    const variant = readString(formData, 'variant');
    const lang = readString(formData, 'lang');
    const emailPattern = readString(formData, 'emailPattern');

    try {
      const infoBlock = await requireInfoBlock(infoBlockId);

      if (!title) throw error(400, 'Der Titel darf nicht leer sein.');
      if (!content) throw error(400, 'Der Inhalt darf nicht leer sein.');
      if (content.length > MAX_INFOBLOCK_CONTENT_LENGTH) {
        throw error(400, `Der Inhalt darf höchstens ${MAX_INFOBLOCK_CONTENT_LENGTH} Zeichen lang sein.`);
      }
      if (!isInfoBlockVariant(variant)) throw error(400, 'Ungültige Variante.');
      if (!isInfoBlockLang(lang)) throw error(400, 'Ungültige Sprache.');

      const placements = readPlacements(formData);

      const patternError = validateEmailPattern(emailPattern);
      if (patternError) throw error(400, patternError);

      const validFrom = readOptionalDate(formData, 'validFrom', '"Sichtbar ab"');
      const validUntil = readOptionalDate(formData, 'validUntil', '"Sichtbar bis"');
      if (validFrom && validUntil && validUntil.getTime() <= validFrom.getTime()) {
        throw error(400, '"Sichtbar bis" muss nach "Sichtbar ab" liegen.');
      }

      await prisma.infoBlock.update({
        where: { id: infoBlock.id },
        data: {
          title,
          content,
          variant,
          lang,
          placements,
          // Store null, not '', so "no pattern" stays unambiguous.
          emailPattern: emailPattern || null,
          validFrom,
          validUntil
        }
      });

      await writeEditorAuditLog({
        actorUserId: actor.id,
        action: EDITOR_AUDIT_ACTIONS.INFOBLOCK_UPDATED,
        outcome: 'SUCCESS',
        metadata: {
          entityType: 'infoBlock',
          infoBlockId: infoBlock.id,
          title,
          // AdminAuditLog metadata only takes scalars, hence the join.
          placements: placements.join(','),
          lang,
          hasEmailPattern: Boolean(emailPattern)
        }
      });

      return {
        success: true,
        action: 'updateInfoBlock',
        message: 'Der Infoblock wurde gespeichert.'
      };
    } catch (caught) {
      await editorAuditFailure(actor.id, EDITOR_AUDIT_ACTIONS.INFOBLOCK_UPDATED, caught, {
        entityType: 'infoBlock',
        infoBlockId
      });
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'updateInfoBlock',
        message: editorErrorMessage(caught)
      });
    }
  },

  // Runs server-side so the validator is not duplicated in the browser and no
  // unvetted regex is executed in the editor's tab. Echoes the inputs back so
  // testing does not clear the tester's own fields.
  testEmailPattern: async ({ cookies, request }) => {
    await requireEditor(cookies);
    const formData = await request.formData();
    const pattern = readString(formData, 'pattern');
    const testEmail = readString(formData, 'testEmail');

    try {
      if (pattern.length > MAX_EMAIL_PATTERN_LENGTH) {
        throw error(400, `Das E-Mail-Muster darf höchstens ${MAX_EMAIL_PATTERN_LENGTH} Zeichen lang sein.`);
      }
      if (!testEmail) throw error(400, 'Geben Sie eine Test-E-Mail-Adresse ein.');

      const patternError = validateEmailPattern(pattern);
      if (patternError) throw error(400, patternError);

      const matches = matchesEmailPattern(pattern || null, testEmail);

      return {
        success: true,
        action: 'testEmailPattern',
        pattern,
        testEmail,
        matches,
        message: matches
          ? `Treffer: "${testEmail}" würde den Infoblock sehen.`
          : `Kein Treffer: "${testEmail}" würde den Infoblock nicht sehen.`
      };
    } catch (caught) {
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'testEmailPattern',
        pattern,
        testEmail,
        message: editorErrorMessage(caught)
      });
    }
  }
};
