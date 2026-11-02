import type { PageServerLoad } from './$types';
import { loadBadgePage } from '$lib/server/coursePages';

export const load: PageServerLoad = (event) => loadBadgePage(event, 'de');
