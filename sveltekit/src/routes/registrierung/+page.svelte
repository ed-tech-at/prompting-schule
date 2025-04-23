<script lang="ts">
      import Header from '$lib/Header.svelte';

  let email = "";
  let password = "";
  let loading = false;
  let error = "";
  let agree = false; 
  
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
      if ( !email || !password ) {
          error = "All fields are required.";
          loading = false;
          return;
      }

      if (!agree) {
          error = "Please agree to the terms of use.";
          loading = false;
          return;
      }


      try {

            const formData = {
                email,
                password,
            };

          const response = await fetch(`/registrierung/`, { 
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  formData,
                  action: 'create' 
              }),
          });

          const data = await response.json();
          if (response.ok && data.success) {
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
              error = data.error || "Failed to register. Please try again.";
          }
      } catch (err) {
          error = "Something went wrong. Please try again later.";
          console.error("Error registering user:", err);
      } finally {
          loading = false;
      }
  }
</script>
<!-- 
<style>
  /* Register Section */
  .register-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 60px 20px;
      background: linear-gradient(to bottom, #2f929a, #B5E3E8);
      color: white;
      min-height: 100vh;
  }

  .register-container {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      padding: 30px 20px;
      max-width: 400px;
      width: 100%;
      text-align: left;
  }

  .register-container h2 {
      color: #2f929a;
      margin-bottom: 20px;
      text-align: center;
  }

  .form-group {
      margin-bottom: 15px;
  }

  .form-group label {
      display: block;
      font-weight: bold;
      margin-bottom: 5px;
      color: #2f929a;
  }

  .form-group input {
      width: 100%;
      padding: 10px;
      font-size: 14px;
      border: 1px solid #ddd;
      border-radius: 8px;
      outline: none;
      transition: border 0.3s ease;
  }

  .form-group input:focus {
      border: 2px solid #2f929a;
  }

  .register-button {
      width: 100%;
      background-color: #2f929a;
      color: white;
      padding: 12px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s ease-in-out;
  }

  .register-button:hover {
      background-color: #227a7f;
  }

  .alt-links {
      margin-top: 20px;
      text-align: center;
  }

  .alt-links p {
      color: #2f929a;
  }

  .alt-links-button {
      width: 100%;
      background-color: #ffffff;
      color: #2f929a;
      padding: 12px;
      border:#2f929a solid 2px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      transition: background-color 0.3s ease-in-out;
  }

  .alt-links-button:hover {
      background-color: #227a7f;
      color: white;
  }

      /* Keep your existing styles */
  /* Add loader animation */
  .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2f929a;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 1s linear infinite;
      margin: 10px auto;
  }

  @keyframes spin {
      0% {
          transform: rotate(0deg);
      }
      100% {
          transform: rotate(360deg);
      }
  }

  .error-message {
      color: red;
      font-size: 14px;
      margin-bottom: 10px;
      text-align: center;
  }

  .checkbox-form {
      display: flex; 
      align-items: center;
      color: black;
      margin-bottom: 10px;
  }
</style> -->

<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Registrierung', href: '/registrierung' }]} />


<div class="registerBg">
  <div class="registerBlock">
      <h2>Registrierung</h2>
      {#if error}
          <div class="error-message">{error}</div>
      {/if}
      <form on:submit|preventDefault={handleSubmit}>
          <div class="form-group">
              <label for="email">E-Mail-Adresse</label>
              <input
                  id="email"
                  type="email"
                  placeholder="Geben Sie Ihre E-Mail-Adresse ein"
                  bind:value={email}
                  required
              />
          </div>
          <div class="form-group">
              <label for="password">Passwort</label>
              <input
                  id="password"
                  type="password"
                  placeholder="Passwort erstellen"
                  bind:value={password}
                  required
              />
          </div>
          <!-- Checkbox for Terms and Conditions -->
          <div class="checkbox-form">
              <label>
                Die Teilnahme ist freiwillig.<br>
                Die eingegebenen Daten werden für wissenschaftliche Zwecke ausgewertet.<br>
                  <input type="checkbox" bind:checked={agree} required>
                  Ich habe den  <a href="/mehr/datenschutz" target="_blank">Datenschutz und die Teilnahmebedingungen</a> gelesen und akzeptiere sie.

              </label>
          </div>
          <button type="submit" class="register-button" disabled={loading}>
              {#if loading}
                  <div class="loader"></div>
              {/if}
              {!loading ? "Registrierung" : "Registrierung..."}
          </button>
      </form>
      <div class="alt-links">
          <p>Haben Sie bereits ein Konto?</p>
          <a href="/login" class="button invert">Einloggen
          </a>
      </div>
  </div>
</div>