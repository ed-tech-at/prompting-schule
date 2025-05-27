<script>
  export let data;
  import Footer from '$lib/Footer.svelte';
  import FooterEn from '$lib/FooterEn.svelte';
  import './layout.css';
</script>
<svelte:head>
  <link rel="stylesheet" href="/fonts/fontawesome-free-5.15.3-web/css/all.min.css" />
  <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
  <link rel="shortcut icon" href="/favicon/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
  <link rel="manifest" href="/favicon/site.webmanifest" />
</svelte:head>

<slot />

{#if data.pathname?.startsWith('/en')}
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