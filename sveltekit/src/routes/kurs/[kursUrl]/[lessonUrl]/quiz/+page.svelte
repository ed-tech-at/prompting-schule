<script lang="ts">
  import Header from '$lib/Header.svelte';
  // import Footer from '$lib/Footer.svelte';
  import { onMount } from 'svelte';
  // import { browser } from '$app/environment';
  import type { Course, Lesson, QuizQuestion } from '@prisma/client';
  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: {course: Course, lesson: Lesson, quizQuestions: QuizQuestion[], user: JwtUserPayload}; 
  let userId = "";
  let userStars = 0;
  let isAdmin = 0;

  let quizResults = null; // Reactive variable to store quiz results
  let quizSubmitted = false; // Reactive variable to track if the quiz is submitted

  // if (browser) {
  //     userId = localStorage.getItem("userId");
  //     console.log("Benutzer-ID:", userId);
  //     if (!userId) {
  //         window.location.href = "/login";
  //       }
  //       if (localStorage.getItem("isAdmin")) {
  //         isAdmin = localStorage.getItem("isAdmin");
  //       }
  // }
  
  onMount(() => {
    // updateUserStars();
    // if (userStars >= data.lesson.starsNeeded) {
    //   console.log("User hat genug Sterne gesammelt");
    // } else {
    //   console.log("User hat noch nicht genug Sterne gesammelt");
    //   // window.location.href = `/kurs/${data.course.URL}/${data.lesson.URL}`;
    // }
  });

  async function updateUserStars() {
    const response = await fetch('/api/userProgress' , {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: "getLessonStars",
      data: JSON.stringify({
        userId: userId,
        lessonId: data.lesson.id
      })
    })
    });
    const result = await response.json();
    userStars = result.stars;
  }

  export async function handleSubmit (event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);

    let answers: Record<string, string | string[]> = {};

  for (const [key, value] of formData.entries()) {
    
    if (answers[key]) {
      
      (answers[key] as string[]).push(value as string);
    } else {
  
      answers[key] = [value as string];
    }
  }

  // console.warn(answers)
  
  const answerData = {
      courseId: data.course.id,
      lessonId: data.lesson.id,
      userId: data.user.id,
      answers: JSON.stringify(answers)
    };

    const response = await fetch(`/api/quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answerData: JSON.stringify({ answerData }),
        action: 'submitQuiz'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log("quiz abgeschlossen");
      // console.log(result);
      quizResults = result; // Store the results in the reactive variable
      quizSubmitted = true; // Mark the quiz as submitted
    } else {
      console.error("Fehler beim Abschließen von quiz");
    }


    // console.log(data);
  }

  

</script>

<Header navItems={[{ name: 'Kurse', href: '/kurse' }, { name: data.course.name, href: '/kurs/' + data.course.URL }, { name: data.lesson.lessonName, href: '/kurs/' + data.course.URL + '/' + data.lesson.URL }, {name: "Quiz",  href: '/kurs/' + data.course.URL + '/' + data.lesson.URL + "/quiz" }]} user={data.user} />

<main>
<h1>Quiz zu {data.lesson.lessonName}</h1>

<p>Beantworten Sie die Quizfragen.</p>

<form class="quiz-questions" on:submit|preventDefault={handleSubmit} disabled={quizSubmitted} autocomplete="off">
{#each data.quizQuestions as question}

<section>
  <fieldset>
  <legend>{question.question}</legend>
    {#if question.type === "s"}
    <p class="questionType">Wählen Sie eine Antwort</p>
    {:else if question.type === "m"}
    <p class="questionType">Wählen Sie eine oder mehrere Antworten</p>
      {/if}

  {#each question.options as answer}
    {#if question.type === "s"}
      <label>
        <input type="radio" name="{question.id}" value="{answer}" disabled={quizSubmitted} autocomplete="off"/>
        {@html answer}
      </label>
      {:else if question.type === "m"}
      
      <label>
        <input type="checkbox" name="{question.id}" value="{answer}" disabled={quizSubmitted} autocomplete="off"/>
        {@html answer}
      </label>

      {/if}
      
  {/each}
  </fieldset>
    
  {#if quizResults}
    <!-- Display results for this question -->
    {#each quizResults.results as result (result.questionId)}
      {#if result.questionId === question.id}
        <div class="quiz-result">
          <p><strong>Ihre korrekten Antworten:</strong></p>
          <ul>
            {#each result.userCorrectResponse as correctResponse}
              <li>{@html correctResponse}</li>
            {/each}
          </ul>
          <p><strong>Punkte:</strong> {result.points}</p>
        </div>
      {/if}
    {/each}
  {/if}


  {#if data.user.isAdmin > 0}
    <pre><strong>Question ID:</strong> {question.id}</pre>
  {/if}
    
  </section>
{/each}

<button type="submit" disabled={quizSubmitted}>Quiz abschicken</button>

</form>

{#if quizResults}
  <section class="quiz-summary">
    <h2>Quiz Zusammenfassung</h2>
    <p><strong>Erreichte Punkte:</strong> {quizResults.totalPoints} / {quizResults.maxPoints}</p>
    <p><strong>Prozent:</strong> {quizResults.percent}%</p>

    {#if quizResults.percent >= 75}
      <!-- todo 75 -->
      <p><i class="fas fa-check-circle" style="color: #638e21;"></i> Gut gemacht! Lektion abgeschlossen.</p>
      <a class="button" href="/kurs/{data.course.URL}">Zur Kurs-Seite {data.course.name}</a>
    {:else}
      <p><i class="fas fa-exclamation-circle" style="color: red;"></i> Diese Quiz-Leistung reicht für den Digital Badge noch nicht aus. </p>
      <a class="button" href="/kurs/{data.course.URL}/{data.lesson.URL}">Gehen Sie zur Lektion zurück und schauen Sie sich die Inhalte erneut an. Sobald Sie 75&nbsp;% beim Quiz erreichen, erhalten Sie den Digital Badge.</a>
    {/if}
  </section>
{/if}
</main>

<style>
  section {
    background-color: var(--color-link-lightest);
    padding: 1em;
    border-radius: 15px;
    border: 5px solid var(--color-white);
  }
  .quiz-result {
    margin-top: 1rem;
    padding: 1em;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
    border-radius: 1em;
  }

  .quiz-result p {
    margin: 0;
  }

  .quiz-summary {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid #ccc;
    background-color: #e6f7ff;
    border-radius: 1em;

  }

  form[disabled], button[disabled] {
    pointer-events: none;
    opacity: 0.6;
  }

  button, .button {
    background-color: var(--color-link);
    font-size: 1.2em;
    padding: 0.5em 1em;
    color: white;
    border-radius: 10px;
    border-color: var(--color-link-darkest);
    display: inline-block;
  }
  h1, h2, legend {
    color: var(--color-link);
  }
  legend {
    margin-bottom: 0.3em;
    margin-bottom: 0em;
    font-size: 1.5em;
    font-weight: bold;
  }
  p.questionType {
    font-style: italic;
    font-size: 0.8em;
  }
  button:hover, .button:hover {
    background-color: var(--color-link-light);
  }

  label {
    display: block;
    margin-bottom: 0.5em;
  }

</style>