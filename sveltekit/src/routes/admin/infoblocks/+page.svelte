<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import {
    INFOBLOCK_LANG_LABELS,
    INFOBLOCK_PLACEMENTS,
    INFOBLOCK_PLACEMENT_LABELS,
    isInfoBlockLang,
    isInfoBlockPlacement
  } from '$lib/infoblocks';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  type InfoBlockRow = PageData['infoBlocks'][number];

  let deleteDialog: HTMLDialogElement;
  let blockToDelete: InfoBlockRow | null = null;

  function openDeleteDialog(infoBlock: InfoBlockRow) {
    blockToDelete = infoBlock;
    deleteDialog.showModal();
  }

  function closeDeleteDialog() {
    deleteDialog.close();
    blockToDelete = null;
  }

  function detailHref(infoBlockId: number): string {
    return `${resolve('/admin/infoblocks')}/${infoBlockId}`;
  }

  function placementLabels(placements: string[]): string {
    if (placements.length === 0) return '–';
    return placements
      .map((placement) =>
        isInfoBlockPlacement(placement) ? INFOBLOCK_PLACEMENT_LABELS[placement] : placement
      )
      .join(', ');
  }

  function langLabel(lang: string): string {
    return isInfoBlockLang(lang) ? INFOBLOCK_LANG_LABELS[lang] : lang;
  }

  const dateFormat = new Intl.DateTimeFormat('de-AT', { dateStyle: 'short', timeStyle: 'short' });

  function periodLabel(validFrom: Date | null, validUntil: Date | null): string {
    if (!validFrom && !validUntil) return 'unbegrenzt';
    if (validFrom && !validUntil) return `ab ${dateFormat.format(new Date(validFrom))}`;
    if (!validFrom && validUntil) return `bis ${dateFormat.format(new Date(validUntil))}`;
    return `${dateFormat.format(new Date(validFrom!))} – ${dateFormat.format(new Date(validUntil!))}`;
  }
</script>

