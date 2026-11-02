<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { COURSE_LANG_LABELS, coursePaths, isCourseLang } from '$lib/courseLang';
  import { courseHref } from '$lib/course/href';
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
  $: learnerHref = courseHref(coursePaths(data.lang).course(data.course.URL));
  $: percentDone = data.counts.total === 0 ? 100 : Math.round((data.counts.done / data.counts.total) * 100);

  function isOpen(status: Record<string, Status>) {
    return Object.values(status).some((value) => value === 'missing' || value === 'outdated');
  }

  function rowsFor(text: string) {
    const lines = text.split('\n').length + Math.ceil(text.length / 90);
    return Math.min(18, Math.max(2, lines));
  }

  function messageFor(entityKey: string) {
    return form?.entityKey === entityKey ? form : null;
  }

  // Keep what was typed in the other forms and the scroll position after saving.
  const keepValues: SubmitFunction = () => {
    return async ({ update }) => {
      await update({ reset: false });
    };
  };

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

    <label class="filter">
      <input type="checkbox" bind:checked={onlyOpen} />
      Nur fehlende und veraltete Einträge zeigen
    </label>
  </section>

  {#if !onlyOpen || isOpen(data.courseStatus)}
    <section class="panel" aria-labelledby="course-title">
      <h2 id="course-title">Kursdaten</h2>
      <form method="POST" action="?/saveCourse" use:enhance={keepValues} class="entity">
        {#each Object.keys(COURSE_FIELD_LABELS) as field}
          {#if data.courseStatus[field] !== 'notNeeded'}
            {@const source = String(data.course[field as keyof typeof data.course] ?? '')}
            <div class="field-pair">
              <div class="field-head">
                <span class="field-label">{COURSE_FIELD_LABELS[field]}</span>
                <span class="status {data.courseStatus[field]}">{STATUS_LABELS[data.courseStatus[field]]}</span>
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
        <div class="entity-actions">
          <button type="submit">Kursdaten speichern</button>
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
          <form method="POST" action="?/saveLesson" use:enhance={keepValues} class="entity">
            <input type="hidden" name="lessonId" value={lesson.id} />
            <div class="field-pair">
              <div class="field-head">
                <span class="field-label">Lektionsname</span>
                <span class="status {lesson.status.lessonName}">{STATUS_LABELS[lesson.status.lessonName]}</span>
              </div>
              <input class="source" readonly value={lesson.source.lessonName} aria-label="Lektionsname (Original)" />
              <input
                name="lessonName"
                value={lesson.translation.lessonName}
                lang={data.lang}
                aria-label="Lektionsname ({langLabel})"
              />
            </div>
            <div class="entity-actions">
              <button type="submit" class="compact">Speichern</button>
              {#if messageFor(`lesson-${lesson.id}`)}
                <span class:error={!form?.success} class="inline-message" role="status">{form?.message}</span>
              {/if}
            </div>
          </form>
        {/if}

        {#each lesson.elements as element, index}
          {#if Object.values(element.status).some((status) => status !== 'notNeeded') && (!onlyOpen || isOpen(element.status))}
            <form method="POST" action="?/saveElement" use:enhance={keepValues} class="entity element">
              <input type="hidden" name="elementId" value={element.id} />
              <h3>Element {index + 1} <code>{element.type}</code></h3>
              {#each Object.keys(ELEMENT_FIELD_LABELS) as field}
                {#if element.status[field] !== 'notNeeded'}
                  <div class="field-pair">
                    <div class="field-head">
                      <span class="field-label">{ELEMENT_FIELD_LABELS[field]}</span>
                      <span class="status {element.status[field]}">{STATUS_LABELS[element.status[field]]}</span>
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
                {#if messageFor(`element-${element.id}`)}
                  <span class:error={!form?.success} class="inline-message" role="status">{form?.message}</span>
                {/if}
              </div>
            </form>
          {/if}
        {/each}

        {#each lesson.quizQuestions as question, index}
          {#if !onlyOpen || isOpen(question.status)}
            <form method="POST" action="?/saveQuizQuestion" use:enhance={keepValues} class="entity quiz">
              <input type="hidden" name="quizQuestionId" value={question.id} />
              <h3>Quizfrage {index + 1} <code>{question.type === 'm' ? 'Multiple Choice' : 'Single Choice'}</code></h3>
              <div class="field-pair">
                <div class="field-head">
                  <span class="field-label">Frage</span>
                  <span class="status {question.status.question}">{STATUS_LABELS[question.status.question]}</span>
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
                <div class="field-pair option">
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
                  {#if question.correct.includes(option)}
                    <span class="correct" title="Richtige Antwort">✓ richtig</span>
                  {/if}
                </div>
              {/each}
              <div class="entity-actions">
                <button type="submit" class="compact">Speichern</button>
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
