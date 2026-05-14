<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { Dialog } from 'bits-ui';
	import { X, ArrowLeft, Plus, Trash2, Pencil, Save, CloudUpload } from '@lucide/svelte';

	import { publishKind30030 } from '$lib/nostr/rx-nostr';
	import { BLOSSOM_SERVER_KEY } from '$lib/constracts/storageKey';
	import type { EmojiSetEvent } from '$lib/types';
	import { mySets } from '$lib/stores/palette';
	import { loginUser } from '$lib/stores/user';
	import { untrack } from 'svelte';

	// --- State ---

	let setEvent: EmojiSetEvent | undefined = $derived(
		mySets.value.get(`30030:${loginUser.value}:${page.params.identifier}`)
	);
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);

	// Title editing
	let editingTitle = $state('');
	let isEditingTitle = $state(false);

	// Emoji list
	//emojis!.push(), emojis!.splice(), emojis![i].shortcode = ... のように直接変更するため、effectでsetEventを購読
	let emojis: { shortcode: string; url: string }[] = $state([]);

	$effect(() => {
		if (setEvent) {
			untrack(() => {
				emojis = setEvent?.emojiTags.map((tag) => {
					return { shortcode: tag[1], url: tag[2] };
				});
			});
		}
	});
	// Add emoji via URL
	let newEmojiShortcode = $state('');
	let newEmojiUrl = $state('');
	let newEmojiPreview = $state<string | null>(null);

	// File upload
	let selectedFile: File | null = $state(null);
	let filePreview = $state<string | null>(null);
	let selectedServer = $state('');
	let isUploading = $state(false);

	// Edit emoji inline
	let editingEmojiIdx = $state<number | null>(null);
	let editShortcode = $state('');
	let editUrl = $state('');
	let editPreview = $state<string | null>(null);

	// Delete confirmation
	let deleteEmojiIdx = $state<number | null>(null);
	let deleteOpen = $state(false);

	// Blossom server options
	const BLOSSOM_SERVERS = [
		{ name: 'Blossom', url: 'https://blossom.fly.dev' },
		{ name: 'NIP-96 (example)', url: 'https://upload.nostr.band' }
	];

	// --- Title editing ---
	function startEditTitle(): void {
		isEditingTitle = true;
	}
	function cancelEditTitle(): void {
		isEditingTitle = false;
		editingTitle = setEvent?.label ?? '';
	}

	// --- Emoji preview ---
	function handleEmojiUrlInput(url: string): void {
		newEmojiPreview = url.trim() || null;
	}
	function handleEditUrlInput(url: string): void {
		editPreview = url.trim() || null;
	}

	// --- Add emoji via URL ---
	function handleAddEmojiByUrl(): void {
		if (!newEmojiShortcode.trim() || !newEmojiUrl.trim()) {
			errorMessage = 'shortcode と URL を入力してください';
			return;
		}
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newEmojiShortcode)) {
			errorMessage = 'shortcode は英数字とアンダースコアで、文字から始める必要があります';
			return;
		}
		if (emojis!.some((e) => e.shortcode === newEmojiShortcode.trim())) {
			errorMessage = 'この shortcode は既に使用されています';
			return;
		}
		addEmoji(newEmojiShortcode.trim(), newEmojiUrl.trim());
	}

	// --- File upload ---
	function handleFileSelect(event: Event): void {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;
		selectedFile = input.files[0];
		filePreview = URL.createObjectURL(selectedFile);
	}

	async function handleUploadFile(): Promise<void> {
		if (!selectedFile || !selectedServer) {
			errorMessage = 'ファイルとサーバーを選択してください';
			return;
		}

		isUploading = true;
		errorMessage = null;

		try {
			localStorage.setItem(BLOSSOM_SERVER_KEY, selectedServer);

			const uploadUrl = `${selectedServer}/upload`;
			const formData = new FormData();
			formData.append('file', selectedFile);

			const response = await fetch(uploadUrl, { method: 'POST', body: formData });
			if (!response.ok) throw Error(`Upload failed: ${response.status}`);

			const data = await response.json();
			const uploadedUrl = data.url || data.cdnUrl;
			if (!uploadedUrl) throw Error('No URL returned from upload');

			// Auto-generate shortcode
			let shortcode = selectedFile.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_');
			if (!/^[a-zA-Z_]/.test(shortcode)) shortcode = 'emoji_' + shortcode;

			// Deduplicate
			let finalShortcode = shortcode;
			let counter = 1;
			while (emojis!.some((e) => e.shortcode === finalShortcode)) {
				finalShortcode = `${shortcode}_${counter}`;
				counter++;
			}

			addEmoji(finalShortcode, uploadedUrl);
			selectedFile = null;
			filePreview = null;
		} catch (err) {
			console.error('Upload failed:', err);
			errorMessage = 'アップロードに失敗しました';
		} finally {
			isUploading = false;
		}
	}

	// --- Add emoji to list ---
	function addEmoji(shortcode: string, url: string): void {
		emojis!.push({ shortcode, url });
		newEmojiShortcode = '';
		newEmojiUrl = '';
		newEmojiPreview = null;
		errorMessage = null;
	}

	// --- Edit emoji ---
	function startEditEmoji(idx: number): void {
		editingEmojiIdx = idx;
		editShortcode = emojis![idx].shortcode;
		editUrl = emojis![idx].url;
		editPreview = emojis![idx].url;
	}
	function cancelEditEmoji(): void {
		editingEmojiIdx = null;
		editShortcode = '';
		editUrl = '';
		editPreview = null;
	}
	function saveEditEmoji(): void {
		if (editingEmojiIdx === null) return;
		if (!editShortcode.trim() || !editUrl.trim()) {
			errorMessage = 'shortcode と URL を入力してください';
			return;
		}
		const otherShortcodes = emojis!.filter((_, i) => i !== editingEmojiIdx).map((e) => e.shortcode);
		if (otherShortcodes.includes(editShortcode.trim())) {
			errorMessage = 'この shortcode は既に使用されています';
			return;
		}
		emojis![editingEmojiIdx].shortcode = editShortcode.trim();
		emojis![editingEmojiIdx].url = editUrl.trim();
		editingEmojiIdx = null;
		errorMessage = null;
	}

	// --- Delete emoji ---
	function openDeleteEmoji(idx: number): void {
		deleteEmojiIdx = idx;
		deleteOpen = true;
	}
	function confirmDeleteEmoji(): void {
		if (deleteEmojiIdx === null) return;
		emojis!.splice(deleteEmojiIdx, 1);
		deleteEmojiIdx = null;
		deleteOpen = false;
	}

	// --- Reorder ---
	function moveEmojiUp(idx: number): void {
		if (idx <= 0) return;
		[emojis![idx - 1], emojis![idx]] = [emojis![idx], emojis![idx - 1]];
	}
	function moveEmojiDown(idx: number): void {
		if (idx >= emojis!.length - 1) return;
		[emojis![idx + 1], emojis![idx]] = [emojis![idx], emojis![idx + 1]];
	}

	// --- Save and publish ---
	async function handleSave(): Promise<void> {
		if (!setEvent) return;

		const shortcodes = emojis!.map((e) => e.shortcode);
		if (new Set(shortcodes).size !== shortcodes.length) {
			errorMessage = 'duplicate shortcode があります';
			return;
		}

		isSaving = true;
		errorMessage = null;

		try {
			const emojiTags: [string, string, string][] = emojis!.map((e) => [
				'emoji',
				e.shortcode,
				e.url
			]);

			await publishKind30030({
				title: editingTitle.trim() || setEvent.label,
				dtag: setEvent.dtag,
				emojiTags
			});

			errorMessage = '保存しました！';
			setTimeout(() => {
				errorMessage = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to save:', err);
			errorMessage = '保存に失敗しました';
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="flex min-h-full flex-col overflow-y-auto">
	<!-- Header -->
	<div class="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
		<button
			onclick={() => goto(resolve('/my-sets'))}
			class="flex items-center gap-1 rounded-full border border-current bg-transparent px-3 py-1.5 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
		>
			<ArrowLeft size="18" />
			My Sets
		</button>
	</div>

	<!-- Error Message -->
	{#if errorMessage}
		<div class="mx-4 mt-4 rounded-xl bg-error-container p-3 text-sm text-error">
			{errorMessage}
		</div>
	{/if}

	<!-- Main Content -->

	{#if setEvent}
		<div class="flex flex-col gap-4 px-4 py-4">
			<!-- Title Editing -->
			<div class="flex items-center gap-2">
				{#if isEditingTitle}
					<input
						bind:value={editingTitle}
						class="flex-1 rounded-lg border border-outline-variant bg-surface-container px-3 py-2 text-lg font-bold text-on-surface outline-none focus:border-primary"
						onkeydown={(e) => {
							if (e.key === 'Enter') isEditingTitle = false;
							if (e.key === 'Escape') cancelEditTitle();
						}}
					/>
					<button
						onclick={() => (isEditingTitle = false)}
						class="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
					>
						<Save size="20" />
					</button>
				{:else}
					<h2 class="flex-1 text-lg font-bold text-on-surface">{editingTitle}</h2>
					<button
						onclick={startEditTitle}
						class="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high"
					>
						<Pencil size="18" />
					</button>
				{/if}
			</div>

			<p class="text-xs text-on-surface-variant">
				identifier: {setEvent.dtag}（変更不可）
			</p>

			<!-- Add Emoji via URL -->
			<div class="rounded-xl border border-outline-variant bg-surface-container p-4">
				<h3 class="mb-3 text-sm font-semibold text-on-surface-variant">絵文字を追加（URL）</h3>
				<div class="flex flex-col gap-2">
					<div class="flex gap-2">
						<input
							bind:value={newEmojiShortcode}
							placeholder="shortcode"
							class="w-28 rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
						/>
						<input
							bind:value={newEmojiUrl}
							type="url"
							placeholder="https://..."
							class="flex-1 rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
							oninput={(e) => handleEmojiUrlInput((e.target as HTMLInputElement).value)}
						/>
					</div>
					{#if newEmojiPreview}
						<div class="flex items-center gap-2 rounded-lg bg-surface-container-high p-2">
							<img
								src={newEmojiPreview}
								alt="preview"
								class="h-8 w-8 object-contain"
								onerror={(e) => {
									(e.target as HTMLImageElement).style.display = 'none';
								}}
							/>
							<span class="truncate text-xs text-on-surface-variant">{newEmojiPreview}</span>
						</div>
					{/if}
					<button
						onclick={handleAddEmojiByUrl}
						disabled={!newEmojiShortcode.trim() || !newEmojiUrl.trim()}
						class="mt-1 flex items-center justify-center gap-1 rounded-lg bg-primary py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						<Plus size="16" />
						追加
					</button>
				</div>
			</div>

			<!-- File Upload -->
			<div class="rounded-xl border border-outline-variant bg-surface-container p-4">
				<h3 class="mb-3 text-sm font-semibold text-on-surface-variant">ファイルアップロード</h3>
				<input
					type="file"
					accept="image/*"
					onchange={handleFileSelect}
					class="mb-3 w-full text-sm text-on-surface-variant file:mr-4 file:rounded-lg file:border file:border-outline-variant file:bg-surface-container-high file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-surface hover:file:bg-surface-container-highest"
				/>
				{#if filePreview}
					<div class="mb-3 flex items-center gap-2 rounded-lg bg-surface-container-high p-2">
						<img src={filePreview} alt="preview" class="h-10 w-10 rounded object-contain" />
						<span class="truncate text-xs text-on-surface-variant">{selectedFile?.name}</span>
					</div>
				{/if}
				<div class="mb-3 flex flex-col gap-1.5">
					<label class="text-xs font-medium text-on-surface-variant">アップロード先サーバー</label>
					<select
						bind:value={selectedServer}
						class="rounded-lg border border-outline-variant bg-surface-container-high px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
					>
						<option value="">サーバーを選択</option>
						{#each BLOSSOM_SERVERS as server (server.name)}
							<option value={server.url}>{server.name} ({server.url})</option>
						{/each}
					</select>
					<p class="text-xs text-on-surface-variant/50">
						選択したサーバー設定は次回から自動的に復元されます
					</p>
				</div>
				<button
					onclick={handleUploadFile}
					disabled={!selectedFile || !selectedServer || isUploading}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{#if isUploading}
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
						></div>
						アップロード中...
					{:else}
						<CloudUpload size="16" />
						アップロード
					{/if}
				</button>
			</div>

			<!-- Emoji List -->
			<div class="rounded-xl border border-outline-variant bg-surface-container p-4">
				<h3 class="mb-3 text-sm font-semibold text-on-surface-variant">
					絵文字リスト ({emojis!.length})
				</h3>
				{#if emojis!.length === 0}
					<p class="py-4 text-center text-sm text-on-surface-variant/60">
						絵文字が登録されていません
					</p>
				{:else}
					<div class="flex flex-col gap-2">
						{#each emojis as emoji, idx (idx)}
							<div class="flex items-center gap-2 rounded-lg bg-surface-container-high p-2">
								<!-- Order controls -->
								<div class="flex flex-col gap-0.5">
									<button
										onclick={() => moveEmojiUp(idx)}
										disabled={idx === 0}
										class="rounded p-0.5 text-xs text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
										>▲</button
									>
									<button
										onclick={() => moveEmojiDown(idx)}
										disabled={idx === emojis!.length - 1}
										class="rounded p-0.5 text-xs text-on-surface-variant hover:bg-surface-container disabled:opacity-30"
										>▼</button
									>
								</div>

								{#if editingEmojiIdx === idx}
									<!-- Edit mode -->
									<div class="flex flex-1 flex-col gap-1.5">
										<input
											bind:value={editShortcode}
											class="w-28 rounded border border-outline-variant bg-surface-container px-2 py-1 text-sm text-on-surface outline-none focus:border-primary"
										/>
										<input
											bind:value={editUrl}
											type="url"
											oninput={(e) => handleEditUrlInput((e.target as HTMLInputElement).value)}
											class="flex-1 rounded border border-outline-variant bg-surface-container px-2 py-1 text-sm text-on-surface outline-none focus:border-primary"
										/>
										{#if editPreview}
											<img src={editPreview} alt="preview" class="h-6 w-6 object-contain" />
										{/if}
									</div>
									<button
										onclick={saveEditEmoji}
										class="text-success hover:bg-success-container rounded p-1.5"
										title="保存"><Save size="16" /></button
									>
									<button
										onclick={cancelEditEmoji}
										class="rounded p-1.5 text-on-surface-variant hover:bg-surface-container"
										title="キャンセル"><X size="16" /></button
									>
								{:else}
									<!-- View mode -->
									<div class="h-10 w-10 overflow-hidden rounded bg-surface-container">
										<img
											src={emoji.url}
											alt={emoji.shortcode}
											class="h-full w-full object-contain"
											onerror={(e) => {
												(e.target as HTMLImageElement).style.display = 'none';
											}}
										/>
									</div>
									<span class="min-w-0 flex-1 truncate text-sm text-on-surface"
										>:{emoji.shortcode}:</span
									>
									<button
										onclick={() => startEditEmoji(idx)}
										class="rounded p-1.5 text-on-surface-variant hover:bg-surface-container"
										title="修正"><Pencil size="16" /></button
									>
									<button
										onclick={() => openDeleteEmoji(idx)}
										class="rounded p-1.5 text-error hover:bg-error-container"
										title="削除"><Trash2 size="16" /></button
									>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Save Button -->
			<div class="sticky bottom-0 bg-surface pt-3 pb-4">
				<button
					onclick={handleSave}
					disabled={isSaving}
					class="w-full rounded-xl bg-primary py-3 text-sm font-bold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
				>
					{isSaving ? '保存中...' : '保存して公開'}
				</button>
			</div>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4">
			<p class="text-lg text-on-surface-variant">{errorMessage ?? 'セットが見つかりません'}</p>
			<button
				onclick={() => goto(resolve('/my-sets'))}
				class="rounded-full border border-outline-variant px-6 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
			>
				My Sets へ戻る
			</button>
		</div>
	{/if}

	<!-- Delete Emoji Confirmation Dialog -->
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Portal>
			<Dialog.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim/40 backdrop-blur-sm"
			/>
			<Dialog.Content
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-container-highest p-6 shadow-xl outline-none"
			>
				<div class="mb-4 flex items-center justify-between">
					<Dialog.Title class="text-lg font-semibold text-on-surface">絵文字を削除</Dialog.Title>
					<Dialog.Close
						class="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
						aria-label="閉じる"><X size={20} /></Dialog.Close
					>
				</div>
				{#if deleteEmojiIdx !== null}
					<p class="text-sm text-on-surface">
						<strong>:{emojis![deleteEmojiIdx]?.shortcode}:</strong> を削除してもよろしいですか？
					</p>
				{/if}
				<div class="flex justify-end gap-2 pt-4">
					<Dialog.Close>
						<button
							class="rounded-lg px-4 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
							>キャンセル</button
						>
					</Dialog.Close>
					<button
						onclick={confirmDeleteEmoji}
						class="rounded-lg bg-error px-6 py-2 text-sm font-medium text-on-error transition-opacity hover:opacity-90"
						>削除する</button
					>
				</div>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
</div>
