import type { EmojiSetEventMap, PaletteEmoji } from '$lib/types';
import { createGlobalState } from './globalRunes.svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { Event as NostrEvent } from 'nostr-typedef';

//ログインユーザーの10030のなかの、atagごとに最新の30030辞書
export const kind30030Stock = createGlobalState<EmojiSetEventMap>(new SvelteMap());

//自分のリストに追加していない、atagごとに最新の30030辞書
// kind30030 の kind が 30030 で、authors が自分以外
export const latestEmojisFromOthers = createGlobalState<EmojiSetEventMap>(new SvelteMap());

//ログインユーザーが所有する30030（atagごとに最新）
export const mySets = createGlobalState<EmojiSetEventMap>(new SvelteMap());

// ページネーション用開始時刻（my-sets用）
export const subscriptionStartTimeMy = createGlobalState<number>(Math.floor(Date.now() / 1000));

// ページネーション用開始時刻（emoji-sets用）
export const subscriptionStartTimeOthers = createGlobalState<number>(Math.floor(Date.now() / 1000));

// 後方互換性のため（必要に応じて削除可能）
export const subscriptionStartTime = subscriptionStartTimeOthers;

//
export const selectedEmoji = createGlobalState<PaletteEmoji | null>(null);

export const kind0Cache = createGlobalState<SvelteMap<string, NostrEvent>>(new SvelteMap());

//アプリデフォnull絵文字りすとが、10030に登録されているかどうかのチェック
export const hasDefaultNullSet = createGlobalState(false);
