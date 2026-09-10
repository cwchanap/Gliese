# Heroic UI Full Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gliese's current mixed JRPG HUD/windows with the supplied Heroic UI across the full playable flow while preserving shipping Tauri persistence and adding only the minimum title, save, dialogue, battle, preference, focus, and pad behavior required to make the mockup honest.

**Architecture:** Preserve pure TypeScript game rules, Phaser runtime ownership, Svelte presentation, and `ui-bridge/events.ts` as the runtime boundary. `GameShell.svelte` remains composition/pause/focus owner; focused screen components own markup only. Reuse `SaveStorage`, explicitly update the Tauri key-to-file adapter, use one preference record at `gliese.preferences.v1`, and keep new runtime behavior behind small pure helpers.

**Tech Stack:** TypeScript 6, Svelte 5, Phaser 4, Vite 8, Tauri 2, Tailwind 4, Vitest/browser-svelte, Playwright, `@fontsource`, Sharp.

**Spec:** `docs/superpowers/specs/2026-09-04-heroic-ui-full-visual-parity-design.md`

## Global Constraints

- Continue on `feat/heroic-ui-parity` / draft PR #39. One ticket, one PR.
- Every task leaves the branch runnable and affected tests green.
- Canonical visual-review viewport is exactly **1440×900**.
- Current core CI already runs Playwright E2E; do not add an Asset Integrity path-filter workaround.
- Review captures live outside `tests/e2e/**/*.e2e.ts` and are not part of the normal CI gate.
- No router, new store library, generic design system, third HUD/menu event bus, turn-based rewrite, audio runtime, crafting, party/roster system, skill registry/tree, witness gauge, controller remapping, rumble, or brand-specific glyphs.
- One preference record: `gliese.preferences.v1`. No `gliese.ui-preferences.v1`.
- One save-slot envelope: `gliese.saves.v1`. No runtime fallback to `gliese.save.v9` after cutover.
- Slot 1 autosave only; Slots 2/3 manual; Continue = newest `savedAt`.
- Fog-only movement never writes storage. Successful durable save-state mutations do autosave.
- Skill is a localized empty/unavailable surface, not invented content.
- Dialogue ships neutral busts only.
- HUD Density is source-visible but fixed to Quiet; Full is disabled/unavailable in this slice.
- Pad support is UI navigation/commands only; Phaser keyboard field movement remains unchanged.
- Human source/runtime PNG review is the visual gate; do not add `toHaveScreenshot`/`maxDiffPixels` CI goldens.
- Each source-backed surface is captured/reviewed in the task that implements it.

## Risks

- **Shipping persistence:** Tauri persists only configured keys; `gliese.saves.v1` and its adapter tests land atomically with the slot cutover.
- **Data loss:** removing fog autosaves must not lose purchases, equipment, quests, pickups, or discoveries.
- **E2E boot:** field-first E2E calls move behind a helper before Title exists, so lazy boot later changes only the helper body.
- **Focus/navigation:** a pure directional focus reducer lands with the command grid before gamepad polling.
- **Visual timing:** each surface gets a 1440×900 review capture immediately; the final task is a sweep, not first contact with the mockup.

## File Ownership

```text
src/lib/game/
  GameShell.svelte
  DialoguePanel.svelte
  ui/
    TitleScreen.svelte
    FieldHud.svelte
    CommandGrid.svelte
    BagScreen.svelte
    ShopScreen.svelte
    QuestJournal.svelte
    AreaMapScreen.svelte
    SkillScreen.svelte
    BattleHud.svelte
    BattleSummary.svelte
    SaveScreen.svelte
    SystemScreen.svelte
    PromptGlyph.svelte
    heroic-ui.css
  content/heroic-ui.ts
  core/
    text-reveal.ts
    battle-presentation.ts
    menu-focus.ts
    gamepad.ts
  save/
    storage.ts
    slots.ts
    playtime.ts
    thumbnail.ts
    tauri-storage.ts
  phaser/createGame.ts
  phaser/scenes/{BootScene,WorldScene,BattleScene}.ts
  ui-bridge/{events,store}.ts
  i18n/{preferences,store}.ts
  i18n/messages/{en,ja,zh-Hant,locale-parity.test}.ts
src/app.css
tests/e2e/helpers/game.ts
tests/review/heroic-ui.review.ts
playwright.review.config.ts
docs/visual-references/heroic-ui/{source,runtime}/
```

Do not create `ui/preferences.ts`, `content/skills.ts`, `gliese:menu-request`, or a second save adapter.

---

### Task 0: Guardrails Before UI Behavior Changes

**Files:**
- Create: `src/lib/game/i18n/messages/locale-parity.test.ts`
- Create: `tests/e2e/helpers/game.ts`
- Create: `playwright.review.config.ts`
- Create: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/source/01-title.png` through `10-system.png`
- Modify: `tests/e2e/game.e2e.ts`
- Modify: `tests/e2e/complete-world-layout-journey.e2e.ts`
- Modify: `tests/e2e/meadow-entry-painted-v2-complete.e2e.ts`

**Interfaces:**
- Produces `startNewRunFromTitle(page: Page): Promise<void>` while current boot still starts the field directly.
- Produces a separate Playwright review config with `viewport: { width: 1440, height: 900 }`.
- Produces a locale leaf-path parity test used by all later localization work.

- [ ] **Step 1: Add failing locale-parity coverage**

Create `locale-parity.test.ts` with a small leaf-path flattener and assertions against English:

```ts
function leafPaths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix];
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

