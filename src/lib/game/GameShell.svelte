<script lang="ts">
	import { onMount, tick } from 'svelte';
	import DialoguePanel from '$lib/game/DialoguePanel.svelte';
	import AreaMapScreen from '$lib/game/ui/AreaMapScreen.svelte';
	import BagScreen from '$lib/game/ui/BagScreen.svelte';
	import BattleHud from '$lib/game/ui/BattleHud.svelte';
	import BattleSummary from '$lib/game/ui/BattleSummary.svelte';
	import {
		FIELD_COMMAND_FOCUS_ID_PREFIX,
		fieldCommandFocusId,
		type FieldCommand
	} from '$lib/game/ui/CommandGrid.svelte';
	import FieldHud from '$lib/game/ui/FieldHud.svelte';
	import PromptGlyph from '$lib/game/ui/PromptGlyph.svelte';
	import QuestJournal from '$lib/game/ui/QuestJournal.svelte';
	import SaveScreen from '$lib/game/ui/SaveScreen.svelte';
	import ShopScreen from '$lib/game/ui/ShopScreen.svelte';
	import SkillScreen from '$lib/game/ui/SkillScreen.svelte';
	import SystemScreen from '$lib/game/ui/SystemScreen.svelte';
	import TitleScreen from '$lib/game/ui/TitleScreen.svelte';
	import { locale, motionReduced, preferences } from '$lib/game/i18n/store';
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
	import { onHudState, onPrologueEnd, type HudPrologueEnd } from '$lib/game/ui-bridge/events';
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
		requestUseItem,
		resetHudState
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

	// Title save metadata is a refreshable snapshot: a finished run rewrites
	// the autosave while the completion card is up, so every return to Title
	// re-reads the slots instead of showing boot-time numbers (HPA-841).
	let titleSlots = $state(loadSaveSlots());
	let titleSlot = $state(getNewestSaveSlot());
	let titleSaveUnreadable = $state(saveSlotsUnreadable());
	// Only the autosave slot is destroyed by starting a new run — the
	// overwrite confirmation guards exactly that case (review finding 2). An
	// unreadable envelope may still hold a real autosave, so it confirms too.
	let titleHasAutosave = $derived(titleSlots.slots[0] !== null || titleSaveUnreadable);
	let titleCanContinue = $derived(titleSlot !== null);
	let titleContinueSubtitle = $derived(
		titleSlot
			? `${getAreaName($locale, titleSlot.record.state.mapId, titleSlot.record.state.player)} · ${formatPlaytimeSeconds(titleSlot.record.playtimeSeconds)}`
			: ''
	);

	function refreshTitleSaveState() {
		titleSlots = loadSaveSlots();
		titleSlot = getNewestSaveSlot();
		titleSaveUnreadable = saveSlotsUnreadable();
	}

	function beginRun(request: GameStartRequest, playtimeBaseSeconds: number) {
		// A deliberate run boot accepts ready emits again (the post-return
		// suppression below must never leak into the next run).
		suppressReadyPromotion = false;
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

	/** Closes every overlay surface without its close side effects (no resume
	 *  requests, no focus restore): the completion card takes over, and the
	 *  return-to-title sweep reuses it. */
	function clearOverlays() {
		commandOpen = false;
		inventoryOpen = false;
		skillOpen = false;
		shopOpen = false;
		questLogOpen = false;
		areaMapOpen = false;
		systemOpen = false;
		saveOpen = false;
		loadPickerOpen = false;
		newRunConfirmOpen = false;
		pauseOwner = null;
		overlayFocusRestoreTarget = null;
	}

	/** Dismisses the completion card and returns to Title: one sweep clears
	 *  overlays, pause, shields, the stale run request/playtime, resets the
	 *  HUD payload, and refreshes the Title's save snapshot. */
	function returnToTitle() {
		clearOverlays();
		prologueEnd = null;
		prologueEndDismissKey = null;
		clearShieldedActivationKeys();
		// Arm before resetHudState(): later old-scene `ready` emits must stay
		// ignored while Title is up (the fresh not-ready publish included).
		suppressReadyPromotion = true;
		startRequest = { reason: 'new', saveState: null };
		resetPlaytime(0);
		mode = 'title';
		resetHudState();
		refreshTitleSaveState();
	}

	function dismissPrologueEnd() {
		if (!prologueEnd) return;
		returnToTitle();
	}

	/** Card-first dismissal: one fresh activation key. Repeats and
	 *  shield-owned presses stay ignored (HPA-836 shield semantics). */
	function tryDismissPrologueEndWithKey(event: KeyboardEvent): boolean {
		if (!isShieldedActivationKey(event.key) || event.repeat || shieldedActivationKeys[event.key]) {
			return false;
		}
		event.preventDefault();
		// Dismiss first — returnToTitle() clears stale shields — then arm this
		// press: its release must not click the freshly focused Title card.
		dismissPrologueEnd();
		shieldedActivationKeys[event.key] = true;
		prologueEndDismissKey = event.key;
		return true;
	}

	// The card's own key handler: same path as the global card-first branch,
	// kept from double-firing when focus already sits on the card.
	function handlePrologueEndCardKeydown(event: KeyboardEvent) {
		if (tryDismissPrologueEndWithKey(event)) event.stopPropagation();
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
	// The completion card's payload; null while no card is shown.
	let prologueEnd = $state<HudPrologueEnd | null>(null);
	let prologueEndCard = $state<HTMLElement>();
	// Post-return only: a late `ready` emit from the dying scene must not
	// promote Title back to playing. Initial boot stays promoted (embedded
	// harness); the next deliberate beginRun() clears this.
	let suppressReadyPromotion = false;
	// The completion card's dismissal key: its release is guarded so the
	// keyup cannot click the freshly focused Title card.
	let prologueEndDismissKey: 'Enter' | ' ' | null = null;

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
		if (command !== 'rest') {
			document
				.querySelector<HTMLElement>(
					`[data-focus-id="${fieldCommandFocusId(command)}"]:not([disabled])`
				)
				?.focus();
		}
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
		// Re-send on every owner change, not just from an idle world: the scene
		// treats each pause-game as "clear the transient field status" (a
		// non-mutating, idempotent publish), so stale copy like "Recovered HP"
		// or "Saved" can never leak into the newly opened overlay's footer.
		if (pauseOwner !== owner) requestPauseGame();
		pauseOwner = owner;
	}

	function resumeForOverlay(owner: OverlayPauseOwner) {
		if (pauseOwner !== owner) return;
		pauseOwner = null;
		requestResumeGame();
	}

	function openCommand(focusFirstTile = false) {
		// Start / the Menu button must not raise the grid behind an open
		// overlay or dialogue (final review); closing stays the toggle's job.
		if (overlaySurfaceOpen) return;
		commandOpen = true;
		pauseForOverlay('settings');
		if (focusFirstTile) void focusCommandTile();
	}

	function focusFieldStage() {
		mountNode?.focus();
	}

	async function focusCommandTile(focusId?: string) {
		await tick();
		const preferred = focusId
			? document.querySelector<HTMLElement>(
					`[data-focus-id="${CSS.escape(focusId)}"]:not([disabled])`
				)
			: null;
		(
			preferred ??
			document.querySelector<HTMLElement>(
				`[data-focus-id^="${FIELD_COMMAND_FOCUS_ID_PREFIX}"]:not([disabled])`
			)
		)?.focus();
	}

	function closeCommand() {
		if (!commandOpen) return;
		commandOpen = false;
		resumeForOverlay('settings');
		// Keep Enter/Space free for field interaction on resume (do not park on Menu).
		focusFieldStage();
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
		leaveOverlay('inventory');
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
			!restoreTarget.closest('#game-command-panel') &&
			!(mode === 'playing' && restoreTarget === menuButton)
		) {
			restoreTarget.focus();
			return;
		}

		if (mode === 'playing') {
			focusFieldStage();
		} else {
			document
				.querySelector<HTMLElement>(
					'[data-focus-id="title-continue"]:not([disabled]), [data-focus-id="title-new-run"]'
				)
				?.focus();
		}
	}

	function leaveOverlay(owner: OverlayPauseOwner) {
		const opener = overlayFocusRestoreTarget;
		const commandFocusId = opener?.getAttribute('data-focus-id') ?? '';
		if (commandFocusId.startsWith(FIELD_COMMAND_FOCUS_ID_PREFIX)) {
			overlayFocusRestoreTarget = null;
			commandOpen = true;
			if (pauseOwner === owner) pauseOwner = 'settings';
			void focusCommandTile(commandFocusId);
			return;
		}
		resumeForOverlay(owner);
		void restoreOverlayFocus();
	}

	function closeShop() {
		if (!shopOpen) return;
		shopOpen = false;
		requestCloseShop();
		leaveOverlay('shop');
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
		leaveOverlay('questLog');
	}

	function openAreaMap() {
		if (areaMapOpen || battleLocked) return;
		rememberOverlayFocus();
		commandOpen = false;
		areaMapOpen = true;
		pauseForOverlay('areaMap');
		void focusAreaMapDialog();
	}

	function openSkill() {
		if (skillOpen) return;
		rememberOverlayFocus();
		commandOpen = false;
		skillOpen = true;
		pauseForOverlay('skill');
		void focusSkillDialog();
	}

	function closeSkill() {
		if (!skillOpen) return;
		skillOpen = false;
		leaveOverlay('skill');
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
		// Title mode restores to the opening Title card; playing mode returns to
		// the command tile if System opened from one, otherwise the field stage.
		leaveOverlay('system');
	}

	function openSave() {
		if (saveOpen || battleLocked || !$hudState.ready) return;
		rememberOverlayFocus();
		commandOpen = false;
		saveOpen = true;
		pauseForOverlay('save');
		void focusSaveDialog();
	}

	function closeSave() {
		if (!saveOpen) return;
		saveOpen = false;
		leaveOverlay('save');
	}

	function closeAreaMap() {
		if (!areaMapOpen) return;
		areaMapOpen = false;
		leaveOverlay('areaMap');
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

	const shieldedActivationKeys: Record<'Enter' | ' ', boolean> = { Enter: false, ' ': false };
	let padConfirmClick = false;

	function isShieldedActivationKey(key: string): key is 'Enter' | ' ' {
		return key === 'Enter' || key === ' ';
	}

	function isShieldableActivationControl(target: EventTarget | null): boolean {
		const control =
			target instanceof Element ? target.closest('button, [role="button"], [role="tab"]') : null;
		return Boolean(control && !control.matches(':disabled, [aria-disabled="true"]'));
	}

	function handleShellActivationKeydownCapture(event: KeyboardEvent) {
		if (!isShieldedActivationKey(event.key)) return;
		// A fresh press supersedes a pending completion-card dismissal guard;
		// held-key repeats of the dismissal press itself must not clear it.
		if (!event.repeat && prologueEndDismissKey === event.key) prologueEndDismissKey = null;
		setLastInputModality('keys');
		if (event.repeat) {
			// Block repeated Enter/Space from firing native button clicks again.
			// A shell-owned press stays shielded even if focus left the control,
			// but a foreign press's repeats must not claim its release.
			if (shieldedActivationKeys[event.key] || isShieldableActivationControl(event.target)) {
				event.preventDefault();
			}
			return;
		}
		if (!isShieldableActivationControl(event.target)) return;
		shieldedActivationKeys[event.key] = true;
	}

	function handleShellActivationKeydown(event: KeyboardEvent) {
		if (!isShieldedActivationKey(event.key)) return;
		if (!shieldedActivationKeys[event.key] && !isShieldableActivationControl(event.target)) {
			return;
		}
		event.stopPropagation();
	}

	function handleShellActivationKeyup(event: KeyboardEvent) {
		if (!isShieldedActivationKey(event.key)) return;
		if (prologueEndDismissKey === event.key) {
			prologueEndDismissKey = null;
			// The card's dismissal release must not click the freshly focused
			// Title card (Space activates buttons on release).
			event.preventDefault();
		}
		// Only swallow keyup for keys whose keydown was shielded; if keydown
		// reached Phaser and focus then moved onto a control, Phaser needs keyup.
		if (!shieldedActivationKeys[event.key]) return;
		shieldedActivationKeys[event.key] = false;
		event.stopPropagation();
		setLastInputModality('keys');
	}

	function handleWindowActivationKeydownCapture(event: KeyboardEvent) {
		if (!event.repeat || !isShieldedActivationKey(event.key)) return;
		if (!shieldedActivationKeys[event.key]) return;
		if (event.target instanceof Element && event.target.closest('.game-shell')) return;
		// An activated control that unmounts mid-hold (New Run, load slots)
		// drops focus to <body>, so repeats bypass the section handlers. Phaser
		// never saw the shielded keydown, so a leaked repeat registers there as
		// a fresh down — stop it in capture, before any window listener sees it.
		event.stopPropagation();
	}

	function handleWindowActivationKeyup(event: KeyboardEvent) {
		if (!isShieldedActivationKey(event.key)) return;
		if (prologueEndDismissKey === event.key) {
			prologueEndDismissKey = null;
			event.preventDefault();
		}
		// Activation-on-keydown clicks (Title New Run, load slots) can unmount
		// the focused control mid-press; focus falls to <body> and the release
		// never reaches the shell keyup handler above. Release ownership here
		// without stopping the event — a stale shield would otherwise swallow
		// the field's next Enter/Space keydown.
		shieldedActivationKeys[event.key] = false;
	}

	function clearShieldedActivationKeys() {
		shieldedActivationKeys.Enter = false;
		shieldedActivationKeys[' '] = false;
		prologueEndDismissKey = null;
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		setLastInputModality('keys');

		// Card-first: while the completion card is up, nothing here may open
		// menus, rove focus, or reach the field. Only a fresh activation key
		// dismisses; repeats and shield-owned presses stay ignored (HPA-836).
		if (prologueEnd) {
			// Tab is trapped on the card (it holds no focusable descendants, so
			// trapTabFocus keeps focus on the card itself).
			trapTabFocus(event, prologueEndCard);
			tryDismissPrologueEndWithKey(event);
			return;
		}

		if (event.defaultPrevented) return;
		if (handleMenuArrowKeys(event)) return;

		if (event.repeat) return;
		if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		if (isEditableTarget(event.target)) return;

		if (event.key === 'Escape') {
			if ($hudState.dialogue || battleLocked) return;
			if (mode === 'title') {
				if (newRunConfirmOpen || loadPickerOpen || systemOpen) {
					event.preventDefault();
					handlePadCancel();
				}
				return;
			}
			event.preventDefault();
			if (overlaySurfaceOpen) handlePadCancel();
			else if ($hudState.ready) openCommand(true);
			return;
		}

		if (event.key === 'i' || event.key === 'I') {
			if (mode !== 'playing' || overlaySurfaceOpen || battleLocked || !$hudState.ready) return;
			event.preventDefault();
			openInventory('gear');
			return;
		}

		if (event.key !== 'm' && event.key !== 'M') return;

		if (areaMapOpen) {
			event.preventDefault();
			closeAreaMap();
			return;
		}

		// Same coherent modal guard as Start/Menu: M never raises the map under
		// any open surface — save and dialogue included (final review). Closing
		// the already-open map stays handled above.
		if (mode !== 'playing' || overlaySurfaceOpen || battleLocked || !$hudState.ready) return;

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

		// Card-first: pad input cannot open menus, move Grik, or rove focus
		// behind the completion card. Only pad A (confirm) dismisses it.
		if (prologueEnd) {
			if (action === 'confirm') dismissPrologueEnd();
			return;
		}

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
		if (target instanceof HTMLElement) {
			padConfirmClick = true;
			try {
				target.click();
			} finally {
				padConfirmClick = false;
			}
		}
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
			handlePadCancel();
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
	// (covers direct boot races and embedded test harnesses). After a return
	// to Title the suppression flag ignores late old-scene emits until the
	// next deliberate beginRun().
	$effect(() => {
		return onHudState((state) => {
			if (state.ready && mode === 'title' && !suppressReadyPromotion) {
				mode = 'playing';
			}
		});
	});

	// The scene's one-shot completion signal: freeze into the card while
	// playing. The card is dismissed only through dismissPrologueEnd().
	$effect(() => {
		return onPrologueEnd((end) => {
			if (mode !== 'playing' || prologueEnd) return;
			// Fully modal: an overlay open when the signal lands must go — its
			// controls would otherwise keep focus and activation behind the
			// card (review: Bag + Tab reach its Close while the card is up).
			clearOverlays();
			prologueEnd = end;
		});
	});

	// Accessible focus: the card takes focus when it appears.
	$effect(() => {
		if (!prologueEnd) return;
		void focusPrologueEndCard();
	});

	async function focusPrologueEndCard() {
		await tick();
		if (prologueEnd) prologueEndCard?.focus();
	}

	onMount(() => {
		window.addEventListener('keydown', handleWindowActivationKeydownCapture, true);
		window.addEventListener('keydown', handleGlobalKeydown);
		window.addEventListener('keyup', handleWindowActivationKeyup);
		window.addEventListener('blur', clearShieldedActivationKeys);
		return () => {
			window.removeEventListener('keydown', handleWindowActivationKeydownCapture, true);
			window.removeEventListener('keydown', handleGlobalKeydown);
			window.removeEventListener('keyup', handleWindowActivationKeyup);
			window.removeEventListener('blur', clearShieldedActivationKeys);
		};
	});
</script>

<section
	class="game-shell relative h-screen w-screen bg-ink font-body text-parchment"
	class:heroic-motion-reduced={$motionReduced}
	role="presentation"
	onkeydowncapture={handleShellActivationKeydownCapture}
	onkeydown={handleShellActivationKeydown}
	onkeyup={handleShellActivationKeyup}
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
			tabindex="-1"
			class="game-stage absolute inset-0 overflow-hidden bg-[#090d1f]"
		></div>

		<div
			class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(130,180,255,0.18),transparent_38%),linear-gradient(180deg,rgba(7,10,26,0.1),rgba(4,6,18,0.58)_85%,rgba(3,4,10,0.82))]"
		></div>

		{#if !battleLocked && !$hudState.dialogue && !prologueEnd}
			<div class="jrpg-menu-anchor pointer-events-auto">
				<button
					bind:this={menuButton}
					type="button"
					class="heroic-chip-button jrpg-command-toggle"
					onclick={(event) =>
						commandOpen ? closeCommand() : openCommand(event.detail === 0 && !padConfirmClick)}
					aria-expanded={commandOpen}
					aria-controls="game-command-panel"
					aria-keyshortcuts="Escape"
				>
					<span class="menu-glyph" aria-hidden="true">
						<PromptGlyph mode={$preferences.promptMode} keys="Esc" pad="Start" />
					</span>
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

		{#if prologueEnd}
			<!-- Full-screen completion card over the existing title key art. One
			     surface, one dismissal path: click here, a fresh Enter/Space, or
			     pad A — all routed through dismissPrologueEnd(). -->
			<div
				class="prologue-end-card heroic-anim"
				role="dialog"
				aria-modal="true"
				aria-labelledby="prologue-end-heading"
				aria-describedby={prologueEnd.success
					? 'prologue-end-hint'
					: 'prologue-end-warning prologue-end-hint'}
				tabindex="-1"
				bind:this={prologueEndCard}
				onclick={dismissPrologueEnd}
				onkeydown={handlePrologueEndCardKeydown}
			>
				<img
					class="prologue-end-art"
					src="/game/assets/heroic-ui/title-key-art.png"
					alt=""
					aria-hidden="true"
					draggable="false"
				/>
				<div class="prologue-end-scrim" aria-hidden="true"></div>
				<div class="prologue-end-copy">
					<h2 id="prologue-end-heading" class="font-display">
						{t($locale, 'ui.prologueEndHeading')}
					</h2>
					<p class="prologue-end-thanks font-display">{t($locale, 'ui.prologueEndThanks')}</p>
					{#if !prologueEnd.success}
						<p id="prologue-end-warning" class="prologue-end-warning">
							{t($locale, 'status.saveFailed')}
						</p>
					{/if}
					<p id="prologue-end-hint" class="prologue-end-hint">
						{t($locale, 'ui.prologueEndDismiss')}
					</p>
				</div>
			</div>
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

	.game-stage:focus {
		outline: none;
	}

	:global(.game-stage canvas) {
		width: 100% !important;
		height: 100% !important;
		display: block;
	}

	.jrpg-menu-anchor {
		position: absolute;
		top: 0.9rem;
		right: 16.5rem;
		/* Above the command-grid backdrop so Menu stays clickable to close. */
		z-index: 40;
	}

	.jrpg-command-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		padding: 0.7rem 0.9rem;
		font-size: 0.72rem;
		/* Top-right Menu chip stays visible on desktop as well as small screens
		   so mouse, touch, keyboard, and pad players always have direct access. */
	}

	.menu-glyph {
		display: inline-flex;
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
		/* The prompt-bar band below the card row (which ends at 16.7vh): the
		   confirmation replaces the decorative hints behind its scrim instead
		   of floating over the cards (HPA-841). */
		bottom: 8.7vh;
		/* Shrink-to-fit clamps an absolutely positioned box to the space right
		   of left:50% — pin the intrinsic width so the row stays single-line. */
		width: max-content;
		max-width: calc(100vw - 2rem);
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

	/* Prologue completion card: full-bleed title key art under a dark scrim,
	   gold centered copy, one dismissal surface. A gentle fade is the only
	   motion, and .heroic-motion-reduced / prefers-reduced-motion (heroic-ui)
	   strip it. */
	.prologue-end-card {
		position: absolute;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: var(--color-ink);
		cursor: pointer;
		outline: none;
		animation: prologue-end-fade 420ms ease-out both;
	}

	@keyframes prologue-end-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.prologue-end-art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		user-select: none;
	}

	.prologue-end-scrim {
		position: absolute;
		inset: 0;
		background: rgba(4, 6, 18, 0.66);
	}

	.prologue-end-copy {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.55rem;
		max-width: 90vw;
		padding: 1rem;
		text-align: center;
	}

	.prologue-end-copy h2 {
		margin: 0;
		color: var(--color-gold-bright);
		font-size: clamp(1.45rem, 4vw, 2.5rem);
		font-weight: 800;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		text-shadow: 0 2px 18px rgba(0, 0, 0, 0.6);
	}

	.prologue-end-thanks {
		margin: 0;
		color: var(--color-parchment);
		font-size: clamp(0.95rem, 2.2vw, 1.3rem);
		font-weight: 600;
	}

	.prologue-end-warning {
		margin: 0;
		color: var(--color-rose);
		font-size: 0.85rem;
		font-weight: 700;
	}

	.prologue-end-hint {
		margin: 0.4rem 0 0;
		color: var(--color-muted);
		font-size: 0.78rem;
	}

	@media (max-width: 832px) {
		.jrpg-menu-anchor {
			top: 0.75rem;
			right: 0.75rem;
		}

		.jrpg-command-toggle {
			padding: 0.6rem 0.72rem;
			/* Compact padding on narrow screens so the persistent Menu chip clears
			   the smaller status cluster. */
		}
	}

	@media (max-width: 560px) {
		.jrpg-command-toggle .menu-glyph {
			display: none;
		}
	}

	/* Compact HUD breakpoint matches FieldHud's: under 720px the side HUD
	   drops the minimap and anchors below this chip, so the chip itself
	   moves to the upper-right corner. */
	@media (max-height: 719px) {
		.jrpg-menu-anchor {
			top: 0.75rem;
			right: 0.75rem;
		}

		.jrpg-command-toggle {
			gap: 0.3rem;
			padding: 0.45rem 0.4rem;
			font-size: 0.62rem;
		}

		.jrpg-command-toggle :global(.heroic-prompt-glyph) {
			min-width: 1.7rem;
			padding: 0.1rem 0.35rem;
			font-size: 0.68rem;
		}
	}
</style>
