<script lang="ts">
  import type { JwtUserPayload } from '$lib/server/jwt';
    import type { Course, Lesson } from '@prisma/client';

  export let course: Course;
  export let lesson: Lesson;
  export let user: JwtUserPayload;
  export let userStars: number; // Add userStars prop
  import { onMount } from 'svelte';
    
  
  let percentReached = 0; 


    onMount(() => {
      getQuizResults();
    });

  async function getQuizResults() {
    try {

      const answerData = {
        userId: user.id,
        lessonId: lesson.id
      };


      const response = await fetch('/api/quiz' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getQuizResults",
          answerData
        })
      });

      const result = await response.json();
      // console.log("getUserProgressElementAi1:", result);
      if (result.success) {
        // console.log("getQuizResults:", result);
        percentReached = result.percentReached;
      } 
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }




  
</script>

<section class="quiz-link">
  <h2><i class="fas fa-tasks"></i> Quiz</h2>
  

    {#if course.displayType && course.displayType.includes("aufgabe")}
      <p>Zum Abschluss dieser Lektion benötigen Sie:
      {#each Array(lesson.starsNeeded) as _, i}
        <i class="fas fa-clipboard-check" aria-hidden="true"></i>
      {/each}
      </p>
      <p>
    Von Ihnen absolvierte Aufgaben:
      {#each Array(userStars) as _, i}
        <i class="fas fa-clipboard-check link-color"></i>
      {/each}

      </p>
    {:else}
       <p>Zum Abschluss dieser Lektion benötigen Sie:
      {#each Array(lesson.starsNeeded) as _, i}
        <i class="fa fa-star" aria-hidden="true"></i>
      {/each}
      </p>
      <p>
      Von Ihnen gesammelte Sterne:
      {#each Array(userStars) as _, i}
        <i class="fa fa-star star-color" aria-hidden="true"></i>
      {/each}
      </p>

    {/if}
  
  {#if userStars >= lesson.starsNeeded}

    {#if percentReached > 0}
      <p>Ihr bester Versuch liegt bei {percentReached}%.</p>
      <a class="quiz-btn" href="/kurs/{course.URL}/{lesson.URL}/quiz">Quiz erneut starten</a>
    {:else}
      <a class="quiz-btn" href="/kurs/{course.URL}/{lesson.URL}/quiz">Quiz starten</a>

    {/if}

  {:else}
    {#if course.displayType && course.displayType.includes("aufgabe")}
      <p>Sie haben noch nicht genügend Aufgaben abgeschlossen, um das Quiz zu starten.</p>
    {:else}
      <p>Sie haben noch nicht genügend Sterne gesammelt, um das Quiz zu starten.</p>
    {/if}
  {/if}
  
  
</section>