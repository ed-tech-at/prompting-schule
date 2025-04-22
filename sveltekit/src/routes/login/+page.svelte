<script lang="ts">
  
  let email = "";
  let password = "";
  let error = "";
  let loading = false;
  import Header from '$lib/Header.svelte';
  import { browser } from '$app/environment';

  import type { JwtUserPayload } from '$lib/server/jwt';

  export let data: { user: JwtUserPayload }; 


let userId = "";
if (browser) {
    if (data.user) {
      window.location.href = "/profil";
    }
//   userId = localStorage.getItem("userId");
//   console.log("Benutzer-ID:", userId);
//   if (userId) {
    //   window.location.href = "/profil";
    // }
}

  async function handleLogin() {
      error = "";
      loading = true;

      if (!email || !password) {
          error = "Beide Felder sind erforderlich.";
          loading = false;
          return;
      }

      try {
            const formData = {
                email,
                password,
            };
          const response = await fetch("/login", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
              },
              body: JSON.stringify({
                  formData,
                  action: 'login' 
              }),
          });

          const data = await response.json();
          
          if (response.ok && data.success) {

            window.location.href = "/kurse";
            // console.log("Benutzer erfolgreich angemeldet:", data.user);
            //   localStorage.setItem("userId", data.user.id);
            //   localStorage.setItem("userEmail", data.user.email);

            //   console.log("Benutzer-ID:", data.user);
            //   if (data.user.isAdmin) {
            //       localStorage.setItem("isAdmin", data.user.isAdmin);
            //   }
            //   // Redirect to the dashboard or home page after successful login
            //   window.location.href = "/dashboard"; // Add this line for redirection
          } else {
              error = data.error || "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.";
          }
      } catch (err) {
          error = "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
          console.error(err);
      } finally {
          loading = false;
      }
  }
</script>
<!-- 
<style>
  /* Login-Bereich */
  .login-section {
      
  }

  .login-container {
      
  }

  .login-container h2 {
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

  .form-group input[type="text"],
  .form-group input[type="password"] {
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

  .login-button {
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

  .login-button:hover {
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
      border: #2f929a solid 2px;
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
</style> -->

<Header navItems={[{ name: 'Startseite', href: '/' }, { name: 'Login', href: '/login' }]} user={null} />


<div class="registerBg">
  <div class="registerBlock">
      <h2>Anmeldung</h2>
      {#if error}
          <div class="error-message">{error}</div>
      {/if}
      <form on:submit|preventDefault={handleLogin}>
          <div class="form-group">
              <label for="email">E-Mail-Adresse</label>
              <input
                  id="email"
                  type="text"
                  placeholder="Geben Sie Ihre E-Mail ein"
                  bind:value={email}
                  required
              />
          </div>
          <div class="form-group">
              <label for="password">Passwort</label>
              <input
                  id="password"
                  type="password"
                  placeholder="Geben Sie Ihr Passwort ein"
                  bind:value={password}
                  required
              />
          </div>
          <button type="submit" class="login-button" disabled={loading}>
              {#if loading}
                  <div class="loader"></div>
              {/if}
              {!loading ? "Anmelden" : "Anmelden..."}
          </button>
      </form>
      <div class="alt-links">
        
          <a style="color: var(--color-complementary);"  href='/passwort'>Passwort vergessen</a>

          <p>Sie haben noch kein Konto?</p>
          <a href="/registrierung" class="button invert">Registrierung</a>
      </div>
  </div>
</div>
