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
	import { locale, motionReduced } from '$lib/game/i18n/store';
	import { t } from '$lib/game/i18n/translate';
	import { resetPlaytime, formatPlaytimeSeconds } from '$lib/game/save/playtime';
	import { getAreaName } from '$lib/game/core/area-map';
	import {
		discardUnreadableSaveSlots,
		getNewestSaveSlot,
		loadSaveSlots,
		saveSlotsUnreadable,
		type SaveSlotIndex
	} from '$lib/game/save/slots';
	import type { GameStartRequest } from '$lib/game/phaser/createGame';
	import { hasRenderOptionOverrides } from '$lib/game/phaser/world-render-options';
	import {
		resolveMenuFocusTarget,
		type MenuFocusDirection,
		type MenuFocusNode
	} from '$lib/game/core/menu-focus';
	import {
		diffGamepadSlots,
		setLastInputModality,
		snapshotGamepad,
		type GamepadSnapshot,
		type GamepadUiAction
	} from '$lib/game/core/gamepad';
	import { trapTabFocus } from '$lib/game/ui/focus-trap';
	import { onHudState } from '$lib/game/ui-bridge/events';
	import {
		hudState,
		requestBattleCycleTarget,
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

	const titleSlots = loadSaveSlots();
	const titleSlot = getNewestSaveSlot();
	const titleSaveUnreadable = saveSlotsUnreadable();
	// Only the autosave slot is destroyed by starting a new run — the
	// overwrite confirmation guards exactly that case (review finding 2). An
	// unreadable envelope may still hold a real autosave, so it confirms too.
	const titleHasAutosave = titleSlots.slots[0] !== null || titleSaveUnreadable;
	let titleCanContinue = $state(titleSlot !== null);
	let titleContinueSubtitle = $derived(
		titleSlot
			? `${getAreaName($locale, titleSlot.record.state.mapId)} · ${formatPlaytimeSeconds(titleSlot.record.playtimeSeconds)}`
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

	function requestNewRun() {
		if (titleHasAutosave) {
			newRunConfirmOpen = true;
			void focusNewRunConfirm();
			return;
		}
		startNewRun();
	}

	function confirmNewRun() {
		newRunConfirmOpen = false;
		// Confirming the overwrite is the player's consent to discard an
		// unreadable envelope — unblock writes after one last backup attempt.
		if (titleSaveUnreadable) discardUnreadableSaveSlots();
		startNewRun();
	}

	function cancelNewRun() {
		newRunConfirmOpen = false;
		document.querySelector<HTMLElement>('[data-focus-id="title-new-run"]')?.focus();
	}

	function openLoadPicker() {
		if (loadPickerOpen || mode !== 'title') return;
		loadPickerOpen = true;
		void focusLoadDialog();
	}

	function closeLoadPicker() {
		if (!loadPickerOpen) return;
		loadPickerOpen = false;
		document.querySelector<HTMLElement>('[data-focus-id="title-continue"]')?.focus();
	}

	function pickLoadSlot(index: SaveSlotIndex) {
		const record = loadSaveSlots().slots[index];
		if (!record) return;
		loadPickerOpen = false;
		beginRun({ reason: 'resume', saveState: record.state }, record.playtimeSeconds);
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
	// One restore slot: only one overlay opens at a time, and every opener
	// remembers here (final-review: Quest close + Title-System close dropped
	// focus to body).
	let overlayFocusRestoreTarget: HTMLElement | null = null;
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
	let loadPickerOpen = $state(false);
	let newRunConfirmOpen = $state(false);
	let pauseOwner = $state<OverlayPauseOwner | null>(null);

	const battlePhase = $derived($hudState.battle.phase);
	const battleActive = $derived(battlePhase === 'active');
	const battleLocked = $derived(battlePhase === 'active' || battlePhase === 'summary');
	const battleSummary = $derived($hudState.battle.summary);

	// Arrow keys drive the focus lattice on every open surface, not just the
	// command grid (final-review: overlay coords were keyboard-unreachable).
	// Also the ONE modal guard: when anything here is open, M/Start/Menu never
	// raise a background surface (final-review: save + dialogue were omitted).
	const overlaySurfaceOpen = $derived(
		commandOpen ||
			inventoryOpen ||
			skillOpen ||
			shopOpen ||
			questLogOpen ||
			systemOpen ||
			saveOpen ||
			areaMapOpen ||
			$hudState.dialogue !== null
	);

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
		if (summaryVisible && !battleSummaryWasVisible) {
			// Remember what held focus before the summary took over, so Continue
			// hands it back instead of dropping to <body> (final-review finding 11).
			rememberOverlayFocus();
			void focusBattleSummaryDialog();
		} else if (!summaryVisible && battleSummaryWasVisible) {
			void restoreOverlayFocus();
		}
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
		// Start / the Menu button must not raise the grid behind an open
		// overlay or dialogue (final review); closing stays the toggle's job.
		if (overlaySurfaceOpen) return;
		commandOpen = true;
		pauseForOverlay('settings');
	}

	function closeCommand() {
		if (!commandOpen) return;
		commandOpen = false;
		resumeForOverlay('settings');
		// Escape/pad-cancel unmounts the grid under the user's focus; the menu
		// button is the grid's anchor (final-review finding 6).
		menuButton?.focus();
	}

	function openInventory(initialTab: 'potions' | 'gear' = 'potions') {
		if (inventoryOpen || battleLocked) return;
		inventoryInitialTab = initialTab;
		rememberOverlayFocus();
		commandOpen = false;
		inventoryOpen = true;
		pauseForOverlay('inventory');
		void focusInventoryDialog();
	}

	function closeInventory() {
		if (!inventoryOpen) return;
		inventoryOpen = false;
		resumeForOverlay('inventory');
		void restoreOverlayFocus();
	}

	function rememberOverlayFocus() {
		const active = document.activeElement;
		overlayFocusRestoreTarget =
			active instanceof HTMLElement && active !== document.body ? active : null;
	}

	async function restoreOverlayFocus() {
		const restoreTarget = overlayFocusRestoreTarget;
		overlayFocusRestoreTarget = null;
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

	function closeShop() {
		if (!shopOpen) return;
		shopOpen = false;
		requestCloseShop();
		resumeForOverlay('shop');
		void restoreOverlayFocus();
	}

	function openQuestLog() {
		if (questLogOpen || battleLocked) return;
		rememberOverlayFocus();
		commandOpen = false;
		questLogOpen = true;
		pauseForOverlay('questLog');
		void focusQuestLogDialog();
	}

	function closeQuestLog() {
		if (!questLogOpen) return;
		questLogOpen = false;
		resumeForOverlay('questLog');
		void restoreOverlayFocus();
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
		rememberOverlayFocus();
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
		}
		// Title mode restores to the opening Title card; playing mode falls
		// back to the menu button when the opener sat in the command grid.
		void restoreOverlayFocus();
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
	 *  controls stay in the geometry — resolveMenuFocusTarget skips them. The
	 *  grid scopes to the topmost open surface so pad directions never wander
	 *  from an overlay onto controls behind it. */
	function collectMenuFocusNodes(): MenuFocusNode[] {
		const surface: ParentNode =
			document.querySelector<HTMLElement>('.jrpg-dialogue-panel') ??
			battleSummaryDialog ??
			loadDialog ??
			systemDialog ??
			saveDialog ??
			shopDialog ??
			questLogDialog ??
			areaMapDialog ??
			inventoryDialog ??
			skillDialog ??
			document;
		const scope: ParentNode =
			Array.from(surface.querySelectorAll<HTMLElement>('[aria-modal="true"]')).at(-1) ?? surface;
		return Array.from(scope.querySelectorAll<HTMLElement>('[data-focus-id]'))
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
		// Title cards carry the same lattice; without this the pad roves Title
		// but keyboard arrows fall dead (final-review finding 5).
		if (!overlaySurfaceOpen && mode !== 'title') return false;
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
		if (isEditableTarget(event.target)) return false;

		// Dialogue owns arrows — held-key repeats included. Phaser reads raw
		// window keydowns, so an un-prevented repeat registers as movement
		// input and walks the hero mid-conversation. Only the first press
		// moves the selection; repeats stay swallowed.
		if ($hudState.dialogue) {
			if (!event.repeat) {
				const choicesRevealed =
					$hudState.dialogue.mode === 'choice' &&
					document.querySelector('.jrpg-dialogue-choice:not([disabled])') !== null;
				if (choicesRevealed) moveMenuFocus(direction);
			}
			event.preventDefault();
			return true;
		}

		if (event.repeat) return false;
		if (!moveMenuFocus(direction)) return false;
		event.preventDefault();
		return true;
	}

	/** Shared by keyboard arrows and the pad layer: move DOM focus along the
	 *  visible focus-node grid. Returns whether a node grid was present. */
	function moveMenuFocus(direction: MenuFocusDirection): boolean {
		const nodes = collectMenuFocusNodes();
		if (nodes.length === 0) return false;

		const currentId =
			document.activeElement instanceof Element
				? (document.activeElement.getAttribute('data-focus-id') ?? null)
				: null;
		const nextId = resolveMenuFocusTarget(nodes, currentId, direction);
		if (!nextId || nextId === currentId) return true;
		document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(nextId)}"]`)?.focus();
		return true;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		setLastInputModality('keys');

		if (handleMenuArrowKeys(event)) return;

		if (event.key === 'Escape' && commandOpen) {
			event.preventDefault();
			closeCommand();
			return;
		}

		if (event.key !== 'm' && event.key !== 'M') return;
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		if (event.repeat) return;
		if (isEditableTarget(event.target)) return;

		if (areaMapOpen) {
			event.preventDefault();
			closeAreaMap();
			return;
		}

		// Same coherent modal guard as Start/Menu: M never raises the map under
		// any open surface — save and dialogue included (final review). Closing
		// the already-open map stays handled above.
		if (overlaySurfaceOpen || battleLocked || !$hudState.ready) return;

		event.preventDefault();
		openAreaMap();
	}

	// ---- Pad layer: the ONE rAF poll loop (scenes stay pad-free) ----------

	// Polls in both modes: the Title screen and every overlay are pad-first
	// surfaces too (directional focus + confirm/cancel).
	$effect(() => {
		let previous: GamepadSnapshot[] = [];
		let frame = requestAnimationFrame(function poll() {
			const pads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
			// Every connected slot drives the UI — an idle pad must not mask an
			// active one (final review), and sparse slots still work. Per-slot
			// edges merge deduped per frame (D-pad+stick duplicates included).
			const snapshots = Array.from(pads, snapshotGamepad);
			for (const action of diffGamepadSlots(previous, snapshots)) handlePadUiAction(action);
			previous = snapshots;
			frame = requestAnimationFrame(poll);
		});
		return () => cancelAnimationFrame(frame);
	});

	function handlePadUiAction(action: GamepadUiAction) {
		setLastInputModality('pad');
		switch (action) {
			case 'up':
			case 'down':
			case 'left':
			case 'right':
				handlePadDirection(action);
				break;
			case 'confirm':
				handlePadConfirm();
				break;
			case 'cancel':
				handlePadCancel();
				break;
			case 'action':
				// X mirrors the Item battle tile glyph; unused outside battle.
				if (battleActive) clickBattleTile('battle-tile-item');
				break;
			case 'tab-left':
				cyclePadTabs(-1);
				break;
			case 'tab-right':
				cyclePadTabs(1);
				break;
			case 'menu':
				if (mode === 'playing' && !battleLocked) {
					if (commandOpen) closeCommand();
					else openCommand();
				}
				break;
		}
	}

	function handlePadDirection(action: MenuFocusDirection) {
		if (battleActive) {
			// Mirrors the enemy-plate click: left/right cycle the target.
			if (action === 'left') requestBattleCycleTarget(-1);
			else if (action === 'right') requestBattleCycleTarget(1);
			return;
		}
		moveMenuFocus(action);
	}

	function clickBattleTile(testId: string) {
		document.querySelector<HTMLButtonElement>(`[data-testid="${testId}"]`)?.click();
	}

	function handlePadConfirm() {
		if ($hudState.dialogue) {
			const choice = document.querySelector<HTMLButtonElement>(
				'.jrpg-dialogue-choice[data-selected="true"]:not([disabled])'
			);
			if (choice) {
				choice.click();
				return;
			}
			// Next/reveal shares the panel's own confirm path.
			document.querySelector<HTMLButtonElement>('.jrpg-dialogue-action')?.click();
			return;
		}
		if (battleActive) {
			clickBattleTile('battle-tile-heal');
			return;
		}
		// Focusable SVG nodes (map markers) have no click action; only real
		// HTML controls are confirmable.
		const target = document.activeElement;
		if (target instanceof HTMLElement) target.click();
	}

	function handlePadCancel() {
		const dialogue = $hudState.dialogue;
		if (dialogue) {
			if (dialogue.canClose) requestDialogueClose();
			return;
		}
		if (battleActive) {
			clickBattleTile('battle-tile-flee');
			return;
		}
		if (battleSummary) return;
		if (newRunConfirmOpen) return cancelNewRun();
		if (loadPickerOpen) return closeLoadPicker();
		if (commandOpen) return closeCommand();
		if (inventoryOpen) return closeInventory();
		if (shopOpen) return closeShop();
		if (questLogOpen) return closeQuestLog();
		if (areaMapOpen) return closeAreaMap();
		if (saveOpen) {
			const overwriteBack = saveDialog?.querySelector<HTMLElement>(
				'[role="alertdialog"] [data-focus-id="save-overwrite-cancel"]'
			);
			if (overwriteBack) return overwriteBack.click();
			return closeSave();
		}
		if (skillOpen) return closeSkill();
		if (systemOpen) return closeSystem();
	}

	/** LB/RB: cycle the active surface's tab rail (bag categories, shop
	 *  buy/sell, system rail) — focus + activate, wrapping at the ends. */
	function cyclePadTabs(step: -1 | 1) {
		const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]')).filter(
			(tab) =>
				tab.getClientRects().length > 0 && !(tab instanceof HTMLButtonElement && tab.disabled)
		);
		if (tabs.length === 0) return;

		const selectedIndex = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
		const focusedIndex = tabs.indexOf(document.activeElement as HTMLElement);
		const from = selectedIndex >= 0 ? selectedIndex : focusedIndex >= 0 ? focusedIndex : 0;
		const target = tabs[(from + step + tabs.length) % tabs.length];
		target.focus();
		if (target instanceof HTMLButtonElement) target.click();
	}

	$effect(() => {
		if (!$hudState.shop || shopOpen) return;

		rememberOverlayFocus();
		commandOpen = false;
		inventoryOpen = false;
		shopOpen = true;
		pauseForOverlay('shop');
		void focusShopDialog();
	});

	// ---- Reduced motion: saved preference OR OS floor, applied shell-wide --
	// Shared derivation lives in i18n/store (`motionReduced`).

	function dismissBattleSummary() {
		requestDismissBattleSummary();
	}

	function unequipSlot(slot: EquipmentSlot) {
		if (!$hudState.ready || battleLocked) return;
		requestUnequipSlot(slot);
	}

	async function focusInventoryDialog() {
		await tick();
		(inventoryCloseButton ?? inventoryDialog)?.focus();
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
	let loadDialog = $state<HTMLDivElement>();
	let loadCloseButton = $state<HTMLButtonElement>();
	let newRunConfirmDialog = $state<HTMLDivElement>();
	let newRunConfirmButton = $state<HTMLButtonElement>();

	async function focusLoadDialog() {
		await tick();
		// Primary action first: land on the first occupied slot, not Back.
		(
			loadDialog?.querySelector<HTMLElement>('[data-focus-id^="save-slot-"]:not([disabled])') ??
			loadCloseButton ??
			loadDialog
		)?.focus();
	}

	async function focusNewRunConfirm() {
		await tick();
		(newRunConfirmButton ?? newRunConfirmDialog)?.focus();
	}

	function handleLoadDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeLoadPicker();
			return;
		}
		trapTabFocus(event, loadDialog);
	}

	function handleNewRunConfirmKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			event.stopPropagation();
			cancelNewRun();
			return;
		}
		trapTabFocus(event, newRunConfirmDialog);
	}

	async function focusSaveDialog() {
		await tick();
		// Primary action first: pad confirm must activate the A-labelled slot
		// card, not the B-labelled Back control.
		(
			saveDialog?.querySelector<HTMLElement>('[data-focus-id^="save-slot-"]') ??
			saveCloseButton ??
			saveDialog
		)?.focus();
	}

	async function focusBattleSummaryDialog() {
		await tick();
		(battleSummaryContinueButton ?? battleSummaryDialog)?.focus();
	}

	async function restoreAreaMapFocus() {
		await tick();
		menuButton?.focus();
	}

	function handleInventoryDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeInventory();
			return;
		}
		trapTabFocus(event, inventoryDialog);
	}

	function handleShopDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeShop();
			return;
		}
		trapTabFocus(event, shopDialog);
	}

	function handleAreaMapDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeAreaMap();
			return;
		}
		trapTabFocus(event, areaMapDialog);
	}

	function handleSystemDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSystem();
			return;
		}
		trapTabFocus(event, systemDialog);
	}

	function handleSkillDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSkill();
			return;
		}
		trapTabFocus(event, skillDialog);
	}

	function handleSaveDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeSave();
			return;
		}
		trapTabFocus(event, saveDialog);
	}

	function handleBattleSummaryDialogKeydown(event: KeyboardEvent) {
		trapTabFocus(event, battleSummaryDialog);
	}

	function handleQuestLogDialogKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			closeQuestLog();
			return;
		}
		trapTabFocus(event, questLogDialog);
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
	class="game-shell relative h-screen w-screen bg-ink font-body text-parchment"
	class:heroic-motion-reduced={$motionReduced}
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
			onContinue={openLoadPicker}
			onNewRun={requestNewRun}
			onSystem={openSystem}
		/>
		{#if newRunConfirmOpen}
			<!-- Scrim blocks pointer input to the title cards behind the prompt. -->
			<div class="title-confirm-scrim" aria-hidden="true"></div>
			<div
				class="title-newrun-confirm"
				role="alertdialog"
				aria-modal="true"
				aria-label={t($locale, 'ui.titleNewRunConfirm')}
				bind:this={newRunConfirmDialog}
				tabindex="-1"
				onkeydown={handleNewRunConfirmKeydown}
			>
				<p class="font-display">{t($locale, 'ui.titleNewRunConfirm')}</p>
				<button
					type="button"
					class="heroic-segment"
					data-focus-id="title-newrun-cancel"
					data-focus-row={0}
					data-focus-column={0}
					onclick={cancelNewRun}
				>
					{t($locale, 'ui.back')}
				</button>
				<button
					type="button"
					class="heroic-segment heroic-segment-selected"
					data-testid="confirm-new-run"
					data-focus-id="title-newrun-confirm"
					data-focus-row={0}
					data-focus-column={1}
					bind:this={newRunConfirmButton}
					onclick={confirmNewRun}
				>
					{t($locale, 'ui.titleNewRun')}
				</button>
			</div>
		{/if}
	{:else}
		<div
			bind:this={mountNode}
			class="game-stage absolute inset-0 overflow-hidden bg-[#090d1f]"
		></div>

		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(130,180,255,0.18),transparent_38%),linear-gradient(180deg,rgba(7,10,26,0.1),rgba(4,6,18,0.58)_85%,rgba(3,4,10,0.82))]"
		></div>

		{#if !battleLocked && !$hudState.dialogue}
			<div class="jrpg-menu-anchor pointer-events-auto">
				<button
					bind:this={menuButton}
					type="button"
					class="heroic-chip-button jrpg-command-toggle"
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
				class="absolute inset-0 z-10 bg-black/20"
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

	<SaveScreen
		mode="load"
		open={loadPickerOpen}
		hudStatus=""
		bind:dialog={loadDialog}
		bind:closeButton={loadCloseButton}
		onClose={closeLoadPicker}
		onPickSlot={pickLoadSlot}
		onkeydown={handleLoadDialogKeydown}
	/>

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
	.game-shell {
		/* Hardening: the shell is a backdrop, never a scroll surface. Plain
		   `hidden` first so engines without `clip` (Safari/WKWebView < 16)
		   keep a fallback instead of dropping the declaration. */
		overflow: hidden;
		overflow: clip;
	}

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
		/* Mockup parity: Menu lives in the dialogue bar, so the toggle reveals
		   only on keyboard focus / hover on desktop. It stays in the DOM —
		   focus restoration and e2e/unit hooks click it regardless. */
		opacity: 0;
		transition: opacity 160ms ease;
	}

	.jrpg-command-toggle:focus-visible,
	.jrpg-command-toggle:hover {
		opacity: 1;
	}

	/* New-run overwrite confirm: same treatment as the save screen's
	   overwrite alertdialog, scoped to the title surface. */
	.title-confirm-scrim {
		position: absolute;
		inset: 0;
		z-index: 55;
		background: rgba(5, 8, 20, 0.55);
	}

	.title-newrun-confirm {
		position: absolute;
		left: 50%;
		bottom: 24vh;
		z-index: 56;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.7rem;
		transform: translateX(-50%);
		border: 1px solid rgba(255, 232, 168, 0.4);
		border-radius: 0.7rem;
		background: rgba(10, 15, 34, 0.92);
		padding: 0.6rem 0.8rem;
	}

	.title-newrun-confirm p {
		margin: 0 auto 0 0;
		color: var(--color-parchment);
		font-size: 0.85rem;
		font-weight: 800;
	}

	@media (max-width: 720px) {
		.jrpg-menu-anchor {
			top: 0.75rem;
			right: 0.75rem;
		}

		.jrpg-command-toggle {
			padding: 0.6rem 0.72rem;
			/* No mockup exists for small screens: keep the toggle visible so
			   touch players retain menu access. */
			opacity: 1;
		}
	}
</style>
