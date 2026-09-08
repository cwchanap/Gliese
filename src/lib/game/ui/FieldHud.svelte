<script lang="ts">
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { parseCellKey } from '$lib/game/core/map-exploration';
	import type { HudState } from '$lib/game/ui-bridge/events';

	let { hudState }: { hudState: HudState } = $props();

	const hpPercent = $derived((hudState.hp / Math.max(hudState.maxHp, 1)) * 100);
	const xpTarget = $derived(hudState.level > 1 ? 24 : 12);
	const xpPercent = $derived((Math.min(hudState.xp, xpTarget) / xpTarget) * 100);
	const lowHp = $derived(hudState.maxHp > 0 && hudState.hp / hudState.maxHp <= 0.25);

	let coinFlashTimer: ReturnType<typeof setTimeout> | undefined;
	let coinFlash = $state(false);
	// svelte-ignore state_referenced_locally
	let lastCoins = hudState.wallet.coins;
	$effect(() => {
		const coins = hudState.wallet.coins;
		if (coins !== lastCoins) {
			lastCoins = coins;
			coinFlash = true;
			clearTimeout(coinFlashTimer);
			coinFlashTimer = setTimeout(() => {
				coinFlash = false;
			}, 600);
		}
	});

	let levelUpFlashTimer: ReturnType<typeof setTimeout> | undefined;
	let levelUpFlash = $state(false);
	// svelte-ignore state_referenced_locally
	let lastLevel = hudState.level;
	$effect(() => {
		const level = hudState.level;
		if (level > lastLevel) {
			lastLevel = level;
			levelUpFlash = true;
			clearTimeout(levelUpFlashTimer);
			levelUpFlashTimer = setTimeout(() => {
				levelUpFlash = false;
			}, 600);
		} else {
			lastLevel = level;
		}
	});

	let fieldStatusKey = $state(0);
	// svelte-ignore state_referenced_locally
	let lastStatus = hudState.status;
	$effect(() => {
		const status = hudState.status;
		if (status !== lastStatus) {
			lastStatus = status;
			fieldStatusKey++;
		}
	});
</script>

<section
	data-testid="hud-location-panel"
	class="glass-panel filigree-frame jrpg-location-panel"
	aria-label={hudState.areaMap.name}
>
	<p class="jrpg-location-name font-display">{hudState.areaMap.name}</p>
	<p class="jrpg-location-sub">{t($locale, 'ui.regionSubline')}</p>
</section>

<section
	data-testid="hud-minimap"
	class="glass-panel filigree-frame jrpg-minimap-panel"
	aria-label={t($locale, 'ui.areaMap')}
