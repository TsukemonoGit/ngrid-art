import type { EmojiSetEventMap, PaletteEmoji } from '$lib/types';
import { createGlobalState } from './globalRunes.svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { Event as NostrEvent } from 'nostr-typedef';

//ログインユーザーの10030のなかの、atagごとに最新の30030辞書
export const kind30030Stock = createGlobalState<EmojiSetEventMap>(new SvelteMap());

//自分のリストに追加していない、atagごとに最新の30030辞書
// kind30030 の kind が 30030 で、authors が自分以外
export const latestEmojisFromOthers = createGlobalState<EmojiSetEventMap>(new SvelteMap());

// events.ts に追加
export const subscriptionStartTime = createGlobalState<number>(Math.floor(Date.now() / 1000));

//
export const selectedEmoji = createGlobalState<PaletteEmoji | null>(null);

export const kind0Cache = createGlobalState<SvelteMap<string, NostrEvent>>(new SvelteMap());