expect(new Set(leafPaths(ja))).toEqual(new Set(leafPaths(en)));
expect(new Set(leafPaths(zhHant))).toEqual(new Set(leafPaths(en)));
```

Run:

```bash
bun run test:unit -- --run src/lib/game/i18n/messages/locale-parity.test.ts
```

Expected: PASS on the current locale set.

- [ ] **Step 2: Introduce the E2E boot helper before Title exists**

```ts
import { expect, type Page } from '@playwright/test';

export async function startNewRunFromTitle(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
}
```

Migrate the current field-first `page.goto('/')` call sites in all three E2E files to this helper. Keep raw `page.goto('/')` only for tests whose subject is the root/title itself.

Run:

```bash
bun run build
bun run test:e2e
```

Expected: PASS with no production behavior change.

- [ ] **Step 3: Add manual review capture routing outside normal E2E**

Create `playwright.review.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/review',
  testMatch: '**/*.review.ts',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1440, height: 900 }
  },
  webServer: {
    command: 'bun run preview -- --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: true
  }
});
```

Create `tests/review/heroic-ui.review.ts` with no source-backed case yet; only assert the review viewport helper and a root boot smoke case. Later tasks add concrete captures.

- [ ] **Step 4: Export the ten mockup source canvases**

Store the supplied reference canvases as stable `01-title.png` through `10-system.png` under `docs/visual-references/heroic-ui/source/`. These are reference evidence only.

- [ ] **Step 5: Verify the guardrail checkpoint**

```bash
bun run test:unit -- --run src/lib/game/i18n/messages/locale-parity.test.ts
bun run build
bun run test:e2e
bunx playwright test --config=playwright.review.config.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/i18n/messages/locale-parity.test.ts tests/e2e tests/review playwright.review.config.ts docs/visual-references/heroic-ui/source
git commit -m "test: add Heroic UI review guardrails"
```

---

### Task 1: Extract Screen Bodies Without Visual Changes

**Files:**
- Create: `src/lib/game/ui/FieldHud.svelte`
- Create: `src/lib/game/ui/BagScreen.svelte`
- Create: `src/lib/game/ui/ShopScreen.svelte`
- Create: `src/lib/game/ui/QuestJournal.svelte`
- Create: `src/lib/game/ui/AreaMapScreen.svelte`
- Modify: `src/lib/game/GameShell.svelte`
- Modify/Test: `src/lib/game/GameShell.svelte.spec.ts`

**Interfaces:**
- `GameShell` remains the sole owner of overlay-open state, pause ownership, focus restore, and bridge requests.
- Extracted components receive render state and callbacks; they do not import Phaser.

- [ ] **Step 1: Add characterization tests**

Add/retain tests that prove Menu -> Inventory, Shop, Quest, Map, Escape close, and focus restoration work before extraction.

Run:

```bash
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Extract current markup with existing classes unchanged**

For each screen, move only its markup/render helpers. Example boundary:

```ts
type BagScreenProps = {
  open: boolean;
  inventory: HudInventoryState;
  onClose: () => void;
  onUseItem: (itemId: string) => void;
  onEquip: (itemId: string) => void;
  onUnequip: (slot: EquipmentSlot) => void;
};
```

Do not change Arcane/Glass classes, typography, colors, or boot behavior in this task.

- [ ] **Step 3: Verify behavior-preserving extraction**

```bash
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts
bun run check
bun run test:e2e
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/game/GameShell.svelte src/lib/game/GameShell.svelte.spec.ts src/lib/game/ui
git commit -m "refactor: extract game shell screens"
```

---

### Task 2: Heroic Theme + Unified Preferences + System Surface

**Files:**
- Modify: `src/app.css`
- Modify: `src/main.ts`
- Modify: `src/lib/game/i18n/preferences.ts`
- Modify: `src/lib/game/i18n/store.ts`
- Modify: `src/lib/game/save/tauri-storage.ts`
- Modify/Test: `src/lib/game/save/tauri-storage.test.ts`
- Modify: `src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts`
- Create: `src/lib/game/ui/heroic-ui.css`
- Create: `src/lib/game/ui/SystemScreen.svelte`
- Create: `src/lib/game/ui/PromptGlyph.svelte`
- Modify/Test: preference and component tests
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/10-system.png`

**Interfaces:**
- Produces one `UiPreferences` record at `gliese.preferences.v1`.
- `UiPreferences` contains `locale`, `textSpeed`, `motion`, `promptMode`; **no `hudDensity` field**.
- System shows HUD Density with Quiet selected and Full disabled/unavailable.

- [ ] **Step 1: Write preference tests**

```ts
export type UiPreferences = {
  locale: Locale;
  textSpeed: 'slow' | 'normal' | 'instant';
  motion: 'on' | 'reduced';
  promptMode: 'auto' | 'pad' | 'keys';
};
```

Test valid JSON, malformed JSON fallback, old raw `ja` fallback, and update persistence.

- [ ] **Step 2: Replace the old raw locale storage contract**

Use only:

```ts
export const PREFERENCES_STORAGE_KEY = 'gliese.preferences.v1';

