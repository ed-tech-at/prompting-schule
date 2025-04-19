<script lang="ts">

  import type { Course, Lesson, User } from '@prisma/client';

  import { onMount } from 'svelte';


  export let course: Course ;
  export let lesson: Lesson ;
  export let userId: String;

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
      if (result.success && result.percentReached) {
        console.log("getQuizResults:", result);
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
  Badges: <a href='/kurs/{course.URL}/{lesson.URL}/badge' class="button badge-link">Badge Erstellen</a>
</div>

</div>

<style>

  .lessonWrapper {
    width: 400px;

  }

  .lesson, .badges {
    background-color: white;
    padding: 1em;
    border-radius: 25px;
    /* min-width: 360px; */
    /* width: 100%; */
    /* flex-grow: 1; */
    transition: all 0.3s;
    outline: 5px solid transparent;
    /* flex-shrink: 1; */

  }

  .lesson {
    border-radius: 25px 25px 0 0;
  }
  .badges {
    border-radius: 0 0 25px 25px;
    margin-top: 10px;
    background-color: var(--color-primary);
    color: white;
  }

  @media (max-width: 500px) {
    .lessonWrapper {
      width: 290px;
    }
  }

  a.lesson-link {
    text-decoration: none;
    color: black;
    display: block;
    
    
    
  }
  .lesson:hover {
    outline: 5px solid var(--color-primary);
  }
  h2 {
    text-align: center;
  }
  .emoji {
    font-size: 3em;
    text-align: center;
    margin-bottom: 0em;
  }

  
</style>