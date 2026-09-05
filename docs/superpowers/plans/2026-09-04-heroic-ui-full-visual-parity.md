# Heroic UI Full Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gliese's current mixed JRPG HUD/windows with the supplied Heroic UI across the full playable flow, including the minimum missing title, save, dialogue, battle, preference, prompt, and read-only skill mechanics required to make every visible control real.

**Architecture:** Keep canonical game rules in pure TypeScript, exploration/battle runtime in Phaser, DOM presentation in Svelte, and `ui-bridge/events.ts` as the only Phaser↔Svelte command/state boundary. Decompose the current `GameShell.svelte` presentation into focused Heroic screens while leaving `GameShell` as the composition/overlay owner; add narrow pure helpers for slots, preferences, playtime, battle presentation, and gamepad normalization rather than a new state-management or UI framework.

**Tech Stack:** TypeScript 6, Svelte 5 runes, Phaser 4, Vite 8, Tauri 2, Tailwind 4, Vitest + vitest-browser-svelte, Playwright, `@fontsource`, Sharp for asset-validation tests.

**Spec:** `docs/superpowers/specs/2026-09-04-heroic-ui-full-visual-parity-design.md`

## Global Constraints

- This is **one implementation slice and one PR**: continue on `feat/heroic-ui-parity` / PR #39; do not split the ticket into multiple PRs.
- The supplied `Gliese UI Heroic(1).html` is the visual authority for the ten source-backed surfaces: Title, Field HUD, Bag, Shop, Quest Journal, Dialogue, Battle, Victory, Save, System.
- Canonical source comparison viewport is exactly **1440×900**.
- Area Map and Skill use the same Heroic visual grammar but receive regression screenshots only because the source has no dedicated Map/Skill canvas.
- Preserve the current pure-TS / Phaser / Svelte / custom-event bridge ownership split.
- Do not add a router, state-management library, generic design-system package, new turn-based combat engine, audio system, crafting system, party/roster system, skill tree, skill points, controller remapping, rumble, or controller-brand-specific glyph sets.
- No legacy save migration is required. Old `gliese.save.v9` prototype data may be ignored/reset after the slot envelope lands.
- Source-selected System reference values are **English / Normal / Quiet / On / Auto**.
- Quiet HUD density must match the supplied Field HUD geometry. Full may add secondary detail without moving Quiet geometry.
- Slot 1 is autosave only. Slots 2 and 3 are manual. Continue resumes the newest valid `savedAt` record.
- Autosave only on initial WorldScene readiness, completed map transitions, and applied battle results. Do not autosave movement, pickups, dialogue lines, or HUD changes.
- Flee is deterministic: short channel, damage cancels, success gives no rewards/quest progress/encounter clear and returns to the encounter origin with current HP/inventory.
- All visible strings must be updated together for `en`, `ja`, and `zh-Hant`.
- New production art belongs under `public/game/assets/heroic-ui/`; no mockup `image-slot` placeholder may remain in runtime UI.
- Use bundled fonts only; no runtime Google Fonts/network dependency.
- Full visual parity accepts no intentional source deviation unless documented on PR #39 and explicitly approved before merge.

---

## File Structure Map

Lock these ownership boundaries before coding:

```text
src/lib/game/
  GameShell.svelte                  # title/playing mode + overlay composition only
  DialoguePanel.svelte              # Heroic dialogue surface + reveal interaction
  ui/
    TitleScreen.svelte              # title actions and latest-save summary
    FieldHud.svelte                 # quiet/full field status composition
    CommandGrid.svelte              # eight source commands
    BagScreen.svelte                # Potions/Gear/Key/Loot + paper doll
    ShopScreen.svelte               # buy/sell + equipment preview
    QuestJournal.svelte             # quest list/detail
    AreaMapScreen.svelte            # existing map renderer moved behind Heroic chrome
    SkillScreen.svelte              # read-only level-gated skill compendium
    BattleHud.svelte                # active battle telemetry/interventions
    BattleSummary.svelte            # victory/defeat result surface
    SaveScreen.svelte               # three slots + overwrite confirmation
    SystemScreen.svelte             # Display/Text + disabled Audio rail + Input jump
    PromptGlyph.svelte              # generic pad/key glyph rendering
    preferences.ts                  # typed UI preference persistence/store
    input-modality.ts               # prompt-mode resolution + last modality
    heroic-ui.css                   # Heroic tokens, frames, motion, semantic tints
  content/
    heroic-ui.ts                    # portrait/bust/paper-doll/enemy/title asset metadata
    skills.ts                       # tiny presentation-only skill registry
  core/
    battle-presentation.ts          # target cycle, ribbon, feed, flee-channel helpers
    gamepad.ts                      # pure Gamepad snapshot/action normalization
  save/
    slots.ts                        # 3-slot envelope read/write/latest helpers
    playtime.ts                     # in-memory playtime session clock
    thumbnail.ts                    # bounded 16:9 canvas thumbnail capture
  phaser/scenes/
    BootScene.ts                    # forwards explicit title start data after preload
    WorldScene.ts                   # manual/auto slot writes + pad exploration input
    BattleScene.ts                  # target/telemetry/feed/flee runtime
  ui-bridge/
    events.ts                       # extended render state + new commands
    store.ts                        # request helpers + slot-aware initial HUD
```

Keep presentation metadata out of story prose. `DialogueSession.npcId` already carries the stable identity needed to resolve bust art; do not duplicate dialogue text into frontend content.

---

### Task 1: Heroic Theme, Bundled Typography, and UI Preferences

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/main.ts`
- Modify: `src/app.css`
- Create: `src/lib/game/ui/heroic-ui.css`
- Create: `src/lib/game/ui/preferences.ts`
- Test: `src/lib/game/ui/preferences.test.ts`

**Interfaces:**
- Produces: `TextSpeed`, `HudDensity`, `MotionPreference`, `PromptMode`, `UiPreferences`
- Produces: `uiPreferences`, `initializeUiPreferences()`, `getUiPreferences()`, `updateUiPreferences(patch)`
- Later tasks consume `uiPreferences` for text reveal, HUD density, motion, and prompt mode.

- [ ] **Step 1: Write failing preference persistence/default tests**

Create `src/lib/game/ui/preferences.test.ts` with concrete expectations:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UI_PREFERENCES,
  UI_PREFERENCES_STORAGE_KEY,
  loadUiPreferences,
  saveUiPreferences
} from './preferences';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe('Heroic UI preferences', () => {
  it('uses the source-selected defaults for display/text controls', () => {
    expect(DEFAULT_UI_PREFERENCES).toEqual({
      textSpeed: 'normal',
      hudDensity: 'quiet',
      motion: 'on',
      promptMode: 'auto'
    });
  });

  it('round-trips one typed JSON preference record through SaveStorage', () => {
    const storage = memoryStorage();
    const preferences = {
      textSpeed: 'instant',
      hudDensity: 'full',
      motion: 'reduced',
      promptMode: 'keys'
    } as const;

    saveUiPreferences(preferences, storage);

    expect(storage.getItem(UI_PREFERENCES_STORAGE_KEY)).toBe(JSON.stringify(preferences));
    expect(loadUiPreferences(storage)).toEqual(preferences);
  });

  it('falls back to defaults for malformed values', () => {
    const storage = memoryStorage();
    storage.setItem(UI_PREFERENCES_STORAGE_KEY, '{"textSpeed":"warp"}');
    expect(loadUiPreferences(storage)).toEqual(DEFAULT_UI_PREFERENCES);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
bun run test:unit -- --run src/lib/game/ui/preferences.test.ts
```

Expected: FAIL because `ui/preferences.ts` does not exist.

- [ ] **Step 3: Implement the typed preference module and Svelte-readable store**

Create `src/lib/game/ui/preferences.ts` with this public contract:

```ts
import { writable } from 'svelte/store';
import { getSaveStorage, type SaveStorage } from '$lib/game/save/storage';

export type TextSpeed = 'slow' | 'normal' | 'instant';
export type HudDensity = 'quiet' | 'full';
export type MotionPreference = 'on' | 'reduced';
export type PromptMode = 'auto' | 'pad' | 'keys';

export type UiPreferences = {
  textSpeed: TextSpeed;
  hudDensity: HudDensity;
  motion: MotionPreference;
  promptMode: PromptMode;
};

export const UI_PREFERENCES_STORAGE_KEY = 'gliese.ui-preferences.v1';
export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  textSpeed: 'normal',
  hudDensity: 'quiet',
  motion: 'on',
  promptMode: 'auto'
};

let activePreferences = DEFAULT_UI_PREFERENCES;
const store = writable<UiPreferences>(activePreferences);
export const uiPreferences = { subscribe: store.subscribe };

export function loadUiPreferences(storage: SaveStorage | undefined = getSaveStorage()): UiPreferences;
export function saveUiPreferences(
  preferences: UiPreferences,
  storage: SaveStorage | undefined = getSaveStorage()
): void;
export function initializeUiPreferences(): UiPreferences;
export function getUiPreferences(): UiPreferences;
export function updateUiPreferences(patch: Partial<UiPreferences>): UiPreferences;
```

Validation must accept only the four literal unions above; malformed or absent JSON returns `DEFAULT_UI_PREFERENCES`.

- [ ] **Step 4: Wire initialization after storage hydration and add the bundled UI font**

Add the dependency:

```bash
bun add @fontsource/zen-maru-gothic@^5.2.8
```

In `src/main.ts`, import only the weights used by the mockup and initialize after `setSaveStorage(storage)`:

```ts
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';

const { initializeUiPreferences } = await import('$lib/game/ui/preferences');
initializeUiPreferences();
```

Keep existing Spectral imports for serif secondary copy. Do not load network fonts.

- [ ] **Step 5: Add Heroic tokens and motion rules**

Create `src/lib/game/ui/heroic-ui.css` and import it from `src/app.css` after Tailwind. Use named variables rather than per-screen literals:

