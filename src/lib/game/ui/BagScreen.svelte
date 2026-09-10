<script lang="ts">
	import { tick } from 'svelte';
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import type { EquipmentSlot } from '$lib/game/content/items';
	import type {
		HudEquipmentItem,
		HudInventoryStack,
		HudKeyItem,
		HudState
	} from '$lib/game/ui-bridge/events';

	type InventoryTab = 'consumables' | 'equipment' | 'keyItems';
	type InventorySlotItem =
		| { kind: 'consumable'; item: HudInventoryStack }
		| { kind: 'equipment'; item: HudEquipmentItem }
		| { kind: 'keyItem'; item: HudKeyItem };

	interface Props {
		open: boolean;
		/** Tab to show on next open (Gear deep-link from the field command grid). */
		initialTab?: InventoryTab;
		ready: boolean;
		battleLocked: boolean;
		inventory: HudState['inventory'];
		hp: number;
		maxHp: number;
		attack: number;
		defense: number;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onUseItem: (itemId: string) => void;
		onEquip: (itemId: string) => void;
		onUnequip: (slot: EquipmentSlot) => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		open,
		initialTab,
		ready,
		battleLocked,
		inventory,
		hp,
		maxHp,
		attack,
		defense,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onUseItem,
		onEquip,
		onUnequip,
		onkeydown
	}: Props = $props();

	const equipmentSlots: EquipmentSlot[] = ['weapon', 'head', 'body', 'hands', 'accessory'];
	const inventoryTabs: InventoryTab[] = ['consumables', 'equipment', 'keyItems'];
	const inventorySlotCount = 24;
	const inventoryGridColumns = 6;

	let activeInventoryTab = $state<InventoryTab>('consumables');
	let hoveredInventoryItem = $state<InventorySlotItem | null>(null);

	$effect(() => {
		if (!open) {
			hoveredInventoryItem = null;
			return;
		}
		if (initialTab) activeInventoryTab = initialTab;
	});

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
			return inventory.consumables.map((item) => ({ kind: 'consumable', item }));
		}

		if (tab === 'equipment') {
			return inventory.equipment.map((item) => ({ kind: 'equipment', item }));
		}

		return inventory.keyItems.map((item) => ({ kind: 'keyItem', item }));
	}

	function getInventoryGridSlots(tab: InventoryTab): Array<InventorySlotItem | null> {
		const items = getInventoryGridItems(tab);
		const overflowSlotCount = Math.ceil(items.length / inventoryGridColumns) * inventoryGridColumns;
		const slotCount = Math.max(inventorySlotCount, overflowSlotCount);

		return Array.from({ length: slotCount }, (_, index) => items[index] ?? null);
	}

	function getInventorySlotClass(slot: InventorySlotItem) {
		const baseClass =
			'inventory-slot group relative flex aspect-square min-h-0 flex-col justify-center overflow-hidden p-2.5 transition sm:p-3';

		if (slot.kind === 'consumable') {
			return `${baseClass} jeweled-cell jeweled-cell-emerald jeweled-cell-action cursor-pointer`;
		}

		if (slot.kind === 'equipment') {
			const actionClass = !slot.item.equipped ? 'jeweled-cell-action cursor-pointer' : '';
			return `${baseClass} jeweled-cell jeweled-cell-sapphire ${actionClass}`;
		}

		return `${baseClass} jeweled-cell jeweled-cell-amber`;
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
			return 'border-emerald/18 bg-emerald/12 text-emerald';
		}

		if (slot.kind === 'equipment') {
			return 'border-sapphire/18 bg-sapphire/12 text-sapphire';
		}

		return 'border-amber/18 bg-amber/12 text-amber';
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
		if (!ready || battleLocked) return;

		if (slot.kind === 'consumable') {
			onUseItem(slot.item.itemId);
			return;
		}

		if (slot.kind === 'equipment' && !slot.item.equipped) {
			onEquip(slot.item.itemId);
		}
	}
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="glass-panel-strong arcane-window-enter jrpg-window"
			aria-labelledby="inventory-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<div>
				<div class="jrpg-window-header">
					<div>
						<p class="jrpg-label">{t($locale, 'ui.fieldPack')}</p>
						<h2 id="inventory-heading" class="jrpg-window-title font-display">
							{t($locale, 'ui.inventory')}
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
				<div
					class="jrpg-tab-list jrpg-tab-list-three px-4 pb-4"
					role="tablist"
					aria-label={t($locale, 'ui.inventorySections')}
				>
					<button
						id="inventory-consumables-tab"
						type="button"
						role="tab"
						class={`glass-button jrpg-tab ${activeInventoryTab === 'consumables' ? 'jrpg-tab-active' : ''}`}
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
						class={`glass-button jrpg-tab ${activeInventoryTab === 'equipment' ? 'jrpg-tab-active' : ''}`}
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
						class={`glass-button jrpg-tab ${activeInventoryTab === 'keyItems' ? 'jrpg-tab-active' : ''}`}
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

			<div class="arcane-stagger jrpg-window-body jrpg-inventory-layout">
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
												class="absolute right-2 bottom-2 left-2 rounded-full border border-sapphire/20 bg-sapphire/12 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.16em] text-sapphire uppercase"
											>
												{t($locale, 'ui.equipped')}
											</span>
										{:else if slot.kind === 'keyItem'}
											<span
												class="absolute right-2 bottom-2 left-2 rounded-full border border-gold/16 bg-gold/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.18em] text-amber/70 uppercase"
											>
												{t($locale, 'ui.key')}
											</span>
										{/if}
									</article>
								{:else}
									<div
										data-testid="inventory-slot"
										class="inventory-slot-empty flex aspect-square items-center justify-center rounded-[0.95rem] border border-dashed border-parchment/10 bg-white/[0.035] text-[0.54rem] font-black tracking-[0.18em] text-muted/38 uppercase"
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
						<p class="text-[0.62rem] font-black tracking-[0.28em] text-sapphire/64 uppercase">
							{t($locale, 'ui.stats')}
						</p>
						<div class="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-1">
							<div
								class="rounded-[0.95rem] border border-rose-100/12 bg-rose-100/8 px-2 py-2 text-center"
							>
								<p class="text-[0.58rem] font-black tracking-[0.22em] text-rose-50/64 uppercase">
									{t($locale, 'ui.hp')}
								</p>
								<p class="mt-0.5 text-base font-black text-parchment">{hp}/{maxHp}</p>
							</div>
							<div
								class="rounded-[0.95rem] border border-cyan-100/12 bg-cyan-100/8 px-2 py-2 text-center"
							>
								<p class="text-[0.58rem] font-black tracking-[0.22em] text-cyan-50/64 uppercase">
									{t($locale, 'ui.attack')}
								</p>
								<p class="mt-0.5 text-base font-black text-parchment">{attack}</p>
							</div>
							<div
								class="rounded-[0.95rem] border border-emerald-100/12 bg-emerald-100/8 px-2 py-2 text-center"
							>
								<p class="text-[0.58rem] font-black tracking-[0.22em] text-emerald-50/64 uppercase">
									{t($locale, 'ui.defense')}
								</p>
								<p class="mt-0.5 text-base font-black text-parchment">{defense}</p>
							</div>
						</div>
					</div>

					<div class="jrpg-side-stat min-h-0">
						<p class="text-[0.62rem] font-black tracking-[0.28em] text-sapphire/64 uppercase">
							{t($locale, 'ui.equipped')}
						</p>
						<div
							class="mt-2 grid grid-cols-2 gap-2 lg:max-h-full lg:grid-cols-1 lg:overflow-y-auto"
						>
							{#each equipmentSlots as slot (slot)}
								{@const equippedItemId = inventory.equipped[slot]}
								{@const equippedItem = inventory.equipment.find(
									(item) => item.itemId === equippedItemId
								)}
								<div
									class="jrpg-equipped-row grid min-h-[3.65rem] grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
								>
									<div class="min-w-0">
										<p class="text-[0.54rem] font-black tracking-[0.2em] text-muted/62 uppercase">
											{getEquipmentSlotLabel(slot)}
										</p>
										<p
											class="mt-0.5 truncate text-[0.8rem] font-black tracking-[0.08em] text-parchment uppercase"
										>
											{equippedItem?.name ?? t($locale, 'ui.empty')}
										</p>
									</div>
									{#if equippedItemId}
										<button
											type="button"
											class="rounded-full border border-rose-200/20 bg-rose-200/10 px-2.5 py-1.5 text-[0.54rem] font-black tracking-[0.16em] text-rose-50 uppercase transition hover:border-rose-200/45 disabled:cursor-not-allowed disabled:opacity-40"
											onclick={() => onUnequip(slot)}
											disabled={!ready || battleLocked}
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
					<div role="tooltip" class="glass-panel-strong jrpg-tooltip">
						<p class="text-[0.68rem] font-black tracking-[0.2em] text-sapphire/90 uppercase">
							{hoveredInventoryItem.item.name}
						</p>
						<p class="mt-1 text-parchment/88">{hoveredInventoryItem.item.description}</p>
						<p class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-muted uppercase">
							{getInventoryTooltipMeta(hoveredInventoryItem)}
						</p>
					</div>
				{/if}
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

	.jrpg-tab-list {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.85rem;
	}

	.jrpg-tab-list-three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.jrpg-tab {
		/* border/background from glass-button component class */
		padding: 0.58rem 0.7rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.jrpg-tab-active {
		border-color: var(--color-frame-strong);
		background: rgba(244, 229, 184, 0.13);
		color: var(--color-parchment);
	}

	.jrpg-window-body {
		min-height: 0;
		overflow-y: auto;
		padding: 1rem;
	}

	.jrpg-inventory-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 14rem;
		gap: 1rem;
		overflow: hidden;
	}

	.jrpg-grid-frame,
	.jrpg-side-rail {
		border: 1px solid rgba(244, 229, 184, 0.14);
		border-radius: var(--radius-arcane);
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
	.jrpg-equipped-row {
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
		/* border/background/shadow now from glass-panel-strong component class */
		padding: 0.75rem;
		color: var(--color-parchment);
		pointer-events: none;
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
</style>