export function loadPreferences(storage?: SaveStorage): UiPreferences;
export function savePreferences(value: UiPreferences, storage?: SaveStorage): void;
```

In `i18n/store.ts`, make locale a view of the same record:

```ts
export function initializePreferences(): UiPreferences;
export function getActivePreferences(): UiPreferences;
export function updatePreferences(patch: Partial<UiPreferences>): void;
export function setActiveLocale(locale: Locale): void;
```

`setActiveLocale(locale)` delegates to `updatePreferences({ locale })`.

Update `tauri-storage.ts` to import/use `PREFERENCES_STORAGE_KEY` while keeping the existing `gliese-preferences.json` file routing. Update its preference hydration/write tests to store the new JSON document rather than a raw locale string.

- [ ] **Step 3: Introduce the Heroic token source**

Replace current Arcane theme tokens in `src/app.css`:

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

Add bundled Zen Maru Gothic and remove Cinzel imports. Keep repeated Heroic frame/plate/motion classes in `heroic-ui.css`; do not duplicate token values there.

- [ ] **Step 4: Build the System screen**

Rows:

- Language: real `en` / `ja` / `zh-Hant`.
- Text Speed: Slow / Normal / Instant.
- HUD Density: Quiet selected; Full disabled with localized unavailable explanation.
- Motion: On / Reduced.
- Prompts: Auto / Pad / Keys.
- Audio rail: disabled/unavailable.
- Input rail: focuses Prompts.

Reduced motion must obey both preference and OS `prefers-reduced-motion`.

- [ ] **Step 5: Keep locale parity enforced**

```bash
bun run test:unit -- --run src/lib/game/i18n/messages/locale-parity.test.ts src/lib/game/save/tauri-storage.test.ts
```

Expected: PASS after adding all System copy to all three locales and preserving the Tauri preference-file route.

- [ ] **Step 6: Add and inspect the System review capture**

Add a concrete `System` case to `tests/review/heroic-ui.review.ts`, reach it through the real current menu path, assert English / Normal / Quiet / On / Auto, then:

```ts
await page.screenshot({
  path: 'docs/visual-references/heroic-ui/runtime/10-system.png'
});
```

Run:

```bash
bun run build
bunx playwright test --config=playwright.review.config.ts --grep "System"
```

Expected: PASS; manually compare `10-system.png` source/runtime before moving on.

- [ ] **Step 7: Commit**

```bash
git add src/app.css src/main.ts src/lib/game/i18n src/lib/game/ui package.json bun.lock tests/review docs/visual-references/heroic-ui/runtime/10-system.png
git commit -m "feat: add Heroic theme and system preferences"
```

---

### Task 3: Atomic Title + Slot Save Cutover + Shipping Tauri Persistence

**Files:**
- Create: `src/lib/game/save/slots.ts`
- Create: `src/lib/game/save/playtime.ts`
- Create: `src/lib/game/save/thumbnail.ts`
- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/save/tauri-storage.ts`
- Modify/Test: `src/lib/game/save/{storage,tauri-storage}.test.ts`
- Modify: `src/lib/game/phaser/createGame.ts`
- Modify: `src/lib/game/phaser/scenes/{BootScene,WorldScene}.ts`
- Modify/Test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/ui-bridge/{events,store}.ts`
- Create: `src/lib/game/ui/{TitleScreen,SaveScreen}.svelte`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `tests/e2e/helpers/game.ts`
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `public/game/assets/heroic-ui/title-key-art.png`
- Create: `docs/visual-references/heroic-ui/runtime/{01-title,09-save}.png`

**Interfaces:**
- Produces `SAVE_SLOTS_STORAGE_KEY = 'gliese.saves.v1'`.
- Removes old runtime `SAVE_STORAGE_KEY`, `loadStoredSaveState/Result`, `saveGameState`, `save`, `resume-save`, and `HudState.canResume`.
- Produces Tauri key-to-file mapping for save slots and preferences.
- Produces bounded thumbnail write fallback.

- [ ] **Step 1: Write slot-envelope tests**

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

export type SaveSlotWriteResult = {
  state: SaveSlotsState;
  thumbnailDropped: boolean;
};
```

Test:

- Slot 0 only accepts `kind:'autosave'`.
- Slots 1/2 only accept `kind:'manual'`.
- newest slot uses `savedAt`.
- invalid envelope -> empty state.
- no legacy key read.
- synchronous quota failure retries without thumbnails.

- [ ] **Step 2: Implement slot storage API**

```ts
export const SAVE_SLOTS_STORAGE_KEY = 'gliese.saves.v1';

export function loadSaveSlots(storage?: SaveStorage): SaveSlotsState;
export function getNewestSaveSlot(storage?: SaveStorage):
  | { index: SaveSlotIndex; record: SaveSlotRecord }
  | null;
export function writeSaveSlot(
  index: SaveSlotIndex,
  record: SaveSlotRecord,
  storage?: SaveStorage
): SaveSlotWriteResult;
```

`writeSaveSlot` first writes the full envelope. If `setItem` throws, remove all `thumbnail` fields and retry once. If retry succeeds, return `thumbnailDropped:true`; if retry also throws, rethrow so the caller can publish a real save failure.

- [ ] **Step 3: Bound thumbnail metadata**

`thumbnail.ts` constants:

