<script lang="ts">
	import Grid from '$lib/components/features/Grid.svelte';
	import Palette from '$lib/components/features/Palette.svelte';
	import { selectedEmoji } from '$lib/stores/palette';
	import { isMobile } from '$lib/stores/user';

	import { ChevronDown, ChevronUp } from '@lucide/svelte';

	let paletteOpen = $state(false);
</script>

{#if isMobile.value}
	<!-- モバイルレイアウト -->
	<div class="flex h-dvh flex-col overflow-hidden bg-background text-on-background">
		<!-- 選択中絵文字バー -->
		<div class="flex h-10 shrink-0 items-center border-b border-outline-variant px-3">
			{#if selectedEmoji.value}
				<div class="flex w-full flex-row-reverse items-center gap-2">
					<button
						class="flex h-8 w-8 items-center justify-center rounded border border-outline-variant p-0.5 transition-colors hover:bg-surface-container-high"
						onclick={() => (selectedEmoji.value = null)}
						title="選択解除"
					>
						<img
							src={selectedEmoji.value.url}
							alt={selectedEmoji.value.shortcode}
							class="h-full w-full object-contain"
						/>
					</button>
					<span class="text-xs text-on-surface-variant">:{selectedEmoji.value.shortcode}:</span>
				</div>
			{/if}
		</div>

		<!-- グリッドエリア -->
		<div class="min-h-0 flex-1 overflow-auto">
			<Grid />
		</div>

		<!-- ボトムシート（パレット） -->
		<div
			class="shrink-0 overflow-hidden bg-surface-container-low shadow-[0_-2px_8px_rgba(0,0,0,0.12)] transition-[height] duration-300 ease-in-out"
			style="height: {paletteOpen ? '60dvh' : '2.5rem'}"
		>
			<button
				class="flex w-full items-center justify-center py-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
				onclick={() => (paletteOpen = !paletteOpen)}
				aria-label={paletteOpen ? 'パレットを閉じる' : 'パレットを開く'}
			>
				{#if paletteOpen}
					<ChevronDown size={20} />
				{:else}
					<ChevronUp size={20} />
				{/if}
			</button>
			<div class="h-[calc(100%-2.5rem)] overflow-hidden">
				<Palette />
			</div>
		</div>
	</div>
{:else}
	<!-- PCレイアウト -->
	<div class="flex h-dvh flex-col overflow-hidden bg-background text-on-background">
		<!-- ヘッダー -->
		<header
			class="flex shrink-0 items-center gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-2"
		>
			<h1 class="text-lg font-bold text-on-surface">Nostr Grid Art</h1>
			{#if selectedEmoji.value}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-surface-container"
					onclick={() => (selectedEmoji.value = null)}
					title="タップで選択解除"
				>
					<img
						src={selectedEmoji.value.url}
						alt={selectedEmoji.value.shortcode}
						class="h-8 w-8 object-contain"
					/>
					<span class="text-sm text-on-surface-variant">:{selectedEmoji.value.shortcode}:</span>
				</div>

				<button
					class="rounded-md border border-outline-variant px-3 py-1 text-sm text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
					onclick={() => (selectedEmoji.value = null)}
				>
					選択解除
				</button>
			{/if}
		</header>

		<!-- メインコンテンツ：パレット＋グリッド -->
		<div class="flex min-h-0 flex-1 flex-row overflow-hidden">
			<!-- パレットカラム -->
			<div class="w-64 shrink-0 overflow-hidden border-r border-outline-variant">
				<Palette />
			</div>

			<!-- グリッドカラム -->
			<div class="min-h-0 min-w-0 flex-1 overflow-auto p-2">
				<Grid />
			</div>
		</div>
	</div>
{/if}
