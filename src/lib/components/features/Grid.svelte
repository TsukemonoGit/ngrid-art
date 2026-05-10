<script lang="ts">
	import {
		setCell,
		addRowBottom,
		addRowTop,
		addColRight,
		addColLeft,
		removeRow,
		removeCol,
		rowHasEmoji,
		colHasEmoji,
		clearAll,
		undo,
		redo,
		canUndo,
		canRedo,
		getShowClearConfirm
	} from '$lib/palette/grid';
	import { selectedEmoji } from '$lib/stores/palette';
	import type { EmojiTag, PaletteEmoji } from '$lib/types';
	import { GRID_MAX_SIZE } from '$lib/constracts/palette';
	import { Minus, Plus, Trash2, Undo, Redo } from '@lucide/svelte';
	import { grid } from '$lib/stores/storages';
	import { isMobile } from '$lib/stores/user';

	// Svelte storesから値を購読
	let contextMenu = $state<{
		row: number;
		col: number;
		x: number;
		y: number;
		shortcode: string | null;
	} | null>(null);
	let scrollContainer: HTMLDivElement | null = null;
	const cols = $derived(grid.value[0]?.length ?? 0);

	/** セルクリック時の処理（要件GRID-04〜GRID-08） */
	function handleCellClick(row: number, col: number, e: MouseEvent): void {
		const cell = grid.value[row]?.[col] ?? null;

		// 絵文字選択中の場合
		if (selectedEmoji.value) {
			// 絵文字選択中: 空セル → 配置
			if (!cell) {
				const tag: EmojiTag = [
					'emoji',
					selectedEmoji.value.shortcode,
					selectedEmoji.value.url,
					selectedEmoji.value.ref
				];
				setCell(row, col, tag);
			}
			// 絵文字選択中: 同じ絵文字 → コンテキストメニュー表示
			else if (cell[1] === selectedEmoji.value.shortcode) {
				contextMenu = {
					row,
					col,
					x: e.clientX,
					y: e.clientY,
					shortcode: cell[1]
				};
			}
			// 絵文字選択中: 別の絵文字 → 上書き
			else {
				const tag: EmojiTag = [
					'emoji',
					selectedEmoji.value.shortcode,
					selectedEmoji.value.url,
					selectedEmoji.value.ref
				];
				setCell(row, col, tag);
			}
		} else {
			// 選択解除中: 配置済みセル → コンテキストメニュー表示
			if (cell) {
				contextMenu = {
					row,
					col,
					x: e.clientX,
					y: e.clientY,
					shortcode: cell[1]
				};
			}
			// 選択解除中: 空セル → 何もしない
		}
	}

	/** グリッド背景クリックでコンテキストメニューを閉じる */
	function handleBackgroundClick(): void {
		contextMenu = null;
	}

	/** コンテキストメニューを閉じる */
	function closeContextMenu(): void {
		contextMenu = null;
	}

	/** セルを削除する（CTX-01） */
	function deleteCell(row: number, col: number): void {
		setCell(row, col, null);
		closeContextMenu();
	}

	/** セルの絵文字を選択として使用（CTX-02: その絵文字を選択中に設定） */
	function useAsSelected(row: number, col: number): void {
		const cell = grid.value[row]?.[col];
		if (!cell || cell[0] !== 'emoji') return;

		const paletteEmoji: PaletteEmoji = {
			shortcode: cell[1],
			url: cell[2],
			ref: cell[3],
			originalShortcode: cell[1]
		};

		selectedEmoji.value = paletteEmoji;
		closeContextMenu();
	}

	/** 行削除処理（RSZ-06, RSZ-07） */
	function handleDeleteRow(row: number): void {
		if (rowHasEmoji(grid.value, row)) {
			// 配置済み絵文字がある場合は確認ダイアログ
			if (confirm('この行には絵文字が配置されています。削除してもよろしいですか？')) {
				removeRow(row);
			}
		} else {
			removeRow(row);
		}
	}

	/** 列削除処理 */
	function handleDeleteCol(col: number): void {
		if (colHasEmoji(grid.value, col)) {
			if (confirm('この列には絵文字が配置されています。削除してもよろしいですか？')) {
				removeCol(col);
			}
		} else {
			removeCol(col);
		}
	}

	/** RSZ-02: 下端に行を追加 */
	function handleAddRowBottom(): void {
		addRowBottom();
	}

	/** RSZ-03: 右端に列を追加 */
	function handleAddColRight(): void {
		addColRight();
	}

	/** RSZ-04: 上端に行を挿入 */
	function handleAddRowTop(): void {
		addRowTop();
	}

	/** RSZ-05: 左端に列を挿入 */
	function handleAddColLeft(): void {
		addColLeft();
	}

	/** WASDスクロール（SCR-01） */
	function handleKeydown(e: KeyboardEvent): void {
		if (!scrollContainer) return;
		const amount = 20;
		switch (e.key.toLowerCase()) {
			case 'w':
				scrollContainer.scrollTop -= amount;
				break;
			case 's':
				scrollContainer.scrollTop += amount;
				break;
			case 'a':
				scrollContainer.scrollLeft -= amount;
				break;
			case 'd':
				scrollContainer.scrollLeft += amount;
				break;
		}
	}

	/** SCR-03: スマホ向けキーボードボタン */
	function focusKeyboardInput(): void {
		const input = document.getElementById('keyboard-input');
		input?.focus();
	}

	/** 全消し処理 */
	function handleClearAll(): void {
		const shouldConfirm = getShowClearConfirm();
		if (shouldConfirm && !confirm('グリッドを全消しします。よろしいですか？')) {
			return;
		}
		clearAll();
	}

	/** 元に戻す */
	function handleUndo(): void {
		undo();
	}

	/** やり直す */
	function handleRedo(): void {
		redo();
	}
