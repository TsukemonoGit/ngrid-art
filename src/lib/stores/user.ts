import { createGlobalState } from './globalRunes.svelte';

//最新のnostr-loginでログイン中のユーザーをいれる
export const loginUser = createGlobalState<string>('');

//10030と未来のすべての30030を購読。10030にいれている30030の更新を受信した場合は、パレットも更新
//もしくは、新しいでーたを受信しました。更新しますか。のうぃんどうを出してから更新するか。

export const isMobile = createGlobalState<boolean>(false);

export const isLoading = createGlobalState<boolean>(false);
