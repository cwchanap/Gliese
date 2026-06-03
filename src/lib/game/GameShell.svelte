<script lang="ts">
	import { onMount, tick } from 'svelte';
	import DialoguePanel from '$lib/game/DialoguePanel.svelte';
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
	import { parseCellKey } from '$lib/game/core/map-exploration';
	import type { HudQuestEntry, HudQuestOffer } from '$lib/game/core/quests';
	import type { HudEquipmentItem, HudInventoryStack, HudKeyItem } from '$lib/game/ui-bridge/events';
	import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

	type InventoryTab = 'consumables' | 'equipment' | 'keyItems';
	type ShopTab = 'buy' | 'sell';
	type OverlayPauseOwner = 'settings' | 'inventory' | 'shop' | 'questLog' | 'areaMap';
	type InventorySlotItem =
		| { kind: 'consumable'; item: HudInventoryStack }
		| { kind: 'equipment'; item: HudEquipmentItem }
		| { kind: 'keyItem'; item: HudKeyItem };

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
	let focusedMarkerId = $state<string | null>(null);
	let activeInventoryTab = $state<InventoryTab>('consumables');
	let activeShopTab = $state<ShopTab>('buy');
	let pauseOwner = $state<OverlayPauseOwner | null>(null);
	let hoveredInventoryItem = $state<InventorySlotItem | null>(null);
	let hoveredShopBuyItem = $state<HudShopBuyEntry | null>(null);
	let hoveredShopSellItem = $state<HudShopSellEntry | null>(null);

	const equipmentSlots: EquipmentSlot[] = ['weapon', 'head', 'body', 'hands', 'accessory'];
	const inventoryTabs: InventoryTab[] = ['consumables', 'equipment', 'keyItems'];
	const shopTabs: ShopTab[] = ['buy', 'sell'];
	const inventorySlotCount = 24;
	const inventoryGridColumns = 6;

	const hpPercent = $derived(($hudState.hp / Math.max($hudState.maxHp, 1)) * 100);
	const xpTarget = $derived($hudState.level > 1 ? 24 : 12);
	const xpPercent = $derived((Math.min($hudState.xp, xpTarget) / xpTarget) * 100);
	const battlePhase = $derived($hudState.battle.phase);
	const battleLocked = $derived(battlePhase === 'active' || battlePhase === 'summary');
	const battleSummary = $derived($hudState.battle.summary);
	const focusedMarkerLabel = $derived(
		$hudState.areaMap.markers.find((marker) => marker.id === focusedMarkerId)?.label ?? null
	);

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
		hoveredInventoryItem = null;
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
		activeShopTab = 'buy';
		pauseForOverlay('shop');
		requestOpenShop($hudState.nearbyShop.shopId);
		void focusShopDialog();
	}

	function closeShop() {
		if (!shopOpen) return;
		shopOpen = false;
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
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
		focusedMarkerId = null;
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
		if (event.ctrlKey || event.metaKey || event.altKey) return;
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
		activeShopTab = 'buy';
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
		focusedMarkerId = null;
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
		).filter((element) => element.offsetParent !== null);
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
		).filter((element) => element.offsetParent !== null && element.tabIndex >= 0);
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
		).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
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
		).filter((element) => element.offsetParent !== null && element.tabIndex >= 0);
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

	async function focusInventoryTab(tab: InventoryTab) {
		activeInventoryTab = tab;
		hoveredInventoryItem = null;
		await tick();
		document.getElementById(`inventory-${tab}-tab`)?.focus();
	}

	function setInventoryTab(tab: InventoryTab) {
		activeInventoryTab = tab;
		hoveredInventoryItem = null;
	}

	function handleInventoryTabKeydown(event: KeyboardEvent, tab: InventoryTab) {
		const currentIndex = inventoryTabs.indexOf(tab);
		const lastIndex = inventoryTabs.length - 1;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			void focusInventoryTab(inventoryTabs[currentIndex === lastIndex ? 0 : currentIndex + 1]);
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			void focusInventoryTab(inventoryTabs[currentIndex === 0 ? lastIndex : currentIndex - 1]);
		} else if (event.key === 'Home') {
			event.preventDefault();
			void focusInventoryTab(inventoryTabs[0]);
		} else if (event.key === 'End') {
			event.preventDefault();
			void focusInventoryTab(inventoryTabs[lastIndex]);
		}
	}

	function getInventoryGridItems(tab: InventoryTab): InventorySlotItem[] {
		if (tab === 'consumables') {
			return $hudState.inventory.consumables.map((item) => ({ kind: 'consumable', item }));
		}

		if (tab === 'equipment') {
			return $hudState.inventory.equipment.map((item) => ({ kind: 'equipment', item }));
		}

		return $hudState.inventory.keyItems.map((item) => ({ kind: 'keyItem', item }));
	}

	function getInventoryGridSlots(tab: InventoryTab): Array<InventorySlotItem | null> {
		const items = getInventoryGridItems(tab);
		const overflowSlotCount = Math.ceil(items.length / inventoryGridColumns) * inventoryGridColumns;
		const slotCount = Math.max(inventorySlotCount, overflowSlotCount);

		return Array.from({ length: slotCount }, (_, index) => items[index] ?? null);
	}

	function getInventorySlotClass(slot: InventorySlotItem) {
		const baseClass =
			'inventory-slot group relative flex aspect-square min-h-0 flex-col justify-center overflow-hidden rounded-[0.95rem] border p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition sm:p-3';
		const actionClass =
			slot.kind === 'consumable' || (slot.kind === 'equipment' && !slot.item.equipped)
				? 'cursor-pointer hover:-translate-y-0.5 hover:border-white/32 hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)]'
				: '';

		if (slot.kind === 'consumable') {
			return `${baseClass} ${actionClass} border-emerald-100/16 bg-[linear-gradient(145deg,rgba(28,69,62,0.54),rgba(12,20,38,0.86))]`;
		}

		if (slot.kind === 'equipment') {
			return `${baseClass} ${actionClass} border-cyan-100/16 bg-[linear-gradient(145deg,rgba(25,59,88,0.56),rgba(12,20,38,0.86))]`;
		}

		return `${baseClass} border-amber-100/16 bg-[linear-gradient(145deg,rgba(82,60,25,0.52),rgba(12,20,38,0.86))]`;
	}

	function getInventoryBadge(slot: InventorySlotItem): string | null {
		if (slot.kind === 'consumable')
			return t($locale, 'ui.quantity', { quantity: slot.item.quantity });
		if (slot.kind === 'equipment') return getEquipmentSlotLabel(slot.item.slot);
		if (slot.item.quantity > 1) return t($locale, 'ui.quantity', { quantity: slot.item.quantity });
		return null;
	}

	function getInventoryBadgeClass(slot: InventorySlotItem) {
		if (slot.kind === 'consumable') {
			return 'border-emerald-100/18 bg-emerald-100/12 text-emerald-50';
		}

		if (slot.kind === 'equipment') {
			return 'border-cyan-100/18 bg-cyan-100/12 text-cyan-50';
		}

		return 'border-amber-100/18 bg-amber-100/12 text-amber-50';
	}

	function formatModifierStat(stat: string) {
		if (stat === 'attack') return t($locale, 'ui.attack');
		if (stat === 'defense') return t($locale, 'ui.defense');
		if (stat === 'maxHp') return t($locale, 'ui.hp');
		return stat.toUpperCase();
	}

	function getEquipmentSlotLabel(slot: EquipmentSlot): string {
		switch (slot) {
			case 'weapon':
				return t($locale, 'ui.equipmentSlots.weapon');
			case 'head':
				return t($locale, 'ui.equipmentSlots.head');
			case 'body':
				return t($locale, 'ui.equipmentSlots.body');
			case 'hands':
				return t($locale, 'ui.equipmentSlots.hands');
			case 'accessory':
				return t($locale, 'ui.equipmentSlots.accessory');
		}
	}

	function getInventoryTabLabel(tab: InventoryTab): string {
		switch (tab) {
			case 'consumables':
				return t($locale, 'ui.consumables');
			case 'equipment':
				return t($locale, 'ui.equipment');
			case 'keyItems':
				return t($locale, 'ui.keyItems');
		}
	}

	function getShopTabLabel(tab: ShopTab): string {
		return tab === 'buy' ? t($locale, 'ui.buy') : t($locale, 'ui.sell');
	}

	function getItemKindLabel(kind: HudShopBuyEntry['kind'] | HudShopSellEntry['kind']): string {
		return kind === 'consumable'
			? t($locale, 'ui.itemKinds.consumable')
			: t($locale, 'ui.itemKinds.equipment');
	}

	function getInventoryTooltipMeta(slot: InventorySlotItem): string {
		if (slot.kind === 'consumable')
			return t($locale, 'ui.quantity', { quantity: slot.item.quantity });
		if (slot.kind === 'keyItem')
			return slot.item.quantity > 1
				? t($locale, 'ui.keyQuantity', { quantity: slot.item.quantity })
				: t($locale, 'ui.keyItem');

		const modifiers = Object.entries(slot.item.modifiers)
			.filter(([, value]) => value !== undefined && value !== 0)
			.map(([stat, value]) =>
				t($locale, 'ui.statModifier', { stat: formatModifierStat(stat), value })
			)
			.join(' / ');

		const slotLabel = getEquipmentSlotLabel(slot.item.slot);

		return modifiers
			? t($locale, 'ui.inventoryMetaWithModifiers', { slot: slotLabel, modifiers })
			: slotLabel;
	}

	function showInventoryTooltip(slot: InventorySlotItem) {
		hoveredInventoryItem = slot;
	}

	function hideInventoryTooltip() {
		hoveredInventoryItem = null;
	}

	function activateInventorySlot(slot: InventorySlotItem) {
		if (!$hudState.ready || battleLocked) return;

		if (slot.kind === 'consumable') {
			requestUseItem(slot.item.itemId);
			return;
		}

		if (slot.kind === 'equipment' && !slot.item.equipped) {
			requestEquipItem(slot.item.itemId);
		}
	}

	async function focusShopTab(tab: ShopTab) {
		activeShopTab = tab;
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
		await tick();
		document.getElementById(`shop-${tab}-tab`)?.focus();
	}

	function setShopTab(tab: ShopTab) {
		activeShopTab = tab;
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
	}

	function handleShopTabKeydown(event: KeyboardEvent, tab: ShopTab) {
		const currentIndex = shopTabs.indexOf(tab);
		const lastIndex = shopTabs.length - 1;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			void focusShopTab(shopTabs[currentIndex === lastIndex ? 0 : currentIndex + 1]);
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			void focusShopTab(shopTabs[currentIndex === 0 ? lastIndex : currentIndex - 1]);
		} else if (event.key === 'Home') {
			event.preventDefault();
			void focusShopTab(shopTabs[0]);
		} else if (event.key === 'End') {
			event.preventDefault();
			void focusShopTab(shopTabs[lastIndex]);
		}
	}

	function getShopBuyStockText(item: HudShopBuyEntry): string {
		return item.availability.mode === 'unlimited'
			? t($locale, 'ui.unlimited')
			: t($locale, 'ui.stockLeft', { count: item.availability.remaining });
	}

	function getShopBuyMeta(item: HudShopBuyEntry): string {
		return t($locale, 'ui.shopBuyMeta', { price: item.price, stock: getShopBuyStockText(item) });
	}

	function canBuyShopItem(item: HudShopBuyEntry): boolean {
		return (
			$hudState.ready &&
			!battleLocked &&
			$hudState.shop !== null &&
			$hudState.wallet.coins >= item.price &&
			(item.availability.mode === 'unlimited' || item.availability.remaining > 0)
		);
	}

	function showShopBuyTooltip(item: HudShopBuyEntry) {
		hoveredShopBuyItem = item;
	}

	function hideShopBuyTooltip() {
		hoveredShopBuyItem = null;
	}

	function activateShopBuyItem(item: HudShopBuyEntry) {
		if (!canBuyShopItem(item) || !$hudState.shop) return;
		requestBuyShopItem($hudState.shop.shopId, item.stockId);
	}

	function getShopSellBadge(item: HudShopSellEntry): string {
		return item.quantity > 1
			? t($locale, 'ui.quantity', { quantity: item.quantity })
			: getItemKindLabel(item.kind);
	}

	function getShopSellMeta(item: HudShopSellEntry): string {
		return item.quantity > 1
			? t($locale, 'ui.shopSellMetaWithQuantity', {
					price: item.price,
					quantity: item.quantity
				})
			: t($locale, 'ui.shopSellMeta', { price: item.price });
	}

	function showShopSellTooltip(item: HudShopSellEntry) {
		hoveredShopSellItem = item;
	}

	function hideShopSellTooltip() {
		hoveredShopSellItem = null;
	}

	function activateShopSellItem(item: HudShopSellEntry) {
		if (!$hudState.ready || battleLocked) return;
		requestSellInventoryItem(item.itemId);
	}

	function hasQuestProgress(quest: HudQuestEntry | HudQuestOffer): quest is HudQuestEntry {
		return 'progress' in quest;
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
	class="game-shell relative h-screen w-screen overflow-hidden bg-[#060816] text-slate-50"
	style="font-family: 'Avenir Next Condensed', 'Trebuchet MS', 'Arial Narrow', sans-serif;"
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
			class="jrpg-command-toggle"
			onclick={() => (commandOpen ? closeCommand() : openCommand())}
			aria-expanded={commandOpen}
			aria-controls="game-command-panel"
		>
			{t($locale, 'ui.menu')}
		</button>
	</div>

	<section
		data-testid="hud-location-panel"
		class="jrpg-hud-panel jrpg-location-panel"
		aria-label={$hudState.areaMap.name}
	>
		<p class="jrpg-location-name">{$hudState.areaMap.name}</p>
		<p class="jrpg-location-sub">{t($locale, 'ui.regionSubline')}</p>
	</section>

	<section
		data-testid="hud-minimap"
		class="jrpg-hud-panel jrpg-minimap-panel"
		aria-label={t($locale, 'ui.areaMap')}
	>
		<div class="jrpg-minimap-heading">
			<span>{t($locale, 'ui.areaMap')}</span>
		</div>
		<svg
			class="jrpg-minimap-svg"
			viewBox={`0 0 ${$hudState.areaMap.worldWidth} ${$hudState.areaMap.worldHeight}`}
			aria-hidden="true"
		>
			<rect
				class="jrpg-minimap-fog"
				x="0"
				y="0"
				width={$hudState.areaMap.worldWidth}
				height={$hudState.areaMap.worldHeight}
			/>
			{#each $hudState.areaMap.revealedCells as cellKey (cellKey)}
				{@const cell = parseCellKey(cellKey)}
				<rect
					class="jrpg-minimap-cell"
					x={cell.column * $hudState.areaMap.cellSize}
					y={cell.row * $hudState.areaMap.cellSize}
					width={$hudState.areaMap.cellSize}
					height={$hudState.areaMap.cellSize}
				/>
			{/each}
			{#each $hudState.areaMap.markers as marker (marker.id)}
				<circle
					class={`jrpg-minimap-marker jrpg-minimap-marker-${marker.kind} ${
						marker.emphasis ? 'jrpg-minimap-marker-emphasis' : ''
					}`}
					cx={marker.x}
					cy={marker.y}
					r={marker.emphasis ? 76 : 54}
				/>
			{/each}
			<circle
				class="jrpg-minimap-player"
				cx={$hudState.areaMap.player.x}
				cy={$hudState.areaMap.player.y}
				r="62"
			/>
		</svg>
	</section>

	<section
		data-testid="hud-party-panel"
		class="jrpg-hud-panel jrpg-party-panel"
		aria-label={t($locale, 'ui.playerStatus')}
	>
		<div class="jrpg-portrait" aria-hidden="true">L</div>
		<div class="jrpg-party-copy">
			<div class="jrpg-party-header">
				<p>{t($locale, 'ui.heroName')}</p>
				<span>{t($locale, 'ui.levelAbbrev')} {$hudState.level}</span>
			</div>
			<div class="jrpg-party-meter jrpg-party-meter-hp">
				<div>
					<span>{t($locale, 'ui.hp')}</span>
					<span>{$hudState.hp}/{$hudState.maxHp}</span>
				</div>
				<div class="jrpg-meter"><span style={`width: ${hpPercent}%`}></span></div>
			</div>
			<div class="jrpg-party-meter jrpg-party-meter-xp">
				<div>
					<span>{t($locale, 'ui.xp')}</span>
					<span>{$hudState.xp}/{xpTarget}</span>
				</div>
				<div class="jrpg-meter"><span style={`width: ${xpPercent}%`}></span></div>
			</div>
		</div>
	</section>

	<aside
		data-testid="hud-side-panel"
		class="jrpg-side-hud"
		aria-label={t($locale, 'ui.questTracker')}
	>
		<div class="jrpg-hud-panel jrpg-gold-panel">
			<span>{$hudState.wallet.coins}{t($locale, 'ui.goldSuffix')}</span>
		</div>
		{#if $hudState.quests.main}
			<section class="jrpg-hud-panel jrpg-active-quest-panel">
				<p class="jrpg-label">{t($locale, 'ui.activeQuest')}</p>
				<h2>{$hudState.quests.main.title}</h2>
				<p>{$hudState.quests.main.objective}</p>
				{#if $hudState.quests.side.length > 0}
					<span>{t($locale, 'ui.sideActive', { count: $hudState.quests.side.length })}</span>
				{/if}
			</section>
		{/if}
	</aside>

	<div
		class="jrpg-field-status"
		role="status"
		aria-label={t($locale, 'ui.fieldStatus')}
		aria-live="polite"
	>
		{$hudState.status}
	</div>

	{#if commandOpen}
		<div
			class="absolute inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
			role="presentation"
			onclick={closeCommand}
		></div>
		<aside
			id="game-command-panel"
			class="jrpg-command-box"
			role="region"
			aria-label={t($locale, 'ui.command')}
		>
			<div class="jrpg-command-heading">
				<p class="jrpg-label">{t($locale, 'ui.command')}</p>
				<button type="button" class="jrpg-small-button" onclick={closeCommand}>
					{t($locale, 'ui.close')}
				</button>
			</div>
			<div class="jrpg-command-list">
				<button
					type="button"
					class="jrpg-command-action"
					onclick={openQuestLog}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.quests')}
				</button>
				<button
					type="button"
					class="jrpg-command-action"
					onclick={openAreaMap}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.map')}
				</button>
				<button
					type="button"
					class="jrpg-command-action"
					onclick={openInventory}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.inventory')}
				</button>
				<button
					type="button"
					class="jrpg-command-action"
					onclick={openShop}
					disabled={!$hudState.ready || battleLocked || !$hudState.nearbyShop}
				>
					{t($locale, 'ui.shop')}
				</button>
				<button
					type="button"
					class="jrpg-command-action"
					onclick={resumeSaveFromMenu}
					disabled={!$hudState.ready || battleLocked || !$hudState.canResume}
				>
					{t($locale, 'ui.resumeSave')}
				</button>
				<button
					type="button"
					class="jrpg-command-action"
					onclick={saveFromMenu}
					disabled={!$hudState.ready || battleLocked}
				>
					{t($locale, 'ui.saveGame')}
				</button>
				<button
					type="button"
					class="jrpg-command-action"
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
				class="jrpg-window jrpg-window-narrow"
				aria-label={t($locale, 'ui.battleSummary')}
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleBattleSummaryDialogKeydown}
			>
				<div class="jrpg-window-header">
					<div>
						<p class="jrpg-label">
							{battleSummary.outcome === 'victory'
								? t($locale, 'ui.battleVictory')
								: t($locale, 'ui.battleDefeat')}
						</p>
						<h2 class="jrpg-window-title">{t($locale, 'ui.battleSummary')}</h2>
					</div>
				</div>
				<div class="jrpg-window-body">
					<div class="grid gap-3 text-sm text-slate-100/88">
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
						class="jrpg-command-action mt-5"
						onclick={dismissBattleSummary}
					>
						{t($locale, 'ui.continue')}
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if inventoryOpen}
		<div class="jrpg-modal-backdrop" role="presentation">
			<div
				class="absolute inset-0 cursor-default"
				role="presentation"
				onclick={closeInventory}
			></div>
			<div
				bind:this={inventoryDialog}
				class="jrpg-window"
				aria-labelledby="inventory-heading"
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleInventoryDialogKeydown}
			>
				<div>
					<div class="jrpg-window-header">
						<div>
							<p class="jrpg-label">{t($locale, 'ui.fieldPack')}</p>
							<h2 id="inventory-heading" class="jrpg-window-title">{t($locale, 'ui.inventory')}</h2>
						</div>
						<button
							bind:this={inventoryCloseButton}
							type="button"
							class="jrpg-small-button"
							onclick={closeInventory}
						>
							{t($locale, 'ui.close')}
						</button>
					</div>
					<div
						class="jrpg-tab-list jrpg-tab-list-three px-4 pb-4"
						role="tablist"
						aria-label={t($locale, 'ui.inventorySections')}
					>
						<button
							id="inventory-consumables-tab"
							type="button"
							role="tab"
							class={`jrpg-tab ${activeInventoryTab === 'consumables' ? 'jrpg-tab-active' : ''}`}
							aria-selected={activeInventoryTab === 'consumables'}
							aria-controls="inventory-tab-panel"
							tabindex={activeInventoryTab === 'consumables' ? 0 : -1}
							onclick={() => setInventoryTab('consumables')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'consumables')}
						>
							{t($locale, 'ui.consumables')}
						</button>
						<button
							id="inventory-equipment-tab"
							type="button"
							role="tab"
							class={`jrpg-tab ${activeInventoryTab === 'equipment' ? 'jrpg-tab-active' : ''}`}
							aria-selected={activeInventoryTab === 'equipment'}
							aria-controls="inventory-tab-panel"
							tabindex={activeInventoryTab === 'equipment' ? 0 : -1}
							onclick={() => setInventoryTab('equipment')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'equipment')}
						>
							{t($locale, 'ui.equipment')}
						</button>
						<button
							id="inventory-keyItems-tab"
							type="button"
							role="tab"
							class={`jrpg-tab ${activeInventoryTab === 'keyItems' ? 'jrpg-tab-active' : ''}`}
							aria-selected={activeInventoryTab === 'keyItems'}
							aria-controls="inventory-tab-panel"
							tabindex={activeInventoryTab === 'keyItems' ? 0 : -1}
							onclick={() => setInventoryTab('keyItems')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'keyItems')}
						>
							{t($locale, 'ui.keyItems')}
						</button>
					</div>
				</div>

				<div class="jrpg-window-body jrpg-inventory-layout">
					<div class="jrpg-grid-frame">
						<div
							id="inventory-tab-panel"
							class="jrpg-grid-scroll"
							role="tabpanel"
							aria-labelledby={`inventory-${activeInventoryTab}-tab`}
						>
							<div
								data-testid="inventory-slot-grid"
								class="jrpg-slot-grid"
								aria-label={t($locale, 'ui.inventorySlotsLabel', {
									section: getInventoryTabLabel(activeInventoryTab)
								})}
							>
								{#each getInventoryGridSlots(activeInventoryTab) as slot, index (`${activeInventoryTab}-${slot?.item.itemId ?? 'empty'}-${index}`)}
									{#if slot}
										<article
											data-testid="inventory-slot"
											class={getInventorySlotClass(slot)}
											aria-label={slot.item.name}
											ondblclick={() => activateInventorySlot(slot)}
											onmouseenter={() => showInventoryTooltip(slot)}
											onmouseleave={hideInventoryTooltip}
										>
											{#if getInventoryBadge(slot)}
												<span
													class={`absolute top-2 right-2 z-10 shrink-0 rounded-full border px-1.5 py-0.5 text-[0.54rem] font-black tracking-[0.12em] uppercase ${getInventoryBadgeClass(slot)}`}
												>
													{getInventoryBadge(slot)}
												</span>
											{/if}

											<div class="flex h-full min-h-0 items-center justify-center">
												<img
													src={slot.item.iconPath}
													alt={slot.item.name}
													class="h-[min(4.8rem,74%)] w-[min(4.8rem,74%)] object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.34)] [image-rendering:pixelated]"
													loading="lazy"
												/>
											</div>

											{#if slot.kind === 'equipment' && slot.item.equipped}
												<span
													class="absolute right-2 bottom-2 left-2 rounded-full border border-cyan-100/20 bg-cyan-100/12 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.16em] text-cyan-50 uppercase"
												>
													{t($locale, 'ui.equipped')}
												</span>
											{:else if slot.kind === 'keyItem'}
												<span
													class="absolute right-2 bottom-2 left-2 rounded-full border border-amber-100/16 bg-amber-100/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.18em] text-amber-50/70 uppercase"
												>
													{t($locale, 'ui.key')}
												</span>
											{/if}
										</article>
									{:else}
										<div
											data-testid="inventory-slot"
											class="inventory-slot-empty flex aspect-square items-center justify-center rounded-[0.95rem] border border-dashed border-white/10 bg-white/[0.035] text-[0.54rem] font-black tracking-[0.18em] text-slate-400/38 uppercase"
											aria-label={t($locale, 'ui.emptyInventorySlot', { index: index + 1 })}
										>
											{t($locale, 'ui.empty')}
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>

					<aside class="jrpg-side-rail">
						<div class="jrpg-side-stat">
							<p class="text-[0.62rem] font-black tracking-[0.28em] text-cyan-100/64 uppercase">
								{t($locale, 'ui.stats')}
							</p>
							<div class="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-1">
								<div
									class="rounded-[0.95rem] border border-rose-100/12 bg-rose-100/8 px-2 py-2 text-center"
								>
									<p class="text-[0.58rem] font-black tracking-[0.22em] text-rose-50/64 uppercase">
										{t($locale, 'ui.hp')}
									</p>
									<p class="mt-0.5 text-base font-black text-white">
										{$hudState.hp}/{$hudState.maxHp}
									</p>
								</div>
								<div
									class="rounded-[0.95rem] border border-cyan-100/12 bg-cyan-100/8 px-2 py-2 text-center"
								>
									<p class="text-[0.58rem] font-black tracking-[0.22em] text-cyan-50/64 uppercase">
										{t($locale, 'ui.attack')}
									</p>
									<p class="mt-0.5 text-base font-black text-white">{$hudState.attack}</p>
								</div>
								<div
									class="rounded-[0.95rem] border border-emerald-100/12 bg-emerald-100/8 px-2 py-2 text-center"
								>
									<p
										class="text-[0.58rem] font-black tracking-[0.22em] text-emerald-50/64 uppercase"
									>
										{t($locale, 'ui.defense')}
									</p>
									<p class="mt-0.5 text-base font-black text-white">{$hudState.defense}</p>
								</div>
							</div>
						</div>

						<div class="jrpg-side-stat min-h-0">
							<p class="text-[0.62rem] font-black tracking-[0.28em] text-cyan-100/64 uppercase">
								{t($locale, 'ui.equipped')}
							</p>
							<div
								class="mt-2 grid grid-cols-2 gap-2 lg:max-h-full lg:grid-cols-1 lg:overflow-y-auto"
							>
								{#each equipmentSlots as slot (slot)}
									{@const equippedItemId = $hudState.inventory.equipped[slot]}
									{@const equippedItem = $hudState.inventory.equipment.find(
										(item) => item.itemId === equippedItemId
									)}
									<div
										class="jrpg-equipped-row grid min-h-[3.65rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
									>
										<div class="min-w-0">
											<p
												class="text-[0.54rem] font-black tracking-[0.2em] text-slate-300/62 uppercase"
											>
												{getEquipmentSlotLabel(slot)}
											</p>
											<p
												class="mt-0.5 truncate text-[0.8rem] font-black tracking-[0.08em] text-white uppercase"
											>
												{equippedItem?.name ?? t($locale, 'ui.empty')}
											</p>
										</div>
										{#if equippedItemId}
											<button
												type="button"
												class="rounded-full border border-rose-200/20 bg-rose-200/10 px-2.5 py-1.5 text-[0.54rem] font-black tracking-[0.16em] text-rose-50 uppercase transition hover:border-rose-200/45 disabled:cursor-not-allowed disabled:opacity-40"
												onclick={() => unequipSlot(slot)}
												disabled={!$hudState.ready || battleLocked}
											>
												{t($locale, 'ui.remove')}
											</button>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</aside>

					{#if hoveredInventoryItem}
						<div role="tooltip" class="jrpg-tooltip">
							<p class="text-[0.68rem] font-black tracking-[0.2em] text-cyan-100/72 uppercase">
								{hoveredInventoryItem.item.name}
							</p>
							<p class="mt-1 text-slate-100/88">{hoveredInventoryItem.item.description}</p>
							<p
								class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-slate-300/70 uppercase"
							>
								{getInventoryTooltipMeta(hoveredInventoryItem)}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if areaMapOpen}
		<div class="jrpg-modal-backdrop" role="presentation">
			<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeAreaMap}></div>
			<div
				bind:this={areaMapDialog}
				class="jrpg-window jrpg-area-map-window"
				aria-label={t($locale, 'ui.areaMapDialog', { areaName: $hudState.areaMap.name })}
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleAreaMapDialogKeydown}
			>
				<div class="jrpg-window-header">
					<div>
						<p class="jrpg-label">{t($locale, 'ui.areaMap')}</p>
						<h2 class="jrpg-window-title">{$hudState.areaMap.name}</h2>
					</div>
					<button
						bind:this={areaMapCloseButton}
						type="button"
						class="jrpg-small-button"
						onclick={closeAreaMap}
					>
						{t($locale, 'ui.close')}
					</button>
				</div>
				<div class="jrpg-window-body">
					<div class="jrpg-area-map-frame">
						<svg
							data-testid="area-map-svg"
							class="area-map-svg"
							viewBox={`0 0 ${$hudState.areaMap.worldWidth} ${$hudState.areaMap.worldHeight}`}
							role="img"
							aria-label={t($locale, 'ui.areaMapDialog', {
								areaName: $hudState.areaMap.name
							})}
						>
							<rect
								class="area-map-fog"
								x="0"
								y="0"
								width={$hudState.areaMap.worldWidth}
								height={$hudState.areaMap.worldHeight}
							/>
							{#each $hudState.areaMap.revealedCells as cellKey (cellKey)}
								{@const cell = parseCellKey(cellKey)}
								<rect
									class="area-map-revealed-cell"
									x={cell.column * $hudState.areaMap.cellSize}
									y={cell.row * $hudState.areaMap.cellSize}
									width={$hudState.areaMap.cellSize}
									height={$hudState.areaMap.cellSize}
								/>
							{/each}
							{#each $hudState.areaMap.markers as marker (marker.id)}
								<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
								<g
									class={`area-map-marker area-map-marker-${marker.kind} ${
										marker.emphasis ? 'area-map-marker-emphasis' : ''
									}`}
									transform={`translate(${marker.x} ${marker.y})`}
									tabindex="0"
									aria-label={marker.label}
									onfocus={() => (focusedMarkerId = marker.id)}
									onblur={() => {
										if (focusedMarkerId === marker.id) focusedMarkerId = null;
									}}
								>
									<circle r={marker.emphasis ? 64 : 48} />
									<text x="76" y="18">{marker.label}</text>
								</g>
							{/each}
							<circle
								data-testid="area-map-player"
								class="area-map-player-marker"
								cx={$hudState.areaMap.player.x}
								cy={$hudState.areaMap.player.y}
								r="54"
							>
								<title>{t($locale, 'ui.currentPosition')}</title>
							</circle>
						</svg>
					</div>
					<div class="jrpg-area-map-legend">
						<span><i class="area-map-legend-current"></i>{t($locale, 'ui.currentPosition')}</span>
						<span><i class="area-map-legend-unexplored"></i>{t($locale, 'ui.unexplored')}</span>
					</div>
					<p class="jrpg-area-map-selected" data-testid="area-map-selected" aria-live="polite">
						{#if focusedMarkerLabel}
							{t($locale, 'ui.areaMapSelectedMarker', { name: focusedMarkerLabel })}
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}

	{#if questLogOpen}
		<div class="jrpg-modal-backdrop" role="presentation">
			<div
				class="absolute inset-0 cursor-default"
				role="presentation"
				onclick={closeQuestLog}
			></div>
			<div
				bind:this={questLogDialog}
				class="jrpg-window jrpg-window-narrow"
				aria-labelledby="quest-log-heading"
				aria-modal="true"
				role="dialog"
				tabindex="-1"
			>
				<div class="jrpg-window-header">
					<div>
						<p class="jrpg-label">{t($locale, 'ui.fieldJournal')}</p>
						<h2 id="quest-log-heading" class="jrpg-window-title">{t($locale, 'ui.questLog')}</h2>
					</div>
					<button
						bind:this={questLogCloseButton}
						type="button"
						class="jrpg-small-button"
						onclick={closeQuestLog}
					>
						{t($locale, 'ui.close')}
					</button>
				</div>
				<div class="jrpg-window-body">
					<div class="grid gap-4 lg:grid-cols-2">
						<section class="jrpg-quest-section p-4">
							<h3 class="text-sm font-black tracking-[0.22em] text-cyan-50 uppercase">
								{t($locale, 'ui.main')}
							</h3>
							{#if $hudState.quests.main}
								<article class="jrpg-quest-card mt-3">
									<h4 class="font-black tracking-[0.1em] text-white uppercase">
										{$hudState.quests.main.title}
									</h4>
									<p class="mt-2 text-sm text-slate-100/82">{$hudState.quests.main.objective}</p>
									<p class="mt-2 text-xs font-black tracking-[0.16em] text-cyan-100/72 uppercase">
										{$hudState.quests.main.progress.label}: {$hudState.quests.main.progress.current} /
										{$hudState.quests.main.progress.target}
									</p>
									<p class="mt-1 text-xs text-slate-300/72">
										{t($locale, 'ui.reward', {
											rewardSummary: $hudState.quests.main.rewardSummary
										})}
									</p>
								</article>
							{/if}
						</section>
						<section class="jrpg-quest-section p-4">
							<h3 class="text-sm font-black tracking-[0.22em] text-emerald-50 uppercase">
								{t($locale, 'ui.side')}
							</h3>
							<div class="mt-3 grid gap-3">
								{#each [...$hudState.quests.side, ...($hudState.quests.guildOffer?.quests ?? [])] as quest (quest.questId)}
									<article class="jrpg-quest-card">
										<h4 class="font-black tracking-[0.1em] text-white uppercase">{quest.title}</h4>
										<p class="mt-2 text-sm text-slate-100/82">{quest.objective}</p>
										{#if hasQuestProgress(quest)}
											<p
												class="mt-2 text-xs font-black tracking-[0.16em] text-emerald-100/72 uppercase"
											>
												{quest.progress.label}: {quest.progress.current} / {quest.progress.target}
											</p>
										{:else}
											<p
												class="mt-2 text-xs font-black tracking-[0.16em] text-amber-100/72 uppercase"
											>
												{t($locale, 'ui.availableFromGuildMaster')}
											</p>
										{/if}
										<p class="mt-1 text-xs text-slate-300/72">
											{t($locale, 'ui.reward', { rewardSummary: quest.rewardSummary })}
										</p>
									</article>
								{/each}
								{#if $hudState.quests.side.length === 0 && !$hudState.quests.guildOffer}
									<p class="text-sm text-slate-300/72">
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

	{#if shopOpen}
		<div class="jrpg-modal-backdrop" role="presentation">
			<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeShop}></div>
			<div
				bind:this={shopDialog}
				class="jrpg-window jrpg-window-narrow"
				aria-labelledby="shop-heading"
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleShopDialogKeydown}
			>
				<div>
					<div class="jrpg-window-header">
						<div>
							<p class="jrpg-label">
								{$hudState.shop?.merchantName ??
									$hudState.nearbyShop?.merchantName ??
									t($locale, 'ui.merchant')}
							</p>
							<h2 id="shop-heading" class="jrpg-window-title">
								{$hudState.shop?.name ?? $hudState.nearbyShop?.name ?? t($locale, 'ui.shop')}
							</h2>
							<p class="mt-2 text-sm font-black tracking-[0.08em] text-[var(--jrpg-amber)]">
								{t($locale, 'ui.coins', { coins: $hudState.wallet.coins })}
							</p>
						</div>
						<button
							bind:this={shopCloseButton}
							type="button"
							class="jrpg-small-button"
							onclick={closeShop}
						>
							{t($locale, 'ui.close')}
						</button>
					</div>
					<div
						class="jrpg-tab-list jrpg-tab-list-two px-4 pb-4"
						role="tablist"
						aria-label={t($locale, 'ui.shopSections')}
					>
						<button
							id="shop-buy-tab"
							type="button"
							role="tab"
							class={`jrpg-tab ${activeShopTab === 'buy' ? 'jrpg-tab-active' : ''}`}
							aria-selected={activeShopTab === 'buy'}
							aria-controls="shop-tab-panel"
							tabindex={activeShopTab === 'buy' ? 0 : -1}
							onclick={() => setShopTab('buy')}
							onkeydown={(event) => handleShopTabKeydown(event, 'buy')}
						>
							{getShopTabLabel('buy')}
						</button>
						<button
							id="shop-sell-tab"
							type="button"
							role="tab"
							class={`jrpg-tab ${activeShopTab === 'sell' ? 'jrpg-tab-active' : ''}`}
							aria-selected={activeShopTab === 'sell'}
							aria-controls="shop-tab-panel"
							tabindex={activeShopTab === 'sell' ? 0 : -1}
							onclick={() => setShopTab('sell')}
							onkeydown={(event) => handleShopTabKeydown(event, 'sell')}
						>
							{getShopTabLabel('sell')}
						</button>
					</div>

					<div
						class="mx-4 mt-4 mb-4 rounded-[1.1rem] border border-white/8 bg-white/6 px-4 py-3 text-sm text-slate-200/82"
					>
						<p>{$hudState.status}</p>
					</div>
				</div>

				<div
					id="shop-tab-panel"
					class="jrpg-window-body"
					role="tabpanel"
					aria-labelledby={`shop-${activeShopTab}-tab`}
				>
					{#if activeShopTab === 'buy'}
						{#if $hudState.shop?.buy.length}
							<div data-testid="shop-buy-grid" class="jrpg-slot-grid">
								{#each $hudState.shop.buy as item (item.stockId)}
									<article
										class={`group relative flex aspect-square min-h-0 flex-col justify-center overflow-hidden rounded-[0.95rem] border border-amber-100/16 bg-[linear-gradient(145deg,rgba(86,60,22,0.56),rgba(12,20,38,0.86))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition sm:p-3 ${
											canBuyShopItem(item)
												? 'cursor-pointer hover:-translate-y-0.5 hover:border-amber-100/32 hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)]'
												: 'cursor-not-allowed opacity-48'
										}`}
										aria-label={item.name}
										ondblclick={() => activateShopBuyItem(item)}
										onmouseenter={() => showShopBuyTooltip(item)}
										onmouseleave={hideShopBuyTooltip}
									>
										<span
											class="absolute top-2 right-2 z-10 shrink-0 rounded-full border border-amber-100/18 bg-amber-100/12 px-1.5 py-0.5 text-[0.54rem] font-black tracking-[0.12em] text-amber-50 uppercase"
										>
											{getItemKindLabel(item.kind)}
										</span>
										<div class="flex h-full min-h-0 items-center justify-center">
											<img
												src={item.iconPath}
												alt={item.name}
												class="h-[min(4.8rem,74%)] w-[min(4.8rem,74%)] object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.34)] [image-rendering:pixelated]"
												loading="lazy"
											/>
										</div>
										<span
											class="absolute right-2 bottom-2 left-2 rounded-full border border-amber-100/16 bg-amber-100/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.16em] text-amber-50/78 uppercase"
										>
											{t($locale, 'ui.priceBadge', { price: item.price })}
										</span>
									</article>
								{/each}
							</div>
						{:else}
							<div class="jrpg-empty-state">
								{t($locale, 'ui.noStockAvailable')}
							</div>
						{/if}
					{:else if $hudState.shop?.sell.length}
						<div data-testid="shop-sell-grid" class="jrpg-slot-grid">
							{#each $hudState.shop.sell as item (item.itemId)}
								<article
									class="group relative flex aspect-square min-h-0 cursor-pointer flex-col justify-center overflow-hidden rounded-[0.95rem] border border-emerald-100/16 bg-[linear-gradient(145deg,rgba(28,69,62,0.54),rgba(12,20,38,0.86))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-100/32 hover:shadow-[0_12px_28px_rgba(0,0,0,0.28)] sm:p-3"
									aria-label={item.name}
									ondblclick={() => activateShopSellItem(item)}
									onmouseenter={() => showShopSellTooltip(item)}
									onmouseleave={hideShopSellTooltip}
								>
									<span
										class="absolute top-2 right-2 z-10 shrink-0 rounded-full border border-emerald-100/18 bg-emerald-100/12 px-1.5 py-0.5 text-[0.54rem] font-black tracking-[0.12em] text-emerald-50 uppercase"
									>
										{getShopSellBadge(item)}
									</span>
									<div class="flex h-full min-h-0 items-center justify-center">
										<img
											src={item.iconPath}
											alt={item.name}
											class="h-[min(4.8rem,74%)] w-[min(4.8rem,74%)] object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.34)] [image-rendering:pixelated]"
											loading="lazy"
										/>
									</div>
									<span
										class="absolute right-2 bottom-2 left-2 rounded-full border border-emerald-100/16 bg-emerald-100/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.16em] text-emerald-50/78 uppercase"
									>
										{t($locale, 'ui.priceBadge', { price: item.price })}
									</span>
								</article>
							{/each}
						</div>
					{:else}
						<div class="jrpg-empty-state">
							{t($locale, 'ui.noSellableItems')}
						</div>
					{/if}

					{#if hoveredShopBuyItem}
						<div role="tooltip" class="jrpg-tooltip">
							<p class="text-[0.68rem] font-black tracking-[0.2em] text-amber-100/72 uppercase">
								{hoveredShopBuyItem.name}
							</p>
							<p class="mt-1 text-slate-100/88">{hoveredShopBuyItem.description}</p>
							<p
								class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-slate-300/70 uppercase"
							>
								{t($locale, 'ui.buyFor', { meta: getShopBuyMeta(hoveredShopBuyItem) })}
							</p>
						</div>
					{/if}

					{#if hoveredShopSellItem}
						<div role="tooltip" class="jrpg-tooltip">
							<p class="text-[0.68rem] font-black tracking-[0.2em] text-emerald-100/72 uppercase">
								{hoveredShopSellItem.name}
							</p>
							<p class="mt-1 text-slate-100/88">{hoveredShopSellItem.description}</p>
							<p
								class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-slate-300/70 uppercase"
							>
								{t($locale, 'ui.sellFor', { meta: getShopSellMeta(hoveredShopSellItem) })}
							</p>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
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

	.game-shell {
		--jrpg-ink: #0a0612;
		--jrpg-panel: rgba(26, 20, 40, 0.96);
		--jrpg-panel-strong: rgba(26, 20, 40, 0.98);
		--jrpg-frame: rgba(255, 248, 232, 0.34);
		--jrpg-frame-strong: rgba(255, 248, 232, 0.62);
		--jrpg-text: #fff8e8;
		--jrpg-muted: #b8a8c8;
		--jrpg-cyan: #5fa8f0;
		--jrpg-emerald: #5fd860;
		--jrpg-amber: #ffd040;
		--jrpg-radius: 0.35rem;
		--jrpg-shadow: 0 14px 36px rgba(0, 0, 0, 0.42);
	}

	.jrpg-hud-panel,
	.jrpg-command-box,
	.jrpg-field-status {
		border: 1px solid var(--jrpg-frame);
		background: var(--jrpg-panel);
		color: var(--jrpg-text);
		box-shadow:
			var(--jrpg-shadow),
			inset 0 0 0 2px rgba(10, 6, 18, 0.72),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.jrpg-label {
		margin: 0;
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0;
		color: var(--jrpg-amber);
		text-transform: uppercase;
	}

	.jrpg-location-panel,
	.jrpg-minimap-panel,
	.jrpg-party-panel {
		position: absolute;
		z-index: 20;
		border-radius: var(--jrpg-radius);
		pointer-events: none;
	}

	.jrpg-location-panel {
		top: 0.9rem;
		left: 0.9rem;
		width: min(14.5rem, calc(100vw - 12rem));
		padding: 0.55rem 0.7rem;
	}

	.jrpg-location-name {
		margin: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.9rem;
		font-weight: 900;
		color: var(--jrpg-text);
		text-transform: uppercase;
	}

	.jrpg-location-sub {
		margin: 0.2rem 0 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.58rem;
		font-weight: 900;
		color: var(--jrpg-muted);
		text-transform: uppercase;
	}

	.jrpg-minimap-panel {
		top: 0.9rem;
		right: 0.9rem;
		width: 10.25rem;
		padding: 0.55rem;
	}

	.jrpg-minimap-heading {
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 0.42rem;
		color: var(--jrpg-amber);
		font-size: 0.62rem;
		font-weight: 800;
		text-transform: uppercase;
	}

	.jrpg-minimap-svg {
		display: block;
		width: 100%;
		height: 6.2rem;
		border: 1px solid rgba(255, 248, 232, 0.16);
		background: #0d1b26;
		image-rendering: pixelated;
	}

	.jrpg-minimap-fog {
		fill: #142333;
	}

	.jrpg-minimap-cell {
		fill: rgba(75, 133, 88, 0.82);
		stroke: rgba(255, 248, 232, 0.16);
		stroke-width: 8;
	}

	.jrpg-minimap-marker {
		fill: rgba(255, 248, 232, 0.34);
		stroke: rgba(255, 248, 232, 0.82);
		stroke-width: 18;
	}

	.jrpg-minimap-marker-exit,
	.jrpg-minimap-marker-quest {
		fill: rgba(255, 208, 64, 0.42);
		stroke: var(--jrpg-amber);
	}

	.jrpg-minimap-marker-emphasis {
		filter: drop-shadow(0 0 32px rgba(255, 208, 64, 0.84));
	}

	.jrpg-minimap-player {
		fill: #f05268;
		stroke: var(--jrpg-text);
		stroke-width: 18;
	}

	.jrpg-party-panel {
		bottom: 0.9rem;
		left: 0.9rem;
		display: grid;
		width: min(17.5rem, calc(100vw - 2rem));
		grid-template-columns: 3.4rem minmax(0, 1fr);
		gap: 0.65rem;
		padding: 0.65rem;
	}

	.jrpg-portrait {
		display: grid;
		place-items: center;
		border: 1px solid rgba(255, 248, 232, 0.2);
		border-radius: 0.25rem;
		background: linear-gradient(180deg, rgba(255, 208, 64, 0.22), rgba(95, 168, 240, 0.14));
		color: var(--jrpg-amber);
		font-size: 1.8rem;
		font-weight: 900;
		line-height: 1;
	}

	.jrpg-party-copy {
		display: grid;
		min-width: 0;
		gap: 0.42rem;
	}

	.jrpg-party-header,
	.jrpg-party-meter div {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.jrpg-party-header p,
	.jrpg-party-header span,
	.jrpg-party-meter span {
		margin: 0;
		font-size: 0.66rem;
		font-weight: 900;
		color: var(--jrpg-muted);
		text-transform: uppercase;
	}

	.jrpg-party-header p {
		color: var(--jrpg-text);
		font-size: 0.8rem;
	}

	.jrpg-party-meter {
		display: grid;
		gap: 0.2rem;
	}

	.jrpg-meter {
		display: block;
		height: 0.5rem;
		overflow: hidden;
		border: 1px solid rgba(255, 248, 232, 0.16);
		border-radius: 999px;
		background: rgba(10, 6, 18, 0.72);
	}

	.jrpg-meter span {
		display: block;
		height: 100%;
		transition: width 180ms ease;
	}

	.jrpg-party-meter-hp .jrpg-meter span {
		background: var(--jrpg-emerald);
	}

	.jrpg-party-meter-xp .jrpg-meter span {
		background: var(--jrpg-cyan);
	}

	.jrpg-side-hud {
		position: absolute;
		right: 0.9rem;
		bottom: 0.9rem;
		z-index: 20;
		display: grid;
		width: min(17rem, calc(100vw - 2rem));
		gap: 0.55rem;
		pointer-events: none;
	}

	.jrpg-gold-panel,
	.jrpg-active-quest-panel {
		border-radius: var(--jrpg-radius);
	}

	.jrpg-gold-panel {
		justify-self: end;
		padding: 0.42rem 0.7rem;
		color: var(--jrpg-amber);
		font-size: 1.15rem;
		font-weight: 900;
	}

	.jrpg-active-quest-panel {
		padding: 0.62rem 0.7rem;
	}

	.jrpg-active-quest-panel h2 {
		margin: 0.16rem 0 0;
		overflow-wrap: anywhere;
		color: var(--jrpg-text);
		font-size: 0.84rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.jrpg-active-quest-panel p:not(.jrpg-label) {
		margin: 0.25rem 0 0;
		color: var(--jrpg-muted);
		font-size: 0.72rem;
		font-weight: 800;
		line-height: 1.3;
	}

	.jrpg-active-quest-panel span {
		display: inline-block;
		margin-top: 0.35rem;
		color: var(--jrpg-emerald);
		font-size: 0.68rem;
		font-weight: 900;
		text-transform: uppercase;
	}

	.jrpg-menu-anchor {
		position: absolute;
		top: 10.2rem;
		right: 0.9rem;
		z-index: 30;
	}

	.jrpg-command-toggle {
		border: 1px solid var(--jrpg-frame);
		border-radius: var(--jrpg-radius);
		background: var(--jrpg-panel-strong);
		padding: 0.7rem 0.9rem;
		color: var(--jrpg-text);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0;
		text-transform: uppercase;
		box-shadow: var(--jrpg-shadow);
		transition:
			transform 160ms ease,
			border-color 160ms ease;
	}

	.jrpg-command-toggle:hover,
	.jrpg-command-toggle:focus-visible {
		border-color: var(--jrpg-frame-strong);
		transform: translateY(-1px);
		outline: none;
	}

	.jrpg-command-box {
		position: absolute;
		top: 13.2rem;
		right: 0.9rem;
		z-index: 40;
		width: min(19rem, calc(100vw - 2rem));
		max-height: min(21rem, calc(100vh - 14.1rem));
		overflow-y: auto;
		border-radius: var(--jrpg-radius);
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
		border: 1px solid rgba(244, 229, 184, 0.18);
		background: rgba(255, 255, 255, 0.07);
		color: var(--jrpg-text);
		font-weight: 900;
		transition:
			transform 160ms ease,
			border-color 160ms ease,
			background 160ms ease;
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
		border-color: var(--jrpg-frame-strong);
		background: rgba(244, 229, 184, 0.12);
		transform: translateX(2px);
		outline: none;
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
		color: var(--jrpg-cyan);
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
		color: var(--jrpg-muted);
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
		color: var(--jrpg-text);
		font-size: 0.86rem;
		font-weight: 800;
		letter-spacing: 0;
		text-transform: none;
	}

	.jrpg-field-status {
		position: absolute;
		left: 50%;
		bottom: 7rem;
		z-index: 20;
		max-width: min(24rem, calc(100vw - 2rem));
		transform: translateX(-50%);
		border-radius: 999px;
		padding: 0.52rem 0.75rem;
		font-size: 0.8rem;
		font-weight: 900;
		color: var(--jrpg-cyan);
		pointer-events: none;
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
		border: 1px solid var(--jrpg-frame);
		border-radius: var(--jrpg-radius);
		background: linear-gradient(145deg, var(--jrpg-panel-strong), rgba(17, 21, 42, 0.96));
		color: var(--jrpg-text);
		box-shadow:
			0 34px 100px rgba(0, 0, 0, 0.58),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(16px);
	}

	.jrpg-window-narrow {
		width: min(64rem, calc(100vw - 2rem));
	}

	.jrpg-area-map-window {
		width: min(58rem, calc(100vw - 2rem));
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
		font-weight: 900;
		color: var(--jrpg-text);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.jrpg-tab-list {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.85rem;
	}

	.jrpg-tab-list-three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.jrpg-tab-list-two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.jrpg-tab {
		border: 1px solid rgba(244, 229, 184, 0.16);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		padding: 0.58rem 0.7rem;
		color: var(--jrpg-muted);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-tab-active {
		border-color: var(--jrpg-frame-strong);
		background: rgba(244, 229, 184, 0.13);
		color: var(--jrpg-text);
	}

	.jrpg-window-body {
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
	}

	.jrpg-area-map-frame {
		overflow: hidden;
		border: 1px solid rgba(244, 229, 184, 0.16);
		border-radius: var(--jrpg-radius);
		background:
			linear-gradient(rgba(159, 231, 255, 0.08) 1px, transparent 1px),
			linear-gradient(90deg, rgba(159, 231, 255, 0.08) 1px, transparent 1px), #09101f;
		background-size: 2rem 2rem;
		box-shadow:
			inset 0 0 0 1px rgba(255, 255, 255, 0.04),
			inset 0 0 48px rgba(0, 0, 0, 0.42);
	}

	.area-map-svg {
		display: block;
		width: 100%;
		aspect-ratio: 1;
		max-height: min(62vh, 42rem);
	}

	.area-map-fog {
		fill: #08101d;
	}

	.area-map-revealed-cell {
		fill: rgba(52, 92, 88, 0.76);
		stroke: rgba(159, 247, 203, 0.28);
		stroke-width: 8;
	}

	.area-map-marker circle {
		stroke-width: 16;
	}

	.area-map-marker text {
		fill: #fff7df;
		font-size: 104px;
		font-weight: 900;
		paint-order: stroke;
		stroke: rgba(5, 7, 20, 0.92);
		stroke-width: 18px;
	}

	.area-map-marker {
		cursor: pointer;
		outline: none;
	}

	.area-map-marker:focus-visible circle {
		stroke: #fff7df;
		stroke-width: 30;
		filter: drop-shadow(0 0 30px rgba(255, 247, 223, 0.9));
	}

	.area-map-marker:focus-visible text {
		fill: #ffffff;
	}

	.area-map-marker-building circle {
		fill: rgba(159, 231, 255, 0.26);
		stroke: rgba(159, 231, 255, 0.78);
	}

	.area-map-marker-exit circle {
		fill: rgba(255, 211, 122, 0.22);
		stroke: rgba(255, 211, 122, 0.74);
	}

	.area-map-marker-quest circle {
		fill: rgba(255, 211, 122, 0.32);
		stroke: rgba(255, 211, 122, 0.9);
	}

	.area-map-marker-emphasis circle {
		filter: drop-shadow(0 0 26px rgba(255, 211, 122, 0.72));
		stroke-width: 24;
	}

	.area-map-marker-emphasis text {
		fill: #ffe3a0;
		font-size: 116px;
	}

	.area-map-player-marker {
		fill: #f05268;
		stroke: #fff7df;
		stroke-width: 18;
		filter: drop-shadow(0 0 28px rgba(240, 82, 104, 0.78));
	}

	.jrpg-area-map-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
		color: var(--jrpg-muted);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-area-map-legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.jrpg-area-map-legend i {
		display: inline-block;
		width: 0.8rem;
		height: 0.8rem;
		border: 1px solid rgba(244, 229, 184, 0.24);
		border-radius: 999px;
	}

	.jrpg-area-map-selected {
		min-height: 1.1rem;
		margin-top: 0.5rem;
		color: #fff7df;
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.area-map-legend-current {
		background: #f05268;
	}

	.area-map-legend-unexplored {
		background: #08101d;
	}

	.jrpg-inventory-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 14rem;
		gap: 1rem;
		overflow: hidden;
	}

	.jrpg-grid-frame,
	.jrpg-side-rail,
	.jrpg-quest-section {
		border: 1px solid rgba(244, 229, 184, 0.14);
		border-radius: var(--jrpg-radius);
		background: rgba(255, 255, 255, 0.055);
	}

	.jrpg-grid-frame {
		min-height: 0;
		overflow: hidden;
	}

	.jrpg-grid-scroll {
		height: 100%;
		min-height: 21rem;
		overflow-y: auto;
		padding: 0.85rem;
	}

	.jrpg-slot-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.65rem;
	}

	.jrpg-side-rail {
		display: grid;
		gap: 0.75rem;
		align-content: start;
		padding: 0.85rem;
	}

	.jrpg-side-stat,
	.jrpg-equipped-row,
	.jrpg-quest-card {
		border: 1px solid rgba(244, 229, 184, 0.12);
		border-radius: 0.45rem;
		background: rgba(0, 0, 0, 0.16);
		padding: 0.65rem;
	}

	.jrpg-tooltip {
		position: absolute;
		right: 1rem;
		bottom: 1rem;
		z-index: 20;
		max-width: 18rem;
		border: 1px solid var(--jrpg-frame);
		border-radius: var(--jrpg-radius);
		background: var(--jrpg-panel-strong);
		padding: 0.75rem;
		color: var(--jrpg-text);
		box-shadow: var(--jrpg-shadow);
		pointer-events: none;
	}

	.jrpg-empty-state {
		display: flex;
		min-height: 12rem;
		align-items: center;
		justify-content: center;
		border: 1px dashed rgba(244, 229, 184, 0.2);
		border-radius: var(--jrpg-radius);
		background: rgba(255, 255, 255, 0.04);
		padding: 2rem;
		text-align: center;
		color: var(--jrpg-muted);
		font-size: 0.82rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	@media (max-width: 900px) {
		.jrpg-inventory-layout {
			grid-template-columns: 1fr;
			overflow-y: auto;
		}

		.jrpg-side-rail {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
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

		.jrpg-slot-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 0.5rem;
		}

		.jrpg-side-rail {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 720px) {
		.jrpg-area-map-window {
			width: calc(100vw - 1rem);
		}

		.jrpg-area-map-frame {
			border-radius: 0.45rem;
		}

		.area-map-svg {
			max-height: min(70vh, calc(100vw - 2.5rem));
		}

		.jrpg-location-panel {
			top: 0.75rem;
			left: 0.75rem;
			width: min(12rem, calc(100vw - 9.75rem));
		}

		.jrpg-minimap-panel {
			top: 0.75rem;
			right: 0.75rem;
			width: 8.25rem;
			padding: 0.45rem;
		}

		.jrpg-minimap-svg {
			height: 4.9rem;
		}

		.jrpg-menu-anchor {
			top: 8.65rem;
			right: 0.75rem;
		}

		.jrpg-party-panel,
		.jrpg-side-hud {
			left: 0.75rem;
			right: 0.75rem;
			width: auto;
		}

		.jrpg-party-panel {
			bottom: 0.75rem;
		}

		.jrpg-side-hud {
			bottom: 8.4rem;
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

		.jrpg-field-status {
			bottom: 16.5rem;
			max-width: min(24rem, calc(100vw - 1.5rem));
		}
	}

	.inventory-slot-name,
	.inventory-slot-description {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		overflow: hidden;
		overflow-wrap: anywhere;
	}

	.inventory-slot-name {
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.inventory-slot-description {
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}
</style>
