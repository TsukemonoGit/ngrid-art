<script lang="ts">
	import {
		kind30030Stock,
		latestEmojisFromOthers,
		subscriptionStartTimeOthers
	} from '$lib/stores/palette';
	import { SvelteMap } from 'svelte/reactivity';
	import type { Filter } from 'nostr-typedef';
	import type { EmojiSetEvent } from '$lib/types';
	import EmojiSetCard from '$lib/components/features/EmojiSetCard.svelte';
	import { onMount, untrack } from 'svelte';
	import { fetchAllKind30030FromOthers, fetchKind0ForPubkeys } from '$lib/nostr/rx-nostr';
	import { FETCHLIMIT, GLOBAL_RELAYS } from '$lib/constracts/nostr';
	import { kind10030 } from '$lib/stores/storages';
	import { connectReady, loginUser } from '$lib/stores/user';

	type ViewEvent = { emojiSetEvent: EmojiSetEvent; registered: boolean };

	let isLoading = $state(false);
	let useGlobalRelays = $state(false);
	//このページにきたら、表示させるデータが十分にあるならそれを表示。たりなければ、subscriptionStartTime未満200件分くらい30030を取得して、画面構成する。

	// 自分が登録している30030、していない30030を合体させた、created_atが新しいのが上にくるようにした配列。
	// 同一atagが両方にある場合は registered 側を優先。
	const filter: Filter = { kinds: [30030], limit: FETCHLIMIT };
	const kind30030Events = $derived.by(() => {
		const result = new SvelteMap<string, ViewEvent>();
		const myATags = new Set(
			((kind10030.value?.tags ?? []) as string[][]).filter((t) => t[0] === 'a').map((t) => t[1])
		);

		for (const [atag, emojiSetEvent] of latestEmojisFromOthers.value) {
			result.set(atag, { emojiSetEvent, registered: myATags.has(atag) });
		}
		for (const [atag, emojiSetEvent] of kind30030Stock.value) {
			result.set(atag, { emojiSetEvent, registered: myATags.has(atag) });
		}
		return [...result.values()].sort(
			(a, b) => b.emojiSetEvent.event.created_at - a.emojiSetEvent.event.created_at
		);
	});

	const PAGE_SIZE = 50;
	let displayCount = $state(PAGE_SIZE);

	// 表示するイベント（手元データの先頭 displayCount 件だけ）
	const visibleEvents = $derived(kind30030Events.slice(0, displayCount));
	// まだ手元に表示しきれていないものがあるか
	const hasMoreLocal = $derived(displayCount + PAGE_SIZE < kind30030Events.length);

	async function fetchMore(relays?: string[]) {
		if (isLoading) return;
		isLoading = true;
		filter.until = subscriptionStartTimeOthers.value;
		console.log(filter);
		await fetchAllKind30030FromOthers([filter], FETCHLIMIT, relays);
		isLoading = false;
	}

	async function handleLoadMore() {
		if (hasMoreLocal) {
			// 手元にまだあるなら表示件数を増やすだけ
			displayCount += PAGE_SIZE;
		} else {
			// 手元を出し切ったらNostrから追加取得
			if (useGlobalRelays) {
				await fetchMore(GLOBAL_RELAYS);
			} else {
				await fetchMore();
			}
			displayCount += PAGE_SIZE;
		}
	}

	onMount(async () => {
		console.log('onMount');
		if (latestEmojisFromOthers.value.size === 0) {
			//このページは、未ログインでもみんなの絵文字が表示されるようにしたい。
			//が、現状のコードでは、ログインユーザーの情報をもとにデフォルトリレーを設定して、
			//それを利用してフェッチしているため、未ログインでどうするかをかんがえる必要がある。
			//1. まずログインが完了しているかをちぇっく

			if (!loginUser.value) {
				//2. してなかったらget pubkeyしてみる
				try {
					await window.nostr?.getPublicKey();
				} catch (error) {
					console.log(error);
				}
			}
			//3. それもきゃんせるされたら、グローバル用のリレーをもとに、絵文字リストをフェッチする。

			if (!loginUser.value) {
				useGlobalRelays = true;
				await fetchMore(GLOBAL_RELAYS);
			}
		}
	});
	$effect(() => {
		if (connectReady.value) {
			untrack(async () => {
				if (latestEmojisFromOthers.value.size === 0) {
					useGlobalRelays = false;
					await fetchMore();
				}
			});
		}
	});
	// kind30030Events が増えるたびに未取得pubkeyだけfetch
	$effect(() => {
		const pubkeys = kind30030Events.map((v) => v.emojiSetEvent.event.pubkey);
		untrack(() => {
			fetchKind0ForPubkeys(pubkeys); // 非同期・差分のみ
		});
	});
</script>

<div class=" overflow-y-auto">
	{#if kind30030Events.length == 0}
		<!--TODO: loadingdesign-->

		{#if isLoading}
			loading......
		{:else}
			nodata
		{/if}
	{:else}
		<!--表示させるデータは kind30030Events。なかみの表示はあとでつくる。-->
		<div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
			{#each visibleEvents as { emojiSetEvent } (emojiSetEvent.event.id)}
				{#if emojiSetEvent.emojiTags.length > 0}
					<EmojiSetCard {emojiSetEvent} />
				{/if}
			{/each}
		</div>
		<div class="flex justify-center py-4">
			<button
				onclick={handleLoadMore}
				disabled={isLoading}
				class="rounded bg-surface-container px-4 py-2 text-on-surface disabled:opacity-50"
			>
				{#if isLoading}
					読み込み中...
				{:else}
					もっと読む
				{/if}
			</button>
		</div>
	{/if}
</div>
