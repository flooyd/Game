<script lang="ts">
	import { io } from 'socket.io-client';
	import { onMount } from 'svelte';
	import Todo from '$lib/components/Todo.svelte';
	import { socket, todos, editing, creating, editTodo, editTodoInput, home } from '../lib/stores';
	import Home from '$lib/components/Home.svelte';

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
		positionBuffer: []
	};
	let players: any[] = [];
	let leftMouseDown: boolean;
	let width = 0;
	let height = 0;

	function handleMouseMove(event: { clientX: number; clientY: number }) {
		mousePosition = {
			x: event.clientX,
			y: event.clientY
		};
	}

	function handleLeftMouseDown(event: MouseEvent) {
		if (event.button === 0) {
			//leftMouseDown = true;
		}
	}

	function handleLeftMouseUp(event: MouseEvent) {
		if (event.button === 0) {
			//leftMouseDown = false;
		}
	}

	function handleTouchStart(event: TouchEvent) {
		mousePosition = {
			x: event.touches[0].clientX,
			y: event.touches[0].clientY
		};
		leftMouseDown = true;
	}

	function handleTouchEnd(event: TouchEvent) {
		leftMouseDown = false;
	}

	let wasd = {
		w: false,
		a: false,
		s: false,
		d: false
	};

	function handleInput(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			$editing = false;
			$creating = false;
		}

		if ($editing || $creating) return;

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
		if (event.key === ' ' && !$editing && !$creating && !$home) {
			console.log('create todo');
			$editTodo = '';
			$creating = true;
			wasd = {
				w: false,
				a: false,
				s: false,
				d: false
			};
		}
	}

	function centerView() {
		const scrollX = player.x - window.innerWidth / 2 + player.width / 2;
		const scrollY = player.y - window.innerHeight / 2 + player.height / 2;
		window.scrollTo({
			left: scrollX,
			top: scrollY,
			behavior: 'auto'
		});
	}

	onMount(() => {
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

		if (window.location.toString().includes('localhost')) {
			$socket = io('http://localhost:3000');
		} else {
			$socket = io('https://gameserver-6052.onrender.com');
		}

		$socket.on('connect', () => {
			console.log('Connected to server');
		});

		$socket.on('LoginSuccess', (authPlayer) => {
			$home = false;
			player = authPlayer;
			player.speed = authPlayer.speed || 0.5;
		});

		$socket.on('ExistingPlayers', (data) => {
			players = data;
		});

		$socket.on('OtherPlayerConnected', (data) => {
			players.push(data);
			players = players;
		});

		$socket.on('OtherPlayerDisconnected', (data) => {
			players = players.filter((p) => p.id !== data);
		});

		$socket.on('OtherPlayerMoved', (data) => {
			//add to buffer, create buffer first if it doesn't exist
			const player = players.find((p) => p.name === data.name);
			if (player) {
				if (player.positionBuffer) {
					player.positionBuffer.push({ x: data.x, y: data.y });
				} else {
					player.positionBuffer = [{ x: data.x, y: data.y }];
				}
			}
		});

		$socket.on('TodoCreated', (data) => {
			$todos.push(data);
			$todos = $todos;
		});

		$socket.on('TodoDeleted', (data) => {
			$todos = $todos.filter((t) => t.id !== data);
		});

		$socket.on('TodoEdited', (data) => {
			$todos = $todos.map((t) =>
				t.id === data.id ? { ...t, task: data.task, x: data.x, y: data.y } : t
			);
		});

		$socket.on('TodoToggled', (updatedTodo) => {
			$todos = $todos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo));
		});

		$socket.on('TodoMoved', (data) => {
			$todos = $todos.map((t) => (t.id === data.id ? { ...t, x: data.x, y: data.y } : t));
		});

		$socket.on('Todos', (data) => {
			$todos = data;
		});

		width = window.innerWidth;
		height = window.innerHeight;

		requestAnimationFrame(loop);
	});

	let lastTime = 0;
	let frameCount = 0;
	let fps = 0;
	let lastFpsUpdateTime = 0;
	let lastPlayerUpdate = 0;
	let shouldUpdatePlayer = false;

	function loop(time: number) {
		const deltaTime = time - lastTime;

		frameCount++;
		if (time - lastFpsUpdateTime >= 1000) {
			fps = frameCount;
			frameCount = 0;
			lastFpsUpdateTime = time;
		}

		if (player) {
			if (time - lastPlayerUpdate >= 1000 / 144 && shouldUpdatePlayer) {
				lastPlayerUpdate = time;
				$socket?.emit('PlayerMove', player);
				shouldUpdatePlayer = false;
			}

			move(deltaTime);
			centerView();
		}

		updateplayers(deltaTime);

		lastTime = time;
		requestAnimationFrame(loop);
	}

	function updateplayers(deltaTime: number) {
		players = players.map((p) => {
			if (p.positionBuffer && p.positionBuffer.length > 2) {
				const buffer = p.positionBuffer;
				const time = 1;
				const t = Math.min(1, deltaTime / time);
				const x = catmullRomInterpolation(buffer[0].x, buffer[0].x, buffer[1].x, buffer[2].x, t);
				const y = catmullRomInterpolation(buffer[0].y, buffer[0].y, buffer[1].y, buffer[2].y, t);
				if (t === 1) {
					buffer.shift();
				}
				return { ...p, x, y, positionBuffer: buffer };
			}
			return p;
		});
	}

	function catmullRomInterpolation(p0: number, p1: number, p2: number, p3: number, t: number) {
		const v0 = (p2 - p0) * 0.5;
		const v1 = (p3 - p1) * 0.5;
		const t2 = t * t;
		const t3 = t * t2;
		const a = 2 * t3 - 3 * t2 + 1;
		const b = t3 - 2 * t2 + t;
		const c = t3 - t2;
		const d = -2 * t3 + 3 * t2;
		return a * p1 + b * v0 + c * v1 + d * p2;
	}

	function move(deltaTime: number) {
		if (leftMouseDown || $home) return;

		let dx = 0;
		let dy = 0;
		if (wasd.w) dy -= 1;
		if (wasd.a) dx -= 1;
		if (wasd.s) dy += 1;
		if (wasd.d) dx += 1;

		const length = Math.sqrt(dx * dx + dy * dy);
		if (length > 0) {
			dx /= length;
			dy /= length;
		}

		player.x += dx * player.speed * deltaTime;
		player.y += dy * player.speed * deltaTime;

		player.x = Math.max(0, Math.min(player.x, 5000));
		player.y = Math.max(0, Math.min(player.y, 5000));

		if (dx !== 0 || dy !== 0) {
			shouldUpdatePlayer = true;
		}
	}

	$: !$home && $socket?.emit('GetTodos');
	$: ($creating && $editTodoInput?.focus()) || ($editing && $editTodoInput?.focus());
