import type { ReplaceableEventSpecifier } from 'nostr-typedef';
import type { Event as NostrEvent } from 'nostr-typedef';

// Nostr イベント処理のユーティリティ
export function eventToAtag(event: NostrEvent): ReplaceableEventSpecifier {
	const dTag = event.tags.find((tag) => tag[0] === 'd')?.[1] ?? '';
	return `${event.kind}:${event.pubkey}:${dTag}`;
}
