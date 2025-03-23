<script lang="ts">
    import type { Course, Lesson } from '@prisma/client';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  // import CourseRender from './CourseRender.svelte';
      
      import Header from '$lib/Header.svelte';
  
    // export let data: {courses: Course[]}; 
  
  
    let userId = "";
    let email = "";
    
    if (browser) {
        userId = localStorage.getItem("userId");
        email = localStorage.getItem("userEmail");
        console.log("Benutzer-ID:", userId);
        if (!userId) {
          window.location.href = "/login";
        }
    }
  
  
  </script>
  
  <Header navItems={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Profil', href: '/profil' }]} />
  <main>
    <h1>Profil</h1>
    <p>E-Mail: {email}</p>

    <a href="/dashboard" style="display: inline-block; color: var(--color-black); background: var(--color-secondary); padding: 1em 2em; border-radius: 15px; margin-bottom: 3em;">Zum Kurse - Dashboard</a>
    <br>

    <a href="/logout">Logout</a>

    <!-- <form action="/api/user" method="POST">
      <label for="old">Altes Passwort:</label>
      <input type="password"  name="old">
      <label for="password">Neues Passwort:</label>
      <input type="password" id="password" name="new">
      <button type="submit">Passwort ändern</button>
      </form>  -->
  
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