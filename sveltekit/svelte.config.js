import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import 'dotenv/config';

const subfolder = process.env.SUBFOLDER?.trim();
const normalizedSubfolder = subfolder?.replace(/^\/+|\/+$/g, '');
const base = normalizedSubfolder ? `/${normalizedSubfolder}` : '';

// Erlaubte Origins für Formular-POSTs; ohne Angabe keine Origin-Prüfung ("*").
const trustedOrigins = process.env.TRUSTED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		csrf: { trustedOrigins: trustedOrigins?.length ? trustedOrigins : ['*'] },
		paths: { base }
	}
};

export default config;
