import { NULL_EMOJI_SHORTCODE } from '$lib/constracts/palette';
import type { Grid, NullEmojiConfig } from '$lib/types';

/**
 * 左端・右端のnull（null絵文字以外を含む）トリム
 */
export function trimGridSimple(grid: Grid): Grid {
	if (grid.length === 0) return grid;

	// null判定: nullまたはnull絵文字
	function isNullCell(cell: import('$lib/types').Cell | undefined): boolean {
		if (!cell) return true;
		if (cell[0] !== 'emoji') return false;
		return cell[1] === NULL_EMOJI_SHORTCODE;
	}

	// 上端をトリム
	let startRow = 0;
	while (startRow < grid.length && grid[startRow].every(isNullCell)) {
		startRow++;
	}

	// 下端をトリム
	let endRow = grid.length - 1;
	while (endRow >= startRow && grid[endRow].every(isNullCell)) {
		endRow--;
	}

	if (startRow > endRow) return [];

	// 列数の取得
	const colCount = grid[0]?.length ?? 0;

	// 左端をトリム
	let startCol = 0;
	while (startCol < colCount && grid.every((row) => isNullCell(row[startCol]))) {
		startCol++;
	}

	// 右端をトリム
	let endCol = colCount - 1;
	while (endCol >= startCol && grid.every((row) => isNullCell(row[endCol]))) {
		endCol--;
	}

	if (startCol > endCol) {
		return grid.slice(startRow, endRow + 1).map(() => []);
	}

	return grid.slice(startRow, endRow + 1).map((row) => row.slice(startCol, endCol + 1));
}

/**
 * content生成（OUT-04, OUT-05, OUT-06, OUT-07）
 */
export function generateContent(grid: Grid, nullConfig: NullEmojiConfig): string {
	const trimmed = trimGridSimple(grid);

	if (trimmed.length === 0) return '';

	return trimmed
		.map((row) =>
			row
				.map((cell) => {
					if (!cell) {
						// nullセルの処理
						if (nullConfig.type === 'fullwidth_space') {
							return '\u3000'; // 全角スペース
						}
						// customの場合: shortcodeを出力
						return `:${nullConfig.emoji?.shortcode ?? NULL_EMOJI_SHORTCODE}:`;
					}
					// 絵文字セル: shortcodeを出力
					return `:${cell[1]}:`;
				})
				.join('')
		)
		.join('\n');
}

/**
 * tags生成（OUT-10, OUT-11, OUT-12）
 * NIP-30準拠。使用済み絵文字+null絵文字を重複なく列挙
 */
export function generateTags(grid: Grid, nullConfig: NullEmojiConfig): string[][] {
	const trimmed = trimGridSimple(grid);
	const tagSet = new Map<string, string[]>();

	/** emojiタグを追加する */
	function addEmojiTag(cell: import('$lib/types').Cell): void {
		if (!cell || cell[0] !== 'emoji') return;

		const shortcode = cell[1];
		const url = cell[2];
		const identifier = cell[3];

		// 重複チェック: shortcode + url でユニーク
		const key = `${shortcode}:${url}`;
		if (!tagSet.has(key)) {
			const tag: string[] = ['emoji', shortcode, url];
			// 30030参照がある場合のみ4要素目に追加（OUT-11）
			if (identifier) {
				tag.push(identifier);
			}
			tagSet.set(key, tag);
		}
	}

	// グリッド内の絵文字を列挙
	for (const row of trimmed) {
		for (const cell of row) {
			addEmojiTag(cell);
		}
	}

	// null絵文字を追加（トリム後グリッドにnullセルが存在する場合のみ）
	if (nullConfig.type === 'custom' && nullConfig.emoji) {
		const hasNullCell = trimmed.some((row) => row.some((cell) => !cell));
		if (hasNullCell) {
			const emoji = nullConfig.emoji;
			const key = `${emoji.shortcode}:${emoji.url}`;
			if (!tagSet.has(key)) {
				const tag: string[] = ['emoji', emoji.shortcode, emoji.url];
				if (emoji.ref) {
					tag.push(emoji.ref);
				}
				tagSet.set(key, tag);
			}
		}
	}
	return Array.from(tagSet.values());
}

/**
 * トリム後サイズ計算（OUT-03）
 */
export function getTrimmedSize(grid: Grid): { cols: number; rows: number } {
	const trimmed = trimGridSimple(grid);
	return {
		cols: trimmed[0]?.length ?? 0,
		rows: trimmed.length
	};
}
