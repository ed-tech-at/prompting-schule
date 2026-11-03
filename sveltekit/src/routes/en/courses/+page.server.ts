import type { PageServerLoad } from './$types';
import { loadCourseList } from '$lib/server/coursePages';

export const load: PageServerLoad = (event) => loadCourseList(event, 'en');
