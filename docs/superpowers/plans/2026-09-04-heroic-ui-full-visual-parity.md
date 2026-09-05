# Heroic UI Full Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gliese's current mixed JRPG HUD/windows with the supplied Heroic UI across the full playable flow while adding only the minimum title, save, dialogue, battle, preference, and prompt behavior required to make the mockup honest.

**Architecture:** Preserve pure TypeScript game rules, Phaser runtime ownership, Svelte presentation, and `ui-bridge/events.ts` as the runtime boundary. `GameShell.svelte` stays composition/pause/focus owner; focused screen components own markup only. Reuse `SaveStorage`, replace the raw locale preference with one JSON record at `gliese.preferences.v1`, and keep new runtime behavior behind small pure helpers.

**Tech Stack:** TypeScript 6, Svelte 5, Phaser 4, Vite 8, Tauri 2, Tailwind 4, Vitest/browser-svelte, Playwright, `@fontsource`, Sharp.

**Spec:** `docs/superpowers/specs/2026-09-04-heroic-ui-full-visual-parity-design.md`

## Global Constraints

- Continue on `feat/heroic-ui-parity` / draft PR #39. One ticket, one PR.
- Every task leaves the branch runnable and affected tests green.
- Canonical visual-review viewport is **1440×900**.
- No router, new store library, generic design system, third HUD/menu event bus, turn-based rewrite, audio runtime, crafting, party/roster system, skill registry/tree, witness gauge, controller remapping, rumble, or brand-specific glyphs.
- One preference record: `gliese.preferences.v1`. No `gliese.ui-preferences.v1`.
- One save-slot envelope: `gliese.saves.v1`. No runtime fallback to `gliese.save.v9` after cutover.
- Slot 1 autosave only; Slots 2/3 manual; Continue = newest `savedAt`.
- Autosave only on new-run ready, completed transition, applied battle result.
- Skill is a localized empty/unavailable surface, not invented content.
- Dialogue ships neutral busts only.
- Pad support is UI navigation/commands only; Phaser keyboard movement remains unchanged.
- Human source/runtime PNG review is the visual gate; do not add `toHaveScreenshot`/`maxDiffPixels` CI goldens.

## Risks

- **E2E boot:** lazy Title and the shared `startNewRunFromTitle(page)` migration land together.
- **Persistence timing:** fog/discovery tests are rewritten in the slot cutover because those mutations remain in memory but stop writing storage immediately.
- **Visual flake:** CI checks structure/behavior; reviewer compares deterministic 1440×900 PNGs.

## File Ownership

```text
src/lib/game/
  GameShell.svelte
  DialoguePanel.svelte
  ui/{TitleScreen,FieldHud,CommandGrid,BagScreen,ShopScreen,QuestJournal,AreaMapScreen,
      SkillScreen,BattleHud,BattleSummary,SaveScreen,SystemScreen,PromptGlyph}.svelte
  ui/heroic-ui.css
  content/heroic-ui.ts
  core/{text-reveal,battle-presentation,gamepad}.ts
  save/{storage,slots,playtime,thumbnail}.ts
  phaser/createGame.ts
  phaser/scenes/{BootScene,WorldScene,BattleScene}.ts
  ui-bridge/{events,store}.ts
src/lib/game/i18n/{preferences,store}.ts
src/app.css
```

Do not create `ui/preferences.ts`, `content/skills.ts`, or `gliese:menu-request`.

---

### Task 1: Heroic Foundation + Screen Extraction, No Behavior Change

**Files:** `src/app.css`, `src/main.ts`, `src/lib/game/GameShell.svelte`, `src/lib/game/ui/heroic-ui.css`, extracted existing field/inventory/shop/quest/map components, `GameShell.svelte.spec.ts`.

**Produces:** one Heroic token source and focused screen bodies while current boot/commands remain functional.

