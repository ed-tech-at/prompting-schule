<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import type { ActionData, PageData } from './$types';
  import type { CourseDiff } from '$lib/server/editor/exportImport';

  export let data: PageData;
  export let form: ActionData;

  type PreviewData = {
    courseName: string;
    courseUrl: string;
    lessonCount: number;
    diff: CourseDiff;
    suggested: { courseUrl: string; lessonUrls: Record<string, string> };
    rawJson: string;
  };

  $: preview =
    form?.step === 'preview' && form.success ? (form as unknown as PreviewData) : null;

  $: validationErrors =
    form && 'errors' in form && Array.isArray(form.errors) ? (form.errors as string[]) : null;

  function lessonStatusLabel(status: string): string {
    if (status === 'new') return 'Neu';
    if (status === 'changed') return 'Geändert';
    return 'Unverändert';
  }
</script>

<Header
  navItems={[
    { name: 'Admin', href: '/admin' },
    { name: 'Seiten-Editor', href: '/admin/editor' },
    { name: 'Import', href: '/admin/editor/import' }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>Kurs importieren</h1>
      <p>JSON-Export einer anderen Instanz hochladen, Vorschau prüfen und übernehmen.</p>
    </div>
    <a class="button-link secondary" href={resolve('/admin/editor')}>Zurück zum Editor</a>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
    </div>
  {/if}

  {#if validationErrors}
    <div class="message error">
      <strong>Validierungsfehler:</strong>
      <ul>
        {#each validationErrors as validationError}
          <li>{validationError}</li>
        {/each}
      </ul>
    </div>
  {/if}

  <section class="panel">
    <h2>1. Datei hochladen</h2>
    <form method="POST" action="?/preview" enctype="multipart/form-data" class="upload-form">
      <label>
        Kurs-Export (JSON, max. 2 MB)
        <input type="file" name="file" accept="application/json,.json" required />
      </label>
      <button type="submit">Vorschau erstellen</button>
    </form>
  </section>

  {#if preview}
    <section class="panel">
      <h2>2. Vorschau</h2>
      <p>
        Kurs <strong>{preview.courseName}</strong> (<code>{preview.courseUrl}</code>,
        {preview.lessonCount} Lektionen) —
        {#if preview.diff.courseStatus === 'new'}
          <span class="status">Neu: existiert auf dieser Instanz noch nicht.</span>
        {:else}
          <span class="status changed">Vorhanden: wird bei „Aktualisieren" überschrieben.</span>
        {/if}
      </p>

      {#if preview.diff.courseStatus === 'exists' && preview.diff.changedCourseFields.length > 0}
        <p>Geänderte Kursfelder: <code>{preview.diff.changedCourseFields.join(', ')}</code></p>
      {/if}

      {#if preview.diff.blocking.length > 0}
        <div class="danger-text">
          <strong>Blockierende Konflikte (Aktualisieren nicht möglich):</strong>
          <ul>
            {#each preview.diff.blocking as conflict}
              <li>{conflict}</li>
            {/each}
          </ul>
        </div>
      {/if}

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Lektion</th>
              <th>URL</th>
              <th>Status</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {#each preview.diff.lessons as lessonDiff}
              <tr>
                <td><strong>{lessonDiff.lessonName}</strong></td>
                <td><code>{lessonDiff.URL}</code></td>
                <td>
                  <span
                    class="status"
                    class:changed={lessonDiff.status === 'changed'}
                    class:conflict={lessonDiff.urlConflict}
                  >
                    {lessonDiff.urlConflict ? '⚠ Konflikt' : lessonStatusLabel(lessonDiff.status)}
                  </span>
                </td>
                <td class="details">
                  {#if lessonDiff.changedFields.length > 0}
                    <div>Felder: {lessonDiff.changedFields.join(', ')}</div>
                  {/if}
                  {#if lessonDiff.elements.some((element) => element.status === 'new')}
                    <div>
                      {lessonDiff.elements.filter((element) => element.status === 'new').length} Element(e) neu
                    </div>
                  {/if}
                  {#if lessonDiff.elements.some((element) => element.status === 'changed')}
                    <div>
                      {lessonDiff.elements.filter((element) => element.status === 'changed').length} Element(e) geändert
                    </div>
                  {/if}
                  {#if lessonDiff.elements.some((element) => element.typeChanged)}
                    <div class="warning-text">
                      ⚠ Typwechsel bei Element(en):
                      {lessonDiff.elements
                        .filter((element) => element.typeChanged)
                        .map((element) => `#${element.index + 1}`)
                        .join(', ')}
                    </div>
                  {/if}
                  {#if lessonDiff.elementIdsToDelete.length > 0}
                    <div class="warning-text">
                      {lessonDiff.elementIdsToDelete.length} bestehende(s) Element(e) nicht in der Datei
                      (Löschen nur mit Checkbox)
                    </div>
                  {/if}
                  {#if lessonDiff.quizReplaced}
                    <div>Quizfragen werden ersetzt</div>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if preview.diff.removedLessons.length > 0}
        <div class="warning-text removed-lessons">
          <strong>Lektionen in der Datenbank, die in der Datei fehlen:</strong>
          <ul>
            {#each preview.diff.removedLessons as removed}
              <li>{removed.lessonName} (<code>{removed.URL}</code>)</li>
            {/each}
          </ul>
          Diese werden nur gelöscht, wenn die Checkbox unten aktiviert ist.
        </div>
      {/if}
    </section>

    <section class="panel apply-panels">
      <div class="apply-panel">
        <h2>3a. Kurs aktualisieren</h2>
        <p class="hint">
          Bestehende Lektionen und Elemente werden aktualisiert (per URL bzw. Position gepaart) —
          Nutzerfortschritte bleiben erhalten.
        </p>
        <form method="POST" action="?/applyUpdate" class="apply-form">
          <textarea name="payload" hidden aria-hidden="true">{preview.rawJson}</textarea>
          <label class="checkbox">
            <input type="checkbox" name="deleteMissing" />
            Fehlende Lektionen/Elemente löschen (entfernt auch deren Nutzerfortschritte!)
          </label>
          <button type="submit" disabled={preview.diff.blocking.length > 0}>
            {preview.diff.courseStatus === 'new' ? 'Kurs neu anlegen' : 'Kurs aktualisieren'}
          </button>
          {#if preview.diff.blocking.length > 0}
            <p class="warning-text">Wegen blockierender Konflikte deaktiviert — nutzen Sie den Kopie-Import.</p>
          {/if}
        </form>
      </div>

      <div class="apply-panel">
        <h2>3b. Als Kopie importieren</h2>
        <p class="hint">
          Legt einen neuen, inaktiven Kurs mit neuen URLs an. Bestehende Inhalte bleiben unberührt.
        </p>
        <form method="POST" action="?/applyCopy" class="apply-form">
          <textarea name="payload" hidden aria-hidden="true">{preview.rawJson}</textarea>
          <label>
            Neue Kurs-URL
            <input
              type="text"
              name="newCourseUrl"
              value={preview.suggested.courseUrl}
              required
              pattern="[a-z0-9\-]+"
            />
          </label>
          <details>
            <summary>Vorgeschlagene Lektions-URLs</summary>
            <ul>
              {#each Object.entries(preview.suggested.lessonUrls) as [oldUrl, newUrl]}
                <li><code>{oldUrl}</code> → <code>{newUrl}</code></li>
              {/each}
            </ul>
          </details>
          <button type="submit" class="secondary">Als Kopie importieren</button>
        </form>
      </div>
    </section>
  {/if}
</main>

<style>
  .page-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .panel {
    padding: 1rem;
    margin-bottom: 1.5rem;
    background: white;
    border: 1px solid var(--color-primary-lightest);
    border-radius: 0.75rem;
  }

  .panel h2 {
    margin-top: 0;
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

  input {
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

  .upload-form {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 1rem;
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
    vertical-align: top;
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

  .status.changed {
    background: var(--color-secondary-lightest, #fff3d6);
    color: #684600;
  }

  .status.conflict {
    background: var(--color-red-lightest);
    color: var(--color-red-darkest);
  }

  .details {
    font-size: 0.9rem;
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

  .danger-text {
    padding: 0.75rem;
    margin: 1rem 0;
    border-left: 4px solid var(--color-red-dark);
    background: var(--color-red-lightest);
  }

  .warning-text {
    color: #704800;
  }

  .removed-lessons {
    padding: 0.75rem;
    margin-top: 1rem;
    border-left: 4px solid #c98a00;
    background: var(--color-secondary-lightest, #fff3d6);
  }

  .apply-panels {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  .apply-panel h2 {
    margin-top: 0;
  }

  .apply-form {
    display: grid;
    gap: 0.9rem;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 400;
  }

  .checkbox input {
    width: auto;
    min-height: auto;
  }

  .hint {
    color: #4c5e60;
  }

  code {
    padding: 0.15rem 0.4rem;
    background: #edf4f5;
    border-radius: 0.3rem;
  }

  @media (max-width: 850px) {
    .apply-panels {
      grid-template-columns: 1fr;
    }

    .upload-form {
      grid-template-columns: 1fr;
    }

    .page-heading {
      flex-direction: column;
    }
  }
</style>
