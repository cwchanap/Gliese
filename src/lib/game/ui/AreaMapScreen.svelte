<script lang="ts">
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { parseCellKey } from '$lib/game/core/map-exploration';
	import type { HudAreaMapState } from '$lib/game/core/area-map';

	interface Props {
		open: boolean;
		areaMap: HudAreaMapState;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		open,
		areaMap,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onkeydown
	}: Props = $props();

	let focusedMarkerId = $state<string | null>(null);
	const focusedMarkerLabel = $derived(
		areaMap.markers.find((marker) => marker.id === focusedMarkerId)?.label ?? null
	);

	$effect(() => {
		if (!open) focusedMarkerId = null;
	});
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="glass-panel-strong arcane-window-enter jrpg-window jrpg-area-map-window"
			aria-label={t($locale, 'ui.areaMapDialog', { areaName: areaMap.name })}
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<div class="jrpg-window-header">
				<div>
					<p class="jrpg-label">{t($locale, 'ui.areaMap')}</p>
					<h2 class="jrpg-window-title font-display">{areaMap.name}</h2>
				</div>
				<button
					bind:this={closeButton}
					type="button"
					class="glass-button jrpg-small-button"
					onclick={onClose}
				>
					{t($locale, 'ui.close')}
				</button>
			</div>
			<div class="jrpg-window-body">
				<div class="jrpg-area-map-frame">
					<svg
						data-testid="area-map-svg"
						class="area-map-svg"
						viewBox={`0 0 ${areaMap.worldWidth} ${areaMap.worldHeight}`}
						role="img"
						aria-label={t($locale, 'ui.areaMapDialog', {
							areaName: areaMap.name
						})}
					>
						<rect
							class="area-map-fog"
							x="0"
							y="0"
							width={areaMap.worldWidth}
							height={areaMap.worldHeight}
						/>
						{#each areaMap.revealedCells as cellKey (cellKey)}
							{@const cell = parseCellKey(cellKey)}
							<rect
								class="area-map-revealed-cell"
								x={cell.column * areaMap.cellSize}
								y={cell.row * areaMap.cellSize}
								width={areaMap.cellSize}
								height={areaMap.cellSize}
							/>
						{/each}
						{#each areaMap.markers as marker (marker.id)}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<g
								class={`area-map-marker area-map-marker-${marker.kind} ${
									marker.emphasis ? 'area-map-marker-emphasis' : ''
								}`}
								role="img"
								transform={`translate(${marker.x} ${marker.y})`}
								tabindex="0"
								aria-label={marker.label}
								onfocus={() => (focusedMarkerId = marker.id)}
								onblur={() => {
									if (focusedMarkerId === marker.id) focusedMarkerId = null;
								}}
							>
								<circle r={marker.emphasis ? 64 : 48} />
								<text x="76" y="18">{marker.label}</text>
							</g>
						{/each}
						<circle
							data-testid="area-map-player"
							class="area-map-player-marker"
							cx={areaMap.player.x}
							cy={areaMap.player.y}
							r="54"
						>
							<title>{t($locale, 'ui.currentPosition')}</title>
						</circle>
					</svg>
				</div>
				<div class="jrpg-area-map-legend">
					<span><i class="area-map-legend-current"></i>{t($locale, 'ui.currentPosition')}</span>
					<span><i class="area-map-legend-unexplored"></i>{t($locale, 'ui.unexplored')}</span>
				</div>
				<p class="jrpg-area-map-selected" data-testid="area-map-selected" aria-live="polite">
					{#if focusedMarkerLabel}
						{t($locale, 'ui.areaMapSelectedMarker', { name: focusedMarkerLabel })}
					{/if}
				</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.jrpg-modal-backdrop {
		position: absolute;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.52);
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.jrpg-window {
		position: relative;
		z-index: 10;
		display: grid;
		max-height: calc(100vh - 2rem);
		width: min(76rem, calc(100vw - 2rem));
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
		/* border/background/shadow now from glass-panel-strong component class */
		color: var(--color-parchment);
	}

	.jrpg-area-map-window {
		width: min(58rem, calc(100vw - 2rem));
	}

	.jrpg-window-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid rgba(244, 229, 184, 0.14);
		padding: 1rem;
	}

	.jrpg-window-title {
		margin: 0.2rem 0 0;
		font-size: clamp(1.25rem, 3vw, 1.9rem);
		font-weight: 700;
		color: var(--color-parchment);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.jrpg-window-body {
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
	}

	.jrpg-area-map-frame {
		overflow: hidden;
		border: 1px solid rgba(244, 229, 184, 0.16);
		border-radius: var(--radius-arcane);
		background:
			linear-gradient(rgba(159, 231, 255, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(159, 231, 255, 0.08) 1px, transparent 1px), #09101f;
		background-size: 2rem 2rem;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.04),
			inset 0 0 48px rgba(0, 0, 0, 0.42);
	}

	.area-map-svg {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		max-height: min(62vh, 42rem);
	}

	.area-map-fog {
		fill: #08101d;
	}

	.area-map-revealed-cell {
		fill: rgba(52, 92, 88, 0.76);
		stroke: rgba(159, 247, 203, 0.28);
		stroke-width: 8;
	}

	.area-map-marker circle {
		stroke-width: 16;
	}

	.area-map-marker text {
		fill: #fff7df;
		font-size: 104px;
		font-weight: 900;
		paint-order: stroke;
		stroke: rgba(5, 7, 20, 0.92);
		stroke-width: 18px;
	}

	.area-map-marker {
		cursor: pointer;
		outline: none;
	}

	.area-map-marker:focus-visible circle {
		stroke: #fff7df;
		stroke-width: 30;
		filter: drop-shadow(0 0 30px rgba(255, 247, 223, 0.9));
	}

	.area-map-marker:focus-visible text {
		fill: #ffffff;
	}

	.area-map-marker-building circle {
		fill: rgba(159, 231, 255, 0.26);
		stroke: rgba(159, 231, 255, 0.78);
	}

	.area-map-marker-exit circle {
		fill: rgba(255, 211, 122, 0.22);
		stroke: rgba(255, 211, 122, 0.74);
	}

	.area-map-marker-quest circle {
		fill: rgba(255, 211, 122, 0.32);
		stroke: rgba(255, 211, 122, 0.9);
	}

	.area-map-marker-discovery circle {
		fill: rgba(159, 247, 203, 0.22);
		stroke: rgba(159, 247, 203, 0.78);
	}

	.area-map-marker-emphasis circle {
		filter: drop-shadow(0 0 26px rgba(255, 211, 122, 0.72));
		stroke-width: 24;
	}

	.area-map-marker-emphasis text {
		fill: #ffe3a0;
		font-size: 116px;
	}

	.area-map-player-marker {
		fill: #f05268;
		stroke: #fff7df;
		stroke-width: 18;
		filter: drop-shadow(0 0 28px rgba(240, 82, 104, 0.78));
	}

	.jrpg-area-map-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-area-map-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.jrpg-area-map-legend i {
		display: inline-block;
		width: 0.8rem;
		height: 0.8rem;
		border: 1px solid rgba(244, 229, 184, 0.24);
		border-radius: 999px;
	}

	.jrpg-area-map-selected {
		min-height: 1.1rem;
		margin-top: 0.5rem;
		color: #fff7df;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.area-map-legend-current {
		background: #f05268;
	}

	.area-map-legend-unexplored {
		background: #08101d;
	}

	@media (max-width: 720px) {
		.jrpg-area-map-window {
			width: calc(100vw - 1rem);
		}

		.jrpg-area-map-frame {
			border-radius: 0.45rem;
		}

		.area-map-svg {
			max-height: min(70vh, calc(100vw - 2.5rem));
		}
	}
</style>
