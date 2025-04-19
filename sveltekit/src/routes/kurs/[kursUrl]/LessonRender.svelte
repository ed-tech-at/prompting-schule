<script lang="ts">

  import type { Badge, Course, Lesson, User } from '@prisma/client';

  import { onMount } from 'svelte';


  export let course: Course ;
  export let lesson: Lesson ;
  export let userId: String;
  export let latestBadge: Badge;


  let percentReached = 0; 

  let userStars = 0;

  onMount(() => {
      getQuizResults();
      updateUserStars();
    });

    async function updateUserStars() {

      const data = {
        userId: userId,
        lessonId: lesson.id
      };

    const response = await fetch('/api/userProgress' , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "getLessonStars",
      data
    })
    });
    const result = await response.json();
    userStars = result.stars;
  }

  async function getQuizResults() {
    try {
      const answerData = {
        userId: userId,
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
      if (result.success && result.percentReached) {
        // console.log("getQuizResults:", result);
        percentReached = result.percentReached;
      } 
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }


</script>

<div class="lessonWrapper">
 <a href="/kurs/{course.URL}/{lesson.URL}" class={"lesson-link lesson"}>
  <h2>{lesson.lessonName}</h2>
  <div class="emoji">{lesson.lessonEmoji}</div>
 
  {#if lesson.starsNeeded > 0}  
  
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
    {#if percentReached > 0}
    <p>Dein bester Quiz-Versuch liegt bei {percentReached}%.</p>


    {/if}
    </p>
    {/if}
</a>

<div class="badges">
  <label>Digital Badge</label>
  
  {#if latestBadge}
    <a href='/kurs/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Badge vom {new Date(latestBadge.createdAt).toLocaleDateString('de-DE')} anzeigen
    </a>
  {:else if percentReached >= 75}
    <a href='/kurs/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Badge erstellen
    </a>
  {:else}
    <p>Schließe das Quiz mit mindestens 75&nbsp;% für den Badge ab.</p>
  {/if}
  

</div>

</div>

<style>

</style>