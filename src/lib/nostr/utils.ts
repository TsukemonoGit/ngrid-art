import { nip19 } from 'nostr-tools';
import type { DecodedResult } from 'nostr-tools/nip19';
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

export function toPubhex(pubkey: string): string {
	if (pubkey.startsWith('npub')) {
		try {
			const decoded: DecodedResult = nip19.decode(pubkey);
			return decoded.data as string;
		} catch {
			throw Error('Failed to Decode');
		}
	}

	if (pubkey.startsWith('nprofile')) {
		try {
			const decoded: DecodedResult = nip19.decode(pubkey);
			return (decoded.data as nip19.ProfilePointer).pubkey;
		} catch {
			throw Error('Failed to Decode');
		}
	}

	return pubkey;
}
