<script lang="ts">
	import type { DefaultEventsMap } from '@socket.io/component-emitter';
	import { io, Socket } from 'socket.io-client';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	let mousePosition = { x: 0, y: 0 };
	let player: any | null = {
		name: '',
		x: 0,
		y: 0,
		width: 30,
		height: 30,
		speed: 0.5,
		area: null,
		id: null,
		prevX: null,
		prevY: null
	}; // Initialized at center (2500, 2500)
	let otherPlayers: any[] = [];
	let todos: any[] = [];
	let leftMouseDown: boolean;
	//create a 2d grid that is empty
	let grid: any[] = [];
	// grid.push({
	// 	x: 0,
	// 	y: 0,
	// 	width: 100,
	// 	height: 100,
	// 	color: 'red'
	// });
	let homeScreen = true;
	let login = true;
	let register = false;
	let username = '';
	let password = '';
	let email = '';
	let editTodo = '';
	let editTodoId: null = null;
	let editing = false;
	let creating = false;
	let editTodoInput: HTMLInputElement | null = null;
	let width = 0;
	let height = 0;
	let registerSuccess = false;

	// Handle mouse movement
	function handleMouseMove(event: { clientX: number; clientY: number }) {
		mousePosition = {
			x: event.clientX,
			y: event.clientY
		};
	}

	// Handle left mouse button down
	function handleLeftMouseDown(event: MouseEvent) {
		//if left mouse button is clicked
		if (event.button === 0) {
			//leftMouseDown = true;
		}
	}

	// Handle left mouse button up
	function handleLeftMouseUp(event: MouseEvent) {
		//if left mouse button is up
		if (event.button === 0) {
			//leftMouseDown = false;
		}
	}

	// Handle touch start
	function handleTouchStart(event: TouchEvent) {
		//event.preventDefault();
		mousePosition = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY
		};
		leftMouseDown = true;
	}

	// Handle touch end
	function handleTouchEnd(event: TouchEvent) {
		//event.preventDefault();
		leftMouseDown = false;
	}

	// Handle keyboard input
	let wasd = {
		w: false,
		a: false,
		s: false,
		d: false
	};

	function handleInput(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			editing = false;
			creating = false;
		}

		if (editing || creating) return;

		if (event.key === 'w') {
			wasd.w = event.type === 'keydown';
		} else if (event.key === 'a') {
			wasd.a = event.type === 'keydown';
		} else if (event.key === 's') {
			wasd.s = event.type === 'keydown';
		} else if (event.key === 'd') {
			wasd.d = event.type === 'keydown';
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === ' ' && !editing && !creating && !homeScreen) {
			editTodo = '';
			creating = true;
			//set wasd to false so the player stops moving
			wasd = {
				w: false,
				a: false,
				s: false,
				d: false
			};
		}
	}

	// Center the viewport on the player
	function centerView() {
		const scrollX = player.x - window.innerWidth / 2 + player.width / 2;
		const scrollY = player.y - window.innerHeight / 2 + player.height / 2;
		window.scrollTo({
			left: scrollX,
			top: scrollY,
			behavior: 'auto' // Use 'smooth' for animated scrolling
		});
	}

	let socket: Socket<DefaultEventsMap, DefaultEventsMap> | null = null;

	onMount(() => {
		// Add event listeners
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mousedown', handleLeftMouseDown);
		window.addEventListener('mouseup', handleLeftMouseUp);
		window.addEventListener('touchstart', handleTouchStart);
		window.addEventListener('touchend', handleTouchEnd);
		window.addEventListener('keydown', handleInput);
		window.addEventListener('keyup', handleInput);
		window.addEventListener('keypress', handleKeyPress);
		window.addEventListener('blur', () => {
			wasd = {
				w: false,
				a: false,
				s: false,
				d: false
			};
		});

		// Connect to the server
		if (window.location.toString().includes('localhost')) {
			socket = io('http://localhost:3000');
		} else {
			socket = io('https://gameserver-6052.onrender.com');
		}

		socket.on('connect', () => {
			console.log('Connected to server');
		});

		socket.on('disconnect', () => {
			console.log('Disconnected from server');
		});

		socket.on('Registered', (player) => {
			console.log('Registered');
			username = '';
			password = '';
			email = '';
			registerSuccess = true;
			login = true;
			register = false;
		});

		socket.on('RegistrationFailed', (message) => {
			console.log('RegistrationFailed', message);
		});

		socket.on('LoginSuccess', (authPlayer) => {
			console.log('LoginSuccess', authPlayer.x, authPlayer.y);
			homeScreen = false;
			player = authPlayer;
			player.speed = 0.5;
		});

		socket.on('LoginFailed', (message) => {
			console.log('LoginFailed', message);
		});

		socket.on('ExistingPlayers', (data) => {
			console.log('ExistingPlayers', data);
			otherPlayers = data;
		});

		socket.on('OtherPlayerConnected', (data) => {
			console.log('OtherPlayerConnected', data);
			otherPlayers.push(data);
			otherPlayers = otherPlayers;
		});

		socket.on('OtherPlayerDisconnected', (data) => {
			otherPlayers = otherPlayers.filter((p) => p.id !== data);
			console.log('OtherPlayerDisconnected', data);
		});

		socket.on('OtherPlayerMoved', (data) => {
			console.log('OtherPlayerMoved', data);
			otherPlayers = otherPlayers.map((p) =>
				p.id === data.id
					? {
							...p,
							prevX: p.prevX !== undefined ? p.prevX : p.x,
							prevY: p.prevY !== undefined ? p.prevY : p.y,
							x: data.x,
							y: data.y
						}
					: p
			);
		});

		socket.on('TodoCreated', (data) => {
			console.log('TodoCreated', data);
			todos.push(data);
			todos = todos;
		});

		socket.on('TodoDeleted', (data) => {
			console.log('TodoDeleted', data);
			todos = todos.filter((t) => t.id !== data);
		});

		socket.on('TodoEdited', (data) => {
			console.log('TodoEdited', data);
			todos = todos.map((t) =>
				t.id === data.id ? { ...t, task: data.task, x: data.x, y: data.y } : t
			);
		});

		socket.on('TodoToggled', (updatedTodo) => {
			console.log('TodoToggled', updatedTodo);
			todos = todos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo));
		});

		socket.on('TodoMoved', (data) => {
			console.log('TodoMoved', data);
			todos = todos.map((t) => (t.id === data.id ? { ...t, x: data.x, y: data.y } : t));
		});

		socket.on('Todos', (data) => {
			console.log('Todos', data);
			todos = data;
		});

		width = window.innerWidth;
		height = window.innerHeight;

		// Start the animation loop
		requestAnimationFrame(loop);

		// Cleanup on component unmount
		return () => {
			// window.removeEventListener('mouseup', handleRightMouseUp);
			// window.removeEventListener('contextmenu', (e) => e.preventDefault());
			// window.removeEventListener('keydown', handleInput);
			// window.removeEventListener('keyup', handleInput);
		};
	});

	// Animation loop variables
	let lastTime = 0;
	let frameCount = 0;
	let fps = 0;
	let lastFpsUpdateTime = 0;
	let lastPlayerUpdate = 0;
	let shouldUpdatePlayer = false;

	// Main animation loop
	function loop(time: number) {
		const deltaTime = time - lastTime;

		// FPS calculation
		frameCount++;
		if (time - lastFpsUpdateTime >= 1000) {
			fps = frameCount;
			frameCount = 0;
			lastFpsUpdateTime = time;
		}

		if (player) {
			// Update player position
			if (time - lastPlayerUpdate >= 1000 / 60 && shouldUpdatePlayer) {
				lastPlayerUpdate = time;
				socket?.emit('PlayerMove', player);
				shouldUpdatePlayer = false;
			}

			// Move player towards mouse if right button is held down
			if (leftMouseDown) {
				const dx = mousePosition.x - player.x - player.width / 2;
				const dy = mousePosition.y - player.y - player.height / 2;
				const angle = Math.atan2(dy, dx);
				const vx = Math.cos(angle) * player.speed * deltaTime;
				const vy = Math.sin(angle) * player.speed * deltaTime;

				// Move only if the player is not within 2 units of the target
				if (!(Math.abs(dx) < 2 && Math.abs(dy) < 2)) {
					player = {
						...player,
						x: player.x + vx,
						y: player.y + vy
					};
					shouldUpdatePlayer = true;
				}
			}

			// Handle WASD movement
			move(deltaTime);
			// Center the view on the player
			centerView();
		}

		updateOtherPlayers(deltaTime);

		lastTime = time;
		requestAnimationFrame(loop);
	}

	// Update other players
	function updateOtherPlayers(deltaTime: number) {
		const interpolationSpeed = 0.5; // Adjust this value to control how quickly players reach their target position
		const threshold = 0.1; // Minimum distance to interpolate

		otherPlayers = otherPlayers.map((p) => {
			if (p.prevX !== undefined && p.prevY !== undefined) {
				const dx = p.x - p.prevX;
				const dy = p.y - p.prevY;
				const distance = Math.sqrt(dx * dx + dy * dy);

				if (distance > threshold) {
					const maxStep = interpolationSpeed * (deltaTime / 1000); // Maximum distance to move this frame
					const step = Math.min(maxStep, distance); // Don't overshoot the target
					const ratio = step / distance;

					p.prevX += dx * ratio;
					p.prevY += dy * ratio;
				} else {
					p.prevX = p.x;
					p.prevY = p.y;
				}
			}
			return p;
		});
	}

	function lerp(start: number, end: number, t: number): number {
		return start * (1 - t) + end * t;
	}

	// Handle WASD movement
	function move(deltaTime: number) {
		if (leftMouseDown || homeScreen) return;

		let dx = 0;
		let dy = 0;
		if (wasd.w) dy -= 1;
		if (wasd.a) dx -= 1;
		if (wasd.s) dy += 1;
		if (wasd.d) dx += 1;

		// Normalize diagonal movement
		const length = Math.sqrt(dx * dx + dy * dy);
		if (length > 0) {
			dx /= length;
			dy /= length;
		}

		player.x += dx * player.speed * deltaTime;
		player.y += dy * player.speed * deltaTime;

		// Clamp player position between 0 and 5000
		player.x = Math.max(0, Math.min(player.x, 5000));
		player.y = Math.max(0, Math.min(player.y, 5000));

		if (dx !== 0 || dy !== 0) {
			shouldUpdatePlayer = true;
		}
	}

	$: !homeScreen && socket?.emit('GetTodos');
	$: (creating && editTodoInput?.focus()) || (editing && editTodoInput?.focus());