<Header
  navItems={[
    { name: 'Admin', href: '/admin' },
    { name: 'Infoblöcke', href: '/admin/infoblocks' }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>Infoblöcke</h1>
      <p>
        Hinweise für Startseite und Kursübersicht. Blöcke lassen sich zeitlich begrenzen und über
        ein E-Mail-Muster auf eine Zielgruppe einschränken.
      </p>
    </div>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
    </div>
  {/if}

  <form
    method="POST"
    action="?/createInfoBlock"
    class="create-form"
    aria-label="Neuen Infoblock anlegen"
  >
    <label>
      Titel (nur intern)
      <input type="text" name="title" required maxlength="200" placeholder="Hinweis TU Graz" />
    </label>
    <fieldset>
      <legend>Platzierung</legend>
      {#each INFOBLOCK_PLACEMENTS as placement, index}
        <label class="checkbox">
          <input type="checkbox" name="placements" value={placement} checked={index === 0} />
          {INFOBLOCK_PLACEMENT_LABELS[placement]}
        </label>
      {/each}
    </fieldset>
    <div class="create-actions">
      <button type="submit">Infoblock anlegen</button>
    </div>
  </form>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Reihenfolge</th>
          <th>Titel</th>
          <th>Platzierung</th>
          <th>Sprache</th>
          <th>Zielgruppe</th>
          <th>Zeitraum</th>
          <th>Status</th>
          <th><span class="visually-hidden">Aktionen</span></th>
        </tr>
      </thead>
      <tbody>
        {#each data.infoBlocks as infoBlock, index}
          <tr>
            <td>
              <div class="order-buttons">
                <form method="POST" action="?/moveInfoBlock">
                  <input type="hidden" name="infoBlockId" value={infoBlock.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" class="compact" disabled={index === 0} aria-label="Nach oben"
                    >↑</button
                  >
                </form>
                <form method="POST" action="?/moveInfoBlock">
                  <input type="hidden" name="infoBlockId" value={infoBlock.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    class="compact"
                    disabled={index === data.infoBlocks.length - 1}
                    aria-label="Nach unten">↓</button
                  >
                </form>
              </div>
            </td>
            <td><strong>{infoBlock.title}</strong></td>
            <td>{placementLabels(infoBlock.placements)}</td>
            <td>{langLabel(infoBlock.lang)}</td>
            <td>
              {#if infoBlock.emailPattern}
                <code>{infoBlock.emailPattern}</code>
              {:else}
                alle
              {/if}
            </td>
            <td>{periodLabel(infoBlock.validFrom, infoBlock.validUntil)}</td>
            <td>
              <span class:inactive={!infoBlock.active} class="status">
                {infoBlock.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </td>
            <td>
              <div class="actions">
                <a class="button-link compact" href={detailHref(infoBlock.id)}>Öffnen</a>
                <form method="POST" action="?/setInfoBlockActive">
                  <input type="hidden" name="infoBlockId" value={infoBlock.id} />
                  <input type="hidden" name="active" value={infoBlock.active ? '0' : '1'} />
                  <button type="submit" class="compact secondary">
                    {infoBlock.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                </form>
                <button
                  type="button"
                  class="compact danger"
                  on:click={() => openDeleteDialog(infoBlock)}
                >
                  Löschen
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="8" class="empty">Noch keine Infoblöcke vorhanden.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</main>

<dialog bind:this={deleteDialog} on:close={() => (blockToDelete = null)}>
  {#if blockToDelete}
    <div class="dialog-heading">
      <div>
        <h2>Infoblock löschen</h2>
        <p>{blockToDelete.title}</p>
      </div>
      <button type="button" class="close" aria-label="Dialog schließen" on:click={closeDeleteDialog}
        >×</button
      >
    </div>

    <p class="danger-text">
      Der Infoblock wird endgültig entfernt. Nutzerdaten sind davon nicht betroffen.
    </p>

    <form method="POST" action="?/deleteInfoBlock" class="dialog-form">
      <input type="hidden" name="infoBlockId" value={blockToDelete.id} />
      <button type="submit" class="danger">Infoblock löschen</button>
      <button type="button" class="secondary" on:click={closeDeleteDialog}>Abbrechen</button>
    </form>
  {/if}
</dialog>

<style>
  .page-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  input,
  button,
  .button-link {
    min-height: 2.7rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-primary-dark);
    border-radius: 0.4rem;
    font: inherit;
  }

  input[type='text'] {
    width: 100%;
    background: white;
  }

  button,
  .button-link {
    display: inline-block;
    background: var(--color-primary-dark);
    color: white;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    text-align: center;
  }

  button:hover,
  .button-link:hover {
    background: var(--color-primary-darkest);
    color: white;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  button.secondary {
    background: white;
    color: var(--color-primary-darkest);
  }

  button.danger {
    border-color: var(--color-red-dark);
    background: var(--color-red-dark);
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 600;
  }

  fieldset {
    display: grid;
    gap: 0.35rem;
    padding: 0;
    border: 0;
    font-weight: 600;
  }

  legend {
    padding: 0;
    font-weight: 600;
  }

  label.checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 400;
  }

  label.checkbox input {
    min-height: 0;
    width: auto;
    padding: 0;
    border: 0;
  }

  .create-form {
    display: grid;
    grid-template-columns: 2fr 1.5fr auto;
    align-items: end;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background: white;
    border: 1px solid var(--color-primary-lightest);
    border-radius: 0.75rem;
  }

  .table-wrapper {
    overflow-x: auto;
    background: white;
    border: 1px solid #c5d7d9;
    border-radius: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.8rem;
    border-bottom: 1px solid #dce7e8;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: #eff8f9;
    color: var(--color-primary-darkest);
  }

  tr:last-child td {
    border-bottom: 0;
  }

  .status {
    display: inline-block;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.85rem;
    white-space: nowrap;
    background: var(--color-green-lightest);
    color: var(--color-green-darkest);
  }

  .status.inactive {
    background: var(--color-red-lightest);
    color: var(--color-red-darkest);
  }

  .order-buttons {
    display: flex;
    gap: 0.25rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.35rem;
    min-width: 16rem;
  }

  button.compact,
  .button-link.compact {
    min-height: 2rem;
    padding: 0.3rem 0.55rem;
    font-size: 0.85rem;
  }

  .empty {
    padding: 2rem;
    text-align: center;
  }

  .message {
    padding: 1rem;
    margin: 1rem 0;
    border-left: 5px solid var(--color-red-dark);
    background: #fff;
  }

  .message.success {
    border-left-color: var(--color-green-dark);
  }

  code {
    padding: 0.15rem 0.4rem;
    background: #edf4f5;
    border-radius: 0.3rem;
    word-break: break-all;
  }

  dialog {
    width: min(36rem, calc(100vw - 2rem));
    padding: 1.5rem;
    border: 0;
    border-radius: 0.75rem;
    box-shadow: 0 1rem 3rem #0005;
  }

  dialog::backdrop {
    background: #002f34b8;
  }

  .dialog-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .dialog-heading h2 {
    margin-bottom: 0.25rem;
  }

  button.close {
    width: 2.5rem;
    min-height: 2.5rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #333;
    font-size: 2rem;
    line-height: 1;
  }

  .dialog-form {
    display: grid;
    gap: 0.9rem;
    margin-top: 1rem;
  }

  .danger-text {
    padding: 0.75rem;
    margin-top: 1rem;
    border-left: 4px solid var(--color-red-dark);
    background: var(--color-red-lightest);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 850px) {
    .create-form {
      grid-template-columns: 1fr;
    }

    .page-heading {
      flex-direction: column;
    }
  }
</style>
