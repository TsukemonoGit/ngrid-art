<script lang="ts">
	import { fetchMyKind30030Sets, waitForRelayReady } from '$lib/nostr/rx-nostr';
	import { loginUser } from '$lib/stores/user';
	import { onMount } from 'svelte';

	let { children } = $props();
	//let isLoading = $state(true);
	// --- Fetch user's 30030 sets (owned by login user) ---
	async function fetchMySets(): Promise<void> {
		try {
			await fetchMyKind30030Sets();
		} catch (err) {
			console.error('Failed to fetch my sets:', err);
			//errorMessage = 'セットの読み込みに失敗しました';
		} finally {
			//	isLoading = false;
		}
	}

	onMount(async () => {
		console.log('onmount');
		await waitForRelayReady();

		if (!loginUser.value) {
			return;
		}
		console.log('fetchMySets');
		await fetchMySets();
		console.log('fetchMySetsend');
	});
</script>

{@render children()}