```css
:root {
  --heroic-ink: #070512;
  --heroic-gold: #ffe08a;
  --heroic-emerald: #8dffbd;
  --heroic-azure: #a9c8ff;
  --heroic-violet: #d9a9ff;
  --heroic-rose: #ff8a9e;
  --heroic-font-ui: 'Zen Maru Gothic', system-ui, sans-serif;
  --heroic-font-serif: 'Spectral', Georgia, serif;
  --heroic-panel: linear-gradient(145deg, rgba(27, 35, 102, 0.96), rgba(8, 12, 52, 0.98));
  --heroic-selected: linear-gradient(180deg, #fff7d8, #ffd875 52%, #e8ad35);
}

.heroic-motion-reduced *,
@media (prefers-reduced-motion: reduce) {
  .heroic-shimmer,
  .heroic-pulse,
  .heroic-rise {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
}
```

Preserve old classes temporarily for screens not yet converted; Task 15 removes obsolete redesigned-surface use.

- [ ] **Step 6: Run preference tests, typecheck, and commit**

Run:

```bash
bun run test:unit -- --run src/lib/game/ui/preferences.test.ts
bun run check
```

Expected: PASS.

Commit:

```bash
git add package.json bun.lock src/main.ts src/app.css src/lib/game/ui/heroic-ui.css src/lib/game/ui/preferences.ts src/lib/game/ui/preferences.test.ts
git commit -m "feat: add heroic UI foundation"
```

---

### Task 2: Three-Slot Storage, Playtime, and Thumbnail Primitives

**Files:**
- Create: `src/lib/game/save/slots.ts`
- Create: `src/lib/game/save/playtime.ts`
- Create: `src/lib/game/save/thumbnail.ts`
- Test: `src/lib/game/save/slots.test.ts`
- Test: `src/lib/game/save/playtime.test.ts`
- Test: `src/lib/game/save/thumbnail.svelte.test.ts`

**Interfaces:**
- Produces: `SaveSlotId = 1 | 2 | 3`, `SaveSlotRecord`, `SaveSlotsState`
- Produces: `loadSaveSlots()`, `writeSaveSlot()`, `getNewestSaveSlot()`, `buildSaveSlotRecord()`
- Produces: `beginPlaytimeSession()`, `getPlaytimeSeconds()`
- Produces: `captureSaveThumbnail(canvas)` returning `string | undefined`
- Title, SaveScreen, and WorldScene consume these APIs.

- [ ] **Step 1: Write failing slot-envelope tests**

Create `src/lib/game/save/slots.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createNewSaveState } from './save-state';
import {
  SAVE_SLOTS_STORAGE_KEY,
  buildSaveSlotRecord,
  getNewestSaveSlot,
  loadSaveSlots,
  writeSaveSlot
} from './slots';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

it('stores autosave/manual records in a single three-slot envelope', () => {
  const storage = memoryStorage();
  const autosave = buildSaveSlotRecord({
    kind: 'autosave',
    state: createNewSaveState(),
    savedAt: '2026-09-05T04:00:00.000Z',
    playtimeSeconds: 60,
    locationLabel: 'Sundrop Meadows'
  });

  writeSaveSlot(1, autosave, storage);

  expect(JSON.parse(storage.getItem(SAVE_SLOTS_STORAGE_KEY)!)).toMatchObject({
    version: 1,
    slots: [autosave, null, null]
  });
});

it('chooses Continue by newest valid savedAt across all slots', () => {
  const base = createNewSaveState();
  const state = {
    version: 1 as const,
    slots: [
      buildSaveSlotRecord({ kind: 'autosave', state: base, savedAt: '2026-09-05T04:00:00.000Z', playtimeSeconds: 60, locationLabel: 'Meadow' }),
      buildSaveSlotRecord({ kind: 'manual', state: base, savedAt: '2026-09-05T05:00:00.000Z', playtimeSeconds: 120, locationLabel: 'Guild Hall' }),
      null
    ] as const
  };

  expect(getNewestSaveSlot(state)?.slotId).toBe(2);
});

it('returns an empty envelope when persisted slot JSON is malformed', () => {
  const storage = memoryStorage();
  storage.setItem(SAVE_SLOTS_STORAGE_KEY, '{"version":1,"slots":[{"bad":true}]}');
  expect(loadSaveSlots(storage).slots).toEqual([null, null, null]);
});
```

- [ ] **Step 2: Write failing playtime tests**

Create `src/lib/game/save/playtime.test.ts`:

```ts
import { expect, it } from 'vitest';
import { beginPlaytimeSession, getPlaytimeSeconds } from './playtime';

it('continues playtime from the selected slot without persisting a timer into SaveState', () => {
  beginPlaytimeSession(90, 1_000);
  expect(getPlaytimeSeconds(6_900)).toBe(95);
});
```

- [ ] **Step 3: Run both server tests and verify RED**

```bash
bun run test:unit -- --run src/lib/game/save/slots.test.ts src/lib/game/save/playtime.test.ts
```

Expected: FAIL because the new modules do not exist.

- [ ] **Step 4: Implement the slot and playtime APIs**

Use the exact envelope from the spec:

```ts
export type SaveSlotId = 1 | 2 | 3;
export type SaveSlotKind = 'autosave' | 'manual';

export type SaveSlotRecord = {
  kind: SaveSlotKind;
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

export const SAVE_SLOTS_STORAGE_KEY = 'gliese.save-slots.v1';
export const EMPTY_SAVE_SLOTS: SaveSlotsState = { version: 1, slots: [null, null, null] };
```

`writeSaveSlot()` must reject the wrong kind for Slot 1 and manual slots:

```ts
if (slotId === 1 && record.kind !== 'autosave') throw new Error('Slot 1 is autosave-only');
if (slotId !== 1 && record.kind !== 'manual') throw new Error('Slots 2 and 3 are manual-only');
```

`getNewestSaveSlot()` ignores null/invalid records and sorts by `Date.parse(savedAt)` descending.

Implement playtime as an in-memory monotonic session clock:

```ts
let baseSeconds = 0;
let startedAtMs = 0;

export function beginPlaytimeSession(initialSeconds: number, nowMs = performance.now()) {
  baseSeconds = Math.max(0, Math.floor(initialSeconds));
  startedAtMs = nowMs;
}

export function getPlaytimeSeconds(nowMs = performance.now()) {
  return baseSeconds + Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
}
```

- [ ] **Step 5: Write the browser thumbnail test and minimal capture helper**

Create `src/lib/game/save/thumbnail.svelte.test.ts`:

```ts
import { expect, it } from 'vitest';
import { captureSaveThumbnail } from './thumbnail';

it('captures a bounded 16:9 WebP thumbnail instead of the full source canvas', () => {
  const source = document.createElement('canvas');
  source.width = 1440;
  source.height = 900;
  source.getContext('2d')!.fillRect(0, 0, source.width, source.height);

  const result = captureSaveThumbnail(source);
  expect(result?.startsWith('data:image/webp')).toBe(true);
});
```

Implement:

```ts
export function captureSaveThumbnail(source: HTMLCanvasElement): string | undefined {
  try {
    const target = document.createElement('canvas');
    target.width = 320;
    target.height = 180;
    const context = target.getContext('2d');
    if (!context) return undefined;
    context.drawImage(source, 0, 0, target.width, target.height);
    return target.toDataURL('image/webp', 0.72);
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 6: Run focused tests and commit**

```bash
bun run test:unit -- --run src/lib/game/save/slots.test.ts src/lib/game/save/playtime.test.ts src/lib/game/save/thumbnail.svelte.test.ts
```

Expected: PASS.

```bash
git add src/lib/game/save/slots.ts src/lib/game/save/playtime.ts src/lib/game/save/thumbnail.ts src/lib/game/save/slots.test.ts src/lib/game/save/playtime.test.ts src/lib/game/save/thumbnail.svelte.test.ts
git commit -m "feat: add heroic save slot primitives"
```

---

### Task 3: Title Screen and Explicit Lazy Phaser Start

**Files:**
- Create: `src/lib/game/ui/TitleScreen.svelte`
- Create: `src/lib/game/ui/SystemScreen.svelte`
- Test: `src/lib/game/ui/TitleScreen.svelte.spec.ts`
- Test: `src/lib/game/ui/SystemScreen.svelte.spec.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/GameShell.svelte.spec.ts`
- Modify: `src/lib/game/phaser/createGame.ts`
- Modify: `src/lib/game/phaser/createGame.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Modify: `src/lib/game/ui-bridge/store.test.ts`
- Modify: locale message files under `src/lib/game/i18n/messages/`

**Interfaces:**
- Produces: exported `WorldSceneStartData`
- Produces: `createGame(target, { startData })`
- `TitleScreen` emits `oncontinue(record)`, `onnewrun()`, `onsystem()`.
- `SystemScreen` consumes Task 1 preferences plus existing locale state; it is reusable from Title and field overlays.
- GameShell consumes Task 2 `getNewestSaveSlot()` and `beginPlaytimeSession()`.

- [ ] **Step 1: Write failing title behavior tests**

Create component tests that seed `SaveStorage` before render and assert the game is not created until an action is chosen:

```ts
it('does not mount Phaser behind the title screen', async () => {
  render(GameShell);
  expect(createGame).not.toHaveBeenCalled();
  await expect.element(page.getByRole('button', { name: /New Run/i })).toBeVisible();
});

it('disables Continue when all three slots are empty', async () => {
  render(GameShell);
  await expect.element(page.getByRole('button', { name: /Continue/i })).toBeDisabled();
});

it('starts the newest slot and resumes its playtime', async () => {
  // seed Slot 1 older + Slot 2 newer, render, click Continue
  await userEvent.click(page.getByRole('button', { name: /Continue/i }));
  expect(createGame).toHaveBeenCalledWith(expect.any(HTMLElement), {
    startData: expect.objectContaining({ reason: 'resume', saveState: expect.any(Object) })
  });
});
```

