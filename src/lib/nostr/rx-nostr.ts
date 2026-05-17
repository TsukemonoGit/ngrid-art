import {
	createRxBackwardReq,
	createRxNostr,
	uniq,
	latest,
	createRxForwardReq,
	type EventPacket,
	latestEach
} from 'rx-nostr';
import { verifier } from '@rx-nostr/crypto';
import { initRelays } from '$lib/constracts/nostr';
import type {
	EventParameters,
	Filter,
	Event as NostrEvent,
	ReplaceableEventSpecifier
} from 'nostr-typedef';
import type { EmojiSetEvent, EmojiSetEventMap } from '$lib/types';

import { Subject } from 'rxjs';

import {
	kind0Cache,
	kind30030Stock,
	latestEmojisFromOthers,
	mySets,
	subscriptionStartTime,
	subscriptionStartTimeMy,
	subscriptionStartTimeOthers
} from '$lib/stores/palette';
import { connectReady, loginUser } from '$lib/stores/user';
import { eventToAtag, isReplaceableEventSpecifier, toPubhex } from '../utils/utils';
import { kind10030, kind10002 } from '$lib/stores/storages';
import { snapshot } from './rx-nostr.svelte';
import { normalizeRelayUrl } from './normalize-url';

function toEmojiSetEvent(event: NostrEvent): EmojiSetEvent {
	const label =
		event.tags.find((t) => t[0] === 'title')?.[1] ??
		event.tags.find((t) => t[0] === 'd')?.[1] ??
		'noname';
	return {
		event,
		emojiTags: event.tags.filter((t) => t[0] === 'emoji') as [string, string, string][],
		dtag: event.tags.find((t) => t[0] === 'd')?.[1] ?? '',
		label: label
	};
}

/** atagごとにMapの値を最新にする（created_atが新しい方のみ保存） */
function updateIfNewer(
	map: EmojiSetEventMap,
	atag: ReplaceableEventSpecifier,
	event: NostrEvent
): void {
	const existing = map.get(atag);
	if (!existing || event.created_at > existing.event.created_at) {
		map.set(atag, toEmojiSetEvent(event));
	}
}

const rxNostr = createRxNostr({ verifier, eoseTimeout: 8000 });
rxNostr.setDefaultRelays(initRelays);

const getCheckUrls = (): string[] => {
	if (!kind10002.value) return [];
	return (kind10002.value.tags as string[][])
		.filter((t) => t[0] === 'r' && typeof t[1] === 'string')
		.map((t) => normalizeRelayUrl(t[1]));
};

const checkRelayReady = (ratio = 0.5): boolean => {
	const urls = getCheckUrls();
	if (urls.length === 0) return false;

	const states = rxNostr.getAllRelayStatus();
	let connectedCount = 0;

	for (const url of urls) {
		if (states[url]?.connection === 'connected') {
			connectedCount++;
		}
	}

	return connectedCount / urls.length >= ratio;
};

