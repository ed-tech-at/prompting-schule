<script lang="ts">
  
  import type { JwtUserPayload } from './server/jwt';
  // import { browser } from '$app/environment';
  
  export let navItems: { name: string; href: string }[] = [];
  export let user: JwtUserPayload | null;

  // let userEmail = "";
  // if (browser) {
  //   userEmail = user?.email;
  // }
</script>

<header>
  <div class="logo">
    <a href='/'>
      <h3><img src="/logo-prompting.schule-bg.png" alt="Logo" /> prompting.schule</h3>
    </a>
  </div>

  <nav>
    {#each navItems as item, i}
      <a href={item.href}>{item.name}</a>
      {#if i < navItems.length - 1}
        <span> / </span>
      {/if}
    {/each}
  </nav>

  <div class="login">
  {#if user?.email}
  <a href='/profil'>{user?.email}</a>
  {:else}
    <a href="/login">🔑 Anmelden</a>
  {/if}
  </div>
</header>
