import type { PageServerLoad } from './$types';
import { loadCoursePage } from '$lib/server/coursePages';

export const load: PageServerLoad = (event) => loadCoursePage(event, 'de');
