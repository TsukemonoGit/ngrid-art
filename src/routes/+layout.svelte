<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { waitNostr } from 'nip07-awaiter';
	import { onMount, untrack } from 'svelte';
	import { connectReady, isMobile, loginUser } from '$lib/stores/user';
	import {
		fetchLatestKind10030,
		setDefaultRelaysfrom10002,
		setForwardFilters
	} from '$lib/nostr/rx-nostr';
	import { kind30030Stock, subscriptionStartTime } from '$lib/stores/palette';
	import { syncPaletteFromKind10030 } from '$lib/palette/syncPaletteFromKind10030';
	import { kind10030, loadStorageData } from '$lib/stores/storages';
	import Header from '$lib/components/layout/Header.svelte';
	import { checkDefaultNullin10030 } from '$lib/palette/grid';

	let { children } = $props();

	// nostr-login初期化済みフラグ
	let nostrLoginInitialized = false;

	// Nostr Login認証イベントリスナー
	const handleNlAuth = (e: Event) => {
		const customEvent = e as CustomEvent;
		const pub = customEvent.detail.pubkey;

		// 同じpubkeyで連続してイベントが発火した場合はスキップ
		if (!pub || pub === loginUser.value) {
			return;
		}
		loginUser.value = pub;
		console.log('Nostr Login認証イベントリスナー', pub);
	};

	onMount(async () => {
		loadStorageData();

		// Nostr Login初期化（1度だけ実行）
		if (!nostrLoginInitialized) {
			const nostrLogin = await import('@konemono/nostr-login');
			document.addEventListener('nlAuth', handleNlAuth);
			await waitNostr(1000);
			try {
				await nostrLogin.init({});
				nostrLoginInitialized = true;
			} catch (error) {
				console.log('Nostr Login initialization error:', error);
			}
		}
	});

	$effect(() => {
		if (loginUser.value) {
			untrack(async () => {
				await setDefaultRelaysfrom10002(loginUser.value);
			});
		}
	});

	$effect(() => {
		if (connectReady.value) {
			untrack(async () => {
				//未来の購読設定
				setForwardFilters([
					{ kinds: [10030], authors: [loginUser.value], since: subscriptionStartTime.value },
					{ kinds: [30030], since: subscriptionStartTime.value }
				]);

				//現状での最新の10030を取得
				await fetchLatestKind10030(loginUser.value);
				console.log('update');
			});
		}
	});

	$effect(() => {
		const k = kind10030.value;
		if (!k) return;

		untrack(() => {
			syncPaletteFromKind10030(k, { backfillMissing: true });
			checkDefaultNullin10030();
		});
	});

	$effect(() => {
		const k = kind10030.value;
		if (!k) return;

		// kind30030Stock を依存に含めるために参照する
		const stock = kind30030Stock.value;
		if (!stock) return;
		untrack(() => {
			syncPaletteFromKind10030(k, { backfillMissing: false });
		});
	});

	$effect(() => {
		const mql = window.matchMedia('(max-width: 768px)');
		isMobile.value = mql.matches;
		const handler = (e: MediaQueryListEvent) => {
			isMobile.value = e.matches;
		};
		mql.addEventListener('change', handler);
		return () => mql.removeEventListener('change', handler);
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<div class="flex h-dvh flex-col overflow-hidden">
	<Header />
	{@render children()}
</div>
