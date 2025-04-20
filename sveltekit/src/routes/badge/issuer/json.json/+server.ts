import { env } from '$env/dynamic/private';


export async function GET() {
	const issuer = {
		'@context': 'https://w3id.org/openbadges/v2',
		type: 'Issuer',
		id: env.APP_URL + '/badge/issuer/json.json',
		name: 'prompting.schule & TU Graz',
		url: env.APP_URL,
		// email: 'info@prompting.schule'
	};

	return new Response(JSON.stringify(issuer), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
