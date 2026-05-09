import type { Event as NostrEvent, ReplaceableEventSpecifier } from 'nostr-typedef';
import type { SvelteMap } from 'svelte/reactivity';

// ATagをキーにNostrEventを格納するMap
export type ReplaceableEventMap = SvelteMap<ReplaceableEventSpecifier, NostrEvent>;

// パレットの絵文字エントリ
export interface PaletteEmoji {
	shortcode: string; // 衝突解消済みショートコード
	url: string;
	ref?: ReplaceableEventSpecifier; // "30030:pubhex:identifier"（ノラ絵文字は省略）
	originalShortcode: string; // 衝突前の元ショートコード
	label: string; //
}

export type PaletteEmojiTable = Partial<Record<ReplaceableEventSpecifier, PaletteEmoji>>;
