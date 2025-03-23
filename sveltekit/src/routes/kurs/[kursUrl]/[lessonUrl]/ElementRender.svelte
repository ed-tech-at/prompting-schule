<script lang="ts">

  import type { Element, Course, Lesson, User } from '@prisma/client';

  import { marked } from 'marked';

  import { onMount } from 'svelte';
    
  


  onMount(() => {
    if (element.type === "aiSide") {
      getUserProgressElementAi1();
      getUserProgressElementAi2();
    }
    if (element.type === "ai12") {
      getUserProgressElementAi1();
      getUserProgressElementAi2();
    }
    if (element.type === "ai1") {
      getUserProgressElementAi1();
    }
    if (element.type === "ai2") {
      getUserProgressElementAi2();
    }
    if (element.type === "star") {
      getUserProgressElementStar();
    }
  });


  async function getUserProgressElementAi1() {
    try {
      const response = await fetch('/api/userProgress' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getUserProgressElementAi1",
          data: JSON.stringify({
            userId: userId,
            elementId: element.id
          })
        })
      });

      const result = await response.json();
      // console.log("getUserProgressElementAi1:", result);
      if (result.success) {
        ai1Result = result.userProgress.ai1Result;
        ai1 = result.userProgress.ai1;
        ai1promptTokens = result.userProgress.promptTokens;
        ai1completionTokens = result.userProgress.completionTokens;
      } 
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }

  async function getUserProgressElementStar() {
    try {
      const response = await fetch('/api/userProgress' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getUserProgressElementStar",
          data: JSON.stringify({
            userId: userId,
            elementId: element.id
          })
        })
      });

      const result = await response.json();
      // console.log("getUserProgressElementAi1:", result);
      if (result.success) {
        result.userProgress.ai1Result = JSON.parse(result.userProgress.ai1Result);
        ai1Result = result.userProgress.ai1Result.feedback; // Convert markdown to HTML
        showStar = result.userProgress.ai1Result.star;
        // ai1Result = result.userProgress.ai1Result;
        ai1 = result.userProgress.ai1;
        ai1promptTokens = result.userProgress.promptTokens;
        ai1completionTokens = result.userProgress.completionTokens;
      } 
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }



  async function getUserProgressElementAi2() {
    try {
      const response = await fetch('/api/userProgress' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getUserProgressElementAi2",
          data: JSON.stringify({
            userId: userId,
            elementId: element.id
          })
        })
      });

      const result = await response.json();
      console.log("getUserProgressElementAi2:", result);
      if (result.success && result.userProgress) {
        
        ai2Result = result.userProgress.ai2Result; 
        ai2 = result.userProgress.ai2; 
        ai2promptTokens = result.userProgress.promptTokens;
        ai2completionTokens = result.userProgress.completionTokens;
      } 
    } catch (error) {
      console.error('Error checking user progress:', error);
    }
  }

  export let course: Course ;
  export let lesson: Lesson ;
  export let element: Element;
  export let userId: String;
  export let updateUserStars: Function;

  let ai1 = "";
  let ai1Result = "";
  let ai1timer = null;
  let ai1running = false;
  let showStar = false;

  let ai1promptTokens = 0;
  let ai1completionTokens = 0;

  let ai2 = "";
  let ai2Result = "";
  
  let ai2timer = null;
  let ai2running = false; 
  
  let ai2promptTokens = 0;
  let ai2completionTokens = 0;

  function startTimer (number) {
    if (number == 1) {
      ai1running = true;
      ai1timer = setTimeout(() => {
        ai1Result += ".";
        clearTimeout(ai1timer);
        startTimer(1);
      }, 500);
    } else if (number == 2) {
      ai2running = true; 
      ai2timer = setTimeout(() => {
        ai2Result += ".";
        clearTimeout(ai2timer);
        startTimer(2);
      }, 500);
    }
  }

  function stopTimer (number) {
    if (number == 1) {
      clearTimeout(ai1timer);
      ai1running = false;
    } else if (number == 2) {
      clearTimeout(ai2timer);
      ai2running = false; 
    }
  }


  async function submitFormAiSide1(event: Event) {
    // const form = event.target as HTMLFormElement;
    // const formData = new FormData(form);

    ai1Result = "...";
    ai1completionTokens = 0;
    ai1promptTokens = 0;

    startTimer(1);

    const data = {
      ai1: ai1,
      userId: userId,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    };

    const response = await fetch(`/api/userProgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify({ data }),
        action: 'aiSide1'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log('Element updated successfully:', result.ai1Result); // Update success message
      ai1Result = result.ai1Result; // Convert markdown to HTML
      ai1promptTokens = result.promptTokens;
      ai1completionTokens = result.completionTokens;
      console.log("Prompt Tokens:", ai1promptTokens, "Completion Tokens:", ai1completionTokens);
      console.log("Result:", result);
      // console.log('Element updated successfully:', ai1Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
    }
    stopTimer(1); // Added to stop the timer for ai1
  }
  
  async function submitFormAiSide2(event: Event) {
    ai2Result = "...";
    ai2completionTokens = 0;
    ai2promptTokens = 0;

    startTimer(2); // Added to start the timer for ai2

    const data = {
      ai2: ai2,
      userId: userId,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    };

    const response = await fetch(`/api/userProgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify({ data }),
        action: 'aiSide2'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      ai2Result = result.ai2Result; // Convert markdown to HTML
      ai2promptTokens = result.promptTokens;
      ai2completionTokens = result.completionTokens;
      // console.log('Element updated successfully:', ai2Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
    }
    stopTimer(2); 
  }

  

  async function submitFormAi1(event: Event) {
    // const form = event.target as HTMLFormElement;
    // const formData = new FormData(form);

    ai1Result = "...";
    ai1completionTokens = 0;
    ai1promptTokens = 0;

    startTimer(1);

    const data = {
      ai1: ai1,
      userId: userId,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    };

    const response = await fetch(`/api/userProgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify({ data }),
        action: 'ai1'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log('Element updated successfully:', result.ai1Result); // Update success message
      ai1Result = result.ai1Result; // Convert markdown to HTML
      ai1promptTokens = result.promptTokens;
      ai1completionTokens = result.completionTokens;
      console.log("Prompt Tokens:", ai1promptTokens, "Completion Tokens:", ai1completionTokens);
      console.log("Result:", result);
      // console.log('Element updated successfully:', ai1Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
    }
    stopTimer(1); // Added to stop the timer for ai1
  }


  async function submitFormAi12(event: Event) {
    // const form = event.target as HTMLFormElement;
    // const formData = new FormData(form);

    ai1Result = "...";
    ai1completionTokens = 0;
    ai1promptTokens = 0;

    startTimer(1);

    const data = {
      ai1: ai1,
      ai2: ai2,
      userId: userId,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    };

    const response = await fetch(`/api/userProgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify({ data }),
        action: 'ai12'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log('Element updated successfully:', result.ai1Result); // Update success message
      ai1Result = result.ai1Result; // Convert markdown to HTML
      ai1promptTokens = result.promptTokens;
      ai1completionTokens = result.completionTokens;
      console.log("Prompt Tokens:", ai1promptTokens, "Completion Tokens:", ai1completionTokens);
      console.log("Result:", result);
      // console.log('Element updated successfully:', ai1Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
    }
    stopTimer(1); // Added to stop the timer for ai1
  }


  async function submitFormAi2(event: Event) {
    // const form = event.target as HTMLFormElement;
    // const formData = new FormData(form);

    ai2Result = "..."; 
    ai2completionTokens = 0;
    ai2promptTokens = 0;

    startTimer(2);

    const data = {
      ai2: ai2,
      userId: userId,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    };

    const response = await fetch(`/api/userProgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify({ data }),
        action: 'ai2'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log('Element updated successfully:', result.ai2Result); // Update success message
      ai2Result = result.ai2Result; 
      ai2promptTokens = result.promptTokens;
      ai2completionTokens = result.completionTokens;
      // console.log("Prompt Tokens:", ai1promptTokens, "Completion Tokens:", ai1completionTokens);
      // console.log("Result:", result);
      // console.log('Element updated successfully:', ai1Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
    }
    stopTimer(2); // Added to stop the timer for ai1
  }
  
  


  async function submitFormStar(event: Event) {
    // const form = event.target as HTMLFormElement;
    // const formData = new FormData(form);

    ai1Result = "...";
    ai1completionTokens = 0;
    ai1promptTokens = 0;

    startTimer(1);

    const data = {
      ai1: ai1,
      userId: userId,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    };

    const response = await fetch(`/api/userProgress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: JSON.stringify({ data }),
        action: 'star'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log('Element updated successfully:', result.ai1Result); // Update success message
      result.ai1Result = JSON.parse(result.ai1Result);
      ai1Result = result.ai1Result.feedback; // Convert markdown to HTML
      showStar = result.ai1Result.star;
      ai1promptTokens = result.promptTokens;
      ai1completionTokens = result.completionTokens;
      console.log("Prompt Tokens:", ai1promptTokens, "Completion Tokens:", ai1completionTokens);
      console.log("Result:", result);
      updateUserStars();

      // console.log('Element updated successfully:', ai1Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
    }
    stopTimer(1); // Added to stop the timer for ai1
  }



