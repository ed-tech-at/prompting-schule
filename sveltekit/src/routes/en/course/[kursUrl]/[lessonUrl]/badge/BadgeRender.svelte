<script lang="ts">

  import { onMount } from 'svelte';
  import type { Badge, Lesson } from '@prisma/client';
    import type { JwtUserPayload } from '$lib/server/jwt';

  import { resolve } from '$app/paths';
    import { env } from '$env/dynamic/public';

  const PUBLIC_APP_URL = env.PUBLIC_APP_URL ?? '';
  
  export let badge: Badge;
  export let lesson: Lesson;
  export let user: JwtUserPayload;
  let badgeDataUrl: string = '';


  async function getBadgeImg(badgeHash: string) {
    const formData = {
      lessonId: lesson.id,
      hash: badgeHash
    }
    const response = await fetch(resolve('/api/badge'), {
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

  function downloadBadge (imgUrl: string, email: string, lessonUrl: string) {
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `badge_${email}_${lessonUrl}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  onMount(() => {
    if (badge.hash) {
      getBadgeImg(badge.hash);
    }
  });
  
</script>

<div class="badge-container">
  Badge created at: {new Date(badge.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
  <br>
  {#if badge.hash}
  Link to public digital badge: <a href={(PUBLIC_APP_URL + `/badge/${badge.hash}/${user.email}`)} target="_blank">{PUBLIC_APP_URL}/badge<span class="break-word">/</span>{badge.hash}/{user.email}</a>
  {/if}

  <br>
  
  {#if badgeDataUrl}
  <img src={badgeDataUrl} alt="Badge" width="300" /><br>
  <button on:click={() => downloadBadge(badgeDataUrl, user.email, lesson.URL)}>Download badge</button>
  {/if}
  
</div>
