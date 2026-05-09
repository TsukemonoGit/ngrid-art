import {
	createRxBackwardReq,
	createRxNostr,
	uniq,
	latest,
	createRxForwardReq,
	type EventPacket
} from 'rx-nostr';
import { verifier } from '@rx-nostr/crypto';
import { initRelays } from '$lib/constracts/relays';
import type { EventParameters, Filter } from 'nostr-typedef';

import { Subject } from 'rxjs';
import { kind10002 } from '$lib/stores/relays';
import {
	kind10030,
	kind30030Stock,
	latestEmojisFromOthers,
	subscriptionStartTime
} from '$lib/stores/palette';
import { loginUser } from '$lib/stores/user';
import { eventToAtag, isReplaceableEventSpecifier, toPubhex } from './utils';

const rxNostr = createRxNostr({ verifier, eoseTimeout: 8000 });
rxNostr.setDefaultRelays(initRelays);

rxNostr.createConnectionStateObservable().subscribe((packet) => {
	console.log(`${packet.from} の接続状況が ${packet.state} に変化しました。`);
});

const freq = createRxForwardReq();
rxNostr.use(freq).subscribe({
	next: (pk: EventPacket) => {
		switch (pk.event.kind) {
			case 10030: {
				//自分の10030
				if (
					pk.event.pubkey === loginUser.value &&
					(!kind10030.value || pk.event.created_at > kind10030.value.created_at)
				) {
					kind10030.value = pk.event;
				}
				break;
			}
			case 30030: {
				const atag = eventToAtag(pk.event);
				//自分のいれてる30030
				const myTags = ((kind10030.value?.tags || []) as string[][])
					.filter((tag: string[]) => tag[0] === 'a' && isReplaceableEventSpecifier(tag[1]))
					.map((tag) => tag[1]);

				if (myTags.includes(atag)) {
					const existing = kind30030Stock.value.get(atag);
					if (!existing || pk.event.created_at > existing.created_at) {
						kind30030Stock.value.set(atag, pk.event);
					}
				} else {
					//いれてない30030
					const existing = latestEmojisFromOthers.value.get(atag);
					if (!existing || pk.event.created_at > existing.created_at) {
						latestEmojisFromOthers.value.set(atag, pk.event);
					}
				}

				break;
			}
			default: {
				console.log('受信:', pk);
				break;
			}
		}
	},
	complete: () => {},
	error: () => {}
});

//ログインユーザーがかわるごとにかわるから,どうしようね
export function setForwardFilters(filters: Filter[]) {
	freq.emit(filters);
}

export async function publishEvent(event: EventParameters): Promise<void> {
	await rxNostr.cast(event);
}

async function fetchLatestSingleEvent(
	pubkey: string,
	kind: number,
	onNext: (packet: EventPacket) => void
): Promise<void> {
	const pubhex = toPubhex(pubkey);

	return new Promise((resolve, reject) => {
		const flushes$ = new Subject<void>();
		let received = false;

		const filter: Filter = {
			kinds: [kind],
			authors: [pubhex],
			limit: 1,
			until: subscriptionStartTime.value
		};
		const rxReq = createRxBackwardReq();

		const sub = rxNostr
			.use(rxReq)
			.pipe(uniq(flushes$), latest())
			.subscribe({
				next: (packet) => {
					received = true;
					onNext(packet);
					sub.unsubscribe();
					flushes$.next();
					resolve();
				},
				error: reject,
				complete: () => {
					if (!received) {
						resolve();
					}
				}
			});

		rxReq.emit(filter);
		rxReq.over();
	});
}

/**
 * kind:10002 を 1 件取得して、デフォルトリレー設定へ反映します。
 * `npub` / `nprofile` は内部で pubhex に変換します。
 * イベントが見つからない場合でも購読完了時に正常終了します。
 *
 * @param pubkey npub / nprofile / pubhex
 * @returns 処理完了時に resolve される Promise
 */
export async function setDefaultRelaysfrom10002(pubkey: string): Promise<void> {
	return fetchLatestSingleEvent(pubkey, 10002, (packet) => {
		kind10002.value = packet.event;
		rxNostr.setDefaultRelays(packet.event.tags);
	});
}

export async function fetchLatestKind10030(pubkey: string): Promise<void> {
	return fetchLatestSingleEvent(pubkey, 10030, (packet) => {
		kind10030.value = packet.event;
	});
}

export async function fetchMissingKind30030IntoStock(filters: Filter[]) {
	if (filters.length === 0) {
		return;
	}

	return new Promise<void>((resolve, reject) => {
		const flushes$ = new Subject<void>();
		const rxReq = createRxBackwardReq();

		const sub = rxNostr
			.use(rxReq)
			.pipe(uniq(flushes$))
			.subscribe({
				next: (packet) => {
					if (packet.event.kind !== 30030) {
						return;
					}

					const atag = eventToAtag(packet.event);
					const existing = kind30030Stock.value.get(atag);
					if (!existing || packet.event.created_at > existing.created_at) {
						kind30030Stock.value.set(atag, packet.event);
					}
				},
				error: (err) => {
					sub.unsubscribe();
					reject(err);
				},
				complete: () => {
					sub.unsubscribe();
					flushes$.next();
					resolve();
				}
			});

		rxReq.emit(filters);
		rxReq.over();
	});
}
