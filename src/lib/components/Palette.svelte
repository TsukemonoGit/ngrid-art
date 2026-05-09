<script lang="ts">
	import { selectedEmoji } from '$lib/stores/palette';
	import { palette } from '$lib/stores/storages';

	let tabContainer = $state<HTMLDivElement | null>(null);
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

	function scrollToSection(sectionLabel: string): void {
		if (!tabContainer) return;
		const emojiList = tabContainer.querySelector('.emoji-list');
		if (!emojiList) return;
		const el = emojiList.querySelector(`[data-section="${sectionLabel}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function truncateLabel(label: string): string {
		if (label.length <= 20) return label;
		return label.slice(0, 15) + '...' + label.slice(-4);
	}

	$effect(() => {
		if (!tabContainer) return;

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeSection = entry.target.getAttribute('data-section') ?? '';
					}
				}
			},
			{ root: tabContainer, threshold: 0.3 }
		);

		const elements = tabContainer.querySelectorAll('.section');
		for (const el of elements) {
			observer.observe(el);
		}

		return () => observer.disconnect();
	});
</script>

<div class="palette-container" bind:this={tabContainer}>
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
		<h3 class="palette-title">パレット</h3>

		<input
			class="search-input"
			type="search"
			placeholder="shortcodeで検索..."
			bind:value={searchQuery}
		/>

		{#if palette.value.length > 0 && searchQuery.trim() === ''}
			<div class="tab-nav">
				{#each palette.value as { ref, label } (ref)}
					<button
						class={'tab-btn' + (activeSection === ref ? ' active' : '')}
						onclick={() => scrollToSection(ref)}
						data-section={ref}
						title={label}
					>
						{truncateLabel(label)}
					</button>
				{/each}
			</div>
		{/if}

		{#if filteredSections.length > 0}
			<div class="emoji-list">
				{#each filteredSections as section, index (index)}
					<div class="section" data-section={section.label}>
						{#if section.emojis.length > 0}
							<h4 class="section-title">{section.label}</h4>
							<div class="emoji-grid">
								{#each section.emojis as emoji, index (index)}
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
			</div>
			<!-- {:else if filteredAll.length > 0}
			<div class="emoji-list">
				<div class="emoji-grid">
					{#each filteredAll as emoji}
						<button
							class={'emoji-item' + (isSelected(emoji) ? ' selected' : '')}
							onclick={() => toggleEmoji(emoji)}
							aria-label={`絵文字 ${emoji.shortcode} を選択`}
						>
							<img src={emoji.url} alt={emoji.shortcode} loading="lazy" />
						</button>
					{/each}
				</div>
			</div> -->
		{:else if searchQuery.trim() !== ''}
			<div class="no-results">
				「{searchQuery}」に一致する絵文字はありません
			</div>
		{/if}
	{/if}
</div>
