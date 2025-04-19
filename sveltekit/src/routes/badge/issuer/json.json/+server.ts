// /badge/issuer/json.json/+server.ts
export async function GET() {
	const issuer = {
		'@context': 'https://w3id.org/openbadges/v2',
		type: 'Issuer',
		id: 'https://prompting.schule/badge/issuer/json.json',
		name: 'prompting.schule & TU Graz',
		url: 'https://prompting.schule',
		// email: 'info@prompting.schule'
	};

	return new Response(JSON.stringify(issuer), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
