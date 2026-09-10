<script lang="ts">
	import type { SaveState } from '$lib/game/save/save-state';
	import { loadSaveSlots, type SaveSlotRecord, type SaveSlotsState } from '$lib/game/save/slots';
	import { getBaseMaxHp } from '$lib/game/core/progression';
	import { startingPlayer } from '$lib/game/content/player';
	import { deriveEffectiveStats } from '$lib/game/core/stats';
	import { formatPlaytimeSeconds } from '$lib/game/save/playtime';
	import { preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';

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

	$effect(() => {
		if (open) {
			slots = loadSaveSlots();
			confirmSlot = null;
		}
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
	}

	function confirmOverwrite() {
		if (confirmSlot === null) return;
		onConfirmSlot(confirmSlot);
		confirmSlot = null;
	}

	function cancelOverwrite() {
		confirmSlot = null;
	}
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="heroic-window heroic-anim save-window"
			aria-labelledby="save-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<header class="save-header">
				<div>
					<p class="heroic-eyebrow">{t(locale, 'ui.waystone')}</p>
					<h2 id="save-heading" class="heroic-title">{t(locale, 'ui.saveScreen')}</h2>
				</div>
				<button bind:this={closeButton} type="button" class="heroic-segment" onclick={onClose}>
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
							<span class="save-slot-chip save-slot-chip-gold font-display">1</span>
							<div class="save-slot-preview">
								{#if record?.thumbnail}
									<img src={record.thumbnail} alt="" aria-hidden="true" draggable="false" />
								{:else}
									<span class="save-slot-placeholder font-display">{t(locale, 'ui.slotEmpty')}</span
									>
								{/if}
							</div>
							<footer class="save-slot-footer">
								<p
									class="save-slot-kind font-display"
									class:save-slot-kind-autosave={record !== null}
								>
									{t(locale, 'ui.slotAutosave')}
								</p>
								{#if record}
									<p class="save-slot-location font-display">{record.locationLabel}</p>
									<p class="save-slot-stats font-display">
										✦ LV {slotStats(record.state).level}
										· {slotStats(record.state).coins}G · ♥ {slotStats(record.state).hp}/{slotStats(
											record.state
										).maxHp}
									</p>
									<p class="save-slot-timestamp font-display">
										{formatPlaytimeSeconds(record.playtimeSeconds)} · {formatSavedAt(
											record.savedAt
										)}
									</p>
								{:else}
									<p class="save-slot-location font-display">{t(locale, 'ui.slotEmpty')}</p>
								{/if}
							</footer>
						</article>
					{:else}
						<button
							type="button"
							class="save-slot save-slot-action"
							data-testid="save-slot-{index}"
							aria-label={slotAriaLabel(index, record)}
							onclick={() => chooseSlot(index as 1 | 2)}
						>
							<span class="save-slot-chip font-display">{index + 1}</span>
							<div class="save-slot-preview">
								{#if record?.thumbnail}
									<img src={record.thumbnail} alt="" aria-hidden="true" draggable="false" />
								{:else}
									<span class="save-slot-placeholder font-display">{t(locale, 'ui.saveHere')}</span>
								{/if}
							</div>
							<footer class="save-slot-footer">
								<p class="save-slot-kind font-display">
									{record ? t(locale, 'ui.slotManual') : t(locale, 'ui.slotEmpty')}
								</p>
								{#if record}
									<p class="save-slot-location font-display">{record.locationLabel}</p>
									<p class="save-slot-stats font-display">
										✦ LV {slotStats(record.state).level}
										· {slotStats(record.state).coins}G · ♥ {slotStats(record.state).hp}/{slotStats(
											record.state
										).maxHp}
									</p>
									<p class="save-slot-timestamp font-display">
										{formatPlaytimeSeconds(record.playtimeSeconds)} · {formatSavedAt(
											record.savedAt
										)}
									</p>
								{:else}
									<p class="save-slot-location font-display">{t(locale, 'ui.saveHere')}</p>
								{/if}
							</footer>
						</button>
					{/if}
				{/each}
			</div>

			<footer class="save-footer">
				<p class="save-status font-display" role="status">{hudStatus}</p>
				{#if confirmSlot !== null}
					<div class="save-confirm" role="alertdialog" aria-label={t(locale, 'ui.overwriteTitle')}>
						<p class="font-display">{t(locale, 'ui.overwriteTitle')}</p>
						<button type="button" class="heroic-segment" onclick={cancelOverwrite}>
							{t(locale, 'ui.back')}
						</button>
						<button
							type="button"
							class="heroic-segment heroic-segment-selected"
							data-testid="confirm-overwrite"
							onclick={confirmOverwrite}
						>
							{t(locale, 'ui.confirmOverwrite')}
						</button>
					</div>
				{/if}
			</footer>
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
		background: rgba(0, 0, 0, 0.52);
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.save-window {
		flex-direction: column;
		gap: 0;
		padding: 1.5rem;
	}

	.save-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}

	.save-slots {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1.25rem;
		margin-top: 1.4rem;
		overflow-y: auto;
	}

	.save-slot {
		position: relative;
		display: flex;
		flex-direction: column;
		min-height: 0;
		border: 1px dashed var(--color-frame-strong);
		border-radius: 0.9rem;
		background: linear-gradient(180deg, rgba(255, 246, 224, 0.04), rgba(4, 6, 18, 0.5));
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
		border-color: rgba(255, 232, 168, 0.85);
		box-shadow: 0 0 26px rgba(242, 212, 136, 0.2);
	}

	.save-slot-chip {
		position: absolute;
		top: 0.7rem;
		left: 0.7rem;
		z-index: 1;
		display: grid;
		place-items: center;
		width: 1.7rem;
		height: 1.7rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.55rem;
		background: rgba(10, 15, 34, 0.9);
		color: var(--color-parchment);
		font-size: 0.82rem;
		font-weight: 900;
	}

	.save-slot-chip-gold {
		border-color: rgba(255, 232, 168, 0.9);
		background: linear-gradient(180deg, #fdf3d3, #ecd9a4);
		color: #3a2c07;
	}

	.save-slot-preview {
		display: grid;
		place-items: center;
		aspect-ratio: 16 / 9;
		margin: 0.7rem 0.7rem 0;
		border-radius: 0.55rem;
		background: rgba(4, 6, 18, 0.55);
		overflow: hidden;
	}

	.save-slot-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.save-slot-placeholder {
		color: var(--color-muted);
		font-size: 0.76rem;
	}

	.save-slot-footer {
		display: grid;
		gap: 0.3rem;
		padding: 0.8rem 0.95rem 0.95rem;
	}

	.save-slot-kind {
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

	.save-slot-location {
		margin: 0;
		color: var(--color-parchment);
		font-size: 1rem;
		font-weight: 900;
	}

	.save-slot-stats {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.74rem;
		letter-spacing: 0.04em;
	}

	.save-slot-timestamp {
		margin: 0.15rem 0 0;
		color: var(--color-muted);
		font-size: 0.7rem;
	}

	.save-footer {
		display: grid;
		gap: 0.6rem;
		margin-top: 1.2rem;
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
		.save-slots {
			grid-template-columns: 1fr;
		}
	}
</style>
