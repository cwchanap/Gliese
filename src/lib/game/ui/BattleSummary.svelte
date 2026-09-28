<script lang="ts">
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
	import type { HudBattleSummary } from '$lib/game/ui-bridge/events';
	import { getItem } from '$lib/game/content/items';

	interface Props {
		summary: HudBattleSummary;
		dialog?: HTMLDivElement;
		continueButton?: HTMLButtonElement;
		oncontinue: () => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		summary,
		dialog = $bindable(),
		continueButton = $bindable(),
		oncontinue,
		onkeydown
	}: Props = $props();

	const isVictory = $derived(summary.outcome === 'victory');
	const dropCount = $derived(summary.drops.reduce((total, drop) => total + drop.quantity, 0));
	const dropIcon = $derived(getItem(summary.drops[0]?.itemId ?? '')?.iconPath);

	// Quest pill (mockup): the freshest progress row, else a completed title,
	// else a quest reward grant. Dots come from the live progress counters.
	const questPill = $derived.by(() => {
		const progress = summary.questProgress[0];
		if (progress) {
			return { title: progress.title, current: progress.currentProgress, target: progress.target };
		}
		const completed = summary.completedQuestTitles[0];
		if (completed) {
			return { title: completed, current: 1, target: 1 };
		}
		const reward = summary.questRewards[0];
		if (reward) {
			return { title: reward.title, current: 1, target: 1 };
		}
		return null;
	});

	const stats = $derived.by(() => {
		if (!isVictory) return [];
		return [
			{ id: 'xp', value: String(summary.xpGained), label: t($locale, 'ui.battleStatXp') },
			{ id: 'coins', value: String(summary.coinsGained), label: t($locale, 'ui.battleStatCoins') },
			{ id: 'drop', value: `x${dropCount}`, label: t($locale, 'ui.battleStatDrop') },
			{ id: 'foes', value: String(summary.enemiesDefeated), label: t($locale, 'ui.battleStatFoes') }
		] as const;
	});
</script>

