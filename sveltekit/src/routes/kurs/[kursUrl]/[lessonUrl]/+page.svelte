<script lang="ts">
  import LessonPage from '$lib/course/LessonPage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<LessonPage {data} />
