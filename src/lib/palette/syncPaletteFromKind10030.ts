import { fetchMissingKind30030IntoStock } from '$lib/nostr/rx-nostr';
import { isReplaceableEventSpecifier } from '$lib/utils/utils';
import { kind30030Stock, subscriptionStartTime } from '$lib/stores/palette';
import { palette } from '$lib/stores/storages';
import type { PaletteEmoji, PaletteSection } from '$lib/types';
import type { Event as NostrEvent, Filter, ReplaceableEventSpecifier } from 'nostr-typedef';

type SyncPaletteOptions = {
	backfillMissing?: boolean;
};

// 絵文字ショートコードを比較しやすい形式に正規化する。
function normalizeShortcode(value: string): string {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	return normalized || 'emoji';
}

// 文字列から短い固定長サフィックスを作るためのハッシュ値を生成する。
/**
FNV-1a 32bit という軽量ハッシュ手法で作っています。流れは次の通りです。

1. 初期値を 0x811c9dc5 に設定  
2. 文字列を 1 文字ずつ処理して、各文字コードを XOR  
3. 毎回 0x01000193 を掛ける（Math.imul で 32bit 整数乗算）  
4. 最後に符号なし 32bit に変換（hash >>> 0）  
5. それを base36 文字列化し、4文字にそろえる（padStart と slice）

この結果、同じ入力なら同じ 4 文字サフィックスが必ず出るので、衝突回避の suffix として使えます。  
ただし 4 文字固定なので、暗号用途ではなく「短く安定した識別子」用途です。

*/
function hashBase36_4(value: string): string {
	// FNV-1a 32bit hash (deterministic and lightweight)
	let hash = 0x811c9dc5;
	for (let i = 0; i < value.length; i += 1) {
		hash ^= value.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}

	const unsigned = hash >>> 0;
	return unsigned.toString(36).padStart(4, '0').slice(0, 4);
}

// セクション全体の絵文字を走査し、Map でベース短縮名の出現回数を集計したうえで衝突を解決する。
// 衝突時は「正規化した shortcode + ref/url 由来の4桁ハッシュ」を使い、さらに Set で最終値の重複を防ぐ。
function resolveShortcodeCollisions(sections: PaletteSection[]): PaletteSection[] {
	// base shortcode ごとの件数を事前集計して「衝突しているか」を判定できるようにする
	const counts = new Map<string, number>();
	for (const section of sections) {
		for (const emoji of section.emojis) {
			const base = normalizeShortcode(emoji.originalShortcode);
			counts.set(base, (counts.get(base) ?? 0) + 1);
		}
	}

	// 既に採用した最終 shortcode を保持して、末尾連番での再衝突も回避する
	const used = new Set<string>();

	return sections.map((section) => ({
		...section,
		emojis: section.emojis.map((emoji) => {
			const base = normalizeShortcode(emoji.originalShortcode);
			let resolved = base;

			// 同名が複数ある場合は参照元(ref)優先、なければURLを種にして決定的ハッシュを付与
			if ((counts.get(base) ?? 0) > 1) {
				const seed = emoji.ref ?? emoji.url;
				resolved = `${base}_${hashBase36_4(seed)}`;
			}

			// それでも重複した場合は _2, _3... の連番を付けて必ず一意化する
			if (used.has(resolved)) {
				let n = 2;
				while (used.has(`${resolved}_${n}`)) {
					n += 1;
				}
				resolved = `${resolved}_${n}`;
			}

			used.add(resolved);

			return {
				...emoji,
				shortcode: resolved
			};
		})
	}));
}

// kind:10030 を起点に kind:30030 と stray emoji を統合してパレットを同期する。
export async function syncPaletteFromKind10030(
	k: NostrEvent,
	options: SyncPaletteOptions = {}
): Promise<void> {
	const backfillMissing = options.backfillMissing ?? true;

	// 10030のaタグから30030のatag一覧を取得
	const aTags = (k.tags as string[][])
		.filter((tag) => tag[0] === 'a' && isReplaceableEventSpecifier(tag[1]))
		.map((tag) => tag[1] as ReplaceableEventSpecifier);

	// stockにないatagだけ絞り込む
	const missing = aTags.filter((atag) => !kind30030Stock.value.has(atag));
	if (backfillMissing && missing.length > 0) {
		// atagをフィルターに変換して不足分だけ取得
		const filters: Filter[] = [];
		for (const value of missing) {
			const [kind, pubkey, ...identifierParts] = value.split(':');
			if (kind !== '30030') {
				continue;
			}

			const identifier = identifierParts.join(':');
			filters.push({
				kinds: [30030],
				authors: [pubkey],
				'#d': [identifier],
				until: subscriptionStartTime.value
			});
		}

		if (filters.length > 0) {
			await fetchMissingKind30030IntoStock(filters);
		}
	}

	const stock = kind30030Stock.value;
	const currentPalette = palette.value ?? [];

	const sections: PaletteSection[] = aTags.flatMap((atag) => {
		const event = stock.get(atag);
		if (!event) {
			// stockに無い場合はLocalStorageから復元済みのセクションをフォールバックとして使う
			const existing = currentPalette.find((s) => s.ref === atag);
			return existing ? [existing] : [];
		}

		const tags = event.event.tags as string[][];
		const label =
			tags.find((t) => t[0] === 'title')?.[1] ?? tags.find((t) => t[0] === 'd')?.[1] ?? 'noname';
		const emojis: PaletteEmoji[] = (event.event.tags as string[][])
			.filter((t) => t[0] === 'emoji' && t[1] && t[2])
			.map((t) => ({
				shortcode: t[1],
				url: t[2],
				ref: atag,
				originalShortcode: t[1]
			}));

		return [{ label, emojis, ref: atag }];
	});

	// 10030に直接ぶら下がるemojiタグ（のら絵文字）
	const strayEmojis: PaletteEmoji[] = (k.tags as string[][])
		.filter((t) => t[0] === 'emoji' && t[1] && t[2])
		.map((t) => ({
			shortcode: t[1],
			url: t[2],
			originalShortcode: t[1]
		}));

	if (strayEmojis.length > 0) {
		sections.push({ label: 'Stray', emojis: strayEmojis, ref: 'stray' });
	}

	palette.value = resolveShortcodeCollisions(sections);
}