```ts
export const SAVE_THUMBNAIL_WIDTH = 256;
export const SAVE_THUMBNAIL_HEIGHT = 144;
export const SAVE_THUMBNAIL_MAX_BYTES = 40 * 1024;
export const SAVE_THUMBNAIL_JPEG_QUALITY = 0.72;
```

Capture as JPEG. If the encoded data URL exceeds the ceiling, return `undefined`.

- [ ] **Step 4: Fix the shipping Tauri key-to-file boundary**

Replace hardcoded key branches with an explicit table:

```ts
type PersistedFileSpec = {
  fileName: string;
  tmpName: string;
  queue: WriteQueue;
};

const persistedFiles = new Map<string, PersistedFileSpec>([
  [SAVE_SLOTS_STORAGE_KEY, saveSlotsSpec],
  [PREFERENCES_STORAGE_KEY, preferencesSpec]
]);
```

Hydration iterates the map. `setItem` / `removeItem` schedule only when `persistedFiles.get(key)` exists. `flushPendingWrites()` awaits every mapped queue.

Add tests proving:

- `gliese.saves.v1` hydrates/writes `gliese-save.json`.
- `gliese.preferences.v1` still hydrates/writes preferences.
- an unknown key remains cache-only and does **not** call `writeTextFile`.
- flush waits for both configured queues.

- [ ] **Step 5: Add explicit start requests**

```ts
export type GameStartRequest =
  | { reason: 'new'; saveState: null }
  | { reason: 'resume'; saveState: SaveState };
```

`createGame(target, start)` stores/forwards this request and `BootScene` starts `WorldScene` with it after preload.

- [ ] **Step 6: Write save-timing tests before changing WorldScene**

Required cases:

1. new-run readiness writes Slot 0,
2. completed transition writes Slot 0,
3. applied battle result writes Slot 0,
4. fog-only movement mutates exploration in memory but writes nothing,
5. successful buy/equip/use/quest mutation writes Slot 0,
6. newly collected pickup writes Slot 0,
7. newly seen discovery writes Slot 0,
8. dialogue action that changes quest state writes Slot 0,
9. pure dialogue navigation with no SaveState change writes nothing.

- [ ] **Step 7: Implement durable-mutation autosave without per-step writes**

Split command application from persistence:

```ts
private handleHudCommand(command: HudCommand) {
  const before = serializeSaveState(this.buildSaveState());
  this.applyHudCommand(command);
  const after = this.buildSaveState();

  if (serializeSaveState(after) !== before) {
    this.writeAutosave(after);
  }
}
```

Do not use this wrapper for non-WorldScene battle commands.

At world pickup/discovery success points, call `writeAutosave(this.buildSaveState())` after adding the new durable ID. Do not autosave from fog reveal/movement itself.

Map transitions and applied battle results continue to autosave explicitly.

- [ ] **Step 8: Remove the old save bridge/runtime API atomically**

Delete old single-save runtime functions/constants and convert all call sites. Replace manual save with:

```ts
| { type: 'save-slot'; slot: 1 | 2 }
```

Remove `resume-save` entirely because Continue now belongs to Title.

- [ ] **Step 9: Build Title and Save**

Title:

- Continue newest valid slot; disabled if none.
- New Run.
- System.
- Phaser not mounted until Continue/New Run.

Save:

- Slot 1 display-only autosave.
- Slots 2/3 manual.
- overwrite confirmation.
- location/playtime/timestamp/thumbnail.
- if `thumbnailDropped`, show localized “Saved without preview image” status.

- [ ] **Step 10: Change only the pre-migrated E2E helper body**

```ts
export async function startNewRunFromTitle(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /New Run/i }).click();
  await expect(page.locator('canvas')).toBeVisible();
}
```

Add one real Continue E2E by seeding `gliese.saves.v1`.

- [ ] **Step 11: Add production Title art and review Title/Save immediately**

Generate/integrate `title-key-art.png` at 1440×900 before capture.

Add review cases with explicit structural assertions and write:

- `01-title.png`
- `09-save.png`

Run:

```bash
bun run test:unit -- --run src/lib/game/save/storage.test.ts src/lib/game/save/tauri-storage.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
bun run build
bun run test:e2e
bunx playwright test --config=playwright.review.config.ts --grep "Title|Save"
```

Expected: PASS; manually compare both source/runtime pairs.

- [ ] **Step 12: Commit**

```bash
git add src/lib/game/save src/lib/game/phaser src/lib/game/ui-bridge src/lib/game/ui/TitleScreen.svelte src/lib/game/ui/SaveScreen.svelte src/lib/game/GameShell.svelte tests/e2e/helpers tests/review public/game/assets/heroic-ui/title-key-art.png docs/visual-references/heroic-ui/runtime
git commit -m "feat: add title and slot-based saves"
```

---

### Task 4: Heroic Field HUD + Directional Focus Foundation

**Files:**
- Create: `src/lib/game/core/menu-focus.ts`
- Create/Test: `src/lib/game/core/menu-focus.test.ts`
- Modify: `src/lib/game/ui/{FieldHud,CommandGrid}.svelte`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: locale messages/tests
- Create: `public/game/assets/heroic-ui/liam-portrait.png`
- Create: `public/game/assets/heroic-ui/icons/{bag,gear,quest,map,skill,rest,save,system}.svg`
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/02-field.png`

**Interfaces:**
- Produces `resolveMenuFocusTarget(...)` for keyboard and later gamepad use.
- Produces exact eight-command ordering.
- Keeps Quiet as the only real field density.

- [ ] **Step 1: Write focus reducer tests**

```ts
export type MenuFocusDirection = 'up' | 'down' | 'left' | 'right';

