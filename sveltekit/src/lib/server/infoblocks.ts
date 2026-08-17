import { error } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import {
  selectVisibleInfoBlocks,
  type InfoBlockPlacement,
  type InfoBlockView
} from '$lib/server/infoblocks/filter';

// Only the columns the visibility check needs — the email pattern never leaves
// this module, selectVisibleInfoBlocks strips it before the data reaches a page.
const INFOBLOCK_VISIBILITY_SELECT = {
  id: true,
  content: true,
  variant: true,
  lang: true,
  placements: true,
  emailPattern: true,
  validFrom: true,
  validUntil: true,
  active: true
} as const;

// Blocks to render on one page, already filtered by placement, language, time
// window and email pattern, in display order.
export async function loadInfoBlocks(input: {
  placement: InfoBlockPlacement;
  lang: 'de' | 'en';
  email?: string | null;
  now?: Date;
}): Promise<InfoBlockView[]> {
  // The where clause is only an optimisation; selectVisibleInfoBlocks re-checks
  // active and placement so the pure logic stays the single source of truth.
  const blocks = await prisma.infoBlock.findMany({
    where: { active: { gt: 0 }, placements: { has: input.placement } },
    orderBy: [{ position: 'asc' }, { id: 'asc' }],
    select: INFOBLOCK_VISIBILITY_SELECT
  });

  return selectVisibleInfoBlocks(blocks, {
    placement: input.placement,
    lang: input.lang,
    email: input.email ?? null,
    now: input.now ?? new Date()
  });
}

export async function requireInfoBlock(infoBlockId: number) {
  if (!Number.isInteger(infoBlockId)) {
    throw error(400, 'Ungültige Infoblock-ID.');
  }
  const infoBlock = await prisma.infoBlock.findUnique({ where: { id: infoBlockId } });
  if (!infoBlock) {
    throw error(404, 'Infoblock wurde nicht gefunden.');
  }
  return infoBlock;
}
