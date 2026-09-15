<script lang="ts">
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';

	/** Exact Heroic field command set and order (plan Task 4 Step 2). */
	export type FieldCommand =
		| 'bag'
		| 'gear'
		| 'quest'
		| 'map'
		| 'skill'
		| 'rest'
		| 'save'
		| 'system';

	interface Props {
		/** Per-command availability; disabled tiles stay out of focus order. */
		enabled: Record<FieldCommand, boolean>;
		onCommand: (command: FieldCommand) => void;
		dialog?: HTMLDivElement;
	}

	let { enabled, onCommand, dialog = $bindable() }: Props = $props();

	const commands: FieldCommand[] = [
		'bag',
		'gear',
		'quest',
		'map',
		'skill',
		'rest',
		'save',
		'system'
	];

	// 4-column grid: row 0 = bag..map, row 1 = skill..system.
	function rowAt(index: number): number {
		return Math.floor(index / 4);
	}

	function columnAt(index: number): number {
		return index % 4;
	}

	const iconPaths: Record<FieldCommand, string> = {
		bag: '/game/assets/heroic-ui/icons/bag.svg',
		gear: '/game/assets/heroic-ui/icons/gear.svg',
		quest: '/game/assets/heroic-ui/icons/quest.svg',
		map: '/game/assets/heroic-ui/icons/map.svg',
		skill: '/game/assets/heroic-ui/icons/skill.svg',
		rest: '/game/assets/heroic-ui/icons/rest.svg',
		save: '/game/assets/heroic-ui/icons/save.svg',
		system: '/game/assets/heroic-ui/icons/system.svg'
	};

	// Source mockup tintColor map: bag/rest emerald, gear/map azure,
	// quest/save gold, skill violet, system slate.
	const iconTints: Record<FieldCommand, string> = {
		bag: '#8dffbd',
		gear: '#9ad2ff',
		quest: '#e8d27e',
		map: '#8fb9e8',
		skill: '#cf9dff',
		rest: '#7ee2a8',
		save: '#f2d488',
		system: '#c2cfe8'
	};

	// Quest/Save tiles read warm in the source; 'transparent' keeps the rest
	// on the neutral navy tile.
	const tileTints: Record<FieldCommand, string> = {
		bag: 'transparent',
		gear: 'transparent',
		quest: 'rgba(214, 158, 62, 0.2)',
		map: 'transparent',
		skill: 'transparent',
		rest: 'transparent',
		save: 'rgba(214, 158, 62, 0.2)',
		system: 'transparent'
	};
</script>

<div
	bind:this={dialog}
	id="game-command-panel"
	class="heroic-field-menu"
	role="region"
	aria-label={t($locale, 'ui.command')}
>
	{#each commands as command, index (command)}
		<button
			type="button"
			class="heroic-cmd font-display"
			class:heroic-cmd-disabled={!enabled[command]}
			data-focus-id={`field-cmd-${command}`}
			data-focus-row={rowAt(index)}
			data-focus-column={columnAt(index)}
			disabled={!enabled[command]}
			onclick={() => onCommand(command)}
		>
			<span class="heroic-cmd-num tabular-nums" aria-hidden="true">{index + 1}</span>
			<span
				class="heroic-cmd-icon"
				style={`--cmd-icon: url('${iconPaths[command]}'); --cmd-tint: ${iconTints[command]}; --cmd-tile: ${tileTints[command]}`}
				aria-hidden="true"
			></span>
			<span class="heroic-cmd-label">{t($locale, `ui.fieldCmds.${command}`)}</span>
		</button>
	{/each}
</div>

<style>
	.heroic-field-menu {
		position: absolute;
		top: 13.4rem;
		left: 0.9rem;
		z-index: 40;
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.45rem;
		width: min(24.5rem, calc(100vw - 2rem));
		padding: 0.7rem;
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
		pointer-events: auto;
	}

	.heroic-cmd {
		position: relative;
		display: grid;
		justify-items: center;
		gap: 0.42rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.7rem;
		padding: 0.85rem 0.35rem 0.6rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 28%, transparent)
			),
			linear-gradient(var(--cmd-tile, transparent), var(--cmd-tile, transparent)),
			var(--color-panel-deep);
		color: var(--color-muted);
		font-size: 0.66rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease;
	}

	.heroic-cmd-num {
		position: absolute;
		top: 0.28rem;
		right: 0.4rem;
		color: var(--color-muted);
		font-size: 0.52rem;
		font-weight: 700;
		opacity: 0.7;
	}

	/* Icon recolors with currentColor via mask so the selected gold tile can
	   flip the glyph to ink without a second asset. */
	.heroic-cmd-icon {
		display: block;
		width: 1.35rem;
		height: 1.35rem;
		background: var(--cmd-tint, currentColor);
		-webkit-mask-image: var(--cmd-icon);
		mask-image: var(--cmd-icon);
		-webkit-mask-position: center;
		mask-position: center;
		-webkit-mask-size: contain;
		mask-size: contain;
		-webkit-mask-repeat: no-repeat;
		mask-repeat: no-repeat;
	}

	/* Selected treatment (mockup: tan fill, ink icon, gold border + glow).
	   Applies to :focus — not just :focus-visible — so the review capture and
	   programmatic focus show the selected state like a hovered tile. */
	.heroic-cmd:hover:not(.heroic-cmd-disabled),
	.heroic-cmd:focus:not(.heroic-cmd-disabled) {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
		outline: none;
	}

	.heroic-cmd:hover:not(.heroic-cmd-disabled) .heroic-cmd-icon,
	.heroic-cmd:focus:not(.heroic-cmd-disabled) .heroic-cmd-icon {
		background: #3a2c07;
	}

	.heroic-cmd:focus:not(.heroic-cmd-disabled) .heroic-cmd-num {
		color: #3a2c07;
	}

	.heroic-cmd-disabled {
		cursor: not-allowed;
		opacity: 0.42;
	}

	/* Narrow screens: compact 2×4 menu hugging the left edge. The stack is
	   ~330px tall below its 13rem anchor, so it needs a tall viewport. */
	@media (max-width: 720px) and (min-height: 560px) {
		.heroic-field-menu {
			top: 13rem;
			left: 0.75rem;
			grid-template-columns: repeat(2, 1fr);
			width: min(10.5rem, calc(100vw - 13.5rem));
		}
	}

	/* Short screens (e.g. 640×360 — but the Tauri window is resizable, so
	   any width below the height threshold: 1000×360 is equally valid): the
	   desktop 13.4rem anchor runs the 4×2 grid past the viewport floor,
	   leaving Save/System outside the viewport — and the game shell's
	   overflow: clip forbids scrolling them into view (infinite Playwright
	   click retries). Every short viewport uses the 4×2 grid anchored higher
	   so every button stays inside the viewport; tall narrow screens keep
	   the compact 2×4 stack above. */
	@media (max-height: 559px) {
		.heroic-field-menu {
			top: 8.5rem;
			left: 0.9rem;
			grid-template-columns: repeat(4, 1fr);
			width: min(24.5rem, calc(100vw - 2rem));
		}
	}
</style>
