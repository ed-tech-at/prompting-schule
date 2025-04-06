<script lang="ts">
      
  import Header from '$lib/Header.svelte';  
  
  import type { JwtUserPayload } from '$lib/server/jwt';
  
  export let data: { user: JwtUserPayload };


  let oldPassword = "";
  let email = "";
  let password = "";
  let newPassword = "";
  let showPwChangeForm = false;
  let buttonText = "Passwort ändern";
  let pwChangeResult = "";
  
  let showDelFrom = false;
  let delResult = "";


  async function handlePwChange() {
      
      if (!oldPassword || !newPassword) {
        pwChangeResult = "Beide Felder sind erforderlich.";
          
          return;
      }

      try {
            const formData = {
                oldPassword,
                newPassword,
            };
          const response = await fetch("/profil", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  formData,
                  action: 'pwChange' 
              }),
          });

          const data = await response.json();
          
          if (response.ok && data.success) {

            pwChangeResult = "Passwort erfolgreich geändert.";
            // buttonText = "Passwort erfolgreich geändert. Passwort ändern";
            oldPassword = "";
            newPassword = "";
            showPwChangeForm = false;

          } else if (data.error) {
              pwChangeResult = data.error;
            
          } else {
              pwChangeResult = data.error || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
          }
      } catch (err) {
          pwChangeResult = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
          console.error(err);
      }
  }
    


  async function handleDel() {
      
      if (!password || !email) {
        delResult = "Beide Felder sind erforderlich.";
          
          return;
      }

      try {
            const formData = {
              password,
                email,
            };
          const response = await fetch("/profil", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  formData,
                  action: 'delAccount' 
              }),
          });

          const data = await response.json();
          
          if (response.ok && data.success) {

            window.location.href = "/logout";

          } else if (data.error) {
              delResult = data.error;
            
          } else {
              delResult = data.error || "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
          }
      } catch (err) {
          delResult = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
          console.error(err);
      }
  }
    
</script>
  
<Header navItems={[{ name: 'Dashboard', href: '/dashboard' }, { name: 'Profil', href: '/profil' }]} user={data.user} />
  <main>
    <h1>Profil</h1>
    <p>E-Mail: {data.user.email}</p>

    <a href="/dashboard" style="display: inline-block; color: var(--color-black); background: var(--color-secondary); padding: 1em 2em; border-radius: 15px; margin-bottom: 3em;">Zum Kurse - Dashboard</a>
    <br>

    

    <div style="margin-bottom: 2em;">

    <button class="large" on:click={() => showPwChangeForm = !showPwChangeForm}>
      {showPwChangeForm ? 'Passwort ändern ausblenden' : 'Passwort ändern anzeigen'}
    </button>

    {#if pwChangeResult}
      <h3>{pwChangeResult}</h3>
    {/if}

    {#if showPwChangeForm}
    
    
      <form on:submit|preventDefault={handlePwChange}>
        <br>
        <label for="old">Ihr Passwort:</label>
        <input type="password" bind:value={oldPassword} name="old">
        <br>
        <label for="password">Neues Passwort:</label>
        <input type="password" id="password" bind:value={newPassword} name="new">
        <br><button type="submit">{buttonText}</button>
      </form>
    {/if}

  </div>
    
  <div style="margin-bottom: 2em;">

    <a href="/logout" class="button large complementary" data-sveltekit-reload rel="external">Logout</a>

    </div>


    <div style="margin-top: 3em; margin-bottom: 2em;">

      <button class="large danger" on:click={() => showDelFrom = !showDelFrom}>
        {showDelFrom ? 'Formular zur Benutzeraccount-Löschung ausblenden' : 'Formular zur Benutzeraccount-Löschung anzeigen'}
      </button>
  
     {#if delResult}
      <h3>{delResult}</h3>
    {/if}
  
  
      {#if showDelFrom}
      
      
        <form on:submit|preventDefault={handleDel}>
          <br>
          <p> Nach dem Absenden der Löschung wird die Verknüpfung Ihres Kontos mit Ihrer E-Mail-Adresse dauerhaft gelöscht und sie werden abgemeldet.<br>
            <strong>Wichtig:</strong> Danach ist keine Anmeldung mit dieser E-Mail-Adresse und Ihrem Passwort mehr möglich, ein neuer Account mit dieser E-Mail Adresse kann danach jedoch bei Bedarf wieder erstellt werden. <br>
            <strong>Achtung:</strong> Zertifikate und Open Badges können nach der Löschung nicht mehr heruntergeladen werden, und bereits ausgestellte Zertifikate und Open Badges lassen sich nicht mehr validieren oder auf Echtheit überprüfen.</p>
            
            <br><label for="email">Ihre E-Mail Adresse:</label>
            <input type="email" id="email" bind:value={email} name="email">
            
            <br>
          <label for="password">Ihr Passwort:</label>
          <input type="password" bind:value={password} name="password">

          
          <br><button type="submit" class="danger">Benutzeraccount löschen</button>
        </form>
      {/if}
  
    </div>
  
  <style>
    h1 {
      padding-bottom: 1em;
    }
    /* .courses {
      
      display: flex;
      /* grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); */
      gap: 1rem;
      flex-wrap: wrap;
      justify-content: center;
      margin: 1rem;
  
  
    }
    
    @media (min-width: 1200px) {
      .lessons.displayType-flex {
        flex-wrap: nowrap;
      }
    }
    @media (max-width: 1200px) {
      .lessons {
        flex-direction: column;
        align-content: space-around;
      }
    } */
  </style>
  
  </main>