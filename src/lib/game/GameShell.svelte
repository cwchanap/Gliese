<script lang="ts">
	import { onMount } from 'svelte';
	import { hudState, requestHeal, requestResume, requestSave } from '$lib/game/ui-bridge/store';

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

	<section class="grid gap-3 rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm sm:grid-cols-[1fr_auto]">
		<div class="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
			<p>Map {$hudState.mapId}</p>
			<p>HP {$hudState.hp} / {$hudState.maxHp}</p>
			<p>Level {$hudState.level} XP {$hudState.xp}</p>
			<p>Attack {$hudState.attack}</p>
			<p>Heals {$hudState.heals}</p>
			<p>{$hudState.status}</p>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<button
				type="button"
				class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={requestResume}
				disabled={!$hudState.canResume}
			>
				Resume
			</button>
			<button
				type="button"
				class="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
				onclick={requestSave}
			>
				Save
			</button>
			<button
				type="button"
				class="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
				onclick={requestHeal}
				disabled={$hudState.heals < 1 || $hudState.hp >= $hudState.maxHp}
			>
				Use Heal
			</button>
		</div>
	</section>

	<div
		bind:this={mountNode}
		class="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-950"
	></div>
</section>
