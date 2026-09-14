<script lang="ts">
	import { tick } from 'svelte';
	import { locale, preferences } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { getItemText } from '$lib/game/i18n/content';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
	import type { EquipmentSlot } from '$lib/game/content/items';
	import type { HudNearbyShop, HudOpenShop } from '$lib/game/ui-bridge/events';
	import type { HudShopBuyEntry, HudShopSellEntry } from '$lib/game/core/shop';

	type ShopTab = 'buy' | 'sell';

	interface Props {
		open: boolean;
		ready: boolean;
		battleLocked: boolean;
		shop: HudOpenShop | null;
		nearbyShop: HudNearbyShop | null;
		coins: number;
		dialog?: HTMLDivElement;
		closeButton?: HTMLButtonElement;
		onClose: () => void;
		onBuy: (shopId: string, stockId: string) => void;
		onSell: (itemId: string) => void;
		onkeydown: (event: KeyboardEvent) => void;
	}

	let {
		open,
		ready,
		battleLocked,
		shop,
		nearbyShop,
		coins,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onBuy,
		onSell,
		onkeydown
	}: Props = $props();

	const shopTabs: ShopTab[] = ['buy', 'sell'];
	// Pad focus-grid geometry mirrors the 4-column stock grid.
	const shopGridColumns = 4;

	let activeShopTab = $state<ShopTab>('buy');
	let selectedBuyStockId = $state<string | null>(null);
	let selectedSellItemId = $state<string | null>(null);
	let hoveredShopBuyItem = $state<HudShopBuyEntry | null>(null);
	let hoveredShopSellItem = $state<HudShopSellEntry | null>(null);

	$effect(() => {
		if (open) return;
		activeShopTab = 'buy';
		selectedBuyStockId = null;
		selectedSellItemId = null;
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
	});

	// Re-resolved against the live stock so a purchase drops out of the detail
	// panel automatically.
	const selectedBuyItem = $derived.by(() => {
		if (!shop || !selectedBuyStockId) return null;
		return shop.buy.find((entry) => entry.stockId === selectedBuyStockId) ?? null;
	});
	const selectedSellItem = $derived.by(() => {
		if (!shop || !selectedSellItemId) return null;
		return shop.sell.find((entry) => entry.itemId === selectedSellItemId) ?? null;
	});

	const shopName = $derived(shop?.name ?? nearbyShop?.name ?? t($locale, 'ui.shop'));
	const merchant = $derived(shop ?? nearbyShop);

	async function focusShopTab(tab: ShopTab) {
		activeShopTab = tab;
		selectedBuyStockId = null;
		selectedSellItemId = null;
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
		await tick();
		document.getElementById(`shop-${tab}-tab`)?.focus();
	}

	function setShopTab(tab: ShopTab) {
		activeShopTab = tab;
		selectedBuyStockId = null;
		selectedSellItemId = null;
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
	}

	function handleShopTabKeydown(event: KeyboardEvent, tab: ShopTab) {
		const currentIndex = shopTabs.indexOf(tab);
		const lastIndex = shopTabs.length - 1;

		if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			void focusShopTab(shopTabs[currentIndex === lastIndex ? 0 : currentIndex + 1]);
		} else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			void focusShopTab(shopTabs[currentIndex === 0 ? lastIndex : currentIndex - 1]);
		} else if (event.key === 'Home') {
			event.preventDefault();
			event.stopPropagation();
			void focusShopTab(shopTabs[0]);
		} else if (event.key === 'End') {
			event.preventDefault();
			event.stopPropagation();
			void focusShopTab(shopTabs[lastIndex]);
		}
	}

	function getShopTabLabel(tab: ShopTab): string {
		return tab === 'buy' ? t($locale, 'ui.buy') : t($locale, 'ui.sell');
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
			ready &&
			!battleLocked &&
			shop !== null &&
			coins >= item.price &&
			(item.availability.mode === 'unlimited' || item.availability.remaining > 0)
		);
	}

	function showShopBuyTooltip(item: HudShopBuyEntry) {
		hoveredShopBuyItem = item;
	}

	function hideShopBuyTooltip() {
		hoveredShopBuyItem = null;
	}

	function selectShopBuyItem(item: HudShopBuyEntry) {
		selectedBuyStockId = item.stockId;
		selectedSellItemId = null;
	}

	function activateShopBuyItem(item: HudShopBuyEntry) {
		if (!canBuyShopItem(item) || !shop) return;
		onBuy(shop.shopId, item.stockId);
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

	function selectShopSellItem(item: HudShopSellEntry) {
		selectedSellItemId = item.itemId;
		selectedBuyStockId = null;
	}

	function activateShopSellItem(item: HudShopSellEntry) {
		if (!ready || battleLocked) return;
		onSell(item.itemId);
	}

	function getEquipmentSlotLabel(slot: EquipmentSlot): string {
		return t($locale, `ui.equipmentSlots.${slot}`);
	}

	/** "Replaces Body · empty" / "Replaces Weapon · Training Sword" chip copy. */
	function getReplacesText(slot: EquipmentSlot, replacedItemId: string | null): string {
		const current = replacedItemId
			? (getItemText($locale, replacedItemId)?.name ?? '')
			: t($locale, 'ui.shopEmptySlot');

		return t($locale, 'ui.shopReplaces', {
			slot: getEquipmentSlotLabel(slot),
			current
		});
	}

	type DeltaRow = {
		stat: 'maxHp' | 'defense' | 'attack';
		label: string;
		before: number;
		after: number;
	};

	function getDeltaRows(
		before: { maxHp: number; attack: number; defense: number },
		after: { maxHp: number; attack: number; defense: number }
	): DeltaRow[] {
		return [
			{ stat: 'maxHp', label: t($locale, 'ui.maxHp'), before: before.maxHp, after: after.maxHp },
			{
				stat: 'defense',
				label: t($locale, 'ui.defense'),
				before: before.defense,
				after: after.defense
			},
			{ stat: 'attack', label: t($locale, 'ui.attack'), before: before.attack, after: after.attack }
		];
	}

	function activateSelected() {
		if (activeShopTab === 'buy') {
			if (selectedBuyItem) activateShopBuyItem(selectedBuyItem);
		} else if (selectedSellItem) {
			activateShopSellItem(selectedSellItem);
		}
	}

	function isSelectionAffordable(): boolean {
		if (activeShopTab === 'buy') {
			return selectedBuyItem !== null && canBuyShopItem(selectedBuyItem);
		}
		return ready && !battleLocked && selectedSellItem !== null;
	}

	function getActionLabel(): string {
		if (activeShopTab === 'buy' && !isSelectionAffordable()) {
			return t($locale, 'ui.shopNotEnough');
		}
		return getShopTabLabel(activeShopTab);
	}
</script>

{#if open}
	<div
		bind:this={dialog}
		class="shop-screen heroic-anim"
		aria-label={shopName}
		aria-modal="true"
		role="dialog"
		tabindex="-1"
		{onkeydown}
	>
		<!-- Merchant rail: identity art, flavor, purse, Buy/Sell (source 04-shop) -->
		<aside class="shop-rail">
			<div class="shop-rail-top">
				<div class="shop-portrait-panel">
					<span class="shop-portrait-frame">
						{#if merchant?.bustPath}
							<img
								class="shop-portrait"
								src={merchant.bustPath}
								alt={t($locale, 'ui.shopBustAlt', { merchant: merchant.merchantName })}
								draggable="false"
							/>
						{/if}
					</span>
					<p class="heroic-eyebrow">{t($locale, 'ui.merchant')}</p>
					<p class="shop-merchant-name font-display">
						{merchant?.merchantName ?? t($locale, 'ui.merchant')}
					</p>
				</div>
				{#if merchant?.description}
					<p class="shop-quote">{merchant.description}</p>
				{/if}
				<div
					class="shop-purse"
					data-testid="shop-purse"
					aria-label={t($locale, 'ui.coins', { coins })}
				>
					<span class="heroic-eyebrow">{t($locale, 'ui.shopPurse')}</span>
					<span class="shop-purse-value font-display">
						<svg viewBox="0 0 12 12" aria-hidden="true">
							<circle cx="6" cy="6" r="4.3" fill="none" stroke="currentColor" stroke-width="1.7" />
						</svg>
						{coins}
					</span>
				</div>
			</div>
			<div>
				<div class="shop-modes" role="tablist" aria-label={t($locale, 'ui.shopSections')}>
					{#each shopTabs as tab, index (tab)}
						<button
							id={`shop-${tab}-tab`}
							type="button"
							role="tab"
							class="shop-mode font-display"
							class:shop-mode-selected={activeShopTab === tab}
							data-focus-id={`shop-tab-${tab}`}
							data-focus-row={0}
							data-focus-column={index}
							aria-selected={activeShopTab === tab}
							aria-controls="shop-tab-panel"
							tabindex={activeShopTab === tab ? 0 : -1}
							onclick={() => setShopTab(tab)}
							onkeydown={(event) => handleShopTabKeydown(event, tab)}
						>
							<svg
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.7"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								{#if tab === 'buy'}
									<!-- Mockup buy-tab bag glyph -->
									<path d="M5 8h14l1 12H4L5 8z" />
									<path d="M9 8V6a3 3 0 0 1 6 0v2" />
								{:else}
									<!-- Mockup sell-tab coin glyph -->
									<path d="M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14z" />
									<path d="M12 8.5v7M9.8 10.8h4.4M9.8 13.4h4.4" />
								{/if}
							</svg>
							{getShopTabLabel(tab)}
						</button>
					{/each}
				</div>
				<button bind:this={closeButton} type="button" class="shop-rail-close" onclick={onClose}>
					<PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="B" tone="b" />
					<span class="font-display">{t($locale, 'ui.close')}</span>
				</button>
			</div>
		</aside>

		<!-- Stock grid -->
		<section class="shop-main">
			<header class="shop-header">
				<div>
					<p class="heroic-eyebrow">{getShopTabLabel(activeShopTab)}</p>
					<h2 id="shop-heading" class="shop-title font-display">{shopName}</h2>
				</div>
				{#if activeShopTab === 'buy'}
					<p class="shop-hint">{t($locale, 'ui.shopDimmedHint')}</p>
				{/if}
			</header>

			<div class="shop-grid-panel heroic-stagger">
				<div
					id="shop-tab-panel"
					class="shop-grid-scroll"
					role="tabpanel"
					aria-labelledby={`shop-${activeShopTab}-tab`}
				>
					{#if activeShopTab === 'buy'}
						{#if shop?.buy.length}
							<div data-testid="shop-buy-grid" class="shop-grid">
								{#each shop.buy as item, index (item.stockId)}
									{@const affordable = canBuyShopItem(item)}
									{@const selected = selectedBuyStockId === item.stockId}
									<button
										type="button"
										class="shop-tile font-display"
										class:shop-tile-selected={selected}
										class:shop-tile-dimmed={!affordable}
										data-focus-id={`shop-buy-${index}`}
										data-focus-row={1 + Math.floor(index / shopGridColumns)}
										data-focus-column={index % shopGridColumns}
										aria-label={item.name}
										onclick={() => selectShopBuyItem(item)}
										ondblclick={() => activateShopBuyItem(item)}
										onmouseenter={() => showShopBuyTooltip(item)}
										onmouseleave={hideShopBuyTooltip}
										onfocus={() => showShopBuyTooltip(item)}
										onblur={hideShopBuyTooltip}
									>
										<img
											src={item.iconPath}
											alt={item.name}
											class="shop-tile-icon"
											loading="lazy"
											draggable="false"
										/>
										<span class="shop-tile-price">
											<svg viewBox="0 0 12 12" aria-hidden="true">
												<circle
													cx="6"
													cy="6"
													r="4.3"
													fill="none"
													stroke="currentColor"
													stroke-width="1.7"
												/>
											</svg>
											{item.price}
										</span>
									</button>
								{/each}
							</div>
						{:else}
							<div class="shop-empty">{t($locale, 'ui.noStockAvailable')}</div>
						{/if}
					{:else if shop?.sell.length}
						<div data-testid="shop-sell-grid" class="shop-grid">
							{#each shop.sell as item, index (item.itemId)}
								{@const selected = selectedSellItemId === item.itemId}
								<button
									type="button"
									class="shop-tile font-display"
									class:shop-tile-selected={selected}
									class:shop-tile-dimmed={!ready || battleLocked}
									data-focus-id={`shop-sell-${index}`}
									data-focus-row={1 + Math.floor(index / shopGridColumns)}
									data-focus-column={index % shopGridColumns}
									aria-label={item.name}
									onclick={() => selectShopSellItem(item)}
									ondblclick={() => activateShopSellItem(item)}
									onmouseenter={() => showShopSellTooltip(item)}
									onmouseleave={hideShopSellTooltip}
									onfocus={() => showShopSellTooltip(item)}
									onblur={hideShopSellTooltip}
								>
									<img
										src={item.iconPath}
										alt={item.name}
										class="shop-tile-icon"
										loading="lazy"
										draggable="false"
									/>
									<span class="shop-tile-price">
										<svg viewBox="0 0 12 12" aria-hidden="true">
											<circle
												cx="6"
												cy="6"
												r="4.3"
												fill="none"
												stroke="currentColor"
												stroke-width="1.7"
											/>
										</svg>
										{item.price}
									</span>
								</button>
							{/each}
						</div>
					{:else}
						<div class="shop-empty">{t($locale, 'ui.noSellableItems')}</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Selected detail: stat deltas, purse after, action -->
		<aside class="shop-detail" data-testid="shop-detail" aria-label={shopName}>
			{#if activeShopTab === 'buy' && selectedBuyItem}
				{@const affordable = canBuyShopItem(selectedBuyItem)}
				<div class="shop-detail-head">
					<span class="shop-detail-icon-frame">
						<img class="shop-detail-icon" src={selectedBuyItem.iconPath} alt="" draggable="false" />
					</span>
					<div class="min-w-0">
						<p class="shop-detail-name font-display">{selectedBuyItem.name}</p>
						<p class="shop-detail-desc">{selectedBuyItem.description}</p>
					</div>
				</div>
				<div class="shop-detail-chips">
					{#if selectedBuyItem.preview}
						<span class="shop-chip shop-chip-worn font-display">
							{getReplacesText(
								selectedBuyItem.preview.slot,
								selectedBuyItem.preview.replacedItemId
							)}
						</span>
					{/if}
					{#if (selectedBuyItem.owned ?? 0) > 0}
						<span class="shop-chip shop-chip-qty font-display">
							{t($locale, 'ui.shopOwned', { quantity: selectedBuyItem.owned ?? 0 })}
						</span>
					{/if}
					{#if selectedBuyItem.availability.mode === 'finite'}
						<span class="shop-chip shop-chip-qty font-display">
							{getShopBuyStockText(selectedBuyItem)}
						</span>
					{/if}
				</div>
				{#if selectedBuyItem.preview}
					<div class="shop-deltas">
						{#each getDeltaRows(selectedBuyItem.preview.before, selectedBuyItem.preview.after) as row (row.stat)}
							<div class="shop-delta" data-testid={`shop-delta-${row.stat}`}>
								<span class="shop-delta-label font-display">{row.label}</span>
								<span
									class="shop-delta-value font-display"
									class:shop-delta-changed={row.before !== row.after}
								>
									{row.before}
									<span class="shop-delta-arrow" aria-hidden="true">→</span>
									{row.after}
								</span>
							</div>
						{/each}
					</div>
				{/if}
				<div
					class="shop-purse-after"
					data-testid="shop-purse-after"
					class:shop-purse-after-debt={coins - selectedBuyItem.price < 0}
				>
					<span class="heroic-eyebrow">{t($locale, 'ui.shopPurseAfter')}</span>
					<span class="font-display">{coins} → {coins - selectedBuyItem.price}</span>
				</div>
				{@const lastBuyIndex = (shop?.buy.length ?? 1) - 1}
				<!-- Pad/arrow lattice cell: directly below the last stock tile in
				     its column, so the confirm target is always reachable. -->
				<button
					type="button"
					class="shop-detail-action font-display"
					data-focus-id="shop-detail-action"
					data-focus-row={2 + Math.floor(lastBuyIndex / shopGridColumns)}
					data-focus-column={lastBuyIndex % shopGridColumns}
					disabled={!affordable}
					onclick={activateSelected}
				>
					<span>{getActionLabel()}</span>
					<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
				</button>
			{:else if activeShopTab === 'sell' && selectedSellItem}
				<div class="shop-detail-head">
					<span class="shop-detail-icon-frame">
						<img
							class="shop-detail-icon"
							src={selectedSellItem.iconPath}
							alt=""
							draggable="false"
						/>
					</span>
					<div class="min-w-0">
						<p class="shop-detail-name font-display">{selectedSellItem.name}</p>
						<p class="shop-detail-desc">{selectedSellItem.description}</p>
					</div>
				</div>
				<div class="shop-detail-chips">
					{#if selectedSellItem.quantity > 1}
						<span class="shop-chip shop-chip-qty font-display">
							{t($locale, 'ui.quantity', { quantity: selectedSellItem.quantity })}
						</span>
					{/if}
				</div>
				<div class="shop-purse-after" data-testid="shop-purse-after">
					<span class="heroic-eyebrow">{t($locale, 'ui.shopPurseAfter')}</span>
					<span class="font-display">{coins} → {coins + selectedSellItem.price}</span>
				</div>
				{@const lastSellIndex = (shop?.sell.length ?? 1) - 1}
				<button
					type="button"
					class="shop-detail-action font-display"
					data-focus-id="shop-detail-action"
					data-focus-row={2 + Math.floor(lastSellIndex / shopGridColumns)}
					data-focus-column={lastSellIndex % shopGridColumns}
					disabled={!ready || battleLocked}
					onclick={activateSelected}
				>
					<span>{getActionLabel()}</span>
					<PromptGlyph mode={$preferences.promptMode} keys="&#8629;" pad="A" tone="a" />
				</button>
			{:else}
				<p class="shop-detail-hint font-display">{t($locale, 'ui.shopSelectHint')}</p>
			{/if}
		</aside>

		{#if hoveredShopBuyItem}
			<div role="tooltip" class="shop-tooltip">
				<p class="shop-tooltip-name font-display">{hoveredShopBuyItem.name}</p>
				<p class="shop-tooltip-desc">{hoveredShopBuyItem.description}</p>
				<p class="shop-tooltip-meta font-display">
					{t($locale, 'ui.buyFor', { meta: getShopBuyMeta(hoveredShopBuyItem) })}
				</p>
			</div>
		{/if}

		{#if hoveredShopSellItem}
			<div role="tooltip" class="shop-tooltip">
				<p class="shop-tooltip-name font-display">{hoveredShopSellItem.name}</p>
				<p class="shop-tooltip-desc">{hoveredShopSellItem.description}</p>
				<p class="shop-tooltip-meta font-display">
					{t($locale, 'ui.sellFor', { meta: getShopSellMeta(hoveredShopSellItem) })}
				</p>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* Full-bleed Heroic surface (source 04-shop): merchant rail left,
	   stock grid centre, detail column right. */
	.shop-screen {
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

	/* ---- Merchant rail ---------------------------------------------------- */
	.shop-rail {
		display: flex;
		flex: none;
		flex-direction: column;
		justify-content: space-between;
		width: 15.5rem;
		border: 1px dashed color-mix(in srgb, var(--color-gold) 42%, var(--color-frame-strong));
		border-radius: 1rem;
		padding: 1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 20%, transparent)
			),
			var(--color-panel);
	}

	.shop-rail-top {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		gap: 0.85rem;
	}

	.shop-portrait-panel {
		display: flex;
		flex: 1;
		min-height: 0;
		flex-direction: column;
		justify-content: flex-end;
		gap: 0.35rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.875rem;
		padding: 0.8rem;
		background:
			radial-gradient(
				90% 70% at 50% 24%,
				color-mix(in srgb, var(--color-gold) 14%, transparent),
				transparent 70%
			),
			color-mix(in srgb, var(--color-ink) 42%, var(--color-panel-deep));
	}

	.shop-portrait-frame {
		display: flex;
		flex: 1;
		min-height: 0;
		align-items: flex-end;
		justify-content: center;
	}

	.shop-portrait {
		max-height: 100%;
		width: auto;
		max-width: 100%;
		object-fit: contain;
		filter: drop-shadow(0 14px 26px rgba(0, 0, 0, 0.45));
	}

	.shop-merchant-name {
		margin: 0;
		font-size: 1.35rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.shop-quote {
		margin: 0;
		border: 1px solid var(--color-frame);
		border-radius: 0.875rem;
		padding: 0.7rem 0.85rem;
		background: color-mix(in srgb, var(--color-parchment) 5%, transparent);
		color: var(--color-parchment);
		font-size: 0.82rem;
		line-height: 1.45;
	}

	.shop-purse {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.875rem;
		padding: 0.6rem 0.85rem;
		background: color-mix(in srgb, var(--color-parchment) 5%, transparent);
	}

	.shop-purse-value {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-gold);
		font-size: 1.05rem;
		font-weight: 900;
	}
	.shop-purse-value svg {
		width: 0.85rem;
		height: 0.85rem;
	}

	.shop-modes {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.9rem;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.shop-mode {
		display: grid;
		justify-items: center;
		gap: 0.45rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.7rem;
		padding: 0.85rem 0.7rem 0.7rem;
		background: color-mix(in srgb, var(--color-parchment) 6%, transparent);
		color: var(--color-muted);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			border-color 160ms ease,
			background 160ms ease,
			color 160ms ease,
			box-shadow 160ms ease;
	}
	.shop-mode svg {
		width: 1.3rem;
		height: 1.3rem;
	}
	.shop-mode:hover:not(.shop-mode-selected) {
		border-color: var(--color-frame-strong);
		color: var(--color-parchment);
	}

	.shop-mode-selected {
		border-color: rgba(255, 232, 168, 0.9);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		color: #3a2c07;
		box-shadow: 0 0 22px color-mix(in srgb, var(--color-gold) 38%, transparent);
	}

	.shop-rail-close {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		margin-top: 0.75rem;
		border: 0;
		background: transparent;
		padding: 0.3rem;
		color: var(--color-muted);
		font-size: 0.68rem;
		font-weight: 800;
		cursor: pointer;
		transition: color 160ms ease;
	}
	.shop-rail-close:hover {
		color: var(--color-parchment);
	}

	/* ---- Main column ------------------------------------------------------ */
	.shop-main {
		display: flex;
		flex: 1;
		min-width: 0;
		min-height: 0;
		flex-direction: column;
	}

	.shop-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.shop-title {
		margin: 0.35rem 0 0;
		font-size: clamp(1.7rem, 2.6vw, 2.2rem);
		font-weight: 900;
		letter-spacing: 0.01em;
		color: var(--color-parchment);
	}

	.shop-hint {
		margin: 0.4rem 0 0;
		color: var(--color-muted);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.shop-grid-panel {
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

	.shop-grid-scroll {
		min-height: 0;
		padding: 1rem;
		overflow-y: auto;
	}

	.shop-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.85rem;
		align-content: start;
	}

	/* ---- Tiles ------------------------------------------------------------ */
	.shop-tile {
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
			box-shadow 160ms ease,
			opacity 160ms ease;
	}
	.shop-tile:hover {
		border-color: var(--color-frame-strong);
	}

	.shop-tile-selected {
		border-color: rgba(255, 232, 168, 0.9);
		background: linear-gradient(180deg, var(--color-gold-bright), var(--color-gold));
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}

	.shop-tile-dimmed {
		/* Mockup: "Dimmed = can't afford". */
		cursor: default;
		opacity: 0.4;
		filter: saturate(0.4);
	}

	.shop-tile-icon {
		width: 62%;
		height: 62%;
		object-fit: contain;
		filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.35));
		image-rendering: pixelated;
	}

	.shop-tile-price {
		position: absolute;
		right: 0.6rem;
		bottom: 0.5rem;
		left: 0.6rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.32rem;
		color: var(--color-gold);
		font-size: 0.78rem;
		font-weight: 900;
	}
	.shop-tile-price svg {
		width: 0.7rem;
		height: 0.7rem;
	}
	.shop-tile-selected .shop-tile-price {
		color: #3a2c07;
	}

	.shop-empty {
		display: flex;
		min-height: 12rem;
		align-items: center;
		justify-content: center;
		border: 1px dashed rgba(244, 229, 184, 0.2);
		border-radius: 1rem;
		background: rgba(255, 255, 255, 0.04);
		padding: 2rem;
		text-align: center;
		color: var(--color-muted);
		font-size: 0.82rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	/* ---- Detail column ----------------------------------------------------- */
	.shop-detail {
		display: flex;
		flex: none;
		flex-direction: column;
		width: 21.5rem;
		min-height: 0;
		border: 1px solid var(--color-frame);
		border-radius: 1rem;
		padding: 1.1rem;
		background:
			linear-gradient(
				180deg,
				rgba(255, 246, 224, 0.05),
				color-mix(in srgb, var(--color-ink) 20%, transparent)
			),
			var(--color-panel);
		box-shadow: inset 0 1px 0 rgba(255, 246, 224, 0.06);
		overflow-y: auto;
	}

	.shop-detail-head {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		text-align: center;
	}

	.shop-detail-icon-frame {
		display: grid;
		place-items: center;
		width: 8.5rem;
		height: 8.5rem;
		border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent);
		border-radius: 1.1rem;
		/* Mockup: selected item sits on a light parchment plate. */
		background: linear-gradient(180deg, #fff6e0, #f3e3b8);
		box-shadow: 0 0 30px color-mix(in srgb, var(--color-gold) 30%, transparent);
	}

	.shop-detail-icon {
		width: 68%;
		height: 68%;
		object-fit: contain;
		image-rendering: pixelated;
	}

	.shop-detail-name {
		margin: 0.2rem 0 0;
		font-size: 1.05rem;
		font-weight: 900;
		color: var(--color-parchment);
	}

	.shop-detail-desc {
		margin: 0.25rem auto 0;
		max-width: 17rem;
		/* Mockup detail prose uses the default display face, not Spectral. */
		font-family: var(--font-display);
		font-size: 0.78rem;
		color: var(--color-muted);
	}

	.shop-detail-chips {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.45rem;
		margin-top: 0.8rem;
	}

	.shop-chip {
		display: inline-flex;
		align-items: center;
		border-radius: 999px;
		border: 1px solid var(--color-frame-strong);
		padding: 0.22rem 0.65rem;
		font-size: 0.68rem;
		font-weight: 800;
		color: var(--color-parchment);
	}
	.shop-chip-worn {
		border-color: color-mix(in srgb, var(--color-sapphire) 45%, transparent);
		color: var(--color-sapphire);
	}
	.shop-chip-qty {
		color: var(--color-muted);
	}

	.shop-deltas {
		display: grid;
		gap: 0.5rem;
		margin-top: 0.95rem;
	}

	.shop-delta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		/* Mockup stat rows read as open rows: hairline cool border, flat navy. */
		border: 1px solid rgba(169, 200, 255, 0.2);
		border-radius: 0.875rem;
		padding: 0.55rem 0.8rem;
		background: rgba(20, 44, 104, 0.44);
	}

	.shop-delta-label {
		color: var(--color-muted);
		font-size: 0.66rem;
		font-weight: 900;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}

	.shop-delta-value {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		color: var(--color-muted);
		font-size: 0.88rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	.shop-delta-changed {
		color: var(--color-emerald);
	}
	.shop-delta-changed .shop-delta-arrow {
		color: var(--color-emerald);
	}
	.shop-delta-arrow {
		color: var(--color-muted);
	}

	.shop-purse-after {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		margin-top: 0.95rem;
		border: 1px solid var(--color-frame);
		border-radius: 0.7rem;
		padding: 0.5rem 0.8rem;
		background: color-mix(in srgb, var(--color-parchment) 4%, transparent);
		color: var(--color-parchment);
		font-size: 0.88rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
	}

	.shop-purse-after-debt {
		/* Mockup: unaffordable purse-after turns rose. */
		border-color: color-mix(in srgb, var(--color-rose) 55%, transparent);
		background: color-mix(in srgb, var(--color-rose) 16%, transparent);
		color: var(--color-rose);
	}

	.shop-detail-action {
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
	.shop-detail-action:hover:enabled {
		transform: translateY(-1px);
		box-shadow: 0 0 26px color-mix(in srgb, var(--color-gold) 35%, transparent);
	}
	.shop-detail-action:disabled {
		/* Mockup: dark "Not enough" plate with the A prompt still shown. */
		border-color: var(--color-frame-strong);
		background: color-mix(in srgb, var(--color-ink) 55%, var(--color-panel-deep));
		color: var(--color-muted);
		cursor: not-allowed;
	}

	.shop-detail-hint {
		margin: auto 0;
		text-align: center;
		color: var(--color-muted);
		font-size: 0.82rem;
		font-weight: 700;
	}

	/* ---- Tooltip ----------------------------------------------------------- */
	.shop-tooltip {
		position: absolute;
		right: 1.9rem;
		bottom: 1.4rem;
		z-index: 20;
		max-width: 18rem;
		border: 1px solid var(--color-frame-strong);
		border-radius: 0.8rem;
		padding: 0.75rem 0.9rem;
		background: color-mix(in srgb, var(--color-ink) 88%, var(--color-panel-deep));
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
		color: var(--color-parchment);
		pointer-events: none;
	}

	.shop-tooltip-name {
		margin: 0;
		color: var(--color-gold);
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.shop-tooltip-desc {
		margin: 0.35rem 0 0;
		font-size: 0.82rem;
		color: var(--color-parchment);
	}

	.shop-tooltip-meta {
		margin: 0.35rem 0 0;
		color: var(--color-muted);
		font-size: 0.64rem;
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	@media (max-width: 900px) {
		.shop-screen {
			flex-direction: column;
			gap: 1rem;
			overflow-y: auto;
		}

		.shop-rail {
			width: 100%;
		}

		.shop-portrait-panel {
			flex: none;
		}

		.shop-portrait {
			max-height: 14rem;
		}

		.shop-grid-panel,
		.shop-main {
			flex: none;
		}

		.shop-detail {
			width: 100%;
		}
	}

	@media (max-width: 640px) {
		.shop-screen {
			padding: 0.85rem;
		}

		.shop-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
			gap: 0.55rem;
		}
	}
</style>
