<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { waitNostr } from 'nip07-awaiter';
	import { onMount } from 'svelte';
	import { loginUser } from '$lib/stores/user';

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
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
