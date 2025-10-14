<script lang="ts">

  import type { Badge, Course, Lesson, User } from '@prisma/client';

  import { onMount } from 'svelte';


  export let course: Course ;
  export let lesson: Lesson ;
  export let userId: String;
  export let latestBadge: Badge;


  let percentReached = 0; 
  let promptsTried = 0; 

  let userStars = 0;

  onMount(() => {
      getQuizResultsOrPromptsTried();
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

  async function getQuizResultsOrPromptsTried() {
    try {
      const answerData = {
        userId: userId,
        lessonId: lesson.id
      };

      let action = "getQuizResults";
      if (lesson.starsNeeded == 0) {
        action = "getPromptsTried";
      }


      const response = await fetch('/api/quiz' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          answerData
        })
      });

      const result = await response.json();
      // console.log("getUserProgressElementAi1:", result);
      if (result.success && result.percentReached) {
        // console.log("getQuizResults:", result);
        percentReached = result.percentReached;
      } 
      if (result.success && result.promptsTried) {
        // console.log("getPromptsTried:", result);
        promptsTried = result.promptsTried;
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
  
    {#if course.displayType && course.displayType.includes("aufgabe")}

      <p>Diese Lektion enthält:
      {#each Array(lesson.starsNeeded) as _, i}
        <i class="fas fa-clipboard" aria-hidden="true"></i>
      {/each}
      </p>
      
      <p>
      Von Ihnen absolvierte Aufgaben:
      {#each Array(userStars) as _, i}
        <i class="fa fa-clipboard-check star-color" aria-hidden="true"></i>
      {/each}
    </p>

    
    {:else}
      <p>Zum Abschluss dieser Lektion benötigen Sie:
      {#each Array(lesson.starsNeeded) as _, i}
        <i class="fa fa-star" aria-hidden="true"></i>
      {/each}
      </p>
      
      <p>
      Gesammelte Sterne:
      {#each Array(userStars) as _, i}
        <i class="fa fa-star star-color" aria-hidden="true"></i>
      {/each}
     </p>

    {/if}


    {#if percentReached > 0}
      <p>Ihr bester Quiz-Versuch liegt bei {percentReached}%.</p>
    {/if}

    {/if}
</a>

<div class="badges">
  <p class="badge-label">Digital Badge</p>
  
  {#if latestBadge}
    <a href='/kurs/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Badge vom {new Date(latestBadge.createdAt).toLocaleDateString('de-DE')} anzeigen
    </a>
  {:else if percentReached >= 75 && lesson.starsNeeded > 0}
    <a href='/kurs/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Badge erstellen
    </a>
  {:else if lesson.starsNeeded > 0}
    <p>Schließe das Quiz mit mindestens 75&nbsp;% für den Badge ab.</p>
  {:else if promptsTried > 0 && lesson.starsNeeded == 0}
    <a href='/kurs/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Badge erstellen
    </a>
  {:else}
    <p>Bearbeite die Lektion für einen Badge.</p>
  {/if}

  

</div>

</div>

<style>

</style>