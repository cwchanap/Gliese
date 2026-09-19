<script lang="ts">
	import { onMount } from 'svelte';
	import { getDialogueBustPath } from '$lib/game/content/heroic-ui';
	import {
		getTextSpeedMs,
		getVisibleText,
		resolveDialogueConfirm
	} from '$lib/game/core/text-reveal';
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import type { HudDialogueState } from '$lib/game/ui-bridge/events';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';

	type Props = {
		dialogue: HudDialogueState;
		onadvance: () => void;
		onclose: () => void;
		onchoose: (choiceId: string) => void;
	};

	let { dialogue, onadvance, onclose, onchoose }: Props = $props();
	let panel = $state<HTMLDialogElement>();

	// Mockup gilded-choice glyphs, derived from the choice intent kind.
	const CHOICE_GLYPHS: Record<
		NonNullable<HudDialogueState['choices'][number]['kind']>,
		{ d: string; d2: string }
	> = {
		trade: { d: 'M5 8h14l1 12H4L5 8z', d2: 'M9 8V6a3 3 0 0 1 6 0v2' },
		ask: {
			d: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
			d2: 'M9.6 9.6a2.4 2.4 0 1 1 2.4 2.6v1.3M12 16.4v0'
		},
		leave: { d: 'M14 4h6v16h-6', d2: 'M10 8l-4 4 4 4M6 12h9' }
	};

	let visibleCharacters = $state(0);
	// Mockup composition keeps the first choice row in the gilded selected state;
	// pointer/keyboard focus moves the selection like a menu cursor. A new
	// session/step (dialogue.id) resets the cursor to the first row.
	let selectedChoiceIndex = $state(0);
	let selectedForDialogueId: string | null = null;
	const totalCharacters = $derived(Array.from(dialogue.line).length);
	const fullyRevealed = $derived(visibleCharacters >= totalCharacters);
	const visibleText = $derived(
		getVisibleText(dialogue.line, visibleCharacters, $preferences.textSpeed)
	);
	const bustPath = $derived(getDialogueBustPath(dialogue.npcId));

	// A new line resets the reveal; instant speed renders the full line with no ticker.
	$effect(() => {
		void dialogue.lineIndex;
		void dialogue.line;
		if (selectedForDialogueId !== dialogue.id) {
			selectedForDialogueId = dialogue.id;
			selectedChoiceIndex = 0;
		}
		if ($preferences.textSpeed === 'instant') {
			visibleCharacters = totalCharacters;
			return;
		}
		visibleCharacters = 0;
		const timer = window.setInterval(() => {
			visibleCharacters = Math.min(totalCharacters, visibleCharacters + 1);
			if (visibleCharacters >= totalCharacters) window.clearInterval(timer);
		}, getTextSpeedMs($preferences.textSpeed));
		return () => window.clearInterval(timer);
	});

	onMount(() => {
		panel?.focus({ preventScroll: true });

		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

	function confirmAdvance() {
		const action = resolveDialogueConfirm({ visibleCharacters, totalCharacters });

		if (action === 'reveal') {
			visibleCharacters = totalCharacters;
			return;
		}

		onadvance();
	}

	function closeFromEscape(event: KeyboardEvent): boolean {
		if (event.key === 'Escape' && dialogue.canClose) {
			event.preventDefault();
			event.stopPropagation();
			onclose();
			return true;
		}

		return false;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		closeFromEscape(event);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (closeFromEscape(event)) return;

		// Tab trap: the dialogue is non-modal <dialog open>, so without an
		// explicit wrap Tab escapes to the controls behind it. The panel itself
		// (initial focus) and the edge buttons wrap around the enabled controls.
		if (event.key === 'Tab') {
			const focusable = Array.from(
				panel?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []
			).filter((button) => button.getClientRects().length > 0);
			if (focusable.length === 0) {
				event.preventDefault();
				panel?.focus();
				return;
			}
			const first = focusable[0];
			const last = focusable.at(-1)!;
			if (
				event.shiftKey &&
				(document.activeElement === first || document.activeElement === panel)
			) {
				event.preventDefault();
				last.focus();
			} else if (
				!event.shiftKey &&
				(document.activeElement === panel || document.activeElement === last)
			) {
				event.preventDefault();
				first.focus();
			}
			return;
		}

		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (event.target !== event.currentTarget) {
			event.stopPropagation();
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (dialogue.mode === 'choice') {
			if (!fullyRevealed) return;
			const selectedChoice = dialogue.choices[selectedChoiceIndex];
			if (selectedChoice) onchoose(selectedChoice.id);
			return;
		}

		confirmAdvance();
	}
</script>

<dialog
	class="jrpg-dialogue-panel heroic-anim pointer-events-auto absolute right-[2.75rem] bottom-[2.5rem] left-[2.75rem] z-[70] m-0 font-display text-parchment"
	aria-label={dialogue.speaker}
	aria-modal="true"
	bind:this={panel}
	open
	tabindex="-1"
	onkeydown={handleKeydown}
>
	{#if dialogue.mode === 'choice'}
		<div class="jrpg-dialogue-choices">
			{#each dialogue.choices as choice, index (choice.id)}
				{@const glyphs = CHOICE_GLYPHS[choice.kind ?? 'ask']}
				<button
					type="button"
					class="jrpg-dialogue-choice"
					data-kind={choice.kind ?? 'ask'}
					data-selected={index === selectedChoiceIndex}
					data-focus-id={`dialogue-choice-${index}`}
					data-focus-row={index}
					data-focus-column={0}
					disabled={!fullyRevealed}
					onclick={() => onchoose(choice.id)}
					onfocus={() => (selectedChoiceIndex = index)}
					onmouseenter={() => (selectedChoiceIndex = index)}
				>
					<span class="jrpg-dialogue-choice-shimmer" aria-hidden="true"></span>
					<svg
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.8"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d={glyphs.d} />
						<path d={glyphs.d2} />
					</svg>
					<span class="jrpg-dialogue-choice-label">{choice.label}</span>
				</button>
			{/each}
		</div>
	{/if}
	<div class="jrpg-dialogue-row">
		{#if bustPath}
			<figure class="jrpg-dialogue-bust">
				<img
					src={bustPath}
					alt={t($locale, 'ui.dialogueBustAlt', { npc: dialogue.speaker })}
					draggable="false"
				/>
			</figure>
		{/if}
		<div class="jrpg-dialogue-bar">
			<p class="jrpg-dialogue-speaker">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
					<path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
				</svg>
				<span>{dialogue.speaker}</span>
			</p>
			<p class="jrpg-dialogue-line">{visibleText}</p>
			<span class="sr-only" role="status">{dialogue.line}</span>
			<div class="jrpg-dialogue-meta">
				<div class="jrpg-dialogue-dots" aria-hidden="true">
					{#each Array(dialogue.lineCount) as _, index (index)}
						<span
							class="jrpg-dialogue-dot"
							class:jrpg-dialogue-dot-on={index <= dialogue.lineIndex}
						>
						</span>
					{/each}
				</div>
				<div class="jrpg-dialogue-prompts">
					<button
						type="button"
						class="jrpg-dialogue-action"
						data-focus-id="dialogue-next"
						data-focus-row={dialogue.choices.length}
						data-focus-column={0}
						onclick={confirmAdvance}
					>
						<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
						{t($locale, 'ui.next')}
					</button>
					{#if dialogue.canClose}
						<button
							type="button"
							class="jrpg-dialogue-action"
							data-focus-id="dialogue-close"
							data-focus-row={dialogue.choices.length}
							data-focus-column={1}
							onclick={onclose}
						>
							<PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="B" tone="b" />
							{t($locale, 'ui.close')}
						</button>
					{/if}
					<span class="jrpg-dialogue-more" aria-hidden="true"></span>
				</div>
			</div>
		</div>
	</div>
</dialog>

<style>
	.jrpg-dialogue-panel {
		/* The dialog UA sheet pins width:fit-content; auto lets the left/right
		   insets stretch the panel across the playfield like the mockup. */
		width: auto;
		border: none;
		background: transparent;
	}

	/* Choices share the dialogue panel's 44px inset and grow upward. */
	.jrpg-dialogue-choices {
		position: absolute;
		right: 0;
		bottom: 14.375rem;
		display: grid;
		justify-content: end;
		gap: 0.75rem;
	}

	.jrpg-dialogue-choice {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.875rem;
		overflow: hidden;
		width: min(23rem, 80vw);
		padding: 0.9rem 1.1rem;
		border: 1px solid rgba(160, 200, 255, 0.26);
		border-radius: 1rem;
		text-align: left;
		color: #e2ecff;
		font-family: var(--font-display);
		font-size: 0.95rem;
		font-weight: 900;
		letter-spacing: 0.02em;
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	.jrpg-dialogue-choice[data-kind='ask'] {
		background: linear-gradient(180deg, rgba(38, 96, 180, 0.5), rgba(10, 32, 60, 0.6));
	}

	.jrpg-dialogue-choice[data-kind='ask'] svg {
		color: var(--color-sapphire);
	}

	.jrpg-dialogue-choice[data-kind='trade'] {
		background: linear-gradient(180deg, rgba(140, 104, 32, 0.5), rgba(10, 32, 60, 0.6));
	}

	.jrpg-dialogue-choice[data-kind='trade'] svg {
		color: var(--color-gold);
	}

	.jrpg-dialogue-choice[data-kind='leave'] {
		background: linear-gradient(180deg, rgba(58, 70, 104, 0.5), rgba(10, 32, 60, 0.6));
	}

	.jrpg-dialogue-choice[data-kind='leave'] svg {
		color: #c2cfe8;
	}

	.jrpg-dialogue-choice svg {
		flex: none;
		width: 1.3125rem;
		height: 1.3125rem;
	}

	.jrpg-dialogue-choice-label {
		position: relative;
	}

	/* Selected row (mockup gild): cream-gold fill, white ring, shimmer sweep. */
	.jrpg-dialogue-choice[data-selected='true'] {
		border-color: rgba(255, 255, 255, 0.95);
		background: linear-gradient(180deg, #fff6dc, #f2c886);
		color: #5a3d08;
		box-shadow:
			0 10px 26px rgba(255, 206, 110, 0.45),
			inset 0 1px 0 rgba(255, 255, 255, 0.95);
	}

	.jrpg-dialogue-choice[data-selected='true'] svg {
		color: #5a3d08;
	}

	.jrpg-dialogue-choice-shimmer {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 34%;
		pointer-events: none;
		opacity: 0;
		background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.65), transparent);
	}

	.jrpg-dialogue-choice[data-selected='true'] .jrpg-dialogue-choice-shimmer {
		opacity: 1;
		animation: jrpg-choice-shimmer 2.8s ease-in-out infinite;
	}

	.jrpg-dialogue-choice:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.jrpg-dialogue-row {
		display: flex;
		align-items: flex-end;
		gap: 1.5rem;
	}

	/* ---- Bust card (mockup: 15rem x 18rem rect, gold border, inset) ---- */
	.jrpg-dialogue-bust {
		flex: none;
		width: 15rem;
		height: 18rem;
		margin: 0;
		overflow: hidden;
		border: 1px solid rgba(255, 232, 170, 0.85);
		border-radius: 1.375rem;
		background: linear-gradient(180deg, rgba(255, 214, 120, 0.2), rgba(20, 50, 120, 0.6));
		box-shadow:
			0 22px 52px rgba(0, 0, 0, 0.6),
			inset 0 0 0 3px rgba(255, 214, 120, 0.16);
	}

	.jrpg-dialogue-bust img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* ---- Text box (mockup window: indigo-blue gradient, gold inlay border) -- */
	.jrpg-dialogue-bar {
		position: relative;
		flex: 1;
		min-height: 10rem;
		display: grid;
		align-content: space-between;
		gap: 0.75rem;
		padding: 1.875rem 1.75rem 1.5rem;
		border: 1px solid rgba(255, 232, 170, 0.85);
		border-radius: 1.5rem;
		background:
			linear-gradient(
				135deg,
				rgba(34, 74, 164, 0.92),
				rgba(12, 26, 74, 0.95) 55%,
				rgba(46, 28, 96, 0.92)
			),
			var(--color-ink);
		box-shadow:
			0 26px 60px rgba(0, 0, 0, 0.65),
			inset 0 0 0 4px rgba(255, 214, 120, 0.14),
			inset 0 2px 0 rgba(255, 255, 255, 0.3);
	}

	/* Etched corner marks: gold rounded brackets, top-left + bottom-right. */
	.jrpg-dialogue-bar::before,
	.jrpg-dialogue-bar::after {
		content: '';
		position: absolute;
		width: 1.6rem;
		height: 1.6rem;
		pointer-events: none;
		border: 2px solid rgba(255, 224, 138, 0.85);
	}

	.jrpg-dialogue-bar::before {
		top: 9px;
		left: 9px;
		border-top-left-radius: 16px;
		border-right: 0;
		border-bottom: 0;
	}

	.jrpg-dialogue-bar::after {
		right: 9px;
		bottom: 9px;
		border-bottom-right-radius: 16px;
		border-left: 0;
		border-top: 0;
	}

	.jrpg-dialogue-speaker {
		position: absolute;
		top: -0.9375rem;
		left: 1.875rem;
		z-index: 2;
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		margin: 0;
		padding: 0.4rem 1.3rem;
		border: 1px solid rgba(255, 255, 255, 0.85);
		border-radius: 999px;
		background: linear-gradient(180deg, #ffe9ae, #c8952f);
		color: #3b2606;
		font-size: 0.95rem;
		font-weight: 900;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
	}

	.jrpg-dialogue-speaker svg {
		width: 0.9375rem;
		height: 0.9375rem;
	}

	/* Mockup prose: display face (Zen Maru Gothic), 1.5rem / 500 / 1.5. */
	.jrpg-dialogue-line {
		min-height: 3.6rem;
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 500;
		line-height: 1.5;
		text-wrap: pretty;
		text-shadow: 0 2px 6px rgba(0, 0, 0, 0.65);
	}

	.jrpg-dialogue-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.25rem;
	}

	.jrpg-dialogue-dots {
		display: inline-flex;
		gap: 0.4375rem;
	}

	.jrpg-dialogue-dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: rgba(169, 200, 255, 0.3);
	}

	.jrpg-dialogue-dot-on {
		background: var(--color-gold);
		box-shadow: 0 0 10px rgba(255, 224, 138, 0.9);
	}

	.jrpg-dialogue-prompts {
		display: inline-flex;
		align-items: center;
		gap: 1.25rem;
	}

	/* Mockup ▼: gilded isoceles arrow floating at the bar's bottom-right. */
	.jrpg-dialogue-more {
		align-self: center;
		width: 1.05rem;
		height: 0.72rem;
		background: linear-gradient(180deg, #ffe9ae, #c8952f);
		clip-path: polygon(0 0, 100% 0, 50% 100%);
		filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.55));
		animation: jrpg-float-y 1.6s ease-in-out infinite;
	}

	.jrpg-dialogue-action {
		display: inline-flex;
		align-items: center;
		gap: 0.5625rem;
		padding: 0;
		border: none;
		background: none;
		color: #a9c8ff;
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.jrpg-dialogue-action:focus-visible {
		outline: 2px solid var(--color-gold);
		outline-offset: 3px;
		box-shadow: 0 0 0 4px rgba(243, 210, 122, 0.18);
		border-radius: 0.4rem;
	}

	/* Focus stays visible on choices: the white ring doubles as the indicator. */
	.jrpg-dialogue-choice:focus-visible {
		outline: 2px solid #5a3d08;
		outline-offset: 2px;
	}

	/* Short viewports (e.g. 640×360): the desktop 14.375rem anchor lifts the
	   third choice row (quest-detail accept flows) past the viewport top —
	   the shell's overflow: clip makes the clipped row unreachable (same
	   class as the Playwright actionability hangs). Compact the rows and
	   anchor the column lower so 1-3 choices all stay on-screen; taller
	   viewports keep the desktop composition untouched.

	   The column is anchored 11rem above the panel floor, so it stays clear
	   of the panel box only while the panel itself stays ≤ 10rem tall —
	   compact the panel's whole footprint to that budget (bust, bar padding,
	   prose type) and cap the prose area, because the bottom-anchored bar
	   otherwise grows UPWARD as lines wrap and ends up under the column,
	   stealing its pointer events (Playwright: ".jrpg-dialogue-line
	   intercepts pointer events"). Result: a constant 16px gap between the
	   column and the panel at any ≤500px height. */
	@media (max-height: 500px) {
		.jrpg-dialogue-choices {
			bottom: 11rem;
			gap: 0.4rem;
		}

		.jrpg-dialogue-choice {
			padding: 0.45rem 1.1rem;
		}

		.jrpg-dialogue-row {
			gap: 0.875rem;
		}

		.jrpg-dialogue-bust {
			width: 8rem;
			height: 10rem;
			border-radius: 1rem;
		}

		.jrpg-dialogue-bar {
			min-height: 0;
			gap: 0.5rem;
			padding: 0.75rem 1rem 0.625rem;
		}

		/* Cap ≈ 4 wrapped lines at the compact type size; the worst-case bar
		   (capped prose + meta row) stays under the 10rem panel budget. */
		.jrpg-dialogue-line {
			max-height: 6.25rem;
			overflow: hidden;
			font-size: 1.125rem;
			line-height: 1.4;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.jrpg-dialogue-choice-shimmer,
		.jrpg-dialogue-more {
			animation: none;
		}
	}

	@keyframes jrpg-choice-shimmer {
		from {
			transform: translateX(-160%) skewX(-18deg);
		}
		55%,
		100% {
			transform: translateX(240%) skewX(-18deg);
		}
	}

	@keyframes jrpg-float-y {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-5px);
		}
	}
</style>
