<script>
	import PageChange from './PageChange.svelte';
	import Settings from './Settings.svelte';
</script>

<!-- ヘッダー -->
<header
	class="flex h-12 shrink-0 items-center border-b border-outline-variant bg-surface-container-low px-4 py-2"
>
	<h1 class="flex-1 text-lg font-bold text-on-surface">Nostr Grid Art</h1>
	<PageChange />
	<div class="flex flex-1 justify-end">
		<Settings />
	</div>
</header>
