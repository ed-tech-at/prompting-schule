import { env } from '$env/dynamic/public';


export async function GET() {
	const issuer = {
		'@context': 'https://w3id.org/openbadges/v2',
		type: 'Issuer',
		id: env.PUBLIC_APP_URL + '/badge/issuer/json.json',
		name: 'prompting.schule & TU Graz',
		url: env.PUBLIC_APP_URL,
		// email: 'info@prompting.schule'
	};

	return new Response(JSON.stringify(issuer), {
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*'
		}
	});
}