export type MenuFocusNode = {
  id: string;
  row: number;
  column: number;
  disabled?: boolean;
};

export function resolveMenuFocusTarget(
  nodes: readonly MenuFocusNode[],
  currentId: string | null,
  direction: MenuFocusDirection
): string | null;
```

Test 4×2 movement, disabled skipping, edge staying on current item, and null-current choosing the first enabled node.

- [ ] **Step 2: Implement the exact command grid**

```ts
type FieldCommand =
  | 'bag' | 'gear' | 'quest' | 'map'
  | 'skill' | 'rest' | 'save' | 'system';
```

Order: Bag, Gear, Quest, Map, Skill, Rest, Save, System.

- [ ] **Step 3: Wire directional DOM focus**

Heroic focusable controls expose `data-focus-id`, `data-focus-row`, `data-focus-column`. `GameShell` collects currently visible/enabled nodes, calls `resolveMenuFocusTarget`, and focuses the returned element for keyboard arrows.

Do not move overlay-open state out of `GameShell`.

- [ ] **Step 4: Implement the Quiet Field source geometry**

Render portrait/level/HP/XP, quest banner, minimap/location treatment from existing area-map state, wallet, status, and command grid.

- [ ] **Step 5: Add source art and capture Field**

Integrate Liam portrait + eight command icons. Add a review case that starts a real New Run, asserts the eight commands and Quiet layout state, then captures `02-field.png`.

Run:

```bash
bun run test:unit -- --run src/lib/game/core/menu-focus.test.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
bunx playwright test --config=playwright.review.config.ts --grep "Field"
```

Expected: PASS; manually compare `02-field.png`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/core/menu-focus* src/lib/game/ui src/lib/game/GameShell.svelte public/game/assets/heroic-ui tests/review docs/visual-references/heroic-ui/runtime/02-field.png
git commit -m "feat: add Heroic field command HUD"
```

---

### Task 5: Bag/Gear + Honest Skill Surface

**Files:**
- Modify: `src/lib/game/ui/BagScreen.svelte`
- Create: `src/lib/game/ui/SkillScreen.svelte`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: locale messages/tests
- Create: `public/game/assets/heroic-ui/liam-paper-doll.png`
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/03-bag.png`
- Create: `docs/visual-references/heroic-ui/runtime/skill-regression.png`

**Interfaces:**
- Bag keeps existing inventory/equipment bridge commands.
- Skill has no IDs, registry, levels, save state, or combat behavior.

- [ ] **Step 1: Add component tests**

Assert exactly 24 Bag slots, Gear deep-link, five equipment positions, and Skill empty/unavailable copy.

- [ ] **Step 2: Implement source Bag categories**

- Potions -> current consumables.
- Gear -> current equipment.
- Key -> current key items.
- Loot -> fixed empty grid because there is no material item type.

Keep existing equip/unequip/use command paths.

- [ ] **Step 3: Add paper-doll art and Heroic layout**

Integrate Liam paper doll at 700×1200 source resolution and render the five equipment slots around it.

- [ ] **Step 4: Implement Skill as an honest empty surface**

Localized “No skills learned yet” plus Back/focus behavior. Do not create `content/skills.ts`.

- [ ] **Step 5: Capture Bag and Skill**

Reach both from the real Field command grid. Capture `03-bag.png` and `skill-regression.png`.

Run:

```bash
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts
bun run check
bunx playwright test --config=playwright.review.config.ts --grep "Bag|Skill"
```

Expected: PASS; manually compare Bag source/runtime and inspect Skill regression.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/ui src/lib/game/GameShell.svelte public/game/assets/heroic-ui/liam-paper-doll.png tests/review docs/visual-references/heroic-ui/runtime
git commit -m "feat: finish Heroic bag and skill state"
```

---

### Task 6: Shop + Canonical Equipment Preview

**Files:**
- Modify: `src/lib/game/core/stats.ts`
- Modify/Test: `src/lib/game/core/stats.test.ts`
- Modify: `src/lib/game/ui/ShopScreen.svelte`
- Modify: locale messages/tests
- Create: `public/game/assets/heroic-ui/busts/{mira,quartermaster-vale,blacksmith-oren}.png`
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/04-shop.png`

**Interfaces:**
- Produces `previewEquipmentSwap(...)` and reuses `deriveEffectiveStats`.
- Shop arithmetic remains outside Svelte.

- [ ] **Step 1: Write failing `previewEquipmentSwap` tests**

Use Traveler Vest and an occupied slot case.

```ts
export function previewEquipmentSwap(input: {
  base: BaseStats;
  equipment: EquipmentState;
  itemId: string;
}): {
  slot: EquipmentSlot;
  replacedItemId: string | null;
  before: EffectiveStats;
  after: EffectiveStats;
} | null;
```

- [ ] **Step 2: Implement with `deriveEffectiveStats` only**

Clone equipment, replace the candidate slot, call `deriveEffectiveStats` before/after. Do not duplicate modifier arithmetic.

- [ ] **Step 3: Build the Heroic Shop**

Render merchant art, Buy/Sell, selected detail, price/owned, wallet before/after, unaffordable state, and canonical stat deltas.

- [ ] **Step 4: Capture Shop**

Reach a real shop, select an unaffordable equipment item, assert Buy is disabled and delta values are shown, then capture `04-shop.png`.

Run:

```bash
bun run test:unit -- --run src/lib/game/core/stats.test.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
bunx playwright test --config=playwright.review.config.ts --grep "Shop"
```

Expected: PASS; manually compare source/runtime.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/core/stats* src/lib/game/ui/ShopScreen.svelte public/game/assets/heroic-ui/busts tests/review docs/visual-references/heroic-ui/runtime/04-shop.png
git commit -m "feat: add Heroic shop"
```