>
	<div class="jrpg-minimap-heading">
		<span>{t($locale, 'ui.areaMap')}</span>
	</div>
	<svg
		class="jrpg-minimap-svg"
		viewBox={`0 0 ${hudState.areaMap.worldWidth} ${hudState.areaMap.worldHeight}`}
		aria-hidden="true"
	>
		<rect
			class="jrpg-minimap-fog"
			x="0"
			y="0"
			width={hudState.areaMap.worldWidth}
			height={hudState.areaMap.worldHeight}
		/>
		{#each hudState.areaMap.revealedCells as cellKey (cellKey)}
			{@const cell = parseCellKey(cellKey)}
			<rect
				class="jrpg-minimap-cell"
				x={cell.column * hudState.areaMap.cellSize}
				y={cell.row * hudState.areaMap.cellSize}
				width={hudState.areaMap.cellSize}
				height={hudState.areaMap.cellSize}
			/>
		{/each}
		{#each hudState.areaMap.markers as marker (marker.id)}
			<circle
				class={`jrpg-minimap-marker jrpg-minimap-marker-${marker.kind} ${
					marker.emphasis ? 'jrpg-minimap-marker-emphasis' : ''
				}`}
				cx={marker.x}
				cy={marker.y}
				r={marker.emphasis ? 76 : 54}
			/>
		{/each}
		<circle
			class="jrpg-minimap-player-halo arcane-halo"
			cx={hudState.areaMap.player.x}
			cy={hudState.areaMap.player.y}
			r="98"
		/>
		<circle
			class="jrpg-minimap-player"
			cx={hudState.areaMap.player.x}
			cy={hudState.areaMap.player.y}
			r="62"
		/>
	</svg>
</section>

<section
	data-testid="hud-party-panel"
	class={`glass-panel filigree-frame jrpg-party-panel${lowHp ? ' arcane-low-hp' : ''}`}
	aria-label={t($locale, 'ui.playerStatus')}
>
	<div class="jrpg-portrait" aria-hidden="true">L</div>
	<div class="jrpg-party-copy">
		<div class="jrpg-party-header">
			<p>{t($locale, 'ui.heroName')}</p>
			<span class={`tabular-nums${levelUpFlash ? ' arcane-level-up' : ''}`}
				>{t($locale, 'ui.levelAbbrev')} {hudState.level}</span
			>
		</div>
		<div class="jrpg-party-meter jrpg-party-meter-hp">
			<div>
				<span>{t($locale, 'ui.hp')}</span>
				<span class="tabular-nums">{hudState.hp}/{hudState.maxHp}</span>
			</div>
			<div class="arcane-meter arcane-meter-hp"><span style={`width: ${hpPercent}%`}></span></div>
		</div>
		<div class="jrpg-party-meter jrpg-party-meter-xp">
			<div>
				<span>{t($locale, 'ui.xp')}</span>
				<span class="tabular-nums">{hudState.xp}/{xpTarget}</span>
			</div>
			<div class="arcane-meter arcane-meter-xp"><span style={`width: ${xpPercent}%`}></span></div>
		</div>
	</div>
</section>

<aside
	data-testid="hud-side-panel"
	class="jrpg-side-hud"
	aria-label={t($locale, 'ui.questTracker')}
>
	<div class="glass-panel jrpg-coin-token">
		<span class={`font-display tabular-nums${coinFlash ? ' arcane-coin-flash' : ''}`}
			>{hudState.wallet.coins}{t($locale, 'ui.goldSuffix')}</span
		>
	</div>
	{#if hudState.quests.main}
		<section class="glass-panel filigree-frame jrpg-active-quest-panel">
			<p class="jrpg-label font-display">{t($locale, 'ui.activeQuest')}</p>
			<h2>{hudState.quests.main.title}</h2>
			<p>{hudState.quests.main.objective}</p>
			{#if hudState.quests.side.length > 0}
				<span>{t($locale, 'ui.sideActive', { count: hudState.quests.side.length })}</span>
			{/if}
		</section>
	{/if}
</aside>

<div
	class="glass-panel jrpg-field-status"
	role="status"
	aria-label={t($locale, 'ui.fieldStatus')}
	aria-live="polite"
>
	{#key fieldStatusKey}
		<span class="arcane-window-enter">{hudState.status}</span>
	{/key}
</div>

<style>
	.jrpg-label {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0;
		color: var(--color-gold);
		text-transform: uppercase;
	}

	.jrpg-location-panel,
	.jrpg-minimap-panel,
	.jrpg-party-panel {
		position: absolute;
		z-index: 20;
		pointer-events: none;
	}

	.jrpg-location-panel {
		top: 0.9rem;
		left: 0.9rem;
		width: min(14.5rem, calc(100vw - 12rem));
		padding: 0.55rem 0.7rem;
	}

	.jrpg-location-name {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.9rem;
		font-weight: 700;
		color: var(--color-parchment);
		text-transform: uppercase;
	}

	.jrpg-location-sub {
		margin: 0.2rem 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.58rem;
		font-weight: 900;
		color: var(--color-muted);
		text-transform: uppercase;
	}

	.jrpg-minimap-panel {
		top: 0.9rem;
		right: 0.9rem;
		width: 10.25rem;
		padding: 0.55rem;
	}

	.jrpg-minimap-heading {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.42rem;
		color: var(--color-gold);
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.jrpg-minimap-svg {
		display: block;
		width: 100%;
		height: 6.2rem;
		border: 1px solid rgba(255, 248, 232, 0.16);
		background: #0d1b26;
		image-rendering: pixelated;
	}

	.jrpg-minimap-fog {
		fill: #142333;
	}

	.jrpg-minimap-cell {
		fill: rgba(75, 133, 88, 0.82);
		stroke: rgba(255, 248, 232, 0.16);
		stroke-width: 8;
	}

	.jrpg-minimap-marker {
		fill: rgba(255, 248, 232, 0.34);
		stroke: rgba(255, 248, 232, 0.82);
		stroke-width: 18;
	}

	.jrpg-minimap-marker-exit,
	.jrpg-minimap-marker-quest {
		fill: rgba(255, 208, 64, 0.42);
		stroke: var(--color-gold);
	}

	.jrpg-minimap-marker-building {
		fill: rgba(159, 231, 255, 0.34);
		stroke: rgba(159, 231, 255, 0.82);
	}

	.jrpg-minimap-marker-discovery {
		fill: rgba(159, 247, 203, 0.34);
		stroke: rgba(159, 247, 203, 0.82);
	}

	.jrpg-minimap-marker-emphasis {
		filter: drop-shadow(0 0 32px rgba(255, 208, 64, 0.84));
	}

	.jrpg-minimap-player {
		fill: #f05268;
		stroke: var(--color-parchment);
		stroke-width: 18;
	}

	.jrpg-minimap-player-halo {
		fill: rgba(240, 97, 122, 0.5);
	}

	.jrpg-party-panel {
		bottom: 0.9rem;
		left: 0.9rem;
		display: grid;
		width: min(17.5rem, calc(100vw - 2rem));
		grid-template-columns: 3.4rem minmax(0, 1fr);
		gap: 0.65rem;
		padding: 0.65rem;
	}

	.jrpg-portrait {
		display: grid;
		place-items: center;
		border: 1px solid rgba(255, 248, 232, 0.2);
		border-radius: 0.25rem;
		background: linear-gradient(180deg, rgba(255, 208, 64, 0.22), rgba(95, 168, 240, 0.14));
		color: var(--color-gold);
		font-size: 1.8rem;
		font-weight: 900;
		line-height: 1;
	}

	.jrpg-party-copy {
		display: grid;
		min-width: 0;
		gap: 0.42rem;
	}

	.jrpg-party-header,
	.jrpg-party-meter div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.jrpg-party-header p,
	.jrpg-party-header span,
	.jrpg-party-meter span {
		margin: 0;
		font-size: 0.66rem;
		font-weight: 900;
		color: var(--color-muted);
		text-transform: uppercase;
	}

	.jrpg-party-header p {
		color: var(--color-parchment);
		font-size: 0.8rem;
	}

	.jrpg-party-meter {
		display: grid;
		gap: 0.2rem;
	}

	.jrpg-side-hud {
		position: absolute;
		right: 0.9rem;
		bottom: 0.9rem;
		z-index: 20;
		display: grid;
		width: min(17rem, calc(100vw - 2rem));
		gap: 0.55rem;
		pointer-events: none;
	}

	.jrpg-coin-token {
		justify-self: end;
		padding: 0.4rem 0.78rem;
		border-radius: var(--radius-arcane);
		color: var(--color-gold);
		font-size: 1.1rem;
		font-weight: 700;
	}

	.jrpg-active-quest-panel {
		padding: 0.62rem 0.7rem;
	}

	.jrpg-active-quest-panel h2 {
		margin: 0.16rem 0 0;
		overflow-wrap: anywhere;
		color: var(--color-parchment);
		font-size: 0.84rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.jrpg-active-quest-panel p:not(.jrpg-label) {
		margin: 0.25rem 0 0;
		color: var(--color-muted);
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.3;
	}

	.jrpg-active-quest-panel span {
		display: inline-block;
		margin-top: 0.35rem;
		color: var(--color-emerald);
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.jrpg-field-status {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 7rem;
		z-index: 20;
		width: fit-content;
		max-width: min(24rem, calc(100vw - 2rem));
		margin-inline: auto;
		border-radius: 999px;
		padding: 0.52rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 900;
		color: var(--color-sapphire);
		pointer-events: none;
	}

	@media (max-width: 720px) {
		.jrpg-location-panel {
			top: 0.75rem;
			left: 0.75rem;
			width: min(12rem, calc(100vw - 9.75rem));
		}

		.jrpg-minimap-panel {
			top: 0.75rem;
			right: 0.75rem;
			width: 8.25rem;
			padding: 0.45rem;
		}

		.jrpg-minimap-svg {
			height: 4.9rem;
		}

		.jrpg-party-panel,
		.jrpg-side-hud {
			left: 0.75rem;
			right: 0.75rem;
			width: auto;
		}

		.jrpg-party-panel {
			bottom: 0.75rem;
		}

		.jrpg-side-hud {
			bottom: 8.4rem;
		}

		.jrpg-field-status {
			bottom: 16.5rem;
			max-width: min(24rem, calc(100vw - 1.5rem));
		}
	}
</style>
