<script lang="ts">
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
	import { fleeChannelDurationMs } from '$lib/game/core/battle-presentation';
	import {
		requestBattleCycleTarget,
		requestBattleFlee,
		requestHeal,
		requestUseItem
	} from '$lib/game/ui-bridge/store';
	import type { HudBattleActive, HudBattleFeedEntry, HudState } from '$lib/game/ui-bridge/events';

	interface Props {
		hudState: HudState;
		active: HudBattleActive;
	}

	let { hudState, active }: Props = $props();

	const hpRatio = $derived(hudState.hp / Math.max(hudState.maxHp, 1));
	const firstConsumable = $derived(hudState.inventory.consumables[0] ?? null);
	const fleeSeconds = $derived((fleeChannelDurationMs / 1000).toFixed(1));

	// Newest entry first (mockup order); older rows fade with age.
	const feedNewestFirst = $derived([...active.feed].reverse());

	let platesBox = $state<HTMLDivElement>();

	// Short viewports scroll the plate stack internally; when the target
	// cycles, keep the selected plate scrolled into view so the target
	// state never sits invisible beyond the stack's clip.
	$effect(() => {
		platesBox
			?.querySelector(`[data-unit-id="${active.targetUnitId}"]`)
			?.scrollIntoView({ block: 'nearest' });
	});

	function feedTone(kind: HudBattleFeedEntry['kind']) {
		if (kind === 'hit' || kind === 'defeat') return 'gold';
		if (kind === 'hurt') return 'rose';
		return 'heal';
	}

	function feedLabel(entry: HudBattleFeedEntry) {
		if (entry.kind === 'hit') {
			return t($locale, 'ui.battleFeedHit', { amount: entry.amount, name: entry.subject });
		}
		if (entry.kind === 'hurt') {
			return t($locale, 'ui.battleFeedHurt', { amount: entry.amount, name: entry.subject });
		}
		if (entry.kind === 'heal') {
			return t($locale, 'ui.battleFeedHeal', { amount: entry.amount, name: entry.subject });
		}
		return t($locale, 'ui.battleFeedDefeat', { name: entry.subject });
	}
</script>

