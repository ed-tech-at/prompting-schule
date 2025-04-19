import { json } from '@sveltejs/kit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET({ params }) {
	const { course, lesson } = params;

	// Hole Kurs- und Lektionsdaten anhand der URL
	const lessonDb = await prisma.lesson.findFirst({
		where: {
			URL: lesson,
			course: {
				URL: course
			}
		},
		include: {
			course: true
		}
	});

	if (!lessonDb) {
		return json({ error: 'Lesson not found' }, { status: 404 });
	}

	// Open Badge BadgeClass JSON
	const badgeClass = {
		'@context': 'https://w3id.org/openbadges/v2',
		type: 'BadgeClass',
		id: `https://prompting.schule/badge/class/${course}/${lesson}/json.json`,
		name: `Digital Badge: ${lessonDb.lessonName}`,
		description: `Für den erfolgreichen Abschluss der Lektion "${lessonDb.lessonName}" im Kurs "${lessonDb.course.name}".`,
		image: `https://prompting.schule/badges/badge.png`,
		criteria: {
			narrative: 'Selbstüberprüfung bestanden, Prompts abgesendet und Tokens generiert.'
		},
		issuer: `https://prompting.schule/badge/issuer/json.json`
	};

	return new Response(JSON.stringify(badgeClass), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
