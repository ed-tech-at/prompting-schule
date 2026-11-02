import type { PageServerLoad } from './$types';
import { loadQuizPage } from '$lib/server/coursePages';

export const load: PageServerLoad = (event) => loadQuizPage(event, 'en');
