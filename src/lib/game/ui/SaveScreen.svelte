<script lang="ts">
	import type { SaveState } from '$lib/game/save/save-state';
	import { loadSaveSlots, type SaveSlotRecord, type SaveSlotsState } from '$lib/game/save/slots';
	import { getBaseMaxHp } from '$lib/game/core/progression';
	import { startingPlayer } from '$lib/game/content/player';
	import { deriveEffectiveStats } from '$lib/game/core/stats';
	import { formatPlaytimeSeconds } from '$lib/game/save/playtime';
	import { motionReduced, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { tick } from 'svelte';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';

	interface Props {
		open: boolean;
		/** Latest HUD status line; surfaces "Saved without preview image" feedback. */
		hudStatus: string;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onkeydown: (event: KeyboardEvent) => void;
		onConfirmSlot: (slot: 1 | 2) => void;
	}

	let {
		open,
		hudStatus,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onkeydown,
		onConfirmSlot
	}: Props = $props();

	let slots = $state<SaveSlotsState>(loadSaveSlots());
	let confirmSlot = $state<1 | 2 | null>(null);
	let confirmDialog = $state<HTMLDivElement>();
	let confirmOverwriteButton = $state<HTMLButtonElement>();

	$effect(() => {
		if (open) {
			slots = loadSaveSlots();
			confirmSlot = null;
		}
	});

	// Focus entry: the alertdialog must own focus the moment it opens
	// (final-review finding 9) — primary action first.
	$effect(() => {
		if (confirmSlot === null) return;
		void (async () => {
			await tick();
			confirmOverwriteButton?.focus();
		})();
	});

	const locale = $derived($preferences.locale);

	function slotStats(state: SaveState) {
		const effective = deriveEffectiveStats(
			{
				hp: getBaseMaxHp(startingPlayer.baseHp, state.player.level),
				attack: state.player.attack,
				defense: 0
			},
			state.equipment
		);
		return {
			level: state.player.level,
			coins: state.wallet.coins,
			hp: state.player.hp,
			maxHp: effective.maxHp
		};
	}

	function formatSavedAt(savedAt: string): string {
		const date = new Date(savedAt);
		if (Number.isNaN(date.getTime())) return '';
		const startOfDay = (value: Date) =>
			new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
		const dayMs = 24 * 60 * 60 * 1000;
		const today = startOfDay(new Date());
		const savedDay = startOfDay(date);
		if (savedDay === today) return t(locale, 'ui.today');
		if (savedDay === today - dayMs) return t(locale, 'ui.yesterday');
		return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date);
	}

	function slotAriaLabel(index: number, record: SaveSlotRecord | null): string {
		const displaySlot = index + 1;
		if (!record) return `${t(locale, 'ui.slotEmpty')} ${displaySlot}`;
		return `${displaySlot} · ${record.kind === 'autosave' ? t(locale, 'ui.slotAutosave') : t(locale, 'ui.slotManual')} · ${record.locationLabel}`;
	}

	function chooseSlot(index: 1 | 2) {
		if (slots.slots[index]) {
			confirmSlot = index;
			return;
		}
		onConfirmSlot(index);
		// The save-slot command handler writes synchronously; refresh so the new
		// record shows immediately and a repeat save on this slot asks to overwrite.
		slots = loadSaveSlots();
	}

	function confirmOverwrite() {
		if (confirmSlot === null) return;
		onConfirmSlot(confirmSlot);
		const slot = confirmSlot;
		confirmSlot = null;
		slots = loadSaveSlots();
		// Same restore as cancel: the closing alertdialog must not drop focus.
		focusSlotButton(slot);
	}

	function cancelOverwrite() {
		const slot = confirmSlot;
		confirmSlot = null;
		if (slot !== null) focusSlotButton(slot);
	}

	function focusSlotButton(slot: 1 | 2) {
		void (async () => {
			await tick();
			dialog?.querySelector<HTMLElement>(`[data-focus-id="save-slot-${slot}"]`)?.focus();
		})();
	}

	/** Tab trap inside the overwrite alertdialog (final-review finding 9). */
	function handleConfirmKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			// Swallow Escape so it cancels the overwrite prompt instead of
			// bubbling to the screen-level handler and closing the whole dialog.
			event.preventDefault();
			event.stopPropagation();
			cancelOverwrite();
			return;
		}
		if (event.key !== 'Tab') return;
		const focusable = Array.from(
			confirmDialog?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? []
		);
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}
		const first = focusable[0]!;
		const last = focusable.at(-1)!;
		if (
			event.shiftKey &&
			(document.activeElement === first || document.activeElement === confirmDialog)
		) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}
