<script lang="ts">
	import Grid from '$lib/components/features/Grid.svelte';
	import Palette from '$lib/components/features/Palette.svelte';
	import { isMobile } from '$lib/stores/user';

	import { ChevronDown, ChevronUp } from '@lucide/svelte';

	let paletteOpen = $state(false);
</script>

{#if isMobile.value}
	<!-- モバイルレイアウト -->
	<div class="flex flex-col overflow-hidden bg-background text-on-background">
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
	<div class="flex min-h-0 flex-1 flex-row overflow-hidden bg-background text-on-background">
		<div class="w-64 shrink-0 overflow-hidden border-r border-outline-variant">
			<Palette />
		</div>
		<div class="min-h-0 min-w-0 flex-1 overflow-auto p-2">
			<Grid />
		</div>
	</div>
{/if}
