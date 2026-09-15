<script lang="ts">
	import { tick } from 'svelte';
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
	import type { EquipmentSlot } from '$lib/game/content/items';
	import type {
		HudEquipmentItem,
		HudInventoryStack,
		HudKeyItem,
		HudState
	} from '$lib/game/ui-bridge/events';

	/** Heroic bag categories (source mockup): Potions/Gear/Key/Loot. */
	type BagCategory = 'potions' | 'gear' | 'key' | 'loot';
	type BagSlotItem =
		| { kind: 'consumable'; item: HudInventoryStack }
		| { kind: 'equipment'; item: HudEquipmentItem }
		| { kind: 'keyItem'; item: HudKeyItem };

	interface Props {
		open: boolean;
		/** Category to show on next open (Bag → Potions, Gear deep-link → Gear). */
		initialTab?: Extract<BagCategory, 'potions' | 'gear'>;
		ready: boolean;
		battleLocked: boolean;
		inventory: HudState['inventory'];
		coins: number;
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
		coins,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onUseItem,
		onEquip,
		onUnequip,
		onkeydown
	}: Props = $props();

	const equipmentSlots: EquipmentSlot[] = ['head', 'weapon', 'body', 'hands', 'accessory'];
	const bagCategories: BagCategory[] = ['potions', 'gear', 'key', 'loot'];
	const bagSlotCount = 24;
	const bagGridColumns = 6;

	let activeCategory = $state<BagCategory>('potions');
	let selectedRef = $state<{ kind: BagSlotItem['kind']; itemId: string } | null>(null);

	$effect(() => {
		if (!open) {
			selectedRef = null;
			return;
		}
		if (initialTab) activeCategory = initialTab;
	});

	// Re-resolved against the live inventory so a consumed/sold item drops out
	// of the detail panel automatically.
	const selectedSlot = $derived.by(() => {
		if (!selectedRef) return null;
		return (
			getCategoryItems(activeCategory).find(
				(entry) => entry.kind === selectedRef?.kind && entry.item.itemId === selectedRef?.itemId
			) ?? null
		);
	});

	async function focusCategoryTab(category: BagCategory) {
		activeCategory = category;
		selectedRef = null;
		await tick();
		document.getElementById(`inventory-${category}-tab`)?.focus();
	}

	function setCategory(category: BagCategory) {
		activeCategory = category;
		selectedRef = null;
	}

	function handleCategoryTabKeydown(event: KeyboardEvent, category: BagCategory) {
		const currentIndex = bagCategories.indexOf(category);
		const lastIndex = bagCategories.length - 1;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			void focusCategoryTab(bagCategories[currentIndex === lastIndex ? 0 : currentIndex + 1]);
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			void focusCategoryTab(bagCategories[currentIndex === 0 ? lastIndex : currentIndex - 1]);
		} else if (event.key === 'Home') {
			event.preventDefault();
			event.stopPropagation();
			void focusCategoryTab(bagCategories[0]);
		} else if (event.key === 'End') {
			event.preventDefault();
			event.stopPropagation();
			void focusCategoryTab(bagCategories[lastIndex]);
		}
	}

	function getCategoryItems(category: BagCategory): BagSlotItem[] {
		if (category === 'potions') {
			return inventory.consumables.map((item) => ({ kind: 'consumable', item }));
		}

		if (category === 'gear') {
			return inventory.equipment.map((item) => ({ kind: 'equipment', item }));
		}

		if (category === 'key') {
			return inventory.keyItems.map((item) => ({ kind: 'keyItem', item }));
		}

		// No material item type exists: Loot is an honest empty grid.
		return [];
	}

	function getCategorySlots(category: BagCategory): Array<BagSlotItem | null> {
		const items = getCategoryItems(category);
		const overflowSlotCount = Math.ceil(items.length / bagGridColumns) * bagGridColumns;
		const slotCount = Math.max(bagSlotCount, overflowSlotCount);

		return Array.from({ length: slotCount }, (_, index) => items[index] ?? null);
	}

	function getCategoryTitle(category: BagCategory): string {
		return t($locale, `ui.bagCategories.${category}`);
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

	function formatModifierStat(stat: string) {
		if (stat === 'attack') return t($locale, 'ui.attack');
		if (stat === 'defense') return t($locale, 'ui.defense');
		if (stat === 'maxHp') return t($locale, 'ui.hp');
		return stat.toUpperCase();
	}

	function getModifierChips(item: HudEquipmentItem): string[] {
		return Object.entries(item.modifiers)
			.filter(([, value]) => value !== undefined && value !== 0)
			.map(([stat, value]) => `${formatModifierStat(stat)} +${value}`);
	}

	function selectSlot(slot: BagSlotItem) {
		selectedRef = { kind: slot.kind, itemId: slot.item.itemId };
	}

	function activateSlot(slot: BagSlotItem) {
		if (!ready || battleLocked) return;

		if (slot.kind === 'consumable') {
			onUseItem(slot.item.itemId);
			return;
		}

		if (slot.kind === 'equipment' && !slot.item.equipped) {
			onEquip(slot.item.itemId);
		}
	}

	function activateSelected() {
		if (selectedSlot) activateSlot(selectedSlot);
	}

	function getDetailAction(slot: BagSlotItem): 'use' | 'equip' | null {
		if (slot.kind === 'consumable') return 'use';
		if (slot.kind === 'equipment' && !slot.item.equipped) return 'equip';
		return null;
	}

	function getDetailActionLabel(action: 'use' | 'equip'): string {
		return action === 'use' ? t($locale, 'ui.bagUseItem') : t($locale, 'ui.bagEquipItem');
	}
</script>

{#if open}
	<div
		bind:this={dialog}
		class="bag-screen heroic-anim"
		aria-label={t($locale, 'ui.inventory')}
		aria-modal="true"
		role="dialog"
		tabindex="-1"
		{onkeydown}
	>
		<nav class="bag-rail" aria-label={t($locale, 'ui.inventory')}>
			<div class="bag-rail-tabs" role="tablist" aria-label={t($locale, 'ui.inventory')}>
				{#each bagCategories as category (category)}
					<button
						id={`inventory-${category}-tab`}
						type="button"
						role="tab"
						class="bag-rail-card font-display"
						class:bag-rail-card-selected={activeCategory === category}
						aria-selected={activeCategory === category}
						aria-controls="inventory-tab-panel"
						tabindex={activeCategory === category ? 0 : -1}
						onclick={() => setCategory(category)}
						onkeydown={(event) => handleCategoryTabKeydown(event, category)}
					>
						<span class="bag-rail-icon" aria-hidden="true">
							{#if category === 'potions'}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<path
										d="M6.6 1.8h2.8M7.2 1.8v3.4L4 10.6a3.2 3.2 0 0 0 2.9 4.6h2.2a3.2 3.2 0 0 0 2.9-4.6L8.8 5.2V1.8"
									/>
									<path d="M5.2 9.4h5.6" />
								</svg>
							{:else if category === 'gear'}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<path d="M3 13 13 3M6.2 3H13v6.8" />
								</svg>
							{:else if category === 'key'}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<circle cx="5.4" cy="5.4" r="2.9" />
									<path d="m7.6 7.6 5.6 5.6M10.6 10.6l-1.8 1.8M12.6 12.6l-1.4 1.4" />
								</svg>
							{:else}
								<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
									<rect x="2" y="5.6" width="12" height="8.4" rx="1.2" />
									<path d="M2.6 5.4 4 2.6h8l1.4 2.8M8 5.6v2.6" />
								</svg>
							{/if}
						</span>
						<span>{getCategoryTitle(category)}</span>
					</button>
				{/each}
			</div>
			<button bind:this={closeButton} type="button" class="bag-rail-close" onclick={onClose}>
				<PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="B" tone="b" />
				<span class="font-display">{t($locale, 'ui.close')}</span>
			</button>
		</nav>

		<section class="bag-main">
			<header class="bag-header">
				<div>
					<p class="heroic-eyebrow">{t($locale, 'ui.fieldPack')}</p>
					<h2 class="bag-title font-display">{getCategoryTitle(activeCategory)}</h2>
				</div>
				<p class="bag-coins font-display" aria-label={t($locale, 'ui.coins', { coins })}>
					<svg viewBox="0 0 12 12" aria-hidden="true">
						<circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.7" />
					</svg>
					{coins}
				</p>
			</header>

			<div class="bag-grid-panel heroic-stagger">
				<div
					id="inventory-tab-panel"
					class="bag-grid-scroll"
					role="tabpanel"
					aria-labelledby={`inventory-${activeCategory}-tab`}
				>
					<div
						data-testid="inventory-slot-grid"
						class="bag-slot-grid"
						aria-label={t($locale, 'ui.inventorySlotsLabel', {
							section: getCategoryTitle(activeCategory)
						})}
					>
						{#each getCategorySlots(activeCategory) as slot, index (`${activeCategory}-${slot?.item.itemId ?? 'empty'}-${index}`)}
							{#if slot}
								{@const selected =
									selectedSlot?.item.itemId === slot.item.itemId &&
									selectedSlot?.kind === slot.kind}
								<button
									type="button"
									data-testid="inventory-slot"
									class="bag-slot font-display"
									class:bag-slot-selected={selected}
									aria-label={slot.item.name}
									data-focus-id={`bag-slot-${index}`}
									data-focus-row={Math.floor(index / bagGridColumns)}
									data-focus-column={index % bagGridColumns}
									onclick={() => selectSlot(slot)}
									ondblclick={() => activateSlot(slot)}
								>
									{#if slot.kind === 'consumable' && slot.item.quantity > 1}
										<span class="bag-slot-qty"
											>{t($locale, 'ui.quantity', { quantity: slot.item.quantity })}</span
										>
									{:else if slot.kind === 'keyItem' && slot.item.quantity > 1}
										<span class="bag-slot-qty"
											>{t($locale, 'ui.quantity', { quantity: slot.item.quantity })}</span
										>
									{/if}
									{#if slot.kind === 'equipment'}
										<span class="bag-slot-pos font-display"
											>{getEquipmentSlotLabel(slot.item.slot)}</span
										>
										{#if slot.item.equipped}
											<span class="bag-slot-worn font-display">{t($locale, 'ui.equipped')}</span>
										{/if}
									{/if}
									<img
										src={slot.item.iconPath}
										alt={slot.item.name}
										class="bag-slot-icon"
										loading="lazy"
										draggable="false"
									/>
								</button>
							{:else}
								<div
									data-testid="inventory-slot"
									class="bag-slot bag-slot-empty"
									aria-label={t($locale, 'ui.emptyInventorySlot', { index: index + 1 })}
								></div>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		</section>

		<aside class="bag-side">
			<section class="bag-worn" data-testid="inventory-worn" aria-label={t($locale, 'ui.bagWorn')}>
				<p class="bag-worn-label font-display">{t($locale, 'ui.bagWorn')}</p>
				<div class="bag-worn-grid">
					{#each equipmentSlots as slot (slot)}
						{@const equippedItem = inventory.equipment.find(
							(item) => item.itemId === inventory.equipped[slot] && item.slot === slot
						)}
						<div class="bag-worn-slot bag-worn-{slot}">
							<div class="bag-worn-tile" class:bag-worn-tile-filled={!!equippedItem}>
								{#if equippedItem}
									<img src={equippedItem.iconPath} alt={equippedItem.name} draggable="false" />
									<button
										type="button"
										class="bag-worn-remove font-display"
										aria-label={`${t($locale, 'ui.remove')} ${equippedItem.name}`}
										onclick={() => onUnequip(slot)}
										disabled={!ready || battleLocked}
									>
										✕
									</button>
								{:else}
									<span class="bag-worn-plus" aria-hidden="true">+</span>
								{/if}
							</div>
							<span class="bag-worn-slot-label font-display">{getEquipmentSlotLabel(slot)}</span>
						</div>
					{/each}
					<div class="bag-worn-doll">
						<img
							data-testid="inventory-paper-doll"
							src="/game/assets/heroic-ui/liam-paper-doll.png"
							alt={t($locale, 'ui.bagPaperDollAlt')}
							draggable="false"
						/>
					</div>
				</div>
			</section>

			<section
				class="bag-detail"
				data-testid="inventory-detail"
				aria-label={t($locale, 'ui.inventory')}
			>
				{#if selectedSlot}
					<div class="bag-detail-head">
						<img
							class="bag-detail-icon"
							src={selectedSlot.item.iconPath}
							alt=""
							draggable="false"
						/>
						<div class="min-w-0">
							<p class="bag-detail-name font-display">{selectedSlot.item.name}</p>
							<p class="bag-detail-desc">{selectedSlot.item.description}</p>
						</div>
					</div>
					<div class="bag-detail-chips">
						{#if selectedSlot.kind === 'equipment'}
							{#each getModifierChips(selectedSlot.item) as chip (chip)}
								<span class="bag-chip bag-chip-buff font-display">{chip}</span>
							{/each}
							{#if selectedSlot.item.equipped}
								<span class="bag-chip bag-chip-worn font-display">{t($locale, 'ui.equipped')}</span>
							{/if}
						{:else if selectedSlot.kind === 'keyItem'}
							<span class="bag-chip bag-chip-key font-display">{t($locale, 'ui.key')}</span>
						{/if}
						{#if (selectedSlot.kind === 'consumable' || selectedSlot.kind === 'keyItem') && selectedSlot.item.quantity > 1}
							<span class="bag-chip bag-chip-qty font-display">
								{t($locale, 'ui.quantity', { quantity: selectedSlot.item.quantity })}
							</span>
						{/if}
					</div>
					{#if getDetailAction(selectedSlot)}
						{@const lastItemIndex = getCategoryItems(activeCategory).length - 1}
						<button
							type="button"
							class="bag-detail-action font-display"
							data-focus-id="bag-detail-action"
							data-focus-row={Math.floor(lastItemIndex / bagGridColumns) + 1}
							data-focus-column={lastItemIndex % bagGridColumns}
							onclick={activateSelected}
						>
							<span>{getDetailActionLabel(getDetailAction(selectedSlot)!)}</span>
							<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
						</button>
					{/if}
				{:else}
					<p class="bag-detail-hint font-display">{t($locale, 'ui.bagSelectHint')}</p>
				{/if}
			</section>
		</aside>
	</div>
{/if}

<style>
	/* Full-bleed Heroic surface (source 03-bag): rail left, grid centre,
	   WORN + detail column right. */
	.bag-screen {
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

	/* ---- Rail ------------------------------------------------------------ */
	.bag-rail {
		display: flex;
		flex: none;
		flex-direction: column;
		justify-content: space-between;
		width: 6.4rem;
	}

	.bag-rail-tabs {
		display: grid;
		gap: 0.9rem;
	}

	.bag-rail-card {
		display: grid;
		justify-items: center;
		gap: 0.45rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.875rem;
		padding: 0.95rem 0.4rem 0.75rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 28%, transparent)
			),
			var(--color-panel-deep);
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		transition:
			border-color 160ms ease,
			color 160ms ease,
			transform 160ms ease;
	}
	.bag-rail-card:hover:not(.bag-rail-card-selected) {
		color: var(--color-parchment);
		border-color: var(--color-frame-strong);
		transform: translateY(-1px);
	}

	.bag-rail-card-selected {
		border-color: rgba(255, 232, 168, 0.85);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	.bag-rail-icon {
		display: grid;
		place-items: center;
	}
	.bag-rail-icon svg {
		width: 1.35rem;
		height: 1.35rem;
	}

	.bag-rail-close {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
		border: 0;
		background: transparent;
		padding: 0.3rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 800;
		cursor: pointer;
		transition: color 160ms ease;
	}
	.bag-rail-close:hover {
		color: var(--color-parchment);
	}

	/* ---- Main column ------------------------------------------------------ */
	.bag-main {
		display: flex;
		flex: 1;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
	}

	.bag-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.bag-title {
		margin: 0.35rem 0 0;
		font-size: clamp(1.7rem, 2.6vw, 2.2rem);
		font-weight: 900;
		letter-spacing: 0.01em;
		color: var(--color-parchment);
	}

	.bag-coins {
		display: inline-flex;
		align-items: center;
		gap: 0.42rem;
		/* Mockup seats the pill mid-header, reserving room after it for the
		   (omitted) LB/RB hint instead of flush against the WORN panel. */
		margin: 0.2rem 8rem 0 0;
		border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
		border-radius: 999px;
		padding: 0.32rem 0.85rem;
		color: var(--color-gold);
		font-size: 0.9rem;
		font-weight: 900;
	}
	.bag-coins svg {
		width: 0.85rem;
		height: 0.85rem;
	}

	.bag-grid-panel {
		display: grid;
		flex: 1;
		min-height: 0;
		margin-top: 1.15rem;
		border: 1px solid var(--color-frame);
		border-radius: 1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 20%, transparent)
			),
			var(--color-panel);
		box-shadow: inset 0 1px 0 rgba(255, 246, 224, 0.06);
	}

	.bag-grid-scroll {
		min-height: 0;
		padding: 1rem;
		overflow-y: auto;
	}

	.bag-slot-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.85rem;
	}

	/* ---- Slots ------------------------------------------------------------ */
	.bag-slot {
		position: relative;
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		min-width: 0;
		border: 1px solid var(--color-frame);
		border-radius: 0.85rem;
		background: color-mix(in srgb, var(--color-panel) 62%, var(--color-panel-deep));
		cursor: pointer;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			box-shadow 160ms ease;
	}
	.bag-slot:hover {
		border-color: var(--color-frame-strong);
	}

	.bag-slot-selected {
		border-color: rgba(255, 232, 168, 0.9);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	.bag-slot-empty {
		/* Mockup empty tile: faint fill, cool stroke, hairline top light. */
		border-color: rgba(169, 200, 255, 0.14);
		background: rgba(255, 255, 255, 0.035);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
		cursor: default;
	}
	.bag-slot-empty:hover {
		border-color: rgba(169, 200, 255, 0.14);
	}

	.bag-slot-icon {
		width: 72%;
		height: 72%;
		object-fit: contain;
		filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
		image-rendering: pixelated;
	}

	.bag-slot-qty {
		position: absolute;
		right: 0.5rem;
		bottom: 0.4rem;
		color: var(--color-gold);
		font-size: 0.66rem;
		font-weight: 900;
		letter-spacing: 0.04em;
	}
	.bag-slot-selected .bag-slot-qty {
		color: #3a2c07;
	}

	.bag-slot-pos {
		position: absolute;
		top: 0.45rem;
		left: 0.5rem;
		color: var(--color-muted);
		font-size: 0.52rem;
		font-weight: 900;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.bag-slot-selected .bag-slot-pos {
		color: #3a2c07;
	}

	.bag-slot-worn {
		position: absolute;
		top: 0.45rem;
		right: 0.5rem;
		color: var(--color-sapphire);
		font-size: 0.52rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.bag-slot-selected .bag-slot-worn {
		color: #3a2c07;
	}

	/* ---- Side column: WORN + detail --------------------------------------- */
	.bag-side {
		display: flex;
		flex: none;
		flex-direction: column;
		gap: 1.15rem;
		width: 21.5rem;
		min-height: 0;
	}

	.bag-worn {
		flex: 1;
		min-height: 0;
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
		overflow: hidden;
	}

	.bag-worn-label {
		margin: 0;
		color: var(--color-gold);
		font-size: 0.62rem;
		font-weight: 900;
		letter-spacing: 0.24em;
		text-transform: uppercase;
	}

	.bag-worn-grid {
		display: grid;
		height: calc(100% - 1.2rem);
		min-height: 0;
		margin-top: 0.55rem;
		grid-template-columns: 1fr auto 1fr;
		grid-template-rows: auto 1fr 1fr;
		grid-template-areas:
			'. head .'
			'weapon doll body'
			'hands doll accessory';
		align-items: center;
		justify-items: center;
	}

	.bag-worn-head {
		grid-area: head;
	}
	.bag-worn-weapon {
		grid-area: weapon;
	}
	.bag-worn-body {
		grid-area: body;
	}
	.bag-worn-hands {
		grid-area: hands;
	}
	.bag-worn-accessory {
		grid-area: accessory;
	}

	.bag-worn-slot {
		display: grid;
		justify-items: center;
		gap: 0.3rem;
	}

	.bag-worn-tile {
		position: relative;
		display: grid;
		place-items: center;
		width: 3.55rem;
		height: 3.55rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--color-ink) 45%, var(--color-panel-deep));
	}

	.bag-worn-tile img {
		width: 68%;
		height: 68%;
		object-fit: contain;
		image-rendering: pixelated;
	}

	.bag-worn-plus {
		color: var(--color-muted);
		font-size: 1.15rem;
		font-weight: 700;
		opacity: 0.65;
	}

	.bag-worn-remove {
		position: absolute;
		top: -0.45rem;
		right: -0.45rem;
		display: grid;
		place-items: center;
		width: 1.15rem;
		height: 1.15rem;
		border: 1px solid rgba(255, 138, 158, 0.55);
		border-radius: 999px;
		background: #2a0d17;
		color: var(--color-rose);
		font-size: 0.58rem;
		line-height: 1;
		cursor: pointer;
		transition: border-color 160ms ease;
	}
	.bag-worn-remove:hover:not(:disabled) {
		border-color: var(--color-rose);
	}
	.bag-worn-remove:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}

	.bag-worn-slot-label {
		color: var(--color-muted);
		font-size: 0.56rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.bag-worn-doll {
		display: grid;
		height: 100%;
		min-height: 0;
		place-items: center;
		grid-area: doll;
	}
	.bag-worn-doll img {
		height: 100%;
		max-height: 15rem;
		width: auto;
		object-fit: contain;
		filter: drop-shadow(0 14px 26px rgba(0, 0, 0, 0.45));
	}

	/* ---- Detail panel ------------------------------------------------------ */
	.bag-detail {
		flex: none;
		border: 1px solid var(--color-frame);
		border-radius: 1rem;
		padding: 1rem 1.1rem 1.1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 20%, transparent)
			),
			var(--color-panel);
		box-shadow: inset 0 1px 0 rgba(255, 246, 224, 0.06);
	}

	.bag-detail-head {
		display: flex;
		align-items: flex-start;
		gap: 0.8rem;
	}

	.bag-detail-icon {
		flex: none;
		width: 3.4rem;
		height: 3.4rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
		border-radius: 0.8rem;
		background: color-mix(in srgb, var(--color-ink) 45%, var(--color-panel-deep));
		padding: 0.45rem;
		object-fit: contain;
		image-rendering: pixelated;
	}

	.bag-detail-name {
		margin: 0.1rem 0 0;
		font-size: 1rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.bag-detail-desc {
		margin: 0.25rem 0 0;
		/* Mockup detail prose uses the default display face, not Spectral. */
		font-family: var(--font-display);
		font-size: 0.78rem;
		color: var(--color-muted);
	}

	.bag-detail-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		margin-top: 0.8rem;
	}

	.bag-chip {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		border: 1px solid var(--color-frame-strong);
		padding: 0.22rem 0.65rem;
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--color-parchment);
	}
	.bag-chip-buff {
		border-color: color-mix(in srgb, var(--color-emerald) 45%, transparent);
		color: var(--color-emerald);
	}
	.bag-chip-worn {
		border-color: color-mix(in srgb, var(--color-sapphire) 45%, transparent);
		color: var(--color-sapphire);
	}
	.bag-chip-key {
		border-color: color-mix(in srgb, var(--color-gold) 45%, transparent);
		color: var(--color-gold);
	}
	.bag-chip-qty {
		color: var(--color-muted);
	}

	.bag-detail-action {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-top: 0.95rem;
		border: 1px solid rgba(255, 232, 168, 0.85);
		border-radius: 0.7rem;
		padding: 0.62rem 0.85rem;
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		font-size: 0.86rem;
		font-weight: 900;
		cursor: pointer;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}
	.bag-detail-action:hover {
		transform: translateY(-1px);
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	.bag-detail-hint {
		margin: 0.2rem 0 0;
		color: var(--color-muted);
		font-size: 0.82rem;
		font-weight: 700;
	}

	/* Short-height compaction (final-review finding 4): below ~560px the
	   desktop columns overflow — rail cards + Close run past the bottom edge
	   and the WORN panel's fixed-size tiles (with remove buttons) clip under
	   overflow:hidden. Same 560px boundary as the command-grid fallback. */
	@media (max-height: 559px) {
		.bag-screen {
			padding: 0.9rem 1.1rem 0.9rem 0.9rem;
			gap: 1rem;
		}

		.bag-title {
			font-size: 1.2rem;
		}

		.bag-coins {
			margin-right: 0;
		}

		.bag-grid-panel {
			margin-top: 0.6rem;
		}

		.bag-grid-scroll {
			padding: 0.6rem;
		}

		.bag-rail {
			gap: 0.5rem;
		}

		.bag-rail-tabs {
			gap: 0.4rem;
		}

		.bag-rail-card {
			gap: 0.3rem;
			padding: 0.5rem 0.3rem 0.45rem;
		}

		.bag-rail-icon svg {
			width: 1rem;
			height: 1rem;
		}

		.bag-rail-close {
			padding: 0.15rem 0.3rem;
		}

		.bag-side {
			gap: 0.6rem;
		}

		.bag-worn {
			padding: 0.5rem 0.7rem;
		}

		.bag-worn-grid {
			margin-top: 0.3rem;
			row-gap: 0.3rem;
		}

		.bag-worn-tile {
			width: 2.9rem;
			height: 2.9rem;
		}

		.bag-worn-remove {
			top: -0.35rem;
			right: -0.35rem;
			width: 1.05rem;
			height: 1.05rem;
		}

		.bag-detail {
			padding: 0.6rem 0.8rem;
		}
	}

	@media (max-width: 900px) {
		.bag-screen {
			flex-direction: column;
			gap: 1rem;
			overflow-y: auto;
		}

		.bag-coins {
			margin-right: 0;
		}

		.bag-main,
		.bag-grid-panel {
			flex: none;
		}

		.bag-rail {
			width: 100%;
			gap: 0.75rem;
		}

		.bag-rail-tabs {
			grid-template-columns: repeat(4, 1fr);
		}

		.bag-rail-close {
			justify-self: start;
			grid-auto-flow: column;
			align-items: center;
		}

		.bag-side {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		.bag-screen {
			padding: 0.85rem;
		}

		.bag-slot-grid {
			grid-template-columns: repeat(4, minmax(0, 1fr));
			gap: 0.55rem;
		}
	}
</style>
