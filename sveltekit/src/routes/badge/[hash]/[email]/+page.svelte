<script lang="ts">
    import Header from '$lib/Header.svelte';
  import type { Badge } from '@prisma/client';
  
  export let data: { 
    badgeEmail: string, 
    badgeHash: string, 
    badgeLesson: string, 
    badgeLessonStars?: number, 
    badgeCourse: string,
    badgeDate: string,
  };

</script>

<Header />

<main>

{#if data.badgeEmail}
  <h1>Digital Badge Bestätigung</h1>
  <i>Zertifikat {data.badgeHash} vom {data.badgeDate}</i>
  <p>Der User <b>{data.badgeEmail}</b><br>
    hat die Lektion <b>{data.badgeLesson}</b><br>
    im Kurs: <b>{data.badgeCourse}</b> <br>
    absolviert{data.badgeLessonStars > 0 ? ' und die Selbstüberprüfung bestanden' : ''}.<br>
  </p>
{:else}
  <h1>Diese Badge existiert nicht</h1>
  <p>Entweder stimmt die E-Mail oder die Zertifikatsnummer nicht.</p>
  <p>Es kann auch sein, dass der User seinen Account gelöscht hat.</p>

{/if}



</main>