- [ ] Add a characterization test that opens Menu -> Inventory and verifies existing overlay/focus behavior before extraction.
- [ ] Run `bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts`; expected PASS.
- [ ] Replace current Arcane `@theme` values in `src/app.css` with Heroic tokens. Tokens live only there.

```css
@theme {
  --color-ink: #070512;
  --color-panel: #142a63;
  --color-panel-deep: #0c1a4a;
  --color-gold: #ffe08a;
  --color-emerald: #8dffbd;
  --color-sapphire: #9ad2ff;
  --color-violet: #d9a9ff;
  --color-rose: #ff8a9e;
  --font-display: 'Zen Maru Gothic', system-ui, sans-serif;
  --font-body: 'Spectral', Georgia, serif;
}
```

- [ ] Add bundled Zen Maru Gothic dependency/imports and remove Cinzel imports in the same checkpoint. Keep Spectral.
- [ ] Put repeated Heroic frame/selection/motion classes in `heroic-ui.css`; do not duplicate tokens.
- [ ] Extract current screen bodies behind props/callbacks; keep pause ownership and bridge calls in `GameShell`.
- [ ] Remove `.glass-*` / `.arcane-*` styling from each surface as it moves to Heroic; do not run both material systems on the same redesigned surface.
- [ ] Run `bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts && bun run check`; expected PASS.
- [ ] Commit: `git commit -m "refactor: establish Heroic UI foundation"`.

---

### Task 2: One Preference Record + Heroic System Screen

**Files:** `i18n/preferences.ts`, `i18n/store.ts`, `src/main.ts`, `ui/SystemScreen.svelte`, `ui/PromptGlyph.svelte`, locale message files, preference/component tests.

**Produces:** one validated JSON preference record and source System screen.

- [ ] Write failing tests for valid JSON load/save and malformed/raw-string fallback.

```ts
export const PREFERENCES_STORAGE_KEY = 'gliese.preferences.v1';
export type UiPreferences = {
  locale: Locale;
  textSpeed: 'slow' | 'normal' | 'instant';
  hudDensity: 'quiet' | 'full';
  motion: 'on' | 'reduced';
  promptMode: 'auto' | 'pad' | 'keys';
};
```

Defaults are `en`/detected locale, `normal`, `quiet`, `on`, `auto`.

- [ ] Replace the old raw locale persistence with `loadPreferences` / `savePreferences`; old raw `ja` is treated as invalid and falls back rather than migrated.
- [ ] In `i18n/store.ts`, expose one `preferences` readable, `initializePreferences()`, `getActivePreferences()`, `updatePreferences(patch)`, and keep `setActiveLocale(locale)` as `updatePreferences({ locale })`.
- [ ] Change `main.ts` boot to call `initializePreferences()` after `setSaveStorage`.
- [ ] Build System rows for Language, Text speed, HUD density, Motion, Prompts. Source-selected state: English / Normal / Quiet / On / Auto.
- [ ] Audio rail is visible with unavailable/disabled explanation. Input focuses the Prompts row; no second settings design.
- [ ] Run focused tests + `bun run check`; expected PASS.
- [ ] Commit: `git commit -m "feat: unify Heroic UI preferences"`.

---

### Task 3: Atomic Title + Slot Save Cutover + Save Screen + E2E Boot Migration

**Files:** `save/{slots,playtime,thumbnail,storage}.ts`, storage tests, `phaser/createGame.ts`, `BootScene.ts`, `WorldScene.ts`, `scenes.test.ts`, bridge events/store, `ui/{TitleScreen,SaveScreen}.svelte`, `GameShell.svelte`, `tests/e2e/helpers/game.ts`, all three E2E files.

**Produces:** Title-before-Phaser boot and one slot format used by Title, WorldScene, Save UI, and tests immediately.

- [ ] Write failing slot tests: newest valid record, autosave/manual slot constraints, invalid envelope fallback, no legacy runtime read.

