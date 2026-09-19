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

	// Local window around the player (6×6 cells, clamped to the world). A fresh
	// run only reveals the spawn vicinity; a full-world viewBox would squeeze
	// those cells into invisible specks inside the medallion.
	const minimapView = $derived.by(() => {
		const areaMap = hudState.areaMap;
		const span = areaMap.cellSize * 6;
		const x = Math.min(
			Math.max(areaMap.player.x - span / 2, 0),
			Math.max(0, areaMap.worldWidth - span)
		);
		const y = Math.min(
			Math.max(areaMap.player.y - span / 2, 0),
			Math.max(0, areaMap.worldHeight - span)
		);
		return `${x} ${y} ${span} ${span}`;
	});

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

<div class="heroic-hud-top">
	<section
		data-testid="hud-party-panel"
		class={`heroic-field-card filigree-frame hero-card${lowHp ? ' heroic-low-hp' : ''}`}
		aria-label={t($locale, 'ui.playerStatus')}
	>
		<div class="hero-portrait">
			<img
				src="/game/assets/heroic-ui/liam-portrait.png"
				alt=""
				aria-hidden="true"
				draggable="false"
			/>
			<span class="hero-level font-display tabular-nums" class:heroic-level-up={levelUpFlash}>
				<span class="sr-only" class:heroic-level-up={levelUpFlash}
					>{t($locale, 'ui.levelAbbrev')} {hudState.level}</span
				>
				<span aria-hidden="true">{hudState.level}</span>
			</span>
		</div>
		<div class="hero-copy">
			<p class="hero-name font-display">{t($locale, 'ui.heroName')}</p>
			<div class="hero-meter">
				<span class="hero-meter-label hero-meter-label-hp">{t($locale, 'ui.hp')}</span>
				<div class="hero-meter-track">
					<span class="hero-meter-fill hero-meter-fill-hp" style={`width: ${hpPercent}%`}></span>
				</div>
				<span class="hero-meter-value tabular-nums">{hudState.hp}/{hudState.maxHp}</span>
			</div>
			<div class="hero-meter">
				<span class="hero-meter-label hero-meter-label-xp">{t($locale, 'ui.xp')}</span>
				<div class="hero-meter-track">
					<span class="hero-meter-fill hero-meter-fill-xp" style={`width: ${xpPercent}%`}></span>
				</div>
				<span class="hero-meter-value tabular-nums">{hudState.xp}/{xpTarget}</span>
			</div>
			<div class="hero-stats">
				<span>
					<svg class="hero-stat-glyph hero-stat-glyph-atk" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
					</svg>
					{t($locale, 'ui.attack')}
					<b class="tabular-nums">{hudState.attack}</b>
				</span>
				<span>
					<svg class="hero-stat-glyph hero-stat-glyph-def" viewBox="0 0 16 16" aria-hidden="true">
						<path d="M8 2.2 12.8 4v4.1c0 2.9-2 4.6-4.8 5.7-2.8-1.1-4.8-2.8-4.8-5.7V4Z" />
					</svg>
					{t($locale, 'ui.defense')}
					<b class="tabular-nums">{hudState.defense}</b>
				</span>
			</div>
		</div>
	</section>

	<div class="heroic-hud-row">
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
					<svg viewBox={minimapView} aria-hidden="true">
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
							class="minimap-player-halo heroic-halo"
							cx={hudState.areaMap.player.x}
							cy={hudState.areaMap.player.y}
							r="72"
						/>
						<circle
							class="minimap-player"
							cx={hudState.areaMap.player.x}
							cy={hudState.areaMap.player.y}
							r="40"
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
				<span class={`font-display tabular-nums${coinFlash ? ' heroic-coin-flash' : ''}`}
					>{hudState.wallet.coins}{t($locale, 'ui.goldSuffix')}</span
				>
			</div>
		</div>
	</div>
</div>

<!-- The live region must survive grid open/close: unmounting it swallows
		status changes (Rest at full HP was silent). While the grid is open it's
		kept in the a11y tree but visually offscreen. -->
