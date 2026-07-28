<script>
  export let data;
  import Footer from '$lib/Footer.svelte';
  import FooterEn from '$lib/FooterEn.svelte';
  import './layout.css';

  import { asset } from '$app/paths';

  $: isEnglish = data.pathname?.endsWith('/en') || data.pathname?.includes('/en/');
</script>
<svelte:head>
  <link rel="stylesheet" href={asset("/fonts/fontawesome-free-5.15.3-web/css/all.min.css")} />
  <link rel="icon" type="image/png" href={asset("/favicon/favicon-96x96.png")} sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href={asset("/favicon/favicon.svg")} />
  <link rel="shortcut icon" href={asset("/favicon/favicon.ico")} />
  <link rel="apple-touch-icon" sizes="180x180" href={asset("/favicon/apple-touch-icon.png")} />
  <link rel="manifest" href={asset("/favicon/site.webmanifest")} />
</svelte:head>

<slot />

{#if isEnglish}
  <script>
    document.documentElement.lang = 'en';
  </script>
  <FooterEn />
{:else}
  <script>
    document.documentElement.lang = 'de';
  </script>
  <Footer />
{/if}
