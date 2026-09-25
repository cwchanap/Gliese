<script lang="ts">
	import { locale, motionReduced } from '$lib/game/i18n/store';
	import { t, type MessageKey } from '$lib/game/i18n/translate';
	import type { Locale } from '$lib/game/i18n/locales';
	import { getQuest, type QuestObjective } from '$lib/game/content/quests';
	import { getEnemyText, getItemText, getNpcText } from '$lib/game/i18n/content';
	import { maps } from '$lib/game/content/maps';
	import { VILLAGE_INTERIOR_PACKAGES } from '$lib/game/content/backgrounds/village-interior-packages';
	import { getItem } from '$lib/game/content/items';
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

	/** Objective-chain node labels: localized content names — never raw ids. */
	function objectiveChainLabel(locale: Locale, objective: QuestObjective): string {
		if (objective.kind === 'talk-to-npc') {
			return getNpcText(locale, objective.npcId)?.name ?? objective.description;
		}
		if (objective.kind === 'defeat-enemy') {
			return getEnemyText(locale, objective.enemyId)?.name ?? objective.description;
		}
		const itemId = objective.sources[0]?.itemId;
		return (itemId ? getItemText(locale, itemId)?.name : null) ?? objective.description;
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
		// Match the chain position on the stable objective id — translated
		// description text changes under the player's feet on a locale switch.
		const currentMatch = objectives.findIndex(
			(objective) => objective.id === row.entry.objectiveId
		);
		const giverNpcId =
			definition?.giverNpcId ??
			objectives.find((objective) => objective.kind === 'talk-to-npc')?.npcId ??
			null;

		const giverMap = Object.values(maps).find((map) =>
			map.npcs?.some((npc) => npc.id === giverNpcId)
		);
		const mapArt = VILLAGE_INTERIOR_PACKAGES.find((entry) => entry.mapId === giverMap?.id)
			?.assets[0]?.path;

		return {
			row,
			mapArt,
			chain: objectives.map<ChainNode>((objective) => ({
				id: objective.id,
				label: objectiveChainLabel($locale, objective),
				kind: objective.kind
			})),
			currentIndex: Math.max(0, currentMatch),
			reward: definition?.reward ?? null,
			giverName: giverNpcId ? (getNpcText($locale, giverNpcId)?.name ?? null) : null,
			locationLabel: giverNpcId ? questGiverLocation($locale, giverNpcId) : null
		};
	});

	/**
	 * Chapter-progress panel (source 05-quest left rail): real main-quest
	 * objectives only, presented honestly — objectives before the HUD's current
	 * one are done, the current one carries the live HUD count, the rest are
	 * pending. No fabricated per-objective counts.
	 */
	const chapterProgress = $derived.by(() => {
		const main = quests.main;
		if (!main) return null;
		const objectives = getQuest(main.questId)?.objectives ?? [];
		if (objectives.length === 0) return null;
		const doneCount =
			main.status === 'completed'
				? objectives.length
				: Math.max(
						0,
						objectives.findIndex((objective) => objective.id === main.objectiveId)
					);
		return {
			percent: Math.round((doneCount / objectives.length) * 100),
			rows: objectives.map((objective, index) => ({
				id: objective.id,
				label: objectiveChainLabel($locale, objective),
				state:
					index < doneCount
						? ('done' as const)
						: index === doneCount
							? ('current' as const)
							: ('pending' as const),
				count:
					index === doneCount && main.status !== 'completed'
						? (`${main.progress.current} / ${main.progress.target}` as const)
						: null
			}))
		};
	});

	function rowKindLabel(kind: QuestRowKind): string {
		if (kind === 'main') return t($locale, 'ui.main');
		if (kind === 'side') return t($locale, 'ui.side');
		return t($locale, 'ui.questOffered');
	}

	/** Side-quest glyphs follow the mockup vocabulary: slime (defeat) or
	 *  key (collect), picked from the quest's first objective. */
	function getSideIconKind(questId: string): 'slime' | 'relic' {
		const objective = getQuest(questId)?.objectives[0];
		return objective?.kind === 'collect-item' ? 'relic' : 'slime';
	}
</script>

