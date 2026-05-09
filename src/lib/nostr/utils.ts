import type { ReplaceableEventSpecifier } from 'nostr-typedef';
import type { Event as NostrEvent } from 'nostr-typedef';

const REPLACEABLE_EVENT_SPECIFIER_REGEX = /^\d+:[a-f0-9]{64}:.+$/;

export function isReplaceableEventSpecifier(value: unknown): value is ReplaceableEventSpecifier {
	return typeof value === 'string' && REPLACEABLE_EVENT_SPECIFIER_REGEX.test(value);
}

// Nostr イベント処理のユーティリティ
export function eventToAtag(event: NostrEvent): ReplaceableEventSpecifier {
	const dTag = event.tags.find((tag) => tag[0] === 'd')?.[1] ?? '';
	return `${event.kind}:${event.pubkey}:${dTag}`;
}