---

### Task 7: Quest Journal + Area Map Chrome

**Files:**
- Modify: `src/lib/game/ui/{QuestJournal,AreaMapScreen}.svelte`
- Modify: locale messages/tests
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/05-quest.png`
- Create: `docs/visual-references/heroic-ui/runtime/map-regression.png`

**Interfaces:**
- Reuses current `HudQuestState` and `HudAreaMapState`.
- Adds no route/pathfinding data.

- [ ] **Step 1: Add component tests**

Assert main/side/offer differentiation, objective/reward detail, map marker rendering, and pause/focus behavior.

- [ ] **Step 2: Implement Heroic Quest source layout**

Render progress rings, selected quest detail, objective chain, rewards, giver/location, and existing map context.

- [ ] **Step 3: Restyle Area Map only**

Preserve fog, markers, focus, and map logic; replace chrome/materials only.

- [ ] **Step 4: Capture Quest + Map regression**

Reach both via real Field commands. Capture `05-quest.png` and `map-regression.png`.

Run:

```bash
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts
bun run check
bunx playwright test --config=playwright.review.config.ts --grep "Quest|Map"
```

Expected: PASS; manually compare Quest and inspect Map regression.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/ui/QuestJournal.svelte src/lib/game/ui/AreaMapScreen.svelte tests/review docs/visual-references/heroic-ui/runtime
git commit -m "feat: add Heroic quest and map windows"
```

---

### Task 8: Neutral Dialogue Busts + Pure Text Reveal

**Files:**
- Create: `src/lib/game/core/text-reveal.ts`
- Create/Test: `src/lib/game/core/text-reveal.test.ts`
- Modify/Create: `src/lib/game/content/heroic-ui.ts`
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/DialoguePanel.svelte`
- Modify/Test: dialogue component/scene tests
- Create: `public/game/assets/heroic-ui/busts/{liam,guild-master-arlen}.png`
- Modify: locale messages/tests
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/06-dialogue.png`

**Interfaces:**
- Produces pure reveal helpers.
- HUD dialogue render state gains `npcId: string | null`.
- Bust lookup is stable-NPC-ID -> one neutral path only.

- [ ] **Step 1: Write reveal tests**

```ts
export function getTextSpeedMs(speed: UiPreferences['textSpeed']): number;
export function getVisibleText(
  text: string,
  visibleCharacters: number,
  speed: UiPreferences['textSpeed']
): string;
export function resolveDialogueConfirm(input: {
  visibleCharacters: number;
  totalCharacters: number;
}): 'reveal' | 'advance';
```

Test Slow/Normal/Instant, reveal-first confirm, and fully revealed advance.

- [ ] **Step 2: Extend dialogue render identity**

Copy `DialogueSession.npcId` into HUD dialogue state. Do not match speaker strings.

- [ ] **Step 3: Add neutral bust metadata**

Map supported IDs to one neutral asset path. Reuse Shop busts for Mira/Vale/Oren and add Liam/Arlen. No mood enum.

- [ ] **Step 4: Implement reveal interaction**

New line resets reveal. Instant renders full line. First confirm during reveal completes the line. Second confirm advances. Choices cannot activate before full reveal.

- [ ] **Step 5: Capture Dialogue**

Reach a real NPC interaction, assert correct `npcId` bust and line state, then capture `06-dialogue.png`.

Run:

```bash
bun run test:unit -- --run src/lib/game/core/text-reveal.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bunx playwright test --config=playwright.review.config.ts --grep "Dialogue"
```

Expected: PASS; manually compare source/runtime.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/core/text-reveal* src/lib/game/content/heroic-ui.ts src/lib/game/ui-bridge/events.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/DialoguePanel.svelte public/game/assets/heroic-ui/busts tests/review docs/visual-references/heroic-ui/runtime/06-dialogue.png
git commit -m "feat: add Heroic dialogue reveal"
```

---

### Task 9: Pure Battle Target / Ribbon / Feed / Flee Contracts

**Files:**
- Modify: `src/lib/game/core/battle.ts`
- Modify/Test: `src/lib/game/core/battle.test.ts`
- Create: `src/lib/game/core/battle-presentation.ts`
- Create/Test: `src/lib/game/core/battle-presentation.test.ts`

**Interfaces:**
- `BattleOutcome = 'victory' | 'defeat' | 'fled'`.
- `BattleSummary.outcome` remains `'victory' | 'defeat'`.
- `BattleApplication.summary` becomes nullable only for `fled`.

- [ ] **Step 1: Narrow the summary invariant before widening outcome**

```ts
export type BattleOutcome = 'victory' | 'defeat' | 'fled';