</script>

<main class={$home ? 'main-login' : ''}>
	{#if $home}
		<Home {player} />
	{/if}
	{#if !$home}
		{#each $todos as todo}
			<Todo {todo} {player} />
		{/each}
		{#if $creating}
			<input
				style="position: absolute; left: {player.x}px; top: {player.y + 33}px;"
				type="text"
				bind:this={$editTodoInput}
				bind:value={$editTodo}
				on:keydown={(e) => {
					if (e.key === 'Enter') {
						$socket?.emit('CreateTodo', $editTodo, player.x, player.y, player.id);
						console.log($editTodo);
						$creating = false;
					}
				}}
			/>
		{/if}
		<div class="playerName" style="left: {player.x}px; top: {player.y - 35}px;">
			{player.name}
		</div>
		<div
			class="player"
			style="left: {player.x}px; top: {player.y}px; width: {player.width}px; height: {player.height}px; background-color: blue;"
		></div>
		{#each players as otherPlayer}
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
						$socket?.emit('Logout', player.id);
						player = null;
						$home = true;
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

	:global(h1) {
		font-size: 47.78px;
		font-family: 'MedievalSharp', cursive;
	}

	:global(h3) {
		font-size: 33.18px;
		font-family: 'MedievalSharp', cursive;
	}

	:global(button) {
		font-size: 16px;
		border: 3px solid lightgreen;
		border-radius: 5px;
		font-weight: bold;
		padding: 5px;
		display: flex;
		align-items: center;
	}

	:global(button:hover) {
		background-color: lightgreen;
		cursor: pointer;
		border-color: black;
	}

	:global(.danger) {
		border-color: red;
	}

	:global(.danger:hover) {
		background-color: red;
	}

	:global(input) {
		font-size: 16px;
		border: 1px solid lightgreen;
		min-width: 200px;
		border-radius: 5px;
		padding: 5px;
		z-index: 1000;
	}

	:global(.flexer) {
		display: flex;
		gap: 9.26px;
	}

	:global(.col-flexer) {
		display: flex;
		flex-direction: column;
		gap: 9.26px;
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

	:global(.highlight) {
		color: lightgreen;
		font-weight: bold;
	}

	@media (max-width: 600px) {
		:global(h1) {
			font-size: 23.04px;
		}
		:global(h3) {
			font-size: 19.2px;
		}
		.playerName {
			font-size: 16px;
		}
	}
</style>
