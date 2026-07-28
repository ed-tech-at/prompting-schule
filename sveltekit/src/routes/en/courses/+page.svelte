<script lang="ts">
    import type { Course } from '@prisma/client';
  import CourseRender from './CourseRender.svelte';
      
      import Header from '$lib/Header.svelte';
    import type { JwtUserPayload } from '$lib/server/jwt';
  
    export let data: {courses: Course[], user: JwtUserPayload}; 
  
  
  </script>
  
  <Header navItems={[{ name: 'Courses', href: '/en/courses' }]} user={data.user} lang="en" />
  <main>
  <h1>Overview of Courses</h1>

  <div class="courses">
  {#each data.courses as course}
    <CourseRender course={course} />
  {/each}
  </div>
  
  <style>
   
  </style>
  
  </main>
