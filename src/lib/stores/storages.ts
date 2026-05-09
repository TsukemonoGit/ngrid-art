import { KIND10002_KEY } from '$lib/constracts/storageKey';
import { createGlobalState } from './globalRunes.svelte';

import { GRID_KEY, KIND10030_KEY, PALETTE_KEY } from '$lib/constracts/storageKey';
import type { Event as NostrEvent } from 'nostr-typedef';

import type { Grid, PaletteSection } from '$lib/types';

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
export const grid = createGlobalState<Grid>([], GRID_KEY);

//Palette 読み込みまつと遅くなるから、初手は保存されたやつで表示しておく
export const palette = createGlobalState<PaletteSection[]>([], PALETTE_KEY);

export function loadStorageData() {
	kind10002.value = readStorageValue<NostrEvent>(KIND10002_KEY);
	kind10030.value = readStorageValue<NostrEvent>(KIND10030_KEY);
	grid.value = readStorageValue<Grid>(GRID_KEY) ?? [];
	palette.value = readStorageValue<PaletteSection[]>(PALETTE_KEY) ?? [];
	console.log(palette.value);
}
