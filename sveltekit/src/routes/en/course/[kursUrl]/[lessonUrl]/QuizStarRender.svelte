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
  <h2>Quiz</h2>
  <p>To complete this lesson, you need:
  {#each Array(lesson.starsNeeded) as _, i}
    <i class="fa fa-star" aria-hidden="true"></i>
  {/each}
  </p>
  <p>
  Stars collected from you:
  {#each Array(userStars) as _, i}
    <i class="fa fa-star star-color" aria-hidden="true"></i>
  {/each}
  </p>
  {#if userStars >= lesson.starsNeeded}

    {#if percentReached > 0}
      <p>Your best attempt is at {percentReached}%.</p>
      <a class="quiz-btn" href="/en/course/{course.URL}/{lesson.URL}/quiz">Restart quiz</a>
    {:else}
      <a class="quiz-btn" href="/en/course/{course.URL}/{lesson.URL}/quiz">Start quiz</a>

    {/if}

  {:else}
    <p>You have not collected enough stars to start the quiz.</p>
  {/if}
  
  
</section>