```ts
export type SaveSlotIndex = 0 | 1 | 2;
export type SaveSlotRecord = {
  kind: 'autosave' | 'manual';
  savedAt: string;
  playtimeSeconds: number;
  locationLabel: string;
  thumbnail?: string;
  state: SaveState;
};
export type SaveSlotsState = {
  version: 1;
  slots: [SaveSlotRecord | null, SaveSlotRecord | null, SaveSlotRecord | null];
};
```

- [ ] Keep `SaveStorage`, `setSaveStorage`, `getSaveStorage`; replace old runtime APIs with:

```ts
export const SAVE_SLOTS_STORAGE_KEY = 'gliese.saves.v1';
export function loadSaveSlots(storage?: SaveStorage): SaveSlotsState;
export function writeSaveSlot(index: SaveSlotIndex, record: SaveSlotRecord, storage?: SaveStorage): SaveSlotsState;
export function getNewestSaveSlot(storage?: SaveStorage): { index: SaveSlotIndex; record: SaveSlotRecord } | null;
```

Delete `SAVE_STORAGE_KEY`, previous-key fallback, `loadStoredSaveState/Result`, `storeSaveState`, `saveGameState`, `clearStoredSaveState` after all callsites in this task are converted.

- [ ] Add bounded playtime and 16:9 thumbnail helpers; thumbnail failure returns `undefined` and never blocks the save.
- [ ] Extend `createGame(target, start)` with:

```ts
export type GameStartRequest =
  | { reason: 'new'; saveState: null }
  | { reason: 'resume'; saveState: SaveState };
```

Pass through Phaser registry/preBoot; `BootScene` forwards it to `WorldScene`.

- [ ] Write scene tests **before** changing save timing: autosave on new ready / transition / battle-result; no storage write on fog-only movement or discovery-only mutation.
- [ ] Convert `WorldScene` to `writeSaveSlot(0, autosaveRecord)` only at those three checkpoints. Remove fog/discovery storage writes while keeping their in-memory state/publish behavior.
- [ ] Replace manual save with `{ type: 'save-slot'; slot: 1 | 2 }` internal manual indexes.
- [ ] Remove bridge `{type:'save'}`, `{type:'resume-save'}`, `HudState.canResume`, request helpers, and `loadStoredSaveResult` import from `ui-bridge/store.ts`. Initial HUD uses neutral defaults until WorldScene publishes real state.
- [ ] Build Title: Continue disabled with no slot, Continue newest slot, New Run, System. Phaser mounts only after Continue/New Run.
- [ ] Build Save: Slot 1 read-only autosave, Slots 2/3 manual, overwrite confirmation, metadata/thumbnail.
- [ ] Add `tests/e2e/helpers/game.ts`:

```ts
export async function startNewRunFromTitle(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /New Run/i }).click();
  await expect(page.locator('canvas')).toBeVisible();
}
```

Update **all three** field-first E2E files in this same task. Tests intentionally asserting Title keep raw `page.goto('/')`.

- [ ] Add one real Continue E2E by seeding `gliese.saves.v1`; do not fake `canResume`.
- [ ] Run `bun run test:unit -- --run src/lib/game/save/storage.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/GameShell.svelte.spec.ts && bun run build && bun run test:e2e`; expected PASS before commit.
- [ ] Commit: `git commit -m "feat: add title and slot-based saves"`.

---

### Task 4: Heroic Field HUD + Eight Command Flow

**Files:** `ui/{FieldHud,CommandGrid}.svelte`, `GameShell.svelte`, locale messages, component tests.

- [ ] Add a failing test asserting source order: Bag, Gear, Quest, Map, Skill, Rest, Save, System.
- [ ] Implement Quiet source geometry: portrait, level, HP, XP, quest banner, wallet/status. Full may add secondary detail without moving Quiet layout.
- [ ] Define local routing only:

```ts
type FieldCommand = 'bag' | 'gear' | 'quest' | 'map' | 'skill' | 'rest' | 'save' | 'system';
```

