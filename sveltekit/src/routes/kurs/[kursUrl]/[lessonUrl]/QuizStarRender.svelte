<script lang="ts">
  export let course: Course;
  export let lesson: Lesson;
  export let userId: String;
  export let userStars: number; // Add userStars prop
  import { onMount } from 'svelte';
    
  
  let percentReached = 0; 


    onMount(() => {
      getQuizResults();
    });

  async function getQuizResults() {
    try {
      const response = await fetch('/api/quiz' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getQuizResults",
          answerData: JSON.stringify({
            userId: userId, 
            lessonId: lesson.id 
          })
        })
      });

      const result = await response.json();
      // console.log("getUserProgressElementAi1:", result);
      if (result.success) {
        console.log("getQuizResults:", result);
        percentReached = result.percentReached;
      } 
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }




  
</script>

<section class="quiz-link">
  <h2>Quiz</h2>
  <p>Zum Abschluss dieser Lektion benötigst du:
  {#each Array(lesson.starsNeeded) as _, i}
    <i class="fa fa-star" aria-hidden="true"></i>
  {/each}
  </p>
  <p>
  Von dir gesammelte Sterne:
  {#each Array(userStars) as _, i}
    <i class="fa fa-star star-color" aria-hidden="true"></i>
  {/each}
  </p>
  {#if userStars >= lesson.starsNeeded}

    {#if percentReached > 0}
      <p>Dein bester Versuch liegt bei {percentReached}%.</p>
      <a class="quiz-btn" href="/kurs/{course.URL}/{lesson.URL}/quiz">Quiz erneut starten</a>
    {:else}
      <a class="quiz-btn" href="/kurs/{course.URL}/{lesson.URL}/quiz">Quiz starten</a>

    {/if}

  {:else}
    <p>Du hast noch nicht genügend Sterne gesammelt, um das Quiz zu starten.</p>
  {/if}
  
  
</section>