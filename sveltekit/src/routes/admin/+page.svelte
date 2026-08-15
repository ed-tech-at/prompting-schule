<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import type { PageData } from './$types';

  export let data: PageData;
</script>

<Header
  navItems={[
    { name: 'Startseite', href: '/' },
    { name: 'Admin', href: '/admin' }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>Admin</h1>
      <p>Verwaltungsbereiche für Inhalte und Benutzerkonten.</p>
    </div>
    <span class="manager-level">Ihre Rollenstufe: {data.actor.isAdmin}</span>
  </div>

  <div class="admin-cards">
    <a class="admin-card" href={resolve('/admin/editor')}>
      <h2>Seiten-Editor</h2>
      <p>Kurse, Lektionen, Elemente und Quizfragen bearbeiten, testen sowie als JSON exportieren und importieren.</p>
    </a>

    {#if data.actor.isAdmin >= 6}
      <a class="admin-card" href={resolve('/admin/users')}>
        <h2>Benutzerverwaltung</h2>
        <p>Konten suchen, Rollen verwalten und sichere Passwortaktionen durchführen.</p>
      </a>
    {/if}
  </div>
</main>

<style>
  main {
    max-width: 960px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }

  .page-heading {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
  }

  .manager-level {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .admin-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
    margin-top: 1.5rem;
  }

  .admin-card {
    display: block;
    padding: 1.25rem;
    border: 1px solid rgba(128, 128, 128, 0.4);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    background: rgba(255, 255, 255, 0.05);
  }

  .admin-card:hover,
  .admin-card:focus-visible {
    border-color: currentColor;
  }

  .admin-card h2 {
    margin: 0 0 0.5rem;
    font-size: 1.15rem;
  }

  .admin-card p {
    margin: 0;
    font-size: 0.95rem;
    opacity: 0.85;
  }
</style>
