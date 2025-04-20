<script lang="ts">
  import Header from '$lib/Header.svelte';

let email = "";
let error = "";
let loading = false;
let showForm = true;

import type { JwtUserPayload } from '$lib/server/jwt';
export let data: { user: JwtUserPayload }; 

import { browser } from '$app/environment';


if (browser) {
if (data.user) {
  window.location.href = "/profil";
}
}

async function handleSubmit() {
  error = "";
  loading = true;

  // Client-side validation
  if ( !email ) {
      error = "All fields are required.";
      loading = false;
      return;
  }


  try {

        const formData = {
            email
        };

      const response = await fetch(`/passwort/`, { 
          method: "POST",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify({
              formData,
              action: 'passwort' 
          }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
            showForm = false;
          // Registration successful
          // You can redirect the user or show a success message here
          // For example:
        //   console.log("User registered successfully:", data.user);
        //   console.log("User ID:", data);

        //   localStorage.setItem("userId", data.user.id);
        //   localStorage.setItem("userEmail", data.user.email);
          // window.location.href = "/profil";
          error = "Ein Link zum Zurücksetzen des Passworts wurde an Ihre E-Mail-Adresse gesendet.";
          // navigate("/en/login");
      } else {
          error = data.error || "Ein Fehler ist aufgetreten.";
      }
  } catch (err) {
      error = "Ein Fehler ist aufgetreten.";
  } finally {
      loading = false;
  }
}
</script>

<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Passwort zurücksetzen', href: '/passwort' }]} />


<div class="registerBg">
<div class="registerBlock">
  <h2>Passwort zurücksetzen</h2>
  {#if error}
      <div class="error-message">{error}</div>
  {/if}
  {#if showForm}
  <form on:submit|preventDefault={handleSubmit}>
      <div class="form-group">
          <label for="email">E-Mail Addresse</label>
          <input
              id="email"
              type="email"
              placeholder="Geben Sie Ihre E-Mail ein"
              bind:value={email}
              required
          />
      </div>
      
      <button type="submit" class="register-button" disabled={loading}>
          {#if loading}
              <div class="loader"></div>
          {/if}
          {!loading ? "Passwort-Token zusenden" : ""}
      </button>
  </form>
  {/if}

  <div class="alt-links">
      <p>Sie kennen Ihr Passwort?</p>
      <a href="/login" class="button invert">Einloggen
      </a>
  </div>
</div>
</div>