export type BattleSummary = {
  outcome: Extract<BattleOutcome, 'victory' | 'defeat'>;
  // existing fields unchanged
};

export type BattleApplication = {
  saveState: SaveState;
  summary: BattleSummary | null;
};
```

- [ ] **Step 2: Write fled-result tests**

Assert current HP/inventory/return position apply, summary is null, and there is no XP, coins, drops, quest defeat progress, or cleared encounter.

- [ ] **Step 3: Add pure target helpers**

Nearest living default and stable left/right cycle skipping defeated units.

- [ ] **Step 4: Add bounded feed/ribbon helpers**

Feed keeps newest 4 events. Ribbon sorts render entries by existing `readyAt` timestamps and never changes simulation order.

- [ ] **Step 5: Add deterministic flee helper**

```ts
export type FleeChannelState =
  | { status: 'idle' }
  | { status: 'channeling'; startedAt: number; durationMs: number };
```

Provide start/cancel/progress/complete with 2400ms default duration.

- [ ] **Step 6: Verify pure contracts**

```bash
bun run test:unit -- --run src/lib/game/core/battle.test.ts src/lib/game/core/battle-presentation.test.ts
bun run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/core/battle*
git commit -m "feat: add battle presentation contracts"
```

---

### Task 10: Battle Runtime + Heroic Battle HUD + Victory

**Files:**
- Modify: `src/lib/game/ui-bridge/{events,store}.ts`
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify/Test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Create: `src/lib/game/ui/{BattleHud,BattleSummary}.svelte`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: locale messages/tests
- Create: `public/game/assets/heroic-ui/enemies/{slime-scout,ruins-warden}.png`
- Create: `public/game/assets/heroic-ui/victory-flourish.png`
- Create: `public/game/assets/heroic-ui/battle-backdrop.png`
- Modify: `tests/review/heroic-ui.review.ts`
- Create: `docs/visual-references/heroic-ui/runtime/{07-battle,08-victory}.png`

**Interfaces:**
- Active battle HUD exposes current target, enemies, readiness ribbon, feed, heal count, item count, flee progress.
- Adds only `battle-cycle-target` and `battle-flee`; reuses existing Heal/Item/dismiss commands.
- No secondary gauge.

- [ ] **Step 1: Extend bridge state/commands**

```ts
| { type: 'battle-cycle-target'; direction: -1 | 1 }
| { type: 'battle-flee' }
```

Keep `HudBattleSummary.outcome` as `'victory' | 'defeat'`.

- [ ] **Step 2: Add BattleScene tests**

Test nearest initial target, cycle skipping defeated, selected target attack preference, feed entries, ribbon readiness, flee progress, damage cancellation, and successful fled handoff.

- [ ] **Step 3: Implement runtime telemetry**

Append feed events at existing damage/heal/defeat points. Derive ribbon from current cooldown timestamps. Do not alter current enemy AI/cooldown rules.

- [ ] **Step 4: Implement Flee**

On command start channel. Incoming hero damage cancels. At 2400ms completion, produce `BattleResult{outcome:'fled'}` with current HP/inventory.

`WorldScene` applies the fled result, writes Slot 0 as a battle-result checkpoint, keeps encounter uncleared, and opens no summary.

- [ ] **Step 5: Build Heroic Battle + Victory**

Battle: TURN/AUTO ribbon, enemy plates/target, hero plate, feed, Heal/Item/Flee tiles.

Victory: existing XP/coins/drops/foe/quest data and one Continue.

- [ ] **Step 6: Add production battle art and capture immediately**

Integrate enemy plate art, victory flourish, and source-compatible battle backdrop. Capture `07-battle.png` and `08-victory.png` via real encounter flow.

Run:

```bash
bun run test:unit -- --run src/lib/game/core/battle.test.ts src/lib/game/core/battle-presentation.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bunx playwright test --config=playwright.review.config.ts --grep "Battle|Victory"
```

Expected: PASS; manually compare both source/runtime pairs.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/ui-bridge src/lib/game/phaser/scenes src/lib/game/ui/Battle* src/lib/game/GameShell.svelte public/game/assets/heroic-ui tests/review docs/visual-references/heroic-ui/runtime
git commit -m "feat: add Heroic battle and victory UI"
```

---

### Task 11: Thin Generic Pad Layer Over the Existing Focus Model

**Files:**
- Create: `src/lib/game/core/gamepad.ts`
- Create/Test: `src/lib/game/core/gamepad.test.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/ui/PromptGlyph.svelte`
- Modify/Test: browser component tests

**Interfaces:**
- Reuses `resolveMenuFocusTarget` from Task 4.
- One `GameShell` rAF loop owns pad polling.
- No WorldScene/BattleScene gamepad polling and no new DOM event bus.

- [ ] **Step 1: Implement pure gamepad edge normalization**

```ts
export type GamepadUiAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'confirm' | 'cancel' | 'action'
  | 'tab-left' | 'tab-right' | 'menu';
```

Normalize D-pad and dead-zoned left stick to directions. Face/shoulder/menu buttons are edge-triggered.

- [ ] **Step 2: Implement prompt modality**

