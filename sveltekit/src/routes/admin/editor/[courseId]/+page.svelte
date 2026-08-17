<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  type LessonRow = PageData['lessons'][number];

  let deleteDialog: HTMLDialogElement;
  let lessonToDelete: LessonRow | null = null;

  function openDeleteDialog(lesson: LessonRow) {
    lessonToDelete = lesson;
    deleteDialog.showModal();
  }

  function closeDeleteDialog() {
    deleteDialog.close();
    lessonToDelete = null;
  }

  function lessonHref(lessonId: number): string {
    return `${resolve('/admin/editor')}/${data.course.id}/${lessonId}`;
  }
</script>

<Header
  navItems={[
    { name: 'Admin', href: '/admin' },
    { name: 'Seiten-Editor', href: '/admin/editor' },
    { name: data.course.name, href: `/admin/editor/${data.course.id}` }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>{data.course.name}</h1>
      <p>
        Kurs bearbeiten und Lektionen verwalten.
        <a href={`${resolve('/admin/editor')}/export/${data.course.id}`} download>Als JSON exportieren</a>
      </p>
    </div>
    <span class:inactive={!data.course.active} class="status">
      {data.course.active ? 'Aktiv' : 'Inaktiv'}
    </span>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
    </div>
  {/if}

  <section class="panel" aria-labelledby="course-form-title">
    <h2 id="course-form-title">Kursdaten</h2>
    <form method="POST" action="?/updateCourse" class="course-form">
      <div class="field-row">
        <label>
          Kursname
          <input type="text" name="name" value={data.course.name} required maxlength="200" />
        </label>
        <label>
          URL (Slug)
          <input
            type="text"
            name="URL"
            value={data.course.URL}
            required
            maxlength="100"
            pattern="[a-z0-9\-]+"
          />
        </label>
        <label>
          Sprache
          <select name="lang" value={data.course.lang ?? 'de'}>
            <option value="de">Deutsch</option>
            <option value="en">Englisch</option>
          </select>
        </label>
        <label>
          Darstellungstyp
          <input
            type="text"
            name="displayType"
            value={data.course.displayType ?? ''}
            maxlength="100"
            placeholder="z. B. aufgabe"
          />
        </label>
      </div>
      <label>
        Beschreibung (HTML, Kursübersicht)
        <textarea name="description" rows="4">{data.course.description ?? ''}</textarea>
      </label>
      <label>
        Einleitung (HTML, Kursseite)
        <textarea name="introDescription" rows="6">{data.course.introDescription ?? ''}</textarea>
      </label>
      <label>
        Einleitung – Abschluss (HTML, unter den Lektionen)
        <textarea name="introDescriptionSuffix" rows="4">{data.course.introDescriptionSuffix ?? ''}</textarea>
      </label>
      <div>
        <button type="submit">Kurs speichern</button>
      </div>
    </form>
  </section>

  <section class="panel" aria-labelledby="lessons-title">
    <h2 id="lessons-title">Lektionen</h2>

    <form method="POST" action="?/createLesson" class="create-form" aria-label="Neue Lektion anlegen">
      <label>
        Name
        <input type="text" name="lessonName" required maxlength="200" placeholder="Neue Lektion" />
      </label>
      <label>
        Emoji
        <input type="text" name="lessonEmoji" maxlength="20" placeholder="🧭" />
      </label>
      <label>
        URL (Slug)
        <input
          type="text"
          name="URL"
          required
          maxlength="100"
          pattern="[a-z0-9\-]+"
          placeholder="neue-lektion"
        />
      </label>
      <div class="create-actions">
        <button type="submit">Lektion anlegen</button>
      </div>
    </form>

    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Reihenfolge</th>
            <th>Name</th>
            <th>URL</th>
            <th>Sterne nötig</th>
            <th>Status</th>
            <th>Elemente</th>
            <th>Quizfragen</th>
            <th><span class="visually-hidden">Aktionen</span></th>
          </tr>
        </thead>
        <tbody>
          {#each data.lessons as lesson, index}
            <tr>
              <td>
                <div class="order-buttons">
                  <form method="POST" action="?/moveLesson">
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <input type="hidden" name="direction" value="up" />
                    <button type="submit" class="compact" disabled={index === 0} aria-label="Nach oben">↑</button>
                  </form>
                  <form method="POST" action="?/moveLesson">
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <input type="hidden" name="direction" value="down" />
                    <button
                      type="submit"
                      class="compact"
                      disabled={index === data.lessons.length - 1}
                      aria-label="Nach unten">↓</button
                    >
                  </form>
                </div>
              </td>
              <td><strong>{lesson.lessonEmoji ?? ''} {lesson.lessonName}</strong></td>
              <td><code>{lesson.URL}</code></td>
              <td>{lesson.starsNeeded}</td>
              <td>
                <span class:inactive={!lesson.active} class="status">
                  {lesson.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </td>
              <td>{lesson._count.elements}</td>
              <td>{lesson._count.quizQuestions}</td>
              <td>
                <div class="actions">
                  <a class="button-link compact" href={lessonHref(lesson.id)}>Öffnen</a>
                  <form method="POST" action="?/setLessonActive">
                    <input type="hidden" name="lessonId" value={lesson.id} />
                    <input type="hidden" name="active" value={lesson.active ? '0' : '1'} />
                    <button type="submit" class="compact secondary">
                      {lesson.active ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                  </form>
                  <button type="button" class="compact danger" on:click={() => openDeleteDialog(lesson)}>
                    Löschen
                  </button>
                </div>
              </td>
            </tr>
          {:else}
            <tr>
              <td colspan="8" class="empty">Noch keine Lektionen vorhanden.</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>
</main>

<dialog bind:this={deleteDialog} on:close={() => (lessonToDelete = null)}>
  {#if lessonToDelete}
    <div class="dialog-heading">
      <div>
        <h2>Lektion löschen</h2>
        <p>{lessonToDelete.lessonName}</p>
      </div>
      <button type="button" class="close" aria-label="Dialog schließen" on:click={closeDeleteDialog}>×</button>
    </div>

    <p class="danger-text">
      Die Lektion wird mit allen Elementen und Quizfragen gelöscht. Auch
      <strong>alle Nutzerfortschritte, Quiz-Versuche und Badges</strong> zu dieser Lektion werden
      unwiderruflich entfernt.
    </p>

    <form method="POST" action="?/deleteLesson" class="dialog-form">
      <input type="hidden" name="lessonId" value={lessonToDelete.id} />
      <label>
        Zur Bestätigung die Lektions-URL <code>{lessonToDelete.URL}</code> eingeben
        <input type="text" name="confirmation" required autocomplete="off" />
      </label>
      <button type="submit" class="danger">Lektion unwiderruflich löschen</button>
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
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9rem;
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

  .course-form {
    display: grid;
    gap: 1rem;
  }

  .field-row {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr 1fr;
    gap: 1rem;
  }

  .create-form {
    display: grid;
    grid-template-columns: 2fr 0.7fr 1.5fr auto;
    align-items: end;
    gap: 1rem;
    margin-bottom: 1rem;
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
    .field-row,
    .create-form {
      grid-template-columns: 1fr 1fr;
    }

    .page-heading {
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .field-row,
    .create-form {
      grid-template-columns: 1fr;
    }
  }
</style>