- [ ] **Step 2: Write the failing System source-state test**

Create `SystemScreen.svelte.spec.ts` and assert the supplied Display & Text state before wiring Title to it:

```ts
it('renders the source-selected Display & Text values and a disabled Audio rail', async () => {
  render(SystemScreen, { props: { onclose: vi.fn() } });
  await expect.element(page.getByRole('button', { name: /English/i })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: /Normal/i })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: /Quiet/i })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: /^On$/i })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: /Auto/i })).toHaveAttribute('aria-pressed', 'true');
  await expect.element(page.getByRole('button', { name: /Audio/i })).toBeDisabled();
});
```

- [ ] **Step 3: Run title/system tests and verify RED**

```bash
bun run test:unit -- --run src/lib/game/ui/TitleScreen.svelte.spec.ts src/lib/game/ui/SystemScreen.svelte.spec.ts src/lib/game/GameShell.svelte.spec.ts
```

Expected: FAIL because the focused Title/System screens are absent and GameShell still mounts Phaser immediately.

- [ ] **Step 4: Export a narrow WorldScene boot contract and forward it through BootScene**

In `WorldScene.ts`, export the existing data type under a stable name:

```ts
export type WorldSceneStartData = {
  battleResult?: BattleResult;
  mapId?: string;
  mapBackgroundPackageSelection?: MapBackgroundPackageSelection;
  persistExplorationChanges?: boolean;
  reason?: 'battle-result' | 'invalid-save' | 'new' | 'resume' | 'transition';
  saveState?: SaveState | null;
};
```

Update `BootScene` to receive data through `init()` and forward it after preload:

```ts
type BootSceneData = { startData?: WorldSceneStartData };
private startData: WorldSceneStartData = { mapId: openingMapId, reason: 'new' };

init(data: BootSceneData = {}) {
  this.startData = data.startData ?? { mapId: openingMapId, reason: 'new' };
}

create() {
  this.scene.start(WorldScene.key, this.startData);
}
```

Change `createGame` to add scenes manually so BootScene can receive startup data:

```ts
export async function createGame(
  target: HTMLElement,
  { startData }: { startData: WorldSceneStartData }
) {
  const game = new Phaser.Game({ ...config, scene: [] });
  game.scene.add(WorldScene.key, WorldScene, false);
  game.scene.add(BattleScene.key, BattleScene, false);
  game.scene.add(BootScene.key, BootScene, true, { startData });
  return { destroy: () => game.destroy(true) };
}
```

- [ ] **Step 5: Build TitleScreen with the three source plates**

Use source copy and state, not generic buttons:

```svelte
<button disabled={!latestSave} onclick={oncontinue} data-testid="title-continue">
  <span>{t($locale, 'ui.title.continue')}</span>
  <small>{latestSave ? `${latestSave.locationLabel} · ${formatPlaytime(latestSave.playtimeSeconds)}` : t($locale, 'ui.title.noSave')}</small>
</button>
<button onclick={onnewrun}>{t($locale, 'ui.title.newRun')}</button>
<button onclick={onsystem}>{t($locale, 'ui.title.system')}</button>
```

Use the source selected treatment on Continue when it is enabled.

- [ ] **Step 6: Implement SystemScreen now so Title System is not a dead/temporary action**

Render the source Display/Text controls against the existing locale store plus Task 1 preference store:

```svelte
<button aria-pressed={$locale === 'en'} onclick={() => setActiveLocale('en')}>English</button>
<button aria-pressed={$locale === 'ja'} onclick={() => setActiveLocale('ja')}>日本語</button>
<button aria-pressed={$uiPreferences.textSpeed === 'normal'} onclick={() => updateUiPreferences({ textSpeed: 'normal' })}>Normal</button>
<button aria-pressed={$uiPreferences.hudDensity === 'quiet'} onclick={() => updateUiPreferences({ hudDensity: 'quiet' })}>Quiet</button>
<button aria-pressed={$uiPreferences.motion === 'on'} onclick={() => updateUiPreferences({ motion: 'on' })}>On</button>
<button aria-pressed={$uiPreferences.promptMode === 'auto'} onclick={() => updateUiPreferences({ promptMode: 'auto' })}>Auto</button>
<button disabled aria-describedby="audio-unavailable">Audio</button>
```

Include `zh-Hant` in the language control even though the source demonstrates only English/Japanese. The Input rail is a real focus shortcut that moves focus to the Prompts row; Task 14 later adds runtime pad navigation and glyph switching without redesigning this screen.

- [ ] **Step 7: Convert GameShell to `title | playing` mode**

The Phaser mount exists only in playing mode:

```ts
type GameShellMode = 'title' | 'playing';
let mode = $state<GameShellMode>('title');
let game: { destroy(): void } | null = null;

async function startPlaying(startData: WorldSceneStartData, playtimeSeconds: number) {
  beginPlaytimeSession(playtimeSeconds);
  mode = 'playing';
  await tick();
  game = await createGame(mountNode!, { startData });
}
```

New Run passes `{ mapId: openingMapId, reason: 'new' }` with playtime `0`; Continue passes the newest slot's `state` with `reason: 'resume'` and its `playtimeSeconds`.

System from Title opens the SystemScreen created in this task without booting Phaser.

- [ ] **Step 8: Make initial HUD slot-aware and stop using the old single-save result for Continue state**

In `ui-bridge/store.ts`, replace `loadStoredSaveResult()` initialization with:

```ts
const latestSlot = getNewestSaveSlot(loadSaveSlots());
const initialQuestState = latestSlot?.record.state.quests ?? createInitialQuestState();
```

Keep `canResume` temporarily for compatibility but derive it from `latestSlot !== null`; Task 13 removes obsolete single-save commands.

- [ ] **Step 9: Run focused tests/typecheck and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/TitleScreen.svelte.spec.ts src/lib/game/ui/SystemScreen.svelte.spec.ts src/lib/game/GameShell.svelte.spec.ts src/lib/game/phaser/createGame.test.ts src/lib/game/ui-bridge/store.test.ts
bun run check
```

Expected: PASS.

```bash
git add src/lib/game/ui/TitleScreen.svelte src/lib/game/ui/TitleScreen.svelte.spec.ts src/lib/game/ui/SystemScreen.svelte src/lib/game/ui/SystemScreen.svelte.spec.ts src/lib/game/GameShell.svelte src/lib/game/GameShell.svelte.spec.ts src/lib/game/phaser/createGame.ts src/lib/game/phaser/createGame.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/ui-bridge/store.ts src/lib/game/ui-bridge/store.test.ts src/lib/game/i18n/messages
git commit -m "feat: add heroic title flow"
```

---

### Task 4: Heroic Production Art Package and Presentation Metadata

**Files:**
- Create: `src/lib/game/content/heroic-ui.ts`
- Test: `src/lib/game/content/heroic-ui-assets.test.ts`
- Create assets under: `public/game/assets/heroic-ui/`
- Modify: `src/lib/game/content/assets.ts` only for art Phaser must preload

**Interfaces:**
- Produces: `heroicUiAssets`, `getDialogueBust(npcId, mood)`, `getEnemyPlateArt(enemyId)`
- Later screens consume stable asset metadata, never hard-coded source-file paths.

- [ ] **Step 1: Add failing metadata/file validation test**

Use Sharp to guarantee real assets and expected dimensions rather than placeholder files:

```ts
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { heroicUiAssets } from './heroic-ui';

