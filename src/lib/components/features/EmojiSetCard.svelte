<script lang="ts">
	import { addKind30030ToMyKind10030, removeKind30030FromMyKind10030 } from '$lib/nostr/rx-nostr';
	import { kind0Cache } from '$lib/stores/palette';
	import { kind10030 } from '$lib/stores/storages';
	import { loginUser } from '$lib/stores/user';
	import type { EmojiSetEvent, Profile } from '$lib/types';
	import { formatAbsoluteDateFromUnix } from '$lib/utils/time';
	import type { Event as NostrEvent } from 'nostr-typedef';

	interface Props {
		emojiSetEvent: EmojiSetEvent;
	}

	let { emojiSetEvent: eventSet }: Props = $props();

	let isAdding = $state(false);
	let isRemoving = $state(false);
	let atag = $derived(`30030:${eventSet.event.pubkey}:${eventSet.dtag}`);

	// 表示中の30030セットが自分の10030に登録済みか
	let isRegistered = $derived(
		kind10030.value?.tags.some((tag) => {
			if (!Array.isArray(tag) || tag.length < 2 || tag[0] !== 'a') return false;
			const aTagValue = tag[1];

			return aTagValue === atag;
		}) ?? false
	);

	async function handleAdd() {
		if (!loginUser.value) return;
		isAdding = true;
		try {
			//		await add30030ReferenceToMyKind10030(loginUser.value, eventSet.event);
			await addKind30030ToMyKind10030(atag);
		} catch (err) {
			console.error('Failed to add emoji set:', err);
		} finally {
			isAdding = false;
		}
	}

	async function handleRemove() {
		if (!loginUser.value) return;
		isRemoving = true;
		try {
			await removeKind30030FromMyKind10030(atag);
			//		await remove30030ReferenceFromMyKind10030(loginUser.value, eventSet.event);
		} catch (err) {
			console.error('Failed to remove emoji set:', err);
		} finally {
			isRemoving = false;
		}
	}

	let profileEvent = $derived(kind0Cache.value.get(eventSet.event.pubkey));
	let profile = $derived(getUserProfile(profileEvent));
	function getUserProfile(ev: NostrEvent | undefined): Profile | null {
		const content = ev?.content;
		if (!content) return null;
		try {
			return JSON.parse(content) as Profile;
		} catch {
			return null;
		}
	}
	let picture = $derived(profile?.picture ?? '');
	let displayName = $derived(profile?.display_name ?? profile?.name ?? '');

	const EMOJI_PREVIEW_LIMIT = 20;
	let showAllEmojis = $state(false);
	let visibleEmojis = $derived(
		showAllEmojis ? eventSet.emojiTags : eventSet.emojiTags.slice(0, EMOJI_PREVIEW_LIMIT)
	);
	let hiddenCount = $derived(eventSet.emojiTags.length - EMOJI_PREVIEW_LIMIT);
</script>

<div
	class="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container p-1 transition-shadow"
>
	<!-- セット名 -->
	<!-- 作者行 -->

	<div class="flex items-center justify-between gap-2">
		<p class="text-base font-bold text-primary">{eventSet.label}</p>
		<div class=" flex">
			<div class="flex min-w-0 flex-col text-end">
				<span class="truncate text-sm font-medium text-on-surface">{displayName}</span>
				<span class="text-xs text-on-surface-variant"
					>{formatAbsoluteDateFromUnix(eventSet.event.created_at)}</span
				>
			</div>
			<div class="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-surface-container-highest">
				{#if picture}
					<img src={picture} alt="avatar" loading="lazy" class="h-full w-full object-cover" />
				{/if}
			</div>
		</div>
	</div>

	<div class="flex flex-wrap gap-1">
		{#each visibleEmojis as [, shortcode, url], i (i)}
			<div class="h-8 w-8 overflow-hidden rounded bg-surface-container-high" title={shortcode}>
				<img src={url} alt={shortcode} loading="lazy" class="h-full w-full object-contain" />
			</div>
		{/each}
		{#if !showAllEmojis && hiddenCount > 0}
			<button
				class="flex h-8 items-center rounded bg-surface-container-high px-2 text-xs text-on-surface-variant hover:bg-surface-container-highest"
				onclick={() => (showAllEmojis = true)}
			>
				+{hiddenCount}
			</button>
		{:else if showAllEmojis && hiddenCount > 0}
			<button
				class="flex h-8 items-center rounded bg-surface-container-high px-2 text-xs text-on-surface-variant hover:bg-surface-container-highest"
				onclick={() => (showAllEmojis = false)}
			>
				折りたたむ
			</button>
		{/if}
	</div>

	<!-- アクション -->
	{#if loginUser.value}
		<div class="flex justify-end pt-1">
			{#if isRegistered}
				<button
					class="cursor-pointer rounded-full border border-error px-4 py-1 text-sm text-error transition-colors hover:bg-error-container disabled:cursor-not-allowed disabled:opacity-60"
					onclick={handleRemove}
					disabled={isRemoving}
				>
					{isRemoving ? '削除中...' : '削除'}
				</button>
			{:else}
				<button
					class="cursor-pointer rounded-full bg-primary px-4 py-1 text-sm text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
					onclick={handleAdd}
					disabled={isAdding}
				>
					{isAdding ? '追加中...' : '追加'}
				</button>
			{/if}
		</div>
	{/if}
</div>
