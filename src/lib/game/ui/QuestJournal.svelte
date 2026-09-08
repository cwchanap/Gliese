<script lang="ts">
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import type { HudQuestEntry, HudQuestOffer, HudQuestState } from '$lib/game/core/quests';

	interface Props {
		open: boolean;
		quests: HudQuestState;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		open,
		quests,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onkeydown
	}: Props = $props();

	function hasQuestProgress(quest: HudQuestEntry | HudQuestOffer): quest is HudQuestEntry {
		return 'progress' in quest;
	}
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="glass-panel-strong arcane-window-enter jrpg-window jrpg-window-narrow"
			aria-labelledby="quest-log-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<div class="jrpg-window-header">
				<div>
					<p class="jrpg-label">{t($locale, 'ui.fieldJournal')}</p>
					<h2 id="quest-log-heading" class="jrpg-window-title font-display">
						{t($locale, 'ui.questLog')}
					</h2>
				</div>
				<button
					bind:this={closeButton}
					type="button"
					class="glass-button jrpg-small-button"
					onclick={onClose}
				>
					{t($locale, 'ui.close')}
				</button>
			</div>
			<div class="jrpg-window-body">
				<div class="grid gap-4 lg:grid-cols-2">
					<section class="jrpg-quest-section p-4">
						<h3 class="text-sm font-black tracking-[0.22em] text-sapphire uppercase">
							{t($locale, 'ui.main')}
						</h3>
						{#if quests.main}
							<article class="jrpg-quest-card mt-3">
								<h4 class="font-black tracking-[0.1em] text-parchment uppercase">
									{quests.main.title}
								</h4>
								<p class="mt-2 text-sm text-parchment/82">{quests.main.objective}</p>
								<p class="mt-2 text-xs font-black tracking-[0.16em] text-sapphire/72 uppercase">
									{quests.main.progress.label}: {quests.main.progress.current} /
									{quests.main.progress.target}
								</p>
								<p class="mt-1 text-xs text-muted/72">
									{t($locale, 'ui.reward', {
										rewardSummary: quests.main.rewardSummary
									})}
								</p>
							</article>
						{/if}
					</section>
					<section class="jrpg-quest-section p-4">
						<h3 class="text-sm font-black tracking-[0.22em] text-emerald uppercase">
							{t($locale, 'ui.side')}
						</h3>
						<div class="mt-3 grid gap-3">
							{#each [...quests.side, ...(quests.guildOffer?.quests ?? [])] as quest (quest.questId)}
								<article class="jrpg-quest-card">
									<h4 class="font-black tracking-[0.1em] text-parchment uppercase">
										{quest.title}
									</h4>
									<p class="mt-2 text-sm text-parchment/82">{quest.objective}</p>
									{#if hasQuestProgress(quest)}
										<p class="mt-2 text-xs font-black tracking-[0.16em] text-emerald/72 uppercase">
											{quest.progress.label}: {quest.progress.current} / {quest.progress.target}
										</p>
									{:else}
										<p class="mt-2 text-xs font-black tracking-[0.16em] text-gold/72 uppercase">
											{t($locale, 'ui.availableFromGuildMaster')}
										</p>
									{/if}
									<p class="mt-1 text-xs text-muted/72">
										{t($locale, 'ui.reward', { rewardSummary: quest.rewardSummary })}
									</p>
								</article>
							{/each}
							{#if quests.side.length === 0 && !quests.guildOffer}
								<p class="text-sm text-muted/72">
									{t($locale, 'ui.noSideQuestsActive')}
								</p>
							{/if}
						</div>
					</section>
				</div>
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
		background: rgba(0, 0, 0, 0.52);
		padding: 1rem;
		backdrop-filter: blur(3px);
	}

	.jrpg-window {
		position: relative;
		z-index: 10;
		display: grid;
		max-height: calc(100vh - 2rem);
		width: min(76rem, calc(100vw - 2rem));
		grid-template-rows: auto minmax(0, 1fr);
		overflow: hidden;
		/* border/background/shadow now from glass-panel-strong component class */
		color: var(--color-parchment);
	}

	.jrpg-window-narrow {
		width: min(64rem, calc(100vw - 2rem));
	}

	.jrpg-window-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid rgba(244, 229, 184, 0.14);
		padding: 1rem;
	}

	.jrpg-window-title {
		margin: 0.2rem 0 0;
		font-size: clamp(1.25rem, 3vw, 1.9rem);
		font-weight: 700;
		color: var(--color-parchment);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.jrpg-window-body {
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
	}

	.jrpg-quest-section {
		border: 1px solid rgba(244, 229, 184, 0.14);
		border-radius: var(--radius-arcane);
		background: rgba(255, 255, 255, 0.055);
	}

	.jrpg-quest-card {
		border: 1px solid rgba(244, 229, 184, 0.12);
		border-radius: 0.45rem;
		background: rgba(0, 0, 0, 0.16);
		padding: 0.65rem;
	}

	@media (max-width: 640px) {
		.jrpg-modal-backdrop {
			align-items: stretch;
			padding: 0.5rem;
		}

		.jrpg-window {
			max-height: calc(100vh - 1rem);
			width: calc(100vw - 1rem);
		}

		.jrpg-window-header {
			padding: 0.85rem;
		}

		.jrpg-window-body {
			padding: 0.75rem;
		}
	}
</style>
