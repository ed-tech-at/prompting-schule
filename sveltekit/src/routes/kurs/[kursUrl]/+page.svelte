<script lang="ts">
  import CoursePage from '$lib/course/CoursePage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<CoursePage {data} />
