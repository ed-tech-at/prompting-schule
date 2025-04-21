<script lang="ts">
  import Header from '$lib/Header.svelte';

  import type { Badge, Course, Lesson, QuizQuestion } from '@prisma/client';
  import type { JwtUserPayload } from '$lib/server/jwt';
  import { onMount } from 'svelte';
    import BadgeRender from './BadgeRender.svelte';

  export let data: { course: Course, lesson: Lesson, quizQuestions: QuizQuestion[], badges: Badge[], user: JwtUserPayload, maxPrompts: number };

  let maxPromptsOnBadge = 0;
  


  let badgeDataUrl = '';

  async function newBadge() {
    maxPromptsOnBadge = data.maxPrompts;
    const formData = {
      lessonId: data.lesson.id,
    }
    const response = await fetch('/api/badge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formData,
        action: 'createLessonBadge',
      })
    });

    if (response.ok) {
      const newBadge = await response.json();
      // console.log('Badge created:', newBadge.badge);
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

<Header navItems={[{ name: 'Kurse', href: '/kurse' }, { name: data.course.name, href: '/kurs/' + data.course.URL }, { name: data.lesson.lessonName, href: '/kurs/' + data.course.URL + '/' + data.lesson.URL }, {name: "Badge",  href: '/kurs/' + data.course.URL + '/' + data.lesson.URL + "/badge" }]} user={data.user}  />

<main>

<h1>Digital Badge von {data.user.email}</h1>
<h2>für die Lektion <b>{data.lesson.lessonName}</b> im Kurs <b>{data.course.name}</b></h2>


{#each data.badges as badge}
  <BadgeRender {badge} lesson={data.lesson} user={data.user} />
{/each}

{#if data.maxPrompts && maxPromptsOnBadge && data.maxPrompts > maxPromptsOnBadge}
  <button on:click={newBadge}>Neuen Badge mit {data.maxPrompts} Prompts erstellen</button>
{/if}



</main>