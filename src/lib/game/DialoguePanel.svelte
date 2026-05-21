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
	class="jrpg-dialogue-panel pointer-events-auto absolute bottom-4 left-4 z-[70] m-0 text-slate-50"
	aria-label={dialogue.speaker}
	bind:this={panel}
	open
	tabindex="-1"
	onkeydown={handleKeydown}
>
	<div class="grid gap-3">
		<div class="flex items-center justify-between gap-3">
			<p class="jrpg-dialogue-speaker">
				{dialogue.speaker}
			</p>
			{#if dialogue.canClose}
				<button
					type="button"
					class="jrpg-dialogue-action jrpg-dialogue-action-secondary"
					onclick={onclose}
				>
					{t($locale, 'ui.close')}
				</button>
			{/if}
		</div>

		<p class="jrpg-dialogue-line">{dialogue.line}</p>

		{#if dialogue.mode === 'choice'}
			<div class="grid gap-2 sm:grid-cols-2">
				{#each dialogue.choices as choice (choice.id)}
					<button type="button" class="jrpg-dialogue-choice" onclick={() => onchoose(choice.id)}>
						{choice.label}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex justify-end">
				<button type="button" class="jrpg-dialogue-action" onclick={onadvance}>
					{t($locale, 'ui.next')}
				</button>
			</div>
		{/if}
	</div>
</dialog>

<style>
	.jrpg-dialogue-panel {
		width: min(38rem, calc(100vw - 2rem), 72vw);
		border: 1px solid rgba(255, 248, 232, 0.38);
		border-radius: 0.35rem;
		background: rgba(26, 20, 40, 0.98);
		padding: 0.85rem 1rem;
		color: #fff8e8;
		box-shadow:
			0 18px 42px rgba(0, 0, 0, 0.46),
			inset 0 0 0 2px rgba(10, 6, 18, 0.72),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.jrpg-dialogue-speaker {
		margin: 0;
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0;
		color: #ffd040;
		text-transform: uppercase;
	}

	.jrpg-dialogue-line {
		min-height: 2.5rem;
		margin: 0;
		color: #fff8e8;
		font-size: 0.98rem;
		line-height: 1.55;
	}

	.jrpg-dialogue-choice,
	.jrpg-dialogue-action {
		border: 1px solid rgba(255, 248, 232, 0.22);
		background: rgba(255, 255, 255, 0.07);
		color: #fff8e8;
		font-weight: 900;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			transform 160ms ease;
	}

	.jrpg-dialogue-choice {
		border-radius: 0.35rem;
		padding: 0.65rem 0.75rem;
		text-align: left;
		font-size: 0.84rem;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.jrpg-dialogue-action {
		border-radius: 999px;
		padding: 0.55rem 0.9rem;
		font-size: 0.7rem;
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.jrpg-dialogue-action-secondary {
		color: rgba(255, 248, 232, 0.78);
	}

	.jrpg-dialogue-choice:hover,
	.jrpg-dialogue-choice:focus-visible,
	.jrpg-dialogue-action:hover,
	.jrpg-dialogue-action:focus-visible {
		border-color: rgba(255, 248, 232, 0.46);
		background: rgba(255, 208, 64, 0.13);
		transform: translateY(-1px);
	}

	.jrpg-dialogue-choice:focus-visible,
	.jrpg-dialogue-action:focus-visible {
		outline: 2px solid var(--jrpg-amber, #ffd040);
		outline-offset: 3px;
		box-shadow: 0 0 0 4px rgba(255, 208, 64, 0.18);
	}
</style>
