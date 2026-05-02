<script lang="ts">
	import { onMount, tick } from 'svelte';
	import {
		hudState,
		requestEquipItem,
		requestHeal,
		requestPauseGame,
		requestResume,
		requestResumeGame,
		requestSave,
		requestUnequipSlot,
		requestUseItem
	} from '$lib/game/ui-bridge/store';
	import type { EquipmentSlot } from '$lib/game/content/items';

	type InventoryTab = 'consumables' | 'equipment' | 'keyItems';
	type OverlayPauseOwner = 'settings' | 'inventory';

	let mountNode: HTMLDivElement | undefined;
	let menuButton = $state<HTMLButtonElement>();
	let inventoryDialog = $state<HTMLDivElement>();
	let inventoryCloseButton = $state<HTMLButtonElement>();
	let inventoryFocusRestoreTarget: HTMLElement | null = null;
	let loadError = $state('');
	let settingsOpen = $state(false);
	let inventoryOpen = $state(false);
	let activeInventoryTab = $state<InventoryTab>('consumables');
	let pauseOwner = $state<OverlayPauseOwner | null>(null);

	const equipmentSlots: { slot: EquipmentSlot; label: string }[] = [
		{ slot: 'weapon', label: 'Weapon' },
		{ slot: 'head', label: 'Head' },
		{ slot: 'body', label: 'Body' },
		{ slot: 'hands', label: 'Hands' },
		{ slot: 'accessory', label: 'Accessory' }
	];
	const inventoryTabs: InventoryTab[] = ['consumables', 'equipment', 'keyItems'];

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
		resumeForOverlay('inventory');
		void restoreInventoryFocus();
	}

	function releaseOverlayPause() {
		const owner = pauseOwner;
		settingsOpen = false;
		inventoryOpen = false;
		pauseOwner = null;

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

	async function focusInventoryTab(tab: InventoryTab) {
		activeInventoryTab = tab;
		await tick();
		document.getElementById(`inventory-${tab}-tab`)?.focus();
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

	<div class="pointer-events-auto absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
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

	<section class="pointer-events-none absolute bottom-4 left-4 z-20 sm:bottom-6 sm:left-6">
		<div
			class="w-[min(25rem,calc(100vw-2rem))] rounded-[1.5rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,16,40,0.92),rgba(14,12,36,0.84)_55%,rgba(20,32,72,0.8))] px-4 py-3 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur-md"
		>
			<div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2">
				<div
					class="flex h-14 w-14 flex-col items-center justify-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
				>
					<span class="text-[0.58rem] font-black tracking-[0.28em] text-fuchsia-100/70 uppercase">
						LV
					</span>
					<span class="mt-1 text-xl font-black text-white">{$hudState.level}</span>
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
			class="pointer-events-auto absolute top-20 right-4 z-40 w-[min(19rem,calc(100vw-2rem))] translate-y-0 rounded-[1.6rem] border border-white/12 bg-[linear-gradient(145deg,rgba(10,16,40,0.96),rgba(16,14,44,0.94))] p-4 text-slate-50 opacity-100 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-200 sm:top-24 sm:right-6"
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
				class="relative z-10 grid max-h-[calc(100vh-1.5rem)] w-[min(70rem,calc(100vw-1.5rem))] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[1.8rem] border border-white/12 bg-[linear-gradient(145deg,rgba(8,13,34,0.98),rgba(16,14,42,0.96)_54%,rgba(13,32,52,0.94))] text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md sm:max-h-[calc(100vh-3rem)] sm:rounded-[2rem]"
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
							onclick={() => (activeInventoryTab = 'consumables')}
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
							onclick={() => (activeInventoryTab = 'equipment')}
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
							onclick={() => (activeInventoryTab = 'keyItems')}
							onkeydown={(event) => handleInventoryTabKeydown(event, 'keyItems')}
						>
							Key Items
						</button>
					</div>
				</div>

				<div
					class="grid min-h-0 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden lg:p-6"
				>
					<div class="min-h-0 overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/6">
						<div
							id="inventory-tab-panel"
							class="max-h-[48vh] overflow-y-auto p-3 sm:max-h-[54vh] sm:p-4 lg:h-full lg:max-h-none"
							role="tabpanel"
							aria-labelledby={`inventory-${activeInventoryTab}-tab`}
						>
							{#if activeInventoryTab === 'consumables'}
								{#if $hudState.inventory.consumables.length}
									<div class="grid gap-3">
										{#each $hudState.inventory.consumables as item (item.itemId)}
											<article
												class="grid gap-3 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
											>
												<div>
													<div class="flex flex-wrap items-center gap-2">
														<h3 class="text-lg font-black tracking-[0.08em] text-white uppercase">
															{item.name}
														</h3>
														<span
															class="rounded-full border border-emerald-100/18 bg-emerald-100/10 px-2 py-1 text-[0.58rem] font-black tracking-[0.2em] text-emerald-50/84 uppercase"
														>
															x{item.quantity}
														</span>
													</div>
													<p class="mt-2 text-sm leading-5 text-slate-200/76">{item.description}</p>
												</div>
												<button
													type="button"
													class="rounded-full border border-emerald-200/24 bg-emerald-200/12 px-4 py-2 text-[0.68rem] font-black tracking-[0.24em] text-emerald-50 uppercase transition hover:-translate-y-0.5 hover:border-emerald-200/50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
													onclick={() => requestUseItem(item.itemId)}
													disabled={!$hudState.ready}
												>
													Use
												</button>
											</article>
										{/each}
									</div>
								{:else}
									<div
										class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
									>
										No consumables carried.
									</div>
								{/if}
							{:else if activeInventoryTab === 'equipment'}
								{#if $hudState.inventory.equipment.length}
									<div class="grid gap-3">
										{#each $hudState.inventory.equipment as item (item.itemId)}
											<article
												class="grid gap-3 rounded-[1.1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
											>
												<div>
													<div class="flex flex-wrap items-center gap-2">
														<h3 class="text-lg font-black tracking-[0.08em] text-white uppercase">
															{item.name}
														</h3>
														<span
															class="rounded-full border border-cyan-100/18 bg-cyan-100/10 px-2 py-1 text-[0.58rem] font-black tracking-[0.2em] text-cyan-50/84 uppercase"
														>
															{item.slot}
														</span>
													</div>
													<p class="mt-2 text-sm leading-5 text-slate-200/76">{item.description}</p>
												</div>
												<button
													type="button"
													class="rounded-full border border-cyan-200/24 bg-cyan-200/12 px-4 py-2 text-[0.68rem] font-black tracking-[0.24em] text-cyan-50 uppercase transition hover:-translate-y-0.5 hover:border-cyan-200/50 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-40"
													onclick={() => requestEquipItem(item.itemId)}
													disabled={!$hudState.ready || item.equipped}
												>
													{item.equipped ? 'Equipped' : 'Equip'}
												</button>
											</article>
										{/each}
									</div>
								{:else}
									<div
										class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
									>
										No equipment found.
									</div>
								{/if}
							{:else if $hudState.inventory.keyItems.length}
								<div class="grid gap-3">
									{#each $hudState.inventory.keyItems as item (item.itemId)}
										<article
											class="rounded-[1.1rem] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.035))] p-4"
										>
											<div class="flex flex-wrap items-center gap-2">
												<h3 class="text-lg font-black tracking-[0.08em] text-white uppercase">
													{item.name}
												</h3>
												{#if item.quantity > 1}
													<span
														class="rounded-full border border-amber-100/18 bg-amber-100/10 px-2 py-1 text-[0.58rem] font-black tracking-[0.2em] text-amber-50/84 uppercase"
													>
														x{item.quantity}
													</span>
												{/if}
											</div>
											<p class="mt-2 text-sm leading-5 text-slate-200/76">{item.description}</p>
										</article>
									{/each}
								</div>
							{:else}
								<div
									class="flex min-h-48 items-center justify-center rounded-[1.1rem] border border-dashed border-white/14 bg-white/5 px-6 py-10 text-center text-sm font-bold tracking-[0.2em] text-slate-300/62 uppercase"
								>
									No key items acquired.
								</div>
							{/if}
						</div>
					</div>

					<aside class="grid gap-4 lg:min-h-0 lg:grid-rows-[auto_minmax(0,1fr)]">
						<div class="rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
							<p class="text-[0.62rem] font-black tracking-[0.28em] text-cyan-100/64 uppercase">
								Stats
							</p>
							<div class="mt-3 grid grid-cols-3 gap-2">
								<div
									class="rounded-2xl border border-rose-100/12 bg-rose-100/8 px-3 py-3 text-center"
								>
									<p class="text-[0.58rem] font-black tracking-[0.22em] text-rose-50/64 uppercase">
										HP
									</p>
									<p class="mt-1 text-lg font-black text-white">{$hudState.hp}/{$hudState.maxHp}</p>
								</div>
								<div
									class="rounded-2xl border border-cyan-100/12 bg-cyan-100/8 px-3 py-3 text-center"
								>
									<p class="text-[0.58rem] font-black tracking-[0.22em] text-cyan-50/64 uppercase">
										ATK
									</p>
									<p class="mt-1 text-lg font-black text-white">{$hudState.attack}</p>
								</div>
								<div
									class="rounded-2xl border border-emerald-100/12 bg-emerald-100/8 px-3 py-3 text-center"
								>
									<p
										class="text-[0.58rem] font-black tracking-[0.22em] text-emerald-50/64 uppercase"
									>
										DEF
									</p>
									<p class="mt-1 text-lg font-black text-white">{$hudState.defense}</p>
								</div>
							</div>
						</div>

						<div class="min-h-0 rounded-[1.35rem] border border-white/10 bg-white/6 p-4">
							<p class="text-[0.62rem] font-black tracking-[0.28em] text-cyan-100/64 uppercase">
								Equipped
							</p>
							<div class="mt-3 grid gap-2 lg:max-h-full lg:overflow-y-auto">
								{#each equipmentSlots as entry}
									{@const equippedItemId = $hudState.inventory.equipped[entry.slot]}
									{@const equippedItem = $hudState.inventory.equipment.find(
										(item) => item.itemId === equippedItemId
									)}
									<div
										class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-black/12 px-3 py-3"
									>
										<div class="min-w-0">
											<p
												class="text-[0.58rem] font-black tracking-[0.24em] text-slate-300/62 uppercase"
											>
												{entry.label}
											</p>
											<p
												class="mt-1 truncate text-sm font-black tracking-[0.08em] text-white uppercase"
											>
												{equippedItem?.name ?? 'Empty'}
											</p>
										</div>
										{#if equippedItemId}
											<button
												type="button"
												class="rounded-full border border-rose-200/20 bg-rose-200/10 px-3 py-2 text-[0.58rem] font-black tracking-[0.2em] text-rose-50 uppercase transition hover:border-rose-200/45 disabled:cursor-not-allowed disabled:opacity-40"
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
</style>
