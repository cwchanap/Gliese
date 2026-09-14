<script lang="ts">
	import { onMount } from 'svelte';
	import { preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';

	interface Props {
		canContinue: boolean;
		continueSubtitle: string;
		onContinue: () => void;
		onNewRun: () => void;
		onSystem: () => void;
	}

	let { canContinue, continueSubtitle, onContinue, onNewRun, onSystem }: Props = $props();

	const locale = $derived($preferences.locale);

	let continueCard = $state<HTMLButtonElement>();
	let newRunCard = $state<HTMLButtonElement>();

	// Pad-first title: the pad-A target is the primary card from the start.
	onMount(() => {
		(canContinue ? continueCard : newRunCard)?.focus({ preventScroll: true });
	});
</script>

<div class="title-screen" role="region" aria-label="GLIESE">
	<img
		class="title-key-art"
		src="/game/assets/heroic-ui/title-key-art.png"
		alt=""
		aria-hidden="true"
		draggable="false"
	/>
	<div class="title-vignette" aria-hidden="true"></div>

	<div class="title-hero">
		<div class="title-crest" aria-hidden="true">
			<svg viewBox="0 0 96 96" fill="none">
				<circle cx="48" cy="48" r="45" fill="#101a3c" />
				<circle cx="48" cy="48" r="45" stroke="url(#title-crest-ring)" stroke-width="2.5" />
				<path
					d="M48 26 L52.6 43.4 L70 48 L52.6 52.6 L48 70 L43.4 52.6 L26 48 L43.4 43.4 Z"
					fill="none"
					stroke="#f2d488"
					stroke-width="3"
					stroke-linejoin="round"
				/>
				<defs>
					<linearGradient id="title-crest-ring" x1="3" y1="3" x2="93" y2="93">
						<stop offset="0" stop-color="#f6dd9e" />
						<stop offset="1" stop-color="#b98f3e" />
					</linearGradient>
				</defs>
			</svg>
		</div>
		<h1 class="title-wordmark font-display">GLIESE</h1>
		<p class="title-chapter-pill font-display">{t(locale, 'ui.titleChapterPill')}</p>
	</div>

	<div class="title-actions heroic-stagger">
		<button
			type="button"
			class="title-card"
			class:title-card-primary={canContinue}
			data-focus-id="title-continue"
			data-focus-row={0}
			data-focus-column={0}
			bind:this={continueCard}
			onclick={onContinue}
			disabled={!canContinue}
		>
			<span class="title-card-head">
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
				>
					<path d="M4.5 2.8 L12.5 8 L4.5 13.2 Z" />
				</svg>
				<span class="title-card-title font-display">{t(locale, 'ui.continue')}</span>
			</span>
			<span class="title-card-sub font-display">
				{canContinue ? continueSubtitle : t(locale, 'ui.titleNoSaveData')}
			</span>
		</button>

		<button
			type="button"
			class="title-card"
			data-focus-id="title-new-run"
			data-focus-row={0}
			data-focus-column={1}
			bind:this={newRunCard}
			onclick={onNewRun}
		>
			<span class="title-card-head">
				<svg
					viewBox="0 0 16 16"
					fill="none"
					style="stroke: var(--color-emerald)"
					stroke-width="1.6"
					aria-hidden="true"
				>
					<path d="M8 2 L9.4 6.6 L14 8 L9.4 9.4 L8 14 L6.6 9.4 L2 8 L6.6 6.6 Z" />
				</svg>
				<span class="title-card-title font-display">{t(locale, 'ui.titleNewRun')}</span>
			</span>
			<span class="title-card-sub font-display">{t(locale, 'ui.titleNewRunSub')}</span>
		</button>

		<button
			type="button"
			class="title-card"
			data-focus-id="title-system"
			data-focus-row={0}
			data-focus-column={2}
			onclick={onSystem}
		>
			<span class="title-card-head">
				<svg
					viewBox="0 0 16 16"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"
				>
					<circle cx="8" cy="8" r="2.4" />
					<path
						d="M8 1.6v2M8 12.4v2M1.6 8h2M12.4 8h2M3.5 3.5l1.4 1.4M11.1 11.1l1.4 1.4M12.5 3.5l-1.4 1.4M4.9 11.1l-1.4 1.4"
					/>
				</svg>
				<span class="title-card-title font-display">{t(locale, 'ui.system')}</span>
			</span>
			<span class="title-card-sub font-display">{t(locale, 'ui.titleSystemSub')}</span>
		</button>
	</div>

	<div class="title-hints font-display" aria-hidden="true">
		<span class="title-hint">
			<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
			{t(locale, 'ui.titleHintSelect')}
		</span>
		<span class="title-hint">
			<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="&#9135;" tone="enter" />
			{t(locale, 'ui.titleHintEnter')}
		</span>
	</div>
</div>

<style>
	.title-screen {
		position: absolute;
		inset: 0;
		z-index: 20;
		overflow: hidden;
		background: var(--color-ink);
	}

	.title-key-art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		user-select: none;
	}

	.title-vignette {
		position: absolute;
		inset: 0;
		background:
			radial-gradient(90% 60% at 50% 34%, transparent 40%, rgba(2, 3, 8, 0.55) 100%),
			linear-gradient(180deg, rgba(3, 4, 12, 0.4), transparent 30%, rgba(2, 3, 8, 0.72) 88%);
	}

	/* Mockup pins the stack at top:120px of a 900px frame (~13.4vh). */
	.title-hero {
		position: absolute;
		top: 13.4vh;
		left: 0;
		right: 0;
		z-index: 1;
		display: grid;
		justify-items: center;
		align-content: start;
	}

	.title-crest {
		width: 7rem;
		height: 7rem;
		filter: drop-shadow(0 0 34px rgba(242, 212, 136, 0.32));
	}

	.title-wordmark {
		margin: 1.6rem 0 0;
		color: var(--color-parchment);
		font-size: clamp(3.4rem, 6.4vw, 4.9rem);
		font-weight: 900;
		letter-spacing: 0.42em;
		margin-right: -0.42em; /* optically recenter the letterspaced wordmark */
		text-shadow: 0 0 44px rgba(159, 200, 255, 0.28);
	}

	.title-chapter-pill {
		margin: 1.4rem 0 0;
		border: 1px solid rgba(232, 200, 119, 0.55);
		border-radius: 999px;
		background: rgba(10, 15, 34, 0.72);
		padding: 0.44rem 1.5rem;
		color: var(--color-gold);
		font-size: 0.78rem;
		font-weight: 900;
		letter-spacing: 0.32em;
		margin-right: 0;
		text-transform: uppercase;
	}

	.title-actions {
		position: absolute;
		left: 50%;
		bottom: 16.7vh; /* Mockup: card row bottom edge at 150px of 900px. */
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(3, minmax(13rem, 1fr));
		gap: 1.4rem;
		width: min(62rem, calc(100vw - 4rem));
		transform: translateX(-50%);
	}

	.title-card {
		display: grid;
		gap: 0.75rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 1.25rem;
		padding: 1.375rem 1.5rem;
		background: linear-gradient(180deg, rgba(30, 44, 92, 0.85), rgba(14, 21, 46, 0.92));
		box-shadow: inset 0 1px 0 rgba(255, 246, 224, 0.07);
		color: var(--color-parchment);
		text-align: left;
		transition:
			border-color 160ms ease,
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.title-card:hover:not(:disabled),
	.title-card:focus-visible {
		border-color: rgba(255, 232, 168, 0.8);
		transform: translateY(-2px);
		box-shadow: 0 14px 34px rgba(0, 0, 0, 0.45);
		outline: none;
	}

	.title-card:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.title-card-primary,
	.title-card-primary:hover:not(:disabled),
	.title-card-primary:focus-visible {
		border-color: rgba(255, 232, 168, 0.9);
		background: linear-gradient(180deg, #fdf3d3, #ecd9a4);
		color: #3a2c07;
		box-shadow:
			0 0 46px rgba(242, 212, 136, 0.5),
			0 18px 44px rgba(0, 0, 0, 0.4);
	}

	.title-card-head {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}

	.title-card-head svg {
		width: 1.35rem;
		height: 1.35rem;
	}

	.title-card-title {
		font-size: 1.2rem;
		font-weight: 900;
		letter-spacing: 0.02em;
	}

	.title-card-sub {
		color: color-mix(in srgb, currentColor 62%, transparent);
		font-size: 0.82rem;
		letter-spacing: 0.06em;
	}

	.title-hints {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 8.7vh; /* Mockup: prompt bar at 78px of 900px. */
		z-index: 1;
		display: flex;
		justify-content: center;
		gap: 1.6rem;
		color: var(--color-muted);
		font-size: 0.78rem;
		font-weight: 700;
	}

	.title-hint {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	@media (max-width: 720px) {
		.title-actions {
			grid-template-columns: 1fr;
			width: min(24rem, calc(100vw - 2rem));
		}
	}

	/* App minimum window is 640×360 (tauri.conf.json). Below ~500px height
	   the vh-pinned hero and the card row overlap and overflow:hidden clips
	   the cards, so reflow to a compact flex column: smaller hero, cards
	   inline, prompts pinned to the bottom. The 1440×900 mockup composition
	   above is untouched. */
	@media (max-height: 500px) {
		.title-screen {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: space-between;
			gap: 1rem;
			padding: 1rem;
		}

		.title-hero,
		.title-actions,
		.title-hints {
			position: static;
			transform: none;
		}

		.title-crest {
			width: 2.5rem;
			height: 2.5rem;
		}

		.title-wordmark {
			margin: 0.5rem 0 0;
			margin-right: -0.42em; /* keep the optically recentered wordmark */
			font-size: 2rem;
		}

		.title-chapter-pill {
			margin: 0.5rem 0 0;
			padding: 0.2rem 0.9rem;
			font-size: 0.62rem;
		}

		.title-actions {
			display: flex;
			flex-direction: row;
			gap: 0.6rem;
			width: calc(100vw - 2rem);
		}

		.title-card {
			flex: 1 1 0;
			min-width: 0;
			gap: 0.25rem;
			padding: 0.6rem 0.75rem;
		}

		.title-card-head svg {
			width: 1rem;
			height: 1rem;
		}

		.title-card-title {
			font-size: 0.85rem;
		}

		.title-card-sub {
			font-size: 0.6rem;
		}

		.title-hints {
			gap: 1rem;
			font-size: 0.62rem;
		}
	}
</style>
