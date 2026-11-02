<script lang="ts">
  import type { Course } from '@prisma/client';
  import { coursePaths, type CourseLang } from '$lib/courseLang';
  import { courseHref } from './href';

  export let course: Course;
  export let lang: CourseLang = 'de';
</script>

{#if course.active == 1}
  <a href={courseHref(coursePaths(lang).course(course.URL))} class="course-link course"><h2>{course.name}</h2>
    {@html course.description}
  </a>
{/if}

{#if course.active == 2}
  <div class="course inactive-link"><h2>{course.name}</h2>
    {@html course.description}
  </div>
{/if}

<style>
  .course {
    background-color: white;
    padding: 1em;
    border-radius: 25px;
    transition: all 0.3s;
    outline: 5px solid transparent;
    width: 100%;
    margin-bottom: 20px;
  }

  a.course-link {
    text-decoration: none;
    color: black;
    display: block;
  }
  .course-link:hover {
    outline: 5px solid var(--color-primary);
  }

  .inactive-link {
    cursor: default;
    opacity: 0.7;
  }
</style>
