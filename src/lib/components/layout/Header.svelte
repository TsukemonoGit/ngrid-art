<script>
	import PageChange from './PageChange.svelte';
</script>

<!-- ヘッダー -->
<header
	class="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-2"
>
	<h1 class="text-lg font-bold text-on-surface">Nostr Grid Art</h1>
	<div class="flex gap-2">
		<PageChange /><!--<Settings /><LoginUserIcon />ログイン、設定ぼたん-->
	</div>
</header>
