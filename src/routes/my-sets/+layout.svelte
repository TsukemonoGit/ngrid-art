<script lang="ts">
	import { fetchMyKind30030Sets } from '$lib/nostr/rx-nostr';
	import { connectReady, loginUser } from '$lib/stores/user';
	import { onMount, untrack } from 'svelte';
	import { setContext } from 'svelte';

	const mySetsLoading = $state({ value: false });
	setContext('mySetsLoading', mySetsLoading);
	let { children } = $props();
	// --- Fetch user's 30030 sets (owned by login user) ---
	async function fetchMySets(): Promise<void> {
		try {
			mySetsLoading.value = true;
			await fetchMyKind30030Sets();
		} catch (err) {
			console.error('Failed to fetch my sets:', err);
			//errorMessage = 'セットの読み込みに失敗しました';
		} finally {
			mySetsLoading.value = false;
		}
	}

	onMount(async () => {
		if (!loginUser.value) {
			try {
				await window.nostr?.getPublicKey();
			} catch (error) {
				console.log(error);
			}
		}
	});

	$effect(() => {
		if (connectReady.value) {
			untrack(async () => {
				console.log('fetchMySets');
				await fetchMySets();
				console.log('fetchMySetsend');
			});
		}
	});
</script>

{@render children()}
