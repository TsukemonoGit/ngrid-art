<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Dialog } from 'bits-ui';
	import { X, Plus, Trash2, Pencil } from '@lucide/svelte';
	import { loginUser } from '$lib/stores/user';
	import { publishKind30030, deleteKind30030 } from '$lib/nostr/rx-nostr';
	import { kind0Cache, mySets } from '$lib/stores/palette';
	import { truncateLabel } from '$lib/utils/utils';
	import { getContext } from 'svelte';
	const mySetsLoading = getContext<{ value: boolean }>('mySetsLoading');

	// --- State ---
	let isCreating = $state(false);
	let isDeletingId = $state<string | null>(null);
	let creatingTitle = $state('');
	let creatingDtag = $state('');
	let errorMessage = $state<string | null>(null);

	// --- Create Dialog ---
	let createOpen = $state(false);

	// --- Delete Confirmation Dialog ---
	let deleteTarget = $state<{ id: string; atag: string; label: string } | null>(null);
	let deleteOpen = $state(false);

	// グローバル mySets から表示用配列を生成（created_at 降順）
	let displayMySets = $derived.by(() => {
		return [...mySets.value.values()].sort((a, b) => b.event.created_at - a.event.created_at);
	});

	// --- Create new set ---
	function handleCreateDialogOpen(): void {
		creatingTitle = '';
		creatingDtag = Math.floor(Date.now() / 1000).toString();
		createOpen = true;
	}

	async function handleCreate(): Promise<void> {
		if (!creatingTitle.trim()) {
			errorMessage = 'タイトルを入力してください';
			return;
		}

		if (!/^[a-zA-Z0-9_-]+$/.test(creatingDtag)) {
			errorMessage = 'identifier は英数字、ハイフン、アンダースコアのみ使用できます';
			return;
		}

		if (displayMySets.some((s) => s.dtag === creatingDtag)) {
			errorMessage = 'この identifier は既に使用されています';
			return;
		}

		isCreating = true;
		errorMessage = null;

		try {
			await publishKind30030({
				title: creatingTitle.trim(),
				dtag: creatingDtag,
				emojiTags: []
			});

			createOpen = false;
		} catch (err) {
			console.error('Failed to create set:', err);
			errorMessage = 'セットの作成に失敗しました';
		} finally {
			isCreating = false;
		}
	}

	// --- Delete set ---
	function openDeleteDialog(label: string, atag: string, eventId: string): void {
		deleteTarget = { label, atag, id: eventId };
		deleteOpen = true;
	}

	async function handleDelete(): Promise<void> {
		if (!deleteTarget) return;

		const targetId = deleteTarget.id;
		const targetAtag = deleteTarget.atag;
		isDeletingId = targetId;
		errorMessage = null;

		try {
			await deleteKind30030(targetId, targetAtag);
			deleteOpen = false;
			deleteTarget = null;
		} catch (err) {
			console.error('Failed to delete set:', err);
			errorMessage = 'セットの削除に失敗しました';
		} finally {
			isDeletingId = null;
			deleteTarget = null;
		}
	}

	// --- Navigate to edit page ---
	function navigateToEdit(dtag: string): void {
		goto(resolve(`/my-sets/${dtag}`));
	}
</script>