<div
	class="heroic-field-card heroic-field-status"
	class:heroic-field-status-offscreen={commandOpen}
	role="status"
	aria-label={t($locale, 'ui.fieldStatus')}
	aria-live="polite"
>
	{#key fieldStatusKey}
		<span class:heroic-anim={!commandOpen}>{hudState.status}</span>
	{/key}
</div>

<style>
	.heroic-field-card {
		border: 1px solid color-mix(in srgb, var(--color-gold) 85%, transparent);
		border-radius: 1.5rem;
		background: linear-gradient(
			135deg,
			rgba(34, 74, 164, 0.9),
			rgba(12, 26, 74, 0.94) 55%,
			rgba(46, 28, 96, 0.9)
		);
		box-shadow:
			0 22px 52px rgba(0, 0, 0, 0.6),
			inset 0 0 0 4px rgba(255, 214, 120, 0.14),
			inset 0 0 34px rgba(90, 150, 255, 0.2),
			inset 0 2px 0 rgba(255, 255, 255, 0.3);
		color: var(--color-parchment);
	}

	/* ---- Hero card (portrait / level / HP / XP / stats) --------------- */
	.hero-card {
		position: absolute;
		top: 2.125rem;
		left: 2.125rem;
		z-index: 20;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 1rem;
		width: min(23.125rem, calc(100vw - 2rem));
		min-height: 12.375rem;
		padding: 1.125rem 1.875rem 1.125rem 1.25rem;
		pointer-events: none;
	}

	/* Gold corner-bracket inlay (same etched treatment as the dialogue bar). */
	.hero-card::before,
	.hero-card::after {
		content: '';
		position: absolute;
		width: 1.5rem;
		height: 1.5rem;
		border: 2px solid rgba(255, 224, 138, 0.9);
		pointer-events: none;
	}

	.hero-card::before {
		top: 9px;
		left: 9px;
		border-top-left-radius: 14px;
		border-right: 0;
		border-bottom: 0;
	}

	.hero-card::after {
		right: 9px;
		bottom: 9px;
		/* Mockup brackets are asymmetric: 14px top-left / 20px bottom-right. */
		border-bottom-right-radius: 20px;
		border-left: 0;
		border-top: 0;
	}

	.hero-portrait {
		position: relative;
		align-self: center;
	}

	.hero-portrait img {
		display: block;
		width: 5.6rem;
		height: 5.6rem;
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
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-shade));
		color: #3a2c07;
		font-size: 0.66rem;
		font-weight: 900;
		transform: translateX(-50%);
	}

	.hero-copy {
		display: grid;
		min-width: 0;
		gap: 0.55rem;
	}

	.hero-name {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 1.7rem;
		font-weight: 900;
		letter-spacing: 0.01em;
		color: var(--color-parchment);
	}

	.hero-meter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.hero-meter-label {
		font-family: var(--font-display);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.14em;
	}

	.hero-meter-label-hp {
		color: #9ef0bd;
	}

	.hero-meter-label-xp {
		color: #f3d9ff;
	}

	.hero-meter-track {
		/* Mockup keeps the bar mid-row and pushes the n/max flush right. */
		flex: 0 1 9.75rem;
		height: 0.46rem;
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
		margin-left: auto;
		color: var(--color-parchment);
		font-size: 1.12rem;
		font-weight: 900;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.6);
	}

	.hero-stats {
		display: flex;
		gap: 1.1rem;
		margin-top: 0.3rem;
		border-top: 1px solid rgba(255, 246, 224, 0.14);
		padding-top: 0.6rem;
		color: var(--color-muted);
		font-family: var(--font-display);
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero-stat-glyph {
		display: inline-block;
		width: 0.72rem;
		height: 0.72rem;
		margin-right: 0.28rem;
		vertical-align: -0.06em;
		fill: none;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.hero-stat-glyph-atk {
		stroke: #8fb9e8;
	}

	.hero-stat-glyph-def {
		stroke: var(--color-emerald);
	}

	.hero-stats b {
		margin-left: 0.22rem;
		color: var(--color-parchment);
		font-size: 0.76rem;
	}

	/* Layout-neutral wrappers: outside the narrow-portrait breakpoint they
	   generate no box, so the card, command grid and side HUD keep their
	   absolute anchors against the game shell. */
	.heroic-hud-top,
	.heroic-hud-row {
		display: contents;
	}

	/* ---- Right column: minimap medallion / quest banner / wallet ------- */
	.heroic-side-hud {
		position: absolute;
		top: 2.125rem;
		right: 2.125rem;
		z-index: 20;
		display: grid;
		justify-items: end;
		gap: 1.125rem;
		width: min(20.5rem, calc(100vw - 2rem));
		pointer-events: none;
	}

	.minimap-card {
		display: grid;
		justify-items: center;
		padding: 0;
		border: 0;
		background: none;
		box-shadow: none;
	}

	.minimap-medallion {
		overflow: hidden;
		width: 13.4rem;
		height: 13.4rem;
		border: 4px solid color-mix(in srgb, var(--color-gold) 82%, transparent);
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
		/* Overlaps the medallion's lower edge like the source composition. */
		z-index: 1;
		justify-self: center;
		max-width: 100%;
		overflow: hidden;
		margin: -1rem 0 0;
		border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
		border-radius: 999px;
		padding: 0.22rem 0.8rem;
		background: color-mix(in srgb, var(--color-panel-deep) 90%, transparent);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--color-gold);
	}

	/* ---- Main quest banner --------------------------------------------- */
	.quest-banner {
		width: 100%;
		margin-top: 0.75rem;
		border-radius: 0.25rem 1.25rem 1.25rem 0.25rem;
		border-left: 7px solid var(--color-gold);
		padding: 1rem 1.25rem;
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
		border-radius: 999px;
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
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

	/* Same specificity as .heroic-field-status above; source order wins. */
	.heroic-field-status-offscreen {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	/* Narrow portrait: flow the card above the command-grid / side-HUD row so
	   the gap is real no matter how tall the card renders — a fixed top anchor
	   silently overlapped the card once its content grew past min-height. */
	@media (max-width: 720px) and (min-height: 560px) {
		.heroic-hud-top {
			position: absolute;
			top: 0.75rem;
			left: 0.75rem;
			right: 0.75rem;
			z-index: 20;
			display: flex;
			flex-direction: column;
			gap: 0.625rem;
			pointer-events: none;
		}

		.heroic-hud-row {
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: 0.75rem;
			width: 100%;
		}

		.hero-card {
			position: relative;
			top: auto;
			left: auto;
			/* Leave room for the Menu button pinned top-right. */
			width: min(19rem, calc(100vw - 7rem));
		}

		.heroic-side-hud {
			position: relative;
			top: auto;
			right: auto;
			margin-left: auto;
			width: min(11rem, calc(100vw - 1.5rem));
			gap: 0.6rem;
		}

		.minimap-medallion {
			width: 7rem;
			height: 7rem;
		}
		.quest-banner {
			padding: 0.65rem 0.7rem;
			margin-top: 0;
		}

		.heroic-field-status {
			bottom: 16.5rem;
			max-width: min(24rem, calc(100vw - 1.5rem));
		}
	}

	@media (max-height: 559px) {
		.hero-card {
			top: 0.75rem;
			left: 0.9rem;
			min-height: 0;
			width: 19rem;
			gap: 0.7rem;
			padding: 0.6rem 0.85rem;
		}
		.hero-copy {
			gap: 0.25rem;
		}
		.hero-name {
			font-size: 1.15rem;
		}
		.hero-portrait img {
			width: 3.2rem;
			height: 3.2rem;
		}
		.hero-meter-value {
			font-size: 0.9rem;
		}
		.hero-stats {
			margin-top: 0;
			padding-top: 0.25rem;
		}
		.heroic-side-hud {
			top: 0.75rem;
			right: 0.75rem;
			width: 11rem;
			gap: 0.6rem;
		}
		.minimap-medallion {
			width: 6rem;
			height: 6rem;
		}
		.quest-banner {
			padding: 0.65rem 0.7rem;
			margin-top: 0;
		}
	}
</style>
