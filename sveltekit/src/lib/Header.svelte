<script lang="ts">
  
  import type { JwtUserPayload } from './server/jwt';
  import { onMount } from 'svelte';
  
  
  export let navItems: { name: string; href: string }[] = [];
  export let user: JwtUserPayload | null;


  let showEnableContrastButton = false;

  onMount(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');

    const updateBodyClass = () => {
      if (mediaQuery.matches) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    };

    updateBodyClass();
  });

  // let userEmail = "";
  // if (browser) {
  //   userEmail = user?.email;
  // }
</script>
<svelte:head>
  {#if navItems.length > 0}
    
    <title>{navItems[navItems.length - 1].name} | prompting.schule</title>
  {:else}
    <title>prompting.schule</title>
  {/if}
</svelte:head>
<header>
  <div class="logo">
    <a href='/'>
      <h3><img src="/logo-prompting.schule-bg.png" alt="prompting.schule Logo" /> prompting.schule</h3>
    </a>
  </div>

  {#if navItems.length > 0}

  <nav>
    {#each navItems as item, i}
      <a href={item.href}>{item.name}</a>
      {#if i < navItems.length - 1}
        <span class="seperator"> / </span>
      {/if}
    {/each}
  </nav>
  {/if}

  <div class="login">
  {#if user?.email}
  <a href='/profil'>Profil {user?.email}</a>
  {:else}
    <a href="/login">🔑 Anmelden</a>
  {/if}
  </div>
  <div class="logo-tugraz"><img src="/logo-tugraz-white.svg" alt="TU Graz Logo"></div>
  <div class='flex-full'></div>
</header>