</script>

<div
	class="relative flex flex-col gap-2 p-2 outline-none"
	role="grid"
	onclick={handleBackgroundClick}
	tabindex="0"
	onkeydown={handleKeydown}
	aria-label="絵文字グリッド"
>
	<!-- グリッドエリア（上下左右に＋/−ボタン付き） -->
	<div class="flex flex-col">
		<!-- 上端：上に行を追加/削除ボタン -->
		<div class="flex flex-row items-center justify-center gap-1 py-1">
			<button
				class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-30"
				onclick={() => handleDeleteRow(0)}
				disabled={grid.value.length <= 1}
				aria-label="上端の行を削除"
			>
				<Minus />
			</button>
			<button
				class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-30"
				onclick={handleAddRowTop}
				disabled={grid.value.length >= GRID_MAX_SIZE}
				aria-label="上に行を挿入"
			>
				<Plus />
			</button>
		</div>

		<!-- 中央エリア：左端＋グリッド -->
		<div class="flex min-h-0 flex-row">
			<!-- 左端：左に列を挿入/追加ボタン -->
			<div class="flex flex-col items-center justify-center gap-1 px-1">
				<button
					class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-30"
					onclick={() => handleDeleteCol(0)}
					disabled={grid.value[0]?.length <= 1}
					aria-label="左端の列を削除"
				>
					<Minus />
				</button>
				<button
					class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-30"
					onclick={handleAddColLeft}
					disabled={grid.value[0]?.length >= GRID_MAX_SIZE}
					aria-label="左に列を挿入"
				>
					<Plus />
				</button>
			</div>

			<!-- グリッド本体 -->
			<div class="min-h-0 min-w-0 flex-1 overflow-auto">
				<div class="grid" style="grid-template-columns: repeat({cols}, 48px);">
					{#each grid.value as row, rowIndex (rowIndex)}
						{#each row as cell, colIndex (colIndex)}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<div
								tabindex="0"
								class="flex h-12 w-12 cursor-pointer items-center justify-center overflow-hidden border border-neutral-200 bg-neutral-50 hover:bg-cyan-50"
								role="gridcell"
								aria-label={cell ? `絵文字 ${cell[1]}` : '空セル'}
								onclick={(e) => {
									e.stopPropagation();
									handleCellClick(rowIndex, colIndex, e);
								}}
							>
								{#if cell}
									<img
										src={cell[2]}
										alt={cell[1]}
										class="h-full w-full object-contain"
										loading="lazy"
									/>
								{/if}
							</div>
						{/each}
					{/each}
				</div>
			</div>

			<!-- 右端：右に列を追加/削除ボタン -->
			<div class="flex flex-col items-center justify-center gap-1 px-1">
				<button
					class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-30"
					onclick={() => {
						const cols = grid.value[0]?.length ?? 0;
						handleDeleteCol(cols - 1);
					}}
					disabled={grid.value[0]?.length <= 1}
					aria-label="右端の列を削除"
				>
					<Minus />
				</button>
				<button
					class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-30"
					onclick={handleAddColRight}
					disabled={grid.value[0]?.length >= GRID_MAX_SIZE}
					aria-label="右に列を追加"
				>
					<Plus />
				</button>
			</div>
		</div>
	</div>
	<!-- 下端：下に行を追加/削除ボタン -->
	<div class="flex flex-row items-center justify-center gap-1 py-1">
		<button
			class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-30"
			onclick={() => {
				const rows = grid.value.length;
				handleDeleteRow(rows - 1);
			}}
			disabled={grid.value.length <= 1}
			aria-label="下端の行を削除"
		>
			<Minus />
		</button>
		<button
			class="flex items-center justify-center rounded-full bg-surface-container p-1 text-on-surface-variant transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-30"
			onclick={handleAddRowBottom}
			disabled={grid.value.length >= GRID_MAX_SIZE}
			aria-label="下に行を追加"
		>
			<Plus />
		</button>
	</div>

	<!-- ツールバー -->
	<div class="mt-2 flex flex-row items-center gap-2">
		<button
			class="flex items-center justify-center rounded-lg bg-surface-container p-2 text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
			onclick={handleUndo}
			disabled={canUndo.value ? undefined : true}
			aria-label="元に戻す"
			title="元に戻す"
		>
			<Undo />
		</button>
		<button
			class="flex items-center justify-center rounded-lg bg-surface-container p-2 text-on-surface transition-colors hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-30"
			onclick={handleRedo}
			disabled={canRedo.value ? undefined : true}
			aria-label="やり直す"
			title="やり直す"
		>
			<Redo />
		</button>
		<button
			class="flex items-center justify-center rounded-lg bg-error-container p-2 text-on-error-container transition-colors hover:bg-error/20 disabled:cursor-not-allowed disabled:opacity-30"
			onclick={handleClearAll}
			aria-label="全消し"
			title="全消し"
		>
			<Trash2 />
		</button>
	</div>

	{#if contextMenu}
		{@const cm = contextMenu}
		<div
			class="fixed z-50 min-w-32 rounded-lg border border-outline-variant bg-surface-container-highest py-1 shadow-lg"
			style="left: {cm.x}px; top: {cm.y}px"
			role="menu"
			aria-label="コンテキストメニュー"
		>
			<button
				class="block w-full px-4 py-2 text-left text-sm text-error transition-colors hover:bg-surface-container-high"
				role="menuitem"
				onclick={() => deleteCell(cm.row, cm.col)}
			>
				削除
			</button>
			{#if selectedEmoji.value && cm.shortcode === selectedEmoji.value.shortcode}
				<button
					class="block w-full px-4 py-2 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-high"
					role="menuitem"
					onclick={() => {
						selectedEmoji.value = null;
						closeContextMenu();
					}}
				>
					選択解除
				</button>
			{:else}
				<button
					class="block w-full px-4 py-2 text-left text-sm text-on-surface transition-colors hover:bg-surface-container-high"
					role="menuitem"
					onclick={() => useAsSelected(cm.row, cm.col)}
				>
					選択
				</button>
			{/if}
		</div>
	{/if}
</div>

<!-- SCR-03: スマホ向けキーボード入力用非表示フィールド -->
<input
	id="keyboard-input"
	type="text"
	style="position: absolute; left: -9999px;"
	aria-hidden="true"
/>

{#if isMobile.value}
	<button
		class="fixed right-4 bottom-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-on-primary shadow-lg"
		onclick={focusKeyboardInput}
		aria-label="キーボードモード"
	>
		⌨
	</button>{/if}
