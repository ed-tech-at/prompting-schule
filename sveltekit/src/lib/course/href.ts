import { resolve } from '$app/paths';

// Course URLs are assembled from database-backed slugs (see coursePaths), so
// they cannot be checked against the typed route list. Same approach as the
// navigation entries in Header.svelte.
export function courseHref(path: string): string {
  return resolve(path as '/');
}
