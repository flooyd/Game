import type { Socket } from "socket.io-client";
import type { DefaultEventsMap } from '@socket.io/component-emitter';
import { writable, type Writable } from "svelte/store";

export const socket: Writable<Socket<DefaultEventsMap, DefaultEventsMap> | null> = writable(null);
export const todos: Writable<any[]> = writable([]);
export const editing: Writable<boolean> = writable(false);
export const creating: Writable<boolean> = writable(false);
export const editTodo: Writable<any> = writable(null);
export const editTodoId: Writable<string> = writable("");
export const editTodoInput: Writable<HTMLInputElement | null> = writable(null);
export const registerSuccess: Writable<boolean> = writable(false);
export const home: Writable<boolean> = writable(true);
export const players: Writable<any[]> = writable([]);
export const localPlayer: Writable<any> = writable(null);