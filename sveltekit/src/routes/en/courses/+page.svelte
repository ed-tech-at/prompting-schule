<script lang="ts">
    import type { Course } from '@prisma/client';
  import CourseRender from './CourseRender.svelte';
      
      import Header from '$lib/Header.svelte';
    import InfoBlocks from '$lib/InfoBlocks.svelte';
    import type { JwtUserPayload } from '$lib/server/jwt';
    import type { InfoBlockView } from '$lib/infoblocks';

    export let data: {courses: Course[], user: JwtUserPayload, infoBlocks: InfoBlockView[]};
  
  
  </script>
  
  <Header navItems={[{ name: 'Courses', href: '/en/courses' }]} user={data.user} lang="en" />
  <main>
  <h1>Overview of Courses</h1>

  <InfoBlocks blocks={data.infoBlocks ?? []} />

  <div class="courses">
  {#each data.courses as course}
    <CourseRender course={course} />
  {/each}
  </div>
  
  <style>
   
  </style>
  
  </main>
