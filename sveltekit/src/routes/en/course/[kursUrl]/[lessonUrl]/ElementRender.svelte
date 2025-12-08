<script lang="ts">
    import type { JwtUserPayload } from '$lib/server/jwt';


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
    if (element.type === "ai2only") {
      getUserProgressElementAi2();
    }
    if (element.type === "star") {
      getUserProgressElementStar();
    }
    if (element.type === "note") {
      getUserProgressElementAi1();
    }
  });


  async function getUserProgressElementAi1() {
    try {

      const data = {
        userId: user.id,
        elementId: element.id
      };

      const response = await fetch('/api/userProgress' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          action: "getUserProgressElementAi1"
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

      const data = {
        userId: user.id,
        elementId: element.id
      };

      const response = await fetch('/api/userProgress' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getUserProgressElementStar",
          data
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

      const data = {
        userId: user.id,
        elementId: element.id
      };
      
      const response = await fetch('/api/userProgress' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: "getUserProgressElementAi2",
          data
        })
      });

      const result = await response.json();
      // console.log("getUserProgressElementAi2:", result);
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
  export let user: JwtUserPayload;
  export let updateUserStars: Function;
  // export let isAdmin: Integer;

  let developer = "";

  let ai1 = "";
  let ai1Result = "";
  let ai1RawText = "";

  let ai1timer = null;
  let ai1running = false;
  let showStar = false;

  let ai1promptTokens = 0;
  let ai1completionTokens = 0;

  let ai2 = "";
  let ai2Result = "";
  let ai2RawText = "";

  
  let ai2timer = null;
  let ai2running = false; 
  
  let ai2promptTokens = 0;
  let ai2completionTokens = 0;

  let betterPrompt = "";
  

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


  async function submitFormNote(event: Event) {
    // const form = event.target as HTMLFormElement;
    // const formData = new FormData(form);

    ai1Result = "...";
    ai1completionTokens = 0;
    ai1promptTokens = 0;

    // startTimer(1);

    const data = {
      ai1: ai1,
      userId: user.id,
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
        data,
        action: 'note'
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      // console.log('Element updated successfully:', result.ai1Result); // Update success message
      ai1Result = result.ai1Result; // Convert markdown to HTML
      ai1promptTokens = result.promptTokens;
      // console.log("Prompt Tokens:", ai1promptTokens, "Completion Tokens:", ai1completionTokens);
      // console.log("Result:", result);
      // console.log('Element updated successfully:', ai1Result); // Update success message
    } else {
      console.error('Error updating element:', result.error); // Update error message
      ai1Result = "<i>" + result.error + "</i>"; 
    }
    // stopTimer(1); // Added to stop the timer for ai1
  }





  async function streamAiAnswer({
  action,
  data,
  timerKey,
  onChunk,
  onFooter,
  onError
}: {
  action: string;
  data: Record<string, any>;
  timerKey: number;
  onChunk: (textChunk: string) => void;
  onFooter: (tokens: { promptTokens: number; completionTokens: number }) => void;
  onError?: (msg: string) => void;
}) {
  startTimer(timerKey);

  const response = await fetch(`/api/en/aiAnswer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data })
  });

  if (!response.ok || !response.body) {
    
    if (response.status == 451) {
      onError?.("<i>⚠️ Your input could not be processed because it violates content policies.</i>");
    } else {
      onError?.('<i>Error loading response.</i>');
    }

    stopTimer(timerKey);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let fullText = '';
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();

    if (value) {
      const chunk = decoder.decode(value, { stream: true });

      const footerIndex = chunk.indexOf('[__FOOTER__]');
      if (footerIndex !== -1) {
        const text = chunk.substring(0, footerIndex);
        fullText += text;
        onChunk(text);

        const footerRaw = chunk.substring(footerIndex + '[__FOOTER__]'.length).trim();
        try {
          const footer = JSON.parse(footerRaw);
          onFooter({
            promptTokens: footer.promptTokens ?? 0,
            completionTokens: footer.completionTokens ?? 0
          });
        } catch (err) {
          console.error('Footer JSON error', err);
        }

        done = true;
      } else {
        fullText += chunk;
        onChunk(chunk);
      }
    }

    done = done || streamDone;
  }

  stopTimer(timerKey);
}







async function submitFormAiSide1() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;

  await streamAiAnswer({
    action: 'aiSide1',
    data: {
      ai1: ai1,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      ai1Result = marked.parse(ai1RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}

async function submitFormAiSide2() {
  ai2Result = '...';
  ai2RawText = '';
  ai2promptTokens = 0;
  ai2completionTokens = 0;

  await streamAiAnswer({
    action: 'aiSide2',
    data: {
      ai2,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 2,
    onChunk: (chunk) => {
      ai2RawText += chunk;
      ai2Result = marked.parse(ai2RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai2promptTokens = promptTokens;
      ai2completionTokens = completionTokens;
    },
    onError: (err) => {
      ai2Result = err;
    }
  });
}



async function submitFormAi1() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;

  await streamAiAnswer({
    action: 'ai1',
    data: {
      ai1,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      ai1Result = marked.parse(ai1RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}

async function submitFormAi2() {
  ai2Result = '...';
  ai2RawText = '';
  ai2promptTokens = 0;
  ai2completionTokens = 0;

  await streamAiAnswer({
    action: 'ai2',
    data: {
      ai2,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 2,
    onChunk: (chunk) => {
      ai2RawText += chunk;
      ai2Result = marked.parse(ai2RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai2promptTokens = promptTokens;
      ai2completionTokens = completionTokens;
    },
    onError: (err) => {
      ai2Result = err;
    }
  });
}

async function submitFormAi12() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;

  await streamAiAnswer({
    action: 'ai12',
    data: {
      ai1,
      ai2,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      ai1Result = marked.parse(ai1RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}

async function submitFormDirectDevUser() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;

  await streamAiAnswer({
    action: 'directDevUser',
    data: {
      developer,
      ai1,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      ai1Result = marked.parse(ai1RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}

async function submitFormDirectDevUserUser() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;

  await streamAiAnswer({
    action: 'directDevUserUser',
    data: {
      developer,
      ai1,
      ai2,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      ai1Result = marked.parse(ai1RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}


async function submitFormLabor() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;
  betterPrompt = '';
  ai2Result = '';
  ai2RawText = '';

  await streamAiAnswer({
    action: 'labor1',
    data: {
      ai1,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      betterPrompt += chunk;
    },
    onFooter: () => {
      labor2(); // ⏭ automatisch weiter zu labor2
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}

async function labor2() {
  await streamAiAnswer({
    action: 'labor2',
    data: {
      ai1,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 2,
    onChunk: (chunk) => {
      ai2RawText += chunk;
      ai2Result = marked.parse(ai2RawText);
    },
    onFooter: () => {
      labor3(); // ⏭ automatisch weiter zu labor3
    },
    onError: (err) => {
      ai2Result = err;
    }
  });
}

async function labor3() {
  ai1Result = '...';
  ai1RawText = '';

  await streamAiAnswer({
    action: 'labor3',
    data: {
      ai1,
      ai2,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      ai1Result = marked.parse(ai1RawText);
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;
    },
    onError: (err) => {
      ai1Result = err;
    }
  });
}


async function submitFormStar() {
  ai1Result = '...';
  ai1RawText = '';
  ai1promptTokens = 0;
  ai1completionTokens = 0;

  await streamAiAnswer({
    action: 'star',
    data: {
      ai1,
      userId: user.id,
      elementId: element.id,
      courseId: course.id,
      lessonId: lesson.id
    },
    timerKey: 1,
    onChunk: (chunk) => {
      ai1RawText += chunk;
      console.log(chunk)
    },
    onFooter: ({ promptTokens, completionTokens }) => {
      try {
        const parsed = JSON.parse(ai1RawText);
        ai1Result = marked.parse(parsed.feedback || '');
        showStar = parsed.star;
      } catch (e) {
        ai1Result = 'Fehler beim Parsen der Rückgabe';
        showStar = false;
      }
      ai1promptTokens = promptTokens;
      ai1completionTokens = completionTokens;

      updateUserStars?.(); // falls übergeben
    },
    onError: (err) => {
      ai1Result = err;
      console.error('Error in submitFormStar:', err);
    }
  });
}


function stripTagsAndDecode(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}
  
function copyBetterPrompt() {
  ai1 = stripTagsAndDecode(betterPrompt);
}
function copyWorsePrompt() {
  ai1 = stripTagsAndDecode(ai2Result);
}


let sepcialClass = "";
if (element.type.includes('negativeMarginTop')) {
  sepcialClass += ' negativeMarginTop';
}


</script>

<div class="{user.isAdmin > 0 ? 'adminView element' : 'element'}  {sepcialClass}">
 
  
  {#if element.type === "text" || element.type === "text-negativeMarginTop"}
    {@html element.description}
  {/if}

  

  {#if element.type === "note"}

<section>
  {@html element.description}
  
    
  <form class="ai note" on:submit|preventDefault={submitFormNote}>

      <label for="ai1" id="label-{element.id}">{element.taskA}  {#if ai1Result} - {@html ai1Result}
      {/if}</label>
            
      <textarea class="prompt" bind:value={ai1} placeholder="Note for you" role="textbox" aria-labelledby="label-{element.id}" >
      </textarea>
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Notiz für Sie" role="textbox" aria-labelledby="label-{element.id}" ></div> -->
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Notiz für Sie" role="textbox" aria-labelledby="label-{element.id}" ></div> -->

      <button type="submit" class="submit" disabled={ai1running}>
        <i class="fas fa-save"></i>
      </button>
      
    </form>
    
      
</section>  
  {/if}


  {#if element.type === "aiSide"}

<section>
  {@html element.description}
  <div class="aiSide">
    
  <form class="ai" on:submit|preventDefault={submitFormAiSide1}>

      <label for="ai1">{element.taskA}</label>
            
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>

      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai1running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
        <div class="generated">
          {#if ai1Result}
            {@html ai1Result}
          {/if}
        </div>
      </div>
    </form>
    
    <form class="ai" on:submit|preventDefault={submitFormAiSide2}>
      <label for="ai2">{@html element.taskB}</label>
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt" ></div> -->
      <textarea class="prompt" bind:value={ai2} placeholder="Prompt"></textarea>
      

      <button type="submit" class="submit" disabled={ai2running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>

      <div class="result">
        <label>Answer {#if ai2running}is being generated{/if}</label>
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

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>

      <div class="ai1prompt2">
      <label for="ai2">{@html element.taskB}</label>
      <div class="prompt" placeholder="Prompt">{@html element.devPromptB}</div>
      </div>

      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai1running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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


  {#if element.type === "ai1only"}

<section>
  {@html element.description}
  <div class="ai1">
    
  <form class="ai" on:submit|preventDefault={submitFormAiSide1}>

      <label for="ai1">{element.taskA}</label>

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>


      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai1running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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


  {#if element.type === "ai2" || element.type === "ai2only"}

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

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai2} placeholder="Prompt"></textarea>

    </div>

      

      <button type="submit" class="submit" disabled={ai2running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai2running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>

    </div>

      <div class="ai12prompt2">

      <label for="ai2">{element.taskB}</label>

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai2} placeholder="Prompt"></textarea>

    </div>

      

      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai1running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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
  
  
  {#if element.type === "directDevUser"}

<section>
  {@html element.description}
  <div class="aiDirectDevUser">
    
  <form class="ai" on:submit|preventDefault={submitFormDirectDevUser}>

    
    <div class="aiDevPrompt1">
      <label for="aiDev">{@html element.taskA}</label>
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={developer} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={developer} placeholder="Prompt"></textarea>

    </div>

      <div class="prompt2">

      <label for="ai1">{element.taskB}</label>

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>

    </div>

      

      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai1completionTokens} consists of {ai1completionTokens} tokens and {ai1promptTokens} request tokens {/if} {#if ai1running} is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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




  {#if element.type === "directDevUserUser"}

<section>
  {@html element.description}
  <div class="aiDirectDevUserUser">
    
  <form class="ai" on:submit|preventDefault={submitFormDirectDevUserUser}>

    
    <div class="aiDevPrompt1">
      <label for="aiDev">{@html element.taskA}</label>
      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={developer} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={developer} placeholder="Prompt"></textarea>

    </div>

      <div class="prompt2">

      <label for="ai1">{element.taskB}</label>

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>

    </div>
    
    <div class="prompt2">

      <label for="ai2">{element.taskB}</label>

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai2} placeholder="Prompt"></textarea>

    </div>

      

      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Answer {#if ai1completionTokens} consists of {ai1completionTokens} tokens and {ai1promptTokens} request tokens {/if} {#if ai1running} is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Antwort"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Answer"></textarea>

      <button type="submit" class="submit" disabled={ai1running} aria-label="Submit">
        <i class="fas fa-paper-plane"></i>
      </button>
      
      <div class="result">
        <label class="">Feedback {#if ai1running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
        <div class="generated">
          {#if ai1Result}
            {@html ai1Result}
          {/if}
        </div>
      </div>

      {#if showStar}
      <div class="star-wrapper">
      <div class="star-block">
        You have received a star <i class="fas fa-star star-color"></i>
      </div>
      </div>
    {/if}

    </form>

    
    
    
  </div>      
</section>  
  {/if}




  {#if element.type === "labor"}

<section>
  {@html element.description}
  <div class="aiLabor">
    
  <form class="ai" on:submit|preventDefault={submitFormLabor}>

      <label for="ai1">{element.taskA}</label>

      <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai1} placeholder="Prompt"></div> -->
      <textarea class="prompt" bind:value={ai1} placeholder="Prompt"></textarea>

     

      <button type="submit" class="submit" disabled={ai1running} aria-label="Absenden">
        <i class="fas fa-paper-plane"></i>
      </button>

      <div class="laborPrompt2">

        <label for="ai2">{element.taskB}</label>
  
        <!-- <div contenteditable="plaintext-only" class="prompt" bind:innerHTML={ai2} placeholder="Prompt"></div> -->
        <textarea class="prompt" bind:value={ai2} placeholder="Prompt"></textarea>

      </div>
  

      {#if betterPrompt}
      <div class="laborSide">
        <div class="aiLaborSide aiLaborBetter">
          <label for="ai2">Better Prompt</label>
          <div class="prompt" placeholder="Prompt">{@html betterPrompt}</div>

          <span type="button" class="submit" disabled={ai2running} on:click={copyBetterPrompt}>
            <i class="fas fa-copy"></i>
          </span>

          


        </div>
        <div class="aiLaborSide aiLaborWorse">
          <label for="ai2">Worse Prompt</label>
          <div class="prompt" placeholder="...">{@html ai2Result}</div>

          <span type="button" class="submit" disabled={ai2running} on:click={copyWorsePrompt}>
            <i class="fas fa-copy"></i>
          </span>
        </div>

      </div>
    
      {/if}

      <div class="result">
        <label class="">Answer {#if ai1running}is being generated{/if}</label>
        <!-- <div class="clearboth"></div> -->
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



  {#if user.isAdmin > 0}
    <pre>Element ID: {element.id}</pre>
  {/if}
  
</div>


<style>
  .laborSide {
    display: flex;
    gap: 1rem;
    width: 100%;
  }
  .aiLaborSide {
    width: 100%;
    position: relative;
  }
  .aiLabor form.ai .submit {
    margin-bottom: -30px;
  }

  .aiLaborBetter .prompt {
    background-color: #1fa05b;
  }
  .aiLaborWorse .prompt {
    background-color: #c74b4b;
  }

</style>