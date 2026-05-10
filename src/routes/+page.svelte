<script lang="ts">
	import Grid from '$lib/components/features/Grid.svelte';
	import Palette from '$lib/components/features/Palette.svelte';
	import { isMobile } from '$lib/stores/user';

	import { ChevronDown, ChevronUp } from '@lucide/svelte';

	let paletteOpen = $state(false);
</script>

{#if isMobile.value}
	<!-- モバイルレイアウト -->
	<div class="flex h-dvh flex-col overflow-hidden bg-background text-on-background">
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
			class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-2"
		>
			<h1 class="text-lg font-bold text-on-surface">Nostr Grid Art</h1>
			<div class="flex gap-2"><!--ログイン、設定ぼたん--></div>
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