</script>

<div class="element">
 
  <!-- {element.title} as {element.type} for User: {userId} -->

  {#if element.type === "text"}
    {@html element.description}
  {/if}

  
  {#if element.type === "aiSide"}

<section>
  {@html element.description}
  <div class="aiSide">
    
  <form class="ai" on:submit|preventDefault={submitFormAiSide1}>

      <label for="ai1">{element.taskA}</label>
            
      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div>

      <button type="submit" class="submit" disabled={ai1running}>
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Antwort {#if ai1completionTokens} besteht aus {ai1completionTokens} Tokens und {ai1promptTokens} Anfrage-Tokens {/if} {#if ai1running} wird generiert{/if}</label>
        <div class="clearboth"></div>
        <div class="generated">
          {#if ai1Result}
            {@html ai1Result}
          {/if}
        </div>
      </div>
    </form>
    
    <form class="ai" on:submit|preventDefault={submitFormAiSide2}>
      <label for="ai2">{@html element.taskB}</label>
      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div>
      
      <button type="submit" class="submit" disabled={ai2running}>
        <i class="fas fa-paper-plane"></i>
      </button>

      <div class="result">
        <label>Antwort {#if ai2completionTokens} besteht aus {ai2completionTokens} Tokens und {ai2promptTokens} Anfrage-Tokens {/if} {#if ai2running} wird generiert{/if}</label>
        <div class="clearfix"></div>
        <div class="generated">
          {#if ai2Result}
            {@html ai2Result}
          {/if}
        </div>
      </div>      
    </form>
    
  </div>      
</section>  
  {/if}
  
  {#if element.type === "ai1"}

<section>
  {@html element.description}
  <div class="ai1">
    
  <form class="ai" on:submit|preventDefault={submitFormAi1}>

      <label for="ai1">{element.taskA}</label>

      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div>

      <div class="ai1prompt2">
      <label for="ai2">{@html element.taskB}</label>
      <div class="prompt" placeholder="Prompt">{@html element.devPromptB}</div>
      </div>

      <button type="submit" class="submit" disabled={ai1running}>
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Antwort {#if ai1completionTokens} besteht aus {ai1completionTokens} Tokens und {ai1promptTokens} Anfrage-Tokens {/if} {#if ai1running} wird generiert{/if}</label>
        <div class="clearboth"></div>
        <div class="generated">
          {#if ai1Result}
            {@html ai1Result}
          {/if}
        </div>
      </div>
    </form>
    
    
  </div>      
</section>  
  {/if}


  {#if element.type === "ai2"}

<section>
  {@html element.description}
  <div class="ai2">
    
  <form class="ai" on:submit|preventDefault={submitFormAi2}>

    
    <div class="ai2prompt1">
      <label for="ai1">{@html element.taskA}</label>
      <div class="prompt" placeholder="Prompt">{@html element.devPromptB}</div>
      </div>

      <div class="ai2prompt2">

      <label for="ai2">{element.taskB}</label>

      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div>
    </div>

      

      <button type="submit" class="submit" disabled={ai2running}>
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Antwort {#if ai2completionTokens} besteht aus {ai2completionTokens} Tokens und {ai2promptTokens} Anfrage-Tokens {/if} {#if ai2running} wird generiert{/if}</label>
        <div class="clearboth"></div>
        <div class="generated">
          {#if ai2Result}
            {@html ai2Result}
          {/if}
        </div>
      </div>
    </form>
    
    
  </div>      
</section>  
  {/if}




  {#if element.type === "ai12"}

<section>
  {@html element.description}
  <div class="ai2">
    
  <form class="ai" on:submit|preventDefault={submitFormAi12}>

    
    <div class="ai12prompt1">
      <label for="ai1">{@html element.taskA}</label>
      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div>
    </div>

      <div class="ai12prompt2">

      <label for="ai2">{element.taskB}</label>

      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div>
    </div>

      

      <button type="submit" class="submit" disabled={ai1running}>
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Antwort {#if ai1completionTokens} besteht aus {ai1completionTokens} Tokens und {ai1promptTokens} Anfrage-Tokens {/if} {#if ai1running} wird generiert{/if}</label>
        <div class="clearboth"></div>
        <div class="generated">
          {#if ai1Result}
            {@html ai1Result}
          {/if}
        </div>
      </div>
    </form>
    
    
  </div>      
</section>  
  {/if}




  {#if element.type === "star"}

<section class="star">
  {@html element.description}
  <div class="ai1">
    
  <form class="ai" on:submit|preventDefault={submitFormStar}>

      <label for="ai1">{element.taskA}</label>

      <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Antwort"></div>

      <button type="submit" class="submit" disabled={ai1running}>
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Feedback {#if ai1completionTokens} besteht aus {ai1completionTokens} Tokens und {ai1promptTokens} Anfrage-Tokens {/if} {#if ai1running} wird generiert{/if}</label>
        <div class="clearboth"></div>
        <div class="generated">
          {#if ai1Result}
            {@html ai1Result}
          {/if}
        </div>
      </div>

      {#if showStar}
      <div class="star-wrapper">
      <div class="star-block">
        Stern erhalten <i class="fas fa-star star-color"></i>
      </div>
      </div>
    {/if}

    </form>

    
    
    
  </div>      
</section>  
  {/if}




  {#if element.type === "ai1old"}

    <form on:submit|preventDefault={submitFormai1}>

      {element.title}<br>
      {element.description}<br>
      {element.taskA}<br>

      <label for="ai1">ai1:</label>

      
      
      <textarea id="ai1" name="ai1" rows="4" cols="50" bind:value={ai1}></textarea>
      
      <input type="submit" value="Submit">

      {#if ai1Result}
        <p>{ai1Result}</p>
      {/if}

    </form>
  
  {/if}
  
</div>