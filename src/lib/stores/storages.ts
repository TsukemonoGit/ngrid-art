import { KIND10002_KEY, NULL_EMOJI } from '$lib/constracts/storageKey';
import { createGlobalState } from './globalRunes.svelte';

import { GRID_KEY, KIND10030_KEY, PALETTE_KEY } from '$lib/constracts/storageKey';
import type { Event as NostrEvent } from 'nostr-typedef';

import type { Grid, NullEmojiConfig, PaletteSection } from '$lib/types';
import { createDefaultNullEmoji, createInitGrid } from '$lib/palette/grid';

function readStorageValue<T>(storageKey: string): T | null {
	if (typeof window === 'undefined') {
		return null;
	}

	const rawValue = localStorage.getItem(storageKey);
	if (rawValue === null) {
		return null;
	}

	try {
		return JSON.parse(rawValue) as T;
	} catch (error) {
		console.warn(`Failed to parse ${storageKey} from localStorage:`, error);
		return null;
	}
}

//リレーリスト
export const kind10002 = createGlobalState<NostrEvent>(null, KIND10002_KEY);
//ログインユーザーの最新の10030をいれる
export const kind10030 = createGlobalState<NostrEvent>(null, KIND10030_KEY);

//Grid 途中リロードとかの対策に、都度保存する。
export const grid = createGlobalState<Grid>(createInitGrid(), GRID_KEY);

//Palette 読み込みまつと遅くなるから、初手は保存されたやつで表示しておく
export const palette = createGlobalState<PaletteSection[]>([], PALETTE_KEY);

/** null絵文字設定store */
export const nullEmoji = createGlobalState<NullEmojiConfig>(createDefaultNullEmoji(), NULL_EMOJI);

export function loadStorageData() {
	const kind10002Value = readStorageValue<NostrEvent>(KIND10002_KEY);
	if (kind10002Value !== null) kind10002.value = kind10002Value;

	const kind10030Value = readStorageValue<NostrEvent>(KIND10030_KEY);
	if (kind10030Value !== null) kind10030.value = kind10030Value;

	const gridValue = readStorageValue<Grid>(GRID_KEY);
	if (gridValue !== null) grid.value = gridValue;

	const paletteValue = readStorageValue<PaletteSection[]>(PALETTE_KEY);
	if (paletteValue !== null) palette.value = paletteValue;

	const nullValue = readStorageValue<NullEmojiConfig>(NULL_EMOJI);
	if (nullValue !== null) nullEmoji.value = nullValue;

	//console.log(palette.value);
}
