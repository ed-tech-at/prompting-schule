<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import type { Badge, Course, Lesson } from '@prisma/client';
  import type { JwtUserPayload } from '$lib/server/jwt';
  import { onMount } from 'svelte';
  import BadgeRender from './BadgeRender.svelte';
  import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';

  export let data: {
    course: Course;
    lesson: Lesson;
    badges: Badge[];
    user: JwtUserPayload;
    maxPrompts: number;
    lang: CourseLang;
    langLinks: Partial<Record<CourseLang, string>>;
  };

  $: t = COURSE_TEXTS[data.lang];
  $: paths = coursePaths(data.lang);

  let maxPromptsOnBadge = 0;

  async function newBadge() {
    maxPromptsOnBadge = data.maxPrompts;
    const formData = {
      lessonId: data.lesson.id
    };
    const response = await fetch(resolve('/api/badge'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formData,
        action: 'createLessonBadge'
      })
    });

    if (response.ok) {
      const newBadge = await response.json();
      data.badges = [...data.badges, newBadge.badge];
    } else {
      console.error('Error creating badge:', response.statusText);
    }
  }

  onMount(() => {
    if (data.badges.length === 0) {
      newBadge();
    }
    maxPromptsOnBadge = data.badges[0]?.promptsTried || 0;
  });
</script>

<Header
  navItems={[
    { name: t.navCourses, href: paths.courses },
    { name: data.course.name, href: paths.course(data.course.URL) },
    { name: data.lesson.lessonName, href: paths.lesson(data.course.URL, data.lesson.URL) },
    { name: 'Badge', href: paths.badge(data.course.URL, data.lesson.URL) }
  ]}
  user={data.user}
  lang={data.lang}
  langLinks={data.langLinks}
/>

<main>
  <h1>{t.badgeTitle(data.user.email)}</h1>
  <h2>{t.badgeFor} <b>{data.lesson.lessonName}</b> {t.badgeInCourse} <b>{data.course.name}</b></h2>

  {#each data.badges as badge}
    <BadgeRender {badge} lesson={data.lesson} user={data.user} lang={data.lang} />
  {/each}

  {#if data.maxPrompts && maxPromptsOnBadge && data.maxPrompts > maxPromptsOnBadge}
    <button on:click={newBadge}>{t.newBadge(data.maxPrompts)}</button>
  {/if}
</main>