<div bind:this={dialog} class="battle-summary-backdrop" role="presentation">
	<div
		class={`battle-summary heroic-anim ${isVictory ? 'battle-summary-victory' : 'battle-summary-defeat'}`}
		data-testid="battle-summary"
		aria-label={isVictory ? t($locale, 'ui.battleVictory') : t($locale, 'ui.battleDefeat')}
		aria-modal="true"
		role="dialog"
		tabindex="-1"
		{onkeydown}
	>
		<span class="battle-summary-corner battle-summary-corner-tl" aria-hidden="true"></span>
		<span class="battle-summary-corner battle-summary-corner-br" aria-hidden="true"></span>

		{#if isVictory}
			<span class="battle-summary-emblem" aria-hidden="true">
				<img src="/game/assets/heroic-ui/victory-flourish.png" alt="" />
			</span>
			<h2 class="battle-summary-title font-display">{t($locale, 'ui.battleVictory')}</h2>

			{#if summary.leveledUp}
				<p class="battle-summary-levelup font-display">{t($locale, 'ui.levelUp')}</p>
			{/if}

			<div class="battle-summary-stats">
				{#each stats as stat (stat.id)}
					<div class="battle-summary-stat" data-testid={`battle-stat-${stat.id}`}>
						<span class="battle-summary-stat-card" aria-hidden="true">
							{#if stat.id === 'xp'}
								<svg viewBox="0 0 16 16"
									><path d="M8 1.8 9.7 6.3 14.2 8 9.7 9.7 8 14.2 6.3 9.7 1.8 8l4.5-1.7Z" /></svg
								>
							{:else if stat.id === 'coins'}
								<svg viewBox="0 0 16 16"
									><circle cx="8" cy="8" r="5.8" /><path
										d="M8 5v6M6.4 6.2h2.4a1.2 1.2 0 0 1 0 2.4H7.2a1.2 1.2 0 0 0 0 2.4h2.4"
									/></svg
								>
							{:else if stat.id === 'drop'}
								{#if dropIcon}
									<img class="battle-summary-drop-icon" src={dropIcon} alt="" />
								{:else}
									<svg viewBox="0 0 16 16"
										><path d="M6 2.6h4M6.8 2.6v3L4.4 9.4a3.9 3.9 0 1 0 7.2 0L9.2 5.6v-3" /></svg
									>
								{/if}
							{:else}
								<svg viewBox="0 0 16 16"
									><path d="M3.4 12.6c0-3 1.4-5.2 4.6-5.2s4.6 2.2 4.6 5.2" /><circle
										cx="6"
										cy="9.6"
										r="0.01"
									/><circle cx="10" cy="9.6" r="0.01" /></svg
								>
							{/if}
						</span>
						<b class="font-display tabular-nums">{stat.value}</b>
						<span class="font-display">{stat.label}</span>
					</div>
				{/each}
			</div>

			{#if questPill}
				<p class="battle-summary-quest" data-testid="battle-summary-quest">
					<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 8.4 3 3 6-6.8" /></svg>
					<span class="font-display">{questPill.title}</span>
					<span class="battle-summary-dots" aria-hidden="true">
						{#each { length: questPill.target } as _, index (index)}
							<i class:battle-summary-dot-on={index < questPill.current}></i>
						{/each}
					</span>
				</p>
			{/if}
		{:else}
			<h2 class="battle-summary-title font-display">{t($locale, 'ui.battleDefeat')}</h2>
			<p class="battle-summary-defeat-copy">{t($locale, 'ui.defeatReturnedToVillage')}</p>
		{/if}

		<button
			bind:this={continueButton}
			type="button"
			class="battle-summary-continue font-display"
			data-testid="battle-summary-continue"
			onclick={oncontinue}
		>
			{t($locale, 'ui.continue')}
			<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
		</button>
	</div>
</div>

<style>
	.battle-summary-backdrop {
		position: absolute;
		inset: 0;
		z-index: 70;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.52);
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.battle-summary {
		position: relative;
		z-index: 10;
		display: grid;
		justify-items: center;
		width: min(64.375rem, calc(100vw - 2rem));
		border: 1px solid rgba(255, 224, 138, 0.55);
		border-radius: 1.75rem;
		padding: 2.6rem 2rem 2.4rem;
		background: radial-gradient(
			120% 140% at 24% 0%,
			#1d3f7d 0%,
			#152c5e 44%,
			#101a3c 78%,
			#0d1230 100%
		);
		box-shadow:
			0 34px 100px rgba(0, 0, 0, 0.6),
			inset 0 1px 0 rgba(255, 246, 224, 0.1);
		color: var(--color-parchment);
	}

	.battle-summary::after {
		content: '';
		position: absolute;
		inset: 0.85rem;
		border: 1px solid rgba(255, 214, 120, 0.22);
		border-radius: 1.1rem;
		pointer-events: none;
	}

	.battle-summary-corner {
		position: absolute;
		width: 2.2rem;
		height: 2.2rem;
		border: 2px solid rgba(255, 224, 138, 0.8);
	}

	.battle-summary-corner-tl {
		top: 0.85rem;
		left: 0.85rem;
		border-right: none;
		border-bottom: none;
		border-top-left-radius: 1.1rem;
	}

	.battle-summary-corner-br {
		right: 0.85rem;
		bottom: 0.85rem;
		border-left: none;
		border-top: none;
		border-bottom-right-radius: 1.1rem;
	}

	.battle-summary-emblem {
		display: grid;
		place-items: center;
		width: 4.6rem;
		height: 4.6rem;
		border: 3px solid var(--color-gold);
		border-radius: 999px;
		box-shadow: 0 0 30px color-mix(in srgb, var(--color-gold) 30%, transparent);
	}

	.battle-summary-emblem img {
		width: 8.7rem;
		height: 3.4rem;
		object-fit: contain;
	}

	.battle-summary-title {
		margin: 1.4rem 0 0;
		color: var(--color-gold);
		font-size: clamp(1.9rem, 3.4vw, 2.6rem);
		font-weight: 900;
		letter-spacing: 0.32em;
		text-indent: 0.32em;
		text-transform: uppercase;
		text-shadow: 0 0 26px rgba(255, 214, 120, 0.35);
	}

	.battle-summary-levelup {
		margin: 0.9rem 0 0;
		border: 1px solid rgba(255, 232, 168, 0.5);
		border-radius: 999px;
		padding: 0.2rem 0.9rem;
		background: color-mix(in srgb, var(--color-gold) 16%, transparent);
		color: var(--color-gold-bright);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.battle-summary-stats {
		display: flex;
		gap: 1.5rem;
		margin-top: 1.8rem;
	}

	.battle-summary-stat {
		display: grid;
		justify-items: center;
		gap: 0.5rem;
	}

	.battle-summary-stat-card {
		display: grid;
		place-items: center;
		width: 6.6rem;
		height: 6.6rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 28%, transparent)
			),
			var(--color-panel-deep);
		color: #cdb7f5;
	}

	.battle-summary-stat:nth-child(3) .battle-summary-stat-card {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-shade));
		color: #3a2c07;
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	.battle-summary-stat-card svg {
		width: 1.7rem;
		height: 1.7rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.battle-summary-drop-icon {
		width: 50%;
		height: 50%;
		object-fit: contain;
		image-rendering: pixelated;
	}
	.battle-summary-stat:nth-child(1) .battle-summary-stat-card {
		background: linear-gradient(180deg, rgba(132, 75, 202, 0.42), rgba(36, 28, 96, 0.8));
		color: var(--color-violet);
	}
	.battle-summary-stat:nth-child(2) .battle-summary-stat-card {
		background: linear-gradient(180deg, rgba(176, 124, 36, 0.42), rgba(60, 40, 14, 0.7));
		color: var(--color-gold);
	}
	.battle-summary-stat:nth-child(4) .battle-summary-stat-card {
		background: linear-gradient(180deg, rgba(176, 62, 90, 0.42), rgba(74, 20, 38, 0.7));
		color: var(--color-rose);
	}

	.battle-summary-stat b {
		font-size: 1.15rem;
		font-weight: 900;
	}

	.battle-summary-stat > span:last-child {
		color: #9db4d8;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		text-transform: uppercase;
	}

	.battle-summary-quest {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		margin: 1.7rem 0 0;
		border: 1px solid rgba(159, 247, 203, 0.4);
		border-radius: 999px;
		padding: 0.42rem 1rem;
		background: color-mix(in srgb, #14232b 70%, transparent);
		color: var(--color-emerald);
	}

	.battle-summary-quest svg {
		width: 0.95rem;
		height: 0.95rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.battle-summary-quest > span {
		font-size: 0.8rem;
		font-weight: 800;
	}

	.battle-summary-dots {
		display: inline-flex;
		gap: 0.3rem;
	}

	.battle-summary-dots i {
		width: 0.44rem;
		height: 0.44rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-parchment) 26%, transparent);
	}

	.battle-summary-dot-on {
		background: var(--color-emerald);
	}

	.battle-summary-defeat-copy {
		max-width: 26rem;
		margin: 1.5rem 0 0;
		text-align: center;
		color: var(--color-muted);
		line-height: 1.6;
	}

	.battle-summary-continue {
		display: inline-flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: 2rem;
		border: 1px solid rgba(255, 232, 168, 0.9);
		border-radius: 1rem;
		padding: 0.85rem 2.1rem;
		background: linear-gradient(180deg, #fff6dc, var(--color-gold-bright) 46%, var(--color-gold));
		box-shadow:
			0 0 30px rgba(255, 214, 120, 0.35),
			inset 0 1px 0 rgba(255, 255, 255, 0.7);
		color: #3a2c07;
		font-size: 0.95rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	@media (max-width: 720px) {
		.battle-summary-stats {
			flex-wrap: wrap;
			justify-content: center;
			gap: 1rem;
		}
	}

	/* Short viewports (≤360px tall — the Tauri minimum): the emblem/stats/
	   Continue stack runs past the clipped shell, leaving Continue unreachable
	   by pointer. Compact the composition AND bound the card with internal
	   scroll so the button is always visible and clickable; desktop is
	   untouched. */
	@media (max-height: 500px) {
		.battle-summary {
			max-height: calc(100vh - 1.5rem);
			overflow-y: auto;
			padding: 1.1rem 1.5rem 1rem;
		}

		.battle-summary-emblem {
			width: 2.6rem;
			height: 2.6rem;
		}

		.battle-summary-emblem img {
			width: 1.9rem;
			height: 1.9rem;
		}

		.battle-summary-title {
			margin-top: 0.7rem;
			font-size: 1.35rem;
		}

		.battle-summary-levelup {
			margin-top: 0.55rem;
		}

		.battle-summary-stats {
			margin-top: 0.8rem;
			gap: 1rem;
		}

		.battle-summary-stat {
			gap: 0.3rem;
		}

		.battle-summary-stat-card {
			width: 2.5rem;
			height: 2.5rem;
			border-radius: 0.7rem;
		}

		.battle-summary-stat-card svg {
			width: 1.1rem;
			height: 1.1rem;
		}

		.battle-summary-stat b {
			font-size: 0.9rem;
		}

		.battle-summary-stat > span:last-child {
			font-size: 0.54rem;
		}

		.battle-summary-quest {
			margin-top: 0.8rem;
		}

		.battle-summary-continue {
			margin-top: 0.9rem;
			padding: 0.6rem 1.5rem;
		}
	}
</style>
