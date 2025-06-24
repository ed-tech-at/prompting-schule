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
      window.location.href = "/en/profile";
    }
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
          const response = await fetch("/en/login", {
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

            window.location.href = "/en/courses";
           
          } else {
              error = data.error || "Invalid login credentials. Please try again.";
          }
      } catch (err) {
          error = "An error occurred. Please try again later.";
          console.error(err);
      } finally {
          loading = false;
      }
  }
</script>


<Header navItems={[{ name: 'Frontpage', href: '/' }, { name: 'Login', href: '/en/login' }]} user={null} lang="en"  />


<div class="registerBg">
  <div class="registerBlock">
      <h2>Login</h2>
      {#if error}
          <div class="error-message">{error}</div>
      {/if}
      <form on:submit|preventDefault={handleLogin}>
          <div class="form-group">
              <label for="email">Email Address</label>
              <input
                  id="email"
                  type="text"
                  placeholder="Enter your email address"
                  bind:value={email}
                  required
              />
          </div>
          <div class="form-group">
              <label for="password">Password</label>
              <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  bind:value={password}
                  required
              />
          </div>
          <button type="submit" class="login-button" disabled={loading}>
              {#if loading}
                  <div class="loader"></div>
              {/if}
              {!loading ? "Login" : "Login..."}
          </button>
      </form>
      <div class="alt-links">
        
          <a style="color: var(--color-complementary);"  href='/passwort'>Forgot password</a>

          <p>You do not have an account?</p>
          <a href="/en/register" class="button invert">Register</a>
      </div>
  </div>
</div>
