import {
	APP_30030_ATAG,
	APP_30030_DTAG,
	APP_30030_PUBKEY,
	GRID_INITIAL_SIZE,
	NULL_EMOJI_SHORTCODE,
	NULL_EMOJI_URL
} from '$lib/constracts/palette';

import { createGlobalState } from '$lib/stores/globalRunes.svelte';
import { hasDefaultNullSet } from '$lib/stores/palette';
import { grid, kind10030 } from '$lib/stores/storages';
import type { Cell, Grid, NullEmojiConfig, PaletteEmoji } from '$lib/types';

/** 空のGridを生成する */
export function createInitGrid(): Grid {
	return Array.from({ length: GRID_INITIAL_SIZE }, () => Array(GRID_INITIAL_SIZE).fill(null));
}

/** 全消しボタンの確認ダイアログ表示有無（デフォルトON） */
let showClearConfirm = true;

/** 元に戻す最大履歴数 */
const MAX_UNDO = 10;

/** 操作履歴（undoスタック） */
let undoStack: Grid[] = [];

/** やり直しスタック（undo後に空になる） */
let redoStack: Grid[] = [];

/** undo可能かどうか */
export const canUndo = createGlobalState<boolean>(false);

/** redo可能かどうか */
export const canRedo = createGlobalState<boolean>(false);

function updateUndoRedoState(): void {
	canUndo.value = undoStack.length > 0;
	canRedo.value = redoStack.length > 0;
}

/** 変更前のグリッドをundoスタックに追加する */
function pushUndo(grid: Grid): void {
	undoStack.push(grid.map((r) => [...r]));
	if (undoStack.length > MAX_UNDO) {
		undoStack = undoStack.slice(-MAX_UNDO);
	}
	redoStack = [];
	updateUndoRedoState();
}

/** セルに値を設定する */
export function setCell(row: number, col: number, cell: Cell): void {
	if (!grid.value[row]) return;
	pushUndo(grid.value);
	const newGrid = grid.value.map((r) => [...r]);
	newGrid[row][col] = cell;
	grid.value = newGrid;
}

/** 下端に行を1行追加する */
export function addRowBottom(): void {
	pushUndo(grid.value);
	const newRow = Array(grid.value[0]?.length ?? GRID_INITIAL_SIZE).fill(null) as Cell[];
	grid.value = [...grid.value, newRow];
}

/** 上端に行を1行挿入する */
export function addRowTop(): void {
	pushUndo(grid.value);
	const newRow = Array(grid.value[0]?.length ?? GRID_INITIAL_SIZE).fill(null) as Cell[];
	grid.value = [newRow, ...grid.value];
}

/** 右端に列を1列追加する */
export function addColRight(): void {
	pushUndo(grid.value);
	grid.value = grid.value.map((row) => [...row, null]);
}

/** 左端に列を1列挿入する */
export function addColLeft(): void {
	pushUndo(grid.value);
	grid.value = grid.value.map((row) => [null, ...row]);
}

/** 行を削除する（配置チェックはコンポーネント側で行う） */
export function removeRow(row: number): void {
	pushUndo(grid.value);
	grid.value = grid.value.filter((_, i) => i !== row);
}

/** 列を削除する（配置チェックはコンポーネント側で行う） */
export function removeCol(col: number): void {
	pushUndo(grid.value);
	grid.value = grid.value.map((row) => row.filter((_, i) => i !== col));
}

/** グリッドをロードする */
export function loadGrid(newGrid: Grid): void {
	grid.value = newGrid;
}

/** グリッドを全消しする */
export function clearAll(): void {
	// 空でない場合のみundoスタックに保存
	if (grid.value.some((row) => row.some((cell) => cell !== null))) {
		pushUndo(grid.value);
	}
	const rows = grid.value.length;
	const cols = grid.value[0]?.length ?? GRID_INITIAL_SIZE;
	grid.value = Array.from({ length: rows }, () => Array(cols).fill(null));
}

/** 元に戻す */
export function undo(): void {
	if (undoStack.length === 0) return;
	// 現在のグリッドをredoスタックに保存
	redoStack.push(grid.value.map((r) => [...r]));
	// 直前の状態に戻す
	const prevGrid = undoStack.pop()!;
	grid.value = prevGrid;
	updateUndoRedoState();
}

/** やり直す */
export function redo(): void {
	if (redoStack.length === 0) return;

	// 現在のグリッドをundoスタックに保存
	undoStack.push(grid.value.map((r) => [...r]));
	// 次の状態に進める
	const nextGrid = redoStack.pop()!;
	grid.value = nextGrid;
	updateUndoRedoState();
}

/** 全消し確認の表示有無を取得 */
export function getShowClearConfirm(): boolean {
	return showClearConfirm;
}

/** 全消し確認の表示有無を設定 */
export function setShowClearConfirm(value: boolean): void {
	showClearConfirm = value;
}

/** 行に絵文字が配置されているかチェックする */
export function rowHasEmoji(grid: Grid, row: number): boolean {
	return grid[row] !== undefined && grid[row].some((cell) => cell !== null);
}

/** 列に絵文字が配置されているかチェックする */
export function colHasEmoji(grid: Grid, col: number): boolean {
	return grid.some((row) => row[col] !== null);
}

/** デフォルトnull絵文字の初期値を生成する */
export function createDefaultNullEmoji(): NullEmojiConfig {
	const defaultEmoji: PaletteEmoji = {
		shortcode: NULL_EMOJI_SHORTCODE,
		url: NULL_EMOJI_URL,
		originalShortcode: NULL_EMOJI_SHORTCODE,
		ref: `30030:${APP_30030_PUBKEY}:${APP_30030_DTAG}`
	};
	return { type: 'custom', emoji: defaultEmoji };
}

/**10030にでふぉえもじがはいっているかどうか */
export function checkDefaultNullin10030() {
	hasDefaultNullSet.value =
		kind10030.value?.tags.some((tag) => tag[0] === 'a' && tag[1] === APP_30030_ATAG) ?? false;
	console.log(hasDefaultNullSet.value);
}
