<script lang="ts">
  import Header from '$lib/Header.svelte';
    import type { UserPasswordReset } from '.prisma/client';

  export let data: { resetEntry: UserPasswordReset };

  let password = "";
  let error = "";


  async function handleSubmit() {
      error = "";
      

      // Client-side validation
      if (  !password ) {
          error = "Passwort wird benötigt.";
          
          return;
      }


      try {

            const formData = {
                userId: data.resetEntry.userId,
                token: data.resetEntry.token,
                password,
            };

          const response = await fetch(`/api/passwort`, { 
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  formData,
                  action: 'passwortReset' 
              }),
          });

          const answerdata = await response.json();
          if (response.ok && answerdata.success) {
              // Registration successful
              // You can redirect the user or show a success message here
              // For example:
            //   console.log("User registered successfully:", data.user);
            //   console.log("User ID:", data);

            //   localStorage.setItem("userId", data.user.id);
            //   localStorage.setItem("userEmail", data.user.email);

              window.location.href = "/profil";
              // navigate("/en/login");
          } else {
              error = answerdata.error || "Fehlgeschlagen.";
          }
      } catch (err) {
          error = "Etwas ist schiefgelaufen. Bitte versuchen Sie es später erneut.";
          console.error("Error registering user:", err);
      } finally {
          // loading = false;
      }
  }

</script>
<Header navItems={[{ name: 'Passwort zurücksetzen', href: '/' }]} /> 

{#if data.resetEntry}

<div class="registerBg">
  <div class="registerBlock">

  <h1>Passwort zurücksetzen</h1>
  {#if error}
        <div class="error-message">{error}</div>
    {/if}
  <p>Bitte geben Sie Ihr neues Passwort ein.</p>
  <form  on:submit|preventDefault={handleSubmit}>
    <input type="password" bind:value={password} name="password" placeholder="Neues Passwort" required />
    <button type="submit">Passwort zurücksetzen</button>
  </form>

  </div>
</div>

{:else}
  <p>Token und E-Mail nicht gültig.</p>
{/if}
  