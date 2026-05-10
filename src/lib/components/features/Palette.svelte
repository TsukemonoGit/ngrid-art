<script lang="ts">
	import { truncateLabel } from '$lib/utils/utils';
	import { selectedEmoji } from '$lib/stores/palette';
	import { palette } from '$lib/stores/storages';
	import { ToggleGroup } from 'bits-ui';

	let emojiList = $state<HTMLDivElement | null>(null);
	let searchQuery = $state('');
	let activeSection = $state('');

	let filteredSections = $derived(
		searchQuery.trim() === ''
			? palette.value
			: palette.value
					.map((s) => ({
						...s,
						emojis: s.emojis.filter((e) =>
							e.shortcode.toLowerCase().includes(searchQuery.toLowerCase())
						)
					}))
					.filter((s) => s.emojis.length > 0)
	);

	function scrollToSection(sectionRef: string): void {
		if (!emojiList) return;
		const el = emojiList.querySelector(`[data-section="${sectionRef}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	$effect(() => {
		if (!emojiList) return;
		// palette.valueを依存に含めて非同期ロード後も再実行
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _dep = palette.value;

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const intersecting = new Set<string>();

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					const ref = entry.target.getAttribute('data-section') ?? '';
					if (entry.isIntersecting) {
						intersecting.add(ref);
					} else {
						intersecting.delete(ref);
					}
				}
				// 表示中のうちDOM上で一番上にあるセクションをアクティブに
				if (intersecting.size > 0) {
					const elements = emojiList!.querySelectorAll('.section');
					for (const el of elements) {
						const ref = el.getAttribute('data-section') ?? '';
						if (intersecting.has(ref)) {
							activeSection = ref;
							break;
						}
					}
				}
			},
			{ root: emojiList, threshold: 0.1 }
		);

		const elements = emojiList.querySelectorAll('.section');
		for (const el of elements) {
			observer.observe(el);
		}
	});
</script>

<div class="palette-container">
	{#if !palette.value}
		<!-- スケルトンローディング -->
		<div class="skeleton-title shimmer"></div>
		<div class="skeleton-search shimmer"></div>
		<div class="skeleton-tabs">
			{#each [80, 60, 100, 70] as w (w)}
				<div class="skeleton-tab shimmer" style="width: {w}px"></div>
			{/each}
		</div>
		<div class="skeleton-grid">
			{#each Array(20) as _ (_)}
				<div class="skeleton-emoji shimmer"></div>
			{/each}
		</div>
	{:else}
		<!-- ① ヘッダーエリア：タイトル＋検索 -->
		<div class="header-area">
			<h3 class="palette-title">パレット</h3>
			<input
				class="search-input"
				type="search"
				placeholder="shortcodeで検索..."
				bind:value={searchQuery}
			/>
		</div>

		<!-- ② タブエリア：高さ制限あり・スクロール可 -->
		{#if palette.value.length > 0 && searchQuery.trim() === ''}
			<div class="tab-area">
				<ToggleGroup.Root
					type="single"
					class="flex flex-wrap gap-1"
					value={activeSection}
					onValueChange={(v) => {
						if (v) scrollToSection(v);
					}}
				>
					{#each palette.value as { ref, label } (ref)}
						<ToggleGroup.Item
							class="cursor-pointer rounded-full border border-outline-variant bg-transparent px-3 py-1 text-xs text-on-surface-variant transition-colors hover:bg-surface-container-highest hover:text-on-surface data-[state=on]:border-transparent data-[state=on]:bg-secondary-container data-[state=on]:text-on-secondary-container"
							value={ref}
							title={label}
						>
							{truncateLabel(label)}
						</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>
		{/if}

		<!-- ③ 絵文字エリア：ここだけスクロール -->

		<div class="emoji-list" bind:this={emojiList}>
			{#if filteredSections.length > 0}
				{#each filteredSections as section (section.ref)}
					<div class="section" data-section={section.ref}>
						{#if section.emojis.length > 0}
							<h4 class="section-title">{section.label}</h4>
							<div class="emoji-grid">
								{#each section.emojis as emoji (emoji.shortcode)}
									<button
										title={emoji.shortcode}
										class={'emoji-item' +
											(selectedEmoji.value && selectedEmoji.value.shortcode === emoji.shortcode
												? ' selected'
												: '')}
										onclick={() => (selectedEmoji.value = emoji)}
										aria-label={`絵文字 ${emoji.shortcode} を選択`}
									>
										<img src={emoji.url} alt={emoji.shortcode} loading="lazy" />
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			{:else if searchQuery.trim() !== ''}
				<div class="no-results">
					「{searchQuery}」に一致する絵文字はありません
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="postcss">
	.palette-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;

		height: 100%;
		max-height: 100%;

		min-height: 0;
		overflow: hidden;
		padding: 0.5rem;
		background-color: var(--color-surface-container);
		color: var(--color-on-surface);
	}
	.header-area {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex-shrink: 0;
	}
	.tab-area {
		flex-shrink: 0;
		max-height: 8rem; /* タブが多くても最大8rem */
		overflow-y: auto;
		padding-right: 0.25rem;
	}

	/* スケルトン */
	.shimmer {
		border-radius: 8px;
		background: linear-gradient(
			90deg,
			var(--color-surface-container-high) 25%,
			var(--color-surface-container-highest) 50%,
			var(--color-surface-container-high) 75%
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}
	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
	.skeleton-title {
		height: 1.5rem;
		width: 6rem;
		border-radius: 4px;
	}
	.skeleton-search {
		height: 2.5rem;
		border-radius: 8px;
	}
	.skeleton-tabs {
		display: flex;
		gap: 0.5rem;
	}
	.skeleton-tab {
		height: 2rem;
		border-radius: 9999px;
	}
	.skeleton-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(2.5rem, 1fr));
		gap: 0.25rem;
	}
	.skeleton-emoji {
		aspect-ratio: 1;
		border-radius: 6px;
	}

	/* メイン */
	.palette-title {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-on-surface-variant);
		margin: 0;
	}
	.search-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 8px;
		border: 1px solid var(--color-outline-variant);
		background-color: var(--color-surface-container-high);
		color: var(--color-on-surface);
		font-size: 0.875rem;
		outline: none;

		&:focus {
			border-color: var(--color-primary);
		}
	}
	.emoji-list {
		flex: 1;
		min-height: 0; /* flex子要素がoverflowできるように */
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.section {
	}
	.section-title {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-on-surface-variant);
		margin: 0 0 0.25rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid var(--color-outline-variant);
	}
	.emoji-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(2.5rem, 1fr));
		gap: 0.25rem;
	}
	.emoji-item {
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		border-radius: 6px;
		border: none;
		background-color: transparent;
		cursor: pointer;
		padding: 0.25rem;
		transition: background-color 0.1s;

		& img {
			width: 100%;
			height: 100%;
			object-fit: contain;
		}

		&:hover {
			background-color: var(--color-surface-container-highest);
		}

		&.selected {
			background-color: var(--color-primary-container);
			outline: 2px solid var(--color-primary);
		}
	}
	.no-results {
		text-align: center;
		padding: 2rem;
		color: var(--color-on-surface-variant);
		font-size: 0.875rem;
	}
</style>
