<script lang="ts">
  import BadgePage from '$lib/course/BadgePage.svelte';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<BadgePage {data} />