<section class="battle-hud" data-testid="battle-hud" aria-label={t($locale, 'ui.battleHud')}>
	<!-- TURN/AUTO readiness ribbon -->
	<div class="battle-ribbon" data-testid="battle-ribbon">
		<span class="battle-ribbon-label font-display">{t($locale, 'ui.battleTurn')}</span>
		<div class="battle-ribbon-slots">
			{#each active.ribbon as entry (entry.unitId)}
				<span
					class="battle-ribbon-slot"
					class:battle-ribbon-slot-hero={entry.unitId === 'hero'}
					class:battle-ribbon-slot-ready={entry.readyAt <= active.now}
					aria-hidden="true"
				>
					{#if entry.unitId === 'hero'}
						<svg viewBox="0 0 16 16"
							><path
								d="M8 8.2a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Zm-5.4 6a5.4 5.4 0 0 1 10.8 0Z"
							/></svg
						>
					{:else}
						<img src={active.enemies.find((e) => e.unitId === entry.unitId)?.artPath} alt="" />
					{/if}
				</span>
			{/each}
		</div>
		<span class="battle-ribbon-divider" aria-hidden="true"></span>
		<span class="battle-ribbon-auto font-display">
			<svg viewBox="0 0 16 16" aria-hidden="true">
				<path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.6v2.6h-2.6" />
			</svg>
			{t($locale, 'ui.battleAuto')}
		</span>
	</div>

	<!-- Enemy plates -->
	<div
		class="battle-plates"
		class:battle-plates-dense={active.enemies.length > 4}
		bind:this={platesBox}
		data-testid="battle-plates"
	>
		{#each active.enemies as enemy (enemy.unitId)}
			{#if !enemy.defeated}
				<button
					type="button"
					class="battle-plate"
					class:battle-plate-target={enemy.unitId === active.targetUnitId}
					data-testid="battle-plate"
					data-unit-id={enemy.unitId}
					aria-pressed={enemy.unitId === active.targetUnitId}
					aria-label={`${enemy.name} ${enemy.hp}/${enemy.maxHp}`}
					onclick={() => requestBattleCycleTarget(1)}
				>
					<span class="battle-plate-arrow" aria-hidden="true">
						<svg viewBox="0 0 16 16"><path d="m6 3.5 5 4.5-5 4.5" /></svg>
					</span>
					<span class="battle-plate-badge" aria-hidden="true">
						<img src={enemy.artPath} alt="" />
						<b class="font-display tabular-nums">{enemy.hp}</b>
					</span>
					<span class="battle-plate-copy">
						<span class="battle-plate-name font-display">{enemy.name}</span>
						<span
							class="battle-plate-status font-display"
							class:battle-plate-status-target={enemy.unitId === active.targetUnitId}
						>
							{#if enemy.unitId === active.targetUnitId}
								+ {t($locale, 'ui.battleTargeted')}
							{:else}
								<svg viewBox="0 0 16 16" aria-hidden="true">
									<circle cx="8" cy="8" r="5.6" />
									<path d="M8 5.2V8l1.9 1.6" />
								</svg>
								{t($locale, 'ui.battleWaiting')}
							{/if}
						</span>
					</span>
				</button>
			{/if}
		{/each}
	</div>

	<!-- Combat feed -->
	<div
		class="battle-feed"
		data-testid="battle-feed"
		role="log"
		aria-live="polite"
		aria-label={t($locale, 'ui.battleFeed')}
	>
		{#each feedNewestFirst as entry, index (entry.id)}
			<div
				class={`battle-feed-row battle-feed-row-${feedTone(entry.kind)}`}
				style={`opacity: ${1 - index * 0.22}`}
			>
				<span class="battle-feed-icon" aria-hidden="true">
					{#if entry.kind === 'hit'}
						<svg viewBox="0 0 16 16"><path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" /></svg>
					{:else if entry.kind === 'hurt'}
						<svg viewBox="0 0 16 16"
							><path
								d="M8 13.6C4.6 11.2 2.4 9 2.4 6.5a3.1 3.1 0 0 1 5.6-1.8A3.1 3.1 0 0 1 13.6 6.5c0 2.5-2.2 4.7-5.6 7.1Z"
							/></svg
						>
					{:else if entry.kind === 'heal'}
						<svg viewBox="0 0 16 16"
							><path d="M6 2.6h4M6.8 2.6v3L4.4 9.4a3.9 3.9 0 1 0 7.2 0L9.2 5.6v-3" /></svg
						>
					{:else}
						<svg viewBox="0 0 16 16"
							><circle cx="8" cy="8" r="5.6" /><path
								d="M5.8 7h.01M10.2 7h.01M5.8 10.4c1.4 1 3 1 4.4 0"
							/></svg
						>
					{/if}
				</span>
				<span class="battle-feed-text font-display tabular-nums">{feedLabel(entry)}</span>
			</div>
		{/each}
	</div>

	<!-- Hero plate -->
	<div class="battle-hero" data-testid="battle-hero-plate">
		<span class="battle-hero-bust">
			<img src="/game/assets/heroic-ui/liam-portrait.png" alt="" aria-hidden="true" />
		</span>
		<span class="battle-hero-gauge" aria-hidden="true">
			<svg viewBox="0 0 44 44">
				<circle class="battle-hero-gauge-track" cx="22" cy="22" r="19" />
				<circle
					class="battle-hero-gauge-fill"
					cx="22"
					cy="22"
					r="19"
					style={`stroke-dashoffset: ${58 * (1 - hpRatio)}`}
				/>
			</svg>
			<b class="font-display tabular-nums">{hudState.hp}<i>/{hudState.maxHp}</i></b>
		</span>
		<span class="battle-hero-copy">
			<span class="battle-hero-name font-display">{t($locale, 'ui.heroName')}</span>
			<span class="battle-hero-chips font-display tabular-nums">
				<span>
					<svg viewBox="0 0 16 16" aria-hidden="true"
						><path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" /></svg
					>
					{hudState.attack}
				</span>
				<span>
					<svg viewBox="0 0 16 16" aria-hidden="true"
						><path d="M8 2.2 12.8 4v4.1c0 2.9-2 4.6-4.8 5.7-2.8-1.1-4.8-2.8-4.8-5.7V4Z" /></svg
					>
					{hudState.defense}
				</span>
			</span>
		</span>
	</div>

	<!-- Command tiles -->
	<div class="battle-tiles" data-testid="battle-tiles">
		<div class="battle-tile-group">
			<button
				type="button"
				class="battle-tile battle-tile-heal font-display"
				disabled={active.heals < 1 || hudState.hp >= hudState.maxHp}
				aria-label={t($locale, 'ui.battleHeal')}
				data-testid="battle-tile-heal"
				onclick={requestHeal}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true"
					><path
						d="M8 13.6C4.6 11.2 2.4 9 2.4 6.5a3.1 3.1 0 0 1 5.6-1.8A3.1 3.1 0 0 1 13.6 6.5c0 2.5-2.2 4.7-5.6 7.1Z"
					/></svg
				>
				<span class="battle-tile-label-row">{t($locale, 'ui.battleHeal')}</span>
				<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
			</button>
			<span class="battle-tile-caption font-display">
				{active.heals === 1
					? t($locale, 'ui.battleOneCharge')
					: t($locale, 'ui.battleCharges', { count: active.heals })}
			</span>
		</div>
		<div class="battle-tile-group">
			<button
				type="button"
				class="battle-tile font-display"
				disabled={!firstConsumable}
				aria-label={t($locale, 'ui.battleItem')}
				data-testid="battle-tile-item"
				onclick={() => firstConsumable && requestUseItem(firstConsumable.itemId)}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true"
					><path d="M6 2.6h4M6.8 2.6v3L4.4 9.4a3.9 3.9 0 1 0 7.2 0L9.2 5.6v-3" /></svg
				>
				<span class="battle-tile-label-row">{t($locale, 'ui.battleItem')}</span>
				<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="X" />
			</button>
			<span class="battle-tile-caption font-display">
				{t($locale, 'ui.battleItemsInBag', { count: active.items })}
			</span>
		</div>
		<div class="battle-tile-group">
			<button
				type="button"
				class="battle-tile font-display"
				disabled={active.flee.status === 'channeling'}
				aria-label={t($locale, 'ui.battleFlee')}
				data-testid="battle-tile-flee"
				onclick={requestBattleFlee}
			>
				<svg viewBox="0 0 16 16" aria-hidden="true"
					><path d="M4.5 14V2.5h7.4L9.6 5.4l2.3 2.9H4.5" /></svg
				>
				<span class="battle-tile-label-row">{t($locale, 'ui.battleFlee')}</span>
				<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="B" tone="b" />
			</button>
			<span class="battle-tile-caption font-display tabular-nums">
				{#if active.flee.status === 'channeling'}
					{Math.round(active.flee.progress * 100)}%
				{:else}
					{fleeSeconds}s
				{/if}
			</span>
		</div>
	</div>
</section>

<style>
	.battle-hud {
		position: absolute;
		inset: 0;
		z-index: 20;
		pointer-events: none;
		color: var(--color-parchment);
	}

	/* ---- TURN/AUTO ribbon ---------------------------------------------- */
	.battle-ribbon {
		position: absolute;
		top: 1.55rem;
		left: 50%;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 30%, var(--color-frame));
		border-radius: 999px;
		padding: 0.42rem 0.95rem;
		background: radial-gradient(
			120% 160% at 50% 0%,
			var(--color-panel) 0%,
			var(--color-panel-deep) 60%,
			var(--color-ink) 100%
		);
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.55);
		transform: translateX(-50%);
	}

	.battle-ribbon-label,
	.battle-ribbon-auto {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-gold);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		text-transform: uppercase;
	}

	.battle-ribbon-auto svg {
		width: 0.85rem;
		height: 0.85rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.battle-ribbon-slots {
		display: flex;
		align-items: center;
		gap: 0.42rem;
	}

	.battle-ribbon-slot {
		display: grid;
		place-items: center;
		width: 1.85rem;
		height: 1.85rem;
		overflow: hidden;
		border: 1px solid var(--color-frame);
		border-radius: 0.62rem;
		background: color-mix(in srgb, var(--color-ink) 55%, transparent);
	}

	.battle-ribbon-slot img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.battle-ribbon-slot svg {
		width: 1rem;
		height: 1rem;
		fill: var(--color-muted);
	}

	.battle-ribbon-slot-hero {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-shade));
	}

	.battle-ribbon-slot-hero svg {
		fill: #3a2c07;
	}

	.battle-ribbon-slot-ready {
		box-shadow: 0 0 10px color-mix(in srgb, var(--color-gold) 40%, transparent);
	}

	.battle-ribbon-divider {
		width: 1px;
		height: 1.5rem;
		background: rgba(255, 246, 224, 0.18);
	}

	/* ---- Enemy plates ---------------------------------------------------- */
	.battle-plates {
		position: absolute;
		top: 7.4rem;
		right: 2.75rem;
		display: grid;
		gap: 0.75rem;
		justify-items: end;
	}

	.battle-plate {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		width: 23.375rem;
		border: 1px solid var(--color-frame);
		border-radius: 1rem;
		padding: 0.875rem 1.125rem;
		background: linear-gradient(180deg, var(--color-panel), var(--color-panel-deep));
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
		color: var(--color-parchment);
		text-align: left;
		pointer-events: auto;
		cursor: pointer;
	}

	.battle-plate-target {
		border-color: rgba(255, 138, 168, 0.75);
		box-shadow:
			0 18px 44px rgba(0, 0, 0, 0.5),
			0 0 22px rgba(249, 115, 155, 0.28);
	}

	.battle-plate-arrow {
		position: absolute;
		left: -0.85rem;
		display: none;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border: 1px solid rgba(255, 255, 255, 0.4);
		border-radius: 999px;
		background: linear-gradient(180deg, #f9739b, #e4487f);
		box-shadow: 0 0 14px rgba(249, 115, 155, 0.45);
	}

	.battle-plate-target .battle-plate-arrow {
		display: grid;
	}

	.battle-plate-arrow svg {
		width: 0.8rem;
		height: 0.8rem;
		fill: none;
		stroke: #ffffff;
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.battle-plate-badge {
		position: relative;
		display: grid;
		place-items: center;
		flex: none;
		width: 2.7rem;
		height: 2.7rem;
		border: 2px solid rgba(249, 115, 155, 0.8);
		border-radius: 999px;
		background: var(--color-ink);
	}

	.battle-plate-badge img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border-radius: 999px;
		object-fit: cover;
		opacity: 0.55;
	}

	.battle-plate-badge b {
		position: relative;
		font-size: 1rem;
		font-weight: 900;
		text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
	}

	.battle-plate-copy {
		display: grid;
		gap: 0.16rem;
		min-width: 0;
	}

	.battle-plate-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 1.02rem;
		font-weight: 900;
	}

	.battle-plate-status {
		display: inline-flex;
		align-items: center;
		gap: 0.32rem;
		color: #9db4d8;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.battle-plate-status svg {
		width: 0.75rem;
		height: 0.75rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
	}

	.battle-plate-status-target {
		color: #f9739b;
	}

	/* Many enemies: compact rows so the stack fits the viewport. */
	.battle-plates-dense {
		gap: 0.35rem;
	}

	.battle-plates-dense .battle-plate {
		width: 16.5rem;
		padding: 0.32rem 0.7rem 0.32rem 1.4rem;
	}

	.battle-plates-dense .battle-plate-badge {
		width: 2.1rem;
		height: 2.1rem;
	}

	.battle-plates-dense .battle-plate-name {
		font-size: 0.85rem;
	}

	.battle-plates-dense .battle-plate-status {
		display: none;
	}

	/* ---- Combat feed ------------------------------------------------------ */
	.battle-feed {
		position: absolute;
		bottom: 15.5rem;
		left: 2.75rem;
		display: grid;
		gap: 0.62rem;
	}

	.battle-feed-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.battle-feed-icon {
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.55rem;
		background: color-mix(in srgb, var(--color-ink) 55%, transparent);
	}

	.battle-feed-icon svg {
		width: 0.9rem;
		height: 0.9rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.7;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.battle-feed-row-gold .battle-feed-icon {
		border-color: rgba(255, 232, 168, 0.7);
		color: var(--color-gold);
	}

	.battle-feed-row-rose .battle-feed-icon {
		border-color: rgba(249, 115, 155, 0.6);
		color: #f9739b;
	}

	.battle-feed-row-heal .battle-feed-icon {
		border-color: rgba(159, 247, 203, 0.55);
		color: var(--color-emerald);
	}

	.battle-feed-text {
		font-size: 0.78rem;
		font-weight: 800;
		letter-spacing: 0.06em;
	}

	.battle-feed-row-gold .battle-feed-text {
		color: var(--color-gold);
	}

	.battle-feed-row-rose .battle-feed-text {
		color: #f2b8c6;
	}

	.battle-feed-row-heal .battle-feed-text {
		color: #9ff7cb;
	}

	/* ---- Hero plate -------------------------------------------------------- */
	.battle-hero {
		position: absolute;
		bottom: 2.4rem;
		left: 2.75rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 85%, transparent);
		border-radius: 1.1rem;
		padding: 1.25rem 1.75rem 1.25rem 1.25rem;
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
	}

	.battle-hero-bust img {
		display: block;
		width: 5.6rem;
		height: 5.6rem;
		border: 2px solid rgba(249, 115, 155, 0.7);
		border-radius: 999px;
		object-fit: cover;
		background: var(--color-ink);
	}

	.battle-hero-gauge {
		position: relative;
		display: grid;
		place-items: center;
		width: 4.5rem;
		height: 4.5rem;
	}

	.battle-hero-gauge svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: rotate(-90deg);
	}

	.battle-hero-gauge circle {
		fill: none;
		stroke-width: 3.4;
		stroke-linecap: round;
	}

	.battle-hero-gauge-track {
		stroke: color-mix(in srgb, var(--color-ink) 70%, transparent);
	}

	.battle-hero-gauge-fill {
		stroke: #f9739b;
		stroke-dasharray: 58 58;
		transition: stroke-dashoffset 260ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.battle-hero-gauge b {
		display: grid;
		justify-items: center;
		font-size: 1.05rem;
		font-weight: 900;
		line-height: 1;
	}

	.battle-hero-gauge b i {
		font-size: 0.55rem;
		font-style: normal;
		font-weight: 800;
		color: var(--color-muted);
	}

	.battle-hero-copy {
		display: grid;
		gap: 0.5rem;
	}

	.battle-hero-name {
		font-size: 1.35rem;
		font-weight: 900;
	}

	.battle-hero-chips {
		display: flex;
		gap: 0.55rem;
	}

	.battle-hero-chips span {
		display: inline-flex;
		align-items: center;
		gap: 0.28rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.5rem;
		padding: 0.14rem 0.5rem;
		background: color-mix(in srgb, var(--color-ink) 55%, transparent);
		color: #8fb9e8;
		font-size: 0.72rem;
		font-weight: 800;
	}

	.battle-hero-chips span:last-child {
		color: var(--color-emerald);
	}

	.battle-hero-chips svg {
		width: 0.72rem;
		height: 0.72rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* ---- Command tiles ------------------------------------------------------ */
	.battle-tiles {
		position: absolute;
		bottom: 2.4rem;
		right: 3.2rem;
		display: flex;
		align-items: end;
		gap: 1.15rem;
	}

	.battle-tile-group {
		display: grid;
		justify-items: center;
		gap: 0.45rem;
	}

	.battle-tile {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.4rem;
		width: 6.75rem;
		min-height: 6.75rem;
		border: 1px solid var(--color-frame);
		border-radius: 1rem;
		padding: 0.95rem 0.5rem 0.75rem;
		background: linear-gradient(180deg, var(--color-panel), var(--color-panel-deep));
		box-shadow: 0 18px 44px rgba(0, 0, 0, 0.5);
		color: var(--color-parchment);
		font-size: 0.78rem;
		font-weight: 800;
		pointer-events: auto;
	}

	.battle-tile svg:first-child {
		width: 1.4rem;
		height: 1.4rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.battle-tile-heal {
		border-color: rgba(255, 255, 255, 0.95);
		/* Mockup selected intervene tile: bright cream, not yellow-gold. */
		background: linear-gradient(180deg, #fff6dc, #f2c886);
		color: #3a2c07;
		box-shadow: 0 0 26px rgba(255, 206, 110, 0.45);
	}

	.battle-tile:disabled:not(.battle-tile-heal) {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.battle-tile-heal:disabled {
		cursor: not-allowed;
		/* Mute by desaturating instead of opacity-blending into the navy
		   backdrop, so the disabled tile keeps its cream hue (mockup tint). */
		opacity: 1;
		filter: saturate(0.45) brightness(0.78);
	}

	.battle-tile :global(.heroic-prompt-glyph) {
		position: absolute;
		right: 0.35rem;
		bottom: 0.45rem;
		transform: scale(0.82);
		transform-origin: right bottom;
	}

	.battle-tile-label-row {
		display: grid;
		place-items: center;
		width: 100%;
		padding-right: 1rem;
	}

	.battle-tile-caption {
		color: var(--color-muted);
		font-size: 0.66rem;
		font-weight: 800;
		letter-spacing: 0.04em;
	}

	@media (max-width: 720px) {
		.battle-plates {
			top: 5.6rem;
			transform: scale(0.86);
			transform-origin: top right;
		}

		.battle-feed {
			bottom: 14rem;
			left: 0.9rem;
		}

		.battle-hero {
			bottom: 1.1rem;
			left: 0.9rem;
			transform: scale(0.86);
			transform-origin: bottom left;
		}

		.battle-tiles {
			bottom: 1.1rem;
			right: 0.9rem;
			gap: 0.7rem;
		}

		.battle-tile {
			width: 5rem;
			min-height: 4.75rem;
		}
	}

	/* Short viewports (e.g. 640×360, but any width — the Tauri window is
	   resizable): the plate stack has no height bound, so a large encounter
	   runs past the viewport floor — targets stayed selectable while
	   invisible under the shell's overflow: clip — and the 4-row feed rises
	   past the viewport top. Compact the plates and bound the stack above
	   the command tiles with internal scroll (the selected target is scrolled
	   back into view); the feed drops lower with a cap. Taller viewports
	   keep the desktop composition untouched. */
	@media (max-height: 559px) {
		.battle-plates {
			max-height: calc(100vh - 15.5rem);
			overflow-y: auto;
			/* Keep the target arrow (left: -0.85rem) inside the scroll box. */
			padding-left: 1rem;
			gap: 0.25rem;
		}

		.battle-plate {
			width: 16.5rem;
			padding: 0.25rem 0.7rem 0.25rem 1.4rem;
		}

		.battle-plate-badge {
			width: 1.5rem;
			height: 1.5rem;
		}

		.battle-plate-name {
			font-size: 0.8rem;
		}

		.battle-plate-status {
			display: none;
		}

		.battle-feed {
			bottom: 10rem;
			max-height: calc(100vh - 12.5rem);
			overflow-y: auto;
		}
	}
</style>
