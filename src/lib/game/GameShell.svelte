<script lang="ts">
	import { onMount, tick } from 'svelte';
	import DialoguePanel from '$lib/game/DialoguePanel.svelte';
	import AreaMapScreen from '$lib/game/ui/AreaMapScreen.svelte';
	import BagScreen from '$lib/game/ui/BagScreen.svelte';
	import BattleHud from '$lib/game/ui/BattleHud.svelte';
	import BattleSummary from '$lib/game/ui/BattleSummary.svelte';
	import type { FieldCommand } from '$lib/game/ui/CommandGrid.svelte';
	import FieldHud from '$lib/game/ui/FieldHud.svelte';
	import QuestJournal from '$lib/game/ui/QuestJournal.svelte';
	import SaveScreen from '$lib/game/ui/SaveScreen.svelte';
	import ShopScreen from '$lib/game/ui/ShopScreen.svelte';
	import SkillScreen from '$lib/game/ui/SkillScreen.svelte';
	import SystemScreen from '$lib/game/ui/SystemScreen.svelte';
	import TitleScreen from '$lib/game/ui/TitleScreen.svelte';
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { resetPlaytime, formatPlaytimeSeconds } from '$lib/game/save/playtime';
	import { getNewestSaveSlot } from '$lib/game/save/slots';
	import type { GameStartRequest } from '$lib/game/phaser/createGame';
	import { hasRenderOptionOverrides } from '$lib/game/phaser/world-render-options';
	import { resolveMenuFocusTarget, type MenuFocusNode } from '$lib/game/core/menu-focus';
	import { onHudState } from '$lib/game/ui-bridge/events';
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
		requestPauseGame,
		requestResumeGame,
		requestSaveSlot,
		requestSellInventoryItem,
		requestUnequipSlot,
		requestUseItem
	} from '$lib/game/ui-bridge/store';
	import type { EquipmentSlot } from '$lib/game/content/items';

	type GameShellMode = 'title' | 'playing';
	type OverlayPauseOwner =
		| 'settings'
		| 'system'
		| 'save'
		| 'inventory'
		| 'shop'
		| 'questLog'
		| 'areaMap'
		| 'skill';

	// Direct-boot affordance: game render-option query params boot straight into
	// the field (review/e2e tooling). A bare '/' shows the Title screen.
	const directBoot =
		typeof window !== 'undefined' && hasRenderOptionOverrides(window.location.search);
	const directBootSlot = directBoot ? getNewestSaveSlot() : null;

	let mode = $state<GameShellMode>(directBoot ? 'playing' : 'title');
	let startRequest = $state<GameStartRequest>(
		directBootSlot
			? { reason: 'resume', saveState: directBootSlot.record.state }
			: { reason: 'new', saveState: null }
	);
	if (directBoot) {
		resetPlaytime(directBootSlot?.record.playtimeSeconds ?? 0);
	}

	const titleSlot = getNewestSaveSlot();
	let titleCanContinue = $state(titleSlot !== null);
	let titleContinueSubtitle = $state(
		titleSlot
			? `${titleSlot.record.locationLabel} · ${formatPlaytimeSeconds(titleSlot.record.playtimeSeconds)}`
			: ''
	);

	function beginRun(request: GameStartRequest, playtimeBaseSeconds: number) {
		resetPlaytime(playtimeBaseSeconds);
		startRequest = request;
		mode = 'playing';
	}

	function startNewRun() {
		beginRun({ reason: 'new', saveState: null }, 0);
	}

	function continueNewestRun() {
		const newest = getNewestSaveSlot();
		if (!newest) return;
		beginRun({ reason: 'resume', saveState: newest.record.state }, newest.record.playtimeSeconds);
	}

	let mountNode = $state<HTMLDivElement>();
	let menuButton = $state<HTMLButtonElement>();
	let inventoryDialog = $state<HTMLDivElement>();
	let inventoryCloseButton = $state<HTMLButtonElement>();
	let skillDialog = $state<HTMLDivElement>();
	let skillCloseButton = $state<HTMLButtonElement>();
	let shopDialog = $state<HTMLDivElement>();
	let shopCloseButton = $state<HTMLButtonElement>();
	let questLogDialog = $state<HTMLDivElement>();
	let questLogCloseButton = $state<HTMLButtonElement>();
	let areaMapDialog = $state<HTMLDivElement>();
	let areaMapCloseButton = $state<HTMLButtonElement>();
	let systemDialog = $state<HTMLDivElement>();
	let systemCloseButton = $state<HTMLButtonElement>();
	let battleSummaryDialog = $state<HTMLDivElement>();
	let battleSummaryContinueButton = $state<HTMLButtonElement>();
	let inventoryFocusRestoreTarget: HTMLElement | null = null;
	let shopFocusRestoreTarget: HTMLElement | null = null;
	let battleSummaryWasVisible = false;
	let loadError = $state('');
	let commandOpen = $state(false);
	let inventoryInitialTab = $state<'potions' | 'gear'>('potions');
	let inventoryOpen = $state(false);
	let skillOpen = $state(false);
	let shopOpen = $state(false);
	let questLogOpen = $state(false);
	let areaMapOpen = $state(false);
	let systemOpen = $state(false);
	let saveOpen = $state(false);
	let pauseOwner = $state<OverlayPauseOwner | null>(null);

	const battlePhase = $derived($hudState.battle.phase);
	const battleActive = $derived(battlePhase === 'active');
	const battleLocked = $derived(battlePhase === 'active' || battlePhase === 'summary');
	const battleSummary = $derived($hudState.battle.summary);

	// Availability mirrors the field commands' old menu-button guards.
	const fieldCommandEnabled = $derived<Record<FieldCommand, boolean>>({
		bag: $hudState.ready && !battleLocked,
		gear: $hudState.ready && !battleLocked,
		quest: $hudState.ready && !battleLocked,
		map: $hudState.ready && !battleLocked,
		skill: true,
		rest: $hudState.ready && $hudState.heals >= 1 && battlePhase !== 'summary',
		save: $hudState.ready && !battleLocked,
		system: !battleLocked
	});

	function handleFieldCommand(command: FieldCommand) {
		switch (command) {
			case 'bag':
				openInventory('potions');
				break;
			case 'gear':
				openInventory('gear');
				break;
			case 'quest':
				openQuestLog();
				break;
			case 'map':
				openAreaMap();
				break;
			case 'skill':
				openSkill();
				break;
			case 'rest':
				requestHeal();
				break;
			case 'save':
				openSave();
				break;
			case 'system':
				openSystem();
				break;
		}
	}

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

	function openInventory(initialTab: 'potions' | 'gear' = 'potions') {
		if (inventoryOpen || battleLocked) return;
		inventoryInitialTab = initialTab;
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
		const active = document.activeElement;
		shopFocusRestoreTarget =
			active instanceof HTMLElement && active !== document.body ? active : null;
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

	function openSkill() {
		if (skillOpen) return;
		commandOpen = false;
		skillOpen = true;
		pauseForOverlay('skill');
		void focusSkillDialog();
	}

	function closeSkill() {
		if (!skillOpen) return;
		skillOpen = false;
		resumeForOverlay('skill');
		menuButton?.focus();
	}

	function openSystem() {
		if (systemOpen || battleLocked) return;
		commandOpen = false;
		systemOpen = true;
		if (mode === 'playing') {
			pauseForOverlay('system');
		}
		void focusSystemDialog();
	}

	function closeSystem() {
		if (!systemOpen) return;
		systemOpen = false;
		if (mode === 'playing') {
			resumeForOverlay('system');
			menuButton?.focus();
		}
	}

	function openSave() {
		if (saveOpen || battleLocked || !$hudState.ready) return;
		commandOpen = false;
		saveOpen = true;
		pauseForOverlay('save');
		void focusSaveDialog();
	}

	function closeSave() {
		if (!saveOpen) return;
		saveOpen = false;
		resumeForOverlay('save');
		menuButton?.focus();
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

	/** Visible Heroic controls currently in the DOM, document order. Disabled
	 *  controls stay in the geometry — resolveMenuFocusTarget skips them. */
	function collectMenuFocusNodes(): MenuFocusNode[] {
		return Array.from(document.querySelectorAll<HTMLElement>('[data-focus-id]'))
			.filter((element) => element.getClientRects().length > 0)
			.map((element) => ({
				id: element.dataset.focusId ?? '',
				row: Number(element.dataset.focusRow ?? 0),
				column: Number(element.dataset.focusColumn ?? 0),
				disabled: element.matches(':disabled, [aria-disabled="true"]')
			}))
			.filter((node) => node.id !== '');
	}

	function handleMenuArrowKeys(event: KeyboardEvent): boolean {
		if (!commandOpen) return false;
		const direction =
			event.key === 'ArrowUp'
				? 'up'
				: event.key === 'ArrowDown'
					? 'down'
					: event.key === 'ArrowLeft'
						? 'left'
						: event.key === 'ArrowRight'
							? 'right'
							: null;
		if (!direction) return false;
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
		if (event.repeat) return false;
		if (isEditableTarget(event.target)) return false;

		const nodes = collectMenuFocusNodes();
		if (nodes.length === 0) return false;

		const currentId =
			document.activeElement instanceof HTMLElement
				? (document.activeElement.dataset.focusId ?? null)
				: null;
		const nextId = resolveMenuFocusTarget(nodes, currentId, direction);
		event.preventDefault();
		if (!nextId || nextId === currentId) return true;
		document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(nextId)}"]`)?.focus();
		return true;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if (handleMenuArrowKeys(event)) return;

		if (event.key !== 'm' && event.key !== 'M') return;
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		if (event.repeat) return;
		if (isEditableTarget(event.target)) return;

		if (areaMapOpen) {
			event.preventDefault();
			closeAreaMap();
			return;
		}

		const otherOverlayOpen =
			commandOpen || inventoryOpen || skillOpen || shopOpen || questLogOpen || systemOpen;
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

	async function focusSkillDialog() {
		await tick();
		(skillCloseButton ?? skillDialog)?.focus();
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

	async function focusSystemDialog() {
		await tick();
		(systemCloseButton ?? systemDialog)?.focus();
	}

	let saveDialog = $state<HTMLDivElement>();
	let saveCloseButton = $state<HTMLButtonElement>();

	async function focusSaveDialog() {
		await tick();
		(saveCloseButton ?? saveDialog)?.focus();
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

	function getSystemFocusableElements() {
		if (!systemDialog) return [];

		return Array.from(
			systemDialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleSystemDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSystem();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusableElements = getSystemFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			systemDialog?.focus();
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

	function getSkillFocusableElements() {
		if (!skillDialog) return [];

		return Array.from(
			skillDialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
	}

	function handleSkillDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSkill();
			return;
		}

		if (event.key !== 'Tab') return;

		const focusableElements = getSkillFocusableElements();
		if (focusableElements.length === 0) {
			event.preventDefault();
			skillDialog?.focus();
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

	function handleSaveDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSave();
			return;
		}

		if (event.key !== 'Tab' || !saveDialog) return;

		const focusableElements = Array.from(
			saveDialog.querySelectorAll<HTMLElement>(
				'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
		if (focusableElements.length === 0) {
			event.preventDefault();
			saveDialog.focus();
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

	// Mount Phaser only once the player commits to a run (Continue / New Run /
	// direct boot). The Title screen runs entirely on Svelte + save slots.
	$effect(() => {
		if (mode !== 'playing' || !mountNode) return;
		const request = $state.snapshot(startRequest) as GameStartRequest;
		const node = mountNode;
		let destroyed = false;
		let cleanup = () => {};

		void (async () => {
			try {
				const { createGame } = await import('$lib/game/phaser/createGame');
				const instance = await createGame(node, request);

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

	// A ready HUD state implies a live game: keep the shell in playing mode
	// (covers direct boot races and embedded test harnesses).
	$effect(() => {
		return onHudState((state) => {
			if (state.ready && mode === 'title') {
				mode = 'playing';
			}
		});
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

	{#if mode === 'title'}
		<TitleScreen
			canContinue={titleCanContinue}
			continueSubtitle={titleContinueSubtitle}
			onContinue={continueNewestRun}
			onNewRun={startNewRun}
			onSystem={openSystem}
		/>
	{:else}
		<div
			bind:this={mountNode}
			class="game-stage absolute inset-0 overflow-hidden bg-[#090d1f]"
		></div>

		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(130,180,255,0.18),transparent_38%),linear-gradient(180deg,rgba(7,10,26,0.1),rgba(4,6,18,0.58)_85%,rgba(3,4,10,0.82))]"
		></div>

		{#if !battleLocked}
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

			<FieldHud
				hudState={$hudState}
				{commandOpen}
				commandEnabled={fieldCommandEnabled}
				onCommand={handleFieldCommand}
			/>
		{/if}

		{#if battleActive && $hudState.battle.active}
			<BattleHud hudState={$hudState} active={$hudState.battle.active} />
		{/if}

		{#if commandOpen}
			<div
				class="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
				role="presentation"
				onclick={closeCommand}
			></div>
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
			<BattleSummary
				summary={battleSummary}
				bind:dialog={battleSummaryDialog}
				bind:continueButton={battleSummaryContinueButton}
				oncontinue={dismissBattleSummary}
				onkeydown={handleBattleSummaryDialogKeydown}
			/>
		{/if}

		<BagScreen
			open={inventoryOpen}
			initialTab={inventoryInitialTab}
			ready={$hudState.ready}
			{battleLocked}
			inventory={$hudState.inventory}
			coins={$hudState.wallet.coins}
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
			bind:dialog={shopDialog}
			bind:closeButton={shopCloseButton}
			onClose={closeShop}
			onBuy={requestBuyShopItem}
			onSell={requestSellInventoryItem}
			onkeydown={handleShopDialogKeydown}
		/>
		<SaveScreen
			open={saveOpen}
			hudStatus={$hudState.status}
			bind:dialog={saveDialog}
			bind:closeButton={saveCloseButton}
			onClose={closeSave}
			onConfirmSlot={requestSaveSlot}
			onkeydown={handleSaveDialogKeydown}
		/>
	{/if}

	<SkillScreen
		open={skillOpen}
		bind:dialog={skillDialog}
		bind:closeButton={skillCloseButton}
		onClose={closeSkill}
		onkeydown={handleSkillDialogKeydown}
	/>

	<SystemScreen
		open={systemOpen}
		bind:dialog={systemDialog}
		bind:closeButton={systemCloseButton}
		onClose={closeSystem}
		onkeydown={handleSystemDialogKeydown}
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

	.jrpg-menu-anchor {
		position: absolute;
		top: 0.9rem;
		right: 15rem;
		/* Above the command-grid backdrop so Menu stays clickable to close. */
		z-index: 40;
	}

	.jrpg-command-toggle {
		padding: 0.7rem 0.9rem;
		font-size: 0.72rem;
		/* Mockup parity: the source defers Menu to the dialogue bar (Task 7), so
		   the toggle reveals only on keyboard focus / hover on desktop. It stays
		   in the DOM — focus restoration and e2e/unit hooks click it regardless. */
		opacity: 0;
		transition: opacity 160ms ease;
	}

	.jrpg-command-toggle:focus-visible,
	.jrpg-command-toggle:hover {
		opacity: 1;
	}

	@media (max-width: 720px) {
		.jrpg-menu-anchor {
			top: 0.75rem;
			right: 0.75rem;
		}

		.jrpg-command-toggle {
			padding: 0.6rem 0.72rem;
			/* No mockup exists for small screens: keep the toggle visible so
			   touch players retain menu access until Task 7. */
			opacity: 1;
		}
	}
</style>
