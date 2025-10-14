import { json } from '@sveltejs/kit';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { env } from '$env/dynamic/private';


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
		id: env.APP_URL + `/badge/class/${course}/${lesson}/json.json`,
		name: `Digital Badge: ${lessonDb.lessonName}`,
		description: `Für den erfolgreichen Abschluss der Lektion "${lessonDb.lessonName}" im Kurs "${lessonDb.course.name}".`,
		image: env.APP_URL + `/badge/class/${course}/${lesson}/image.png`,
		criteria: {
			narrative: 'Selbstüberprüfung bestanden, Prompts abgesendet und Tokens generiert.'
		},
		issuer: env.APP_URL + `/badge/issuer/json.json`
	};

	return new Response(JSON.stringify(badgeClass), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
