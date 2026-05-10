<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Grip, PenTool } from '@lucide/svelte';

	const isHome = $derived(page.url.pathname === '/');
</script>

{#if isHome}
	<a
		href={resolve('/emoji-sets')}
		class="flex items-center gap-1 rounded-full border border-current bg-transparent px-4 py-1.5 text-sm"
	>
		<Grip size="20" />Emoji Sets
	</a>
{:else}
	<a
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		href="/"
		class="flex items-center gap-1 rounded-full border border-current bg-transparent px-4 py-1.5 text-sm"
	>
		<PenTool size="20" />Home
	</a>
{/if}
