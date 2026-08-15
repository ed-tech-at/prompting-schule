<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  type CourseRow = PageData['courses'][number];

  let deleteDialog: HTMLDialogElement;
  let courseToDelete: CourseRow | null = null;

  function openDeleteDialog(course: CourseRow) {
    courseToDelete = course;
    deleteDialog.showModal();
  }

  function closeDeleteDialog() {
    deleteDialog.close();
    courseToDelete = null;
  }

  function editorHref(courseId: number): string {
    return `${resolve('/admin/editor')}/${courseId}`;
  }

  function exportHref(courseId: number): string {
    return `${resolve('/admin/editor')}/export/${courseId}`;
  }
</script>

<Header
  navItems={[
    { name: 'Admin', href: '/admin' },
    { name: 'Seiten-Editor', href: '/admin/editor' }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>Seiten-Editor</h1>
      <p>Kurse anlegen, bearbeiten, sortieren sowie als JSON exportieren und importieren.</p>
    </div>
    <a class="button-link" href={resolve('/admin/editor/import')}>Kurs importieren</a>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
    </div>
  {/if}

  <form method="POST" action="?/createCourse" class="create-form" aria-label="Neuen Kurs anlegen">
    <label>
      Kursname
      <input type="text" name="name" required maxlength="200" placeholder="Neuer Kurs" />
    </label>
    <label>
      URL (Slug)
      <input
        type="text"
        name="URL"
        required
        maxlength="100"
        pattern="[a-z0-9\-]+"
        placeholder="neuer-kurs"
      />
    </label>
    <label>
      Sprache
      <select name="lang">
        <option value="de">Deutsch</option>
        <option value="en">Englisch</option>
      </select>
    </label>
    <div class="create-actions">
      <button type="submit">Kurs anlegen</button>
    </div>
  </form>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>Reihenfolge</th>
          <th>Name</th>
          <th>URL</th>
          <th>Sprache</th>
          <th>Status</th>
          <th>Lektionen</th>
          <th><span class="visually-hidden">Aktionen</span></th>
        </tr>
      </thead>
      <tbody>
        {#each data.courses as course, index}
          <tr>
            <td>
              <div class="order-buttons">
                <form method="POST" action="?/moveCourse">
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button type="submit" class="compact" disabled={index === 0} aria-label="Nach oben">↑</button>
                </form>
                <form method="POST" action="?/moveCourse">
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    class="compact"
                    disabled={index === data.courses.length - 1}
                    aria-label="Nach unten">↓</button
                  >
                </form>
              </div>
            </td>
            <td><strong>{course.name}</strong></td>
            <td><code>{course.URL}</code></td>
            <td>{course.lang ?? '–'}</td>
            <td>
              <span class:inactive={!course.active} class="status">
                {course.active ? 'Aktiv' : 'Inaktiv'}
              </span>
            </td>
            <td>{course._count.lessons}</td>
            <td>
              <div class="actions">
                <a class="button-link compact" href={editorHref(course.id)}>Öffnen</a>
                <a class="button-link compact secondary" href={exportHref(course.id)} download>
                  Export
                </a>
                <form method="POST" action="?/setCourseActive">
                  <input type="hidden" name="courseId" value={course.id} />
                  <input type="hidden" name="active" value={course.active ? '0' : '1'} />
                  <button type="submit" class="compact secondary">
                    {course.active ? 'Deaktivieren' : 'Aktivieren'}
                  </button>
                </form>
                <button type="button" class="compact danger" on:click={() => openDeleteDialog(course)}>
                  Löschen
                </button>
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="empty">Noch keine Kurse vorhanden.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</main>

<dialog bind:this={deleteDialog} on:close={() => (courseToDelete = null)}>
  {#if courseToDelete}
    <div class="dialog-heading">
      <div>
        <h2>Kurs löschen</h2>
        <p>{courseToDelete.name}</p>
      </div>
      <button type="button" class="close" aria-label="Dialog schließen" on:click={closeDeleteDialog}>×</button>
    </div>

    <p class="danger-text">
      Der Kurs wird mit allen Lektionen, Elementen und Quizfragen gelöscht. Auch
      <strong>alle Nutzerfortschritte, Quiz-Versuche und Badges</strong> zu diesem Kurs werden
      unwiderruflich entfernt.
    </p>

    <form method="POST" action="?/deleteCourse" class="dialog-form">
      <input type="hidden" name="courseId" value={courseToDelete.id} />
      <label>
        Zur Bestätigung die Kurs-URL <code>{courseToDelete.URL}</code> eingeben
        <input type="text" name="confirmation" required autocomplete="off" />
      </label>
      <button type="submit" class="danger">Kurs unwiderruflich löschen</button>
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
  select,
  button,
  .button-link {
    min-height: 2.7rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-primary-dark);
    border-radius: 0.4rem;
    font: inherit;
  }

  input,
  select {
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

  button.danger {
    border-color: var(--color-red-dark);
    background: var(--color-red-dark);
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 600;
  }

  .create-form {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1fr auto;
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
    min-width: 20rem;
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
      grid-template-columns: 1fr 1fr;
    }

    .page-heading {
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .create-form {
      grid-template-columns: 1fr;
    }
  }
</style>