</script>

{#snippet slotBody(record: SaveSlotRecord | null, index: number)}
	<span class="save-slot-chip font-display" class:save-slot-chip-gold={index === 0}>
		{index + 1}
	</span>
	<div class="save-slot-well">
		{#if record?.thumbnail}
			<img src={record.thumbnail} alt="" aria-hidden="true" draggable="false" />
		{:else}
			<svg
				class="save-slot-well-icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				aria-hidden="true"
			>
				<rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
				<circle cx="9.2" cy="10" r="1.6" />
				<path
					d="M4.5 17.5 L10 12.5 L13.5 15.5 L16.5 13 L19.5 15.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
			<span class="save-slot-well-hint font-display">
				{index === 0 ? t(locale, 'ui.slotEmpty') : t(locale, 'ui.saveHere')}
			</span>
		{/if}
	</div>
	<footer class="save-slot-info">
		<p class="save-slot-kind font-display">
			<span class="save-slot-chapter">{t(locale, 'ui.chapterLabel')}</span>
			<span
				class:save-slot-kind-autosave={record?.kind === 'autosave'}
				class:save-slot-kind-empty={!record}
			>
				{record
					? record.kind === 'autosave'
						? t(locale, 'ui.slotAutosave')
						: t(locale, 'ui.slotManual')
					: t(locale, 'ui.slotEmpty')}
			</span>
		</p>
		{#if record}
			{@const stats = slotStats(record.state)}
			<p class="save-slot-location font-display">{record.locationLabel}</p>
			<p class="save-slot-stats font-display">
				<span class="save-slot-stat">✦ LV {stats.level}</span>
				<span class="save-slot-stat">
					<svg class="save-slot-coin" viewBox="0 0 12 12" aria-hidden="true">
						<circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.7" />
					</svg>
					{stats.coins}
				</span>
				<span class="save-slot-stat">♥ {stats.hp}/{stats.maxHp}</span>
			</p>
			<div class="save-slot-meta">
				<p class="save-slot-timestamp font-display">
					{formatPlaytimeSeconds(record.playtimeSeconds)} · {formatSavedAt(record.savedAt)}
				</p>
				<span class="save-slot-prompt" aria-hidden="true">
					<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
				</span>
			</div>
		{:else}
			<p class="save-slot-location font-display">
				{index === 0 ? t(locale, 'ui.slotEmpty') : t(locale, 'ui.saveHere')}
			</p>
			<div class="save-slot-meta">
				<span class="save-slot-prompt" aria-hidden="true">
					<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
				</span>
			</div>
		{/if}
	</footer>
{/snippet}

{#if open}
	<div
		bind:this={dialog}
		class="save-screen heroic-anim"
		class:heroic-motion-reduced={$motionReduced}
		role="dialog"
		aria-modal="true"
		aria-labelledby="save-heading"
		tabindex="-1"
		{onkeydown}
	>
		<header class="save-header">
			<div>
				<p class="heroic-eyebrow">{t(locale, 'ui.waystone')}</p>
				<h2 id="save-heading" class="save-heading font-display">{t(locale, 'ui.saveScreen')}</h2>
			</div>
			<button bind:this={closeButton} type="button" class="save-back" onclick={onClose}>
				<span class="save-back-glyph" aria-hidden="true">
					<PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="B" tone="b" />
				</span>
				{t(locale, 'ui.back')}
			</button>
		</header>

		<div class="save-slots heroic-stagger">
			{#each slots.slots as record, index (index)}
				{#if index === 0}
					<article
						class="save-slot"
						class:save-slot-autosave={record !== null}
						data-testid="save-slot-autosave"
					>
						{@render slotBody(record, index)}
					</article>
				{:else}
					<button
						type="button"
						class="save-slot save-slot-action"
						data-testid="save-slot-{index}"
						data-focus-id={`save-slot-${index}`}
						data-focus-row={0}
						data-focus-column={index - 1}
						aria-label={slotAriaLabel(index, record)}
						onclick={() => chooseSlot(index as 1 | 2)}
					>
						{@render slotBody(record, index)}
					</button>
				{/if}
			{/each}
		</div>

		<footer class="save-footer">
			<p class="save-status font-display" role="status">{hudStatus}</p>
			{#if confirmSlot !== null}
				<div
					class="save-confirm"
					role="alertdialog"
					aria-label={t(locale, 'ui.overwriteTitle')}
					bind:this={confirmDialog}
					tabindex="-1"
					onkeydown={handleConfirmKeydown}
				>
					<p class="font-display">{t(locale, 'ui.overwriteTitle')}</p>
					<button
						type="button"
						class="heroic-segment"
						data-focus-id="save-overwrite-cancel"
						data-focus-row={1}
						data-focus-column={0}
						onclick={cancelOverwrite}
					>
						{t(locale, 'ui.back')}
					</button>
					<button
						type="button"
						class="heroic-segment heroic-segment-selected"
						data-testid="confirm-overwrite"
						data-focus-id="save-overwrite-confirm"
						data-focus-row={1}
						data-focus-column={1}
						bind:this={confirmOverwriteButton}
						onclick={confirmOverwrite}
					>
						{t(locale, 'ui.confirmOverwrite')}
					</button>
				</div>
			{/if}
		</footer>
	</div>
{/if}

<style>
	/* Full-bleed page surface per the save mockup: opaque backdrop, no modal frame. */
	.save-screen {
		position: absolute;
		inset: 0;
		z-index: 50;
		display: flex;
		flex-direction: column;
		padding: 3.25rem 3.5rem;
		overflow-y: auto;
		background: var(--heroic-screen-background);
	}

	.save-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.save-heading {
		margin: 0.45rem 0 0;
		color: var(--color-parchment);
		font-size: 2.2rem;
		font-weight: 900;
		letter-spacing: 0.01em;
	}

	.save-back {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		border: 0;
		background: transparent;
		padding: 0.3rem 0.2rem;
		color: var(--color-sapphire);
		font-family: var(--font-display);
		font-size: 0.86rem;
		font-weight: 800;
		cursor: pointer;
		transition: color 160ms ease;
	}

	.save-back:hover {
		color: var(--color-parchment);
	}

	.save-back-glyph {
		display: inline-flex;
	}

	.save-slots {
		display: grid;
		flex: 1;
		min-height: 0;
		gap: clamp(1.1rem, 2.1vw, 1.9rem);
		grid-template-columns: repeat(3, 1fr);
		margin-top: 1.9rem;
		overflow: visible;
	}

	.save-slot {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 15rem;
		border: 1px dashed var(--color-frame-strong);
		border-radius: 1.15rem;
		background: linear-gradient(180deg, rgba(126, 156, 235, 0.17), rgba(19, 27, 58, 0.6));
		overflow: hidden;
		text-align: left;
	}

	.save-slot-action {
		cursor: pointer;
		transition:
			border-color 160ms ease,
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.save-slot-action:hover,
	.save-slot-action:focus-visible {
		border-color: rgba(255, 232, 168, 0.8);
		transform: translateY(-2px);
		box-shadow: 0 14px 34px rgba(0, 0, 0, 0.4);
		outline: none;
	}

	.save-slot-autosave {
		border-style: solid;
		border-color: rgba(255, 232, 168, 0.9);
		/* Mockup halo: strong warm outer glow on the selected slot. */
		box-shadow:
			0 0 30px rgba(255, 206, 110, 0.55),
			0 0 60px rgba(255, 206, 110, 0.25);
	}

	.save-slot-chip {
		position: absolute;
		top: 0.7rem;
		left: 0.7rem;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.6rem;
		background: rgba(10, 15, 34, 0.9);
		color: var(--color-parchment);
		font-size: 0.86rem;
		font-weight: 900;
	}

	.save-slot-chip-gold {
		border-color: rgba(255, 232, 168, 0.9);
		background: linear-gradient(180deg, #fdf3d3, #ecd9a4);
		color: #3a2c07;
	}

	/* Large ~square thumbnail well; the 256×144 JPEG renders object-fit: cover. */
	.save-slot-well {
		display: grid;
		flex: 1;
		min-height: 0;
		place-items: center;
		align-content: center;
		gap: 0.65rem;
		padding: 0.5rem;
		overflow: hidden;
		position: relative;
	}

	.save-slot-well img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.save-slot-well-icon {
		width: 1.6rem;
		height: 1.6rem;
		color: rgba(159, 178, 230, 0.55);
	}

	.save-slot-well-hint {
		color: var(--color-muted);
		font-size: 0.74rem;
		text-align: center;
	}

	/* Separated darker info panel below the well. */
	.save-slot-info {
		display: grid;
		gap: 0.42rem;
		padding: 0.9rem 1rem 0.85rem;
		background: linear-gradient(135deg, rgba(34, 74, 164, 0.72), rgba(12, 26, 74, 0.88));
		box-shadow: inset 0 1px 0 rgba(255, 246, 224, 0.07);
	}

	.save-slot-kind {
		display: flex;
		gap: 0.55rem;
		margin: 0;
		color: var(--color-gold);
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		text-transform: uppercase;
	}

	.save-slot-kind-autosave {
		color: #7fe0a8;
	}

	.save-slot-kind-empty {
		color: var(--color-muted);
	}

	.save-slot-location {
		margin: 0;
		color: var(--color-parchment);
		font-size: 1.05rem;
		font-weight: 900;
	}

	.save-slot-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		margin: 0;
		color: #c7d3f2;
		font-size: 0.76rem;
		font-weight: 700;
		letter-spacing: 0.04em;
	}

	.save-slot-stat {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}

	.save-slot-coin {
		width: 0.62rem;
		height: 0.62rem;
	}

	.save-slot-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.25rem;
	}

	.save-slot-timestamp {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.save-slot-prompt {
		display: inline-flex;
		margin-left: auto;
	}

	.save-footer {
		display: grid;
		gap: 0.6rem;
		margin-top: 1.1rem;
	}

	.save-status {
		margin: 0;
		min-height: 1.2rem;
		color: var(--color-sapphire);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.save-confirm {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.7rem;
		border: 1px solid rgba(255, 232, 168, 0.4);
		border-radius: 0.7rem;
		background: rgba(10, 15, 34, 0.85);
		padding: 0.6rem 0.8rem;
	}

	.save-confirm p {
		margin: 0 auto 0 0;
		color: var(--color-parchment);
		font-size: 0.85rem;
		font-weight: 800;
	}

	@media (max-width: 720px) {
		.save-screen {
			padding: 1rem;
		}

		.save-slots {
			flex: none;
			grid-template-columns: 1fr;
		}
	}

	@media (max-height: 600px) {
		.save-screen {
			padding: 1rem;
		}
		.save-slots {
			flex: none;
		}
	}
</style>
