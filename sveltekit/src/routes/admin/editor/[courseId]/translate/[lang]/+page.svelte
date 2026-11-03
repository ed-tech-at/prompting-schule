<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { COURSE_LANG_LABELS, coursePaths, isCourseLang } from '$lib/courseLang';
  import { courseHref } from '$lib/course/href';
  import { slugify } from '$lib/slug';
  import type { ActionData, PageData } from './$types';
  import type { SubmitFunction } from '@sveltejs/kit';

  export let data: PageData;
  export let form: ActionData;

  type Status = 'notNeeded' | 'missing' | 'outdated' | 'done';

  const STATUS_LABELS: Record<Status, string> = {
    notNeeded: '',
    missing: 'fehlt',
    outdated: 'Original geändert',
    done: 'übersetzt'
  };

  const COURSE_FIELD_LABELS: Record<string, string> = {
    name: 'Kursname',
    description: 'Beschreibung (HTML, Kursübersicht)',
    introDescription: 'Einleitung (HTML, Kursseite)',
    introDescriptionSuffix: 'Einleitung – Abschluss (HTML, unter den Lektionen)'
  };

  const ELEMENT_FIELD_LABELS: Record<string, string> = {
    title: 'Titel',
    description: 'Inhalt (HTML)',
    taskA: 'Aufgabe A',
    devPromptA: 'System-Prompt A (für Lernende unsichtbar)',
    taskB: 'Aufgabe B',
    devPromptB: 'Prompt B',
    devPromptC: 'Prompt C (für Lernende unsichtbar)'
  };

  const sourceLang = isCourseLang(data.course.lang) ? data.course.lang : 'de';

  let onlyOpen = false;

  $: langLabel = COURSE_LANG_LABELS[data.lang];
  $: learnerHref = courseHref(coursePaths(data.lang).course(data.courseTranslation.URL || data.course.URL));
  $: percentDone = data.counts.total === 0 ? 100 : Math.round((data.counts.done / data.counts.total) * 100);

  function isOpen(status: Record<string, Status>) {
    return Object.values(status).some((value) => value === 'missing' || value === 'outdated');
  }

  function rowsFor(text: string) {
    const lines = text.split('\n').length + Math.ceil(text.length / 90);
    return Math.min(18, Math.max(2, lines));
  }

  // Fills the slug field of a form from the translated title in the same form.
  function slugFromTitle(button: HTMLElement, titleField: string) {
    const form = button.closest('form');
    const title = form?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${titleField}"]`);
    const slug = form?.querySelector<HTMLInputElement>('input[name="URL"]');
    if (!title || !slug || !title.value.trim()) return;
    slug.value = slugify(title.value);
    const formKey = form?.dataset.formKey;
    if (formKey) unsaved = { ...unsaved, [formKey]: true };
  }

  function messageFor(entityKey: string) {
    return form?.entityKey === entityKey ? form : null;
  }

  // Forms with AI suggestions that are not saved yet.
  let unsaved: Record<string, boolean> = {};
  // Lets the bulk run wait until a form it submitted is saved.
  const saveWaiters = new Map<HTMLFormElement, () => void>();

  // Keep what was typed in the other forms and the scroll position after saving.
  const keepValues: SubmitFunction = ({ formElement }) => {
    return async ({ update, result }) => {
      await update({ reset: false });
      if (result.type === 'success') {
        const key = formElement.dataset.formKey;
        if (key) unsaved = { ...unsaved, [key]: false };
      }
      saveWaiters.get(formElement)?.();
      saveWaiters.delete(formElement);
    };
  };

  // ---- AI pre-translation ----

  let busy: Record<string, boolean> = {};
  let aiError = '';

  type AiTarget = HTMLInputElement | HTMLTextAreaElement;

  function pairParts(button: HTMLElement) {
    const pair = button.closest<HTMLElement>('.field-pair');
    const source = pair?.querySelector<AiTarget>('.source');
    const target = pair?.querySelector<AiTarget>('textarea:not(.source), input:not(.source)');
    const form = button.closest<HTMLFormElement>('form');
    return { pair, source, target, form };
  }

  async function translateField(button: HTMLElement): Promise<boolean> {
    const key = button.dataset.aiKey ?? '';
    const field = button.dataset.aiField ?? '';
    const { source, target, form } = pairParts(button);
    if (!source || !target || busy[key]) return false;

    busy = { ...busy, [key]: true };
    aiError = '';
    try {
      const response = await fetch(`${editorHref(`/${data.course.id}/translate/${data.lang}`)}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, text: source.value })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        aiError = result.message ?? 'Die KI-Übersetzung ist fehlgeschlagen.';
        return false;
      }
      target.value = result.translation ?? '';
      target.dispatchEvent(new Event('input', { bubbles: true }));
      const formKey = form?.dataset.formKey;
      if (formKey) unsaved = { ...unsaved, [formKey]: true };
      return true;
    } catch {
      aiError = 'Die KI-Übersetzung ist fehlgeschlagen. Bitte Verbindung prüfen.';
      return false;
    } finally {
      busy = { ...busy, [key]: false };
    }
  }

  let bulkRunning = false;
  let bulkStop = false;
  let bulkDone = 0;
  let bulkTotal = 0;

  function missingButtons(attempted: Set<string>) {
    return [...document.querySelectorAll<HTMLButtonElement>('button[data-ai-key]')].filter((button) => {
      const { pair, target } = pairParts(button);
      return (
        pair?.dataset.status === 'missing' &&
        target !== null && target !== undefined &&
        target.value.trim() === '' &&
        !attempted.has(button.dataset.aiKey ?? '')
      );
    });
  }

  function saveForm(form: HTMLFormElement): Promise<void> {
    return new Promise((resolve) => {
      saveWaiters.set(form, resolve);
      form.requestSubmit();
    });
  }

  // Strictly one request after the other, so the AI service is never flooded.
  // Every form is saved as soon as its missing fields are filled.
  async function translateAllMissing() {
    const attempted = new Set<string>();
    bulkRunning = true;
    bulkStop = false;
    bulkDone = 0;
    bulkTotal = missingButtons(attempted).length;
    aiError = '';

    let currentForm: HTMLFormElement | null = null;
    try {
      while (!bulkStop) {
        const [button] = missingButtons(attempted);
        if (!button) break;
        attempted.add(button.dataset.aiKey ?? '');

        const form = button.closest('form');
        if (currentForm && form !== currentForm) {
          await saveForm(currentForm);
        }
        currentForm = form;

        const ok = await translateField(button);
        if (!ok) break;
        bulkDone += 1;
      }
      if (currentForm && unsaved[currentForm.dataset.formKey ?? '']) {
        await saveForm(currentForm);
      }
    } finally {
      bulkRunning = false;
    }
  }

  function editorHref(path: string) {
    return `${resolve('/admin/editor')}${path}`;
  }
</script>

<Header
  navItems={[
    { name: 'Admin', href: '/admin' },
    { name: 'Seiten-Editor', href: '/admin/editor' },
    { name: data.course.name, href: `/admin/editor/${data.course.id}` },
    { name: `Übersetzung ${langLabel}`, href: `/admin/editor/${data.course.id}/translate/${data.lang}` }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>{data.course.name}: {langLabel}</h1>
      <p>
        Original in {COURSE_LANG_LABELS[sourceLang]} links, Übersetzung rechts. Leere Felder zeigen Lernenden
        das Original. Struktur, Reihenfolge und Elementtypen werden im
        <a href={editorHref(`/${data.course.id}`)}>Kurs-Editor</a> gepflegt.
      </p>
    </div>
    <a class="button-link secondary" href={learnerHref} target="_blank" rel="noopener">Als Lernende:r ansehen ↗</a>
  </div>

  <section class="panel summary" aria-label="Stand der Übersetzung">
    <div class="progress-block">
      <div class="progress-label">
        <strong>{data.counts.done} von {data.counts.total} Feldern übersetzt</strong>
        {#if data.counts.missing}<span class="status missing">{data.counts.missing} fehlen</span>{/if}
        {#if data.counts.outdated}<span class="status outdated">{data.counts.outdated} veraltet</span>{/if}
      </div>
      <progress max="100" value={percentDone} aria-label="Fortschritt der Übersetzung">{percentDone}%</progress>
    </div>

    <form method="POST" action="?/setActive" use:enhance={keepValues} class="visibility">
      <label>
        Sichtbarkeit auf {langLabel}
        <select name="active" value={String(data.courseTranslation.active)}>
          <option value="0">Versteckt – nur per Link (zum Testen)</option>
          <option value="1">Aktiv – in der Kursliste</option>
          <option value="2">Ausgegraut in der Kursliste</option>
        </select>
      </label>
      <button type="submit">Übernehmen</button>
    </form>
    {#if messageFor('course') && form?.action === 'setActive'}
      <p class:error={!form?.success} class="inline-message" role="status">{form?.message}</p>
    {/if}

    <div class="bulk">
      {#if bulkRunning}
        <span class="bulk-progress" role="status">KI übersetzt {bulkDone} von {bulkTotal} …</span>
        <button type="button" class="secondary" on:click={() => (bulkStop = true)} disabled={bulkStop}>
          {bulkStop ? 'Wird gestoppt …' : 'Stopp'}
        </button>
      {:else}
        <button type="button" on:click={translateAllMissing} disabled={data.counts.missing === 0}>
          ✨ Alle fehlenden mit KI übersetzen
        </button>
        <span class="hint">Feld für Feld nacheinander; jeder fertige Block wird gespeichert. Bitte danach gegenlesen.</span>
      {/if}
    </div>
    {#if aiError}
      <p class="inline-message error" role="alert">{aiError}</p>
    {/if}

    <label class="filter">
      <input type="checkbox" bind:checked={onlyOpen} />
      Nur fehlende und veraltete Einträge zeigen
    </label>
  </section>

  {#if !onlyOpen || isOpen(data.courseStatus)}
    <section class="panel" aria-labelledby="course-title">
      <h2 id="course-title">Kursdaten</h2>
      <form method="POST" action="?/saveCourse" use:enhance={keepValues} class="entity" data-form-key="course">
        {#each Object.keys(COURSE_FIELD_LABELS) as field}
          {#if data.courseStatus[field] !== 'notNeeded'}
            {@const source = String(data.course[field as keyof typeof data.course] ?? '')}
            <div class="field-pair" data-status={data.courseStatus[field]}>
              <div class="field-head">
                <span class="field-label">{COURSE_FIELD_LABELS[field]}</span>
                <span class="status {data.courseStatus[field]}">{STATUS_LABELS[data.courseStatus[field]]}</span>
                <button
                  type="button"
                  class="ai-button"
                  data-ai-key={`course-${field}`}
                  data-ai-field={field}
                  disabled={busy[`course-${field}`] || bulkRunning}
                  on:click={(event) => translateField(event.currentTarget)}
                >{busy[`course-${field}`] ? 'übersetzt …' : '✨ Mit KI übersetzen'}</button>
              </div>
              <textarea class="source" readonly rows={rowsFor(source)} aria-label="{COURSE_FIELD_LABELS[field]} (Original)">{source}</textarea>
              <textarea
                name={field}
                rows={rowsFor(source)}
                lang={data.lang}
                aria-label="{COURSE_FIELD_LABELS[field]} ({langLabel})"
              >{data.courseTranslation.fields[field]}</textarea>
            </div>
          {/if}
        {/each}
        <div class="slug-field">
          <label for="course-slug" class="field-label">URL-Slug ({langLabel})</label>
          <button type="button" class="ai-button" on:click={(event) => slugFromTitle(event.currentTarget, 'name')}>
            Aus Kursnamen erzeugen
          </button>
          <input
            id="course-slug"
            name="URL"
            value={data.courseTranslation.URL}
            placeholder={data.course.URL}
            pattern="[a-z0-9\-]+"
          />
          <span class="hint">Leer lassen, um die URL der Ausgangssprache zu nutzen. Alte Links leiten weiter.</span>
        </div>
        <div class="entity-actions">
          <button type="submit">Kursdaten speichern</button>
          {#if unsaved.course}<span class="unsaved">KI-Vorschlag noch nicht gespeichert</span>{/if}
          {#if messageFor('course') && form?.action === 'saveCourse'}
            <span class:error={!form?.success} class="inline-message" role="status">{form?.message}</span>
          {/if}
        </div>
      </form>
    </section>
  {/if}

  {#each data.lessons as lesson}
    {@const lessonOpen =
      isOpen(lesson.status) ||
      lesson.elements.some((element) => isOpen(element.status)) ||
      lesson.quizQuestions.some((question) => isOpen(question.status))}
    {#if !onlyOpen || lessonOpen}
      <section class="panel" aria-labelledby="lesson-{lesson.id}">
        <h2 id="lesson-{lesson.id}">
          {lesson.lessonEmoji ?? ''} {lesson.source.lessonName}
          {#if !lesson.active}<span class="status inactive-lesson">Lektion inaktiv</span>{/if}
        </h2>

        {#if !onlyOpen || isOpen(lesson.status)}
          <form method="POST" action="?/saveLesson" use:enhance={keepValues} class="entity" data-form-key="lesson-{lesson.id}">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <div class="field-pair" data-status={lesson.status.lessonName}>
              <div class="field-head">
                <span class="field-label">Lektionsname</span>
                <span class="status {lesson.status.lessonName}">{STATUS_LABELS[lesson.status.lessonName]}</span>
                <button
                  type="button"
                  class="ai-button"
                  data-ai-key={`lesson-${lesson.id}-lessonName`}
                  data-ai-field={'lessonName'}
                  disabled={busy[`lesson-${lesson.id}-lessonName`] || bulkRunning}
                  on:click={(event) => translateField(event.currentTarget)}
                >{busy[`lesson-${lesson.id}-lessonName`] ? 'übersetzt …' : '✨ Mit KI übersetzen'}</button>
              </div>
              <input class="source" readonly value={lesson.source.lessonName} aria-label="Lektionsname (Original)" />
              <input
                name="lessonName"
                value={lesson.translation.lessonName}
                lang={data.lang}
                aria-label="Lektionsname ({langLabel})"
              />
            </div>
            <div class="slug-field">
              <label for="lesson-slug-{lesson.id}" class="field-label">URL-Slug ({langLabel})</label>
              <button type="button" class="ai-button" on:click={(event) => slugFromTitle(event.currentTarget, 'lessonName')}>
                Aus Lektionsnamen erzeugen
              </button>
              <input
                id="lesson-slug-{lesson.id}"
                name="URL"
                value={lesson.translation.URL}
                placeholder={lesson.URL}
                pattern="[a-z0-9\-]+"
              />
            </div>
            <div class="entity-actions">
              <button type="submit" class="compact">Speichern</button>
                {#if unsaved[`lesson-${lesson.id}`]}<span class="unsaved">KI-Vorschlag noch nicht gespeichert</span>{/if}
              {#if messageFor(`lesson-${lesson.id}`)}
                <span class:error={!form?.success} class="inline-message" role="status">{form?.message}</span>
              {/if}
            </div>
          </form>
        {/if}

        {#each lesson.elements as element, index}
          {#if Object.values(element.status).some((status) => status !== 'notNeeded') && (!onlyOpen || isOpen(element.status))}
            <form method="POST" action="?/saveElement" use:enhance={keepValues} class="entity element" data-form-key="element-{element.id}">
              <input type="hidden" name="elementId" value={element.id} />
              <h3>Element {index + 1} <code>{element.type}</code></h3>
              {#each Object.keys(ELEMENT_FIELD_LABELS) as field}
                {#if element.status[field] !== 'notNeeded'}
                  <div class="field-pair" data-status={element.status[field]}>
                    <div class="field-head">
                      <span class="field-label">{ELEMENT_FIELD_LABELS[field]}</span>
                      <span class="status {element.status[field]}">{STATUS_LABELS[element.status[field]]}</span>
                      <button
                  type="button"
                  class="ai-button"
                  data-ai-key={`element-${element.id}-${field}`}
                  data-ai-field={field}
                  disabled={busy[`element-${element.id}-${field}`] || bulkRunning}
                  on:click={(event) => translateField(event.currentTarget)}
                >{busy[`element-${element.id}-${field}`] ? 'übersetzt …' : '✨ Mit KI übersetzen'}</button>
                    </div>
                    <textarea class="source" readonly rows={rowsFor(element.source[field])} aria-label="{ELEMENT_FIELD_LABELS[field]} (Original)">{element.source[field]}</textarea>
                    <textarea
                      name={field}
                      rows={rowsFor(element.source[field])}
                      lang={data.lang}
                      aria-label="{ELEMENT_FIELD_LABELS[field]} ({langLabel})"
                    >{element.translation[field]}</textarea>
                  </div>
                {/if}
              {/each}
              <div class="entity-actions">
                <button type="submit" class="compact">Speichern</button>
                {#if unsaved[`element-${element.id}`]}<span class="unsaved">KI-Vorschlag noch nicht gespeichert</span>{/if}
                {#if messageFor(`element-${element.id}`)}
                  <span class:error={!form?.success} class="inline-message" role="status">{form?.message}</span>
                {/if}
              </div>
            </form>
          {/if}
        {/each}

        {#each lesson.quizQuestions as question, index}
          {#if !onlyOpen || isOpen(question.status)}
            <form method="POST" action="?/saveQuizQuestion" use:enhance={keepValues} class="entity quiz" data-form-key="quiz-{question.id}">
              <input type="hidden" name="quizQuestionId" value={question.id} />
              <h3>Quizfrage {index + 1} <code>{question.type === 'm' ? 'Multiple Choice' : 'Single Choice'}</code></h3>
              <div class="field-pair" data-status={question.status.question}>
                <div class="field-head">
                  <span class="field-label">Frage</span>
                  <span class="status {question.status.question}">{STATUS_LABELS[question.status.question]}</span>
                  <button
                  type="button"
                  class="ai-button"
                  data-ai-key={`quiz-${question.id}-question`}
                  data-ai-field={'question'}
                  disabled={busy[`quiz-${question.id}-question`] || bulkRunning}
                  on:click={(event) => translateField(event.currentTarget)}
                >{busy[`quiz-${question.id}-question`] ? 'übersetzt …' : '✨ Mit KI übersetzen'}</button>
                </div>
                <textarea class="source" readonly rows={rowsFor(question.source.question)} aria-label="Frage (Original)">{question.source.question}</textarea>
                <textarea
                  name="question"
                  rows={rowsFor(question.source.question)}
                  lang={data.lang}
                  aria-label="Frage ({langLabel})"
                >{question.translation.question}</textarea>
              </div>
              <div class="field-head">
                <span class="field-label">Antworten</span>
                <span class="status {question.status.options}">{STATUS_LABELS[question.status.options]}</span>
              </div>
              <p class="hint">
                Bewertet wird über die Position der Antwort. Die Übersetzung muss also zur Antwort in derselben Zeile passen.
              </p>
              {#each question.source.options as option, optionIndex}
                <div class="field-pair option" data-status={question.translation.options[optionIndex] ? 'done' : 'missing'}>
                  <input
                    class="source"
                    readonly
                    value={option}
                    aria-label="Antwort {optionIndex + 1} (Original)"
                  />
                  <input
                    name="option-{optionIndex}"
                    value={question.translation.options[optionIndex]}
                    lang={data.lang}
                    aria-label="Antwort {optionIndex + 1} ({langLabel})"
                  />
                  <span class="option-meta">
                    {#if question.correct.includes(option)}
                      <span class="correct" title="Richtige Antwort">✓ richtig</span>
                    {/if}
                    <button
                  type="button"
                  class="ai-button"
                  data-ai-key={`quiz-${question.id}-option-${optionIndex}`}
                  data-ai-field={'option'}
                  disabled={busy[`quiz-${question.id}-option-${optionIndex}`] || bulkRunning}
                  on:click={(event) => translateField(event.currentTarget)}
                >{busy[`quiz-${question.id}-option-${optionIndex}`] ? 'übersetzt …' : '✨ KI'}</button>
                  </span>
                </div>
              {/each}
              <div class="entity-actions">
                <button type="submit" class="compact">Speichern</button>
                {#if unsaved[`quiz-${question.id}`]}<span class="unsaved">KI-Vorschlag noch nicht gespeichert</span>{/if}
                {#if messageFor(`quiz-${question.id}`)}
                  <span class:error={!form?.success} class="inline-message" role="status">{form?.message}</span>
                {/if}
              </div>
            </form>
          {/if}
        {/each}
      </section>
    {/if}
  {/each}

  {#if onlyOpen && data.counts.missing === 0 && data.counts.outdated === 0}
    <p class="panel empty">Alles übersetzt und aktuell. 🎉</p>
  {/if}
</main>

<style>
  .page-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
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
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .summary {
    display: grid;
    gap: 1rem;
    position: sticky;
    top: 0;
    z-index: 2;
    box-shadow: 0 0.5rem 1rem #0001;
  }

  .progress-label {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }

  progress {
    width: 100%;
    height: 0.7rem;
    accent-color: var(--color-green-dark);
  }

  .visibility {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.75rem;
  }

  .visibility label {
    flex: 1 1 18rem;
  }

  .bulk {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }

  .bulk-progress {
    font-weight: 600;
  }

  .ai-button {
    min-height: 1.8rem;
    margin-left: auto;
    padding: 0.15rem 0.55rem;
    border-color: #7a4fc4;
    background: #f4effc;
    color: #4b2a85;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .ai-button:hover {
    background: #e6dbf8;
    color: #3a1f6b;
  }

  .ai-button:disabled {
    cursor: progress;
    opacity: 0.6;
  }

  .option-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .option-meta .ai-button {
    margin-left: 0;
  }

  .unsaved {
    font-size: 0.85rem;
    color: #6b4b00;
  }

  button.secondary {
    background: white;
    color: var(--color-primary-darkest);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .filter {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
  }

  .filter input {
    width: auto;
    min-height: 0;
  }

  .entity {
    display: grid;
    gap: 0.9rem;
    padding: 0.75rem 0;
    border-top: 1px solid #dce7e8;
  }

  .entity h3 {
    margin: 0;
    font-size: 1rem;
  }

  .field-pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem 1rem;
  }

  .field-pair.option {
    grid-template-columns: 1fr 1fr auto;
    align-items: center;
  }

  .field-head {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .field-label {
    font-weight: 600;
  }

  .slug-field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.5rem;
  }

  .slug-field input {
    flex-basis: 100%;
  }

  input,
  select,
  textarea,
  button,
  .button-link {
    min-height: 2.5rem;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--color-primary-dark);
    border-radius: 0.4rem;
    font: inherit;
  }

  input,
  select,
  textarea {
    width: 100%;
    background: white;
    box-sizing: border-box;
  }

  textarea {
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.88rem;
  }

  .source {
    background: #f3f7f8;
    border-color: #c5d7d9;
    color: #333;
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

  .button-link.secondary {
    background: white;
    color: var(--color-primary-darkest);
    white-space: nowrap;
  }

  button.compact {
    min-height: 2rem;
    padding: 0.3rem 0.7rem;
    font-size: 0.85rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 600;
  }

  .entity-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .status {
    display: inline-block;
    padding: 0.15rem 0.55rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .status:empty {
    display: none;
  }

  .status.done {
    background: var(--color-green-lightest);
    color: var(--color-green-darkest);
  }

  .status.missing {
    background: var(--color-red-lightest);
    color: var(--color-red-darkest);
  }

  .status.outdated {
    background: #fff1c7;
    color: #6b4b00;
  }

  .status.inactive-lesson {
    background: #edf4f5;
    color: #333;
    font-size: 0.75rem;
  }

  .correct {
    font-size: 0.8rem;
    color: var(--color-green-darkest);
    white-space: nowrap;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
    color: #444;
  }

  .inline-message {
    font-size: 0.9rem;
    color: var(--color-green-darkest);
    margin: 0;
  }

  .inline-message.error {
    color: var(--color-red-dark);
  }

  .empty {
    text-align: center;
  }

  code {
    padding: 0.1rem 0.4rem;
    background: #edf4f5;
    border-radius: 0.3rem;
    font-size: 0.85rem;
  }

  @media (max-width: 760px) {
    .page-heading {
      flex-direction: column;
    }

    .field-pair,
    .field-pair.option {
      grid-template-columns: 1fr;
    }

    .summary {
      position: static;
    }
  }
</style>
