<script lang="ts">

  import { onMount } from 'svelte';
  import type { Badge, Lesson } from '@prisma/client';
    import type { JwtUserPayload } from '$lib/server/jwt';

  export let badge: Badge;
  export let lesson: Lesson;
  export let user: JwtUserPayload;
  let badgeDataUrl: string = '';


  async function getBadgeImg(badgeHash: string) {
    const formData = {
      lessonId: lesson.id,
      hash: badgeHash
    }
    const response = await fetch('/api/badge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        formData,
        action: 'getBadgeImg',
      })
    });
    if (response.ok) {
      const imgBadge = await response.json();
      // console.log('Badge image:', imgBadge);
      badgeDataUrl = imgBadge.image; // Updated to match the response structure
    } else {
      console.error('Error creating badge:', response.statusText);
    }
  }

  async function downloadBadge (imgUrl: string, email: string, lessonUrl: string) {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `badge_${email}_${lessonUrl}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  onMount(() => {
    getBadgeImg(badge.hash);
  });
  
</script>

<div class="badge-container">
  Badge ausgestellt am: {new Date(badge.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} 
  <br>
  Link zum öffentlichen Digital Badge: <a href='https://prompting.schule/badge/{badge.hash}/{user.email}' target="_blank">https://prompting.schule/badge<span class="break-word">/</span>{badge.hash}/{user.email}</a>

  <br>
  
  {#if badgeDataUrl}
  <img src={badgeDataUrl} alt="Badge" width="300" /><br>
  <button on:click={downloadBadge(badgeDataUrl, user.email, lesson.URL)}>Badge herunterladen</button>
  {/if}
  
</div>