{#if open}
	<div
		bind:this={dialog}
		class="quest-screen heroic-anim"
		class:heroic-motion-reduced={$motionReduced}
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
				{#each rows as row, index (row.key)}
					{@const selected = selectedRow?.key === row.key}
					<button
						type="button"
						data-testid={row.testid}
						data-focus-id={`quest-row-${row.key}`}
						data-focus-row={index}
						data-focus-column={0}
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
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									stroke-linejoin="round"
								>
									{#if getSideIconKind(row.entry.questId) === 'slime'}
										<path
											d="M12 6c4 0 7 3.6 7 7.5A2.5 2.5 0 0 1 16.5 16h-9A2.5 2.5 0 0 1 5 13.5C5 9.6 8 6 12 6z"
										/>
									{:else}
										<path d="M15 4a5 5 0 1 0-3.5 8.5L4 20h4v-3h3v-3l.5-.5A5 5 0 0 0 15 4z" />
									{/if}
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

			{#if chapterProgress}
				<aside
					class="quest-chapter"
					data-testid="quest-chapter-progress"
					aria-label={t($locale, 'ui.questChapterProgress')}
				>
					<header class="quest-chapter-head">
						<p class="quest-panel-label quest-chapter-label font-display">
							{t($locale, 'ui.questChapterProgress')}
						</p>
						<span class="quest-chapter-percent font-display">{chapterProgress.percent}%</span>
					</header>
					<div class="quest-chapter-bar" aria-hidden="true">
						<div class="quest-chapter-fill" style:width="{chapterProgress.percent}%"></div>
					</div>
					<ul class="quest-chapter-rows">
						{#each chapterProgress.rows as row (row.id)}
							<li
								class="quest-chapter-row quest-chapter-row-{row.state}"
								data-testid="quest-progress-row"
							>
								<span class="quest-chapter-dot" aria-hidden="true"></span>
								<span class="quest-chapter-row-label font-display">{row.label}</span>
								<span class="quest-chapter-row-count font-display">
									{#if row.state === 'done'}✓{:else if row.count}{row.count}{/if}
								</span>
							</li>
						{/each}
					</ul>
				</aside>
			{/if}

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

					<section class="quest-rewards-panel">
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
										<span class="quest-reward-label font-display"
											>{t($locale, 'ui.rewardCoins')}</span
										>
									</div>
								{/if}
								{#each detail.reward.items ?? [] as item (item.itemId)}
									<div class="quest-reward" data-testid="quest-reward-item">
										<span class="quest-reward-icon quest-reward-icon-item" aria-hidden="true">
											<img src={getItem(item.itemId)?.iconPath} alt="" />
										</span>
										<span class="quest-reward-value font-display">x{item.quantity}</span>
										<span class="quest-reward-label font-display"
											>{t($locale, 'ui.rewardItem')}</span
										>
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
								<div class="quest-giver-copy">
									<p class="quest-giver-name font-display" data-testid="quest-giver-name">
										{detail.giverName}
									</p>
									{#if detail.locationLabel}
										<p class="quest-giver-location font-display" data-testid="quest-giver-location">
											{detail.locationLabel}
										</p>
									{/if}
								</div>
							</div>
						{/if}
					</section>
				</div>

				{#if detail.locationLabel && detail.mapArt}
					<aside class="quest-map-card" aria-label={t($locale, 'ui.questMapContext')}>
						<p class="quest-panel-label font-display">{t($locale, 'ui.questMapContext')}</p>
						<div class="quest-map-thumb">
							<img src={detail.mapArt} alt={detail.locationLabel} data-testid="quest-map-image" />
						</div>
						<p class="quest-map-pin font-display" data-testid="quest-map-pin">
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
		gap: 1.5rem;
		padding: 1.75rem;
		overflow: hidden;
		background: var(--heroic-screen-background);
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
		flex: none;
		max-height: 45%;
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
		padding: 0.95rem 1rem;
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
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-shade));
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

	/* ---- Chapter progress (real main-quest objectives) --------------------- */
	.quest-chapter {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-height: 10rem;
		overflow-y: auto;
		margin-top: 1.1rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.9rem;
		padding: 0.9rem 1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 22%, transparent)
			),
			var(--color-panel-deep);
	}

	.quest-chapter-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.quest-chapter-label {
		margin: 0;
	}

	.quest-chapter-percent {
		color: var(--color-gold);
		font-size: 0.85rem;
		font-weight: 900;
	}

	.quest-chapter-bar {
		overflow: hidden;
		height: 0.3rem;
		margin-top: 0.55rem;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-frame-strong) 60%, transparent);
	}

	.quest-chapter-fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--color-gold), var(--color-gold-bright));
	}

	.quest-chapter-rows {
		display: grid;
		flex: 1;
		grid-auto-rows: minmax(2.5rem, 1fr);
		gap: 0.45rem;
		margin: 0.7rem 0 0;
		padding: 0;
		list-style: none;
	}

	.quest-chapter-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.85rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.75rem;
		background: rgba(8, 18, 48, 0.44);
	}

	.quest-chapter-dot {
		flex: none;
		width: 0.45rem;
		height: 0.45rem;
		border-radius: 999px;
		background: var(--color-muted);
	}
	.quest-chapter-row-done .quest-chapter-dot {
		background: var(--color-emerald);
	}
	.quest-chapter-row-current .quest-chapter-dot {
		background: var(--color-gold);
		box-shadow: 0 0 8px color-mix(in srgb, var(--color-gold) 60%, transparent);
	}

	.quest-chapter-row-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.quest-chapter-row-current .quest-chapter-row-label {
		color: var(--color-parchment);
	}

	.quest-chapter-row-count {
		color: var(--color-muted);
		font-size: 0.62rem;
		font-weight: 800;
	}
	.quest-chapter-row-done .quest-chapter-row-count {
		color: var(--color-emerald);
	}
	.quest-chapter-row-current .quest-chapter-row-count {
		color: var(--color-gold);
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
		display: grid;
		grid-template-columns: minmax(0, 1fr) 21rem;
		grid-template-rows: auto auto auto minmax(0, 1fr);
		flex: 1;
		gap: 1.5rem;
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
		/* Mockup encloses the whole detail column in one large bordered card. */
		border: 1px solid rgba(255, 232, 170, 0.7);
		border-radius: 1.5rem;
		padding: 1.75rem 1.875rem;
		background: linear-gradient(
			135deg,
			rgba(34, 74, 164, 0.8),
			rgba(12, 26, 74, 0.9) 55%,
			rgba(46, 28, 96, 0.85)
		);
		box-shadow:
			inset 0 0 0 3px rgba(255, 214, 120, 0.12),
			inset 0 2px 0 rgba(255, 255, 255, 0.24);
	}

	.quest-detail-main {
		display: contents;
	}

	.quest-detail-head,
	.quest-detail-progress,
	.quest-chain {
		grid-column: 1 / -1;
	}
	.quest-rewards-panel {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 16rem;
		padding: 1.375rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 40%, transparent);
		border-radius: 1.25rem;
		background: rgba(12, 26, 74, 0.5);
	}
	.quest-rewards-panel > .quest-panel-label:first-child {
		margin-top: 0;
	}
	.quest-reward-icon img {
		width: 2.4rem;
		height: 2.4rem;
		object-fit: contain;
		image-rendering: pixelated;
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
		width: 5rem;
		height: 5rem;
		border: 1px solid rgba(255, 232, 168, 0.85);
		border-radius: 1rem;
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-shade));
		color: #3a2c07;
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}
	.quest-detail-icon svg {
		width: 2rem;
		height: 2rem;
	}

	.quest-detail-title {
		margin: 0.3rem 0 0;
		font-size: clamp(1.5rem, 2.6vw, 2.3rem);
		font-weight: 900;
		color: var(--color-parchment);
	}

	.quest-detail-desc {
		margin: 0.35rem 0 0;
		font-family: var(--font-body);
		font-size: 1rem;
		color: var(--color-muted);
	}

	.quest-detail-objective {
		margin: 0.55rem 0 0;
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--color-gold);
	}

	.quest-detail-progress {
		justify-self: start;
		margin: 0;
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
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.quest-chain-node {
		display: grid;
		flex: none;
		justify-items: center;
		gap: 0.45rem;
		width: 10rem;
	}

	.quest-chain-icon {
		display: grid;
		place-items: center;
		width: 3.8rem;
		height: 3.8rem;
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
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold-shade));
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
		flex: none;
		width: 3rem;
		min-width: 1.2rem;
		height: 1px;
		margin-top: 1.9rem;
		background: color-mix(in srgb, var(--color-frame-strong) 80%, transparent);
	}

	/* ---- Rewards ------------------------------------------------------------- */
	.quest-reward-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.85rem;
		flex: 1;
		margin-top: 0.7rem;
	}

	.quest-reward {
		display: grid;
		flex: 1;
		align-content: center;
		justify-items: center;
		gap: 0.35rem;
		min-width: 0;
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
		width: 5rem;
		height: 5rem;
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

	.quest-giver-copy {
		min-width: 0;
	}

	.quest-giver-name {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.quest-giver-location {
		margin: 0.1rem 0 0;
		color: var(--color-muted);
		font-size: 0.7rem;
		font-weight: 700;
	}

	.quest-map-card {
		position: relative;
		display: flex;
		flex: none;
		flex-direction: column;
		min-height: 16rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 50%, transparent);
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
		min-height: 0;
		overflow: hidden;
		place-items: center;
		border: 1px solid var(--color-frame);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--color-ink) 45%, var(--color-panel-deep));
		color: var(--color-muted);
	}
	.quest-map-thumb img {
		width: 100%;
		height: 100%;
		min-height: 0;
		object-fit: contain;
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
			display: flex;
			flex: none;
			flex-direction: column;
			overflow: visible;
		}

		.quest-detail-main {
			overflow: visible;
		}
	}
	@media (max-width: 1200px) and (min-width: 901px) {
		.quest-rail {
			width: 18rem;
		}
		.quest-detail {
			grid-template-columns: minmax(0, 1fr) 13rem;
		}
		.quest-chain-node {
			width: 7rem;
		}
		.quest-reward-icon {
			width: 3rem;
			height: 3rem;
		}
	}
</style>
