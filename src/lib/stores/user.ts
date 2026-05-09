import { createGlobalState } from './globalRunes.svelte';

//最新のnostr-loginでログイン中のユーザーをいれる
export const loginUser = createGlobalState<string>('');
