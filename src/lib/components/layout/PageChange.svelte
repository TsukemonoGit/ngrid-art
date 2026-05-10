<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const isHome = $derived(page.url.pathname === '/');
</script>

<a
	// eslint-disable-next-line svelte/no-navigation-without-resolve
	href={isHome ? resolve('/emoji-sets') : '/'}
	class="rounded-full border border-current bg-transparent px-4 py-1.5 text-sm"
>
	{isHome ? 'Emoji Sets →' : '← Home'}
</a>
