<script lang="ts">
  import type { Course, Element as LessonElement, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ElementRender from './ElementRender.svelte';
  import Header from '$lib/Header.svelte';
  import QuizStarRender from './QuizStarRender.svelte';
  
  import { resolve } from '$app/paths';


  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: {
    course: Course;
    lesson: Lesson;
    elements: LessonElement[];
    user: JwtUserPayload;
  };

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
    const response = await fetch(resolve('/api/userProgress') , {
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
  export function fill1(sender: HTMLElement) {
    const row = sender.closest('tr');
    const b = row?.children[1]?.textContent?.trim() ?? '';
    const section = sender.closest('section');
    const textAreas = section?.querySelectorAll<HTMLTextAreaElement>('.prompt') ?? [];
    if (textAreas.length >= 2) {
  textAreas[0].value = b;
  // textAreas[1].textContent = b;
textAreas[0].dispatchEvent(new Event('input'));
// textAreas[1].dispatchEvent(new Event('input'));
    }

  }

  // Define a function that can be called from the site
  export function fill2(sender: HTMLElement) {
    const row = sender.closest('tr');
    const b = row?.children[1]?.textContent?.trim() ?? '';
    const section = sender.closest('section');
    const textAreas = section?.querySelectorAll<HTMLTextAreaElement>('.prompt') ?? [];
    if (textAreas.length >= 2) {
      // textAreas[0].textContent = b;
      textAreas[1].value = b;
      // textAreas[0].dispatchEvent(new Event('input'));
      textAreas[1].dispatchEvent(new Event('input'));
    }

  }
  // Define a function that can be called from the site
  export function fillMono(sender: HTMLElement) {
    const row = sender.closest('tr');
    const b = row?.children[1]?.textContent?.trim() ?? '';
    const section = sender.closest('section');
    const textAreas = section?.querySelectorAll<HTMLTextAreaElement>('.prompt') ?? [];
    if (textAreas.length >= 1) {
      textAreas[0].value = b;
      // textAreas[1].textContent = b;
      textAreas[0].dispatchEvent(new Event('input'));
      // textAreas[1].dispatchEvent(new Event('input'));
    }

  }
  export function fillSide(sender: HTMLElement) {
    const row = sender.closest('tr');
    const a = row?.children[0]?.textContent?.trim() ?? '';
    const b = row?.children[1]?.textContent?.trim() ?? '';
    const section = sender.closest('section');
    const textAreas = section?.querySelectorAll<HTMLTextAreaElement>('.prompt') ?? [];
    if (textAreas.length >= 2) {
      textAreas[0].value = a;
      textAreas[1].value = b;
      textAreas[0].dispatchEvent(new Event('input'));
      textAreas[1].dispatchEvent(new Event('input'));
    }

  }

  if (browser) {
    const appWindow = window as typeof window & {
      fillSide: typeof fillSide;
      fill1: typeof fill1;
      fill2: typeof fill2;
      fillMono: typeof fillMono;
    };
    appWindow.fillSide = fillSide;
    appWindow.fill1 = fill1;
    appWindow.fill2 = fill2;
    appWindow.fillMono = fillMono;
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
  <!-- <a href={resolve(`/kurs/${data.course.URL}/${data.lesson.URL}/edit`)}>Lektion bearbeiten</a> -->
  <pre>Lektion ID {data.lesson.id}</pre>
{/if}


</main>
