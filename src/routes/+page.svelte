<script lang="ts">
	import Grid from '$lib/components/features/Grid.svelte';
	import Palette from '$lib/components/features/Palette.svelte';
	import { isMobile } from '$lib/stores/user';

	import { ChevronDown, Palette as PaletteIcon, User } from '@lucide/svelte';

	let paletteOpen = $state(false);
</script>

{#if isMobile.value}
	<!-- モバイルレイアウト -->
	<div
		class="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background text-on-background"
	>
		<!-- グリッドエリア -->
		<div class="min-h-0 flex-1 overflow-auto pb-12">
			<Grid />
		</div>

		<!-- フッター -->
		<div
			class="absolute right-0 bottom-0 left-0 flex h-12 items-center justify-around border-t border-outline-variant bg-surface-container-low px-6 transition-transform duration-300 ease-in-out"
			class:translate-y-full={paletteOpen}
		>
			<button
				class="flex flex-col items-center gap-0.5 text-on-surface-variant"
				onclick={() => (paletteOpen = true)}
				aria-label="パレットを開く"
			>
				<PaletteIcon size={20} />
				<span class="text-[10px]">palette</span>
			</button>
			{#await import('@konemono/nostr-login') then nostrLogin}
				<button
					class="flex flex-col items-center gap-0.5 text-on-surface-variant"
					aria-label="ユーザーメニュー"
					onclick={() => {
						nostrLogin.launch();
					}}
				>
					<User size={20} />
					<span class="text-[10px]">アカウント</span>
				</button>
			{/await}
		</div>

		<!-- パレット（ボトムシート） -->
		<div
			class="absolute right-0 bottom-0 left-0 flex flex-col bg-surface-container-low shadow-[0_-2px_8px_rgba(0,0,0,0.12)] transition-transform duration-300 ease-in-out"
			style="height: 60dvh"
			class:translate-y-full={!paletteOpen}
		>
			<button
				class="flex w-full items-center justify-center py-1.5 text-on-surface-variant transition-colors hover:bg-surface-container"
				onclick={() => (paletteOpen = false)}
				aria-label="パレットを閉じる"
			>
				<ChevronDown size={20} />
			</button>
			<div class="flex-1 overflow-hidden">
				<Palette />
			</div>
		</div>
	</div>
{:else}
	<!-- PCレイアウト -->
	<div class="flex min-h-0 flex-1 flex-row overflow-hidden bg-background text-on-background">
		<div class="w-76 shrink-0 overflow-hidden border-r border-outline-variant">
			<Palette />
		</div>
		<div class="min-h-0 min-w-0 flex-1 overflow-auto p-2">
			<Grid />
		</div>
	</div>
{/if}
