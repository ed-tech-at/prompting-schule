<script lang="ts">
  import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ElementRender from './ElementRender.svelte';
  import Header from '$lib/Header.svelte';
  import Footer from '$lib/Footer.svelte'; 
  import QuizStarRender from './QuizStarRender.svelte';
  import { on } from 'svelte/events';
  
  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: {course: Course, lesson: Lesson, elements: Element[], user: JwtUserPayload}; 

  // let userId = "";
  // let isAdmin = 0;

  // if (browser) {
  //     userId = localStorage.getItem("userId");
  //     console.log("Benutzer-ID:", userId);
  //     if (!userId) {
  //         window.location.href = "/login";
  //       }

  //       if (localStorage.getItem("isAdmin")) {
  //         isAdmin = localStorage.getItem("isAdmin");
  //       }
  // }


  let userStars = 0;
  
  onMount(() => {
    updateUserStars();
  });

  async function updateUserStars() {
    const requestData = {
      userId: data.user.id,
      lessonId: data.lesson.id
    };
    const response = await fetch('/api/userProgress' , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "getLessonStars",
      data: requestData
    })
    });
    const result = await response.json();
    userStars = result.stars;
  }

 
  // Define a function that can be called from the site
  export function fill1(sender) {
    const row = sender.closest('tr');
    // const a = row.children[0].textContent.trim();
    const b = row.children[1].textContent.trim();
    const section = sender.closest('section');
    const textAreas = section.querySelectorAll('.prompt');
    if (textAreas.length >= 2) {
  textAreas[0].value = b;
  // textAreas[1].textContent = b;
textAreas[0].dispatchEvent(new Event('input'));
// textAreas[1].dispatchEvent(new Event('input'));
    }

  }

  // Define a function that can be called from the site
  export function fill2(sender) {
    const row = sender.closest('tr');
    // const a = row.children[0].textContent.trim();
    const b = row.children[1].textContent.trim();
    const section = sender.closest('section');
    const textAreas = section.querySelectorAll('.prompt');
    if (textAreas.length >= 2) {
      // textAreas[0].textContent = b;
      textAreas[1].value = b;
      // textAreas[0].dispatchEvent(new Event('input'));
      textAreas[1].dispatchEvent(new Event('input'));
    }

  }
  // Define a function that can be called from the site
  export function fillMono(sender) {
    const row = sender.closest('tr');
    // const a = row.children[0].textContent.trim();
    const b = row.children[1].textContent.trim();
    const section = sender.closest('section');
    const textAreas = section.querySelectorAll('.prompt');
    if (textAreas.length >= 1) {
      textAreas[0].value = b;
      // textAreas[1].textContent = b;
      textAreas[0].dispatchEvent(new Event('input'));
      // textAreas[1].dispatchEvent(new Event('input'));
    }

  }
  export function fillSide(sender) {
    const row = sender.closest('tr');
    const a = row.children[0].textContent.trim();
    const b = row.children[1].textContent.trim();
    const section = sender.closest('section');
    const textAreas = section.querySelectorAll('.prompt');
    if (textAreas.length >= 2) {
      textAreas[0].value = a;
      textAreas[1].value = b;
      textAreas[0].dispatchEvent(new Event('input'));
      textAreas[1].dispatchEvent(new Event('input'));
    }

  }

  if (browser) {
    window.fillSide = fillSide;
    window.fill1 = fill1;
    window.fill2 = fill2;
    window.fillMono = fillMono;
  }

</script>
<Header navItems={[{ name: 'Courses', href: '/en/courses' }, { name: data.course.name, href: '/en/course/' + data.course.URL }, { name: data.lesson.lessonName, href: '/en/course/' + data.course.URL + '/' + data.lesson.URL }]} user={data.user} lang="en" />
<main>

{#if data.course.displayType?.includes("labor")}
  <h1>Lesson: {data.lesson.lessonName}</h1>
{/if}

<!-- {#if data.course.displayType != "labor"}
<QuizStarRender course={data.course} lesson={data.lesson} user={data.user} {userStars} />
{/if} -->



{#each data.elements as element}
  <ElementRender course={data.course} lesson={data.lesson} {element} user={data.user} updateUserStars={updateUserStars} />
{/each}

{#if data.course.displayType != "labor"}
<QuizStarRender course={data.course} lesson={data.lesson} user={data.user} {userStars} />
{/if}

{#if data.user.isAdmin > 0}
  <!-- <a href="/kurs/{data.course.URL}/{data.lesson.URL}/edit">Lektion bearbeiten</a> -->
  <pre>Lektion ID {data.lesson.id}</pre>
{/if}


</main>