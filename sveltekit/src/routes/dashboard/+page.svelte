<script lang="ts">
    import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import CourseRender from './CourseRender.svelte';
      
      import Header from '$lib/Header.svelte';
  
    export let data: {courses: Course[]}; 
  
  
    let userId = "";
    
    if (browser) {
        userId = localStorage.getItem("userId");
        console.log("Benutzer-ID:", userId);
        if (!userId) {
          window.location.href = "/login";
        }
    }
  
  
  </script>
  
  <Header navItems={[{ name: 'Dashboard', href: '/dashboard' }]} />
  <main>
  <h1>Kurse - Dashboard</h1>
  
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
    } */
  </style>
  
  </main>