it('ships the 1440x900 title art and transparent Liam paper doll', async () => {
  const titlePath = join('public', heroicUiAssets.title.path.replace(/^\//, ''));
  const dollPath = join('public', heroicUiAssets.heroPaperDoll.path.replace(/^\//, ''));
  await access(titlePath);
  await access(dollPath);
  expect(await sharp(titlePath).metadata()).toMatchObject({ width: 1440, height: 900 });
  expect((await sharp(dollPath).metadata()).hasAlpha).toBe(true);
});
```

- [ ] **Step 2: Create the explicit metadata registry before generating files**

Use concrete runtime paths:

```ts
export const heroicUiAssets = {
  title: { path: '/game/assets/heroic-ui/title-sundrop-dusk.png' },
  heroFace: { path: '/game/assets/heroic-ui/liam-face.png' },
  heroPaperDoll: { path: '/game/assets/heroic-ui/liam-paper-doll.png' },
  enemyPlates: {
    'slime-scout': '/game/assets/heroic-ui/enemy-slime-scout.png',
    'ruins-warden': '/game/assets/heroic-ui/enemy-ruins-warden.png'
  },
  busts: {
    liam: {
      neutral: '/game/assets/heroic-ui/bust-liam-neutral.png',
      pleased: '/game/assets/heroic-ui/bust-liam-pleased.png',
      concerned: '/game/assets/heroic-ui/bust-liam-concerned.png'
    },
    'shopkeeper-mira': {
      neutral: '/game/assets/heroic-ui/bust-mira-neutral.png',
      pleased: '/game/assets/heroic-ui/bust-mira-pleased.png',
      concerned: '/game/assets/heroic-ui/bust-mira-concerned.png'
    },
    'guild-master': {
      neutral: '/game/assets/heroic-ui/bust-arlen-neutral.png',
      pleased: '/game/assets/heroic-ui/bust-arlen-pleased.png',
      concerned: '/game/assets/heroic-ui/bust-arlen-concerned.png'
    },
    'guild-quartermaster': {
      neutral: '/game/assets/heroic-ui/bust-vale-neutral.png',
      pleased: '/game/assets/heroic-ui/bust-vale-pleased.png',
      concerned: '/game/assets/heroic-ui/bust-vale-concerned.png'
    },
    'blacksmith-oren': {
      neutral: '/game/assets/heroic-ui/bust-oren-neutral.png',
      pleased: '/game/assets/heroic-ui/bust-oren-pleased.png',
      concerned: '/game/assets/heroic-ui/bust-oren-concerned.png'
    }
  }
} as const;
```

- [ ] **Step 3: Generate the actual art with the repo's image/2D asset workflow**

Use the installed image generation capability and `.agents/skills/2d-game-asset-workflow/SKILL.md`. Produce these files, with no text baked into imagery:

```text
public/game/assets/heroic-ui/title-sundrop-dusk.png      1440x900 opaque
public/game/assets/heroic-ui/liam-face.png               512x512 transparent/clean edge
public/game/assets/heroic-ui/liam-paper-doll.png         512x768 transparent
public/game/assets/heroic-ui/bust-liam-{neutral,pleased,concerned}.png
public/game/assets/heroic-ui/bust-mira-{neutral,pleased,concerned}.png
public/game/assets/heroic-ui/bust-arlen-{neutral,pleased,concerned}.png
public/game/assets/heroic-ui/bust-vale-{neutral,pleased,concerned}.png
public/game/assets/heroic-ui/bust-oren-{neutral,pleased,concerned}.png
public/game/assets/heroic-ui/enemy-slime-scout.png        512x512 transparent
public/game/assets/heroic-ui/enemy-ruins-warden.png       512x512 transparent
public/game/assets/heroic-ui/victory-flourish.png         768x320 transparent
```

Use this shared visual brief for character/battle art: **clean heroic fantasy JRPG illustration, saturated blue-violet shadows, warm gold rim light, readable silhouette at UI-card scale, no typography, no watermark, no UI frame painted into the art**. Title brief: **Sundrop Meadows at dusk, village path foreground, distant ruins on the horizon, blue-violet sky with warm gold sunset accents, composition leaves central/lower title-plate negative space matching the source**.

The canonical Battle/Victory background reuses the existing production `public/game/assets/battle-meadow.png`; it already fills the mockup's `ART NEEDED` backdrop slot, so do not regenerate world/battle background art solely for this UI task. Victory applies the source dimming treatment over that same runtime backdrop.

- [ ] **Step 4: Add fallback helpers**

`getDialogueBust()` must return a deterministic silhouette/fallback path when `npcId` is null/unknown. `getEnemyPlateArt()` returns the existing enemy sprite fallback only when an explicit Heroic plate asset is absent.

- [ ] **Step 5: Run asset validation and commit**

```bash
bun run test:unit -- --run src/lib/game/content/heroic-ui-assets.test.ts
```

Expected: PASS with every referenced runtime file present.

```bash
git add src/lib/game/content/heroic-ui.ts src/lib/game/content/heroic-ui-assets.test.ts src/lib/game/content/assets.ts public/game/assets/heroic-ui
git commit -m "feat: add heroic UI art package"
```

---

### Task 5: Field HUD, Eight-Command Grid, and Overlay Composition

**Files:**
- Create: `src/lib/game/ui/FieldHud.svelte`
- Create: `src/lib/game/ui/CommandGrid.svelte`
- Test: `src/lib/game/ui/FieldHud.svelte.spec.ts`
- Test: `src/lib/game/ui/CommandGrid.svelte.spec.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/GameShell.svelte.spec.ts`
- Modify: locale message files

**Interfaces:**
- `FieldHud` consumes `HudState`, `HudDensity`, motion state, and Heroic hero art.
- `CommandGrid` receives eight explicit callbacks; it does not dispatch bridge commands itself except through callbacks supplied by GameShell.
- Produces overlay IDs for `bag`, `quest`, `map`, `skill`, `save`, `system` and deep-link state `bagCategory`.

- [ ] **Step 1: Write failing command-grid behavior tests**

Assert exact order and actions:

```ts
const labels = ['Bag', 'Gear', 'Quest', 'Map', 'Skill', 'Rest', 'Save', 'System'];
for (const [index, label] of labels.entries()) {
  await expect.element(page.getByTestId(`heroic-command-${index + 1}`)).toHaveTextContent(label);
}
```

In the GameShell test, click each control and assert:

```ts
Bag    -> BagScreen category="potions"
Gear   -> BagScreen category="gear"
Quest  -> QuestJournal
Map    -> AreaMapScreen
Skill  -> SkillScreen
Rest   -> HUD command { type: 'heal' }
Save   -> SaveScreen
System -> SystemScreen
```

- [ ] **Step 2: Run RED tests**

```bash
bun run test:unit -- --run src/lib/game/ui/FieldHud.svelte.spec.ts src/lib/game/ui/CommandGrid.svelte.spec.ts src/lib/game/GameShell.svelte.spec.ts
```

Expected: FAIL because the focused Heroic components do not exist.

- [ ] **Step 3: Replace scattered overlay booleans with one explicit Svelte overlay state**

Keep local Svelte state, not a global store:

```ts
type OverlayId = 'bag' | 'shop' | 'quest' | 'map' | 'skill' | 'save' | 'system' | null;
type BagCategory = 'potions' | 'gear' | 'key' | 'loot';

let overlay = $state<OverlayId>(null);
let bagCategory = $state<BagCategory>('potions');
```

Retain one `pauseOwner` contract in GameShell. `openOverlay(id)` pauses once, and `closeOverlay()` resumes once. Shop may still open contextually from `$hudState.shop`.

- [ ] **Step 4: Implement the source-backed Quiet FieldHud**

Render the Heroic medallion, level badge, HP/XP bars, main-quest banner, wallet/status plates, and command entry without moving the Phaser canvas:

```svelte
<section class:heroic-field-full={density === 'full'} data-testid="heroic-field-hud">
  <div class="heroic-hero-medallion">
    <img src={heroicUiAssets.heroFace.path} alt="" />
    <span>{t($locale, 'ui.levelShort', { level: hud.level })}</span>
    <div role="meter" aria-label={t($locale, 'ui.hp')} aria-valuenow={hud.hp} aria-valuemax={hud.maxHp}></div>
  </div>
  {#if hud.quests.main}<div class="heroic-quest-banner">...</div>{/if}
</section>
```

Quiet is the reference state. Full may show secondary status text but must not change Quiet positions/sizes.

- [ ] **Step 5: Implement the eight-command layout and number-key activation**

Use native buttons with data keys `1` through `8`. GameShell handles a global keydown only when no modal/dialogue/battle summary owns input. Do not intercept editable controls.

- [ ] **Step 6: Update all three locales and run tests**

Add keys for the eight commands and field labels in `en.ts`, `ja.ts`, and `zh-Hant.ts` in the same commit.

```bash
bun run test:unit -- --run src/lib/game/ui/FieldHud.svelte.spec.ts src/lib/game/ui/CommandGrid.svelte.spec.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/ui/FieldHud.svelte src/lib/game/ui/FieldHud.svelte.spec.ts src/lib/game/ui/CommandGrid.svelte src/lib/game/ui/CommandGrid.svelte.spec.ts src/lib/game/GameShell.svelte src/lib/game/GameShell.svelte.spec.ts src/lib/game/i18n/messages
git commit -m "feat: add heroic field HUD"
```

---

### Task 6: Bag/Gear and Minimal Skill Surfaces

**Files:**
- Create: `src/lib/game/ui/BagScreen.svelte`
- Create: `src/lib/game/ui/SkillScreen.svelte`
- Create: `src/lib/game/content/skills.ts`
- Test: `src/lib/game/ui/BagScreen.svelte.spec.ts`
- Test: `src/lib/game/ui/SkillScreen.svelte.spec.ts`
- Test: `src/lib/game/content/skills.test.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: locale message files

**Interfaces:**
- `BagScreen` consumes existing `HudState['inventory']` and existing equip/use callbacks.
- Produces exact categories `potions | gear | key | loot`, 24 desktop slots, selected detail, and 5-slot paper doll.
- `getVisibleSkills(level, locale)` returns known and next gated entries; it never modifies combat state.

- [ ] **Step 1: Write failing 24-slot/deep-link tests**

```ts
it('renders exactly 24 stable Bag slots and Gear can be opened directly', async () => {
  render(BagScreen, { props: { category: 'gear', hud: baseHudState(), ...callbacks } });
  await expect.element(page.getByRole('tab', { name: /Gear/i })).toHaveAttribute('aria-selected', 'true');
  expect(page.getByTestId(/^bag-slot-/).elements()).toHaveLength(24);
});

it('renders all five current equipment positions around the paper doll', async () => {
  for (const slot of ['weapon', 'head', 'body', 'hands', 'accessory']) {
    await expect.element(page.getByTestId(`gear-slot-${slot}`)).toBeVisible();
  }
});
```

- [ ] **Step 2: Write failing level-gated Skill registry tests**

Use three presentation-only entries so the screen is functional without creating combat actions:

```ts
expect(getVisibleSkills(1, 'en')).toMatchObject({
  known: [{ id: 'brave-strike' }],
  locked: [{ id: 'iron-guard', unlockLevel: 2 }, { id: 'aurora-step', unlockLevel: 3 }]
});
expect(getVisibleSkills(3, 'en').locked).toEqual([]);
```

`skills.ts` definitions:

```ts
export type SkillDefinition = {
  id: 'brave-strike' | 'iron-guard' | 'aurora-step';
  nameKey: MessageKey;
  descriptionKey: MessageKey;
  unlockLevel: 1 | 2 | 3;
  tint: 'gold' | 'azure' | 'violet';
};
```

These are compendium entries only; do not add skill-use commands.

- [ ] **Step 3: Run RED tests**

```bash
bun run test:unit -- --run src/lib/game/ui/BagScreen.svelte.spec.ts src/lib/game/ui/SkillScreen.svelte.spec.ts src/lib/game/content/skills.test.ts
```

- [ ] **Step 4: Implement Bag categories and Heroic selection/detail composition**

Mapping must stay exact:

```ts
const categoryItems = $derived.by(() => {
  if (category === 'potions') return hud.inventory.consumables;
  if (category === 'gear') return hud.inventory.equipment;
  if (category === 'key') return hud.inventory.keyItems;
  return [];
});
```

Loot intentionally shows the source-designed stable empty grid because current item definitions contain no material/loot item type. Do not add crafting materials solely to fill the UI.

- [ ] **Step 5: Wire use/equip/unequip through existing bridge helpers**

Do not implement inventory mutations in the component:

```svelte
<button onclick={() => onuse(item.itemId)}>...</button>
<button onclick={() => onequip(item.itemId)}>...</button>
<button onclick={() => onunequip(slot)}>...</button>
```

- [ ] **Step 6: Implement read-only SkillScreen and localization**

Show known entries and next level-gated entries with Heroic frame/selection grammar. Add all names/descriptions to the three locale files.

- [ ] **Step 7: Run tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/BagScreen.svelte.spec.ts src/lib/game/ui/SkillScreen.svelte.spec.ts src/lib/game/content/skills.test.ts
bun run check
```

```bash
git add src/lib/game/ui/BagScreen.svelte src/lib/game/ui/BagScreen.svelte.spec.ts src/lib/game/ui/SkillScreen.svelte src/lib/game/ui/SkillScreen.svelte.spec.ts src/lib/game/content/skills.ts src/lib/game/content/skills.test.ts src/lib/game/GameShell.svelte src/lib/game/i18n/messages
git commit -m "feat: add heroic bag and skills"
```

---

### Task 7: Heroic Shop with Canonical Equipment Stat Preview

**Files:**
- Create: `src/lib/game/ui/ShopScreen.svelte`
- Test: `src/lib/game/ui/ShopScreen.svelte.spec.ts`
- Modify: `src/lib/game/core/stats.ts`
- Modify: `src/lib/game/core/stats.test.ts`
- Modify: `src/lib/game/core/shop.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: locale message files

**Interfaces:**
- Produces: `StatDelta = { maxHp: number; attack: number; defense: number }`
- Produces: `previewEquipmentSwap(base, equipment, itemId)`
- Extends `HudShopBuyEntry` with `statDelta: StatDelta | null`
- `ShopScreen` remains presentation-only and invokes existing buy/sell commands.

- [ ] **Step 1: Write failing pure stat-preview test**

```ts
it('previews replacement equipment using the same effective-stat rules as equip', () => {
  const base = { hp: 20, attack: 4, defense: 0 };
  const current = { weapon: 'training-sword', head: null, body: null, hands: null, accessory: null };
  expect(previewEquipmentSwap(base, current, 'ruin-blade')).toEqual({
    current: { maxHp: 20, attack: 5, defense: 0 },
    next: { maxHp: 20, attack: 6, defense: 0 },
    delta: { maxHp: 0, attack: 1, defense: 0 }
  });
});
```

- [ ] **Step 2: Implement `previewEquipmentSwap` by reusing `deriveEffectiveStats`**

```ts
export function previewEquipmentSwap(base: BaseStats, equipment: EquipmentState, itemId: string) {
  const item = getItem(itemId);
  if (!item || item.type !== 'equipment') return null;
  const current = deriveEffectiveStats(base, equipment);
  const next = deriveEffectiveStats(base, { ...equipment, [item.slot]: item.id });
  return {
    current,
    next,
    delta: {
      maxHp: next.maxHp - current.maxHp,
      attack: next.attack - current.attack,
      defense: next.defense - current.defense
    }
  };
}
```

- [ ] **Step 3: Extend the HUD buy entry and publish preview from WorldScene**

Update:

```ts
export type HudShopBuyEntry = {
  // existing fields
  statDelta: StatDelta | null;
};
```

In WorldScene, after `buildShopBuyEntries(...)`, map equipment entries through `previewEquipmentSwap()` using the same base values as `getEffectiveStats()`:

```ts
const baseStats = { hp: this.getBaseMaxHp(), attack: this.playerProgress.attack, defense: 0 };
const buy = buildShopBuyEntries(...).map((entry) => ({
  ...entry,
  statDelta: entry.item.type === 'equipment'
    ? previewEquipmentSwap(baseStats, this.equipment, entry.item.id)?.delta ?? null
    : null
}));
```

- [ ] **Step 4: Write and implement ShopScreen component tests**

Cover:

```ts
selected equipment -> shows +ATK/-DEF deltas from `statDelta`
wallet 30, price 40 -> Buy disabled/unaffordable treatment
wallet 50, price 40 -> "After 10G"
Buy click -> existing `buy-shop-item`
Sell click -> existing `sell-inventory-item`
```

Do not calculate stats in Svelte.

- [ ] **Step 5: Apply source merchant composition and localized copy**

Use Mira portrait metadata for Mira's shop and deterministic fallback art for other merchants. Preserve Buy/Sell tabs, selected item detail, price, owned count, stock remaining, and wallet-after preview.

- [ ] **Step 6: Run focused tests and commit**

```bash
bun run test:unit -- --run src/lib/game/core/stats.test.ts src/lib/game/ui/ShopScreen.svelte.spec.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
```

```bash
git add src/lib/game/ui/ShopScreen.svelte src/lib/game/ui/ShopScreen.svelte.spec.ts src/lib/game/core/stats.ts src/lib/game/core/stats.test.ts src/lib/game/core/shop.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/ui-bridge/events.ts src/lib/game/GameShell.svelte src/lib/game/i18n/messages
git commit -m "feat: add heroic shop presentation"
```

---

### Task 8: Quest Journal and Heroic Area Map Chrome

**Files:**
- Create: `src/lib/game/ui/QuestJournal.svelte`
- Create: `src/lib/game/ui/AreaMapScreen.svelte`
- Test: `src/lib/game/ui/QuestJournal.svelte.spec.ts`
- Test: `src/lib/game/ui/AreaMapScreen.svelte.spec.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: locale message files

**Interfaces:**
- `QuestJournal` consumes current `HudQuestState` only; no new quest state machine.
- `AreaMapScreen` consumes current `HudAreaMapState` and keeps current marker/fog keyboard navigation behavior.

- [ ] **Step 1: Write failing Quest Journal hierarchy test**

```ts
it('renders main quest first, objective chain, rewards, side work, then offers', async () => {
  render(QuestJournal, { props: { quests: questFixture, areaMap: areaMapFixture, ...callbacks } });
  const sections = page.getByTestId(/^quest-section-/).elements();
  expect(sections[0]?.getAttribute('data-testid')).toBe('quest-section-main');
  await expect.element(page.getByText('24 XP / 30 coins')).toBeVisible();
});
```

- [ ] **Step 2: Write failing Area Map behavior-preservation test**

Move existing map rendering assertions out of GameShell where practical and assert revealed cells, player marker, quest/building markers, Escape close, and marker focus labels remain present under Heroic chrome.

- [ ] **Step 3: Implement QuestJournal without inventing navigation/pathfinding**

The detail map preview must use existing area-map marker/context data. Do not draw a fake route. If no matching location marker exists, render the map thumbnail frame with the current area name only.

- [ ] **Step 4: Extract the existing area-map body into AreaMapScreen and restyle only the shell**

Preserve existing `parseCellKey`, fog, marker geometry, keyboard focus, and pause ownership. The task is a presentation extraction, not map logic work.

- [ ] **Step 5: Run tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/QuestJournal.svelte.spec.ts src/lib/game/ui/AreaMapScreen.svelte.spec.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
```

```bash
git add src/lib/game/ui/QuestJournal.svelte src/lib/game/ui/QuestJournal.svelte.spec.ts src/lib/game/ui/AreaMapScreen.svelte src/lib/game/ui/AreaMapScreen.svelte.spec.ts src/lib/game/GameShell.svelte src/lib/game/i18n/messages
git commit -m "feat: add heroic quest and map screens"
```

---

### Task 9: Dialogue Bust Metadata and Text Reveal

**Files:**
- Create: `src/lib/game/ui/text-reveal.ts`
- Test: `src/lib/game/ui/text-reveal.test.ts`
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/DialoguePanel.svelte`
- Modify: `src/lib/game/DialoguePanel.svelte.spec.ts`
- Modify: locale message files only if new accessibility copy is needed

**Interfaces:**
- Extends `HudDialogueState` with `npcId: string | null` and `portraitPath: string`.
- Produces: `getRevealCharacterCount(text, elapsedMs, speed)` and `isRevealComplete(...)`.
- DialoguePanel consumes Task 1 `TextSpeed` and Task 4 bust metadata.

- [ ] **Step 1: Write failing pure reveal tests**

```ts
it('uses deterministic slow/normal/instant reveal rates', () => {
  expect(getRevealCharacterCount('abcdef', 100, 'slow')).toBe(2);
  expect(getRevealCharacterCount('abcdef', 100, 'normal')).toBe(4);
  expect(getRevealCharacterCount('abcdef', 0, 'instant')).toBe(6);
});
```

Use constants `slow = 50ms/char`, `normal = 25ms/char`, `instant = 0`.

- [ ] **Step 2: Add `npcId` and portrait path to the HUD dialogue render contract**

WorldScene already owns `DialogueSession.npcId`; publish it instead of trying to recover identity from localized speaker text:

```ts
const npcId = this.dialogueSession?.npcId ?? null;
const portraitPath = getDialogueBust(npcId, 'neutral');
```

System/fallback dialogue uses the deterministic silhouette fallback.

- [ ] **Step 3: Write failing DialoguePanel interaction tests**

Use fake timers:

```ts
confirm before reveal complete -> full current line becomes visible, no `dialogue-advance`
second confirm -> emits `dialogue-advance`
choice mode -> choices are not actionable until line reveal is complete
Escape -> closes only when `canClose`
```

- [ ] **Step 4: Refactor DialoguePanel to the source composition**

Keep one `<dialog>` but add bust/nameplate/line/choice regions. Reset reveal start whenever `dialogue.id` or `dialogue.lineIndex` changes. Use `requestAnimationFrame` or one bounded timer; cancel it on destroy/line change.

Core confirm logic:

```ts
if (!revealComplete) {
  revealAll = true;
  return;
}
if (dialogue.mode === 'choice') {
  // let the focused/native choice button handle confirm
  return;
}
onadvance();
```

- [ ] **Step 5: Run tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/text-reveal.test.ts src/lib/game/DialoguePanel.svelte.spec.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
```

```bash
git add src/lib/game/ui/text-reveal.ts src/lib/game/ui/text-reveal.test.ts src/lib/game/ui-bridge/events.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/DialoguePanel.svelte src/lib/game/DialoguePanel.svelte.spec.ts
git commit -m "feat: add heroic dialogue presentation"
```

---

### Task 10: Pure Battle Presentation and Flee Semantics

**Files:**
- Create: `src/lib/game/core/battle-presentation.ts`
- Test: `src/lib/game/core/battle-presentation.test.ts`
- Modify: `src/lib/game/core/battle.ts`
- Modify: `src/lib/game/core/battle.test.ts`

**Interfaces:**
- Produces: target cycling/nearest-selection helpers.
- Produces: turn-ribbon derivation and bounded feed helper.
- Produces: `FleeChannel`, `startFleeChannel()`, `cancelFleeChannel()`, `getFleeProgress()`.
- Extends `BattleOutcome` to `'victory' | 'defeat' | 'fled'`.
- Changes `BattleApplication.summary` to `BattleSummary | null`; fled returns `null` summary.

- [ ] **Step 1: Write failing target/ribbon/feed/flee helper tests**

```ts
it('cycles only living targets and wraps', () => {
  const enemies = [
    { unitId: 'a', defeated: false },
    { unitId: 'b', defeated: true },
    { unitId: 'c', defeated: false }
  ];
  expect(cycleBattleTarget('a', enemies, 1)).toBe('c');
  expect(cycleBattleTarget('c', enemies, 1)).toBe('a');
});

it('orders the bounded turn ribbon by readyAt', () => {
  expect(buildTurnRibbon([
    { id: 'hero', kind: 'hero', readyAt: 100 },
    { id: 'enemy:a', kind: 'enemy', readyAt: 50 }
  ], 4).map((entry) => entry.id)).toEqual(['enemy:a', 'hero']);
});

it('keeps only the newest five combat feed entries', () => {
  expect(appendCombatFeed([1, 2, 3, 4, 5], 6, 5)).toEqual([2, 3, 4, 5, 6]);
});

it('reports a 2.4 second flee channel as complete at its end time', () => {
  const channel = startFleeChannel(1_000, 2_400);
  expect(getFleeProgress(channel, 2_200)).toBeCloseTo(0.5);
  expect(getFleeProgress(channel, 3_400)).toBe(1);
});
```

- [ ] **Step 2: Implement the pure helper types**

Use a small data-only module:

```ts
export type BattleTargetCandidate = { unitId: string; defeated: boolean; distance?: number };
export type TurnRibbonCandidate = { id: string; kind: 'hero' | 'enemy'; readyAt: number };
export type FleeChannel = { startedAt: number; endsAt: number };
```

No Phaser imports.

- [ ] **Step 3: Write failing `fled` application test in `battle.test.ts`**

```ts
it('applies a fled result without rewards or encounter completion', () => {
  const save = createNewSaveState();
  const application = applyBattleResultToSaveState(save, {
    outcome: 'fled',
    sourceMapId: 'meadow-entry',
    sourceEncounterId: 'slime-1',
    sourceEnemyId: 'slime-scout',
    returnPosition: { mapId: 'meadow-entry', x: 100, y: 200, facing: 'down' },
    finalHeroHp: 7,
    inventory: save.inventory,
    defeatedUnits: []
  });

  expect(application.summary).toBeNull();
  expect(application.saveState.player.hp).toBe(7);
  expect(application.saveState.flags.clearedEncounters).not.toContain('slime-1');
  expect(application.saveState.wallet).toEqual(save.wallet);
  expect(application.saveState.quests).toEqual(save.quests);
});
```

- [ ] **Step 4: Extend `BattleOutcome` and add `applyBattleFlee`**

`applyBattleResultToSaveState()` branches `fled` before victory/defeat. `applyBattleFlee` may update only map/position/facing, current HP, and battle-local inventory consumption. It must not apply `defeatedUnits` rewards or flags.

- [ ] **Step 5: Run pure tests and commit**

```bash
bun run test:unit -- --run src/lib/game/core/battle-presentation.test.ts src/lib/game/core/battle.test.ts
```

```bash
git add src/lib/game/core/battle-presentation.ts src/lib/game/core/battle-presentation.test.ts src/lib/game/core/battle.ts src/lib/game/core/battle.test.ts
git commit -m "feat: add battle presentation contracts"
```

---

### Task 11: BattleScene Targeting, Telemetry, Feed, Item, and Flee Runtime

**Files:**
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Modify: `src/lib/game/ui-bridge/store.test.ts`
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: locale message files

**Interfaces:**
- Adds `HudBattleActiveState` under `HudBattleState.active`.
- Adds commands `battle-cycle-target` and `battle-flee`; existing `heal` and `use-item` stay authoritative.
- BattleScene consumes Task 10 helpers and publishes one render-ready active payload.

- [ ] **Step 1: Define the failing bridge contract in tests**

Update HUD test fixtures to require:

```ts
battle: {
  phase: 'none',
  active: null,
  summary: null
}
```

Add helper emission tests:

```ts
requestBattleCycleTarget(1) -> { type: 'battle-cycle-target', direction: 1 }
requestBattleFlee() -> { type: 'battle-flee' }
```

- [ ] **Step 2: Add the render-ready active battle types**

Use this shape in `events.ts`:

```ts
export type HudBattleEnemy = {
  unitId: string;
  name: string;
  portraitPath: string;
  hp: number;
  maxHp: number;
  defeated: boolean;
  targeted: boolean;
  secondaryGauge: { label: string; current: number; max: number } | null;
};

export type HudBattleFeedEntry = {
  id: number;
  tone: 'damage' | 'heal' | 'defeat' | 'system';
  text: string;
};

export type HudBattleTurnEntry = {
  id: string;
  kind: 'hero' | 'enemy';
  readyInMs: number;
};

export type HudBattleActiveState = {
  hero: { hp: number; maxHp: number; portraitPath: string };
  enemies: HudBattleEnemy[];
  targetId: string | null;
  turnRibbon: HudBattleTurnEntry[];
  feed: HudBattleFeedEntry[];
  interventions: {
    canHeal: boolean;
    usableItemCount: number;
    flee: { active: boolean; progress: number; remainingMs: number };
  };
};
```

Keep `secondaryGauge: null` for current enemies; future witness bosses can populate it without another HUD contract rewrite.

- [ ] **Step 3: Write BattleScene tests for selection preference and telemetry**

In `scenes.test.ts`, instantiate BattleScene and verify:

```ts
initial target -> nearest living enemy
battle-cycle-target direction 1 -> next living enemy
selected target in attack reach -> hero attacks it before another in-range enemy
published HUD -> enemy HP, targetId, turnRibbon, feed, intervention availability
```

Expose only narrow test getters if necessary, e.g. `getBattleTargetIdForTest()`; do not expose mutable runtime arrays.

- [ ] **Step 4: Add selected target state to BattleScene**

Add:

```ts
private targetId: string | null = null;
private combatFeed: HudBattleFeedEntry[] = [];
private nextFeedId = 1;
private fleeChannel: FleeChannel | null = null;
```

After enemies are created, choose nearest living target. In `tryHeroAttack`, first prefer the selected living enemy if it is within `attackReach`; otherwise preserve current nearest/in-range fallback. When target dies, select nearest living enemy.

- [ ] **Step 5: Record bounded combat feed at existing hit/heal/death seams**

Append localized feed lines at the exact points damage/recovery/defeat succeeds. Never append on blocked/invulnerable hits. Feed stays memory-only and max 5.

- [ ] **Step 6: Implement the deterministic Flee channel**

On `{ type: 'battle-flee' }`:

```ts
if (!this.pendingResult && !this.fleeChannel) {
  this.fleeChannel = startFleeChannel(this.time.now, 2_400);
  this.publishHudState(t(getActiveLocale(), 'status.fleeStarted'));
}
```

On hero damage, set `this.fleeChannel = null` and publish cancel feedback. In `update`, when `getFleeProgress(...) === 1`, build a `BattleResult` with `outcome: 'fled'`, current HP/inventory, no rewards, and route through the same WorldScene battle-result handoff.

- [ ] **Step 7: Preserve existing battle Heal/Item handling**

Do not create parallel consumable code. Keep existing:

```ts
if (command.type === 'heal') this.consumeFirstHealingItem();
if (command.type === 'use-item') this.useItem(command.itemId);
```

Ensure both append a heal feed entry only when a potion is actually consumed.

- [ ] **Step 8: Run focused scene/bridge tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui-bridge/store.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/core/battle-presentation.test.ts src/lib/game/core/battle.test.ts
bun run check
```

```bash
git add src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/ui-bridge/store.test.ts src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/i18n/messages
git commit -m "feat: expose heroic battle runtime"
```

---

### Task 12: Heroic Battle HUD and Victory Surface

**Files:**
- Create: `src/lib/game/ui/BattleHud.svelte`
- Create: `src/lib/game/ui/BattleSummary.svelte`
- Test: `src/lib/game/ui/BattleHud.svelte.spec.ts`
- Test: `src/lib/game/ui/BattleSummary.svelte.spec.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/GameShell.svelte.spec.ts`
- Modify: locale message files

**Interfaces:**
- BattleHud consumes `HudBattleActiveState` and existing inventory consumables.
- Uses existing `requestHeal()` / `requestUseItem()` plus Task 11 target/flee request helpers.
- BattleSummary consumes existing `HudBattleSummary` and `requestDismissBattleSummary()`.

- [ ] **Step 1: Write failing BattleHud source-state test**

Use a deterministic two-enemy fixture and assert:

```ts
AUTO label visible
TURN ribbon contains hero + enemies in provided order
one enemy plate has TARGETED treatment
combat feed renders newest bounded entries
Heal selected/source treatment
Item opens compact consumable picker
Flee renders 2.4s/progress state and calls battle-flee
```

- [ ] **Step 2: Implement BattleHud without owning combat truth**

The component reads only `active` state and dispatches commands. Flee progress comes from `active.interventions.flee.progress`; do not start a second UI timer for the mechanic.

Item picker uses `$hudState.inventory.consumables` and calls `requestUseItem(itemId)`. Disable Item when `usableItemCount === 0`.

- [ ] **Step 3: Write failing Victory summary test**

```ts
it('renders XP, coins, drops, foes, quest update and one Continue', async () => {
  render(BattleSummary, { props: { summary: victoryFixture, oncontinue } });
  await expect.element(page.getByText('+24 XP')).toBeVisible();
  await expect.element(page.getByText('+30G')).toBeVisible();
  expect(page.getByRole('button', { name: /Continue/i }).elements()).toHaveLength(1);
});
```

- [ ] **Step 4: Replace the old battle summary/modal rendering in GameShell**

Rules:

```text
battle.phase === active  -> BattleHud
battle.phase === summary -> BattleSummary
battle.phase === none    -> FieldHud/normal overlays
```

Do not show field command grid on top of active battle.

- [ ] **Step 5: Run component tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/BattleHud.svelte.spec.ts src/lib/game/ui/BattleSummary.svelte.spec.ts src/lib/game/GameShell.svelte.spec.ts
bun run check
```

```bash
git add src/lib/game/ui/BattleHud.svelte src/lib/game/ui/BattleHud.svelte.spec.ts src/lib/game/ui/BattleSummary.svelte src/lib/game/ui/BattleSummary.svelte.spec.ts src/lib/game/GameShell.svelte src/lib/game/GameShell.svelte.spec.ts src/lib/game/i18n/messages
git commit -m "feat: add heroic battle and victory UI"
```

---

### Task 13: Save Screen, Manual Writes, and Coarse Autosave Hooks

**Files:**
- Create: `src/lib/game/ui/SaveScreen.svelte`
- Test: `src/lib/game/ui/SaveScreen.svelte.spec.ts`
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Modify: `src/lib/game/ui-bridge/store.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/save/storage.test.ts`
- Modify: locale message files

**Interfaces:**
- Adds HUD command `{ type: 'save-slot'; slotId: 2 | 3; thumbnail?: string }`.
- Produces WorldScene helpers `saveAutosaveSlot()` and `saveManualSlot(slotId, thumbnail)`.
- SaveScreen reads Task 2 slots directly and refreshes after synchronous command dispatch.

- [ ] **Step 1: Write failing SaveScreen state/overwrite tests**

Cover the canonical state:

```ts
Slot 1 -> AUTOSAVE populated
Slot 2 -> MANUAL populated
Slot 3 -> EMPTY
click populated Slot 2 -> confirmation appears first
confirm overwrite -> emits save-slot slotId 2
click empty Slot 3 -> emits save-slot slotId 3 immediately
```

Each populated card must show `locationLabel`, formatted `playtimeSeconds`, `savedAt`, plus level/coins/HP derived from `record.state`.

- [ ] **Step 2: Add the manual slot bridge command**

```ts
export type HudCommand =
  | ...
  | { type: 'save-slot'; slotId: 2 | 3; thumbnail?: string }
  | ...;

export function requestSaveSlot(slotId: 2 | 3, thumbnail?: string) {
  emitHudCommand({ type: 'save-slot', slotId, thumbnail });
}
```

- [ ] **Step 3: Implement one WorldScene slot-record builder**

Avoid duplicating metadata logic:

```ts
private buildSlotRecord(kind: 'autosave' | 'manual', thumbnail?: string) {
  const areaMap = buildAreaMapState({
    map: this.resolveMap(this.mapId),
    player: { x: this.player?.x ?? 0, y: this.player?.y ?? 0 },
    revealedCells: this.mapExploration[this.mapId] ?? [],
    quests: this.quests,
    locale: getActiveLocale(),
    seenDiscoveries: [...this.seenDiscoveryIds]
  });
  return buildSaveSlotRecord({
    kind,
    state: this.buildSaveState(),
    savedAt: new Date().toISOString(),
    playtimeSeconds: getPlaytimeSeconds(),
    locationLabel: areaMap.name,
    thumbnail
  });
}
```

- [ ] **Step 4: Implement manual writes and thumbnail capture**

On `save-slot`, use the Svelte-captured thumbnail passed in the command. SaveScreen obtains it from the Phaser canvas inside `mountNode`:

```ts
const thumbnail = mountNode?.querySelector('canvas')
  ? captureSaveThumbnail(mountNode.querySelector('canvas')!)
  : undefined;
requestSaveSlot(slotId, thumbnail);
```

If capture fails, still save the record without `thumbnail`.

- [ ] **Step 5: Add autosave only after WorldScene is fully ready for the three allowed reasons**

At the end of `WorldScene.create`, after state/map/player restoration and HUD setup:

```ts
if (reason === 'new' || reason === 'transition' || reason === 'battle-result') {
  const thumbnail = captureSaveThumbnail(this.game.canvas);
  writeSaveSlot(1, this.buildSlotRecord('autosave', thumbnail));
}
```

Do not add any other autosave calls.

- [ ] **Step 6: Remove old single-save commands/read paths once no UI references remain**

Delete `save`, `resume-save`, `requestSave`, `requestResume`, `saveCurrentState`, and the old single-save read/write helpers from runtime call sites. `save/storage.ts` remains the generic adapter owner (`SaveStorage`, `setSaveStorage`, `getSaveStorage`), while slot serialization lives in `save/slots.ts`.

Update `storage.test.ts` to test only adapter behavior that still exists; slot behavior stays in `slots.test.ts`. Do not keep dead compatibility wrappers.

- [ ] **Step 7: Add scene tests for the exact autosave reasons**

Assert:

```text
reason new          -> writes Slot 1 once
reason transition   -> writes Slot 1 once
reason battle-result-> writes Slot 1 once
reason resume       -> no autosave write during create
manual save command -> writes only requested Slot 2/3
```

Mock `writeSaveSlot` rather than asserting filesystem bytes in scene tests.

- [ ] **Step 8: Run tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/SaveScreen.svelte.spec.ts src/lib/game/save/slots.test.ts src/lib/game/save/storage.test.ts src/lib/game/ui-bridge/store.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
```

```bash
git add src/lib/game/ui/SaveScreen.svelte src/lib/game/ui/SaveScreen.svelte.spec.ts src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/ui-bridge/store.test.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/GameShell.svelte src/lib/game/save/storage.ts src/lib/game/save/storage.test.ts src/lib/game/i18n/messages
git commit -m "feat: add heroic save slots"
```

---

### Task 14: Prompt Modality and Generic Gamepad Input

**Files:**
- Modify: `src/lib/game/ui/SystemScreen.svelte`
- Create: `src/lib/game/ui/PromptGlyph.svelte`
- Create: `src/lib/game/ui/input-modality.ts`
- Create: `src/lib/game/core/gamepad.ts`
- Modify: `src/lib/game/ui/SystemScreen.svelte.spec.ts`
- Test: `src/lib/game/ui/PromptGlyph.svelte.spec.ts`
- Test: `src/lib/game/ui/input-modality.test.ts`
- Test: `src/lib/game/core/gamepad.test.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: locale message files

**Interfaces:**
- Produces `InputModality = 'keys' | 'pad'` and `resolvePromptModality(promptMode, lastModality)`.
- Produces pure `GamepadSnapshot`/`GamepadAction` normalization used by Svelte and Phaser.
- SystemScreen already updates Task 1 preferences from Task 3; this task adds live prompt/gamepad behavior without changing its source geometry.

- [ ] **Step 1: Write failing preference/prompt tests**

```ts
expect(resolvePromptModality('keys', 'pad')).toBe('keys');
expect(resolvePromptModality('pad', 'keys')).toBe('pad');
expect(resolvePromptModality('auto', 'pad')).toBe('pad');
```

System component test asserts the canonical source-selected controls:

```text
Language  -> English selected
Text Speed -> Normal selected
HUD Density -> Quiet selected
Motion -> On selected
Prompts -> Auto selected
Audio rail -> visible + disabled + unavailable description
Input rail -> focuses/scrolls prompt controls, no invented second settings page
```

- [ ] **Step 2: Implement pure generic gamepad normalization**

Use standard browser Gamepad indices only, no vendor labels:

```ts
export type GamepadAction =
  | 'up' | 'down' | 'left' | 'right'
  | 'confirm' | 'cancel' | 'menu'
  | 'lb' | 'rb';

export type GamepadSnapshot = {
  up: boolean; down: boolean; left: boolean; right: boolean;
  confirm: boolean; cancel: boolean; menu: boolean; lb: boolean; rb: boolean;
};
```

Mapping:

```text
D-pad 12/13/14/15 + left-stick threshold ±0.55 -> directions
button 0 -> confirm/interact (generic A)
button 1 -> cancel (generic B)
button 2 -> menu (generic X)
button 4 -> LB
button 5 -> RB
```

Provide `getPressedGamepadActions(previous, next)` so held buttons are edge-triggered and do not repeat until released; do not add held-button repeat in this slice.

- [ ] **Step 3: Extend SystemScreen with live input focus behavior and implement PromptGlyph**

System segmented controls must be native buttons with `aria-pressed`. PromptGlyph renders generic text glyphs (`A`, `B`, `X`, `LB`, `RB`) or keyboard labels based on resolved modality; do not draw Xbox/PlayStation logos.

- [ ] **Step 4: Track last input modality in GameShell**

Keyboard/pointer interaction sets `lastModality = 'keys'`; any connected pad edge/action sets `'pad'`. `PromptMode='auto'` resolves from this state.

Use one rAF poll in GameShell while the app is mounted; cancel it on destroy. When an overlay owns focus, map D-pad/left-stick to arrow-key-equivalent focus movement, confirm to focused button click, cancel to the existing close path, and LB/RB to the active screen's tab/rail callbacks.

- [ ] **Step 5: Add field gamepad movement/interact/menu in WorldScene**

Poll `navigator.getGamepads?.()[0]` inside the Phaser integration layer and merge normalized pad direction with existing keyboard movement before calling `resolveMovementVector()`.

Use edge-triggered actions:

```text
confirm -> same nearby-NPC/discovery interaction path as existing interact keys
menu -> emit `gliese:menu-request` through the shared UI bridge module
```

Add this exact one-way signal in `ui-bridge/events.ts`:

```ts
export const HUD_MENU_REQUEST_EVENT = 'gliese:menu-request';
export function emitMenuRequest() {
  getEventTarget()?.dispatchEvent(new Event(HUD_MENU_REQUEST_EVENT));
}
export function onMenuRequest(listener: () => void) {
  const target = getEventTarget();
  target?.addEventListener(HUD_MENU_REQUEST_EVENT, listener);
  return () => target?.removeEventListener(HUD_MENU_REQUEST_EVENT, listener);
}
```

GameShell subscribes once and opens CommandGrid only in playing mode when no modal/dialogue/battle surface owns input. Do not synthesize keyboard events and do not persist the request.

- [ ] **Step 6: Add battle target cycling from the single GameShell pad poller**

When BattleHud is active, GameShell maps LB/RB edge actions to `requestBattleCycleTarget(-1 | 1)` and confirm/cancel to the focused native BattleHud controls. BattleScene changes targets only through the Task 11 command handler; do not add a second direct pad target path inside BattleScene.

- [ ] **Step 7: Add scene/component tests and commit**

```bash
bun run test:unit -- --run src/lib/game/ui/SystemScreen.svelte.spec.ts src/lib/game/ui/PromptGlyph.svelte.spec.ts src/lib/game/ui/input-modality.test.ts src/lib/game/core/gamepad.test.ts src/lib/game/phaser/scenes/scenes.test.ts
bun run check
```

```bash
git add src/lib/game/ui/SystemScreen.svelte src/lib/game/ui/SystemScreen.svelte.spec.ts src/lib/game/ui/PromptGlyph.svelte src/lib/game/ui/PromptGlyph.svelte.spec.ts src/lib/game/ui/input-modality.ts src/lib/game/ui/input-modality.test.ts src/lib/game/core/gamepad.ts src/lib/game/core/gamepad.test.ts src/lib/game/GameShell.svelte src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/i18n/messages
git commit -m "feat: add heroic system and gamepad input"
```

---

### Task 15: Deterministic Source-Parity E2E, Dead-UI Cleanup, and Final Gate

**Files:**
- Create: `tests/e2e/heroic-ui.e2e.ts`
- Create/update Playwright snapshots under the test's standard `*-snapshots/` directory
- Modify: `tests/e2e/game.e2e.ts` for title-first boot expectations
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/app.css`
- Modify: any migrated component tests whose old selectors/classes no longer exist
- Update: PR #39 description with any approved intentional source deviations; expected final state is none

**Interfaces:**
- No new production API. This task proves the ten source-backed surfaces and two regression-only surfaces.

- [ ] **Step 1: Add a deterministic E2E HUD-state helper**

In `heroic-ui.e2e.ts`, use the public custom event contract instead of brittle movement scripts:

```ts
async function emitHudState(page: Page, state: HudState) {
  await page.evaluate(({ eventName, detail }) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }, { eventName: 'gliese:hud-state', detail: state });
}
```

Seed slot/preferences through browser storage before `page.goto('/')` for Title/Save/System states. Keep one separate real New Run/Continue flow to prove actual boot integration.

- [ ] **Step 2: Export the supplied mockup canvases as review references**

Before accepting runtime goldens, render the supplied `Gliese UI Heroic(1).html` at 1440×900 and save the ten source-backed reference captures under:

```text
docs/visual-references/heroic-ui/source/title.png
docs/visual-references/heroic-ui/source/field.png
docs/visual-references/heroic-ui/source/bag.png
docs/visual-references/heroic-ui/source/shop.png
docs/visual-references/heroic-ui/source/quest.png
docs/visual-references/heroic-ui/source/dialogue.png
docs/visual-references/heroic-ui/source/battle.png
docs/visual-references/heroic-ui/source/victory.png
docs/visual-references/heroic-ui/source/save.png
docs/visual-references/heroic-ui/source/system.png
```

These are design-review inputs and make the parity reference travel with the PR. Do not treat mockup `image-slot` placeholder artwork as production art; compare UI geometry/chrome while runtime art fills those slots.

- [ ] **Step 3: Add the canonical 1440×900 screenshot suite**

Set exactly:

```ts
test.use({ viewport: { width: 1440, height: 900 } });
```

Capture these names with Playwright `expect(page).toHaveScreenshot(name, { animations: 'disabled', maxDiffPixels: 150 })`:

```text
heroic-title.png
heroic-field-quiet-command-open.png
heroic-bag-potions.png
heroic-bag-gear.png
heroic-shop-buy-equipment.png
heroic-quest-journal.png
heroic-dialogue-choices.png
heroic-battle-active.png
heroic-victory.png
heroic-save.png
heroic-system.png
heroic-map-regression.png
heroic-skill-regression.png
```

The ten source-backed names are reviewed side-by-side against the supplied mockup before accepting baselines. Map/Skill are regression baselines only.

- [ ] **Step 4: Add functional E2E coverage for the full visible command contract**

One or more short tests must cover:

```text
Title: Continue/New Run/System
Field: Bag/Gear/Quest/Map/Skill/Rest/Save/System
Bag: use/equip/unequip
Shop: buy/sell/unaffordable
Quest: select/accept
Dialogue: reveal/advance/choice
Battle: target cycle/Heal/Item/Flee
Victory: Continue
Save: overwrite manual slot + newest-slot Continue
System: persist preferences
Input: keyboard + generic pad action path (mock navigator.getGamepads)
```

Use deterministic HUD fixtures where the runtime setup would otherwise require long movement.

- [ ] **Step 5: Remove obsolete old-layout presentation after all replacement tests are green**

Delete no-longer-used old `glass-panel`, `glass-button`, `jeweled-cell`, old command/settings markup, old inventory/shop/quest modal markup, and stale selectors only when `rg` proves they have no remaining consumer:

```bash
rg "glass-panel|glass-button|jeweled-cell|jrpg-command|arcane-window" src/lib/game src/app.css
```

Do not delete classes still used by non-redesigned surfaces unless those consumers are migrated in this PR.

- [ ] **Step 6: Run the complete unit/component suite**

```bash
bun run test:unit -- --run
```

Expected: PASS.

- [ ] **Step 7: Run static quality gates**

```bash
bun run check
bun run lint
```

Expected: PASS with no Svelte/TypeScript/ESLint/Prettier failures.

- [ ] **Step 8: Run E2E and inspect every parity screenshot**

```bash
bun run build
bun run test:e2e -- --grep "Heroic UI"
```

Expected: PASS; inspect all 13 screenshot outputs. Do not update a golden merely to make CI green if it visibly diverges from the supplied source.

- [ ] **Step 9: Verify the release frontend boundary**

```bash
bun run build:tauri
```

Expected: PASS, including strict story check and no-story-prose frontend assertion. This UI work must not leak story prose into the frontend bundle.

- [ ] **Step 10: Final source-coverage review before completion claim**

Manually confirm this checklist against the spec and PR diff:

```text
[ ] all 10 source-backed surfaces have source-reviewed 1440x900 captures
[ ] no image-slot/placeholder art remains
[ ] Map/Skill are labeled regression-only, not source-pixel parity
[ ] all 8 field commands are functional
[ ] Slot 1 autosaves only at 3 allowed checkpoint classes
[ ] manual slots 2/3 confirm overwrites
[ ] Continue selects newest valid savedAt
[ ] dialogue portraits + Slow/Normal/Instant reveal work
[ ] battle target/ribbon/feed/Heal/Item/Flee are runtime-backed
[ ] witness secondary gauge seam is optional/null for current enemies
[ ] English/Japanese/Traditional Chinese strings exist for all new UI copy
[ ] Quiet/Normal/On/Auto source preferences match reference
[ ] Reduced motion and OS reduced-motion floor work
[ ] generic gamepad field/menu path works
[ ] Audio is visible but disabled/unavailable
[ ] no old redesigned-surface glass UI remains
```

- [ ] **Step 11: Commit the final parity baselines/cleanup**

```bash
git add tests/e2e docs/visual-references/heroic-ui src/lib/game src/app.css
git commit -m "test: lock heroic UI visual parity"
```

---

## Execution Notes

- Follow TDD inside every task: focused failing test → minimal implementation → focused green test → commit.
- Do not merge intermediate tasks separately. Commits are review checkpoints inside PR #39.
- Keep `GameShell.svelte` as orchestration glue; if a screen-specific markup block grows there, move it to the named focused component instead of growing the shell again.
- Reuse current runtime behavior whenever the source only changes presentation. New mechanics are limited to those named in the spec/plan.
- For any UI geometry conflict, the supplied 1440×900 source beats older May 2026 layout decisions.