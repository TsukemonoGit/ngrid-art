import type { Event as NostrEvent } from 'nostr-typedef';
import type { Grid, PaletteSection, ReplaceableEventMap } from '$lib/types';
import { createGlobalState } from './globalRunes.svelte';
import { SvelteMap } from 'svelte/reactivity';
import { GRID_KEY, KIND10030_KEY, PALETTE_KEY } from '$lib/constracts/storageKey';

//ログインユーザーの最新の10030をいれる
export const kind10030 = createGlobalState<NostrEvent>(null, KIND10030_KEY);

//ログインユーザーの10030のなかの、atagごとに最新の30030辞書
export const kind30030Stock = createGlobalState<ReplaceableEventMap>(new SvelteMap());

//自分のリストに追加していない、atagごとに最新の30030辞書
// kind30030 の kind が 30030 で、authors が自分以外
export const latestEmojisFromOthers = createGlobalState<ReplaceableEventMap>(new SvelteMap());

// events.ts に追加
export const subscriptionStartTime = createGlobalState<number>(Math.floor(Date.now() / 1000));

//Grid 途中リロードとかの対策に、都度保存する。
export const grid = createGlobalState<Grid>([], GRID_KEY);

//Palette 読み込みまつと遅くなるから、初手は保存されたやつで表示しておく
export const palette = createGlobalState<PaletteSection[]>([], PALETTE_KEY);
