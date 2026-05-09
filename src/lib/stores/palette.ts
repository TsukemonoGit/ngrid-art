import type { Event as NostrEvent } from 'nostr-typedef';
import type { ReplaceableEventMap } from '$lib/types';
import { createGlobalState } from './globalRunes.svelte';
import { SvelteMap } from 'svelte/reactivity';

//ログインユーザーの最新の10030をいれる
export const kind10030 = createGlobalState<NostrEvent>(null, 'KIND10030_KEY');

//ログインユーザーの10030のなかの、atagごとに最新の30030辞書
export const kind30030Stock = createGlobalState<ReplaceableEventMap>(new SvelteMap());

//自分のリストに追加していない、atagごとに最新の30030辞書
// kind30030 の kind が 30030 で、authors が自分以外
export const latestEmojisFromOthers = createGlobalState<ReplaceableEventMap>(new SvelteMap());

// events.ts に追加
export const subscriptionStartTime = createGlobalState<number>(Math.floor(Date.now() / 1000));
