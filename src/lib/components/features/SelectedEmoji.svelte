<script lang="ts">
	import { truncateLabel } from '$lib/palette/utils';
	import { selectedEmoji } from '$lib/stores/palette';
</script>

<div class=" min-h-18 min-w-18">
	{#if selectedEmoji.value}
		<div class="flex flex-col rounded-md border border-primary">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex cursor-pointer flex-col items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-surface-container"
				onclick={() => (selectedEmoji.value = null)}
				title="タップで選択解除"
			>
				<img
					src={selectedEmoji.value.url}
					alt={selectedEmoji.value.shortcode}
					class="h-8 w-10 object-contain"
				/>
				<span class="text-xs text-on-surface-variant"
					>:{truncateLabel(selectedEmoji.value.shortcode, 12)}:</span
				>
			</div>
			<!-- 
		<button
			class="rounded-md border border-outline-variant px-3 py-1 text-sm text-on-surface-variant transition-colors hover:bg-error-container hover:text-on-error-container"
			onclick={() => (selectedEmoji.value = null)}
		>
			選択解除
		</button> -->
		</div>{/if}
</div>