const connectObs = rxNostr.createConnectionStateObservable().subscribe(() => {
	//console.log(`${packet.from} の接続状況が ${packet.state} に変化しました。`);
	if (!connectReady.value && checkRelayReady()) {
		connectReady.value = true;
		connectObs.unsubscribe();
	}
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
				const myTags = getCurrentKind10030ATags();

				// 必ずmySetsに保存（自分のデータなら）
				if (pk.event.pubkey === loginUser.value) {
					updateIfNewer(mySets.value, atag, pk.event);
				}

				// 自分が登録している30030
				if (myTags.includes(atag)) {
					updateIfNewer(kind30030Stock.value, atag, pk.event);
				} else {
					// いれてない30030（他人のデータ、または自分の未登録）
					updateIfNewer(latestEmojisFromOthers.value, atag, pk.event);
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
	await rxNostr.cast(snapshot(event));
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
				error: (err) => {
					// latest() uses last() internally and throws EmptyError when no events are found.
					// Treat this as a normal "no results" completion.
					if (err?.name === 'EmptyError') {
						resolve();
					} else {
						reject(err);
					}
				},
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
	if (kind10002.value) {
		rxNostr.setDefaultRelays(kind10002.value!.tags);
	}
	return fetchLatestSingleEvent(pubkey, 10002, (packet) => {
		if (packet.event.created_at > (kind10002.value?.created_at || 0)) {
			kind10002.value = packet.event;
		}
		rxNostr.setDefaultRelays(kind10002.value!.tags);
	});
}

export async function fetchLatestKind10030(pubkey: string): Promise<void> {
	return fetchLatestSingleEvent(pubkey, 10030, (packet) => {
		if (packet.event.created_at > (kind10030.value?.created_at || 0))
			kind10030.value = packet.event;
	});
}

/** UI実装時へのめも
 * kind10030.value がない場合は 追加/削除 ボタンを無効化
 * 代わりに Create My Emoji List ボタンを表示
 * 押下時に kind:10030 を新規 publish（最初は tags: [] でOK）
 * publish後に最新10030を再取得して通常UIへ切り替え
 */
export async function createMyKind10030IfMissing(): Promise<void> {
	if (!loginUser.value) {
		throw Error('Login user is not set');
	}

	// 先に現在の最新10030を確認して、既存なら作成しない
	await fetchLatestKind10030(loginUser.value);
	if (kind10030.value && kind10030.value.pubkey === loginUser.value) {
		return;
	}

	await publishEvent({
		kind: 10030,
		content: '',
		tags: []
	});

	// 作成直後のイベントを取り直してストアを最新化
	await fetchLatestKind10030(loginUser.value);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
	const chunks: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		chunks.push(arr.slice(i, i + size));
	}
	return chunks;
}

async function fetchKind30030ChunkIntoStock(filters: Filter[]): Promise<void> {
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
					updateIfNewer(kind30030Stock.value, atag, packet.event);
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

export async function fetchMissingKind30030IntoStock(filters: Filter[], chunkSize = 10) {
	if (filters.length === 0) {
		return;
	}

	const chunks = chunkArray(filters, chunkSize);
	await Promise.all(chunks.map((chunk) => fetchKind30030ChunkIntoStock(chunk)));
}

export async function fetchAllKind30030FromOthers(
	filters: Filter[],
	limit: number,
	relays?: string[]
) {
	if (filters.length === 0) {
		return;
	}
	console.log('fetchAllKind30030FromOthers', filters, limit);
	const events = await fetchUniqEvents(filters, limit, relays);
	console.log('fetchUniqEvents', events);
	if (events.length == 0) return;

	//storeの更新（others用）
	subscriptionStartTimeOthers.value = events[events.length - 1].created_at;

	//atagごとに最新のものだけをのこす処理をして、latestEmojisFromOthersにせっとする
	const myATags = getCurrentKind10030ATags();
	for (const event of events) {
		const atag = eventToAtag(event);
		// 自分が登録済みのものは除外
		if (myATags.includes(atag)) continue;
		updateIfNewer(latestEmojisFromOthers.value, atag, event);
	}
}

//latestとかの処理をしない。uniqなもの全部かえす
function fetchUniqEvents(
	filters: Filter[],
	limit?: number,
	relays?: string[]
): Promise<NostrEvent[]> {
	const events: NostrEvent[] = [];

	return new Promise<NostrEvent[]>((resolve, reject) => {
		const flushes$ = new Subject<void>();
		const rxReq = createRxBackwardReq();

		const sub = rxNostr
			.use(rxReq, relays ? { relays } : undefined)
			.pipe(uniq(flushes$))
			.subscribe({
				next: (packet) => {
					events.push(packet.event);
				},
				error: (err) => {
					sub.unsubscribe();
					reject(err);
				},
				complete: () => {
					sub.unsubscribe();
					flushes$.next();
					resolve(events.sort((a, b) => b.created_at - a.created_at).slice(0, limit));
				}
			});

		rxReq.emit(filters);
		rxReq.over();
	});
}
function toKind10030Tags(currentTags: string[][], atags: string[]): string[][] {
	const nextTags = currentTags.filter((tag) => tag[0] !== 'a');
	for (const atag of atags) {
		nextTags.push(['a', atag]);
	}
	return nextTags;
}

export function getCurrentKind10030ATags(): string[] {
	return ((kind10030.value?.tags || []) as string[][])
		.filter((tag) => tag[0] === 'a' && isReplaceableEventSpecifier(tag[1]))
		.map((tag) => tag[1]);
}

function assertKind10030OwnershipForPublish(): void {
	const baseEvent = kind10030.value;
	if (!baseEvent) {
		throw Error('Current kind10030 is not loaded');
	}

	if (!loginUser.value || baseEvent.pubkey !== loginUser.value) {
		throw Error('Current kind10030 does not belong to login user');
	}
}

export async function addKind30030ToMyKind10030(atag: string): Promise<void> {
	if (!isReplaceableEventSpecifier(atag) || !atag.startsWith('30030:')) {
		throw Error('Invalid atag');
	}

	assertKind10030OwnershipForPublish();

	const currentATags = getCurrentKind10030ATags();
	if (currentATags.includes(atag)) {
		return;
	}
	const emojiSet = latestEmojisFromOthers.value.get(atag);
	if (emojiSet) {
		kind30030Stock.value.set(atag, emojiSet);
		latestEmojisFromOthers.value.delete(atag);
	}
	const nextATags = [...currentATags, atag];
	const currentTags = (kind10030.value?.tags || []) as string[][];

	await publishEvent({
		kind: 10030,
		content: kind10030.value?.content ?? '',
		tags: toKind10030Tags(currentTags, nextATags)
	});
}

export async function removeKind30030FromMyKind10030(atag: string): Promise<void> {
	if (!isReplaceableEventSpecifier(atag) || !atag.startsWith('30030:')) {
		throw Error('Invalid atag');
	}

	assertKind10030OwnershipForPublish();

	const currentATags = getCurrentKind10030ATags();
	if (!currentATags.includes(atag)) {
		return;
	}

	const nextATags = currentATags.filter((value) => value !== atag);
	const currentTags = (kind10030.value?.tags || []) as string[][];

	await publishEvent({
		kind: 10030,
		content: kind10030.value?.content ?? '',
		tags: toKind10030Tags(currentTags, nextATags)
	});
}

// ============================================================
// kind:30030 の取得・投稿・削除
// ============================================================

/**
 * 指定した pubkey の kind:30030 をすべて取得する
 * @param until 取得終了時刻（オプション）。指定するとその時刻より古いデータのみ取得
 */
export async function fetchAllKind30030FromPubkey(
	pubkey: string,
	until?: number
): Promise<NostrEvent[]> {
	return new Promise<NostrEvent[]>((resolve, reject) => {
		const events: NostrEvent[] = [];
		const flushes$ = new Subject<void>();
		const rxReq = createRxBackwardReq();

		const sub = rxNostr
			.use(rxReq)
			.pipe(uniq(flushes$))
			.subscribe({
				next: (packet) => {
					events.push(packet.event);
				},
				error: (err) => {
					sub.unsubscribe();
					reject(err);
				},
				complete: () => {
					sub.unsubscribe();
					flushes$.next();
					resolve(events.sort((a, b) => b.created_at - a.created_at));
				}
			});

		const filter: Filter = { kinds: [30030], authors: [pubkey] };
		if (until) filter.until = until;
		rxReq.emit(filter);
		rxReq.over();
	});
}

/**
 * ログインユーザーの kind:30030 を取得して mySets に保存する
 * @returns フェッチしたイベントの配列（古い順）
 */
export async function fetchMyKind30030Sets(): Promise<NostrEvent[]> {
	if (!loginUser.value) return [];

	const pubhex = toPubhex(loginUser.value);
	const events = await fetchAllKind30030FromPubkey(pubhex, subscriptionStartTimeMy.value);

	// mySets に保存（atag ごとに最新のみ）
	for (const event of events) {
		const atag = eventToAtag(event);
		updateIfNewer(mySets.value, atag, event);
	}
	console.log('updateIfNewer', mySets.value);
	// 最新のイベントで subscriptionStartTimeMy を更新
	if (events.length > 0) {
		subscriptionStartTimeMy.value = events[events.length - 1].created_at;
	}

	return events;
}

/**
 * kind:30030 を新規投稿する
 * @returns 投稿されたイベント
 */
export async function publishKind30030(params: {
	title: string;
	dtag: string;
	emojiTags: [string, string, string][];
}): Promise<void> {
	if (!loginUser.value) {
		throw Error('No login user');
	}

	const tags: string[][] = [
		['d', params.dtag],
		['title', params.title]
	];

	for (const [, shortcode, url] of params.emojiTags) {
		tags.push(['emoji', shortcode, url]);
	}

	await publishEvent({
		kind: 30030,
		content: '',
		tags
	});

	return;
}

/**
 * kind:5 でイベントを削除する（a タグ + e タグ両方含める）
 */
export async function deleteKind30030(eventId: string, atag: string): Promise<void> {
	if (!loginUser.value) {
		throw Error('No login user');
	}

	await publishEvent({
		kind: 5,
		content: '',
		tags: [
			['a', atag],
			['e', eventId]
		]
	});
}

export async function fetchKind0ForPubkeys(pubkeys: string[]): Promise<void> {
	// 未キャッシュ分だけ絞り込む（差分取得）
	const missing = pubkeys.filter((pk) => !kind0Cache.value.has(pk));
	if (missing.length === 0) return;

	return new Promise<void>((resolve, reject) => {
		const flushes$ = new Subject<void>();
		const rxReq = createRxBackwardReq();

		rxNostr
			.use(rxReq)
			.pipe(
				uniq(flushes$),
				latestEach((pk) => pk.event.pubkey)
			) // pubkeyごとに最新1件だけ保持
			.subscribe({
				next: ({ event }) => {
					kind0Cache.value.set(event.pubkey, event);
				},
				error: reject,
				complete: () => {
					flushes$.next();
					resolve();
				}
			});

		// 1リクエストでまとめて取得（N+1を回避）
		rxReq.emit({ kinds: [0], authors: missing });
		rxReq.over();
	});
}
