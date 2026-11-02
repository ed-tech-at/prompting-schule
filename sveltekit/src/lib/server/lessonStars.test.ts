import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
  prisma: { userProgress: { groupBy: mocks.groupBy } }
}));

import { hasEnoughStars } from './lessonStars';

describe('hasEnoughStars', () => {
  it('needs no query when the lesson needs no stars', async () => {
    await expect(hasEnoughStars('u', { id: 1, starsNeeded: 0 })).resolves.toBe(true);
    expect(mocks.groupBy).not.toHaveBeenCalled();
  });

  it('counts distinct starred elements of the lesson', async () => {
    mocks.groupBy.mockResolvedValue([{ elementId: 1 }]);
    await expect(hasEnoughStars('u', { id: 7, starsNeeded: 2 })).resolves.toBe(false);

    mocks.groupBy.mockResolvedValue([{ elementId: 1 }, { elementId: 2 }]);
    await expect(hasEnoughStars('u', { id: 7, starsNeeded: 2 })).resolves.toBe(true);

    expect(mocks.groupBy).toHaveBeenCalledWith({
      by: ['elementId'],
      where: { userId: 'u', lessonId: 7, stars: { not: 0 } }
    });
  });
});
