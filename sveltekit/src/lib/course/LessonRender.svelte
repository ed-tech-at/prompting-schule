<script lang="ts">
  import type { Badge, Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';
  import { courseHref } from './href';

  export let course: Course;
  export let lesson: Lesson;
  export let userId: string;
  export let latestBadge: Badge | undefined;
  export let lang: CourseLang = 'de';

  $: t = COURSE_TEXTS[lang];
  $: paths = coursePaths(lang);
  $: lessonHref = courseHref(paths.lesson(course.URL, lesson.URL));
  $: badgeHref = courseHref(paths.badge(course.URL, lesson.URL));

  let percentReached = 0;
  let promptsTried = 0;

  let userStars = 0;

  onMount(() => {
    getQuizResultsOrPromptsTried();
    updateUserStars();
  });

  async function updateUserStars() {
    const data = {
      userId: userId,
      lessonId: lesson.id
    };

    const response = await fetch(resolve('/api/userProgress'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: "getLessonStars",
        data
      })
    });
    const result = await response.json();
    userStars = result.stars;
  }

  async function getQuizResultsOrPromptsTried() {
    try {
      const answerData = {
        userId: userId,
        lessonId: lesson.id
      };

      let action = "getQuizResults";
      if (lesson.starsNeeded == 0) {
        action = "getPromptsTried";
      }

      const response = await fetch(resolve('/api/quiz'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          answerData
        })
      });

      const result = await response.json();
      if (result.success && result.percentReached) {
        percentReached = result.percentReached;
      }
      if (result.success && result.promptsTried) {
        promptsTried = result.promptsTried;
      }
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }
</script>

<div class="lessonWrapper">
  <a href={lessonHref} class={"lesson-link lesson"}>
    <h2>{lesson.lessonName}</h2>
    <div class="emoji">{lesson.lessonEmoji}</div>

    {#if lesson.starsNeeded > 0}
      {#if course.displayType && course.displayType.includes("aufgabe")}
        <p>{t.lessonContains}
          {#each Array(lesson.starsNeeded) as _}
            <i class="fas fa-clipboard" aria-hidden="true"></i>
          {/each}
        </p>

        <p>
          {t.tasksDone}
          {#each Array(userStars) as _}
            <i class="fa fa-clipboard-check star-color" aria-hidden="true"></i>
          {/each}
        </p>
      {:else}
        <p>{t.starsNeeded}
          {#each Array(lesson.starsNeeded) as _}
            <i class="fa fa-star" aria-hidden="true"></i>
          {/each}
        </p>

        <p>
          {t.starsCollected}
          {#each Array(userStars) as _}
            <i class="fa fa-star star-color" aria-hidden="true"></i>
          {/each}
        </p>
      {/if}

      {#if percentReached > 0}
        <p>{t.bestQuizAttempt(percentReached)}</p>
      {/if}
    {/if}
  </a>

  <div class="badges">
    <p class="badge-label">Digital Badge</p>

    {#if latestBadge}
      <a href={badgeHref} class="button badge-link">
        {t.showBadge(new Date(latestBadge.createdAt).toLocaleDateString(t.dateLocale))}
      </a>
    {:else if percentReached >= 75 && lesson.starsNeeded > 0}
      <a href={badgeHref} class="button badge-link">
        {t.createBadge}
      </a>
    {:else if lesson.starsNeeded > 0}
      <p>{t.quizForBadge}</p>
    {:else if promptsTried > 0 && lesson.starsNeeded == 0}
      <a href={badgeHref} class="button badge-link">
        {t.createBadge}
      </a>
    {:else}
      <p>{t.workForBadge}</p>
    {/if}
  </div>
</div>
