<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { waitNostr } from 'nip07-awaiter';
	import { onMount } from 'svelte';
	import { loginUser } from '$lib/stores/user';
	import {
		fetchLatestKind10030,
		setDefaultRelaysfrom10002,
		setForwardFilters
	} from '$lib/nostr/rx-nostr';
	import { kind10030, subscriptionStartTime } from '$lib/stores/palette';

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
		// Nostr Login初期化（1度だけ実行）
		if (!nostrLoginInitialized) {
			const nostrLogin = await import('@konemono/nostr-login');
			await waitNostr(1000);
			try {
				await nostrLogin.init({});
				nostrLoginInitialized = true;
				document.addEventListener('nlAuth', handleNlAuth);
			} catch (error) {
				console.log('Nostr Login initialization error:', error);
			}
		}
	});

	$effect(() => {
		if (loginUser.value) {
			updateData();
		}
	});

	async function updateData() {
		//まず10002を取得してデフォリレーにせっと
		await setDefaultRelaysfrom10002(loginUser.value);

		//未来の購読設定
		setForwardFilters([
			{ kinds: [10030], authors: [loginUser.value], since: subscriptionStartTime.value },
			{ kinds: [30030], since: subscriptionStartTime.value }
		]);

		//現状での最新の10030を取得
		await fetchLatestKind10030(loginUser.value);
	}

	$effect(() => {
		if (kind10030.value) {
			// kind10030 が変わるたびここが走る
			// 30030の取得・のら絵文字処理など
			// 最終的にパレットを完成させ、ローカルストレじに保存するまでが目標
			// パレットは、10030のタグの順番に表示(のらは一番上か一番下にまとめる)
			// えーーーーっと
		}
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
