<script lang="ts">
	import { Dialog } from 'bits-ui';
	import { X, Copy, Check, Send, ExternalLink } from '@lucide/svelte';

	import { loginUser } from '$lib/stores/user';
	import { generateContent, generateTags, getTrimmedSize } from '$lib/palette/output';
	import { grid, nullEmoji } from '$lib/stores/storages';
	import { publishEvent } from '$lib/nostr/rx-nostr';

	interface Props {
		open: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	let content = $derived(generateContent(grid.value, nullEmoji.value));
	let tags = $derived(generateTags(grid.value, nullEmoji.value));

	let copied = $state(false);
	let published = $state(false);

	async function copyToClipboard() {
		try {
			await navigator.clipboard.writeText(content);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			console.log('failed to copy');
		}
	}

	/** kind 1で投稿する（OUT-09） */
	async function postKind1(): Promise<void> {
		const trimmedSize = getTrimmedSize(grid.value);
		if (trimmedSize.cols === 0 || trimmedSize.rows === 0) {
			// postStatus = "エラー: グリッドが空です";
			// setTimeout(() => {
			// postStatus = "";
			//    }, 3000);
			return;
		}

		// postStatus = "投稿中...";

		try {
			if (typeof window === 'undefined' || !(window as { nostr?: unknown }).nostr) {
				//  postStatus = "エラー: nostr拡張がインストールされていません";
				//   setTimeout(() => {
				//     postStatus = "";
				//  }, 5000);
				return;
			}

			const event = {
				kind: 1,
				tags,
				content
			};
			console.log(event);

			await publishEvent(event);
			/*   if (result) {
        postStatus = "投稿完了（署名済み）";
      } else {
        postStatus = "投稿失敗";
      } */
		} catch (e: unknown) {
			console.log(e);
			/*   postStatus = `エラー: ${e instanceof Error ? e.message : "不明なエラー"}`;
    } finally {
      setTimeout(() => {
        postStatus = "";
      }, 5000); */
		}
		published = true;
		setTimeout(() => {
			open = false;
			published = false;
		}, 2000);
	}

	let nostrShare = $state();
</script>

<nostr-share
	bind:this={nostrShare}
	data-text={content}
	data-tags={JSON.stringify(tags)}
	data-type="default"
/>
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
				<Dialog.Title class="text-lg font-semibold text-on-surface">出力・シェア</Dialog.Title>
				<Dialog.Close
					class="rounded-full p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-high"
					aria-label="閉じる"
				>
					<X size={20} />
				</Dialog.Close>
			</div>

			<Dialog.Description class="sr-only">
				グリッドをテキストとしてコピーするか、Nostrに投稿します
			</Dialog.Description>

			<!-- プレビュー -->
			<!--<div class="mb-4">
				<p class="mb-1.5 text-xs font-medium text-on-surface-variant">プレビュー</p>
				<pre
					class="overflow-auto rounded-xl bg-surface-container p-3 text-sm leading-relaxed text-on-surface"
					style="max-height: 12rem; white-space: pre-wrap; word-break: break-all;">{text}</pre>
			</div>-->

			<!-- アクションボタン群 -->
			<div class="flex flex-col gap-2">
				<!-- クリップボードにコピー -->
				<button
					class="flex items-center gap-2 rounded-xl
                     px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
					onclick={copyToClipboard}
				>
					{#if copied}
						<Check size={18} />
						コピーしました
					{:else}
						<Copy size={18} />
						クリップボードにコピー
					{/if}
				</button>

				<!-- kind1 として投稿（ログイン必須） -->
				<button
					class="flex items-center gap-2 rounded-xl
                     px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-40"
					disabled={!loginUser.value}
					title={loginUser.value ? undefined : 'ログインが必要です'}
					onclick={() => postKind1()}
					>{#if published}
						<Check size={18} />
						投稿しました
					{:else}
						<Send size={18} /> kind1 として投稿{/if}
					{#if !loginUser.value}
						<span class="ml-auto text-xs text-on-surface-variant">要ログイン</span>
					{/if}
				</button>

				<button
					class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
					onclick={() => {
						open = false;
				<button
					class="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-high"
					onclick={() => {
						const btn = nostrShare?.shadowRoot?.querySelector('button');
						if (!btn) return;
						open = false;
						btn.click();
					}}
				>
					}}
				>
					<ExternalLink size={18} />nostr-share
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

<style>
	nostr-share::part(button) {
		display: none;
	}
</style>