<div class="flex min-h-full flex-col overflow-y-auto">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-outline-variant px-4 py-3">
		<h1 class="text-xl font-bold text-on-surface">My Emoji Sets</h1>
		{#if loginUser.value}
			<button
				onclick={handleCreateDialogOpen}
				class="flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
			>
				<Plus size="18" />
				新規作成
			</button>
		{/if}
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div class="mx-4 mt-4 rounded-xl bg-error-container p-3 text-sm text-error">
			{errorMessage}
		</div>
	{/if}

	<!-- Main Content -->
	{#if displayMySets.length === 0}
		{#if mySetsLoading.value}
			now loading
		{:else}
			<div class="flex flex-1 flex-col items-center justify-center gap-4">
				<p class="text-lg text-on-surface-variant">まだセットがありません</p>
				<button
					onclick={handleCreateDialogOpen}
					class="flex items-center gap-1 rounded-full bg-primary px-6 py-3 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
				>
					<Plus size="18" />
					セットを作成する
				</button>
			</div>
		{/if}
	{:else}
		<div class="flex flex-col gap-3 px-4 py-4">
			{#each displayMySets as set (set.event.id)}
				<div
					class="flex items-center justify-between rounded-xl border border-outline-variant bg-surface-container p-3 transition-shadow hover:shadow-md"
				>
					<!-- Set Info -->
					<button
						onclick={() => navigateToEdit(set.dtag)}
						class="flex flex-1 cursor-pointer items-center gap-3 text-left"
					>
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate text-base font-semibold text-on-surface"
								>{truncateLabel(set.label, 20, 4)}</span
							>
							<span class="truncate text-xs text-on-surface-variant">
								identifier: {set.dtag}
							</span>
						</div>
						<!-- Avatar -->
						{#if kind0Cache.value.has(set.event.pubkey)}
							{@const cache = kind0Cache.value.get(set.event.pubkey)!}
							{@const profile = JSON.parse(cache.content || '{}')}
							<div
								class="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-container-high"
							>
								<img src={profile.picture} alt="" class="h-full w-full object-cover" />
							</div>
						{/if}
					</button>

					<!-- Actions -->
					<div class="ml-3 flex shrink-0 items-center gap-1">
						<button
							onclick={() => navigateToEdit(set.dtag)}
							class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
							aria-label="編集"
							title="編集"
						>
							<Pencil size="18" />
						</button>
						<button
							onclick={() =>
								openDeleteDialog(set.label, `30030:${set.event.pubkey}:${set.dtag}`, set.event.id)}
							disabled={isDeletingId === set.event.id}
							class="rounded-full p-2 text-error transition-colors hover:bg-error-container disabled:opacity-50"
							aria-label="削除"
							title="削除"
						>
							{#if isDeletingId === set.event.id}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
								></div>
							{:else}
								<Trash2 size="18" />
							{/if}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Create Dialog -->
	<Dialog.Root bind:open={createOpen}>
		<Dialog.Portal>
			<Dialog.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim/40 backdrop-blur-sm"
			/>
			<Dialog.Content
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-container-highest p-6 shadow-xl outline-none"
			>
				<div class="mb-4 flex items-center justify-between">
					<Dialog.Title class="text-lg font-semibold text-on-surface">
						新しいセットを作成
					</Dialog.Title>
					<Dialog.Close
						class="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
						aria-label="閉じる"
					>
						<X size={20} />
					</Dialog.Close>
				</div>

				<div class="flex flex-col gap-4">
					<!-- Title -->
					<div class="flex flex-col gap-1.5">
						<label class="text-sm font-medium text-on-surface-variant"
							>タイトル *
							<input
								bind:value={creatingTitle}
								placeholder="セット名を入力"
								class="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40 focus:border-primary"
							/></label
						>
					</div>

					<!-- Identifier -->
					<div class="flex flex-col gap-1.5">
						<label class="text-sm font-medium text-on-surface-variant"
							>identifier
							<input
								bind:value={creatingDtag}
								placeholder="英数字、ハイフン、アンダースコア"
								class="w-full rounded-lg border border-outline-variant bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none placeholder:text-on-surface-variant/40 focus:border-primary"
							/></label
						>
						<p class="text-xs text-on-surface-variant/60">
							identifier は作成後に編集できません。英数字、ハイフン(-)、アンダースコア(_)
							のみ使用できます。
						</p>
					</div>

					<!-- Error -->
					{#if errorMessage}
						<div class="rounded-lg bg-error-container p-2.5 text-sm text-error">
							{errorMessage}
						</div>
					{/if}

					<!-- Buttons -->
					<div class="flex justify-end gap-2 pt-2">
						<Dialog.Close
							class="rounded-lg px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
						>
							キャンセル
						</Dialog.Close>
						<button
							onclick={handleCreate}
							disabled={isCreating || !creatingTitle.trim()}
							class="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{isCreating ? '作成中...' : '作成する'}
						</button>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<!-- Delete Confirmation Dialog -->
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Portal>
			<Dialog.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim/40 backdrop-blur-sm"
			/>
			<Dialog.Content
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-container-highest p-6 shadow-xl outline-none"
			>
				<div class="mb-4 flex items-center justify-between">
					<Dialog.Title class="text-lg font-semibold text-on-surface">セットを削除</Dialog.Title>
					<Dialog.Close
						class="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
						aria-label="閉じる"
					>
						<X size={20} />
					</Dialog.Close>
				</div>

				<div class="flex flex-col gap-4">
					<p class="text-sm text-on-surface">
						<strong>{deleteTarget?.label}</strong> を削除してもよろしいですか？
					</p>
					<p class="text-xs text-on-surface-variant/60">
						この操作は取り消せません。Nostr 上に削除イベントが投稿されます。
					</p>

					{#if errorMessage}
						<div class="rounded-lg bg-error-container p-2.5 text-sm text-error">
							{errorMessage}
						</div>
					{/if}

					<div class="flex justify-end gap-2 pt-2">
						<Dialog.Close>
							<button
								class="rounded-lg px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
							>
								キャンセル
							</button>
						</Dialog.Close>
						<button
							onclick={handleDelete}
							disabled={isDeletingId !== null}
							class="rounded-lg bg-error px-6 py-2 text-sm font-medium text-on-error transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{isDeletingId ? '削除中...' : '削除する'}
						</button>
					</div>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</div>
