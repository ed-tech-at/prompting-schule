<script lang="ts">
  import Header from "$lib/Header.svelte";
  import type { JwtUserPayload } from "$lib/server/jwt";
  export let data: { user: JwtUserPayload };
</script>

<Header user={data.user} lang={"en"} />
<main id="frontpage">
  <!--
<div class='header'>
    <div class='title'>PROMPTING SCHOOL</div>
    <div class='buttons'>
        <Link to='en/login' class='button'>LOG IN</Link>
        <Link to='en/register' class='button'>REGISTER</Link>
    </div>
</div>
-->
  <section class="hero">
    <!-- Dimmed Letters -->
    <div class="dimmed-text">PROMPTING.SCHOOL</div>
    <h1>
      <img
        src="/logo-prompting.schule-bg.png"
        style="height: 1.3em;
    position: relative;
    top: 0.3em;
    margin-right: 0.3em;"
        alt="prompting.school Logo"
      /> Master prompt engineering
    </h1>
    <p>
      Achieve better results with AI models such as ChatGPT by learning proven
      strategies for writing clear instructions and simplifying complex tasks.
    </p>
    <a href="/en/login" class="cta-button">Sign up now</a>
  </section>
  <!-- Language Selector -->
  <!-- <div class='language-selector'>
  <p>Language:</p>
  <button class='language-button'>
    <a href='https://a-i.education/'> English </a>
</button>
<button class='language-button'>
    <a href='https://prompting.schule'> German </a>
</button>
</div> -->
  <section class="benefits-section">
    <h2>How prompting.school works</h2>
    <div class="benefits-container">
      <div class="benefit-card">
        <div class="benefit-icon">💰</div>
        <div class="benefit-title">Learn for free</div>
        <div class="benefit-description">
          Our courses are Open Educational Resources (OER). They are therefore
          freely available – provided by Graz University of Technology.
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🎯</div>
        <div class="benefit-title">Target groups</div>
        <div class="benefit-description">
          Whether you are a beginner, student, professional or teacher, everyone
          will find the right place to start here.
        </div>
      </div>

      <div class="benefit-card">
        <div class="benefit-icon">⏱️</div>
        <div class="benefit-title">Flexible time management</div>
        <div class="benefit-description">
          The courses are modular – you determine the pace and timing of your
          learning.
        </div>
      </div>

      <div class="benefit-card">
        <div class="benefit-icon">🧠</div>
        <div class="benefit-title">Self-study courses</div>
        <div class="benefit-description">
          You decide how deeply you want to delve into a topic – ideal for
          curious beginners and advanced learners alike.
        </div>
      </div>
    </div>

    <h2 style="margin-top: 4em;">Why take a course?</h2>
    <div class="benefits-container">
      <div class="benefit-card">
        <div class="benefit-icon">✨</div>
        <div class="benefit-title">Understand prompting</div>
        <div class="benefit-description">
          Discover the concepts for creating prompts that deliver accurate
          results.
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🚀</div>
        <div class="benefit-title">Increase productivity</div>
        <div class="benefit-description">
          Use AI tools to improve your efficiency in everyday tasks.
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">📚</div>
        <div class="benefit-title">Proven strategies</div>
        <div class="benefit-description">
          Discover techniques based on recommendations from OpenAI, UNESCO and
          experts.
        </div>
      </div>
      <div class="benefit-card">
        <div class="benefit-icon">🎖️</div>
        <div class="benefit-title">Digital learning badge</div>
        <div class="benefit-description">
          Test your knowledge immediately after each lesson. You will receive a
          digital badge for your learning success.
        </div>
      </div>
    </div>
  </section>
  <section class="about-section">
    <h2>About the basic course</h2>
    <p>
      The basic course comprises four lessons and can be completed in around
      four 60-minute sessions.
    </p>
    <div class="about-container">
      <div class="about-card">
        <div class="about-icon">🖋️</div>
        <div class="about-content">
          <div class="about-title">Write clear instructions</div>
          <div class="about-description">
            You will learn how to write precise and unambiguous prompts to get
            better answers from AI.
          </div>
        </div>
      </div>
      <div class="about-card">
        <div class="about-icon">📖</div>
        <div class="about-content">
          <div class="about-title">Reference texts provided</div>
          <div class="about-description">
            You will learn how reference texts and examples can significantly
            improve the quality of AI responses.
          </div>
        </div>
      </div>
      <div class="about-card">
        <div class="about-icon">🔗</div>
        <div class="about-content">
          <div class="about-title">Divide complex tasks</div>
          <div class="about-description">
            You will understand how to divide large requests into meaningful
            steps – for greater clarity and accuracy.
          </div>
        </div>
      </div>
      <div class="about-card">
        <div class="about-icon">⏳</div>
        <div class="about-content">
          <div class="about-title">Let models think for themselves</div>
          <div class="about-description">
            You'll discover how to phrase your prompts so that AI thinks step by
            step and delivers thoughtful responses.
          </div>
        </div>
      </div>
    </div>
  </section>
  <section class="cta-section">
    <h2>Take the next step</h2>
    <p>
      Sign up today and learn proven strategies for mastering prompt engineering
      in the Fundamentals course!
    </p>
    <div class="cta-buttons">
      <a href="/en/login" class="cta-button" style="margin-bottom: 5em;"
        >Sign up now</a
      >
    </div>
  </section>
</main>
