/**
 * Svelte 5 Runes を使ってグローバルなリアクティブ状態を作成します。
 *
 * @template T 状態の値の型
 * @param {T | null} [initialValue=null] 状態の初期値。デフォルトは null
 * @param {string} [storageKey] オプションの localStorage キー。指定された場合:
 *   - 初期化時に localStorage から復元
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

export function createGlobalState<T>(initialValue: T, storageKey?: string): GlobalState<T>;
export function createGlobalState<T>(
	initialValue: T | null,
	storageKey?: string
): GlobalState<T | null>;
export function createGlobalState<T>(
	initialValue?: T | null,
	storageKey?: string
): GlobalState<T | null>;
export function createGlobalState<T>(initialValue: T | null = null, storageKey?: string) {
	let _value = $state<T | null>(initialValue);
	let hydrated = false;

	function hydrateFromStorage() {
		if (hydrated || !storageKey || typeof window === 'undefined') {
			return;
		}

		try {
			const stored = localStorage.getItem(storageKey);
			if (stored !== null) {
				_value = JSON.parse(stored) as T;
			}
		} catch (e) {
			console.warn(`Failed to restore ${storageKey} from localStorage:`, e);
		} finally {
			hydrated = true;
		}
	}

	function persistToStorage(v: T | null) {
		if (!storageKey || typeof window === 'undefined') {
			return;
		}

		try {
			if (v === null) {
				localStorage.removeItem(storageKey);
			} else {
				localStorage.setItem(storageKey, JSON.stringify(v));
			}
		} catch (e) {
			console.warn(`Failed to save ${storageKey} to localStorage:`, e);
		}
	}

	return {
		get value() {
			hydrateFromStorage();
			return _value;
		},
		set value(v: T | null) {
			hydrateFromStorage();
			_value = v;
			persistToStorage(v);
		}
	} as GlobalState<T | null>;
}
