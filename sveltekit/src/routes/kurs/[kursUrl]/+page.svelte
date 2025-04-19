<script lang="ts">
  import type { Course, Lesson, Badge } from '@prisma/client';
import { onMount } from 'svelte';
    import LessonRender from './LessonRender.svelte';
    import Header from '$lib/Header.svelte';

  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: {course: Course, lessons: Lesson[], user: JwtUserPayload, latestBadge: Badge[]}; 



</script>

<Header navItems={[{ name: 'Kurs', href: '/dashboard' }, { name: data.course.name, href: '/kurs/' + data.course.URL }]} user={data.user} />
<main>
<h1>Kurs: {data.course.name}</h1>

<div class={"displayType-" + data.course.displayType + " lessons"}>
{#each data.lessons as lesson}
  <LessonRender course={data.course} {lesson} userId={data.user.id} latestBadge={data.latestBadge[lesson.id]} />
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
    .lessons.displayType-flex {
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