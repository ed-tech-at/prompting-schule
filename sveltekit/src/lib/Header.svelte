<script lang="ts">
  
  import type { JwtUserPayload } from './server/jwt';
  import { onMount } from 'svelte';
  
  import { asset, resolve } from '$app/paths';
  import { page } from '$app/state';

  function resolveNavItem(href: string) {
    // Navigation entries may contain URLs assembled from database-backed slugs.
    return resolve(href as '/');
  }
  
  export let navItems: { name: string; href: string }[] = [];
  export let user: JwtUserPayload | null = null;

  export let lang: 'en' | 'de' = 'de';

  // Target page per language for the flags, e.g. the same course in the other
  // language. Without an entry the flag leads to that language's start page.
  export let langLinks: Partial<Record<'de' | 'en', string>> = {};

  const LANG_START: Record<'de' | 'en', string> = { de: '/', en: '/en' };
  const LANG_HOSTS: Record<'de' | 'en', string> = { de: 'prompting.schule', en: 'prompting.school' };

  function langHref(target: 'de' | 'en') {
    const path = langLinks[target] ?? LANG_START[target];
    // In production each language has its own domain (served from the root,
    // like the former fixed flag links); elsewhere stay on the current host.
    if (Object.values(LANG_HOSTS).includes(page.url.hostname)) {
      return `https://${LANG_HOSTS[target]}${path}`;
    }
    return resolveNavItem(path);
  }

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
    <a href={lang === 'en' ? resolve('/en') : resolve('/')}>
      <h3><img src={asset("/logo-prompting.schule-bg.png")} alt="{siteName} Logo" /> {siteName}</h3>
    </a>
  </div>

  {#if navItems.length > 0}

  <nav>
    {#each navItems as item, i}
      <a href={resolveNavItem(item.href)}>{item.name}</a>
      {#if i < navItems.length - 1}
        <span class="seperator"> / </span>
      {/if}
    {/each}
  </nav>
  {/if}

  <div class="login">
    {#if lang == 'de'}
      {#if user?.email}
        {#if user.isAdmin >= 5}
          <a href={resolve('/admin')}>Admin</a>
          <span aria-hidden="true"> · </span>
        {/if}
        <a href={resolve('/profil')}>Profil {user?.email}</a>
        {:else}
          <a href={resolve("/login")}>🔑 Anmelden</a>
        {/if}
    {:else}
        {#if user?.email}
        <a href={resolve('/en/profile')}>Profile {user?.email}</a>
        {:else}
          <a href={resolve("/en/login")}>🔑 Login</a>
        {/if}
    {/if}
    
  
  </div>
  <div class="logo-tugraz">
    <div class="langSelect" role="group" aria-label={lang === 'en' ? 'Language' : 'Sprache'}>
      <a href={langHref('de')} hreflang="de" lang="de" class:active={lang === 'de'}><img src={asset("/fonts/noto-emoji/emoji_u1f1e6_1f1f9.svg")} alt="Deutsch"></a>
      <a href={langHref('en')} hreflang="en" lang="en" class:active={lang === 'en'}><img src={asset("/fonts/noto-emoji/emoji_u1f1ec_1f1e7.svg")} alt="English"></a>
    </div>

    <img src={asset("/logo-tugraz-white.svg")} alt="TU Graz Logo"></div>
  <div class='flex-full'></div>
</header>
