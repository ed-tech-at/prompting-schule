// /badge/[hash]/[email]/json.json/+server.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { env } from '$env/dynamic/private';

export async function GET({ params }) {
	const { hash, email } = params;

	// Badge anhand des Hashes suchen
	const badge = await prisma.badge.findFirst({
		where: {
			hash: hash,
			user: {
				email: email
			}
		},
		include: {
			user: true,
			lesson: {
				include: {
					course: true
				}
			}
		}
	});

	if (!badge || !badge.lesson || !badge.lesson.course) {
		return new Response(JSON.stringify({ error: 'Badge not found' }), {
			status: 404,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*'
			}
		});
	}

	// Dynamische Kurs- und Lektion-URLs
	const courseUrl = badge.lesson.course.URL;
	const lessonUrl = badge.lesson.URL;

	// Assertion aufbauen
	const assertion = {
		'@context': 'https://w3id.org/openbadges/v2',
		type: 'Assertion',
		id: env.APP_URL + `/badge/${hash}/${email}/json.json`,
		recipient: {
			type: 'email',
			hashed: false,
			identity: email
		},
		badge: env.APP_URL + `/badge/class/${courseUrl}/${lessonUrl}/json.json`,
		issuedOn: badge.createdAt.toISOString(),
		verification: {
			type: 'HostedBadge',
      url: env.APP_URL + `/badge/${hash}/${email}/json.json`
		},
		image: env.APP_URL + `/badge/class/${courseUrl}/${lessonUrl}/image.png`,
		evidence: env.APP_URL + `/badge/${hash}/${email}`,
	};

	return new Response(JSON.stringify(assertion), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
