<script lang="ts">
//   import type { Course, Lesson } from '@prisma/client';
// import { onMount } from 'svelte';
// import { browser } from '$app/environment';
// // import CourseRender from './CourseRender.svelte';
    
    import Header from '$lib/Header.svelte';

//   // export let data: {courses: Course[]}; 


//   let userId = "";
//   let email = "";
  
//   if (browser) {
//       // userId = localStorage.getItem("userId");
//       // email = localStorage.getItem("userEmail");
//       // console.log("Benutzer-ID:", userId);
//       localStorage.removeItem("userId");
//       localStorage.removeItem("userEmail");
//       localStorage.removeItem("isAdmin");
//   }


</script>

<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Logout', href: '/en/logout' }]} user={null} />
<main>
  <h1>Logout</h1>
  
  <p>You were logged out.</p>

  <a href="/">Frontpage</a>
</main>