<script lang="ts">
      
  import Header from '$lib/Header.svelte';  
  
  import type { JwtUserPayload } from '$lib/server/jwt';
  
  export let data: { user: JwtUserPayload };


  let oldPassword = "";
  let email = "";
  let password = "";
  let newPassword = "";
  let showPwChangeForm = false;
  let buttonText = "Change Password";
  let pwChangeResult = "";
  
  let showDelFrom = false;
  let delResult = "";


  async function handlePwChange() {
      
      if (!oldPassword || !newPassword) {
        pwChangeResult = "Both fields are required.";

          return;
      }

      try {
            const formData = {
                oldPassword,
                newPassword,
            };
          const response = await fetch("/en/profile", {
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

            pwChangeResult = "Password successfully changed.";
            // buttonText = "Password successfully changed. Change password";
            oldPassword = "";
            newPassword = "";
            showPwChangeForm = false;

          } else if (data.error) {
              pwChangeResult = data.error;
            
          } else {
              pwChangeResult = data.error || "An error occurred. Please try again later.";
          }
      } catch (err) {
          pwChangeResult = "An error occurred. Please try again later.";
          console.error(err);
      }
  }
    


  async function handleDel() {
      
      if (!password || !email) {
        delResult = "Both fields are required.";

          return;
      }

      try {
            const formData = {
              password,
                email,
            };
          const response = await fetch("/en/profile", {
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

            window.location.href = "/en/logout";

          } else if (data.error) {
              delResult = data.error;
            
          } else {
              delResult = data.error || "An error occurred. Please try again later.";
          }
      } catch (err) {
          delResult = "An error occurred. Please try again later.";
          console.error(err);
      }
  }
    
</script>
  
<Header navItems={[{ name: 'Courses', href: '/en/courses' }]} user={data.user} lang="en"  />
<!-- <Header navItems={[{ name: 'Kurse', href: '/kurse' }, { name: 'Profil', href: '/profil' }]} user={data.user} /> -->
  <main>
    <h1>Profile</h1>
    <p>Email: {data.user.email}</p>

    <div style="margin-bottom: 3em;">

      <a href="/en/courses" class="button large secondary">Go to Courses</a>
    </div>

    

    <div style="margin-bottom: 2em;">

    <button class="large" on:click={() => showPwChangeForm = !showPwChangeForm}  style="margin-bottom: 1em;">
      {showPwChangeForm ? 'Change Password —' : 'Change Password +'}
    </button>

    {#if pwChangeResult}
      <h3>{pwChangeResult}</h3>
    {/if}

    {#if showPwChangeForm}
    
    
      <form on:submit|preventDefault={handlePwChange}>

        <label for="old">Your old password:</label>
        <input type="password" bind:value={oldPassword} name="old">
        <br>
        <label for="password">New password:</label>
        <input type="password" id="password" bind:value={newPassword} name="new">
        <br><button type="submit" class="medium">{buttonText}</button>
      </form>
    {/if}

  </div>
    
  <div style="margin-bottom: 2em;">

    <a href="/en/logout" class="button large complementary" data-sveltekit-reload rel="external">Logout</a>

    </div>


    <div style="margin-top: 3em; margin-bottom: 2em;">

      <button class="large danger" on:click={() => showDelFrom = !showDelFrom}>
        {showDelFrom ? 'Delete Account —' : 'Delete Account +'}
      </button>
  
     {#if delResult}
      <h3 style="margin-top: 1em; color: red">{delResult}</h3>
    {/if}
  
  
      {#if showDelFrom}
      
      
        <form on:submit|preventDefault={handleDel}>

          <p> After submitting the deletion, the link between your account and your email address will be permanently deleted, and you will be logged out.<br>
            <strong>Important:</strong> After that, it will not be possible to log in with this email address and your password. However, a new account with this email address can be created again if necessary.<br>
            <strong>Note:</strong> Certificates and digital badges cannot be downloaded after deletion, and already issued certificates and digital badges can no longer be validated or verified for authenticity.</p>

            <br><label for="email">Your email address:</label>
            <input type="email" id="email" bind:value={email} name="email">
            
            <br>
          <label for="password">Your password:</label>
          <input type="password" bind:value={password} name="password">

          
          <br>

          <button type="submit" class="danger medium">Delete user account</button>
        </form>
      {/if}
  
    </div>
  
  
  </main>