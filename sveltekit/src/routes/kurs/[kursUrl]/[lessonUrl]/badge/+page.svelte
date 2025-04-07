<script lang="ts">
  import Header from '$lib/Header.svelte';

  import type { Badge, Course, Lesson, QuizQuestion } from '@prisma/client';
  import type { JwtUserPayload } from '$lib/server/jwt';
  import { onMount } from 'svelte';

  export let data: { course: Course, lesson: Lesson, quizQuestions: QuizQuestion[], badges: Badge[], user: JwtUserPayload };


  async function newBadge() {
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
      console.log('Badge created:', newBadge.badge);
      data.badges = [...data.badges, newBadge.badge];
    } else {
      console.error('Error creating badge:', response.statusText);
    }
  }

  onMount(() => {
    if (data.badges.length === 0) {
      newBadge();
    }
  });

</script>

<Header navItems={[{ name: 'Kurs', href: '/dashboard' }, { name: data.course.name, href: '/kurs/' + data.course.URL }, { name: data.lesson.lessonName, href: '/kurs/' + data.course.URL + '/' + data.lesson.URL }, {name: "Badge",  href: '/kurs/' + data.course.URL + '/' + data.lesson.URL + "/badge" }]} user={data.user}  />

<main>

<h1>Badge herunterladen</h1>
<h2>für Lektion "{data.lesson.lessonName}" für {data.user.email}</h2>

Badges:

{#each data.badges as badge}
  <div>Badge ausgestellt am: {new Date(badge.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} 
    <br>
    Link: {badge.hash}</div>

{/each}

<button on:click={newBadge}>Neuen Badge erstellen</button>


</main>