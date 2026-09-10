<script lang="ts">
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { parseCellKey } from '$lib/game/core/map-exploration';
	import CommandGrid, { type FieldCommand } from '$lib/game/ui/CommandGrid.svelte';
	import type { HudState } from '$lib/game/ui-bridge/events';

	interface Props {
		hudState: HudState;
		/** Overlay-open state stays owned by GameShell; FieldHud only renders. */
		commandOpen?: boolean;
		commandEnabled?: Record<FieldCommand, boolean>;
		onCommand?: (command: FieldCommand) => void;
	}

	let { hudState, commandOpen = false, commandEnabled, onCommand }: Props = $props();

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
	data-testid="hud-party-panel"
	class={`heroic-field-card filigree-frame hero-card${lowHp ? ' arcane-low-hp' : ''}`}
	aria-label={t($locale, 'ui.playerStatus')}
>
	<div class="hero-portrait">
		<img
			src="/game/assets/heroic-ui/liam-portrait.png"
			alt=""
			aria-hidden="true"
			draggable="false"
		/>
		<span class="hero-level font-display tabular-nums" class:arcane-level-up={levelUpFlash}>
			<span class="sr-only" class:arcane-level-up={levelUpFlash}
				>{t($locale, 'ui.levelAbbrev')} {hudState.level}</span
			>
			<span aria-hidden="true">{hudState.level}</span>
		</span>
	</div>
	<div class="hero-copy">
		<p class="hero-name font-display">{t($locale, 'ui.heroName')}</p>
		<div class="hero-meter">
			<span class="hero-meter-label">{t($locale, 'ui.hp')}</span>
			<div class="hero-meter-track">
				<span class="hero-meter-fill hero-meter-fill-hp" style={`width: ${hpPercent}%`}></span>
			</div>
			<span class="hero-meter-value tabular-nums">{hudState.hp}/{hudState.maxHp}</span>
		</div>
		<div class="hero-meter">
			<span class="hero-meter-label">{t($locale, 'ui.xp')}</span>
			<div class="hero-meter-track">
				<span class="hero-meter-fill hero-meter-fill-xp" style={`width: ${xpPercent}%`}></span>
			</div>
			<span class="hero-meter-value tabular-nums">{hudState.xp}/{xpTarget}</span>
		</div>
		<div class="hero-stats">
			<span>
				{t($locale, 'ui.attack')}
				<b class="tabular-nums">{hudState.attack}</b>
			</span>
			<span>
				{t($locale, 'ui.defense')}
				<b class="tabular-nums">{hudState.defense}</b>
			</span>
		</div>
	</div>
</section>

