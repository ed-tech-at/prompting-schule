<script lang="ts">
    import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import CourseRender from './CourseRender.svelte';
      
      import Header from '$lib/Header.svelte';
    import InfoBlocks from '$lib/InfoBlocks.svelte';
    import type { JwtUserPayload } from '$lib/server/jwt';
    import type { InfoBlockView } from '$lib/infoblocks';

    export let data: {courses: Course[], user: JwtUserPayload, infoBlocks: InfoBlockView[]};
  
  
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

  <InfoBlocks blocks={data.infoBlocks ?? []} />

  <div class="courses">
  {#each data.courses as course}
    <CourseRender course={course}  {userId} />
  {/each}
  </div>
  
  <style>
   
  </style>
  
  </main>