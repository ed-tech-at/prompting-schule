<script lang="ts">
  import type { Course, Lesson } from '@prisma/client';
import { onMount } from 'svelte';
import { browser } from '$app/environment';
    import LessonRender from './LessonRender.svelte';
    import Header from '$lib/Header.svelte';

  export let data: {course: Course, lessons: Lesson[]}; 


  let userId = "";
  
  if (browser) {
      userId = localStorage.getItem("userId");
      console.log("Benutzer-ID:", userId);
      if (!userId) {
          window.location.href = "/login";
        }
  }


</script>

<Header navItems={[{ name: 'Kurs', href: '/dashboard' }, { name: data.course.name, href: '/kurs/' + data.course.URL }]} />
<main>
<h1>Kurs: {data.course.name}</h1>

<div class="lessons">
{#each data.lessons as lesson}
  <LessonRender course={data.course} {lesson} {userId} />
{/each}
</div>

<style>
  .lessons {
    
    display: flex;
    /* grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); */
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
    margin: 1rem;


  }
  @media (min-width: 1200px) {
    .lessons {
      flex-wrap: nowrap;
    }
  }
  @media (max-width: 1200px) {
    .lessons {
      flex-direction: column;
      align-content: space-around;
    }
  }
</style>

</main>