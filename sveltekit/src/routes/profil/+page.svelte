<script lang="ts">
      
  import Header from '$lib/Header.svelte';  
  
  import type { JwtUserPayload } from '$lib/server/jwt';
  
  export let data: { user: JwtUserPayload };

  let showPwChangeForm = false;
    
</script>
  
<Header navItems={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Profil', href: '/profil' }]} user={data.user} />
  <main>
    <h1>Profil</h1>
    <p>E-Mail: {data.user.email}</p>

    <a href="/dashboard" style="display: inline-block; color: var(--color-black); background: var(--color-secondary); padding: 1em 2em; border-radius: 15px; margin-bottom: 3em;">Zum Kurse - Dashboard</a>
    <br>

    <div style="margin-bottom: 2em;">

    <a href="/logout" class="button large complementary" data-sveltekit-reload rel="external">Logout</a>

    </div>

    <div style="margin-bottom: 2em;">
<!-- 
    <button class="large" on:click={() => showPwChangeForm = !showPwChangeForm}>
      {showPwChangeForm ? 'Passwort ändern ausblenden' : 'Passwort ändern anzeigen'}
    </button>

    {#if showPwChangeForm}
      <form action="/api/user" method="POST">
        <label for="old">Altes Passwort:</label>
        <input type="password" name="old">
        <label for="password">Neues Passwort:</label>
        <input type="password" id="password" name="new">
        <button type="submit">Passwort ändern</button>
      </form>
    {/if} -->

  </div>
    

  
  <style>
    h1 {
      padding-bottom: 1em;
    }
    /* .courses {
      
      display: flex;
      /* grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); */
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      margin: 1rem;
  
  
    }
    
    @media (min-width: 1200px) {
      .lessons.displayType-flex {
        flex-wrap: nowrap;
      }
    }
    @media (max-width: 1200px) {
      .lessons {
        flex-direction: column;
        align-content: space-around;
      }
    } */
  </style>
  
  </main>