Bag -> Potions; Gear -> Gear; Quest -> Journal; Map -> Area Map; Skill -> empty Skill screen; Rest -> existing `requestHeal`; Save -> SaveScreen; System -> SystemScreen.

- [ ] Keep one existing pause/focus owner. Pure local overlay opens do not become HUD commands.
- [ ] Test Gear deep-link, Save/System open, Rest dispatch, Map open through real buttons/keys.
- [ ] Run component tests + check; commit `feat: add Heroic field command flow`.

---

### Task 5: Bag/Gear + Honest Skill State

**Files:** `ui/{BagScreen,SkillScreen}.svelte`, `GameShell.svelte`, locale messages, component tests.

- [ ] Test exactly 24 Bag slots and Gear deep-link.
- [ ] Map categories: Potions=current consumables, Gear=current equipment, Key=current key items, Loot=empty because current item model has no material type.
- [ ] Render five existing equipment positions and keep use/equip/unequip bridge rules. No drag/drop.
- [ ] `SkillScreen` has only Heroic frame, localized “No skills learned yet”/unavailable copy, Back/focus behavior. No IDs, levels, icons, registry, save state, or combat use.
- [ ] Run component tests + check; commit `feat: finish Heroic bag and skill state`.

---

### Task 6: Shop + Quest Journal + Area Map

**Files:** `core/stats.ts` + tests, `ui/{ShopScreen,QuestJournal,AreaMapScreen}.svelte`, component tests.

- [ ] Write failing `previewEquipmentSwap` test using Traveler Vest.
- [ ] Implement by cloning candidate equipment and calling `deriveEffectiveStats` before/after:

```ts
export function previewEquipmentSwap(input: {
  base: BaseStats;
  equipment: EquipmentState;
  itemId: string;
}): { slot: EquipmentSlot; replacedItemId: string | null; before: EffectiveStats; after: EffectiveStats } | null;
```

- [ ] Shop renders merchant, Buy/Sell, item detail, price/owned, wallet before/after, unaffordable disabled state, stat deltas. Svelte does not duplicate stat arithmetic.
- [ ] Quest renders progress rings, main/side/offer, objective chain, rewards, giver/location, existing map context; no fake route lines.
- [ ] Area Map keeps current fog/marker/navigation/pause rules and changes chrome only.
- [ ] Run stats + component tests + check; commit `feat: finish Heroic field windows`.

---

### Task 7: Neutral Dialogue Bust + Pure Text Reveal

**Files:** `core/text-reveal.ts` + tests, `content/heroic-ui.ts`, bridge dialogue state, `WorldScene.ts`, `DialoguePanel.svelte` + tests, locale messages.

- [ ] Write pure reveal tests: partial normal, full instant, confirm returns `reveal` until complete then `advance`.
- [ ] Implement:

```ts
export function getTextSpeedMs(speed: UiPreferences['textSpeed']): number;
export function getVisibleText(text: string, visibleCharacters: number, speed: UiPreferences['textSpeed']): string;
export function resolveDialogueConfirm(input: { visibleCharacters: number; totalCharacters: number }): 'reveal' | 'advance';
```

- [ ] `content/heroic-ui.ts` maps stable `npcId` to **one neutral bust path** per supported speaker. No mood enum.
- [ ] Add `npcId: string | null` to HUD dialogue state; copy from `DialogueSession.npcId`. Do not match speaker strings.
- [ ] In `DialoguePanel`: new line resets reveal; Instant full; first confirm completes current line; second confirm advances; choices unavailable until fully revealed.
- [ ] Test Mira neutral bust, reveal/advance, choice gating, Instant; run scene/component tests + check.
- [ ] Commit `feat: add Heroic dialogue reveal`.

---

### Task 8: Pure Battle Target / Ribbon / Feed / Flee Contracts

**Files:** `core/battle.ts` + tests, new `core/battle-presentation.ts` + tests.

