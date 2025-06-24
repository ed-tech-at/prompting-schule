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
 <a href="/en/course/{course.URL}/{lesson.URL}" class={"lesson-link lesson"}>
  <h2>{lesson.lessonName}</h2>
  <div class="emoji">{lesson.lessonEmoji}</div>
 
  {#if lesson.starsNeeded > 0}  
  
    <p>To complete this lesson, you need:
    {#each Array(lesson.starsNeeded) as _, i}
      <i class="fa fa-star" aria-hidden="true"></i>
    {/each}
    </p>
    
    <p>
    Total stars:
    {#each Array(userStars) as _, i}
      <i class="fa fa-star star-color" aria-hidden="true"></i>

    
    {/each}
    {#if percentReached > 0}
    <p>Your best quiz attempt is {percentReached}%.</p>


    {/if}
    </p>
    {/if}
</a>

<div class="badges">
  <p class="badge-label">Digital Badge</p>
  
  {#if latestBadge}
    <a href='/en/course/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Show badge from {new Date(latestBadge.createdAt).toLocaleDateString('de-DE')}
    </a>
  {:else if percentReached >= 75 && lesson.starsNeeded > 0}
    <a href='/en/course/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Create badge
    </a>
  {:else if lesson.starsNeeded > 0}
    <p>Complete the quiz with at least 75% for the badge.</p>
  {:else if promptsTried > 0 && lesson.starsNeeded == 0}
    <a href='/en/course/{course.URL}/{lesson.URL}/badge' class="button badge-link">
    Create badge
    </a>
  {:else}
    <p>Work on the lesson for a badge.</p>
  {/if}

  

</div>

</div>

<style>

</style>