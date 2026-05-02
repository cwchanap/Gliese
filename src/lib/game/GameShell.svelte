<script lang="ts">
	import { onMount } from 'svelte';
	import {
		hudState,
		requestHeal,
		requestPauseGame,
		requestResume,
		requestResumeGame,
		requestSave
	} from '$lib/game/ui-bridge/store';

	let mountNode: HTMLDivElement | undefined;
	let loadError = $state('');
	let settingsOpen = $state(false);

	const hpPercent = $derived(($hudState.hp / Math.max($hudState.maxHp, 1)) * 100);
	const xpTarget = $derived($hudState.level > 1 ? 24 : 12);
	const xpPercent = $derived((Math.min($hudState.xp, xpTarget) / xpTarget) * 100);

	function openSettings() {
		if (settingsOpen) return;
		settingsOpen = true;
		requestPauseGame();
	}

	function closeSettings() {
		if (!settingsOpen) return;
		settingsOpen = false;
		requestResumeGame();
	}

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
			} catch (error) {
				console.error(error);
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

<section
	class="game-shell relative h-screen w-screen overflow-hidden bg-[#060816] text-slate-50"
	style="font-family: 'Avenir Next Condensed', 'Trebuchet MS', 'Arial Narrow', sans-serif;"
>
	{#if loadError}
		<div
			class="absolute inset-x-6 top-6 z-30 rounded-2xl border border-rose-300/40 bg-rose-950/80 px-4 py-3 text-sm font-semibold text-rose-100 shadow-[0_20px_50px_rgba(80,10,20,0.45)] backdrop-blur"
		>
			{loadError}
		</div>
	{/if}

	<div bind:this={mountNode} class="game-stage absolute inset-0 overflow-hidden bg-[#090d1f]"></div>

	<div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(130,180,255,0.18),transparent_38%),linear-gradient(180deg,rgba(7,10,26,0.1),rgba(4,6,18,0.58)_85%,rgba(3,4,10,0.82))]"></div>

	<div class="pointer-events-auto absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
		<button
			type="button"
			class="hud-menu-button rounded-full border border-white/14 bg-[linear-gradient(135deg,rgba(24,32,68,0.92),rgba(12,18,38,0.92))] px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.28em] text-cyan-50 shadow-[0_18px_40px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 hover:border-cyan-200/40"
			onclick={() => (settingsOpen ? closeSettings() : openSettings())}
			aria-expanded={settingsOpen}
			aria-controls="game-settings-panel"
		>
			Menu
		</button>
	</div>

	<section class="pointer-events-none absolute bottom-4 left-4 z-20 sm:bottom-6 sm:left-6">
		<div
			class="w-[min(25rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,16,40,0.92),rgba(14,12,36,0.84)_55%,rgba(20,32,72,0.8))] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-md"
		>
			<div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
				<div
					class="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
				>
					<span class="text-[0.58rem] font-black uppercase tracking-[0.28em] text-fuchsia-100/70">
						LV
					</span>
					<span class="mt-1 text-xl font-black text-white">{$hudState.level}</span>
				</div>

				<div class="grid gap-2">
					<div class="grid gap-1">
						<div class="flex items-center justify-between text-[0.66rem] font-black uppercase tracking-[0.26em] text-rose-50/80">
							<span>HP</span>
							<span>{$hudState.hp} / {$hudState.maxHp}</span>
						</div>
						<div class="h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
							<div
								class="h-full rounded-full bg-[linear-gradient(90deg,#ff5d8f_0%,#ff7f7a_40%,#ffd26a_100%)] shadow-[0_0_20px_rgba(255,112,145,0.55)] transition-[width] duration-300"
								style={`width: ${hpPercent}%`}
							></div>
						</div>
					</div>

					<div class="grid gap-1">
						<div class="flex items-center justify-between text-[0.66rem] font-black uppercase tracking-[0.26em] text-cyan-50/76">
							<span>XP</span>
							<span>{$hudState.xp} / {xpTarget}</span>
						</div>
						<div class="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
							<div
								class="h-full rounded-full bg-[linear-gradient(90deg,#5de0ff_0%,#7f8bff_55%,#d98bff_100%)] shadow-[0_0_20px_rgba(110,164,255,0.45)] transition-[width] duration-300"
								style={`width: ${xpPercent}%`}
							></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	{#if settingsOpen}
		<div
			class="absolute inset-0 z-30 bg-black/24 backdrop-blur-[2px]"
			role="presentation"
			onclick={closeSettings}
		></div>
	{/if}

	<aside
		id="game-settings-panel"
		class={`pointer-events-auto absolute right-4 top-20 z-40 w-[min(19rem,calc(100vw-2rem))] rounded-[1.6rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,16,40,0.96),rgba(16,14,44,0.94))] p-4 text-slate-50 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-200 sm:right-6 sm:top-24 ${
			settingsOpen
				? 'translate-y-0 opacity-100'
				: 'pointer-events-none -translate-y-3 opacity-0'
		}`}
	>
		<div class="flex items-center justify-between gap-3">
			<div>
				<p class="text-[0.62rem] font-black uppercase tracking-[0.34em] text-cyan-100/68">
					System Menu
				</p>
				<h2 class="mt-1 text-xl font-black uppercase tracking-[0.1em] text-white">Settings</h2>
			</div>
			<button
				type="button"
				class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.24em] text-slate-100 transition hover:border-white/30"
				onclick={closeSettings}
			>
				Close
			</button>
		</div>

		<div class="mt-4 grid gap-3">
			<button
				type="button"
				class="hud-action rounded-[1.1rem] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(26,49,92,0.95),rgba(14,21,44,0.92))] px-4 py-3 text-sm font-black uppercase tracking-[0.24em] text-cyan-50 transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:shadow-[0_15px_30px_rgba(74,144,255,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
				onclick={requestResume}
				disabled={!$hudState.ready || !$hudState.canResume}
			>
				Resume Save
			</button>
			<button
				type="button"
				class="hud-action rounded-[1.1rem] border border-violet-200/20 bg-[linear-gradient(135deg,rgba(47,31,96,0.95),rgba(21,16,52,0.92))] px-4 py-3 text-sm font-black uppercase tracking-[0.24em] text-violet-50 transition hover:-translate-y-0.5 hover:border-violet-200/45 hover:shadow-[0_15px_30px_rgba(125,92,255,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
				onclick={requestSave}
				disabled={!$hudState.ready}
			>
				Save Game
			</button>
			<button
				type="button"
				class="hud-action rounded-[1.1rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(127,68,32,0.96),rgba(78,33,17,0.92))] px-4 py-3 text-sm font-black uppercase tracking-[0.24em] text-amber-50 transition hover:-translate-y-0.5 hover:border-amber-200/45 hover:shadow-[0_15px_30px_rgba(255,152,72,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
				onclick={requestHeal}
				disabled={!$hudState.ready || $hudState.heals < 1 || $hudState.hp >= $hudState.maxHp}
			>
				Use Heal
			</button>
		</div>

		<div class="mt-4 rounded-[1.2rem] border border-white/8 bg-white/6 px-4 py-3 text-sm text-slate-200/82">
			<p>{$hudState.status}</p>
		</div>
	</aside>
</section>

<style>
	:global(body) {
		overflow: hidden;
		background: #050714;
	}

	:global(.game-stage canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	.hud-action {
		backdrop-filter: blur(14px);
	}
</style>
