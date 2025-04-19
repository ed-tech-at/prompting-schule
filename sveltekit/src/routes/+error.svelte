<script lang="ts">
  import Header from "$lib/Header.svelte";

  import { page } from '$app/state';
  console.log("page:", page);

</script>
<Header  />
<main>
<div class="container">
  <div class="badge-shadow">
    <h1>{page.status} {page.error.message}</h1>
    <!-- <h1>{pageError?.status ?? 500}</h1> -->
    <!-- <div class="subtitle">Uups – das ging schief.</div> -->

    <!-- <div class="details">

      {page.error?.}
    </div> -->

    <a href="/" class="link">Zurück zur Startseite</a>
  </div>
</div>
</main>