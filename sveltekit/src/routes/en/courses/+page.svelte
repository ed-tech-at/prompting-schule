<script lang="ts">
    import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import CourseRender from './CourseRender.svelte';
      
      import Header from '$lib/Header.svelte';
    import type { JwtUserPayload } from '$lib/server/jwt';
  
    export let data: {courses: Course[], user: JwtUserPayload}; 
  
  
    let userId = "";
    // export let user: JwtUserPayload; 
    
    if (browser) {
        // console.log ("user", data.user);
        userId = data.user.id;
        // console.log("Benutzer-ID:", userId);
        // if (!userId) {
          // window.location.href = "/login";
        // }
    }
  
  
  </script>
  
  <Header navItems={[{ name: 'Courses', href: '/en/courses' }]} user={data.user} lang="en" />
  <main>
  <h1>Overview of Courses</h1>

  <div class="courses">
  {#each data.courses as course}
    <CourseRender course={course}  {userId} />
  {/each}
  </div>
  
  <style>
   
  </style>
  
  </main>