<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Grip, PenTool, BookMarked } from '@lucide/svelte';
	import { isMobile } from '$lib/stores/user';

	const navItems = [
		{ href: '/', label: 'Home', Icon: PenTool },
		{ href: '/emoji-sets', label: 'Emoji Sets', Icon: Grip },
		{ href: '/my-sets', label: 'My Sets', Icon: BookMarked }
	] as const;

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname === href || page.url.pathname.startsWith(href + '/');
	}
</script>

<nav class="flex gap-1">
	{#each navItems as { href, label, Icon } (href)}
		{@const active = isActive(href)}
		<a
			title={active ? '' : `goto ${label}`}
			href={resolve(href)}
			class="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors {active
				? 'bg-primary text-on-primary'
				: 'border border-current bg-transparent'}"
		>
			<Icon size="20" />
			{#if !isMobile.value}
				<span>{label}</span>
			{/if}
		</a>
	{/each}
</nav>
