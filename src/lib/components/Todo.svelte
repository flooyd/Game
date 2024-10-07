<script lang="ts">
	import { socket, todos, editing, creating, editTodo, editTodoId, editTodoInput } from '../stores';
	import { fade } from 'svelte/transition';

	export let todo: any;
	export let player: any;
</script>

<div transition:fade class="todoContainer" style="left: {todo.x}px; top: {todo.y}px;">
	<div class={todo.done ? 'done' : ''}>
		{todo.task} :: {todo.author}
	</div>
	{#if todo.author === player.name}
		<input
			class="editTodo"
			type="checkbox"
			bind:checked={todo.done}
			on:change={() => $socket?.emit('ToggleTodo', todo.id, player.id)}
		/>
		<button
			class="editTodo"
			on:click={() => {
				$editing = true;
				$editTodo = todo.task;
				$editTodoId = todo.id;
			}}
		>
			Edit
		</button>
		<button
			class="editTodo"
			on:click={(e) => {
				$socket?.emit('MoveTodo', todo.id, player.x, player.y, player.id);
			}}
		>
			Move
		</button>
		<button
			class="editTodo danger"
			on:click={() => $socket?.emit('DeleteTodo', todo.id, player.id)}
		>
			Delete
		</button>
	{/if}
</div>
{#if $editing && $editTodoId === todo.id}
	<input
		style="position: absolute; left: {todo.x}px; top: {todo.y + 55}px;"
		type="text"
		bind:this={$editTodoInput}
		bind:value={$editTodo}
		on:keydown={(e) => {
			if (e.key === 'Enter') {
				$socket?.emit('EditTodo', todo.id, editTodo, todo.x, todo.y, player.id);
				$editing = false;
			}
		}}
	/>
{/if}

<style>
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

	input {
		min-width: 0px;
	}

	.done {
		text-decoration: line-through;
	}
</style>
