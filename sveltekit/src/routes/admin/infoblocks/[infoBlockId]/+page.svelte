<script lang="ts">
  import Header from '$lib/Header.svelte';
  import InfoBlocks from '$lib/InfoBlocks.svelte';
  import { resolve } from '$app/paths';
  import {
    INFOBLOCK_LANGS,
    INFOBLOCK_LANG_LABELS,
    INFOBLOCK_PLACEMENTS,
    INFOBLOCK_PLACEMENT_LABELS,
    INFOBLOCK_VARIANTS,
    INFOBLOCK_VARIANT_LABELS,
    MAX_EMAIL_PATTERN_LENGTH,
    MAX_INFOBLOCK_CONTENT_LENGTH,
    normalizeVariant
  } from '$lib/infoblocks';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  // The datetime-local inputs need "YYYY-MM-DDTHH:mm" in server local time.
  // Mirrors formatDateTimeInput() from $lib/server/infoblocks/filter.
  function toDateTimeInput(value: Date | string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const pad = (part: number) => String(part).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  $: infoBlock = data.infoBlock;
  $: testerPattern =
    form?.action === 'testEmailPattern' ? (form.pattern ?? '') : (infoBlock.emailPattern ?? '');
  $: testerEmail = form?.action === 'testEmailPattern' ? (form.testEmail ?? '') : '';
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
      <h1>{infoBlock.title}</h1>
      <p>
        Infoblock bearbeiten.
        <span class:inactive={!infoBlock.active} class="status">
          {infoBlock.active ? 'Aktiv' : 'Inaktiv'}
        </span>
      </p>
    </div>
    <a class="button-link secondary" href={resolve('/admin/infoblocks')}>Zurück zur Übersicht</a>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
    </div>
  {/if}

  <form method="POST" action="?/updateInfoBlock" class="panel">
    <label>
      Titel (nur intern, erscheint nicht auf der Seite)
      <input type="text" name="title" required maxlength="200" value={infoBlock.title} />
    </label>

    <label>
      Inhalt (HTML)
      <textarea
        name="content"
        rows="10"
        required
        maxlength={MAX_INFOBLOCK_CONTENT_LENGTH}
        placeholder="&lt;h3&gt;Angepasster Kurs&lt;/h3&gt;&lt;p&gt;Im Intranet finden Sie …&lt;/p&gt;"
        >{infoBlock.content}</textarea
      >
      <small class="hint">
        Wird als HTML ausgegeben – wie Kurs- und Elementtexte. Links, Überschriften und Listen sind
        möglich; Inhalte aus fremden Quellen bitte nicht ungeprüft einfügen.
      </small>
    </label>

    <div class="row">
      <label>
        Variante
        <select name="variant">
          {#each INFOBLOCK_VARIANTS as variant}
            <option value={variant} selected={infoBlock.variant === variant}>
              {INFOBLOCK_VARIANT_LABELS[variant]}
            </option>
          {/each}
        </select>
      </label>

      <label>
        Sprache
        <select name="lang">
          {#each INFOBLOCK_LANGS as lang}
            <option value={lang} selected={infoBlock.lang === lang}>
              {INFOBLOCK_LANG_LABELS[lang]}
            </option>
          {/each}
        </select>
        <small class="hint">„Beide“ zeigt den Block auf deutschen und englischen Seiten.</small>
      </label>

      <fieldset>
        <legend>Platzierung</legend>
        {#each INFOBLOCK_PLACEMENTS as placement}
          <label class="checkbox">
            <input
              type="checkbox"
              name="placements"
              value={placement}
              checked={infoBlock.placements.includes(placement)}
            />
            {INFOBLOCK_PLACEMENT_LABELS[placement]}
          </label>
        {/each}
      </fieldset>
    </div>

    <label>
      E-Mail-Muster (Zielgruppe)
      <input
        type="text"
        name="emailPattern"
        maxlength={MAX_EMAIL_PATTERN_LENGTH}
        autocomplete="off"
        spellcheck="false"
        placeholder="@tugraz\.at$"
        value={infoBlock.emailPattern ?? ''}
      />
      <small class="hint">
        Regulärer Ausdruck, Groß-/Kleinschreibung wird ignoriert. <strong>Leer lassen</strong> =
        für alle sichtbar, auch für nicht angemeldete Besucher:innen. Beispiel für alle
        TU-Graz-Adressen: <code>@tugraz\.at$</code>
      </small>
    </label>

    <div class="row">
      <label>
        Sichtbar ab
        <input type="datetime-local" name="validFrom" value={toDateTimeInput(infoBlock.validFrom)} />
      </label>
      <label>
        Sichtbar bis
        <input
          type="datetime-local"
          name="validUntil"
          value={toDateTimeInput(infoBlock.validUntil)}
        />
      </label>
    </div>
    <small class="hint">
      Leer lassen für „ohne Ende“. Die Zeitangaben gelten in der Zeitzone des Servers
      (Europe/Vienna).
    </small>

    <div class="form-actions">
      <button type="submit">Speichern</button>
    </div>
  </form>

  <section class="panel">
    <h2>E-Mail-Muster testen</h2>
    <p class="hint">
      Prüft, ob eine Adresse zum Muster passt – ohne den Block zu speichern.
    </p>
    <form method="POST" action="?/testEmailPattern" class="tester">
      <label>
        Muster
        <input
          type="text"
          name="pattern"
          maxlength={MAX_EMAIL_PATTERN_LENGTH}
          autocomplete="off"
          spellcheck="false"
          value={testerPattern}
        />
      </label>
      <label>
        Test-Adresse
        <input
          type="text"
          name="testEmail"
          autocomplete="off"
          placeholder="max.muster@tugraz.at"
          value={testerEmail}
        />
      </label>
      <div class="form-actions">
        <button type="submit" class="secondary">Testen</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <h2>Vorschau</h2>
    <p class="hint">Zeigt den zuletzt gespeicherten Inhalt in der gewählten Variante.</p>
    {#if infoBlock.content.trim()}
      <InfoBlocks
        blocks={[
          {
            id: infoBlock.id,
            content: infoBlock.content,
            variant: normalizeVariant(infoBlock.variant)
          }
        ]}
      />
    {:else}
      <p class="empty">Noch kein Inhalt hinterlegt.</p>
    {/if}
  </section>
</main>

<style>
  .page-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  input,
  select,
  textarea,
  button,
  .button-link {
    min-height: 2.7rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-primary-dark);
    border-radius: 0.4rem;
    font: inherit;
  }

  input,
  select,
  textarea {
    width: 100%;
    background: white;
  }

  textarea {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
    resize: vertical;
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

  button.secondary,
  .button-link.secondary {
    background: white;
    color: var(--color-primary-darkest);
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 600;
  }

  fieldset {
    display: grid;
    align-content: start;
    gap: 0.35rem;
    padding: 0;
    border: 0;
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

  .panel {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    background: white;
    border: 1px solid var(--color-primary-lightest);
    border-radius: 0.75rem;
  }

  .panel h2 {
    margin: 0;
  }

  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 1rem;
  }

  .tester {
    display: grid;
    grid-template-columns: 2fr 2fr auto;
    align-items: end;
    gap: 1rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
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

  .message {
    padding: 1rem;
    margin: 1rem 0;
    border-left: 5px solid var(--color-red-dark);
    background: #fff;
  }

  .message.success {
    border-left-color: var(--color-green-dark);
  }

  .hint,
  small {
    color: #4c5e60;
    font-weight: 400;
  }

  .empty {
    padding: 1.5rem;
    text-align: center;
  }

  code {
    padding: 0.15rem 0.4rem;
    background: #edf4f5;
    border-radius: 0.3rem;
  }

  @media (max-width: 850px) {
    .page-heading {
      flex-direction: column;
    }

    .tester {
      grid-template-columns: 1fr;
    }
  }
</style>
