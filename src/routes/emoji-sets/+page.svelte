<script lang="ts">
	import {
		kind30030Stock,
		latestEmojisFromOthers,
		subscriptionStartTime
	} from '$lib/stores/palette';
	import { SvelteMap } from 'svelte/reactivity';
	import type { Filter } from 'nostr-typedef';
	import type { EmojiSetEvent } from '$lib/types';
	import EmojiSetCard from '$lib/components/features/EmojiSetCard.svelte';
	import { onMount } from 'svelte';
	import {
		fetchAllKind30030FromOthers,
		fetchKind0ForPubkeys,
		waitForRelayReady
	} from '$lib/nostr/rx-nostr';
	import { FETCHLIMIT } from '$lib/constracts/nostr';

	type ViewEvent = { emojiSetEvent: EmojiSetEvent; registered: boolean };
	//このページにきたら、表示させるデータが十分にあるならそれを表示。たりなければ、subscriptionStartTime未満200件分くらい30030を取得して、画面構成する。

	// 自分が登録している30030、していない30030を合体させた、created_atが新しいのが上にくるようにした配列。
	// 同一atagが両方にある場合は registered 側を優先。
	const filter: Filter = { kinds: [30030], limit: FETCHLIMIT };
	const viewEvents = $derived.by(() => {
		const result = new SvelteMap<string, ViewEvent>();
		for (const [atag, emojiSetEvent] of latestEmojisFromOthers.value) {
			result.set(atag, { emojiSetEvent, registered: false });
		}
		for (const [atag, emojiSetEvent] of kind30030Stock.value) {
			result.set(atag, { emojiSetEvent, registered: true });
		}
		return [...result.values()].sort(
			(a, b) => b.emojiSetEvent.event.created_at - a.emojiSetEvent.event.created_at
		);
	});
	onMount(async () => {
		console.log('onMount');
		await waitForRelayReady();
		if (viewEvents.length < 20) {
			filter.until = subscriptionStartTime.value;
			console.log(filter);
			fetchAllKind30030FromOthers([filter], FETCHLIMIT);
		}
	});

	// viewEvents が増えるたびに未取得pubkeyだけfetch
	$effect(() => {
		const pubkeys = viewEvents.map((v) => v.emojiSetEvent.event.pubkey);
		fetchKind0ForPubkeys(pubkeys); // 非同期・差分のみ
	});
</script>

<div class=" overflow-y-auto">
	{#if viewEvents.length == 0}
		<!--TODO: loadingdesign-->
		low loading
	{:else}
		<!--表示させるデータは viewEvents。なかみの表示はあとでつくる。-->
		{#each viewEvents as { emojiSetEvent } (emojiSetEvent.event.id)}
			{#if emojiSetEvent.emojiTags.length > 0}
				<EmojiSetCard {emojiSetEvent} />{/if}
		{/each}
	{/if}
</div>
