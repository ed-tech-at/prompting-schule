<script lang="ts">
  import type { Course, Lesson, Badge } from '@prisma/client';
import { onMount } from 'svelte';
    import LessonRender from './LessonRender.svelte';
    import Header from '$lib/Header.svelte';

  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: {course: Course, lessons: Lesson[], user: JwtUserPayload, latestBadge: Badge[]}; 



</script>

<Header navItems={[{ name: 'Courses', href: '/en/courses' }, { name: data.course.name, href: '/en/course/' + data.course.URL }]} user={data.user} lang="en" />
<main>
<h1>Course: {data.course.name}</h1>

<div>{@html data.course.introDescription}</div>

<div class={"displayType-" + data.course.displayType + " lessons"}>
{#each data.lessons as lesson}
  <LessonRender course={data.course} {lesson} userId={data.user.id} latestBadge={data.latestBadge[lesson.id]} />
{/each}
</div>

<style>
  .lessons {
    
    display: flex;
    /* grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); */
    gap: 2rem;
    flex-wrap: wrap;
    justify-content: center;
    margin: 1rem;


  }
  @media (min-width: 1220px) {
    .lessons.displayType-flex {
      flex-wrap: nowrap;
    }
  }
  @media (max-width: 1220px) {
    .lessons {
      flex-direction: column;
      align-content: space-around;
    }
  }
</style>

</main>