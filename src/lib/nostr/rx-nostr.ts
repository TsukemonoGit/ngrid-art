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
import type { Filter } from 'nostr-typedef';
import { nip19 } from 'nostr-tools';
import type { DecodedResult } from 'nostr-tools/nip19';
import { Subject } from 'rxjs';
import { kind10002 } from '$lib/stores/relays';
import {
	kind10030,
	kind30030Stock,
	latestEmojisFromOthers,
	subscriptionStartTime
} from '$lib/stores/palette';
import { loginUser } from '$lib/stores/user';
import { eventToAtag } from './utils';
import { isReplaceableEventSpecifier } from '$lib/types';

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

/**
 * kind:10002 を 1 件取得して、デフォルトリレー設定へ反映します。
 * `npub` / `nprofile` は内部で pubhex に変換します。
 * イベントが見つからない場合でも購読完了時に正常終了します。
 *
 * @param pubkey npub / nprofile / pubhex
 * @returns 処理完了時に resolve される Promise
 */
export async function setDefaultRelaysfrom10002(pubkey: string): Promise<void> {
	let pubhex = pubkey;
	if (pubkey.startsWith('npub')) {
		try {
			const decoded: DecodedResult = nip19.decode(pubkey);
			pubhex = decoded.data as string;
		} catch {
			throw Error('Failed to Decode');
		}
	} else if (pubkey.startsWith('nprofile')) {
		try {
			const decoded: DecodedResult = nip19.decode(pubkey);
			pubhex = (decoded.data as nip19.ProfilePointer).pubkey;
		} catch {
			throw Error('Failed to Decode');
		}
	}

	return new Promise((resolve, reject) => {
		const flushes$ = new Subject<void>();
		let received = false;

		const filter: Filter = {
			kinds: [10002],
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
					kind10002.value = packet.event;
					rxNostr.setDefaultRelays(packet.event.tags);
					sub.unsubscribe();
					// イベントID の Set をフラッシュする:
					flushes$.next();
					resolve(); // ← 処理完了を通知
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

//10030と未来のすべての30030を購読。10030にいれている30030の更新を受信した場合は、パレットも更新
//もしくは、新しいでーたを受信しました。更新しますか。のうぃんどうを出してから更新するか。
