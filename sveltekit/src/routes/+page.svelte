<script lang="ts">
  import Header from "$lib/Header.svelte";
  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: { user: JwtUserPayload }; 
</script>
<Header user={data.user}  />


<style>
h1, h2 {
    color: white
}
    /* Language Selector
    .language-selector {
        position: absolute;
        top: 20px;
        right: 20px;
        display: flex;
        gap: 20px;
        font-size: 16px;
        font-weight: bold;
    }

    .language-selector p {
        margin: 10;
        font-family: 'Roboto', sans-serif;
        color: #B5E3E8;
        text-transform: uppercase;
    }
    .language-button {
        text-decoration: none;
        color: #2f929a;
        padding: 8px 15px;
        border: 2px solid #2f929a;
        border-radius: 12px;
        transition: all 0.3s ease-in-out;
    }

    .language-button:hover {
        background-color: #2f929a;
        color: white;
    } */

    /* Responsive Design
    @media (max-width: 768px) {
        .language-selector {
            font-size: 14px;
            gap: 10px;
        }

        .language-button {
            padding: 6px 12px;
        }
    } */

    section {
        margin: 0;
    }
    /* Hero Section */
    .hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 80px 20px;
        background: linear-gradient(to bottom, #2f929a, #B5E3E8);
        color: white;
        /* height: 400px; */
        overflow: hidden;
        position: relative;
    }

    .hero h1 {
        font-size: 48px;
        /* font-family: 'Roboto', sans-serif; */
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3); /* Add subtle shadow for text */
        text-transform: uppercase;
    }

    .hero p {
        font-size: 1em;
        /* font-family: 'Roboto', sans-serif; */
        margin-bottom: 30px;
        max-width: 800px;
        line-height: 1.6;
        color: #ffffff;        
    }

    /* CTA Section */
    .cta-section {
        text-align: center;
        padding: 50px 20px;
        background: linear-gradient(to bottom, #B5E3E8, #2f929a);
        color: white;
    }

  .cta-section h2 {
    font-size: 36px;
    margin-bottom: 20px;
  }

  .cta-section p {
    font-size: 18px;
    margin-bottom: 30px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
  }

  .cta-buttons {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
  }

  .cta-button {
    background-color: #ffcc00;
    color: #2f929a;
    padding: 15px 30px;
    font-size: 18px;
    font-weight: bold;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    text-decoration: none;
    transition: background-color 0.3s, transform 0.2s;
  }

  .cta-button:hover {
    background-color: #e6b800;
    transform: scale(1.05);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .cta-buttons {
      flex-direction: column;
      gap: 15px;
    }

    .cta-button {
      width: 100%; /* Full-width buttons for mobile */
    }
  }

    
    /* Dimmed Background Letters */
    .dimmed-text {
        position: absolute;
        top: 10%;
        left: 50%;
        transform: translateX(-50%);
        font-size: 180px; /* Large letters */
        font-weight: bold;
        color: rgba(255, 255, 255, 0.1); /* Dimmed white */
        z-index: 0; /* Ensure it stays behind other elements */
        white-space: nowrap; /* Prevent wrapping */
        pointer-events: none; /* Ensure it doesn’t interfere with clicks */
    }

    /* Benefits Section */
  .benefits-section {
    text-align: center;
    padding: 40px 20px;
    background-color: #f9f9f9;
    background: linear-gradient(to bottom, #B5E3E8, #f9f9f9);
  }

  .benefits-section h2 {
    font-size: 32px;
    color: #2f929a;
    margin-bottom: 20px;
  }

  .benefits-container {
    /* display: grid; */
    /*grid-template-columns: repeat(4, 1fr); /* Four columns for larger screens */
    display: flex;
    flex-wrap: wrap;
    justify-content: space-evenly;
    gap: 20px;
    max-width: 1220px;
    margin: 0 auto;
  }

  .benefit-card {
    background-color: white;
    border: 1px solid #ddd;
    border-radius: 10px;
    padding: 20px;
    max-width: 290px;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  /* .benefit-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  } */

  .benefit-icon {
    font-size: 48px;
    color: #2f929a;
    margin-bottom: 15px;
  }

  .benefit-title {
    font-size: 20px;
    color: #333;
    margin-bottom: 10px;
    font-weight: bold;
  }

  .benefit-description {
    font-size: 16px;
    color: #555;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .benefits-container {
      grid-template-columns: repeat(2, 1fr); /* Two columns for tablets */
    }

    .benefit-icon {
      font-size: 40px;
    }

    .benefit-title {
      font-size: 18px;
    }

    .benefit-description {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .benefits-container {
      grid-template-columns: 1fr; /* Single column for small screens */
    }
  }

  /* About Section */
  .about-section {
    padding: 50px 20px;
    text-align: center;
    /*background-color: #ffffff;*/
    background: linear-gradient(to bottom, #f9f9f9, #B5E3E8);
  }

  .about-section h2 {
    font-size: 32px;
    color: #2f929a;
    margin-bottom: 20px;
  }

  .about-container {
    display: flex;
    flex-direction: column;
    gap: 30px;
    max-width: 1220px;
    margin: 0 auto;
  }

  .about-card {
    display: flex;
    align-items: center;
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s, box-shadow 0.2s;
  }
/* 
  .about-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  } */

  .about-icon {
    font-size: 48px;
    color: #2f929a;
    margin-right: 20px;
  }

  .about-content {
    text-align: left;
  }

  .about-title {
    font-size: 20px;
    color: #333;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .about-description {
    font-size: 16px;
    color: #555;
    line-height: 1.6;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .about-card {
      flex-direction: column;
      text-align: center;
    }

    .about-icon {
      margin: 0 0 20px;
    }

    .about-content {
      text-align: center;
    }
  }

</style>

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
  <h1><img src='/logo-prompting.schule-bg.png' style="height: 1.3em;
    position: relative;
    top: 0.3em;
    margin-right: 0.3em;" alt="prompting.schule Logo" /> Meistern Sie Prompt-Engineering</h1>
  <p>
      Erzielen Sie bessere Ergebnisse mit KI-Modellen wie ChatGPT, indem Sie bewährte Strategien erlernen, klare Anweisungen zu schreiben und komplexe Aufgaben zu vereinfachen.
  </p>
  <a href="/login" class="cta-button">ab Mai verfügbar</a>
</section>

<!-- Language Selector -->
<!-- <div class="language-selector">
  <p>Sprache:</p>
  <button class="language-button">
    <a href="https://a-i.education/"> English </a>
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
      <div class="benefit-title">Kostenlos starten</div>
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
        Testen Sie Ihr Wissen direkt nach jeder Lektion. Für Ihren Lernerfolg erhalten Sie eine Digital Badge.
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
    <a href="/login" class="cta-button" style="margin-bottom: 5em;">ab Mai verfügbar</a>
  </div>
</section>