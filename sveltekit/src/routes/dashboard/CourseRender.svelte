<script lang="ts">

  import type { Course, User } from '@prisma/client';

  import { onMount } from 'svelte';

  onMount(() => {
    showCourseForUser();
  });

  export let course: Course ;
  export let userId: String;


</script>


 <a href="/kurs/{course.URL}" class="course-link course"><h2>{course.name}</h2>
{@html course.description}
</a>



<style>

  .course {
    background-color: white;
    padding: 1em;
    border-radius: 25px;
    /* min-width: 360px; */
    /* width: 100%; */
    /* flex-grow: 1; */
    transition: all 0.3s;
    outline: 5px solid transparent;
    width: 100%;
    /* flex-shrink: 1; */
    margin-bottom: 20px;

  }

  a.course-link {
    text-decoration: none;
    color: black;
    display: block;
    
    
    
  }
  .course:hover {
    outline: 5px solid var(--color-primary);
  }
  h2 {
    /* text-align: center; */
    margin-bottom: 1em;
  }
  .emoji {
    font-size: 3em;
    text-align: center;
    margin-bottom: 0em;
  }

  
</style>