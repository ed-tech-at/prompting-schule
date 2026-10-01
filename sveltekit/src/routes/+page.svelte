<script lang="ts">
  import Header from "$lib/Header.svelte";
  import InfoBlocks from "$lib/InfoBlocks.svelte";
  import type { JwtUserPayload } from '$lib/server/jwt';
  import type { InfoBlockView } from '$lib/infoblocks';

  import { asset, resolve } from '$app/paths';


  export let data: { user: JwtUserPayload, infoBlocks: InfoBlockView[] };
</script>
<Header user={data.user}  />

<main id="frontpage">

<InfoBlocks blocks={data.infoBlocks ?? []} />


<!--
<div class="header">
    <div class="title">PROMPTING SCHOOL</div>
    <div class="buttons">
        <Link to="en/login" class="button">LOG IN</Link>
        <Link to="en/register" class="button">REGISTER</Link>
    </div>
</div>
-->

<section class="hero">
  <!-- Dimmed Letters -->
  <div class="dimmed-text">PROMPTING.SCHULE</div>
  <h1><img src={asset('/logo-prompting.schule-bg.png')} style="height: 1.3em;
    position: relative;
    top: 0.3em;
    margin-right: 0.3em;" alt="prompting.schule Logo" /> Meistern Sie Prompt-Engineering</h1>
  <p>
      Erzielen Sie bessere Ergebnisse mit KI-Modellen wie ChatGPT, indem Sie bewährte Strategien erlernen, klare Anweisungen zu schreiben und komplexe Aufgaben zu vereinfachen.
  </p>
  <a href={resolve("/login")} class="cta-button">jetzt anmelden</a>
</section>

<!-- Language Selector -->
<!-- <div class="language-selector">
  <p>Sprache:</p>
  <button class="language-button">
    <a href="https://prompting.school/"> English </a>
</button>
<button class="language-button">
    <a href="https://prompting.schule"> Deutsch </a>
</button>
</div> -->

<section class="benefits-section">
  <h2>So funktioniert die prompting.schule</h2>
  <div class="benefits-container">
    
    

    <div class="benefit-card">
      <div class="benefit-icon">💰</div>
      <div class="benefit-title">Kostenlos lernen</div>
      <div class="benefit-description">
        Unsere Kurse sind Offene Bildungsressourcen (OER). Daher frei verfügbar – bereitgestellt von der TU Graz.
      </div>
    </div>

    <div class="benefit-card">
      <div class="benefit-icon">🎯</div>
      <div class="benefit-title">Zielgruppen</div>
      <div class="benefit-description">
        Egal ob Einsteiger:in, Studierende, Berufstätige oder Lehrkräfte – hier findet jede:r den passenden Einstieg.
      </div>
    </div>
  
    <div class="benefit-card">
      <div class="benefit-icon">⏱️</div>
      <div class="benefit-title">Flexible Zeiteinteilung</div>
      <div class="benefit-description">
        Die Kurse sind modular aufgebaut – Sie bestimmen Tempo und Zeitpunkt des Lernens.
      </div>
    </div>
  
    <div class="benefit-card">
      <div class="benefit-icon">🧠</div>
      <div class="benefit-title">Selbstlernkurse</div>
      <div class="benefit-description">
        Sie entscheiden selbst, wie tief Sie in ein Thema einsteigen möchten – ideal für Neugierige und Fortgeschrittene gleichermaßen.
      </div>
    </div>


  </div>

  <h2 style="margin-top: 4em;">Warum einen Kurs belegen?</h2>
  <div class="benefits-container">
    <div class="benefit-card">
      <div class="benefit-icon">✨</div>
      <div class="benefit-title">Prompting verstehen</div>
      <div class="benefit-description">
        Entdecken Sie die Konzepte für die Erstellung von Prompts, die genaue Ergebnisse liefern.
      </div>
    </div>
    <div class="benefit-card">
      <div class="benefit-icon">🚀</div>
      <div class="benefit-title">Produktivität steigern</div>
      <div class="benefit-description">
        Nutzen Sie KI-Tools, um Ihre Effizienz bei täglichen Aufgaben zu verbessern.
      </div>
    </div>
    <div class="benefit-card">
      <div class="benefit-icon">📚</div>
      <div class="benefit-title">Erprobte Strategien</div>
      <div class="benefit-description">
        Entdecken Sie Techniken, die auf Empfehlungen von OpenAI, der UNESCO und Expert:innen basieren.
      </div>
    </div>
    <div class="benefit-card">
      <div class="benefit-icon">🎖️</div>
      <div class="benefit-title">Digitales Lernabzeichen</div>
      <div class="benefit-description">
        Testen Sie Ihr Wissen direkt nach jeder Lektion. Für Ihren Lernerfolg erhalten Sie einen Digital Badge.
      </div>
    </div>

    </div>
    </section>

<section class="about-section">
  <h2>Über den Grundlagen-Kurs</h2>
  <p>Der Grundlagen-Kurs umfasst 4 Lektionen und ist in rund 4 x 60 Minuten abschließbar. </p>
  <div class="about-container">
    <div class="about-card">
      <div class="about-icon">🖋️</div>
      <div class="about-content">
        <div class="about-title">Klare Anweisungen schreiben</div>
        <div class="about-description">
          Sie lernen, wie Sie präzise und eindeutige Prompts schreiben, um bessere Antworten von der KI zu erhalten.
        </div>
      </div>
    </div>

    <div class="about-card">
      <div class="about-icon">📖</div>
      <div class="about-content">
        <div class="about-title">Referenztexte bereitgestellt</div>
        <div class="about-description">
          Sie erfahren, wie Referenztexte und Beispiele die Qualität von KI-Antworten erheblich verbessern können.
        </div>
      </div>
    </div>

    <div class="about-card">
      <div class="about-icon">🔗</div>
      <div class="about-content">
        <div class="about-title">Komplexe Aufgaben teilen</div>
        <div class="about-description">
          Sie verstehen, wie man große Anfragen in sinnvolle Schritte unterteilt – für mehr Klarheit und Genauigkeit.
        </div>
      </div>
    </div>

    <div class="about-card">
      <div class="about-icon">⏳</div>
      <div class="about-content">
        <div class="about-title">Modelle nachdenken lassen</div>
        <div class="about-description">
          Sie entdecken, wie Sie Ihre Prompts so formulieren, dass die KI schrittweise überlegt und durchdachte Antworten liefert.
        </div>
      </div>
    </div>
  </div>
</section>

<section class="cta-section">
  <h2>Machen Sie den nächsten Schritt</h2>
  <p>
    Melden Sie sich noch heute an und lernen Sie im Grundlagen-Kurs bewährte Strategien, um Prompt-Engineering zu meistern!
  </p>
  <div class="cta-buttons">
    <a href={resolve("/login")} class="cta-button" style="margin-bottom: 5em;">jetzt anmelden</a>
  </div>
</section>

</main>