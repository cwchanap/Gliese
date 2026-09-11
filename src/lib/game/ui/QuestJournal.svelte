<script lang="ts">
	import { locale } from '$lib/game/i18n/store';
	import { t, type MessageKey } from '$lib/game/i18n/translate';
	import type { Locale } from '$lib/game/i18n/locales';
	import { getQuest, type QuestObjective } from '$lib/game/content/quests';
	import { getNpcText, getQuestObjectiveText } from '$lib/game/i18n/content';
	import { maps } from '$lib/game/content/maps';
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

	type QuestRowKind = 'main' | 'side' | 'offer';

	type QuestRow = {
		key: string;
		kind: QuestRowKind;
		testid: `quest-entry-${QuestRowKind}`;
		entry: HudQuestEntry | HudQuestOffer;
		progress: { current: number; target: number } | null;
	};

	type ChainNode = { id: string; label: string; kind: QuestObjective['kind'] };

	function hasQuestProgress(quest: HudQuestEntry | HudQuestOffer): quest is HudQuestEntry {
		return 'progress' in quest;
	}

	/** Objective-chain node labels: title-cased content ids (locale-neutral). */
	function titleCaseId(id: string): string {
		return id
			.split('-')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	function objectiveChainLabel(objective: QuestObjective): string {
		if (objective.kind === 'talk-to-npc') return titleCaseId(objective.npcId);
		if (objective.kind === 'defeat-enemy') return titleCaseId(objective.enemyId);
		return titleCaseId(objective.sources[0]?.itemId ?? objective.id);
	}

	function questGiverLocation(locale: Locale, npcId: string): string | null {
		for (const map of Object.values(maps)) {
			if ((map.npcs ?? []).some((npc) => npc.id === npcId)) {
				return t(locale, `content.maps.areas.${map.id}` as MessageKey);
			}
		}
		return null;
	}

	const rows = $derived.by<QuestRow[]>(() => {
		const result: QuestRow[] = [];
		if (quests.main) {
			result.push({
				key: 'main',
				kind: 'main',
				testid: 'quest-entry-main',
				entry: quests.main,
				progress: quests.main.progress
			});
		}
		for (const entry of quests.side) {
			result.push({
				key: `side:${entry.questId}`,
				kind: 'side',
				testid: 'quest-entry-side',
				entry,
				progress: entry.progress
			});
		}
		for (const entry of quests.guildOffer?.quests ?? []) {
			result.push({
				key: `offer:${entry.questId}`,
				kind: 'offer',
				testid: 'quest-entry-offer',
				entry,
				progress: null
			});
		}
		return result;
	});

	let selectedKey = $state<string | null>(null);

	$effect(() => {
		if (!open) selectedKey = null;
	});

	// Main quest is preselected; falls through to the first side/offer row.
	const selectedRow = $derived(rows.find((row) => row.key === selectedKey) ?? rows[0] ?? null);

	const detail = $derived.by(() => {
		const row = selectedRow;
		if (!row) return null;

		const definition = getQuest(row.entry.questId);
		const objectives = definition?.objectives ?? [];
		// The HUD entry carries the current objective's description; match it
		// back to the chain position (fallback: first node).
		const currentMatch = objectives.findIndex(
			(objective) =>
				getQuestObjectiveText($locale, row.entry.questId, objective.id)?.description ===
				row.entry.objective
		);
		const giverNpcId =
			definition?.giverNpcId ??
			objectives.find((objective) => objective.kind === 'talk-to-npc')?.npcId ??
			null;

		return {
			row,
			chain: objectives.map<ChainNode>((objective) => ({
				id: objective.id,
				label: objectiveChainLabel(objective),
				kind: objective.kind
			})),
			currentIndex: Math.max(0, currentMatch),
			reward: definition?.reward ?? null,
			giverName: giverNpcId ? (getNpcText($locale, giverNpcId)?.name ?? null) : null,
			locationLabel: giverNpcId ? questGiverLocation($locale, giverNpcId) : null
		};
	});

	function rowKindLabel(kind: QuestRowKind): string {
		if (kind === 'main') return t($locale, 'ui.main');
		if (kind === 'side') return t($locale, 'ui.side');
		return t($locale, 'ui.questOffered');
	}
</script>

{#if open}
	<div
		bind:this={dialog}
		class="quest-screen heroic-anim"
		aria-labelledby="quest-log-heading"
		aria-modal="true"
		role="dialog"
		tabindex="-1"
		{onkeydown}
	>
		<nav class="quest-rail" aria-label={t($locale, 'ui.questLog')}>
			<header>
				<p class="heroic-eyebrow">{t($locale, 'ui.fieldJournal')}</p>
				<h2 id="quest-log-heading" class="quest-title font-display">
					{t($locale, 'ui.questLog')}
				</h2>
			</header>

			<div class="quest-rail-entries">
				{#each rows as row (row.key)}
					{@const selected = selectedRow?.key === row.key}
					<button
						type="button"
						data-testid={row.testid}
						class="quest-entry quest-entry-{row.kind} {row.kind === 'offer'
							? 'quest-entry-offered'
							: ''}"
						class:quest-entry-selected={selected}
						aria-pressed={selected}
						onclick={() => (selectedKey = row.key)}
					>
						<span class="quest-entry-icon" aria-hidden="true">
							{#if row.kind === 'main'}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<path
										d="M8 1.8 9.6 5.8 13.8 6.2 10.6 9 11.6 13.2 8 10.9 4.4 13.2 5.4 9 2.2 6.2 6.4 5.8 Z"
									/>
								</svg>
							{:else if row.kind === 'side'}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M8 1.8 13.4 3.8v4.4c0 3-2.3 5.1-5.4 6-3.1-.9-5.4-3-5.4-6V3.8 Z" />
								</svg>
							{:else}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<rect x="3.4" y="2.2" width="9.2" height="11.6" rx="1.2" />
									<path d="M6 5.4h4M6 8h4M6 10.6h2.4" />
								</svg>
							{/if}
						</span>
						<span class="quest-entry-copy">
							<span class="quest-entry-name">{row.entry.title}</span>
							<span class="quest-entry-meta font-display">
								{#if row.kind === 'offer'}
									<span class="quest-entry-badge">{t($locale, 'ui.questOffered')}</span>
								{:else if row.progress}
									{rowKindLabel(row.kind)} · {row.progress.current} / {row.progress.target}
								{/if}
							</span>
						</span>
						<svg class="quest-ring" viewBox="0 0 24 24" aria-hidden="true">
							<circle class="quest-ring-track" cx="12" cy="12" r="9" pathLength="100" />
							{#if row.progress}
								{@const fraction =
									row.progress.target > 0
										? Math.min(100, (row.progress.current / row.progress.target) * 100)
										: 0}
								<circle
									class="quest-ring-value"
									cx="12"
									cy="12"
									r="9"
									pathLength="100"
									stroke-dasharray="{fraction} 100"
								/>
							{/if}
						</svg>
					</button>
				{/each}

				{#if rows.length === 0}
					<p class="quest-rail-hint font-display">{t($locale, 'ui.questJournalEmpty')}</p>
				{:else if quests.side.length === 0 && !quests.guildOffer}
					<p class="quest-rail-hint font-display">{t($locale, 'ui.noSideQuestsActive')}</p>
				{/if}
			</div>

			<button bind:this={closeButton} type="button" class="quest-rail-close" onclick={onClose}>
				<span class="font-display">{t($locale, 'ui.close')}</span>
			</button>
		</nav>

		<section class="quest-detail" data-testid="quest-detail" aria-label={t($locale, 'ui.questLog')}>
			{#if detail}
				<div class="quest-detail-main">
					<header class="quest-detail-head">
						<span class="quest-detail-icon" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
								<path
									d="M8 1.8 9.6 5.8 13.8 6.2 10.6 9 11.6 13.2 8 10.9 4.4 13.2 5.4 9 2.2 6.2 6.4 5.8 Z"
								/>
							</svg>
						</span>
						<div class="min-w-0">
							<p class="heroic-eyebrow">
								{#if detail.row.kind === 'main'}
									{rowKindLabel('main')} · {t($locale, 'ui.chapterLabel')}
								{:else}
									{rowKindLabel(detail.row.kind)}
								{/if}
							</p>
							<h3 class="quest-detail-title font-display">{detail.row.entry.title}</h3>
							<p class="quest-detail-desc">{detail.row.entry.description}</p>
							<p class="quest-detail-objective">{detail.row.entry.objective}</p>
						</div>
					</header>

					{#if hasQuestProgress(detail.row.entry)}
						<p class="quest-detail-progress font-display">
							{`${detail.row.entry.progress.label}: ${detail.row.entry.progress.current} / ${detail.row.entry.progress.target}`}
						</p>
					{/if}

					{#if detail.chain.length > 0}
						<ol class="quest-chain">
							{#each detail.chain as node, index (node.id)}
								<li
									class="quest-chain-node quest-chain-node-{node.kind}"
									class:quest-chain-node-current={index === detail.currentIndex}
									data-testid="quest-chain-node"
								>
									<span class="quest-chain-icon" aria-hidden="true">
										{#if node.kind === 'talk-to-npc'}
											<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
												<circle cx="8" cy="5.2" r="2.6" />
												<path d="M2.8 13.8c.6-2.7 2.7-4.2 5.2-4.2s4.6 1.5 5.2 4.2" />
											</svg>
										{:else if node.kind === 'defeat-enemy'}
											<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
												<path d="M8 1.8 13.4 3.8v4.4c0 3-2.3 5.1-5.4 6-3.1-.9-5.4-3-5.4-6V3.8 Z" />
											</svg>
										{:else}
											<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
												<path d="M8 1.8 13 6l-5 8.2L3 6 Z" />
												<path d="M3 6h10" />
											</svg>
										{/if}
									</span>
									<span class="quest-chain-label font-display">{node.label}</span>
								</li>
								{#if index < detail.chain.length - 1}
									<li class="quest-chain-link" aria-hidden="true"></li>
								{/if}
							{/each}
						</ol>
					{/if}

					{#if detail.reward}
						<p class="quest-panel-label font-display">{t($locale, 'ui.questRewards')}</p>
						<div class="quest-reward-row">
							{#if detail.reward.xp}
								<div class="quest-reward" data-testid="quest-reward-xp">
									<span class="quest-reward-icon quest-reward-icon-xp" aria-hidden="true">
										<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
											<path
												d="M8 1.8 9.6 5.8 13.8 6.2 10.6 9 11.6 13.2 8 10.9 4.4 13.2 5.4 9 2.2 6.2 6.4 5.8 Z"
											/>
										</svg>
									</span>
									<span class="quest-reward-value font-display">{detail.reward.xp}</span>
									<span class="quest-reward-label font-display">{t($locale, 'ui.xp')}</span>
								</div>
							{/if}
							{#if detail.reward.coins}
								<div class="quest-reward" data-testid="quest-reward-coins">
									<span class="quest-reward-icon quest-reward-icon-coins" aria-hidden="true">
										<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
											<circle cx="8" cy="8" r="5.6" />
											<path d="M8 5v6M6.2 6.4h3a1.2 1.2 0 0 1 0 2.4h-2.4a1.2 1.2 0 0 0 0 2.4h3" />
										</svg>
									</span>
									<span class="quest-reward-value font-display">{detail.reward.coins}</span>
									<span class="quest-reward-label font-display">{t($locale, 'ui.rewardCoins')}</span
									>
								</div>
							{/if}
							{#each detail.reward.items ?? [] as item (item.itemId)}
								<div class="quest-reward" data-testid="quest-reward-item">
									<span class="quest-reward-icon quest-reward-icon-item" aria-hidden="true">
										<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
											<rect x="3" y="3" width="10" height="10" rx="1.4" />
											<path d="M3 6.4h10M6.4 6.4V13" />
										</svg>
									</span>
									<span class="quest-reward-value font-display">x{item.quantity}</span>
									<span class="quest-reward-label font-display">{t($locale, 'ui.rewardItem')}</span>
								</div>
							{/each}
						</div>
					{/if}

					{#if detail.giverName}
						<p class="quest-panel-label font-display">{t($locale, 'ui.questTurnedInBy')}</p>
						<div class="quest-giver">
							<span class="quest-giver-icon" aria-hidden="true">
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<circle cx="8" cy="5.2" r="2.6" />
									<path d="M2.8 13.8c.6-2.7 2.7-4.2 5.2-4.2s4.6 1.5 5.2 4.2" />
								</svg>
							</span>
							<p class="quest-giver-name font-display">{detail.giverName}</p>
						</div>
					{/if}
				</div>

				{#if detail.locationLabel}
					<aside class="quest-map-card" aria-label={t($locale, 'ui.questMapContext')}>
						<p class="quest-panel-label font-display">{t($locale, 'ui.questMapContext')}</p>
						<div class="quest-map-thumb" aria-hidden="true">
							<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2">
								<rect x="2" y="3" width="12" height="10" rx="1.2" />
								<path d="m5 11 2.4-3 1.8 2 1.6-2.4L13 11" />
								<circle cx="10.4" cy="5.6" r="1.1" />
							</svg>
						</div>
						<p class="quest-map-pin font-display">
							<svg
								viewBox="0 0 16 16"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								aria-hidden="true"
							>
								<path
									d="M8 14.2c2.6-2.9 4.2-5.1 4.2-7.2a4.2 4.2 0 1 0-8.4 0c0 2.1 1.6 4.3 4.2 7.2 Z"
								/>
								<circle cx="8" cy="6.8" r="1.5" />
							</svg>
							{detail.locationLabel}
						</p>
					</aside>
				{/if}
			{/if}
		</section>
	</div>
{/if}

<style>
	/* Full-bleed Heroic surface (source 05-quest): roster rail left, quest
	   detail centre, map-context card right. */
	.quest-screen {
		position: absolute;
		inset: 0;
		z-index: 50;
		display: flex;
		gap: 1.4rem;
		padding: 1.6rem 1.9rem 1.4rem 1.4rem;
		overflow: hidden;
		background: radial-gradient(
			130% 110% at 50% 0%,
			var(--color-panel) 0%,
			var(--color-panel-deep) 46%,
			var(--color-ink) 100%
		);
		color: var(--color-parchment);
	}

	/* ---- Roster rail ------------------------------------------------------ */
	.quest-rail {
		display: flex;
		flex: none;
		flex-direction: column;
		width: 24rem;
		min-height: 0;
	}

	.quest-title {
		margin: 0.35rem 0 0;
		font-size: clamp(1.7rem, 2.6vw, 2.2rem);
		font-weight: 900;
		letter-spacing: 0.01em;
		color: var(--color-parchment);
	}

	.quest-rail-entries {
		display: grid;
		flex: 1;
		min-height: 0;
		align-content: start;
		gap: 0.85rem;
		margin-top: 1.15rem;
		padding-right: 0.25rem;
		overflow-y: auto;
	}

	.quest-entry {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		width: 100%;
		border: 1px solid var(--color-frame);
		border-radius: 0.9rem;
		padding: 0.7rem 0.8rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 22%, transparent)
			),
			var(--color-panel-deep);
		color: var(--color-parchment);
		text-align: left;
		cursor: pointer;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}
	.quest-entry:hover:not(.quest-entry-selected) {
		border-color: var(--color-frame-strong);
	}

	.quest-entry-selected {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	/* Offered quests: dimmed row, badge carries the state. */
	.quest-entry-offered:not(.quest-entry-selected) {
		color: var(--color-muted);
		background: color-mix(in srgb, var(--color-ink) 40%, var(--color-panel-deep));
	}

	.quest-entry-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.75rem;
		background: color-mix(in srgb, var(--color-panel-deep) 45%, transparent);
		color: var(--color-gold);
	}
	.quest-entry-side .quest-entry-icon {
		color: var(--color-emerald);
	}
	.quest-entry-offered:not(.quest-entry-selected) .quest-entry-icon {
		color: var(--color-muted);
	}
	.quest-entry-icon svg {
		width: 1.2rem;
		height: 1.2rem;
	}
	.quest-entry-selected .quest-entry-icon {
		border-color: rgba(58, 44, 7, 0.4);
		background: color-mix(in srgb, #fff6e0 24%, transparent);
		color: #3a2c07;
	}

	.quest-entry-copy {
		flex: 1;
		min-width: 0;
	}

	.quest-entry-name {
		display: block;
		overflow: hidden;
		font-family: var(--font-display);
		font-size: 0.88rem;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.quest-entry-meta {
		display: block;
		margin-top: 0.15rem;
		color: var(--color-muted);
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.quest-entry-selected .quest-entry-meta {
		color: #3a2c07;
	}
	.quest-entry-side:not(.quest-entry-selected) .quest-entry-meta {
		color: var(--color-emerald);
	}

	.quest-entry-badge {
		display: inline-flex;
		border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
		border-radius: 999px;
		padding: 0.1rem 0.55rem;
		color: var(--color-gold);
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.quest-ring {
		flex: none;
		width: 1.9rem;
		height: 1.9rem;
		transform: rotate(-90deg);
	}
	.quest-ring-track {
		fill: none;
		stroke: color-mix(in srgb, var(--color-frame-strong) 70%, transparent);
		stroke-width: 3.4;
	}
	.quest-ring-value {
		fill: none;
		stroke: var(--color-gold);
		stroke-width: 3.4;
		stroke-linecap: round;
	}
	.quest-entry-side .quest-ring-value {
		stroke: var(--color-emerald);
	}
	.quest-entry-offered .quest-ring-value {
		stroke: var(--color-muted);
	}
	.quest-entry-selected .quest-ring-value,
	.quest-entry-selected .quest-ring-track {
		stroke: #3a2c07;
	}

	.quest-rail-hint {
		margin: 0.2rem 0 0;
		color: var(--color-muted);
		font-size: 0.8rem;
		font-weight: 700;
	}

	.quest-rail-close {
		flex: none;
		margin-top: 0.9rem;
		border: 0;
		background: transparent;
		padding: 0.3rem;
		align-self: start;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transition: color 160ms ease;
	}
	.quest-rail-close:hover {
		color: var(--color-parchment);
	}

	/* ---- Detail column ----------------------------------------------------- */
	.quest-detail {
		display: flex;
		flex: 1;
		gap: 1.4rem;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	.quest-detail-main {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
	}

	.quest-detail-head {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.quest-detail-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 4.2rem;
		height: 4.2rem;
		border: 1px solid rgba(255, 232, 168, 0.85);
		border-radius: 1rem;
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}
	.quest-detail-icon svg {
		width: 2rem;
		height: 2rem;
	}

	.quest-detail-title {
		margin: 0.3rem 0 0;
		font-size: clamp(1.5rem, 2.4vw, 2rem);
		font-weight: 900;
		color: var(--color-parchment);
	}

	.quest-detail-desc {
		margin: 0.35rem 0 0;
		font-size: 0.86rem;
		color: var(--color-muted);
	}

	.quest-detail-objective {
		margin: 0.55rem 0 0;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-gold);
	}

	.quest-detail-progress {
		display: inline-block;
		margin: 0.9rem 0 0;
		border: 1px solid color-mix(in srgb, var(--color-gold) 45%, transparent);
		border-radius: 999px;
		padding: 0.28rem 0.85rem;
		color: var(--color-gold);
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.06em;
	}

	.quest-panel-label {
		margin: 1.4rem 0 0;
		color: var(--color-gold);
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.24em;
		text-transform: uppercase;
	}

	/* ---- Objective chain ---------------------------------------------------- */
	.quest-chain {
		display: flex;
		align-items: flex-start;
		gap: 0.7rem;
		margin-top: 1.1rem;
		padding: 0;
		list-style: none;
	}

	.quest-chain-node {
		display: grid;
		flex: none;
		justify-items: center;
		gap: 0.45rem;
		width: 6.2rem;
	}

	.quest-chain-icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-panel-deep) 45%, transparent);
		color: var(--color-muted);
	}
	.quest-chain-icon svg {
		width: 1.25rem;
		height: 1.25rem;
	}

	.quest-chain-node-current .quest-chain-icon {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 22px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	.quest-chain-label {
		color: var(--color-muted);
		font-size: 0.66rem;
		font-weight: 800;
		text-align: center;
	}
	.quest-chain-node-current .quest-chain-label {
		color: var(--color-parchment);
	}

	.quest-chain-link {
		flex: 1;
		min-width: 1.2rem;
		height: 1px;
		margin-top: 1.5rem;
		background: color-mix(in srgb, var(--color-frame-strong) 80%, transparent);
	}

	/* ---- Rewards ------------------------------------------------------------- */
	.quest-reward-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		margin-top: 0.7rem;
	}

	.quest-reward {
		display: grid;
		justify-items: center;
		gap: 0.35rem;
		min-width: 6.4rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.9rem;
		padding: 0.9rem 0.8rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 22%, transparent)
			),
			var(--color-panel-deep);
	}

	.quest-reward-icon {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--color-ink) 45%, var(--color-panel-deep));
		color: var(--color-violet);
	}
	.quest-reward-icon-coins {
		color: var(--color-gold);
	}
	.quest-reward-icon-item {
		color: var(--color-emerald);
	}
	.quest-reward-icon svg {
		width: 1.2rem;
		height: 1.2rem;
	}

	.quest-reward-value {
		font-size: 1rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.quest-reward-label {
		color: var(--color-muted);
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	/* ---- Giver + map context -------------------------------------------------- */
	.quest-giver {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		margin-top: 0.7rem;
	}

	.quest-giver-icon {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.6rem;
		height: 2.6rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-ink) 45%, var(--color-panel-deep));
		color: var(--color-gold);
	}
	.quest-giver-icon svg {
		width: 1.2rem;
		height: 1.2rem;
	}

	.quest-giver-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.quest-map-card {
		display: flex;
		flex: none;
		flex-direction: column;
		width: 13.5rem;
		border: 1px dashed color-mix(in srgb, var(--color-gold) 42%, var(--color-frame-strong));
		border-radius: 1rem;
		padding: 0.9rem 1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 20%, transparent)
			),
			var(--color-panel);
	}

	.quest-map-thumb {
		display: grid;
		flex: 1;
		min-height: 6rem;
		place-items: center;
		border: 1px solid var(--color-frame);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--color-ink) 45%, var(--color-panel-deep));
		color: var(--color-muted);
	}
	.quest-map-thumb svg {
		width: 2rem;
		height: 2rem;
	}

	.quest-map-pin {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin: 0.7rem 0 0;
		color: var(--color-parchment);
		font-size: 0.78rem;
		font-weight: 800;
	}
	.quest-map-pin svg {
		flex: none;
		width: 0.95rem;
		height: 0.95rem;
		color: var(--color-gold);
	}

	@media (max-width: 900px) {
		.quest-screen {
			flex-direction: column;
			gap: 1rem;
			overflow-y: auto;
		}

		.quest-rail,
		.quest-map-card {
			width: 100%;
		}

		.quest-rail-entries {
			overflow: visible;
		}

		.quest-detail {
			flex: none;
			flex-direction: column;
			overflow: visible;
		}

		.quest-detail-main {
			overflow: visible;
		}
	}
</style>
