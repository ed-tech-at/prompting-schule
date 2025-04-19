// /badge/[hash]/[email]/json.json/+server.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
		id: `https://prompting.schule/badge/${hash}/${email}/json.json`,
		recipient: {
			type: 'email',
			hashed: false,
			identity: email
		},
		badge: `https://prompting.schule/badge/class/${courseUrl}/${lessonUrl}/json.json`,
		issuedOn: badge.createdAt.toISOString(),
		verification: {
			type: 'HostedBadge',
      url: `https://prompting.schule/badge/${hash}/${email}/json.json`
		},
		image: `https://prompting.schule/images/badges/${courseUrl}/${lessonUrl}/image.png`,
		evidence: `https://prompting.schule/badge/${hash}/${email}`,
	};

	return new Response(JSON.stringify(assertion), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
