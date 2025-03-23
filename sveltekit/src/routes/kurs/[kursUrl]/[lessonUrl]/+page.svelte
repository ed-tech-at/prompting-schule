<script lang="ts">
  import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import ElementRender from './ElementRender.svelte';
  import Header from '$lib/Header.svelte';
  import Footer from '$lib/Footer.svelte'; 
  import QuizStarRender from './QuizStarRender.svelte';
  import { on } from 'svelte/events';
  

  export let data: {course: Course, lesson: Lesson, elements: Element[]}; 

  let userId = "";

  if (browser) {
      userId = localStorage.getItem("userId");
      console.log("Benutzer-ID:", userId);
      if (!userId) {
          window.location.href = "/login";
        }
  }


  let userStars = 0;
  
  onMount(() => {
    updateUserStars();
  });

  async function updateUserStars() {
    const response = await fetch('/api/userProgress' , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "getLessonStars",
      data: JSON.stringify({
        userId: userId,
        lessonId: data.lesson.id
      })
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
  textAreas[0].innerHTML = b;
  // textAreas[1].innerHTML = b;
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
      // textAreas[0].innerHTML = b;
      textAreas[1].innerHTML = b;
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
      textAreas[0].innerHTML = b;
      // textAreas[1].innerHTML = b;
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
      textAreas[0].innerHTML = a;
      textAreas[1].innerHTML = b;
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
<Header navItems={[{ name: 'Kurs', href: '/dashboard' }, { name: data.course.name, href: '/kurs/' + data.course.URL }, { name: data.lesson.lessonName, href: '/kurs/' + data.course.URL + '/' + data.lesson.URL }]} />
<main>

<h1>Lektion {data.lesson.lessonName}</h1>
<QuizStarRender course={data.course} lesson={data.lesson} {userId} {userStars} />


{#each data.elements as element}
  <ElementRender course={data.course} lesson={data.lesson} {element} {userId} updateUserStars={updateUserStars} />
{/each}

<QuizStarRender course={data.course} lesson={data.lesson} {userId} {userStars} />

<pre>Lektion ID {data.lesson.id}</pre>


</main>