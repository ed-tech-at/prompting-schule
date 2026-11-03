<script lang="ts">
  import type { JwtUserPayload } from '$lib/server/jwt';
  import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';
  import { courseHref } from './href';

  export let course: Course;
  export let lesson: Lesson;
  export let user: JwtUserPayload;
  export let userStars: number;
  export let lang: CourseLang = 'de';

  $: t = COURSE_TEXTS[lang];
  $: quizHref = courseHref(coursePaths(lang).quiz(course.URL, lesson.URL));

  let percentReached = 0;

  onMount(() => {
    getQuizResults();
  });

  async function getQuizResults() {
    try {
      const answerData = {
        userId: user.id,
        lessonId: lesson.id
      };

      const response = await fetch(resolve('/api/quiz'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getQuizResults",
          answerData
        })
      });

      const result = await response.json();
      if (result.success) {
        percentReached = result.percentReached;
      }
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }
</script>

<section class="quiz-link">
  <h2><i class="fas fa-tasks"></i> Quiz</h2>

  {#if course.displayType && course.displayType.includes("aufgabe")}
    <p>{t.tasksMustPrefix(lesson.starsNeeded)} <b>{lesson.starsNeeded}</b> <span class="star-color" style="color:var(--color-secondary-darkest)"><i class="fas fa-clipboard" aria-hidden="true"></i> {t.taskWord(lesson.starsNeeded)}</span> {t.tasksMustSuffix}</p>
    <p>
      {t.tasksDone} <b>{userStars}</b>
    </p>
  {:else}
    <p>{t.starsNeeded}
      {#each Array(lesson.starsNeeded) as _}
        <i class="fa fa-star" aria-hidden="true"></i>
      {/each}
    </p>
    <p>
      {t.starsCollectedByYou}
      {#each Array(userStars) as _}
        <i class="fa fa-star star-color" aria-hidden="true"></i>
      {/each}
    </p>
  {/if}

  {#if userStars >= lesson.starsNeeded}
    {#if percentReached > 0}
      <p>{t.bestAttempt(percentReached)}</p>
      <a class="quiz-btn" href={quizHref}>{t.restartQuiz}</a>
    {:else}
      <a class="quiz-btn" href={quizHref}>{t.startQuiz}</a>
    {/if}
  {:else}
    {#if course.displayType && course.displayType.includes("aufgabe")}
      <p>{t.notEnoughTasks}</p>
    {:else}
      <p>{t.notEnoughStars}</p>
    {/if}
  {/if}
</section>
