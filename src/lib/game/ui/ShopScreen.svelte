<script lang="ts">
	import { tick } from 'svelte';
	import { locale } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
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
		status: string;
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
		status,
		dialog = $bindable(),
		closeButton = $bindable(),
		onClose,
		onBuy,
		onSell,
		onkeydown
	}: Props = $props();

	const shopTabs: ShopTab[] = ['buy', 'sell'];

	let activeShopTab = $state<ShopTab>('buy');
	let hoveredShopBuyItem = $state<HudShopBuyEntry | null>(null);
	let hoveredShopSellItem = $state<HudShopSellEntry | null>(null);

	$effect(() => {
		if (open) return;
		activeShopTab = 'buy';
		hoveredShopBuyItem = null;
		hoveredShopSellItem = null;
	});

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

	function getShopTabLabel(tab: ShopTab): string {
		return tab === 'buy' ? t($locale, 'ui.buy') : t($locale, 'ui.sell');
	}

	function getItemKindLabel(kind: HudShopBuyEntry['kind'] | HudShopSellEntry['kind']): string {
		return kind === 'consumable'
			? t($locale, 'ui.itemKinds.consumable')
			: t($locale, 'ui.itemKinds.equipment');
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

	function activateShopBuyItem(item: HudShopBuyEntry) {
		if (!canBuyShopItem(item) || !shop) return;
		onBuy(shop.shopId, item.stockId);
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
		if (!ready || battleLocked) return;
		onSell(item.itemId);
	}
</script>

{#if open}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div class="absolute inset-0 cursor-default" role="presentation" onclick={onClose}></div>
		<div
			bind:this={dialog}
			class="glass-panel-strong arcane-window-enter jrpg-window jrpg-window-narrow"
			aria-labelledby="shop-heading"
			aria-modal="true"
			role="dialog"
			tabindex="-1"
			{onkeydown}
		>
			<div>
				<div class="jrpg-window-header">
					<div>
						<p class="jrpg-label">
							{shop?.merchantName ?? nearbyShop?.merchantName ?? t($locale, 'ui.merchant')}
						</p>
						<h2 id="shop-heading" class="jrpg-window-title font-display">
							{shop?.name ?? nearbyShop?.name ?? t($locale, 'ui.shop')}
						</h2>
						<p class="mt-2 text-sm font-black tracking-[0.08em] text-gold">
							{t($locale, 'ui.coins', { coins: coins })}
						</p>
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
					class="jrpg-tab-list jrpg-tab-list-two px-4 pb-4"
					role="tablist"
					aria-label={t($locale, 'ui.shopSections')}
				>
					<button
						id="shop-buy-tab"
						type="button"
						role="tab"
						class={`glass-button jrpg-tab ${activeShopTab === 'buy' ? 'jrpg-tab-active' : ''}`}
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
						class={`glass-button jrpg-tab ${activeShopTab === 'sell' ? 'jrpg-tab-active' : ''}`}
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
					class="mx-4 mt-4 mb-4 rounded-[1.1rem] border border-frame bg-white/6 px-4 py-3 text-sm text-parchment/82"
				>
					<p>{status}</p>
				</div>
			</div>

			<div
				id="shop-tab-panel"
				class="jrpg-window-body"
				role="tabpanel"
				aria-labelledby={`shop-${activeShopTab}-tab`}
			>
				{#if activeShopTab === 'buy'}
					{#if shop?.buy.length}
						<div data-testid="shop-buy-grid" class="jrpg-slot-grid">
							{#each shop.buy as item (item.stockId)}
								<article
									class={`group jeweled-cell jeweled-cell-amber relative flex aspect-square min-h-0 flex-col justify-center overflow-hidden p-2.5 transition sm:p-3 ${
										canBuyShopItem(item)
											? 'jeweled-cell-action cursor-pointer'
											: 'cursor-not-allowed opacity-48'
									}`}
									aria-label={item.name}
									ondblclick={() => activateShopBuyItem(item)}
									onmouseenter={() => showShopBuyTooltip(item)}
									onmouseleave={hideShopBuyTooltip}
								>
									<span
										class="absolute top-2 right-2 z-10 shrink-0 rounded-full border border-gold/18 bg-gold/12 px-1.5 py-0.5 text-[0.54rem] font-black tracking-[0.12em] text-gold uppercase"
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
										class="absolute right-2 bottom-2 left-2 rounded-full border border-gold/16 bg-gold/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.16em] text-amber/78 uppercase"
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
				{:else if shop?.sell.length}
					<div data-testid="shop-sell-grid" class="jrpg-slot-grid">
						{#each shop.sell as item (item.itemId)}
							<article
								class="group jeweled-cell jeweled-cell-emerald jeweled-cell-action relative flex aspect-square min-h-0 cursor-pointer flex-col justify-center overflow-hidden p-2.5 transition sm:p-3"
								aria-label={item.name}
								ondblclick={() => activateShopSellItem(item)}
								onmouseenter={() => showShopSellTooltip(item)}
								onmouseleave={hideShopSellTooltip}
							>
								<span
									class="absolute top-2 right-2 z-10 shrink-0 rounded-full border border-emerald/18 bg-emerald/12 px-1.5 py-0.5 text-[0.54rem] font-black tracking-[0.12em] text-emerald uppercase"
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
									class="absolute right-2 bottom-2 left-2 rounded-full border border-emerald/16 bg-emerald/10 px-2 py-1 text-center text-[0.52rem] font-black tracking-[0.16em] text-emerald/78 uppercase"
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
					<div role="tooltip" class="glass-panel-strong jrpg-tooltip">
						<p class="text-[0.68rem] font-black tracking-[0.2em] text-gold/90 uppercase">
							{hoveredShopBuyItem.name}
						</p>
						<p class="mt-1 text-parchment/88">{hoveredShopBuyItem.description}</p>
						<p class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-muted uppercase">
							{t($locale, 'ui.buyFor', { meta: getShopBuyMeta(hoveredShopBuyItem) })}
						</p>
					</div>
				{/if}

				{#if hoveredShopSellItem}
					<div role="tooltip" class="glass-panel-strong jrpg-tooltip">
						<p class="text-[0.68rem] font-black tracking-[0.2em] text-emerald/90 uppercase">
							{hoveredShopSellItem.name}
						</p>
						<p class="mt-1 text-parchment/88">{hoveredShopSellItem.description}</p>
						<p class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-muted uppercase">
							{t($locale, 'ui.sellFor', { meta: getShopSellMeta(hoveredShopSellItem) })}
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

	.jrpg-tab-list {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.85rem;
	}

	.jrpg-tab-list-two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
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

	.jrpg-slot-grid {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.65rem;
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

	.jrpg-empty-state {
		display: flex;
		min-height: 12rem;
		align-items: center;
		justify-content: center;
		border: 1px dashed rgba(244, 229, 184, 0.2);
		border-radius: var(--radius-arcane);
		background: rgba(255, 255, 255, 0.04);
		padding: 2rem;
		text-align: center;
		color: var(--color-muted);
		font-size: 0.82rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
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
	}
</style>