```ts
export function resolvePromptModality(
  promptMode: UiPreferences['promptMode'],
  lastModality: 'keys' | 'pad'
): 'keys' | 'pad';
```

- [ ] **Step 3: Route actions through existing focus/bridge seams**

- directions -> `resolveMenuFocusTarget` + DOM focus,
- confirm/cancel -> currently focused DOM control / overlay close,
- LB/RB -> active tab/rail,
- dialogue -> existing dialogue bridge helpers,
- battle target -> `battle-cycle-target`,
- battle intervention -> existing Heal/Item/Flee controls,
- menu -> local command grid open state.

Do not synthesize keyboard events or emit `gliese:menu-request`.

- [ ] **Step 4: Add browser tests with stubbed `navigator.getGamepads`**

Test Auto glyph switch, forced Pad/Keys, menu open, 4×2 command directional movement, Bag 6-column movement, LB/RB tabs, dialogue confirm/cancel, and battle target command.

- [ ] **Step 5: Verify**

```bash
bun run test:unit -- --run src/lib/game/core/gamepad.test.ts src/lib/game/core/menu-focus.test.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/core/gamepad* src/lib/game/GameShell.svelte src/lib/game/ui/PromptGlyph.svelte
git commit -m "feat: add generic Heroic pad navigation"
```

---

### Task 12: Art Validation + Final Parity Sweep + Release Gates

**Files:**
- Create: `tools/validate-heroic-ui-art.ts`
- Modify: `package.json`
- Modify: `tests/review/heroic-ui.review.ts`
- Modify as needed: `src/lib/game/ui/*`, `src/lib/game/content/heroic-ui.ts`
- Finalize: `docs/visual-references/heroic-ui/runtime/*.png`
- Finalize: `public/game/assets/heroic-ui/*`

**Interfaces:**
- No new gameplay interfaces.
- Produces `art:validate:heroic-ui`.
- Final evidence is source/runtime review PNGs, not pixel goldens.

- [ ] **Step 1: Add Sharp-based art validation**

Validate:

- `title-key-art.png`: 1440×900,
- neutral busts: transparent, source-sized for UI use,
- Liam portrait: square/high-resolution,
- Liam paper doll: 700×1200,
- eight command icons exist,
- Slime Scout / Ruins Warden plate art exists,
- victory flourish transparency,
- battle backdrop dimensions,
- no zero-byte or missing runtime art.

Add:

```json
"art:validate:heroic-ui": "bun tools/validate-heroic-ui-art.ts"
```

- [ ] **Step 2: Recapture every review surface at 1440×900**

Use the separate review config and real interactions. Required final files:

- `01-title.png`
- `02-field.png`
- `03-bag.png`
- `04-shop.png`
- `05-quest.png`
- `06-dialogue.png`
- `07-battle.png`
- `08-victory.png`
- `09-save.png`
- `10-system.png`
- `map-regression.png`
- `skill-regression.png`

Before each screenshot, assert the intended state structurally; do not use raster comparison.

- [ ] **Step 3: Remove obsolete visual language**

```bash
rg "glass-panel|glass-button|arcane-|Cinzel" src/lib/game src/app.css src/main.ts
```

Expected: no matches belonging to redesigned Heroic surfaces or old Cinzel imports.

- [ ] **Step 4: Human visual-parity sweep**

Compare each source/runtime pair for:

- geometry/spacing,
- typography/wrapping,
- gradients/borders/inlay,
- selected/disabled/danger states,
- art crop/composition,
- shadows/glow,
- prompt glyphs.

Any intentional deviation must be written on PR #39 and explicitly approved before merge.

- [ ] **Step 5: Run full automated gates**

```bash
bun run art:validate:heroic-ui
bun run test:unit -- --run
bun run check
bun run lint
bun run build
bun run test:e2e
bun run build:tauri
```

Expected: all PASS.

- [ ] **Step 6: Commit final evidence/cleanup**

```bash
git add tools/validate-heroic-ui-art.ts package.json src/lib/game public/game/assets/heroic-ui tests/review docs/visual-references/heroic-ui/runtime
git commit -m "test: finalize Heroic UI parity evidence"
```

---

## Execution Notes

- TDD each task: focused failing test -> minimal implementation -> focused green test -> commit.
- Task 0 creates the E2E start seam before Title exists; Task 3 changes only its body.
- Task 1 is behavior-preserving extraction; the visual-language swap starts in Task 2.
- `GameShell` owns overlays/pause/focus and the only gamepad UI poll loop. Child screens receive props/callbacks.
- `menu-focus.ts` is the shared directional focus rule for keyboard and pad.
- `storage.ts` is the storage interface/slot entry; `tauri-storage.ts` is the shipping file-backed key router.
- Fog movement updates map exploration in memory but does not write. Durable save-state mutations do write.
- `i18n/store.ts` is the single preference/locale store path.
- Reuse current behavior whenever the mockup only changes presentation.
- New gameplay is limited to target selection and deterministic Flee; Heal/Item stay existing behavior.
- Skill, Audio, Full HUD density, testimony gauges, dialogue mood selection, and controller field movement remain unavailable/deferred rather than fabricated.
- Each source-backed surface is reviewed when it lands; Task 12 is only the final sweep.
- Source/runtime PNGs are human-review evidence, not CI goldens.
- The supplied 1440×900 source beats older Arcane/Glass layout decisions.
