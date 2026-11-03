<script lang="ts">
  import CourseListPage from '$lib/course/CourseListPage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<CourseListPage {data} />
