<script lang="ts">
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
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

	let osReducedMotion = $state(false);

	$effect(() => {
		const query = window.matchMedia('(prefers-reduced-motion: reduce)');
		osReducedMotion = query.matches;
		const onChange = (event: MediaQueryListEvent) => {
			osReducedMotion = event.matches;
		};
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});

	// Effective reduced motion obeys BOTH the saved preference and the OS setting.
	const motionReduced = $derived($preferences.motion === 'reduced' || osReducedMotion);

	// Pad/arrow focus geometry: markers join the resolveMenuFocusTarget
	// lattice roughly by geography — rows are ~1/8-world-height bands walked
	// top to bottom, columns are x-rank within a band (left to right).
	const markerFocusCoords = $derived.by(() => {
		const coords: Record<string, { row: number; column: number }> = {};
		const sorted = [...areaMap.markers].sort((a, b) => a.y - b.y || a.x - b.x);
		const rowBand = areaMap.worldHeight / 8;
		let row = -1;
		let column = 0;
		let previousY = Number.NaN;
		for (const marker of sorted) {
			if (Number.isNaN(previousY) || marker.y - previousY > rowBand) {
				row += 1;
				column = 0;
			} else {
				column += 1;
			}
			coords[marker.id] = { row, column };
			previousY = marker.y;
		}
		return coords;
	});
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="jrpg-area-map-window heroic-window heroic-anim"
			class:heroic-motion-reduced={motionReduced}
			aria-label={t($locale, 'ui.areaMapDialog', { areaName: areaMap.name })}
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<header class="jrpg-area-map-header">
				<div>
					<p class="heroic-eyebrow">{t($locale, 'ui.areaMap')}</p>
					<h2 class="heroic-title">{areaMap.name}</h2>
				</div>
				<button
					bind:this={closeButton}
					type="button"
					class="jrpg-area-map-close font-display"
					onclick={onClose}
				>
					<span class="jrpg-area-map-close-glyph" aria-hidden="true">
						<PromptGlyph mode={$preferences.promptMode} keys="M" pad="B" tone="b" />
					</span>
					{t($locale, 'ui.close')}
				</button>
			</header>
			<div class="jrpg-area-map-body">
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
							{@const focusCoords = markerFocusCoords[marker.id]}
							<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
							<g
								class={`area-map-marker area-map-marker-${marker.kind} ${
									marker.emphasis ? 'area-map-marker-emphasis' : ''
								}`}
								role="img"
								data-testid="area-map-marker"
								data-focus-id={`map-marker-${marker.id}`}
								data-focus-row={focusCoords?.row ?? 0}
								data-focus-column={focusCoords?.column ?? 0}
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
		background: rgba(2, 3, 10, 0.72);
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	/* Regression surface (no source canvas): compact Heroic window over the
	   untouched fog/marker map logic. */
	.jrpg-area-map-window {
		display: flex;
		flex-direction: column;
		width: min(58rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
	}

	.jrpg-area-map-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.jrpg-area-map-close {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		border: 0;
		background: transparent;
		padding: 0.3rem 0.2rem;
		color: var(--color-sapphire);
		font-size: 0.86rem;
		font-weight: 800;
		cursor: pointer;
		transition: color 160ms ease;
	}
	.jrpg-area-map-close:hover {
		color: var(--color-parchment);
	}

	.jrpg-area-map-close-glyph {
		display: inline-flex;
	}

	.jrpg-area-map-body {
		min-height: 0;
		overflow-y: auto;
		padding-right: 0.25rem;
	}

	.jrpg-area-map-frame {
		overflow: hidden;
		border: 1px solid var(--color-frame);
		border-radius: 1rem;
		background:
			linear-gradient(rgba(255, 246, 224, 0.04) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 246, 224, 0.04) 1px, transparent 1px),
			color-mix(in srgb, var(--color-ink) 60%, #060b18);
		background-size: 2rem 2rem;
		box-shadow:
			inset 0 1px 0 rgba(255, 246, 224, 0.06),
			inset 0 0 48px rgba(0, 0, 0, 0.42);
	}

	.area-map-svg {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		max-height: min(58vh, 40rem);
	}

	.area-map-fog {
		fill: color-mix(in srgb, var(--color-ink) 82%, #04070f);
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
		font-family: var(--font-display);
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
		fill: var(--color-rose);
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
		font-family: var(--font-display);
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
		border: 1px solid var(--color-frame-strong);
		border-radius: 999px;
	}

	.jrpg-area-map-selected {
		min-height: 1.1rem;
		margin: 0.5rem 0 0;
		color: var(--color-gold);
		font-family: var(--font-display);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.area-map-legend-current {
		background: var(--color-rose);
	}

	.area-map-legend-unexplored {
		background: color-mix(in srgb, var(--color-ink) 82%, #04070f);
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
