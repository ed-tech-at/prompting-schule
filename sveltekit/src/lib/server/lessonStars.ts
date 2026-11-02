import { prisma } from '$lib/server/db';

// Anzahl der Elemente einer Lektion, für die der Nutzer einen Stern erhalten hat.
// Gleiche Zählung wie die Anzeige im Client (api/userProgress, getLessonStars).
export async function countLessonStars(userId: string, lessonId: number): Promise<number> {
  const starred = await prisma.userProgress.groupBy({
    by: ['elementId'],
    where: { userId, lessonId, stars: { not: 0 } }
  });

  return starred.length;
}

export async function hasEnoughStars(
  userId: string,
  lesson: { id: number; starsNeeded: number }
): Promise<boolean> {
  if (lesson.starsNeeded <= 0) return true;
  return (await countLessonStars(userId, lesson.id)) >= lesson.starsNeeded;
}