</script>

<main class={homeScreen ? 'main-login' : ''}>
	{#if homeScreen}
		<div transition:fade class="homeScreen">
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
					<input
						autocomplete="new-password"
						type="text"
						placeholder="Username"
						bind:value={username}
					/>
					<input type="password" placeholder="Password" bind:value={password} />
					<button
						on:click={() => {
							socket?.emit('Login', username, password);
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
							socket?.emit('Register', username, password, email);
						}}
					>
						Register
					</button>
				{/if}
			</div>
		</div>
	{/if}
	{#if !homeScreen}
		{#each todos as todo}
			<div transition:fade class="todoContainer" style="left: {todo.x}px; top: {todo.y}px;">
				<div class={todo.done ? 'done' : ''}>
					{todo.task} :: {todo.author}
				</div>
				{#if todo.author === player.name}
					<input
						class="editTodo"
						type="checkbox"
						bind:checked={todo.done}
						on:change={() => socket?.emit('ToggleTodo', todo.id, player.id)}
					/>
					<button
						class="editTodo"
						on:click={() => {
							editing = true;
							editTodo = todo.task;
							editTodoId = todo.id;
						}}
					>
						Edit
					</button>
					<button
						class="editTodo"
						on:click={(e) => {
							socket?.emit('MoveTodo', todo.id, player.x, player.y, player.id);
						}}
					>
						Move
					</button>
					<button
						class="editTodo danger"
						on:click={() => socket?.emit('DeleteTodo', todo.id, player.id)}
					>
						Delete
					</button>
				{/if}
			</div>
			{#if editing && editTodoId === todo.id}
				<input
					style="position: absolute; left: {todo.x}px; top: {todo.y + 55}px;"
					type="text"
					bind:this={editTodoInput}
					bind:value={editTodo}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							socket?.emit('EditTodo', todo.id, editTodo, todo.x, todo.y, player.id);
							editing = false;
						}
					}}
				/>
			{/if}
		{/each}
		{#if creating}
			<input
				style="position: absolute; left: {player.x}px; top: {player.y + 33}px;"
				type="text"
				bind:this={editTodoInput}
				bind:value={editTodo}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						socket?.emit('CreateTodo', editTodo, player.x, player.y, player.id);
						console.log(editTodo);
						creating = false;
					}
				}}
			/>
		{/if}
		{#each grid as cell}
			<div
				class="cell"
				style="left: {cell.x}px; top: {cell.y}px; width: {cell.width}px; height: {cell.height}px; background-color: {cell.color};"
			></div>
		{/each}
		<div class="playerName" style="left: {player.x}px; top: {player.y - 35}px;">
			{player.name}
		</div>
		<div
			class="player"
			style="left: {player.x}px; top: {player.y}px; width: {player.width}px; height: {player.height}px; background-color: blue;"
		></div>
		{#each otherPlayers as otherPlayer}
			<div class="playerName" style="left: {otherPlayer.x}px; top: {otherPlayer.y - 35}px;">
				{otherPlayer.name}
			</div>
			<div
				class="player"
				style="left: {otherPlayer.x}px; top: {otherPlayer.y}px; width: {otherPlayer.width}px; height: {otherPlayer.height}px;"
			></div>
		{/each}
		<div class="topBar">
			<h3>The Game</h3>
			<div class="barInfo">
				<div>FPS: {fps}</div>
				<button>{player.name}</button>
				<button
					class="danger"
					on:click={() => {
						socket?.emit('Logout', player.id);
						player = null;
						homeScreen = true;
					}}
				>
					Logout
				</button>
			</div>
		</div>
		<div class="bottomBar">
			<div class="barInfo">
				<div><b>{player.area || 'The Beginning'}</b></div>
			</div>
			<div class="barInfo">
				<div>x: {player.x.toFixed(2)}, y: {player.y.toFixed(2)}</div>
				<div>Speed: {player.speed.toFixed(2)}</div>
			</div>
		</div>
	{/if}
</main>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Gothic+A1:wght@100;200;300;400;500;600;700;800;900&family=MedievalSharp&display=swap');
	@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
		font-family: 'Gothic A1', sans-serif;
	}
	/* Ensure the main area is large enough to allow scrolling */
	main {
		position: relative;

		height: 5000px;
		width: 5000px;
		background-color: white; /* Optional: to visualize the area */
	}

	.main-login {
		width: 100dvw;
		height: 100dvh;
	}

	.homeScreen {
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

	.topBar {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		background-color: rgba(0, 0, 0, 0.75);
		color: white;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px;
		border-bottom: 3px solid black;
		z-index: 1002;
	}

	.bottomBar {
		position: fixed;
		top: calc(100dvh - 36px);
		left: 0;
		width: 100%;
		background-color: rgba(0, 0, 0, 0.75);
		color: white;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px;
		border-top: 3px solid black;
		z-index: 1002;
	}

	.barInfo {
		display: flex;
		gap: 9.26px;
		align-items: center;
	}

	h1 {
		font-size: 47.78px;
		font-family: 'MedievalSharp', cursive;
	}

	/*47.78px
	39.81px
	33.18px
	27.65px
	23.04px
	19.20px
	16.00px
	13.33px
	11.11px
	9.26px
	7.72px
	6.43px
	5.36px
	4.47px
	*/

	h3 {
		font-size: 33.18px;
		font-family: 'MedievalSharp', cursive;
	}

	button {
		font-size: 16px;
		border: 3px solid lightgreen;
		border-radius: 5px;
		font-weight: bold;
		padding: 5px;
		display: flex;
		align-items: center;
	}

	button:hover {
		background-color: lightgreen;
		cursor: pointer;
		border-color: black;
	}

	.danger {
		border-color: red;
	}

	.danger:hover {
		background-color: red;
	}

	input {
		font-size: 16px;
		border: 1px solid lightgreen;
		min-width: 200px;
		border-radius: 5px;
		padding: 5px;
		z-index: 1000;
	}

	input.editTodo {
		min-width: 0px;
	}

	.flexer {
		display: flex;
		gap: 9.26px;
	}

	.col-flexer {
		display: flex;
		flex-direction: column;
		gap: 9.26px;
	}

	.todoContainer {
		position: absolute;
		background-color: lightblue;
		padding: 5px;
		border-radius: 5px;
		border: 1px solid black;
		display: flex;
		align-items: center;
		gap: 9.26px;
		min-height: 46.4px;
		max-width: 75dvw;
	}

	.editTodo {
		display: none;
	}

	.todoContainer:hover .editTodo {
		display: block;
	}

	.todoContainer:hover {
		z-index: 1000;
	}

	.player {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: black;
		border-radius: 50%; /* Optional: make the player circular */
		z-index: 1001;
	}

	.playerName {
		position: absolute;
		color: black;
		font-size: 19.2px;
		background: white;
		border: 1px solid black;
		padding: 5px;
		border-radius: 5px;
		z-index: 1001;
	}

	.done {
		text-decoration: line-through;
	}

	.highlight {
		color: lightgreen;
		font-weight: bold;
	}

	@media (max-width: 600px) {
		h1 {
			font-size: 23.04px;
		}
		h3 {
			font-size: 19.2px;
		}
		.playerName {
			font-size: 16px;
		}
	}
</style>