{#if commandOpen && commandEnabled && onCommand}
	<CommandGrid enabled={commandEnabled} {onCommand} />
{/if}

<div
	class="heroic-side-hud"
	data-testid="hud-side-panel"
	aria-label={t($locale, 'ui.questTracker')}
>
	<section
		data-testid="hud-minimap"
		class="heroic-field-card minimap-card"
		aria-label={t($locale, 'ui.areaMap')}
	>
		<div class="minimap-medallion">
			<svg
				viewBox={`0 0 ${hudState.areaMap.worldWidth} ${hudState.areaMap.worldHeight}`}
				aria-hidden="true"
			>
				<rect
					class="minimap-fog"
					x="0"
					y="0"
					width={hudState.areaMap.worldWidth}
					height={hudState.areaMap.worldHeight}
				/>
				{#each hudState.areaMap.revealedCells as cellKey (cellKey)}
					{@const cell = parseCellKey(cellKey)}
					<rect
						class="minimap-cell"
						x={cell.column * hudState.areaMap.cellSize}
						y={cell.row * hudState.areaMap.cellSize}
						width={hudState.areaMap.cellSize}
						height={hudState.areaMap.cellSize}
					/>
				{/each}
				{#each hudState.areaMap.markers as marker (marker.id)}
					<circle
						class={`minimap-marker minimap-marker-${marker.kind} ${
							marker.emphasis ? 'minimap-marker-emphasis' : ''
						}`}
						cx={marker.x}
						cy={marker.y}
						r={marker.emphasis ? 96 : 64}
					/>
				{/each}
				<circle
					class="minimap-player-halo arcane-halo"
					cx={hudState.areaMap.player.x}
					cy={hudState.areaMap.player.y}
					r="120"
				/>
				<circle
					class="minimap-player"
					cx={hudState.areaMap.player.x}
					cy={hudState.areaMap.player.y}
					r="72"
				/>
			</svg>
		</div>
		<p class="minimap-location font-display">{hudState.areaMap.name}</p>
	</section>

	{#if hudState.quests.main}
		<aside class="heroic-field-card quest-banner" aria-label={t($locale, 'ui.questTracker')}>
			<p class="heroic-eyebrow quest-banner-eyebrow">✦ {t($locale, 'ui.mainQuest')}</p>
			<h2>{hudState.quests.main.title}</h2>
			<p class="quest-banner-objective">
				<span class="quest-dot quest-dot-current" aria-hidden="true"></span>
				{hudState.quests.main.objective}
			</p>
			{#if hudState.quests.side.length > 0}
				<p class="quest-banner-side">
					<span class="quest-dot" aria-hidden="true"></span>
					{t($locale, 'ui.sideActive', { count: hudState.quests.side.length })}
				</p>
			{/if}
		</aside>
	{/if}

	<div class="heroic-field-card wallet-pill">
		<span class="wallet-coin" aria-hidden="true"></span>
		<span class={`font-display tabular-nums${coinFlash ? ' arcane-coin-flash' : ''}`}
			>{hudState.wallet.coins}{t($locale, 'ui.goldSuffix')}</span
		>
	</div>
</div>

<div
	class="heroic-field-card heroic-field-status"
	role="status"
	aria-label={t($locale, 'ui.fieldStatus')}
	aria-live="polite"
>
	{#key fieldStatusKey}
		<span class="arcane-window-enter">{hudState.status}</span>
	{/key}
</div>

<style>
	.heroic-field-card {
		border: 1px solid color-mix(in srgb, var(--color-gold) 28%, var(--color-frame));
		border-radius: 1rem;
		background: radial-gradient(
			130% 120% at 78% 0%,
			var(--color-panel) 0%,
			var(--color-panel-deep) 52%,
			var(--color-ink) 100%
		);
		box-shadow:
			0 24px 70px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 246, 224, 0.08);
		color: var(--color-parchment);
	}

	/* ---- Hero card (portrait / level / HP / XP / stats) --------------- */
	.hero-card {
		position: absolute;
		top: 0.9rem;
		left: 0.9rem;
		z-index: 20;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.8rem;
		width: min(22.5rem, calc(100vw - 2rem));
		padding: 0.8rem;
		pointer-events: none;
	}

	.hero-portrait {
		position: relative;
		align-self: start;
	}

	.hero-portrait img {
		display: block;
		width: 4.6rem;
		height: 4.6rem;
		border: 2px solid color-mix(in srgb, var(--color-gold) 70%, transparent);
		border-radius: 999px;
		object-fit: cover;
		background: var(--color-ink);
	}

	.hero-level {
		position: absolute;
		bottom: -0.35rem;
		left: 50%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.7rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 80%, transparent);
		border-radius: 999px;
		padding: 0.08rem 0.42rem;
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		font-size: 0.66rem;
		font-weight: 900;
		transform: translateX(-50%);
	}

	.hero-copy {
		display: grid;
		min-width: 0;
		gap: 0.4rem;
	}

	.hero-name {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 1.05rem;
		font-weight: 900;
		letter-spacing: 0.04em;
		color: var(--color-parchment);
	}

	.hero-meter {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem;
	}

	.hero-meter-label {
		color: var(--color-muted);
		font-family: var(--font-display);
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.08em;
	}

	.hero-meter-track {
		height: 0.42rem;
		overflow: hidden;
		border: 1px solid rgba(255, 246, 224, 0.16);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-ink) 74%, transparent);
	}

	.hero-meter-fill {
		display: block;
		height: 100%;
		border-radius: 999px;
		transition: width 260ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.hero-meter-fill-hp {
		background: linear-gradient(90deg, #2f9b6e, var(--color-emerald));
	}

	.hero-meter-fill-xp {
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--color-violet) 55%, var(--color-ink)),
			var(--color-violet)
		);
	}

	.hero-meter-value {
		color: var(--color-parchment);
		font-size: 0.72rem;
		font-weight: 800;
	}

	.hero-stats {
		display: flex;
		gap: 1rem;
		margin-top: 0.15rem;
		border-top: 1px solid rgba(255, 246, 224, 0.14);
		padding-top: 0.45rem;
		color: var(--color-muted);
		font-family: var(--font-display);
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero-stats b {
		margin-left: 0.22rem;
		color: var(--color-parchment);
		font-size: 0.76rem;
	}

	/* ---- Right column: minimap medallion / quest banner / wallet ------- */
	.heroic-side-hud {
		position: absolute;
		top: 0.9rem;
		right: 0.9rem;
		z-index: 20;
		display: grid;
		justify-items: stretch;
		gap: 0.55rem;
		width: min(13.5rem, calc(100vw - 2rem));
		pointer-events: none;
	}

	.minimap-card {
		display: grid;
		justify-items: center;
		gap: 0.45rem;
		padding: 0.55rem;
	}

	.minimap-medallion {
		overflow: hidden;
		width: 7.6rem;
		height: 7.6rem;
		border: 2px solid color-mix(in srgb, var(--color-gold) 70%, transparent);
		border-radius: 999px;
		box-shadow:
			0 0 0 4px color-mix(in srgb, var(--color-panel-deep) 80%, transparent),
			0 0 22px color-mix(in srgb, var(--color-gold) 24%, transparent);
	}

	.minimap-medallion svg {
		display: block;
		width: 100%;
		height: 100%;
		image-rendering: pixelated;
	}

	.minimap-fog {
		fill: #142333;
	}

	.minimap-cell {
		fill: rgba(75, 133, 88, 0.82);
		stroke: rgba(255, 248, 232, 0.16);
		stroke-width: 8;
	}

	.minimap-marker {
		fill: rgba(255, 248, 232, 0.34);
		stroke: rgba(255, 248, 232, 0.82);
		stroke-width: 18;
	}

	.minimap-marker-exit,
	.minimap-marker-quest {
		fill: rgba(255, 208, 64, 0.42);
		stroke: var(--color-gold);
	}

	.minimap-marker-building {
		fill: rgba(159, 231, 255, 0.34);
		stroke: rgba(159, 231, 255, 0.82);
	}

	.minimap-marker-discovery {
		fill: rgba(159, 247, 203, 0.34);
		stroke: rgba(159, 247, 203, 0.82);
	}

	.minimap-marker-emphasis {
		filter: drop-shadow(0 0 32px rgba(255, 208, 64, 0.84));
	}

	.minimap-player {
		fill: #f05268;
		stroke: var(--color-parchment);
		stroke-width: 18;
	}

	.minimap-player-halo {
		fill: rgba(240, 97, 122, 0.5);
	}

	.minimap-location {
		justify-self: center;
		max-width: 100%;
		overflow: hidden;
		margin: 0;
		border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
		border-radius: 999px;
		padding: 0.18rem 0.7rem;
		background: color-mix(in srgb, var(--color-panel-deep) 85%, transparent);
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.68rem;
		font-weight: 700;
		color: var(--color-gold);
	}

	/* ---- Main quest banner --------------------------------------------- */
	.quest-banner {
		border-left: 3px solid var(--color-gold);
		padding: 0.6rem 0.75rem;
	}

	.quest-banner-eyebrow {
		font-size: 0.6rem;
	}

	.quest-banner h2 {
		margin: 0.3rem 0 0;
		overflow-wrap: anywhere;
		font-family: var(--font-display);
		font-size: 0.92rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.quest-banner-objective,
	.quest-banner-side {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		margin: 0.4rem 0 0;
		color: var(--color-muted);
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.3;
	}

	.quest-banner-side {
		color: var(--color-emerald);
		font-family: var(--font-display);
		font-size: 0.64rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.quest-dot {
		flex: none;
		width: 0.5rem;
		height: 0.5rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-ink) 55%, transparent);
	}

	.quest-dot-current {
		border-color: color-mix(in srgb, var(--color-gold) 80%, transparent);
		background: var(--color-gold);
	}

	/* ---- Wallet pill ---------------------------------------------------- */
	.wallet-pill {
		justify-self: end;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		border-radius: 999px;
		padding: 0.32rem 0.8rem;
		color: var(--color-gold);
		font-size: 1rem;
		font-weight: 700;
	}

	.wallet-coin {
		display: block;
		width: 0.85rem;
		height: 0.85rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 80%, transparent);
		border-radius: 999px;
		background: radial-gradient(
			circle at 35% 30%,
			var(--color-gold-bright),
			color-mix(in srgb, var(--color-gold) 70%, var(--color-ink))
		);
	}

	/* ---- Transient status ------------------------------------------------ */
	.heroic-field-status {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 7rem;
		z-index: 20;
		width: fit-content;
		max-width: min(24rem, calc(100vw - 2rem));
		margin-inline: auto;
		border-radius: 999px;
		padding: 0.52rem 0.85rem;
		font-size: 0.8rem;
		font-weight: 900;
		color: var(--color-sapphire);
		pointer-events: none;
	}

	@media (max-width: 720px) {
		.hero-card {
			top: 0.75rem;
			left: 0.75rem;
			/* Leave room for the Menu button pinned top-right. */
			width: min(19rem, calc(100vw - 7rem));
		}

		.heroic-side-hud {
			top: 10rem;
			right: 0.75rem;
			width: min(11rem, calc(100vw - 1.5rem));
		}

		.heroic-field-status {
			bottom: 16.5rem;
			max-width: min(24rem, calc(100vw - 1.5rem));
		}
	}
</style>
