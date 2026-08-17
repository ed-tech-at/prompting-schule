<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import ElementRender from '../../../../kurs/[kursUrl]/[lessonUrl]/ElementRender.svelte';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  type ElementRow = PageData['elements'][number];

  let deleteElementDialog: HTMLDialogElement;
  let elementToDelete: ElementRow | null = null;

  let previews: Record<number, boolean> = {};

  function togglePreview(elementId: number) {
    previews = { ...previews, [elementId]: !previews[elementId] };
  }

  function openDeleteElementDialog(element: ElementRow) {
    elementToDelete = element;
    deleteElementDialog.showModal();
  }

  function closeDeleteElementDialog() {
    deleteElementDialog.close();
    elementToDelete = null;
  }

  const courseHref = `/admin/editor/${data.course.id}`;

  const quizTypeLabels: Record<string, string> = {
    s: 'Single Choice (s)',
    m: 'Multiple Choice (m)'
  };
  const lessonViewHref = resolve(`/kurs/${data.course.URL}/${data.lesson.URL}` as '/');
</script>

<Header
  navItems={[
    { name: 'Admin', href: '/admin' },
    { name: 'Seiten-Editor', href: '/admin/editor' },
    { name: data.course.name, href: courseHref },
    { name: data.lesson.lessonName, href: `${courseHref}/${data.lesson.id}` }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>{data.lesson.lessonEmoji ?? ''} {data.lesson.lessonName}</h1>
      <p>
        Elemente und Quizfragen dieser Lektion bearbeiten.
        <a href={lessonViewHref} target="_blank" rel="noopener">
          Lektion ansehen ↗
        </a>
      </p>
    </div>
    <span class:inactive={!data.lesson.active} class="status">
      {data.lesson.active ? 'Aktiv' : 'Inaktiv'}
    </span>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
    </div>
  {/if}

  <section class="panel">
    <h2>Lektionsdaten</h2>
    <form method="POST" action="?/updateLesson" class="lesson-form">
      <label>
        Name
        <input type="text" name="lessonName" value={data.lesson.lessonName} required maxlength="200" />
      </label>
      <label>
        Emoji
        <input type="text" name="lessonEmoji" value={data.lesson.lessonEmoji ?? ''} maxlength="20" />
      </label>
      <label>
        Sterne nötig
        <input type="number" name="starsNeeded" value={data.lesson.starsNeeded} min="0" required />
      </label>
      <div class="form-actions">
        <button type="submit">Lektion speichern</button>
      </div>
    </form>
  </section>

  <section class="panel">
    <h2>Elemente</h2>
    <p class="hint">
      Änderungen zuerst speichern, dann testen: Die Vorschau nutzt die gespeicherten Daten und
      KI-Testläufe legen Nutzerfortschritts-Einträge für Ihr eigenes Konto an.
    </p>

    {#each data.elements as element, index (element.id)}
      <details class="entity-card">
        <summary>
          <span class="entity-position">#{index + 1}</span>
          <span class="entity-type">{element.type}</span>
          <span class="entity-title">{element.title ?? ''}</span>
          <span class="entity-id">ID {element.id}</span>
        </summary>

        <div class="entity-toolbar">
          <form method="POST" action="?/moveElement">
            <input type="hidden" name="elementId" value={element.id} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" class="compact" disabled={index === 0} aria-label="Nach oben">↑</button>
          </form>
          <form method="POST" action="?/moveElement">
            <input type="hidden" name="elementId" value={element.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              class="compact"
              disabled={index === data.elements.length - 1}
              aria-label="Nach unten">↓</button
            >
          </form>
          <button type="button" class="compact secondary" on:click={() => togglePreview(element.id)}>
            {previews[element.id] ? 'Vorschau ausblenden' : 'Vorschau anzeigen'}
          </button>
          <button type="button" class="compact danger" on:click={() => openDeleteElementDialog(element)}>
            Löschen
          </button>
        </div>

        <form method="POST" action="?/updateElement" class="entity-form">
          <input type="hidden" name="elementId" value={element.id} />
          <div class="field-row">
            <label>
              Typ
              <select name="type" value={element.type}>
                {#each data.elementTypes as elementType}
                  <option value={elementType}>{elementType}</option>
                {/each}
              </select>
            </label>
            <label>
              Titel (intern)
              <input type="text" name="title" value={element.title ?? ''} maxlength="200" />
            </label>
          </div>
          <label>
            Beschreibung (HTML)
            <textarea name="description" rows="5">{element.description ?? ''}</textarea>
          </label>
          <div class="field-row">
            <label>
              Aufgabe A (taskA)
              <textarea name="taskA" rows="3">{element.taskA ?? ''}</textarea>
            </label>
            <label>
              Aufgabe B (taskB)
              <textarea name="taskB" rows="3">{element.taskB ?? ''}</textarea>
            </label>
          </div>
          <div class="field-row">
            <label>
              System-Prompt A (devPromptA)
              <textarea name="devPromptA" rows="4">{element.devPromptA ?? ''}</textarea>
            </label>
            <label>
              System-Prompt B (devPromptB)
              <textarea name="devPromptB" rows="4">{element.devPromptB ?? ''}</textarea>
            </label>
          </div>
          <label>
            System-Prompt C (devPromptC)
            <textarea name="devPromptC" rows="4">{element.devPromptC ?? ''}</textarea>
          </label>
          <div class="form-actions">
            <button type="submit">Element speichern</button>
          </div>
        </form>

        {#if previews[element.id]}
          <div class="preview">
            <h3>Vorschau</h3>
            <ElementRender
              course={data.course}
              lesson={data.lesson}
              {element}
              user={data.actor}
              updateUserStars={() => {}}
            />
          </div>
        {/if}
      </details>
    {:else}
      <p class="empty">Noch keine Elemente vorhanden.</p>
    {/each}

    <details class="entity-card create-card">
      <summary><strong>+ Neues Element anlegen</strong></summary>
      <form method="POST" action="?/createElement" class="entity-form">
        <div class="field-row">
          <label>
            Typ
            <select name="type">
              {#each data.elementTypes as elementType}
                <option value={elementType}>{elementType}</option>
              {/each}
            </select>
          </label>
          <label>
            Titel (intern)
            <input type="text" name="title" maxlength="200" />
          </label>
        </div>
        <label>
          Beschreibung (HTML)
          <textarea name="description" rows="5"></textarea>
        </label>
        <div class="field-row">
          <label>
            Aufgabe A (taskA)
            <textarea name="taskA" rows="3"></textarea>
          </label>
          <label>
            Aufgabe B (taskB)
            <textarea name="taskB" rows="3"></textarea>
          </label>
        </div>
        <div class="field-row">
          <label>
            System-Prompt A (devPromptA)
            <textarea name="devPromptA" rows="4"></textarea>
          </label>
          <label>
            System-Prompt B (devPromptB)
            <textarea name="devPromptB" rows="4"></textarea>
          </label>
        </div>
        <label>
          System-Prompt C (devPromptC)
          <textarea name="devPromptC" rows="4"></textarea>
        </label>
        <div class="form-actions">
          <button type="submit">Element anlegen</button>
        </div>
      </form>
    </details>
  </section>

  <section class="panel">
    <h2>Quizfragen</h2>

    {#each data.quizQuestions as question, index (question.id)}
      <details class="entity-card">
        <summary>
          <span class="entity-position">#{index + 1}</span>
          <span class="entity-type">{question.type}</span>
          <span class="entity-title">{question.question}</span>
          <span class="entity-id">ID {question.id}</span>
        </summary>

        <div class="entity-toolbar">
          <form method="POST" action="?/moveQuizQuestion">
            <input type="hidden" name="questionId" value={question.id} />
            <input type="hidden" name="direction" value="up" />
            <button type="submit" class="compact" disabled={index === 0} aria-label="Nach oben">↑</button>
          </form>
          <form method="POST" action="?/moveQuizQuestion">
            <input type="hidden" name="questionId" value={question.id} />
            <input type="hidden" name="direction" value="down" />
            <button
              type="submit"
              class="compact"
              disabled={index === data.quizQuestions.length - 1}
              aria-label="Nach unten">↓</button
            >
          </form>
          <form
            method="POST"
            action="?/deleteQuizQuestion"
            on:submit={(event) => {
              if (!confirm('Diese Quizfrage wirklich löschen?')) event.preventDefault();
            }}
          >
            <input type="hidden" name="questionId" value={question.id} />
            <button type="submit" class="compact danger">Löschen</button>
          </form>
        </div>

        <form method="POST" action="?/updateQuizQuestion" class="entity-form">
          <input type="hidden" name="questionId" value={question.id} />
          <label>
            Frage
            <textarea name="question" rows="2" required>{question.question}</textarea>
          </label>
          <label>
            Typ
            <select name="questionType" value={question.type}>
              {#each data.quizQuestionTypes as questionType}
                <option value={questionType}>{quizTypeLabels[questionType] ?? questionType}</option>
              {/each}
            </select>
          </label>
          <div class="field-row">
            <label>
              Antwortoptionen (eine pro Zeile)
              <textarea name="options" rows="5">{question.options.join('\n')}</textarea>
            </label>
            <label>
              Richtige Antworten (eine pro Zeile)
              <textarea name="correct" rows="5">{question.correct.join('\n')}</textarea>
            </label>
          </div>
          <div class="form-actions">
            <button type="submit">Quizfrage speichern</button>
          </div>
        </form>
      </details>
    {:else}
      <p class="empty">Noch keine Quizfragen vorhanden.</p>
    {/each}

    <details class="entity-card create-card">
      <summary><strong>+ Neue Quizfrage anlegen</strong></summary>
      <form method="POST" action="?/createQuizQuestion" class="entity-form">
        <label>
          Frage
          <textarea name="question" rows="2" required></textarea>
        </label>
        <label>
          Typ
          <select name="questionType">
            {#each data.quizQuestionTypes as questionType}
              <option value={questionType}>{quizTypeLabels[questionType] ?? questionType}</option>
            {/each}
          </select>
        </label>
        <div class="field-row">
          <label>
            Antwortoptionen (eine pro Zeile)
            <textarea name="options" rows="5"></textarea>
          </label>
          <label>
            Richtige Antworten (eine pro Zeile)
            <textarea name="correct" rows="5"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit">Quizfrage anlegen</button>
        </div>
      </form>
    </details>
  </section>
</main>

<dialog bind:this={deleteElementDialog} on:close={() => (elementToDelete = null)}>
  {#if elementToDelete}
    <div class="dialog-heading">
      <div>
        <h2>Element löschen</h2>
        <p>Typ: {elementToDelete.type} (ID {elementToDelete.id})</p>
      </div>
      <button type="button" class="close" aria-label="Dialog schließen" on:click={closeDeleteElementDialog}>×</button>
    </div>

    <p class="danger-text">
      <strong>Alle Nutzerfortschritte zu diesem Element werden unwiderruflich gelöscht.</strong>
    </p>

    <form method="POST" action="?/deleteElement" class="dialog-form">
      <input type="hidden" name="elementId" value={elementToDelete.id} />
      <label>
        Zur Bestätigung <code>LÖSCHEN</code> eingeben
        <input type="text" name="confirmation" required autocomplete="off" />
      </label>
      <button type="submit" class="danger">Element unwiderruflich löschen</button>
      <button type="button" class="secondary" on:click={closeDeleteElementDialog}>Abbrechen</button>
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
  button {
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

  button {
    display: inline-block;
    background: var(--color-primary-dark);
    color: white;
    font-weight: 600;
    cursor: pointer;
    text-align: center;
  }

  button:hover {
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
    color: white;
  }

  button.compact {
    min-height: 2rem;
    padding: 0.3rem 0.55rem;
    font-size: 0.85rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 600;
  }

  .lesson-form {
    display: grid;
    grid-template-columns: 2fr 0.7fr 0.7fr auto;
    align-items: end;
    gap: 1rem;
  }

  .entity-card {
    margin-bottom: 0.75rem;
    border: 1px solid #c5d7d9;
    border-radius: 0.5rem;
    background: #fbfeff;
  }

  .entity-card summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
  }

  .entity-card[open] summary {
    border-bottom: 1px solid #dce7e8;
  }

  .entity-position {
    font-weight: 700;
    color: var(--color-primary-darkest);
  }

  .entity-type {
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: #e4f3f5;
    color: var(--color-primary-darkest);
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .entity-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entity-id {
    color: #5b6667;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .entity-toolbar {
    display: flex;
    gap: 0.35rem;
    padding: 0.75rem 1rem 0;
  }

  .entity-form {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .form-actions {
    display: flex;
    gap: 0.5rem;
  }

  .create-card {
    background: #f2f9f4;
  }

  .preview {
    margin: 0 1rem 1rem;
    padding: 1rem;
    border: 2px dashed var(--color-primary-dark);
    border-radius: 0.5rem;
    background: var(--color-background, #fff);
  }

  .preview h3 {
    margin-top: 0;
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

  .hint {
    color: #4c5e60;
  }

  .empty {
    padding: 1rem;
    color: #5b6667;
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

  @media (max-width: 850px) {
    .lesson-form,
    .field-row {
      grid-template-columns: 1fr;
    }

    .page-heading {
      flex-direction: column;
    }

    .entity-toolbar {
      flex-wrap: wrap;
    }
  }
</style>
