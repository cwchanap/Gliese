<script lang="ts">
	import { onMount, tick } from 'svelte';
	import DialoguePanel from '$lib/game/DialoguePanel.svelte';
	import {
		hudState,
		requestBuyShopItem,
		requestCloseShop,
		requestDialogueAdvance,
		requestDialogueChoice,
		requestDialogueClose,
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
	import type { HudQuestEntry, HudQuestOffer } from '$lib/game/core/quests';
	import type { HudEquipmentItem, HudInventoryStack, HudKeyItem } from '$lib/game/ui-bridge/events';
	import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

	type InventoryTab = 'consumables' | 'equipment' | 'keyItems';
	type ShopTab = 'buy' | 'sell';
	type OverlayPauseOwner = 'settings' | 'inventory' | 'shop' | 'questLog';
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
	let inventoryFocusRestoreTarget: HTMLElement | null = null;
	let shopFocusRestoreTarget: HTMLElement | null = null;
	let loadError = $state('');
	let settingsOpen = $state(false);
	let inventoryOpen = $state(false);
	let shopOpen = $state(false);
	let questLogOpen = $state(false);
	let activeInventoryTab = $state<InventoryTab>('consumables');
	let activeShopTab = $state<ShopTab>('buy');
	let pauseOwner = $state<OverlayPauseOwner | null>(null);
	let hoveredInventoryItem = $state<InventorySlotItem | null>(null);
	let hoveredShopBuyItem = $state<HudShopBuyEntry | null>(null);
	let hoveredShopSellItem = $state<HudShopSellEntry | null>(null);

	const equipmentSlots: { slot: EquipmentSlot; label: string }[] = [
		{ slot: 'weapon', label: 'Weapon' },
		{ slot: 'head', label: 'Head' },
		{ slot: 'body', label: 'Body' },
		{ slot: 'hands', label: 'Hands' },
		{ slot: 'accessory', label: 'Accessory' }
	];
	const inventoryTabs: InventoryTab[] = ['consumables', 'equipment', 'keyItems'];
	const shopTabs: ShopTab[] = ['buy', 'sell'];
	const inventorySlotCount = 24;
	const inventoryGridColumns = 6;

	const hpPercent = $derived(($hudState.hp / Math.max($hudState.maxHp, 1)) * 100);
	const xpTarget = $derived($hudState.level > 1 ? 24 : 12);
	const xpPercent = $derived((Math.min($hudState.xp, xpTarget) / xpTarget) * 100);

	function pauseForOverlay(owner: OverlayPauseOwner) {
		if (pauseOwner === null) requestPauseGame();
		pauseOwner = owner;
	}

	function resumeForOverlay(owner: OverlayPauseOwner) {
		if (pauseOwner !== owner) return;
		pauseOwner = null;
		requestResumeGame();
	}

	function openSettings() {
		if (settingsOpen) return;
		settingsOpen = true;
		pauseForOverlay('settings');
	}

	function closeSettings() {
		if (!settingsOpen) return;
		settingsOpen = false;
		resumeForOverlay('settings');
	}

	function openInventory() {
		if (inventoryOpen) return;
		rememberInventoryFocus();
		settingsOpen = false;
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
		if (shopOpen || !$hudState.nearbyShop) return;
		rememberShopFocus();
		settingsOpen = false;
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
		if (questLogOpen) return;
		settingsOpen = false;
		questLogOpen = true;
		pauseForOverlay('questLog');
		void focusQuestLogDialog();
	}

	function closeQuestLog() {
		if (!questLogOpen) return;
		questLogOpen = false;
		resumeForOverlay('questLog');
	}

	$effect(() => {
		if (!$hudState.shop || shopOpen) return;

		rememberShopFocus();
		settingsOpen = false;
		inventoryOpen = false;
		shopOpen = true;
		activeShopTab = 'buy';
		pauseForOverlay('shop');
		void focusShopDialog();
	});

	function releaseOverlayPause() {
		const owner = pauseOwner;
		const wasShopOpen = shopOpen;
		settingsOpen = false;
		inventoryOpen = false;
		shopOpen = false;
		questLogOpen = false;
		pauseOwner = null;

		if (wasShopOpen) requestCloseShop();

		if (owner !== null) requestResumeGame();
	}

	function resumeSaveFromMenu() {
		releaseOverlayPause();
		requestResume();
	}

	function saveFromMenu() {
		releaseOverlayPause();
		requestSave();
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
			!restoreTarget.closest('#game-settings-panel')
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

	async function restoreShopFocus() {
		const restoreTarget = shopFocusRestoreTarget;
		shopFocusRestoreTarget = null;
		await tick();

		if (
			restoreTarget &&
			document.contains(restoreTarget) &&
			!restoreTarget.matches('[disabled], [aria-disabled="true"]') &&
			!restoreTarget.closest('#game-settings-panel')
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
		if (slot.kind === 'consumable') return `x${slot.item.quantity}`;
		if (slot.kind === 'equipment') return slot.item.slot;
		if (slot.item.quantity > 1) return `x${slot.item.quantity}`;
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
		if (stat === 'attack') return 'ATK';
		if (stat === 'defense') return 'DEF';
		if (stat === 'maxHp') return 'HP';
		return stat.toUpperCase();
	}

	function getInventoryTooltipMeta(slot: InventorySlotItem): string {
		if (slot.kind === 'consumable') return `x${slot.item.quantity}`;
		if (slot.kind === 'keyItem')
			return slot.item.quantity > 1 ? `Key x${slot.item.quantity}` : 'Key item';

		const modifiers = Object.entries(slot.item.modifiers)
			.filter(([, value]) => value !== undefined && value !== 0)
			.map(([stat, value]) => `${formatModifierStat(stat)} +${value}`)
			.join(' / ');

		return modifiers ? `${slot.item.slot} / ${modifiers}` : slot.item.slot;
	}

	function showInventoryTooltip(slot: InventorySlotItem) {
		hoveredInventoryItem = slot;
	}

	function hideInventoryTooltip() {
		hoveredInventoryItem = null;
	}

	function activateInventorySlot(slot: InventorySlotItem) {
		if (!$hudState.ready) return;

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
			? 'Unlimited'
			: `${item.availability.remaining} left`;
	}

	function getShopBuyMeta(item: HudShopBuyEntry): string {
		return `${item.price} coins / ${getShopBuyStockText(item)}`;
	}

	function canBuyShopItem(item: HudShopBuyEntry): boolean {
		return (
			$hudState.ready &&
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
		return item.quantity > 1 ? `x${item.quantity}` : item.kind;
	}

	function getShopSellMeta(item: HudShopSellEntry): string {
		return `${item.price} coins${item.quantity > 1 ? ` / x${item.quantity}` : ''}`;
	}

	function showShopSellTooltip(item: HudShopSellEntry) {
		hoveredShopSellItem = item;
	}

	function hideShopSellTooltip() {
		hoveredShopSellItem = null;
	}

	function activateShopSellItem(item: HudShopSellEntry) {
		if (!$hudState.ready) return;
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
					loadError = 'Unable to start the game shell.';
				}
			}
		})();

		return () => {
			destroyed = true;
			cleanup();
		};
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

	<div class="pointer-events-auto absolute top-[7.75rem] right-4 z-20 sm:top-[8.25rem] sm:right-6">
		<button
			bind:this={menuButton}
			type="button"
			class="hud-menu-button rounded-full border border-white/14 bg-[linear-gradient(135deg,rgba(24,32,68,0.92),rgba(12,18,38,0.92))] px-4 py-3 text-[0.7rem] font-black tracking-[0.28em] text-cyan-50 uppercase shadow-[0_18px_40px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 hover:border-cyan-200/40"
			onclick={() => (settingsOpen ? closeSettings() : openSettings())}
			aria-expanded={settingsOpen}
			aria-controls="game-settings-panel"
		>
			Menu
		</button>
	</div>

	{#if $hudState.quests.main}
		<section
			class="pointer-events-none absolute top-4 right-4 z-20 w-[calc(50vw-1.5rem)] rounded-[1.2rem] border border-cyan-100/14 bg-[linear-gradient(145deg,rgba(8,13,34,0.9),rgba(12,32,52,0.82))] px-3 py-2.5 text-slate-50 shadow-[0_18px_44px_rgba(0,0,0,0.3)] backdrop-blur-md sm:top-6 sm:right-6 sm:w-[min(25rem,calc(50vw-2rem))] sm:px-4 sm:py-3"
			aria-label="Quest tracker"
		>
			<p class="text-[0.58rem] font-black tracking-[0.28em] text-cyan-100/68 uppercase">
				Main Quest
			</p>
			<p class="mt-1 truncate text-sm font-black tracking-[0.08em] text-white uppercase">
				{$hudState.quests.main.objective}
			</p>
			{#if $hudState.quests.side.length > 0}
				<p class="mt-1 text-xs font-bold text-emerald-100/78">
					{$hudState.quests.side.length} side active
				</p>
			{/if}
		</section>
	{/if}

	<section
		class="pointer-events-none absolute top-4 left-4 z-20 sm:top-6 sm:left-6"
		aria-label="Player status"
	>
		<div
			class="w-[calc(50vw-1.5rem)] rounded-[1.3rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,16,40,0.92),rgba(14,12,36,0.84)_55%,rgba(20,32,72,0.8))] px-3 py-2.5 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-md sm:w-[min(25rem,calc(50vw-2rem))] sm:rounded-[1.5rem] sm:px-4 sm:py-3"
		>
			<div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 sm:gap-x-4">
				<div
					class="flex h-11 w-11 flex-col items-center justify-center rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:h-14 sm:w-14 sm:rounded-2xl"
				>
					<span class="text-[0.58rem] font-black tracking-[0.28em] text-fuchsia-100/70 uppercase">
						LV
					</span>
					<span class="mt-0.5 text-lg font-black text-white sm:mt-1 sm:text-xl">{$hudState.level}</span>
				</div>

				<div class="grid gap-2">
					<div class="grid gap-1">
						<div
							class="flex items-center justify-between text-[0.66rem] font-black tracking-[0.26em] text-rose-50/80 uppercase"
						>
							<span>HP</span>
							<span>{$hudState.hp} / {$hudState.maxHp}</span>
						</div>
						<div class="h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
							<div
								class="h-full rounded-full bg-[linear-gradient(90deg,#ff5d8f_0%,#ff7f7a_40%,#ffd26a_100%)] shadow-[0_0_20px_rgba(255,112,145,0.55)] transition-[width] duration-300"
								style={`width: ${hpPercent}%`}
							></div>
						</div>
					</div>

					<div class="grid gap-1">
						<div
							class="flex items-center justify-between text-[0.66rem] font-black tracking-[0.26em] text-cyan-50/76 uppercase"
						>
							<span>XP</span>
							<span>{$hudState.xp} / {xpTarget}</span>
						</div>
						<div class="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
							<div
								class="h-full rounded-full bg-[linear-gradient(90deg,#5de0ff_0%,#7f8bff_55%,#d98bff_100%)] shadow-[0_0_20px_rgba(110,164,255,0.45)] transition-[width] duration-300"
								style={`width: ${xpPercent}%`}
							></div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	{#if settingsOpen}
		<div
			class="absolute inset-0 z-30 bg-black/24 backdrop-blur-[2px]"
			role="presentation"
			onclick={closeSettings}
		></div>
	{/if}

	{#if settingsOpen}
		<aside
			id="game-settings-panel"
			class="pointer-events-auto absolute top-40 right-4 z-40 w-[min(19rem,calc(100vw-2rem))] translate-y-0 rounded-[1.6rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,16,40,0.96),rgba(16,14,44,0.94))] p-4 text-slate-50 opacity-100 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-200 sm:top-44 sm:right-6"
		>
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-[0.62rem] font-black tracking-[0.34em] text-cyan-100/68 uppercase">
						System Menu
					</p>
					<h2 class="mt-1 text-xl font-black tracking-[0.1em] text-white uppercase">Settings</h2>
				</div>
				<button
					type="button"
					class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
					onclick={closeSettings}
				>
					Close
				</button>
			</div>

			<div class="mt-4 grid gap-3">
				<button
					type="button"
					class="hud-action rounded-[1.1rem] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(26,49,92,0.95),rgba(14,21,44,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-cyan-50 uppercase transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:shadow-[0_15px_30px_rgba(74,144,255,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
					onclick={openQuestLog}
					disabled={!$hudState.ready}
				>
					Quests
				</button>
				<button
					type="button"
					class="hud-action rounded-[1.1rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(115,75,25,0.96),rgba(63,41,18,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-amber-50 uppercase transition hover:-translate-y-0.5 hover:border-amber-200/45 hover:shadow-[0_15px_30px_rgba(255,190,90,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
					onclick={openShop}
					disabled={!$hudState.ready || !$hudState.nearbyShop}
				>
					Shop
				</button>
				<button
					type="button"
					class="hud-action rounded-[1.1rem] border border-emerald-200/20 bg-[linear-gradient(135deg,rgba(20,91,76,0.95),rgba(12,42,48,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-emerald-50 uppercase transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:shadow-[0_15px_30px_rgba(62,205,155,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
					onclick={openInventory}
					disabled={!$hudState.ready}
				>
					Inventory
				</button>
				<button
					type="button"
					class="hud-action rounded-[1.1rem] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(26,49,92,0.95),rgba(14,21,44,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-cyan-50 uppercase transition hover:-translate-y-0.5 hover:border-cyan-200/45 hover:shadow-[0_15px_30px_rgba(74,144,255,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
					onclick={resumeSaveFromMenu}
					disabled={!$hudState.ready || !$hudState.canResume}
				>
					Resume Save
				</button>
				<button
					type="button"
					class="hud-action rounded-[1.1rem] border border-violet-200/20 bg-[linear-gradient(135deg,rgba(47,31,96,0.95),rgba(21,16,52,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-violet-50 uppercase transition hover:-translate-y-0.5 hover:border-violet-200/45 hover:shadow-[0_15px_30px_rgba(125,92,255,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
					onclick={saveFromMenu}
					disabled={!$hudState.ready}
				>
					Save Game
				</button>
				<button
					type="button"
					class="hud-action rounded-[1.1rem] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(127,68,32,0.96),rgba(78,33,17,0.92))] px-4 py-3 text-sm font-black tracking-[0.24em] text-amber-50 uppercase transition hover:-translate-y-0.5 hover:border-amber-200/45 hover:shadow-[0_15px_30px_rgba(255,152,72,0.24)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
					onclick={requestHeal}
					disabled={!$hudState.ready || $hudState.heals < 1}
				>
					Use Heal
				</button>
			</div>

			<div
				class="mt-4 rounded-[1.2rem] border border-white/8 bg-white/6 px-4 py-3 text-sm text-slate-200/82"
			>
				<p>{$hudState.status}</p>
			</div>
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

	{#if inventoryOpen}
		<div
			class="absolute inset-0 z-50 flex items-center justify-center bg-black/52 p-3 backdrop-blur-[3px] sm:p-6"
			role="presentation"
		>
			<div
				class="absolute inset-0 cursor-default"
				role="presentation"
				onclick={closeInventory}
			></div>
			<div
				bind:this={inventoryDialog}
				class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(76rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(16,14,42,0.96)_54%,rgba(13,32,52,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
				aria-labelledby="inventory-heading"
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleInventoryDialogKeydown}
			>
				<div class="border-b border-white/10 px-4 py-4 sm:px-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-[0.62rem] font-black tracking-[0.34em] text-emerald-100/68 uppercase">
								Field Pack
							</p>
							<h2
								id="inventory-heading"
								class="mt-1 text-2xl font-black tracking-[0.12em] text-white uppercase sm:text-3xl"
							>
								Inventory
							</h2>
						</div>
						<button
							bind:this={inventoryCloseButton}
							type="button"
							class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
							onclick={closeInventory}
						>
							Close
						</button>
					</div>

					<div class="mt-4 grid grid-cols-3 gap-2" role="tablist" aria-label="Inventory sections">
						<button
							id="inventory-consumables-tab"
							type="button"
							role="tab"
							class={`rounded-full border px-3 py-2 text-[0.62rem] font-black tracking-[0.2em] uppercase transition sm:text-[0.68rem] ${
								activeInventoryTab === 'consumables'
									? 'border-emerald-200/45 bg-emerald-200/16 text-emerald-50 shadow-[0_10px_24px_rgba(62,205,155,0.16)]'
									: 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'
							}`}
							aria-selected={activeInventoryTab === 'consumables'}
							aria-controls="inventory-tab-panel"
							tabindex={activeInventoryTab === 'consumables' ? 0 : -1}
							onclick={() => setInventoryTab('consumables')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'consumables')}
						>
							Consumables
						</button>
						<button
							id="inventory-equipment-tab"
							type="button"
							role="tab"
							class={`rounded-full border px-3 py-2 text-[0.62rem] font-black tracking-[0.2em] uppercase transition sm:text-[0.68rem] ${
								activeInventoryTab === 'equipment'
									? 'border-cyan-200/45 bg-cyan-200/16 text-cyan-50 shadow-[0_10px_24px_rgba(84,180,255,0.16)]'
									: 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'
							}`}
							aria-selected={activeInventoryTab === 'equipment'}
							aria-controls="inventory-tab-panel"
							tabindex={activeInventoryTab === 'equipment' ? 0 : -1}
							onclick={() => setInventoryTab('equipment')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'equipment')}
						>
							Equipment
						</button>
						<button
							id="inventory-keyItems-tab"
							type="button"
							role="tab"
							class={`rounded-full border px-3 py-2 text-[0.62rem] font-black tracking-[0.2em] uppercase transition sm:text-[0.68rem] ${
								activeInventoryTab === 'keyItems'
									? 'border-amber-200/45 bg-amber-200/16 text-amber-50 shadow-[0_10px_24px_rgba(255,190,90,0.16)]'
									: 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'
							}`}
							aria-selected={activeInventoryTab === 'keyItems'}
							aria-controls="inventory-tab-panel"
							tabindex={activeInventoryTab === 'keyItems' ? 0 : -1}
							onclick={() => setInventoryTab('keyItems')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'keyItems')}
						>
							Key Items
						</button>
					</div>
				</div>

				<div
					class="grid min-h-0 grid-rows-[minmax(21rem,1fr)_auto] gap-3 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_13rem] lg:grid-rows-none lg:overflow-hidden lg:p-5"
				>
					<div class="min-h-0 overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/6">
						<div
							id="inventory-tab-panel"
							class="h-full min-h-[21rem] overflow-y-auto p-3 pr-2 sm:p-4 sm:pr-3 lg:min-h-0"
							role="tabpanel"
							aria-labelledby={`inventory-${activeInventoryTab}-tab`}
						>
							<div
								data-testid="inventory-slot-grid"
								class="grid grid-cols-6 gap-2.5 sm:gap-3"
								aria-label={`${activeInventoryTab} inventory slots`}
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
													Equipped
												</span>
											{:else if slot.kind === 'keyItem'}
												<span
													class="absolute right-2 bottom-2 left-2 rounded-full border border-amber-100/16 bg-amber-100/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.18em] text-amber-50/70 uppercase"
												>
													Key
												</span>
											{/if}
										</article>
									{:else}
										<div
											data-testid="inventory-slot"
											class="inventory-slot-empty flex aspect-square items-center justify-center rounded-[0.95rem] border border-dashed border-white/10 bg-white/[0.035] text-[0.54rem] font-black tracking-[0.18em] text-slate-400/38 uppercase"
											aria-label={`Empty inventory slot ${index + 1}`}
										>
											Empty
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>

					<aside class="grid gap-3 lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
						<div class="rounded-[1.15rem] border border-white/10 bg-white/6 p-3">
							<p class="text-[0.62rem] font-black tracking-[0.28em] text-cyan-100/64 uppercase">
								Stats
							</p>
							<div class="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-1">
								<div
									class="rounded-[0.95rem] border border-rose-100/12 bg-rose-100/8 px-2 py-2 text-center"
								>
									<p class="text-[0.58rem] font-black tracking-[0.22em] text-rose-50/64 uppercase">
										HP
									</p>
									<p class="mt-0.5 text-base font-black text-white">
										{$hudState.hp}/{$hudState.maxHp}
									</p>
								</div>
								<div
									class="rounded-[0.95rem] border border-cyan-100/12 bg-cyan-100/8 px-2 py-2 text-center"
								>
									<p class="text-[0.58rem] font-black tracking-[0.22em] text-cyan-50/64 uppercase">
										ATK
									</p>
									<p class="mt-0.5 text-base font-black text-white">{$hudState.attack}</p>
								</div>
								<div
									class="rounded-[0.95rem] border border-emerald-100/12 bg-emerald-100/8 px-2 py-2 text-center"
								>
									<p
										class="text-[0.58rem] font-black tracking-[0.22em] text-emerald-50/64 uppercase"
									>
										DEF
									</p>
									<p class="mt-0.5 text-base font-black text-white">{$hudState.defense}</p>
								</div>
							</div>
						</div>

						<div class="min-h-0 rounded-[1.15rem] border border-white/10 bg-white/6 p-3">
							<p class="text-[0.62rem] font-black tracking-[0.28em] text-cyan-100/64 uppercase">
								Equipped
							</p>
							<div
								class="mt-2 grid grid-cols-2 gap-2 lg:max-h-full lg:grid-cols-1 lg:overflow-y-auto"
							>
								{#each equipmentSlots as entry (entry.slot)}
									{@const equippedItemId = $hudState.inventory.equipped[entry.slot]}
									{@const equippedItem = $hudState.inventory.equipment.find(
										(item) => item.itemId === equippedItemId
									)}
									<div
										class="grid min-h-[3.65rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-[0.95rem] border border-white/10 bg-black/12 px-2.5 py-2"
									>
										<div class="min-w-0">
											<p
												class="text-[0.54rem] font-black tracking-[0.2em] text-slate-300/62 uppercase"
											>
												{entry.label}
											</p>
											<p
												class="mt-0.5 truncate text-[0.8rem] font-black tracking-[0.08em] text-white uppercase"
											>
												{equippedItem?.name ?? 'Empty'}
											</p>
										</div>
										{#if equippedItemId}
											<button
												type="button"
												class="rounded-full border border-rose-200/20 bg-rose-200/10 px-2.5 py-1.5 text-[0.54rem] font-black tracking-[0.16em] text-rose-50 uppercase transition hover:border-rose-200/45 disabled:cursor-not-allowed disabled:opacity-40"
												onclick={() => requestUnequipSlot(entry.slot)}
												disabled={!$hudState.ready}
											>
												Remove
											</button>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					</aside>

					{#if hoveredInventoryItem}
						<div
							role="tooltip"
							class="pointer-events-none absolute right-4 bottom-4 z-20 max-w-[18rem] rounded-[0.95rem] border border-white/12 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
						>
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

	{#if questLogOpen}
		<div
			class="absolute inset-0 z-50 flex items-center justify-center bg-black/52 p-3 backdrop-blur-[3px] sm:p-6"
			role="presentation"
		>
			<div
				class="absolute inset-0 cursor-default"
				role="presentation"
				onclick={closeQuestLog}
			></div>
			<div
				bind:this={questLogDialog}
				class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(62rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(15,28,48,0.96)_54%,rgba(16,38,34,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
				aria-labelledby="quest-log-heading"
				aria-modal="true"
				role="dialog"
				tabindex="-1"
			>
				<div class="border-b border-white/10 px-4 py-4 sm:px-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-[0.62rem] font-black tracking-[0.34em] text-cyan-100/68 uppercase">
								Field Journal
							</p>
							<h2
								id="quest-log-heading"
								class="mt-1 text-2xl font-black tracking-[0.12em] text-white uppercase sm:text-3xl"
							>
								Quest Log
							</h2>
						</div>
						<button
							bind:this={questLogCloseButton}
							type="button"
							class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
							onclick={closeQuestLog}
						>
							Close
						</button>
					</div>
				</div>
				<div class="min-h-0 overflow-y-auto p-4 sm:p-6">
					<div class="grid gap-4 lg:grid-cols-2">
						<section class="rounded-[1.2rem] border border-cyan-100/12 bg-cyan-100/8 p-4">
							<h3 class="text-sm font-black tracking-[0.22em] text-cyan-50 uppercase">Main</h3>
							{#if $hudState.quests.main}
								<article class="mt-3 rounded-[0.95rem] border border-white/10 bg-black/14 p-3">
									<h4 class="font-black tracking-[0.1em] text-white uppercase">
										{$hudState.quests.main.title}
									</h4>
									<p class="mt-2 text-sm text-slate-100/82">{$hudState.quests.main.objective}</p>
									<p class="mt-2 text-xs font-black tracking-[0.16em] text-cyan-100/72 uppercase">
										{$hudState.quests.main.progress.label}: {$hudState.quests.main.progress.current} /
										{$hudState.quests.main.progress.target}
									</p>
									<p class="mt-1 text-xs text-slate-300/72">
										Reward: {$hudState.quests.main.rewardSummary}
									</p>
								</article>
							{/if}
						</section>
						<section class="rounded-[1.2rem] border border-emerald-100/12 bg-emerald-100/8 p-4">
							<h3 class="text-sm font-black tracking-[0.22em] text-emerald-50 uppercase">Side</h3>
							<div class="mt-3 grid gap-3">
								{#each [...$hudState.quests.side, ...($hudState.quests.guildOffer?.quests ?? [])] as quest (quest.questId)}
									<article class="rounded-[0.95rem] border border-white/10 bg-black/14 p-3">
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
												Available from Guild Master
											</p>
										{/if}
										<p class="mt-1 text-xs text-slate-300/72">Reward: {quest.rewardSummary}</p>
									</article>
								{/each}
								{#if $hudState.quests.side.length === 0 && !$hudState.quests.guildOffer}
									<p class="text-sm text-slate-300/72">No side quests active.</p>
								{/if}
							</div>
						</section>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if shopOpen}
		<div
			class="absolute inset-0 z-50 flex items-center justify-center bg-black/52 p-3 backdrop-blur-[3px] sm:p-6"
			role="presentation"
		>
			<div class="absolute inset-0 cursor-default" role="presentation" onclick={closeShop}></div>
			<div
				bind:this={shopDialog}
				class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(64rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(28,22,44,0.96)_54%,rgba(40,28,20,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
				aria-labelledby="shop-heading"
				aria-modal="true"
				role="dialog"
				tabindex="-1"
				onkeydown={handleShopDialogKeydown}
			>
				<div class="border-b border-white/10 px-4 py-4 sm:px-6">
					<div class="flex items-start justify-between gap-4">
						<div>
							<p class="text-[0.62rem] font-black tracking-[0.34em] text-amber-100/68 uppercase">
								{$hudState.shop?.merchantName ?? $hudState.nearbyShop?.merchantName ?? 'Merchant'}
							</p>
							<h2
								id="shop-heading"
								class="mt-1 text-2xl font-black tracking-[0.12em] text-white uppercase sm:text-3xl"
							>
								{$hudState.shop?.name ?? $hudState.nearbyShop?.name ?? 'Shop'}
							</h2>
							<p class="mt-2 text-sm font-bold tracking-[0.12em] text-amber-100/80 uppercase">
								Coins: {$hudState.wallet.coins}
							</p>
						</div>
						<button
							bind:this={shopCloseButton}
							type="button"
							class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black tracking-[0.24em] text-slate-100 uppercase transition hover:border-white/30"
							onclick={closeShop}
						>
							Close
						</button>
					</div>

					<div class="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Shop sections">
						<button
							id="shop-buy-tab"
							type="button"
							role="tab"
							class={`rounded-full border px-3 py-2 text-[0.68rem] font-black tracking-[0.2em] uppercase transition ${
								activeShopTab === 'buy'
									? 'border-amber-200/45 bg-amber-200/16 text-amber-50'
									: 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'
							}`}
							aria-selected={activeShopTab === 'buy'}
							aria-controls="shop-tab-panel"
							tabindex={activeShopTab === 'buy' ? 0 : -1}
							onclick={() => setShopTab('buy')}
							onkeydown={(event) => handleShopTabKeydown(event, 'buy')}
						>
							Buy
						</button>
						<button
							id="shop-sell-tab"
							type="button"
							role="tab"
							class={`rounded-full border px-3 py-2 text-[0.68rem] font-black tracking-[0.2em] uppercase transition ${
								activeShopTab === 'sell'
									? 'border-emerald-200/45 bg-emerald-200/16 text-emerald-50'
									: 'border-white/10 bg-white/6 text-slate-200/72 hover:border-white/24 hover:text-white'
							}`}
							aria-selected={activeShopTab === 'sell'}
							aria-controls="shop-tab-panel"
							tabindex={activeShopTab === 'sell' ? 0 : -1}
							onclick={() => setShopTab('sell')}
							onkeydown={(event) => handleShopTabKeydown(event, 'sell')}
						>
							Sell
						</button>
					</div>

					<div
						class="mt-4 rounded-[1.1rem] border border-white/8 bg-white/6 px-4 py-3 text-sm text-slate-200/82"
					>
						<p>{$hudState.status}</p>
					</div>
				</div>

				<div
					id="shop-tab-panel"
					class="min-h-0 overflow-y-auto p-4 sm:p-6"
					role="tabpanel"
					aria-labelledby={`shop-${activeShopTab}-tab`}
				>
					{#if activeShopTab === 'buy'}
						{#if $hudState.shop?.buy.length}
							<div data-testid="shop-buy-grid" class="grid grid-cols-6 gap-2.5 sm:gap-3">
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
											{item.kind}
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
											{item.price}c
										</span>
									</article>
								{/each}
							</div>
						{:else}
							<div
								class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
							>
								No stock available.
							</div>
						{/if}
					{:else if $hudState.shop?.sell.length}
						<div data-testid="shop-sell-grid" class="grid grid-cols-6 gap-2.5 sm:gap-3">
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
										{item.price}c
									</span>
								</article>
							{/each}
						</div>
					{:else}
						<div
							class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
						>
							No sellable items.
						</div>
					{/if}

					{#if hoveredShopBuyItem}
						<div
							role="tooltip"
							class="pointer-events-none absolute right-4 bottom-4 z-20 max-w-[18rem] rounded-[0.95rem] border border-white/12 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
						>
							<p class="text-[0.68rem] font-black tracking-[0.2em] text-amber-100/72 uppercase">
								{hoveredShopBuyItem.name}
							</p>
							<p class="mt-1 text-slate-100/88">{hoveredShopBuyItem.description}</p>
							<p
								class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-slate-300/70 uppercase"
							>
								Buy for {getShopBuyMeta(hoveredShopBuyItem)}
							</p>
						</div>
					{/if}

					{#if hoveredShopSellItem}
						<div
							role="tooltip"
							class="pointer-events-none absolute right-4 bottom-4 z-20 max-w-[18rem] rounded-[0.95rem] border border-white/12 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.45)]"
						>
							<p class="text-[0.68rem] font-black tracking-[0.2em] text-emerald-100/72 uppercase">
								{hoveredShopSellItem.name}
							</p>
							<p class="mt-1 text-slate-100/88">{hoveredShopSellItem.description}</p>
							<p
								class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-slate-300/70 uppercase"
							>
								Sell for {getShopSellMeta(hoveredShopSellItem)}
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

	.hud-action {
		backdrop-filter: blur(14px);
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