- [ ] Write failing fled-result test: current HP/inventory/return position apply, summary null, no XP/coins/quest progress/encounter clear.
- [ ] Extend:

```ts
export type BattleOutcome = 'victory' | 'defeat' | 'fled';
export type BattleApplication = { saveState: SaveState; summary: BattleSummary | null };
```

- [ ] Add pure target helpers: nearest living default and stable left/right living cycle.
- [ ] Add bounded feed helper (default 4 newest entries).
- [ ] Add readiness ribbon helper sorted by existing `readyAt` timestamps; it never drives simulation.
- [ ] Add pure deterministic flee channel:

```ts
export type FleeChannelState =
  | { status: 'idle' }
  | { status: 'channeling'; startedAt: number; durationMs: number };
```

with start/cancel/progress/complete helpers, default duration 2400ms.

- [ ] Run pure battle tests; commit `feat: add battle presentation contracts`.

---

### Task 9: BattleScene Telemetry + Target + Heal/Item/Flee Runtime

**Files:** bridge events/store, `BattleScene.ts`, `WorldScene.ts`, `scenes.test.ts`.

- [ ] Extend active battle render state only with hero, enemies, `targetUnitId`, bounded ribbon/feed, heal count, usable item count, Flee status/progress. **No `secondaryGauge`.**
- [ ] Add commands only:

```ts
| { type: 'battle-cycle-target'; direction: -1 | 1 }
| { type: 'battle-flee' }
```

Reuse existing `heal`, `use-item`, `dismiss-battle-summary`.

- [ ] Scene test initial nearest target + cycling without defeated units.
- [ ] `tryHeroAttack` prefers selected target when alive/in range; invalid/dead target reselects nearest. Do not change cooldown/AI cadence.
- [ ] Append feed entries at existing damage/heal/defeat points and derive ribbon from current cooldown timestamps.
- [ ] Start Flee on command; incoming damage cancels; update completes at 2400ms and sends `BattleResult{outcome:'fled'}` with current HP/inventory.
- [ ] `WorldScene` applies fled result, autosaves Slot 1 as a battle-result checkpoint, shows no summary, and leaves encounter uncleared.
- [ ] Test Flee progress/cancel/success and unchanged Heal/Item behavior; run battle/scene tests + check.
- [ ] Commit `feat: publish Heroic battle telemetry`.

---

### Task 10: Heroic Battle HUD + Victory

**Files:** new `ui/{BattleHud,BattleSummary}.svelte`, `GameShell.svelte`, locale messages, component tests.

- [ ] Render source TURN/AUTO ribbon, enemy plates/target, hero plate, combat feed, Heal/Item/Flee intervention tiles.
- [ ] Target buttons -> `requestBattleCycleTarget`; Heal -> existing helper; Item -> local consumable selector then existing `requestUseItem`; Flee -> `requestBattleFlee`.
- [ ] Replace current summary presentation with Heroic Victory rewards and one Continue using existing dismiss command. Fled result never opens summary.
- [ ] Test target/Heal/Item/Flee commands and Victory Continue; run component + scene tests + check.
- [ ] Commit `feat: add Heroic battle and victory UI`.

---

### Task 11: Minimal Generic Pad UI Navigation, Existing Bridge Only

**Files:** new `core/gamepad.ts` + tests, `GameShell.svelte`, `PromptGlyph.svelte`, bridge store/component tests.

- [ ] Implement one pure snapshot/edge normalizer:

```ts
export type GamepadUiAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'confirm' | 'cancel' | 'action'
  | 'tab-left' | 'tab-right' | 'menu';
```

Use D-pad + dead-zoned stick for directional booleans and edge-trigger face/shoulder/menu buttons.

