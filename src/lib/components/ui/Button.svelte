<!-- $lib/components/Button.svelte -->
<script lang="ts">
	import { Button } from 'bits-ui';

	let { children, variant = 'filled', ...props } = $props();
</script>

<Button.Root class="btn btn-{variant}" {...props}>
	{@render children()}
</Button.Root>

<style lang="postcss">
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem 1.5rem;
		border-radius: 9999px;
		border: none;
		font-size: 0.875rem;
		font-weight: 500;
		letter-spacing: 0.00625em;
		cursor: pointer;
		transition:
			background-color 0.2s,
			box-shadow 0.2s,
			opacity 0.2s;

		&:disabled {
			opacity: 0.38;
			cursor: not-allowed;
		}

		&:not(:disabled):hover {
			opacity: 0.92;
		}

		&:not(:disabled):active {
			opacity: 0.84;
		}
	}
	.btn-filled {
		background-color: var(--color-primary);
		color: var(--color-on-primary);
	}
	.btn-outlined {
		border: 1px solid var(--color-outline);
		color: var(--color-primary);
	}
	.btn-text {
		color: var(--color-primary);
	}
</style>
