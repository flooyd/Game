
<script lang='ts'>
	import { fade } from 'svelte/transition';
  import {socket, home} from '../stores';

  export let player: any;

  let registerSuccess = false;
  let username = '';
  let password = '';
  let email = '';
  let login = true;
  let register = false;

  $: if ($socket) {
    $socket.on('Registered', (player) => {
			console.log('Registered');
			username = '';
			password = '';
			email = '';
			registerSuccess = true;
			login = true;
			register = false;
		});

    $socket.on('RegistrationFailed', (message) => {
			console.log('RegistrationFailed', message);
		});

		$socket.on('LoginFailed', (message) => {
			console.log('LoginFailed', message);
		});
  }
</script>


<div transition:fade class="home">
  <h1>The Game</h1>
  {#if registerSuccess}
    <div class="highlight">Registration successful! Please login.</div>
  {/if}
  <div class="flexer">
    <button
      on:click={() => {
        login = true;
        register = false;
      }}
      style={login ? 'background-color: lightgreen' : ''}>Login</button
    >
    <button
      on:click={() => {
        login = false;
        register = true;
      }}
      style={register ? 'background-color: lightgreen' : ''}>Register</button
    >
  </div>
  <div class="col-flexer">
    {#if login}
      <input type="text" placeholder="Username" bind:value={username} />
      <input type="password" placeholder="Password" bind:value={password} />
      <button
        on:click={() => {
          $socket?.emit('Login', username, password);
        }}
      >
        Login
      </button>
    {/if}
    {#if register}
      <input type="text" placeholder="Username" bind:value={username} />
      <input type="password" placeholder="Password" bind:value={password} />
      <input
        type="email"
        placeholder="Email (optional, for password reset)"
        bind:value={email}
      />
      <button
        on:click={() => {
          $socket?.emit('Register', username, password, email);
        }}
      >
        Register
      </button>
    {/if}
  </div>
</div>

<style>
  
	.home {
		position: absolute;
		z-index: 1000;
		top: 0px;
		left: 0px;
		width: 100dvw;
		height: 100dvh;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		background-color: rgba(0, 0, 0, 1);
		color: white;
		gap: 19.2px;
	}
</style>