<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
</script>
  
<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Forschungs-Team', href: '/mehr/forschung' }]} />
<main>
  <h1>Forschungs-Team</h1>
  

  <a href={resolve("/")}>Zur Startseite</a>
</main>
