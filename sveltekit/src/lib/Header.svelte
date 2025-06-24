<script lang="ts">
  
  import type { JwtUserPayload } from './server/jwt';
  import { onMount } from 'svelte';
  
  
  export let navItems: { name: string; href: string }[] = [];
  export let user: JwtUserPayload | null = null;

  export let lang: 'en' | 'de' = 'de';

  let siteName = 'prompting.schule';
  if (lang === 'en') {
    siteName = 'prompting.school';
  }

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
    <title>{navItems[navItems.length - 1].name} | {siteName}</title>
  {:else}
    <title>{siteName}</title>
  {/if}
</svelte:head>
<header>
  <div class="logo">
    <a href='/'>
      <h3><img src="/logo-prompting.schule-bg.png" alt="{siteName} Logo" /> {siteName}</h3>
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
    {#if lang == 'de'}
      {#if user?.email}
        <a href='/profil'>Profil {user?.email}</a>
        {:else}
          <a href="/login">🔑 Anmelden</a>
        {/if}
    {:else}
        {#if user?.email}
        <a href='/en/profile'>Profile {user?.email}</a>
        {:else}
          <a href="/en/login">🔑 Login</a>
        {/if}
    {/if}
    
  
  </div>
  <div class="logo-tugraz">
    {#if lang == 'en'}
    <div class="langSelect">
      <a href="https://prompting.schule/"><img src="/fonts/noto-emoji/emoji_u1f1e6_1f1f9.svg" alt="Austria Flag"></a>
      <a href="https://prompting.school/en/"><img src="/fonts/noto-emoji/emoji_u1f1ec_1f1e7.svg" alt="UK Flag"></a>
    </div>
    {/if}

    <img src="/logo-tugraz-white.svg" alt="TU Graz Logo"></div>
  <div class='flex-full'></div>
</header>
