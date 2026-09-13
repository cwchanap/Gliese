<script lang="ts">
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';

	interface Props {
		open: boolean;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		open,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onkeydown
	}: Props = $props();

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
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="skill-window heroic-window heroic-anim"
			class:heroic-motion-reduced={motionReduced}
			aria-labelledby="skill-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<header class="skill-header">
				<div>
					<p class="heroic-eyebrow">{t($locale, 'ui.fieldCmds.skill')}</p>
					<h2 id="skill-heading" class="heroic-title">{t($locale, 'ui.fieldCmds.skill')}</h2>
				</div>
				<button
					bind:this={closeButton}
					type="button"
					class="skill-back font-display"
					onclick={onClose}
				>
					<span class="skill-back-glyph" aria-hidden="true">
						<PromptGlyph mode={$preferences.promptMode} keys="B" pad="B" tone="b" />
					</span>
					{t($locale, 'ui.back')}
				</button>
			</header>

			<div class="skill-empty" data-testid="skill-empty">
				<span class="skill-empty-icon" aria-hidden="true">
					<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
						<path d="M8 1.6 9.8 5.9 14.4 6.3 11 9.4 12 14 8 11.6 4 14 5 9.4 1.6 6.3 6.2 5.9 Z" />
					</svg>
				</span>
				<p class="skill-empty-copy font-display">{t($locale, 'ui.noSkillsYet')}</p>
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

	/* No source canvas exists for Skill: a compact Heroic window (regression
	   review only, per the design spec). */
	.skill-window {
		display: flex;
		flex-direction: column;
		width: min(34rem, calc(100vw - 2rem));
		max-height: calc(100vh - 2rem);
	}

	.skill-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.skill-back {
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

	.skill-back:hover {
		color: var(--color-parchment);
	}

	.skill-back-glyph {
		display: inline-flex;
	}

	.skill-empty {
		display: grid;
		justify-items: center;
		gap: 0.9rem;
		margin-top: 1.4rem;
		border: 1px dashed var(--color-frame-strong);
		border-radius: 0.875rem;
		padding: 2.2rem 1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 20%, transparent)
			),
			var(--color-panel);
	}

	.skill-empty-icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.875rem;
		background: color-mix(in srgb, var(--color-panel-deep) 35%, transparent);
		color: var(--color-violet);
	}
	.skill-empty-icon svg {
		width: 1.3rem;
		height: 1.3rem;
	}

	.skill-empty-copy {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.95rem;
		font-weight: 800;
	}
</style>
