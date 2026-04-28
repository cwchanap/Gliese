<script lang="ts">
	import { onMount } from 'svelte';

	let mountNode: HTMLDivElement | undefined;
	let loadError = $state('');

	onMount(() => {
		let destroyed = false;
		let cleanup = () => {};

		void (async () => {
			try {
				if (!mountNode) return;

				const { createGame } = await import('$lib/game/phaser/createGame');
				const instance = await createGame(mountNode);

				if (destroyed) {
					instance.destroy();
					return;
				}

				cleanup = () => instance.destroy();
			} catch {
				if (!destroyed) {
					loadError = 'Unable to start the game shell.';
				}
			}
		})();

		return () => {
			destroyed = true;
			cleanup();
		};
	});
</script>

<section class="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 px-6 py-8">
	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Game</h1>
		<p class="text-sm text-slate-600">Phaser bootstrap shell for the vertical slice.</p>
	</header>

	{#if loadError}
		<p class="text-sm text-red-700">{loadError}</p>
	{/if}

	<div
		bind:this={mountNode}
		class="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950"
	></div>
</section>
