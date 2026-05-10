import type { Event as NostrEvent, ReplaceableEventSpecifier } from 'nostr-typedef';
import type { SvelteMap } from 'svelte/reactivity';

// ATagをキーにEmojiSetEventを格納するMap
export type EmojiSetEventMap = SvelteMap<ReplaceableEventSpecifier, EmojiSetEvent>;

// パレットの絵文字エントリ
export interface PaletteEmoji {
	shortcode: string; // 衝突解消済みショートコード
	url: string;
	ref?: ReplaceableEventSpecifier; // "30030:pubhex:identifier"（ノラ絵文字は省略）
	originalShortcode: string; // 衝突前の元ショートコード
}

export type PaletteEmojiTable = Partial<Record<ReplaceableEventSpecifier, PaletteEmoji>>;

// GRID-01, GRID-02, GRID-03 の型定義
// カスタム絵文字タグ
// 4要素目はノラ絵文字（10030直接登録）の場合は省略
// ["emoji", resolvedShortcode, url, "30030:pubhex:identifier"]
export type EmojiTag = ['emoji', string, string, ReplaceableEventSpecifier?];

//grid
// グリッド全体
export type Grid = Cell[][];

// グリッドのセル。null = 空セル
export type Cell = EmojiTag | null;

// null絵文字の設定
export interface NullEmojiConfig {
	type: 'custom' | 'fullwidth_space';
	emoji?: PaletteEmoji; // type === "custom" の場合
}

// スクロールスパイ型タブUI用のパレットセクション
export interface PaletteSection {
	// セクションの見出し（その絵文字セットのtitle,なかったら、identifier）
	label: string;
	// このセクションに所属する絵文字リスト
	emojis: PaletteEmoji[];
	// タブのセクションIDにつかう
	ref: ReplaceableEventSpecifier | 'stray';
}

/** 30030イベントの表示用データ（イベント単位） */
export interface EmojiSetEvent {
	event: NostrEvent;
	/** ["emoji", shortcode, url]の配列 */
	emojiTags: [string, string, string][];
	/** dtag */
	dtag: string;

	// セクションの見出し（その絵文字セットのtitle,なかったら、identifier）
	label: string;
}

export interface Profile {
	[key: string]: unknown;
	name?: string;
	about?: string;
	picture?: string;
	nip05?: string;
	display_name?: string;
	website?: string;
	banner?: string;
	bot?: boolean;
	lud16?: string;
	lud06?: string;
	birth?: number[]; //[day, month, year(optional)]//旧
	birthday?: { year?: number; month?: number; day?: number };
}
