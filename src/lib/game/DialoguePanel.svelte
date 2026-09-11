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

	let visibleCharacters = $state(0);
	const totalCharacters = $derived(Array.from(dialogue.line).length);
	const fullyRevealed = $derived(visibleCharacters >= totalCharacters);
	const visibleText = $derived(
		getVisibleText(dialogue.line, visibleCharacters, $preferences.textSpeed)
	);
	const bustPath = $derived(getDialogueBustPath(dialogue.npcId));

	// A new line resets the reveal; instant speed renders the full line with no ticker.
	$effect(() => {
		void dialogue.id;
		void dialogue.lineIndex;
		void dialogue.line;
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

		if (event.key !== 'Enter' && event.key !== ' ') return;
		if (event.target !== event.currentTarget) {
			event.stopPropagation();
			return;
		}

		event.preventDefault();
		event.stopPropagation();

		if (dialogue.mode === 'choice') {
			if (!fullyRevealed) return;
			const firstChoice = dialogue.choices[0];
			if (firstChoice) onchoose(firstChoice.id);
			return;
		}

		confirmAdvance();
	}
</script>

<dialog
	class="jrpg-dialogue-panel arcane-window-enter pointer-events-auto absolute right-4 bottom-4 left-4 z-[70] m-0 font-body text-parchment"
	aria-label={dialogue.speaker}
	bind:this={panel}
	open
	tabindex="-1"
	onkeydown={handleKeydown}
>
	{#if dialogue.mode === 'choice'}
		<div class="jrpg-dialogue-choices">
			{#each dialogue.choices as choice (choice.id)}
				<button
					type="button"
					class="jrpg-dialogue-choice"
					disabled={!fullyRevealed}
					onclick={() => onchoose(choice.id)}
				>
					{choice.label}
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
			<p class="jrpg-dialogue-speaker font-display">
				<svg viewBox="0 0 16 16" aria-hidden="true">
					<circle cx="8" cy="5" r="3" fill="currentColor" />
					<path d="M2.5 14a5.5 5.5 0 0 1 11 0Z" fill="currentColor" />
				</svg>
				<span>{dialogue.speaker}</span>
			</p>
			<p class="jrpg-dialogue-line font-body">{visibleText}</p>
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
					<button type="button" class="jrpg-dialogue-action" onclick={confirmAdvance}>
						<PromptGlyph mode={$preferences.promptMode} keys="A" pad="A" tone="a" />
						{t($locale, 'ui.next')}
					</button>
					{#if dialogue.canClose}
						<button
							type="button"
							class="jrpg-dialogue-action jrpg-dialogue-action-secondary"
							onclick={onclose}
						>
							<PromptGlyph mode={$preferences.promptMode} keys="B" pad="B" tone="b" />
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
		width: min(calc(100vw - 2rem), 88rem);
		border: none;
		background: transparent;
	}

	.jrpg-dialogue-choices {
		display: grid;
		justify-content: end;
		gap: 0.65rem;
		margin-bottom: 1.1rem;
	}

	.jrpg-dialogue-choice {
		width: min(22rem, 80vw);
		padding: 0.6rem 0.95rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.75rem;
		text-align: left;
		font-size: 0.84rem;
		font-weight: 700;
		color: var(--color-parchment);
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 28%, transparent)
			),
			var(--color-panel-deep);
		box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease;
	}

	.jrpg-dialogue-choice:hover:enabled,
	.jrpg-dialogue-choice:focus-visible {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 22px color-mix(in srgb, var(--color-gold) 38%, transparent);
		outline: none;
	}

	.jrpg-dialogue-choice:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}

	.jrpg-dialogue-row {
		display: flex;
		align-items: flex-end;
		gap: 1.75rem;
	}

	.jrpg-dialogue-bust {
		flex: none;
		width: 13rem;
		aspect-ratio: 8 / 9;
		margin: 0;
		border: 1px solid color-mix(in srgb, var(--color-gold) 42%, var(--color-frame));
		border-radius: 1.1rem;
		background: radial-gradient(
			120% 100% at 50% 12%,
			color-mix(in srgb, var(--color-panel) 55%, transparent),
			color-mix(in srgb, var(--color-ink) 82%, transparent)
		);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
	}

	.jrpg-dialogue-bust img {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.jrpg-dialogue-bar {
		position: relative;
		flex: 1;
		min-height: 10rem;
		display: grid;
		align-content: space-between;
		gap: 0.75rem;
		padding: 1.9rem 1.75rem 0.95rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
		border-radius: 1rem;
		background:
			linear-gradient(
				100deg,
				color-mix(in srgb, var(--color-panel) 92%, transparent) 0%,
				color-mix(in srgb, var(--color-panel) 55%, var(--color-violet)) 100%
			),
			var(--color-ink);
		box-shadow:
			0 30px 80px rgba(0, 0, 0, 0.55),
			inset 0 1px 0 rgba(255, 246, 224, 0.12);
	}

	.jrpg-dialogue-speaker {
		position: absolute;
		top: -1.05rem;
		left: 1.4rem;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0;
		padding: 0.32rem 0.85rem;
		border: 1px solid rgba(255, 232, 168, 0.9);
		border-radius: 999px;
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
	}

	.jrpg-dialogue-speaker svg {
		width: 0.85rem;
		height: 0.85rem;
	}

	.jrpg-dialogue-line {
		min-height: 2.6rem;
		margin: 0;
		font-size: 1.02rem;
		line-height: 1.55;
	}

	.jrpg-dialogue-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.jrpg-dialogue-dots {
		display: inline-flex;
		gap: 0.4rem;
	}

	.jrpg-dialogue-dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-parchment) 22%, transparent);
	}

	.jrpg-dialogue-dot-on {
		background: var(--color-gold);
		box-shadow: 0 0 10px color-mix(in srgb, var(--color-gold) 45%, transparent);
	}

	.jrpg-dialogue-prompts {
		display: inline-flex;
		align-items: center;
		gap: 1rem;
	}

	.jrpg-dialogue-more {
		align-self: flex-end;
		width: 0;
		height: 0;
		border-top: 0.55rem solid var(--color-gold);
		border-right: 0.55rem solid transparent;
	}

	.jrpg-dialogue-action {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		padding: 0;
		border: none;
		background: none;
		color: var(--color-parchment);
		font-family: var(--font-display);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.03em;
	}

	.jrpg-dialogue-action-secondary {
		color: rgba(246, 239, 224, 0.78);
	}

	.jrpg-dialogue-choice:focus-visible,
	.jrpg-dialogue-action:focus-visible {
		outline: 2px solid var(--color-gold);
		outline-offset: 3px;
		box-shadow: 0 0 0 4px rgba(243, 210, 122, 0.18);
		border-radius: 0.4rem;
	}
</style>
