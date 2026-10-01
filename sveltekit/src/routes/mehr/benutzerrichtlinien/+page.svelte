<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
</script>

<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Benutzerrichtlinien', href: '/mehr/benutzerrichtlinien' }]} />

<main>
  <h1>Benutzerrichtlinien</h1>

  <div>
    <p><i>Stand: 2026-03-27</i></p>

    <p>
      Diese Benutzerrichtlinien gelten für die Nutzung von prompting.schule und der damit verbundenen Inhalte und
      Funktionen.
    </p>

    <p>
      Die Plattform dient der Unterstützung beim Lernen und Anwenden von Prompting-Techniken im Umgang mit KI-Systemen.
      Nutzer:innen sind verpflichtet, die angebotenen Funktionen rechtmäßig, sorgfältig und verantwortungsvoll zu
      verwenden.
    </p>

    <p>
      Generierte Inhalte sind vor einer Weiterverwendung eigenständig zu prüfen. Es besteht keine Gewähr für
      Richtigkeit, Vollständigkeit oder ständige Verfügbarkeit der Plattform.
    </p>

    <p>
      Personenbezogene Daten werden im Rahmen des Betriebs der Plattform verarbeitet. Nähere Informationen finden Sie in
      der <a href={resolve('/mehr/datenschutz')}>Datenschutzerklärung</a>.
    </p>

    <p>
      Weitere Angaben zur Verantwortlichkeit und Kontaktmöglichkeiten finden Sie im
      <a href={resolve('/mehr/impressum')}> Impressum</a>.
    </p>
  </div>

  <a href={resolve('/')}>Zur Startseite</a>
</main>
