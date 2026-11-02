<script lang="ts">
  import type { Course } from '@prisma/client';
  import Header from '$lib/Header.svelte';
  import InfoBlocks from '$lib/InfoBlocks.svelte';
  import CourseRender from './CourseRender.svelte';
  import type { JwtUserPayload } from '$lib/server/jwt';
  import type { InfoBlockView } from '$lib/infoblocks';
  import { COURSE_TEXTS, coursePaths, type CourseLang } from '$lib/courseLang';

  export let data: {
    courses: Course[];
    user: JwtUserPayload;
    infoBlocks: InfoBlockView[];
    lang: CourseLang;
    langLinks: Partial<Record<CourseLang, string>>;
  };

  $: t = COURSE_TEXTS[data.lang];
</script>

<Header navItems={[{ name: t.navCourses, href: coursePaths(data.lang).courses }]} user={data.user} lang={data.lang} langLinks={data.langLinks} />
<main>
  <h1>{t.coursesTitle}</h1>

  <InfoBlocks blocks={data.infoBlocks ?? []} />

  <div class="courses">
    {#each data.courses as course}
      <CourseRender {course} lang={data.lang} />
    {/each}
  </div>
</main>
