<script lang="ts">
  import type { Course, Lesson, Badge } from '@prisma/client';
  import Header from '$lib/Header.svelte';
  import LessonRender from './LessonRender.svelte';
  import type { JwtUserPayload } from '$lib/server/jwt';
  import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';

  export let data: {
    course: Course;
    lessons: Lesson[];
    user: JwtUserPayload;
    latestBadge: Record<number, Badge>;
    lang: CourseLang;
    langLinks: Partial<Record<CourseLang, string>>;
  };

  $: t = COURSE_TEXTS[data.lang];
  $: paths = coursePaths(data.lang);
</script>

<Header
  navItems={[
    { name: t.navCourses, href: paths.courses },
    { name: data.course.name, href: paths.course(data.course.URL) }
  ]}
  user={data.user}
  lang={data.lang}
  langLinks={data.langLinks}
/>
<main>
  <h1>{t.coursePrefix}: {data.course.name}</h1>

  <div>{@html data.course.introDescription}</div>

  <div class={"displayType-" + data.course.displayType + " lessons"}>
    {#each data.lessons as lesson}
      <LessonRender
        course={data.course}
        {lesson}
        userId={data.user.id}
        latestBadge={data.latestBadge[lesson.id]}
        lang={data.lang}
      />
    {/each}
  </div>

  <div>{@html data.course.introDescriptionSuffix}</div>
</main>

<style>
  .lessons {
    display: flex;
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
