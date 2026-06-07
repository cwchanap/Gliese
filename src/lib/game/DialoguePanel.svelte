<script lang="ts">
	import { onMount } from 'svelte';
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import type { HudDialogueState } from '$lib/game/ui-bridge/events';

	type Props = {
		dialogue: HudDialogueState;
		onadvance: () => void;
		onclose: () => void;
		onchoose: (choiceId: string) => void;
	};

	let { dialogue, onadvance, onclose, onchoose }: Props = $props();
	let panel = $state<HTMLDialogElement>();

	onMount(() => {
		panel?.focus({ preventScroll: true });

		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});

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
			const firstChoice = dialogue.choices[0];
			if (firstChoice) onchoose(firstChoice.id);
			return;
		}

		onadvance();
	}
</script>

<dialog
	class="jrpg-dialogue-panel glass-panel-strong filigree-frame arcane-window-enter pointer-events-auto absolute bottom-4 left-4 z-[70] m-0 font-body text-parchment"
	aria-label={dialogue.speaker}
	bind:this={panel}
	open
	tabindex="-1"
	onkeydown={handleKeydown}
>
	<div class="grid gap-3">
		<div class="flex items-center justify-between gap-3">
			<p class="jrpg-dialogue-speaker font-display">
				{dialogue.speaker}
			</p>
			{#if dialogue.canClose}
				<button
					type="button"
					class="jrpg-dialogue-action jrpg-dialogue-action-secondary glass-button"
					onclick={onclose}
				>
					{t($locale, 'ui.close')}
				</button>
			{/if}
		</div>

		<p class="jrpg-dialogue-line font-body">{dialogue.line}</p>

		{#if dialogue.mode === 'choice'}
			<div class="grid gap-2 sm:grid-cols-2">
				{#each dialogue.choices as choice (choice.id)}
					<button
						type="button"
						class="jrpg-dialogue-choice glass-button"
						onclick={() => onchoose(choice.id)}
					>
						{choice.label}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex justify-end">
				<button type="button" class="jrpg-dialogue-action glass-button" onclick={onadvance}>
					{t($locale, 'ui.next')}
				</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.jrpg-dialogue-panel {
		width: min(38rem, calc(100vw - 2rem), 72vw);
		padding: 0.85rem 1rem;
	}

	.jrpg-dialogue-speaker {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0;
		color: var(--color-gold);
		text-transform: uppercase;
	}

	.jrpg-dialogue-line {
		min-height: 2.5rem;
		margin: 0;
		font-size: 0.98rem;
		line-height: 1.55;
	}

	.jrpg-dialogue-choice {
		padding: 0.65rem 0.75rem;
		text-align: left;
		font-size: 0.84rem;
	}

	.jrpg-dialogue-action {
		border-radius: 999px;
		padding: 0.55rem 0.9rem;
		font-size: 0.7rem;
	}

	.jrpg-dialogue-action-secondary {
		color: rgba(246, 239, 224, 0.78);
	}

	.jrpg-dialogue-choice:focus-visible,
	.jrpg-dialogue-action:focus-visible {
		outline: 2px solid var(--color-gold);
		outline-offset: 3px;
		box-shadow: 0 0 0 4px rgba(243, 210, 122, 0.18);
	}
</style>
