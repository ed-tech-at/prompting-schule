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
  
  <Header navItems={[{ name: 'Kurse', href: '/kurse' }]} user={data.user} />
  <main>
  <h1>Übersicht der Kurse</h1>
  
  <div class="courses">
  {#each data.courses as course}
    <CourseRender course={course}  {userId} />
  {/each}
  </div>
  
  <style>
    h1 {
      padding-bottom: 1em;
    }
    /* .courses {
      
      display: flex;
      /* grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); */
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      margin: 1rem;
  
  
    }
    
    @media (min-width: 1220px) {
      .lessons {
        flex-wrap: nowrap;
      }
    }
    @media (max-width: 1220px) {
      .lessons {
        flex-direction: column;
        align-content: space-around;
      }
    } */
  </style>
  
  </main>