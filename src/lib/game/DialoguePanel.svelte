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
	class="pointer-events-auto absolute inset-x-0 bottom-0 z-[70] m-0 w-screen max-w-none rounded-t-[1.2rem] border border-x-0 border-b-0 border-white/18 bg-[linear-gradient(145deg,rgba(8,13,34,0.96),rgba(16,24,44,0.94))] p-4 text-slate-50 shadow-[0_24px_70px_rgba(0,0,0,0.48)] backdrop-blur-md sm:p-5"
	aria-label={dialogue.speaker}
	bind:this={panel}
	open
	tabindex="-1"
	onkeydown={handleKeydown}
>
	<div class="grid gap-3">
		<div class="flex items-center justify-between gap-3">
			<p class="text-[0.65rem] font-black tracking-[0.28em] text-cyan-100/75 uppercase">
				{dialogue.speaker}
			</p>
			{#if dialogue.canClose}
				<button
					type="button"
					class="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-[0.62rem] font-black tracking-[0.2em] text-slate-100 uppercase"
					onclick={onclose}
				>
					{t($locale, 'ui.close')}
				</button>
			{/if}
		</div>

		<p class="min-h-[3rem] text-base leading-7 text-slate-50 sm:text-lg">{dialogue.line}</p>

		{#if dialogue.mode === 'choice'}
			<div class="grid gap-2 sm:grid-cols-2">
				{#each dialogue.choices as choice (choice.id)}
					<button
						type="button"
						class="rounded-[0.8rem] border border-cyan-100/18 bg-cyan-100/8 px-3 py-2 text-left text-sm font-black tracking-[0.08em] text-cyan-50 uppercase transition hover:border-cyan-100/42 hover:bg-cyan-100/14"
						onclick={() => onchoose(choice.id)}
					>
						{choice.label}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex justify-end">
				<button
					type="button"
					class="rounded-full border border-cyan-100/22 bg-cyan-100/10 px-4 py-2 text-xs font-black tracking-[0.2em] text-cyan-50 uppercase"
					onclick={onadvance}
				>
					{t($locale, 'ui.next')}
				</button>
			</div>
		{/if}
	</div>
</dialog>
