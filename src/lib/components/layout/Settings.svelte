<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { Settings, X } from '@lucide/svelte';
	import { nullEmoji } from '$lib/stores/storages';
	import { hasDefaultNullSet, selectedEmoji } from '$lib/stores/palette';
	import { APP_30030_ATAG, NULL_EMOJI_SHORTCODE, NULL_EMOJI_URL } from '$lib/constracts/palette';
	import type { PaletteEmoji } from '$lib/types';
	import { loginUser } from '$lib/stores/user';
	import { addKind30030ToMyKind10030 } from '$lib/nostr/rx-nostr';

	let open: boolean = $state(false);

	/** 現在のnull絵文字の表示テキストを生成する */
	function getNullEmojiLabel(): string {
		if (nullEmoji.value.type === 'fullwidth_space') {
			return '全角スペース (\\u3000)';
		}
		return nullEmoji.value.emoji?.shortcode ?? NULL_EMOJI_SHORTCODE;
	}

	/** 選択中のパレット絵文字をnull絵文字に設定する */
	function handlePaletteSelect(emoji: PaletteEmoji): void {
		nullEmoji.value = {
			type: 'custom',
			emoji: {
				shortcode: emoji.shortcode,
				url: emoji.url,
				originalShortcode: emoji.originalShortcode,
				ref: emoji.ref
			}
		};
	}

	/** 全角スペースに変更する（NULL-04: 非推奨として明示） */
	function setFullwidthSpace(): void {
		nullEmoji.value = {
			type: 'fullwidth_space'
		};
	}

	/** デフォルトに戻す */
	function resetToDefault(): void {
		nullEmoji.value = {
			type: 'custom',
			emoji: {
				shortcode: NULL_EMOJI_SHORTCODE,
				url: NULL_EMOJI_URL,
				originalShortcode: NULL_EMOJI_SHORTCODE
			}
		};
	}

	/** 自分の10030にデフォルトnull絵文字セットの'a'タグを追加する */
	async function handleAddDefaultToMyKind10030(): Promise<void> {
		const pubkey = loginUser.value;
		if (!pubkey) {
			return;
		}

		try {
			await addKind30030ToMyKind10030(APP_30030_ATAG);
		} catch {
			//
		}
	}
</script>

<button
	onclick={() => (open = true)}
	class="flex items-center gap-1 rounded-full border border-current bg-transparent px-4 py-1.5 text-sm"
>
	<Settings size="20" />
</button>
<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-scrim/40 backdrop-blur-sm"
		/>
		<Dialog.Content
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-container-highest p-6 shadow-xl outline-none"
		>
			<!-- タイトル行 -->
			<div class="mb-4 flex items-center justify-between">
				<Dialog.Title class="text-lg font-semibold text-on-surface">設定</Dialog.Title>
				<Dialog.Close
					class="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
					aria-label="閉じる"
				>
					<X size={20} />
				</Dialog.Close>
			</div>
			<!-- 
			<Dialog.Description class="sr-only">
				グリッドをテキストとしてコピーするか、Nostrに投稿します
			</Dialog.Description> -->

			<!-- null絵文字設定 -->
			<div class="flex flex-col gap-4">
				<h3 class="text-sm font-semibold tracking-wide text-on-surface-variant uppercase">
					null絵文字設定
				</h3>

				<!-- 現在のnull絵文字 -->
				<div class="flex items-center gap-3 rounded-xl bg-surface-container p-3">
					{#if nullEmoji.value.type === 'custom' && nullEmoji.value.emoji}
						<img
							src={nullEmoji.value.emoji.url}
							alt={nullEmoji.value.emoji.shortcode}
							class="h-7 w-7 object-contain"
						/>
					{/if}
					<span class="text-sm text-on-surface-variant">
						:{getNullEmojiLabel()}:（null絵文字）
					</span>
				</div>

				<!-- 選択中の絵文字からセット -->
				<div class="flex flex-col gap-1.5">
					<p class="text-xs text-on-surface-variant">選択中の絵文字をnull絵文字に設定</p>
					{#if selectedEmoji.value}
						<div
							class="flex cursor-pointer items-center gap-2 rounded-lg bg-primary-container/50 px-3 py-2 text-sm text-on-primary-container transition-colors hover:bg-primary-container"
							onclick={() => handlePaletteSelect(selectedEmoji.value!)}
							role="button"
							tabindex="0"
							onkeydown={(e) => e.key === 'Enter' && handlePaletteSelect(selectedEmoji.value!)}
						>
							<img
								src={selectedEmoji.value.url}
								alt={selectedEmoji.value.shortcode}
								class="h-6 w-6 object-contain"
							/>
							<span>クリックしてnull絵文字に設定</span>
						</div>
					{:else}
						<p class="text-xs text-on-surface-variant/50 italic">絵文字が選択されていません</p>
					{/if}
				</div>

				<!-- 区切り -->
				<hr class="border-outline-variant" />

				<!-- 全角スペースオプション（NULL-04: 非推奨） -->
				<div class="flex flex-col gap-1">
					<button
						class="flex w-full items-center gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
						onclick={setFullwidthSpace}
					>
						<span class="text-base leading-none text-error">⚠</span>
						全角スペース
					</button>
					<p class="text-xs text-on-surface-variant/60">
						クライアント依存で幅がズレる可能性があります
					</p>
				</div>

				<!-- デフォルトに戻す -->
				<button
					class="w-full rounded-lg bg-surface-container px-4 py-2 text-sm text-on-surface transition-colors hover:bg-surface-container-high"
					onclick={resetToDefault}
				>
					デフォルトに戻す
				</button>

				<!-- デフォルトnull絵文字セットが未登録の場合のみ表示 -->
				{#if !hasDefaultNullSet.value}
					<button
						class="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
						onclick={handleAddDefaultToMyKind10030}
					>
						デフォルトnull絵文字セットを登録
					</button>
				{/if}
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
