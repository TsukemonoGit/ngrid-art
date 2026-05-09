/**
 * Svelte 5 Runes を使ってグローバルなリアクティブ状態を作成します。
 *
 * @template T 状態の値の型
 * @param {T | null} [initialValue=null] 状態の初期値。デフォルトは null
 * @param {string} [storageKey] オプションの localStorage キー。指定された場合:
 *   - 値が変更されるたびに自動的に localStorage に保存
 *   - null にセットされると localStorage から削除
 *   - **注意**: Map や SvelteMap は JSON.stringify でシリアライズできないため、
 *     storageKey を指定せず使用してください。Array や Object のみ対応。
 *
 * @returns {Object} ゲッター/セッター付きのリアクティブな状態オブジェクト
 * @returns {T | null} returns.value 現在の状態値を取得・設定
 *
 * @example
 * // localStorage なしのシンプルなリアクティブ状態
 * export const count = createGlobalState(0);
 *
 * @example
 * // localStorage 永続化付きの状態（Object/Array のみ対応）
 * export const user = createGlobalState<User>(null, 'app:user');
 *
 * @example
 * // Map は storageKey を指定しない
 * export const kindStock = createGlobalState<SvelteMap<string, Event>>(new SvelteMap());
 *
 * @example
 * // Svelte コンポーネントでの使用
 * <script>
 *   import { count } from '$lib/stores';
 *   count.value += 1; // 更新して自動的に localStorage に保存
 * </script>
 * <p>Count: {count.value}</p>
 */
type GlobalState<T> = {
	value: T;
};

type StorageKeyResolver = string | (() => string | undefined);

function resolveStorageKey(storageKey?: StorageKeyResolver): string | undefined {
	if (!storageKey) {
		return undefined;
	}

	if (typeof storageKey === 'function') {
		return storageKey();
	}

	return storageKey;
}

export function createGlobalState<T>(
	initialValue: T,
	storageKey?: StorageKeyResolver
): GlobalState<T>;
export function createGlobalState<T>(
	initialValue: T | null,
	storageKey?: StorageKeyResolver
): GlobalState<T | null>;
export function createGlobalState<T>(
	initialValue?: T | null,
	storageKey?: StorageKeyResolver
): GlobalState<T | null>;
export function createGlobalState<T>(
	initialValue: T | null = null,
	storageKey?: StorageKeyResolver
) {
	let _value = $state<T | null>(initialValue);

	function persistToStorage(v: T | null) {
		if (typeof window === 'undefined') {
			return;
		}

		const resolvedKey = resolveStorageKey(storageKey);
		if (!resolvedKey) {
			return;
		}

		try {
			if (v === null) {
				localStorage.removeItem(resolvedKey);
			} else {
				localStorage.setItem(resolvedKey, JSON.stringify(v));
			}
		} catch (e) {
			console.warn(`Failed to save ${resolvedKey} to localStorage:`, e);
		}
	}

	return {
		get value() {
			return _value;
		},
		set value(v: T | null) {
			_value = v;
			persistToStorage(v);
		}
	} as GlobalState<T | null>;
}
