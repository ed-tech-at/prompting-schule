<script lang="ts">
  import Header from '$lib/Header.svelte';
  import type { Course, Lesson } from '@prisma/client';
  import type { JwtUserPayload } from '$lib/server/jwt';
  import { resolve } from '$app/paths';
  import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';
  import { courseHref } from './href';

  type QuizOption = { index: number; text: string };
  type Question = { id: number; question: string; type: string; options: QuizOption[] };

  export let data: {
    course: Course;
    lesson: Lesson;
    quizQuestions: Question[];
    user: JwtUserPayload;
    lang: CourseLang;
    langLinks: Partial<Record<CourseLang, string>>;
  };

  $: t = COURSE_TEXTS[data.lang];
  $: paths = coursePaths(data.lang);

  type QuizResult = {
    questionId: number;
    // Indices into the source options; shown in the learner's language below.
    userCorrectResponse: number[];
    points: number;
  };

  type QuizResults = {
    success: true;
    results: QuizResult[];
    totalPoints: number;
    maxPoints: number;
    percent: number;
  };

  let quizResults: QuizResults | null = null;
  let quizSubmitted = false;

  function optionText(question: Question, index: number): string {
    return question.options.find((option) => option.index === index)?.text ?? '';
  }

  export async function handleSubmit(event: SubmitEvent) {
    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const answers: Record<string, string[]> = {};
    for (const [key, value] of formData.entries()) {
      (answers[key] ??= []).push(value as string);
    }

    const answerData = {
      courseId: data.course.id,
      lessonId: data.lesson.id,
      userId: data.user.id,
      answers: JSON.stringify(answers)
    };

    const response = await fetch(resolve('/api/quiz'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        answerData: JSON.stringify({ answerData }),
        action: 'submitQuiz'
      })
    });

    const result = (await response.json()) as QuizResults | { success: false; message?: string };

    if (result.success) {
      quizResults = result;
      quizSubmitted = true;
    } else {
      console.error(t.quizSubmitFailed, result.message);
    }
  }
</script>

<Header
  navItems={[
    { name: t.navCourses, href: paths.courses },
    { name: data.course.name, href: paths.course(data.course.URL) },
    { name: data.lesson.lessonName, href: paths.lesson(data.course.URL, data.lesson.URL) },
    { name: 'Quiz', href: paths.quiz(data.course.URL, data.lesson.URL) }
  ]}
  user={data.user}
  lang={data.lang}
  langLinks={data.langLinks}
/>

<main>
<h1>{t.quizTitle(data.lesson.lessonName)}</h1>

<p>{t.quizIntro}</p>

<form class="quiz-questions" on:submit|preventDefault={handleSubmit} class:disabled={quizSubmitted} autocomplete="off">
{#each data.quizQuestions as question}

<section>
  <fieldset>
  <legend>{question.question}</legend>
    {#if question.type === "s"}
    <p class="questionType">{t.chooseOne}</p>
    {:else if question.type === "m"}
    <p class="questionType">{t.chooseMany}</p>
    {/if}

  {#each question.options as option}
    {#if question.type === "s"}
      <label>
        <input type="radio" name={String(question.id)} value={String(option.index)} disabled={quizSubmitted} autocomplete="off" />
        {@html option.text}
      </label>
    {:else if question.type === "m"}
      <label>
        <input type="checkbox" name={String(question.id)} value={String(option.index)} disabled={quizSubmitted} autocomplete="off" />
        {@html option.text}
      </label>
    {/if}
  {/each}
  </fieldset>

  {#if quizResults}
    {#each quizResults.results as result (result.questionId)}
      {#if result.questionId === question.id}
        <div class="quiz-result">
          <p><strong>{t.yourCorrectAnswers}</strong></p>
          <ul>
            {#each result.userCorrectResponse as correctIndex}
              <li>{@html optionText(question, correctIndex)}</li>
            {/each}
          </ul>
          <p><strong>{t.points}</strong> {result.points}</p>
        </div>
      {/if}
    {/each}
  {/if}

  {#if data.user.isAdmin >= 2}
    <pre><strong>Question ID:</strong> {question.id}</pre>
  {/if}

  </section>
{/each}

<button type="submit" disabled={quizSubmitted}>{t.submitQuiz}</button>

</form>

{#if quizResults}
  <section class="quiz-summary">
    <h2>{t.quizSummary}</h2>
    <p><strong>{t.pointsEarned}</strong> {quizResults.totalPoints} / {quizResults.maxPoints}</p>
    <p><strong>{t.percent}</strong> {quizResults.percent}%</p>

    {#if quizResults.percent >= 75}
      <!-- todo 75 -->
      <p><i class="fas fa-check-circle" style="color: #638e21;"></i> {t.quizPassed}</p>
      <a class="button" href={courseHref(paths.course(data.course.URL))}>{t.toCoursePage(data.course.name)}</a>
    {:else}
      <p><i class="fas fa-exclamation-circle" style="color: red;"></i> {t.quizNotPassed}</p>
      <a class="button" href={courseHref(paths.lesson(data.course.URL, data.lesson.URL))}>{t.backToLesson}</a>
    {/if}
  </section>
{/if}
</main>

<style>
  section {
    background-color: var(--color-link-lightest);
    padding: 1em;
    border-radius: 15px;
    border: 5px solid var(--color-white);
  }
  .quiz-result {
    margin-top: 1rem;
    padding: 1em;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    border-radius: 1em;
  }

  .quiz-result p {
    margin: 0;
  }

  .quiz-summary {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid #ccc;
    background-color: #e6f7ff;
    border-radius: 1em;
  }

  form.disabled, button[disabled] {
    pointer-events: none;
    opacity: 0.6;
  }

  button, .button {
    background-color: var(--color-link);
    font-size: 1.2em;
    padding: 0.5em 1em;
    color: white;
    border-radius: 10px;
    border-color: var(--color-link-darkest);
    display: inline-block;
  }
  h1, h2, legend {
    color: var(--color-link);
  }
  legend {
    margin-bottom: 0em;
    font-size: 1.5em;
    font-weight: bold;
  }
  p.questionType {
    font-style: italic;
    font-size: 0.8em;
  }
  button:hover, .button:hover {
    background-color: var(--color-link-light);
  }

  label {
    display: block;
    margin-bottom: 0.5em;
  }
</style>
