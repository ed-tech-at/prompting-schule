import type { PageServerLoad } from './$types';
import { loadLessonPage } from '$lib/server/coursePages';

export const load: PageServerLoad = (event) => loadLessonPage(event, 'en');
