<script lang="ts">
	import { onMount, tick } from 'svelte';
	import DialoguePanel from '$lib/game/DialoguePanel.svelte';
	import AreaMapScreen from '$lib/game/ui/AreaMapScreen.svelte';
	import BagScreen from '$lib/game/ui/BagScreen.svelte';
	import FieldHud from '$lib/game/ui/FieldHud.svelte';
	import QuestJournal from '$lib/game/ui/QuestJournal.svelte';
	import ShopScreen from '$lib/game/ui/ShopScreen.svelte';
	import { locale, setActiveLocale } from '$lib/game/i18n/store';
	import { localeLabels, supportedLocales, type Locale } from '$lib/game/i18n/locales';
	import { t } from '$lib/game/i18n/translate';
	import {
		hudState,
		requestBuyShopItem,
		requestCloseShop,
		requestDialogueAdvance,
		requestDialogueChoice,
		requestDialogueClose,
		requestDismissBattleSummary,
		requestEquipItem,
		requestHeal,
		requestOpenShop,
		requestPauseGame,
		requestResume,
		requestResumeGame,
		requestSave,
		requestSellInventoryItem,
		requestUnequipSlot,
		requestUseItem
	} from '$lib/game/ui-bridge/store';
	import type { EquipmentSlot } from '$lib/game/content/items';

	type OverlayPauseOwner = 'settings' | 'inventory' | 'shop' | 'questLog' | 'areaMap';

	let mountNode: HTMLDivElement | undefined;
	let menuButton = $state<HTMLButtonElement>();
	let inventoryDialog = $state<HTMLDivElement>();
	let inventoryCloseButton = $state<HTMLButtonElement>();
	let shopDialog = $state<HTMLDivElement>();
	let shopCloseButton = $state<HTMLButtonElement>();
	let questLogDialog = $state<HTMLDivElement>();
	let questLogCloseButton = $state<HTMLButtonElement>();
	let areaMapDialog = $state<HTMLDivElement>();
	let areaMapCloseButton = $state<HTMLButtonElement>();
	let battleSummaryDialog = $state<HTMLDivElement>();
	let battleSummaryContinueButton = $state<HTMLButtonElement>();
	let inventoryFocusRestoreTarget: HTMLElement | null = null;
	let shopFocusRestoreTarget: HTMLElement | null = null;
	let battleSummaryWasVisible = false;
	let loadError = $state('');
	let commandOpen = $state(false);
	let inventoryOpen = $state(false);
	let shopOpen = $state(false);
	let questLogOpen = $state(false);
	let areaMapOpen = $state(false);
	let pauseOwner = $state<OverlayPauseOwner | null>(null);

	const battlePhase = $derived($hudState.battle.phase);
	const battleLocked = $derived(battlePhase === 'active' || battlePhase === 'summary');
	const battleSummary = $derived($hudState.battle.summary);

	$effect(() => {
		const summaryVisible = battleSummary !== null;
		if (summaryVisible && !battleSummaryWasVisible) void focusBattleSummaryDialog();
		battleSummaryWasVisible = summaryVisible;
	});

	function pauseForOverlay(owner: OverlayPauseOwner) {
		if (battleLocked) return;
		if (pauseOwner === null) requestPauseGame();
		pauseOwner = owner;
	}

	function resumeForOverlay(owner: OverlayPauseOwner) {
		if (pauseOwner !== owner) return;
		pauseOwner = null;
		requestResumeGame();
	}

	function openCommand() {
		if (commandOpen) return;
		commandOpen = true;
		pauseForOverlay('settings');
	}

	function closeCommand() {
		if (!commandOpen) return;
		commandOpen = false;
		resumeForOverlay('settings');
	}

	function openInventory() {
		if (inventoryOpen || battleLocked) return;
		rememberInventoryFocus();
		commandOpen = false;
		inventoryOpen = true;
		pauseForOverlay('inventory');
		void focusInventoryDialog();
	}

	function closeInventory() {
		if (!inventoryOpen) return;
		inventoryOpen = false;
		resumeForOverlay('inventory');
		void restoreInventoryFocus();
	}

	function rememberShopFocus() {
		shopFocusRestoreTarget =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}

	function openShop() {
		if (shopOpen || battleLocked || !$hudState.nearbyShop) return;
		rememberShopFocus();
		commandOpen = false;
		inventoryOpen = false;
		shopOpen = true;
		pauseForOverlay('shop');
		requestOpenShop($hudState.nearbyShop.shopId);
		void focusShopDialog();
	}

	function closeShop() {
		if (!shopOpen) return;
		shopOpen = false;
		requestCloseShop();
		resumeForOverlay('shop');
		void restoreShopFocus();
	}

	function openQuestLog() {
		if (questLogOpen || battleLocked) return;
		commandOpen = false;
		questLogOpen = true;
		pauseForOverlay('questLog');
		void focusQuestLogDialog();
	}

	function closeQuestLog() {
		if (!questLogOpen) return;
		questLogOpen = false;
		resumeForOverlay('questLog');
	}

	function openAreaMap() {
		if (areaMapOpen || battleLocked) return;
		commandOpen = false;
		areaMapOpen = true;
		pauseForOverlay('areaMap');
		void focusAreaMapDialog();
	}

	function closeAreaMap() {
		if (!areaMapOpen) return;
		areaMapOpen = false;
		resumeForOverlay('areaMap');
		void restoreAreaMapFocus();
	}

	function isEditableTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event.key !== 'm' && event.key !== 'M') return;
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		if (event.repeat) return;
		if (isEditableTarget(event.target)) return;

		if (areaMapOpen) {
			event.preventDefault();
			closeAreaMap();
			return;
		}

		const otherOverlayOpen = commandOpen || inventoryOpen || shopOpen || questLogOpen;
		if (otherOverlayOpen || battleLocked || !$hudState.ready) return;

		event.preventDefault();
		openAreaMap();
	}

	$effect(() => {
		if (!$hudState.shop || shopOpen) return;

		rememberShopFocus();
		commandOpen = false;
		inventoryOpen = false;
		shopOpen = true;
		pauseForOverlay('shop');
		void focusShopDialog();
	});

	function releaseOverlayPause() {
		const owner = pauseOwner;
		const wasShopOpen = shopOpen;
		commandOpen = false;
		inventoryOpen = false;
		shopOpen = false;
		questLogOpen = false;
		areaMapOpen = false;
		pauseOwner = null;

		if (wasShopOpen) requestCloseShop();

		if (owner !== null) requestResumeGame();
	}

	function resumeSaveFromMenu() {
		if (battleLocked) return;
		releaseOverlayPause();
		requestResume();
	}

	function saveFromMenu() {
		if (battleLocked) return;
		releaseOverlayPause();
		requestSave();
	}

	function dismissBattleSummary() {
		requestDismissBattleSummary();
	}

	function unequipSlot(slot: EquipmentSlot) {
		if (!$hudState.ready || battleLocked) return;
		requestUnequipSlot(slot);
	}

	function rememberInventoryFocus() {
		inventoryFocusRestoreTarget =
			document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}

	async function focusInventoryDialog() {
		await tick();
		(inventoryCloseButton ?? inventoryDialog)?.focus();
	}

	async function restoreInventoryFocus() {
		const restoreTarget = inventoryFocusRestoreTarget;
		inventoryFocusRestoreTarget = null;
		await tick();

		if (
			restoreTarget &&
			document.contains(restoreTarget) &&
			!restoreTarget.matches('[disabled], [aria-disabled="true"]') &&
			!restoreTarget.closest('#game-command-panel')
		) {
			restoreTarget.focus();
			return;
		}

		menuButton?.focus();
	}

	async function focusShopDialog() {
		await tick();
		(shopCloseButton ?? shopDialog)?.focus();
	}

	async function focusQuestLogDialog() {
		await tick();
		(questLogCloseButton ?? questLogDialog)?.focus();
	}

	async function focusAreaMapDialog() {
		await tick();
		(areaMapCloseButton ?? areaMapDialog)?.focus();
	}

	async function focusBattleSummaryDialog() {
		await tick();
		(battleSummaryContinueButton ?? battleSummaryDialog)?.focus();
	}

	async function restoreAreaMapFocus() {
		await tick();
		menuButton?.focus();
	}

	async function restoreShopFocus() {
		const restoreTarget = shopFocusRestoreTarget;
		shopFocusRestoreTarget = null;
		await tick();

		if (
			restoreTarget &&
			document.contains(restoreTarget) &&
			!restoreTarget.matches('[disabled], [aria-disabled="true"]') &&
			!restoreTarget.closest('#game-command-panel')
		) {
			restoreTarget.focus();
			return;
		}

		menuButton?.focus();
	}

	function getInventoryFocusableElements() {
		if (!inventoryDialog) return [];

		return Array.from(
			inventoryDialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleInventoryDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeInventory();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusableElements = getInventoryFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			inventoryDialog?.focus();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements.at(-1);

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement?.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	function getShopFocusableElements() {
		if (!shopDialog) return [];

		return Array.from(
			shopDialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleShopDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeShop();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusableElements = getShopFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			shopDialog?.focus();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements.at(-1);

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement?.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	function getAreaMapFocusableElements() {
		if (!areaMapDialog) return [];

		return Array.from(
			areaMapDialog.querySelectorAll<HTMLElement | SVGElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleAreaMapDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeAreaMap();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusableElements = getAreaMapFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			areaMapDialog?.focus();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements.at(-1);

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement?.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	function getBattleSummaryFocusableElements() {
		if (!battleSummaryDialog) return [];

		return Array.from(
			battleSummaryDialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleBattleSummaryDialogKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;

		const focusableElements = getBattleSummaryFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			battleSummaryDialog?.focus();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements.at(-1);

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement?.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	function getQuestLogFocusableElements() {
		if (!questLogDialog) return [];

		return Array.from(
			questLogDialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleQuestLogDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeQuestLog();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusableElements = getQuestLogFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			questLogDialog?.focus();
			return;
		}

		const firstElement = focusableElements[0];
		const lastElement = focusableElements.at(-1);

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement?.focus();
		} else if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	onMount(() => {
		let destroyed = false;
		let cleanup = () => {};

		void (async () => {
			try {
				if (!mountNode) return;

				const { createGame } = await import('$lib/game/phaser/createGame');
				const instance = await createGame(mountNode);

				if (destroyed) {
					instance.destroy();
					return;
				}

				cleanup = () => instance.destroy();
			} catch (error) {
				console.error(error);
				if (!destroyed) {
					loadError = t($locale, 'ui.loadGameShellError');
				}
			}
		})();

		return () => {
			destroyed = true;
			cleanup();
		};
	});

	onMount(() => {
		window.addEventListener('keydown', handleGlobalKeydown);
		return () => window.removeEventListener('keydown', handleGlobalKeydown);
	});
</script>

<section
	class="game-shell relative h-screen w-screen overflow-hidden bg-ink font-body text-parchment"
>
	{#if loadError}
		<div
			class="absolute inset-x-6 top-6 z-30 rounded-2xl border border-rose-300/40 bg-rose-950/80 px-4 py-3 text-sm font-semibold text-rose-100 shadow-[0_20px_50px_rgba(80,10,20,0.45)] backdrop-blur"
		>
			{loadError}
		</div>
	{/if}

	<div bind:this={mountNode} class="game-stage absolute inset-0 overflow-hidden bg-[#090d1f]"></div>

	<div
		class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(130,180,255,0.18),transparent_38%),linear-gradient(180deg,rgba(7,10,26,0.1),rgba(4,6,18,0.58)_85%,rgba(3,4,10,0.82))]"
	></div>

	<div class="jrpg-menu-anchor pointer-events-auto">
		<button
			bind:this={menuButton}
			type="button"
			class="glass-button jrpg-command-toggle"
			onclick={() => (commandOpen ? closeCommand() : openCommand())}
			aria-expanded={commandOpen}
			aria-controls="game-command-panel"
		>
			{t($locale, 'ui.menu')}
		</button>
	</div>

	<FieldHud hudState={$hudState} />

	{#if commandOpen}
		<div
			class="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
			role="presentation"
			onclick={closeCommand}
		></div>
		<aside
			id="game-command-panel"
			class="glass-panel-strong jrpg-command-box"
			role="region"
			aria-label={t($locale, 'ui.command')}
		>
			<div class="jrpg-command-heading">
				<p class="jrpg-label">{t($locale, 'ui.command')}</p>
				<button type="button" class="glass-button jrpg-small-button" onclick={closeCommand}>
					{t($locale, 'ui.close')}
				</button>
			</div>
			<div class="arcane-stagger jrpg-command-list">
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={openQuestLog}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.quests')}
				</button>
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={openAreaMap}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.map')}
				</button>
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={openInventory}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.inventory')}
				</button>
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={openShop}
					disabled={!$hudState.ready || battleLocked || !$hudState.nearbyShop}
				>
					{t($locale, 'ui.shop')}
				</button>
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={resumeSaveFromMenu}
					disabled={!$hudState.ready || battleLocked || !$hudState.canResume}
				>
					{t($locale, 'ui.resumeSave')}
				</button>
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={saveFromMenu}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.saveGame')}
				</button>
				<button
					type="button"
					class="glass-button jrpg-command-action"
					onclick={requestHeal}
					disabled={!$hudState.ready || $hudState.heals < 1 || battlePhase === 'summary'}
				>
					{t($locale, 'ui.useHeal')}
				</button>
			</div>
			<div class="jrpg-command-status">
				{$hudState.status}
			</div>
			<label class="jrpg-system-row">
				<span>{t($locale, 'ui.language')}</span>
				<select
					value={$locale}
					onchange={(event) => setActiveLocale(event.currentTarget.value as Locale)}
				>
					{#each supportedLocales as option (option)}
						<option value={option}>{localeLabels[option]}</option>
					{/each}
				</select>
			</label>
		</aside>
	{/if}

	{#if $hudState.dialogue}
		<DialoguePanel
			dialogue={$hudState.dialogue}
			onadvance={requestDialogueAdvance}
			onclose={requestDialogueClose}
			onchoose={requestDialogueChoice}
		/>
	{/if}

	{#if battleSummary}
		<div class="jrpg-modal-backdrop jrpg-battle-summary-backdrop" role="presentation">
			<div
				bind:this={battleSummaryDialog}
				class="glass-panel-strong arcane-window-enter jrpg-window jrpg-window-narrow"
				aria-label={t($locale, 'ui.battleSummary')}
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleBattleSummaryDialogKeydown}
			>
				<div class="jrpg-window-header">
					<div>
						<p
							class="jrpg-label font-display {battleSummary.outcome === 'victory'
								? 'arcane-victory-flash'
								: ''}"
						>
							{battleSummary.outcome === 'victory'
								? t($locale, 'ui.battleVictory')
								: t($locale, 'ui.battleDefeat')}
						</p>
						<h2 class="jrpg-window-title font-display">{t($locale, 'ui.battleSummary')}</h2>
					</div>
				</div>
				<div class="jrpg-window-body">
					<div class="arcane-stagger grid gap-3 text-sm text-parchment/88">
						<p>
							{t($locale, 'ui.enemiesDefeated', {
								count: battleSummary.enemiesDefeated
							})}
						</p>
						<p>{t($locale, 'ui.xpGained', { xp: battleSummary.xpGained })}</p>
						<p>{t($locale, 'ui.coinsGained', { coins: battleSummary.coinsGained })}</p>
						{#if battleSummary.leveledUp}
							<p>{t($locale, 'ui.levelUp')}</p>
						{/if}
						{#if battleSummary.drops.length > 0}
							<ul class="grid gap-1">
								{#each battleSummary.drops as drop (drop.itemId)}
									<li>{drop.name} x{drop.quantity}</li>
								{/each}
							</ul>
						{:else}
							<p>{t($locale, 'ui.noDrops')}</p>
						{/if}
						{#if battleSummary.questRewards.length > 0}
							<ul class="grid gap-1">
								{#each battleSummary.questRewards as questReward (questReward.title)}
									<li>
										{t($locale, 'content.dialogue.system.questCompleteNotice', {
											questTitle: questReward.title,
											rewardSummary: questReward.rewardSummary
										})}
									</li>
								{/each}
							</ul>
						{/if}
						{#if battleSummary.questProgress?.length > 0}
							<ul class="grid gap-1">
								{#each battleSummary.questProgress as progress (progress.questId)}
									<li>
										{t($locale, 'ui.questProgressUpdate', {
											progressLabel: progress.progressLabel,
											currentProgress: String(progress.currentProgress),
											target: String(progress.target)
										})}
									</li>
								{/each}
							</ul>
						{/if}
						{#if battleSummary.outcome === 'defeat'}
							<p>{t($locale, 'ui.defeatReturnedToVillage')}</p>
						{/if}
					</div>
					<button
						bind:this={battleSummaryContinueButton}
						type="button"
						class="glass-button jrpg-command-action mt-5"
						onclick={dismissBattleSummary}
					>
						{t($locale, 'ui.continue')}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<BagScreen
		open={inventoryOpen}
		ready={$hudState.ready}
		{battleLocked}
		inventory={$hudState.inventory}
		hp={$hudState.hp}
		maxHp={$hudState.maxHp}
		attack={$hudState.attack}
		defense={$hudState.defense}
		bind:dialog={inventoryDialog}
		bind:closeButton={inventoryCloseButton}
		onClose={closeInventory}
		onUseItem={requestUseItem}
		onEquip={requestEquipItem}
		onUnequip={unequipSlot}
		onkeydown={handleInventoryDialogKeydown}
	/>

	<AreaMapScreen
		open={areaMapOpen}
		areaMap={$hudState.areaMap}
		bind:dialog={areaMapDialog}
		bind:closeButton={areaMapCloseButton}
		onClose={closeAreaMap}
		onkeydown={handleAreaMapDialogKeydown}
	/>

	<QuestJournal
		open={questLogOpen}
		quests={$hudState.quests}
		bind:dialog={questLogDialog}
		bind:closeButton={questLogCloseButton}
		onClose={closeQuestLog}
		onkeydown={handleQuestLogDialogKeydown}
	/>

	<ShopScreen
		open={shopOpen}
		ready={$hudState.ready}
		{battleLocked}
		shop={$hudState.shop}
		nearbyShop={$hudState.nearbyShop}
		coins={$hudState.wallet.coins}
		status={$hudState.status}
		bind:dialog={shopDialog}
		bind:closeButton={shopCloseButton}
		onClose={closeShop}
		onBuy={requestBuyShopItem}
		onSell={requestSellInventoryItem}
		onkeydown={handleShopDialogKeydown}
	/>
</section>

<style>
	:global(body) {
		overflow: hidden;
		background: #050714;
	}

	:global(.game-stage canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	.jrpg-label {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0;
		color: var(--color-gold);
		text-transform: uppercase;
	}

	.jrpg-menu-anchor {
		position: absolute;
		top: 0.9rem;
		right: 11.4rem;
		z-index: 30;
	}

	.jrpg-command-toggle {
		padding: 0.7rem 0.9rem;
		font-size: 0.72rem;
	}

	.jrpg-command-box {
		position: absolute;
		top: 13.2rem;
		right: 0.9rem;
		z-index: 40;
		width: min(19rem, calc(100vw - 2rem));
		max-height: min(21rem, calc(100vh - 14.1rem));
		overflow-y: auto;
		border-radius: var(--radius-arcane);
		padding: 0.85rem;
	}

	.jrpg-command-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.jrpg-command-list {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.75rem;
	}

	.jrpg-command-action,
	.jrpg-small-button {
		/* border/background/color from glass-button; font-weight intentionally overrides glass-button's 600 */
		font-weight: 900;
	}

	.jrpg-command-action {
		border-radius: 0.42rem;
		padding: 0.68rem 0.75rem;
		text-align: left;
		font-size: 0.82rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-small-button {
		border-radius: 999px;
		padding: 0.42rem 0.65rem;
		font-size: 0.62rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-command-action:hover:not(:disabled),
	.jrpg-command-action:focus-visible,
	.jrpg-small-button:hover,
	.jrpg-small-button:focus-visible {
		/* hover/focus handled by glass-button — keep only unique override */
		transform: translateX(2px);
	}

	@media (prefers-reduced-motion: reduce) {
		.jrpg-command-action:hover:not(:disabled),
		.jrpg-command-action:focus-visible,
		.jrpg-small-button:hover,
		.jrpg-small-button:focus-visible {
			transform: none;
		}
	}

	.jrpg-command-action:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.jrpg-command-status {
		margin-top: 0.75rem;
		border: 1px solid rgba(159, 231, 255, 0.24);
		border-radius: 0.42rem;
		background: rgba(159, 231, 255, 0.08);
		padding: 0.62rem 0.7rem;
		color: var(--color-sapphire);
		font-size: 0.78rem;
		font-weight: 900;
		line-height: 1.35;
	}

	.jrpg-system-row {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.85rem;
		border-top: 1px solid rgba(244, 229, 184, 0.14);
		padding-top: 0.85rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-system-row select {
		border: 1px solid rgba(244, 229, 184, 0.18);
		border-radius: 0.42rem;
		background: rgba(0, 0, 0, 0.28);
		padding: 0.55rem 0.65rem;
		color: var(--color-parchment);
		font-size: 0.86rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: none;
	}

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

	.jrpg-battle-summary-backdrop {
		z-index: 70;
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

	@media (max-width: 720px) {
		.jrpg-menu-anchor {
			top: 8.65rem;
			right: 0.75rem;
		}

		.jrpg-command-toggle {
			padding: 0.6rem 0.72rem;
		}

		.jrpg-command-box {
			top: 11.35rem;
			right: 0.75rem;
			width: min(16rem, calc(100vw - 1.5rem));
			max-height: min(36vh, 17rem);
		}
	}
</style>
