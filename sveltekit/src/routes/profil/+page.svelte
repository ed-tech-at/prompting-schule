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
  
<Header navItems={[{ name: 'Kurse', href: '/kurse' }]} user={data.user} />
<!-- <Header navItems={[{ name: 'Kurse', href: '/kurse' }, { name: 'Profil', href: '/profil' }]} user={data.user} /> -->
  <main>
    <h1>Profil</h1>
    <p>E-Mail: {data.user.email}</p>

    <div style="margin-bottom: 3em;">

      <a href="/kurse" class="button large secondary">Zu den Kursen</a>
    </div>

    

    <div style="margin-bottom: 2em;">

    <button class="large" on:click={() => showPwChangeForm = !showPwChangeForm}  style="margin-bottom: 1em;">
      {showPwChangeForm ? 'Passwort ändern —' : 'Passwort ändern +'}
    </button>

    {#if pwChangeResult}
      <h3>{pwChangeResult}</h3>
    {/if}

    {#if showPwChangeForm}
    
    
      <form on:submit|preventDefault={handlePwChange}>
        
        <label for="old">Ihr Passwort:</label>
        <input type="password" bind:value={oldPassword} name="old">
        <br>
        <label for="password">Neues Passwort:</label>
        <input type="password" id="password" bind:value={newPassword} name="new">
        <br><button type="submit" class="medium">{buttonText}</button>
      </form>
    {/if}

  </div>
    
  <div style="margin-bottom: 2em;">

    <a href="/logout" class="button large complementary" data-sveltekit-reload rel="external">Logout</a>

    </div>


    <div style="margin-top: 3em; margin-bottom: 2em;">

      <button class="large danger" on:click={() => showDelFrom = !showDelFrom}>
        {showDelFrom ? 'Account löschen —' : 'Account löschen +'}
      </button>
  
     {#if delResult}
      <h3 style="margin-top: 1em; color: red">{delResult}</h3>
    {/if}
  
  
      {#if showDelFrom}
      
      
        <form on:submit|preventDefault={handleDel}>
          
          <p> Nach dem Absenden der Löschung wird die Verknüpfung Ihres Kontos mit Ihrer E-Mail-Adresse dauerhaft gelöscht und Sie werden abgemeldet.<br>
            <strong>Wichtig:</strong> Danach ist keine Anmeldung mit dieser E-Mail-Adresse und Ihrem Passwort mehr möglich, ein neuer Account mit dieser E-Mail Adresse kann danach jedoch bei Bedarf wieder erstellt werden. <br>
            <strong>Achtung:</strong> Zertifikate und Digital Badges können nach der Löschung nicht mehr heruntergeladen werden, und bereits ausgestellte Zertifikate und Digital Badges lassen sich nicht mehr validieren oder auf Echtheit überprüfen.</p>
            
            <br><label for="email">Ihre E-Mail-Adresse:</label>
            <input type="email" id="email" bind:value={email} name="email">
            
            <br>
          <label for="password">Ihr Passwort:</label>
          <input type="password" bind:value={password} name="password">

          
          <br>
          
          <button type="submit" class="danger medium">Benutzeraccount löschen</button>
        </form>
      {/if}
  
    </div>
  
  
  </main>