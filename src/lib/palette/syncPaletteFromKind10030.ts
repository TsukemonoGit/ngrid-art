import { fetchMissingKind30030IntoStock } from '$lib/nostr/rx-nostr';
import { isReplaceableEventSpecifier } from '$lib/nostr/utils';
import { kind30030Stock } from '$lib/stores/palette';
import { palette } from '$lib/stores/storages';
import type { PaletteEmoji, PaletteSection } from '$lib/types';
import type { Event as NostrEvent, Filter, ReplaceableEventSpecifier } from 'nostr-typedef';

type SyncPaletteOptions = {
	backfillMissing?: boolean;
};

function normalizeShortcode(value: string): string {
	const normalized = value
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');

	return normalized || 'emoji';
}

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

function resolveShortcodeCollisions(sections: PaletteSection[]): PaletteSection[] {
	const counts = new Map<string, number>();
	for (const section of sections) {
		for (const emoji of section.emojis) {
			const base = normalizeShortcode(emoji.originalShortcode);
			counts.set(base, (counts.get(base) ?? 0) + 1);
		}
	}

	const used = new Set<string>();

	return sections.map((section) => ({
		...section,
		emojis: section.emojis.map((emoji) => {
			const base = normalizeShortcode(emoji.originalShortcode);
			let resolved = base;

			if ((counts.get(base) ?? 0) > 1) {
				const seed = emoji.ref ?? emoji.url;
				resolved = `${base}_${hashBase36_4(seed)}`;
			}

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
			filters.push({ kinds: [30030], authors: [pubkey], '#d': [identifier] });
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

		const label = (event.tags as string[][]).find((t) => t[0] === 'd')?.[1] ?? atag;
		const emojis: PaletteEmoji[] = (event.tags as string[][])
			.filter((t) => t[0] === 'emoji' && t[1] && t[2])
			.map((t) => ({
				shortcode: t[1],
				url: t[2],
				ref: atag,
				originalShortcode: t[1],
				label: t[1]
			}));

		return [{ label, emojis, ref: atag }];
	});

	// 10030に直接ぶら下がるemojiタグ（のら絵文字）
	const strayEmojis: PaletteEmoji[] = (k.tags as string[][])
		.filter((t) => t[0] === 'emoji' && t[1] && t[2])
		.map((t) => ({
			shortcode: t[1],
			url: t[2],
			originalShortcode: t[1],
			label: t[1]
		}));

	if (strayEmojis.length > 0) {
		sections.push({ label: 'Stray', emojis: strayEmojis, ref: 'stray' });
	}

	palette.value = resolveShortcodeCollisions(sections);
}