- [ ] Add `resolvePromptModality(promptMode, lastModality)` for Auto/Pad/Keys.
- [ ] One `GameShell` rAF loop reads `navigator.getGamepads()?.[0]` and routes actions according to local UI context: title/command/overlay focus, confirm/cancel, LB/RB, dialogue commands, battle target/intervention commands.
- [ ] Do **not** poll gamepads in WorldScene/BattleScene, emit `gliese:menu-request`, synthesize keyboard events, or claim analog field movement.
- [ ] Stub `navigator.getGamepads` in browser tests: Auto glyph switch, Pad forced glyphs, Menu opens command grid locally, overlay confirm/cancel, battle target bridge command.
- [ ] Run gamepad + component tests + check; commit `feat: add generic Heroic pad navigation`.

---

### Task 12: Production Art + Human Visual Review Evidence + Final Gates

**Files:** `public/game/assets/heroic-ui/*`, `content/heroic-ui.ts`, relevant screen components, `tools/validate-heroic-ui-art.ts`, `tests/e2e/heroic-ui-review.e2e.ts`, `docs/visual-references/heroic-ui/{source,runtime}/*.png`, `package.json`.

- [ ] Add Sharp-based validation using the existing repo pattern. Validate title art, five **neutral-only** busts, portraits, Liam paper doll, eight menu icons, combat icons, Slime/Ruins Warden plates, victory flourish, and required transparency/dimensions. No unused mood variants.
- [ ] Add `art:validate:heroic-ui` package script and integrate only approved production art; canonical review states must not show fallback/missing images.
- [ ] Export source canvases to stable names `01-title.png` through `10-system.png` under `docs/visual-references/heroic-ui/source/`.
- [ ] Add Playwright review capture at 1440×900 using `page.screenshot({ path })`, **not** `expect(page).toHaveScreenshot`.
- [ ] Reach states honestly:
  - raw Title with seeded slots,
  - Field via `startNewRunFromTitle`,
  - Bag/Gear/Quest/Map/Skill/Save/System via real command grid/keys,
  - Shop via real shop interaction,
  - Dialogue via real NPC interaction,
  - Battle/Victory via existing encounter/battle E2E path.
- [ ] Before each capture add structural assertions: Continue enabled, 24 Bag slots, unaffordable Buy disabled, target visible, Skill empty copy, etc. These fail on wrong state, not rasterization variance.
- [ ] Save matching runtime images under `docs/visual-references/heroic-ui/runtime/`; add Map/Skill regression captures.
- [ ] Run `rg "glass-panel|glass-button|arcane-|Cinzel" src/lib/game src/app.css src/main.ts`; redesigned Heroic surfaces should have no old material/font matches.
- [ ] Human-review every source/runtime pair for geometry, typography/wrapping, gradients/borders/inlay, states, art crop, shadows/glow, prompts. Any intentional deviation is written on PR #39 and explicitly approved. Do not add a pixel threshold.
- [ ] Run final gates:

```bash
bun run art:validate:heroic-ui
bun run test:unit -- --run
bun run check
bun run lint
bun run test:e2e
bun run build:tauri
```

Expected: all PASS.

- [ ] Commit `test: lock Heroic UI review evidence`.

---

## Execution Notes

- TDD each task: focused failing test -> minimal implementation -> focused green test -> commit.
- Every commit stays green. Task 3 is intentionally atomic because splitting Title, slots, save timing, and E2E creates a broken intermediate branch.
- `GameShell` owns overlays/pause/focus and the only gamepad UI poll loop. Child screens receive props/callbacks.
- `storage.ts` is runtime persistence entry; `slots.ts` is pure envelope logic.
- `i18n/store.ts` is the single preference/locale store path.
- Reuse current behavior whenever the mockup only changes presentation.
- New gameplay is limited to target selection and deterministic Flee; Heal/Item stay existing behavior.
- Skill, Audio, testimony gauges, dialogue mood selection, and full controller movement remain unavailable/deferred rather than fabricated.
- Source/runtime PNGs are human-review evidence, not CI goldens.
- The supplied 1440×900 source beats older Arcane/Glass layout decisions.
