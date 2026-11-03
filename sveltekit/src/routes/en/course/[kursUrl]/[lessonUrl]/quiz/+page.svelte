<script lang="ts">
  import QuizPage from '$lib/course/QuizPage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<QuizPage {data} />
