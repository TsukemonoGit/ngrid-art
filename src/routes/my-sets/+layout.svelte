<script lang="ts">
	import { fetchMyKind30030Sets, waitForRelayReady } from '$lib/nostr/rx-nostr';
	import { isLoading, loginUser } from '$lib/stores/user';
	import { onMount } from 'svelte';

	let { children } = $props();
	// --- Fetch user's 30030 sets (owned by login user) ---
	async function fetchMySets(): Promise<void> {
		try {
			isLoading.value = true;
			await fetchMyKind30030Sets();
		} catch (err) {
			console.error('Failed to fetch my sets:', err);
			//errorMessage = 'セットの読み込みに失敗しました';
		} finally {
			isLoading.value = false;
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

		await waitForRelayReady();

		console.log('fetchMySets');
		await fetchMySets();
		console.log('fetchMySetsend');
	});
</script>

{@render children()}
