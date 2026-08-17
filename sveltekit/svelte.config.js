import adapter from "@sveltejs/adapter-node";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import 'dotenv/config';

const subfolder = process.env.SUBFOLDER?.trim();
const normalizedSubfolder = subfolder?.replace(/^\/+|\/+$/g, '');
const base = normalizedSubfolder ? `/${normalizedSubfolder}` : '';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		csrf: { checkOrigin: false },
		paths: { base }
	}
};

export default config;
