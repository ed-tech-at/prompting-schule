<script lang="ts">
  import Header from '$lib/Header.svelte';
    import { onMount } from 'svelte';
    import { on } from 'svelte/events';

  let email = "";
  let mailto = "";

  onMount(() => {
    setTimeout(() => {
      const user = "idee";
      const domain = "prompting.schule";
      email = `${user}@${domain}`;
      mailto = `mailto:${email}`;
    }, 200);
  });

</script>
  
<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Idee', href: '/mehr/idee' }]} />
<main>
  <h1>Ihre Prompting-Idee für die prompting.schule</h1>

  <h2>Sie möchten Ihr Fachgebiet auf der prompting.schule weiterentwickeln?</h2>
  <p>Teilen Sie Ihre Ideen mit uns!</p>
  <p>Wir freuen uns über Ihre Anregungen, Wünsche und Ideen.</p>

  <h2>Treten Sie mit uns in Kontakt</h2>

  {#if email}
    <p>Kontaktieren Sie uns unter: <a href={mailto}>{email}</a></p>
  {/if}

</main>