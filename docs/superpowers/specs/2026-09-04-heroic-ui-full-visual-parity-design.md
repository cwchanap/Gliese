# Heroic UI Full Visual Parity Design

## Summary

Replace Gliese's current mixed JRPG HUD/windows with the supplied `Gliese UI Heroic(1).html` as the visual authority for the playable UI.

This remains one implementation ticket and draft PR #39. It covers the ten supplied surfaces: Title, Field HUD, Bag, Shop, Quest Journal, Dialogue, Battle, Victory, Save, and System. Existing game systems remain authoritative. When the mockup exposes a control Gliese cannot currently represent, add only the smallest honest behavior required; do not invent progression/content merely to fill a visual hole.

Keep the existing architecture:

- pure TypeScript owns game rules/state,
- Phaser owns exploration and battle runtime,
- Svelte owns DOM UI/presentation,
- `ui-bridge/events.ts` remains the Phaser <-> Svelte boundary,
- `SaveStorage` remains the persistence adapter,
- Tauri persistence remains file-backed through `save/tauri-storage.ts`.

This supersedes the May 2026 layout spec where portraits, battle UI, typewriter effects, and new save data were explicitly excluded.

## Visual Authority

The supplied mockup defines ten canonical **1440x900** reference canvases:

1. Title
2. Field HUD
3. Bag
4. Shop
5. Quest Journal
6. Dialogue
7. Battle
8. Victory
9. Save
10. System

The shared grammar is authoritative: near-black/navy base, deep blue-violet windows, warm-gold border/inlay, cream-gold selection, emerald restorative accents, azure equipment/utility, gold progression, violet learning, rose danger/back, Zen Maru Gothic-style primary UI, Spectral-style secondary prose, and shimmer/pulse/rise motion when Motion is On.

## Goals

- Full visual parity for all ten supplied canvases.
- Reuse existing inventory/equipment/shop/quest/map/dialogue/reward logic.
- Every visible command is functional or explicitly unavailable for a real reason.
- Keep keyboard behavior intact.
- Generic pad glyphs/actions must agree with the UI controls this slice actually supports.
- Preserve saves on the shipping Tauri target, not only browser/localStorage tests.
- Remove per-step fog autosaves without losing durable purchases, inventory, quest, pickup, or discovery changes.
- Produce deterministic 1440x900 source/runtime review captures plus automated structural/behavior assertions.
- Review each source-backed surface when it lands; do not defer all visual risk to the final task.
- Human PR comparison, not cross-platform pixel-golden CI, decides visual parity.

## Non-Goals

- No exploration rewrite or new event/store architecture.
- No turn-based combat rewrite.
- No skill tree, skill registry, skill points, crafting, party/roster system, or invented combat skills.
- No witness/testimony gauge seam until a witness-boss runtime actually exists.
- No audio runtime.
- No legacy-save migration.
- No configurable Full HUD density until a Full reference/behavior is designed.
- No controller remapping, rumble, brand-specific glyphs, or analog/D-pad field movement.
- No speculative mobile redesign; desktop/Tauri is the parity target.

## UI Structure

`GameShell.svelte` remains the composition/pause/focus owner but screen bodies move into focused files under `src/lib/game/ui/`: `TitleScreen`, `FieldHud`, `CommandGrid`, `BagScreen`, `ShopScreen`, `QuestJournal`, `AreaMapScreen`, `SkillScreen`, `BattleHud`, `BattleSummary`, `SaveScreen`, `SystemScreen`, and `PromptGlyph`.

Keep `DialoguePanel.svelte` and refactor its presentation. Do not introduce a router or generic component framework.

Shell mode is only:

```ts
type GameShellMode = 'title' | 'playing';
```

Title appears before Phaser mounts. Continue/New Run chooses the start state, then Phaser boots. System is usable from Title without booting Phaser.

## Heroic Foundation

Separate behavior-preserving decomposition from the visual-language swap:

1. first extract current screen bodies from `GameShell.svelte` with existing behavior/styles unchanged,
2. then introduce Heroic tokens/materials and migrate surfaces.

Use one token source:

- Heroic color/type tokens live in the existing `src/app.css` `@theme` block.
- Optional `heroic-ui.css` contains repeated frame/plate/motion classes only; do not duplicate tokens.
- Remove redesigned-surface `.glass-*` / `.arcane-*` styling as each surface switches to Heroic.
- Remove Cinzel imports in the Heroic typography checkpoint.
- Keep bundled Spectral and add bundled Zen Maru Gothic.
- Reuse the repo's existing Sharp-based art validation approach.

## Localization Guard

Current `ja` and `zh-Hant` message files are `DeepPartial<EnglishMessages>`, so TypeScript does not prove locale key parity.

Add one automated locale-parity test before the UI expansion. It flattens leaf message paths for `en`, `ja`, and `zh-Hant` and asserts the path sets are equal. New Heroic UI strings therefore cannot silently fall back to English because a translation key was omitted.

## Title + Save Cutover

Title matches the key art/crest and three plates:

- Continue — newest valid slot location + playtime.
- New Run — Chapter I.
- System — settings.

The title/lazy-boot change and save-slot cutover are **one atomic checkpoint**. Do not leave Title reading one persistence format while `WorldScene` writes another.

Use one slot envelope through the existing `SaveStorage` adapter:

```ts
type SaveSlotRecord = {
  kind: 'autosave' | 'manual';
  savedAt: string;
  playtimeSeconds: number;
  locationLabel: string;
  thumbnail?: string;
  state: SaveState;
};

type SaveSlotsState = {
  version: 1;
  slots: [SaveSlotRecord | null, SaveSlotRecord | null, SaveSlotRecord | null];
};
```

Use `gliese.saves.v1`; once cut over, runtime no longer reads `gliese.save.v9` or its predecessor.

### Tauri persistence boundary

`SaveStorage` is only the interface. The shipping Tauri adapter currently maps known keys to files, so the slot cutover must update `save/tauri-storage.ts` and its tests in the same checkpoint.

Replace key-specific `if (key === ...)` branches with one explicit persisted-file table that maps:

- `gliese.saves.v1` -> `gliese-save.json` / temp file,
- `gliese.preferences.v1` -> `gliese-preferences.json` / temp file.

Hydration, `setItem`, `removeItem`, and `flushPendingWrites` all derive from that table. Unknown keys can remain in the in-memory cache but must not schedule disk writes. A Tauri adapter test must prove slot writes survive the file-backed path and unknown keys do not write.

### Save timing

Slot rules:

- Slot 1 is autosave-only.
- Slots 2/3 are manual.
- Continue chooses newest `savedAt`.
- New Run does not touch manual slots.
- Slot 1 saves on initial new-run WorldScene readiness, completed map transition, and applied battle result.
- Slot 1 also saves after a **successful durable state mutation**.
- Fog-cell reveal and player movement alone do not write storage.

Durable mutations include changes to persisted inventory, equipment, wallet, quest state, collected pickups, or seen discoveries. Dialogue navigation itself does not save, but a dialogue action that changes quest/save state does. The simplest WorldScene rule is to compare `buildSaveState()` before/after a HUD command and autosave only when the persisted state changed; world pickup/discovery paths autosave explicitly when they newly mutate durable state.

This preserves purchases/equipment/quest progress/pickups on quit while removing per-step fog writes.

Existing fog tests must prove:

- exploration still updates in memory,
- fog-only movement does not write Slot 1,
- the next real durable/checkpoint autosave includes the accumulated exploration state.

### Save thumbnails

Thumbnail metadata is bounded:

- 256x144 maximum,
- JPEG (or another deterministic lossy format) with a fixed quality,
- approximately 40 KiB encoded ceiling,
- if capture/encoding exceeds the ceiling, omit the thumbnail.

A slot write that throws synchronously because browser storage is full retries once with thumbnails removed. The save state must win over thumbnail decoration; the caller receives a result that can surface a visible “saved without thumbnail” status. Existing Tauri atomic-write error handling remains responsible for asynchronous disk failures.

Manual overwrite uses one in-screen confirmation.

When Title lands, remove obsolete `save` / `resume-save` bridge commands, `HudState.canResume`, and the old `loadStoredSaveState` / `saveGameState` runtime path together.

## E2E Boot Seam

Before Title exists, introduce:

```ts
export async function startNewRunFromTitle(page: Page) {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
}
```

Migrate field-first E2E call sites to that helper while boot behavior is still unchanged. The suite remains green.

In the atomic Title/save checkpoint, change only the helper body to click New Run before waiting for the canvas. Tests intentionally asserting Title keep raw `page.goto('/')`.

Current core CI already runs the complete Playwright E2E suite, so no additional Asset Integrity path-filter change is required for this work.

## Field HUD + Commands

Quiet is the only implemented HUD density and is the source-backed 1440x900 geometry. It includes portrait medallion, level, HP, XP, main quest banner, wallet, and transient status.

The command grid is exactly:

1. Bag
2. Gear
3. Quest
4. Map
5. Skill
6. Rest
7. Save
8. System

Behavior:

- Bag -> Bag/Potions.
- Gear -> Bag/Gear.
- Quest -> Quest Journal.
- Map -> existing Area Map with Heroic chrome.
- Skill -> honest empty/unavailable Skill surface.
- Rest -> existing field heal/charge action.
- Save -> Save screen.
- System -> System screen.

Shop remains contextual NPC interaction.

## Bag / Gear

Preserve current inventory/equipment rules. Source categories are Potions, Gear, Key, Loot. Current content has only consumable/equipment/key, so Loot is an honest empty grid; do not invent crafting materials.

Keep exactly 24 desktop slots, fixed empty slots, selected treatment, quantity badges, detail panel, and the five existing equipment positions: Head, Weapon, Body, Hands, Accessory. Equip/unequip stays in core/bridge rules; no drag/drop requirement.

## Shop

Preserve existing buy/sell/stock/wallet logic. Render merchant identity, Buy/Sell, item grid, detail, price, wallet before/after, unaffordable state, and equipment stat delta.

Add `previewEquipmentSwap(...)` in `core/stats.ts`; it must call `deriveEffectiveStats` before and after the candidate replacement. Svelte does not reimplement stat formulas.

## Quest Journal + Area Map

Quest Journal renders progress rings, main/side/offer differentiation, selected detail, objective chain, rewards, giver/location, and existing map context. Do not invent route/pathfinding lines.

Area Map keeps existing fog/marker/navigation/pause behavior; only chrome/focus styling changes. It receives regression review, not source-pixel-parity status, because no dedicated Map reference canvas exists.

## Skill

The source shows a Skill command but no Skill screen and current Gliese has no skill model. Do not add `content/skills.ts`, combat-looking IDs, unlock levels, or fake progression.

The command is real by opening a localized Heroic empty state such as “No skills learned yet,” with normal Back/focus behavior. Because no source canvas exists, Skill receives regression review only.

## Dialogue

Use `DialogueSession.npcId` as the stable presentation identity. Do not infer art from speaker strings.

Ship **neutral busts only** for Liam, Mira, Guild Master Arlen, Quartermaster Vale, and Blacksmith Oren. Do not generate unused pleased/concerned variants until story/runtime data can select mood.

Add a pure text-reveal helper driven by Text Speed: Slow / Normal / Instant. Confirm during reveal completes the line; confirm after reveal advances/selects; hidden choices cannot be selected.

Story prose remains Rust-owned.

## Battle

Keep current realtime movement/auto-attack/enemy AI/invulnerability/boss/drop rules. The TURN ribbon is presentation over existing cooldown readiness, not a simulation queue.

Active HUD state contains only current needs:

- hero HP/max HP/stats,
- enemy unit/name/HP/max HP/defeated,
- current target,
- bounded readiness ribbon,
- bounded recent combat feed,
- heal availability,
- usable item count,
- Flee channel/progress.

No speculative secondary/witness gauge field.

Targeting:

- nearest living enemy by default,
- left/right cycle living targets,
- auto-attack prefers selected target when in reach,
- dead/invalid target falls back to nearest living enemy.

Interventions:

- Heal reuses existing behavior.
- Item reuses existing consumable inventory behavior.
- Flee is a deterministic channel in `core/battle.ts` / `BattleScene`, not a Svelte timer.

Extend `BattleOutcome` with `fled`, but do **not** widen `BattleSummary.outcome` to include a phantom fled case:

```ts
type BattleOutcome = 'victory' | 'defeat' | 'fled';

type BattleSummary = {
  outcome: Extract<BattleOutcome, 'victory' | 'defeat'>;
  // existing reward fields
};
```

Incoming damage cancels the channel. Successful Flee returns to encounter `returnPosition` with current HP/inventory, grants no XP/coins/drops/quest defeat progress, does not clear the encounter, and produces `summary: null`.

Victory reuses existing reward summary data and one Continue action.

## System / Preferences

Use the preference document that already ships. Replace the current raw locale value at **`gliese.preferences.v1`** with one validated JSON record; do not create `gliese.ui-preferences.v1` or a second preference store.

```ts
type UiPreferences = {
  locale: Locale;
  textSpeed: 'slow' | 'normal' | 'instant';
  motion: 'on' | 'reduced';
  promptMode: 'auto' | 'pad' | 'keys';
};
```

`initializeLocale()`/locale state reads the locale field from this record; System writes through one update path. Malformed/old raw-string data falls back to defaults/detection; no migration framework is needed.

When the constant is renamed/widened, update `save/tauri-storage.ts` in the same checkpoint so the existing `gliese-preferences.json` file continues to hydrate and persist the JSON preference record; do not leave the shipping adapter importing the retired language-only constant.

Source-selected state is English / Normal / **Quiet** / On / Auto.

System rail:

- Display — supplied screen.
- Audio — visible and disabled/unavailable.
- Input — focuses the prompt/input row rather than inventing another screen.
- HUD Density — visible for source parity, Quiet selected; Full is disabled/unavailable until a Full design exists.

Reduced motion honors both saved preference and OS `prefers-reduced-motion` floor.

## Prompt / Gamepad Input

A/B/X/LB/RB glyphs must work for the UI controls that show them, but this slice does not claim full controller gameplay.

Native DOM focus alone is not enough for directional pad navigation. Add a small pure focus reducer:

```ts
type MenuFocusDirection = 'up' | 'down' | 'left' | 'right';

type MenuFocusNode = {
  id: string;
  row: number;
  column: number;
  disabled?: boolean;
};

function resolveMenuFocusTarget(
  nodes: readonly MenuFocusNode[],
  currentId: string | null,
  direction: MenuFocusDirection
): string | null;
```

Visible Heroic controls expose stable focus IDs and row/column coordinates. `GameShell` uses the reducer for keyboard-arrow and gamepad directional focus; it does not invent per-screen gamepad state machines.

Use one pure `core/gamepad.ts` snapshot/action normalizer and one `GameShell`-owned poll loop for Svelte UI navigation/modality. Route game actions through existing `HudCommand`; do not add `gliese:menu-request`, another DOM event bus, synthetic key events, or a second Phaser gamepad poller.

Supported pad scope:

- Title/command/overlay directional focus.
- confirm/cancel.
- LB/RB tabs/rails.
- dialogue advance/choice/close.
- battle target/intervention commands.

Existing Phaser keyboard movement remains unchanged. Full analog/D-pad exploration movement is deferred.

## Art

Required UI art:

1. Title key art.
2. Neutral dialogue busts for Liam, Mira, Guild Master Arlen, Quartermaster Vale, Blacksmith Oren.
3. Face portraits.
4. Liam paper doll.
5. Eight menu icons.
6. Combat icons.
7. Slime Scout + Ruins Warden plate art.
8. Battle backdrop compatible with source composition.
9. Save-thumbnail treatment.
10. Victory flourish.

Store under `public/game/assets/heroic-ui/`. No world/background regeneration solely for this UI change.

Art is integrated by the surface that first needs it, not held until the final task. Each source-backed surface must use production art before its review capture.

## Localization / Accessibility

Update `en`, `ja`, and `zh-Hant` together and keep the locale-parity test green. Preserve Escape/Back overlay ownership, focus enter/restore, `:focus-visible`, accessible image labels, real segmented controls, disabled Audio/Full-density explanation, and reduced motion.

## Visual Acceptance

Export the ten source canvases to `docs/visual-references/heroic-ui/source/`.

Each source-backed surface task ends with a matching **1440x900 runtime PNG** after its production art and source state are present. Map and Skill get regression captures. Do not wait until the final task to discover geometry/art drift.

Review capture tooling is deliberately outside the normal `tests/e2e/**/*.e2e.ts` match so human evidence generation does not become another blocking route-walk test. A dedicated review script must set the viewport explicitly:

```ts
await page.setViewportSize({ width: 1440, height: 900 });
```

It reaches states through real UI/game interactions, adds structural assertions before capture, and writes `page.screenshot({ path })`. It does **not** use `expect(page).toHaveScreenshot`, `maxDiffPixels`, or pixel comparison.

Full parity means:

- no intentional geometry/color/gradient/radius/spacing differences,
- no mockup image placeholders,
- no old glass styling on redesigned surfaces,
- correct source-locale wrapping at 1440x900,
- any intentional deviation documented and explicitly approved before merge.

Automated tests prove behavior/structure: title flow, all eight field commands through real UI interactions, 24-slot Bag/Gear deep-link, Shop affordability/stat preview, quest behavior, dialogue reveal, battle target/Heal/Item/Flee, Victory Continue, manual overwrite/newest Continue, persisted preferences, locale key parity, Tauri slot-file persistence, thumbnail fallback, and supported pad UI navigation.

Local Svelte overlays must be opened through real command-grid/keyboard interactions, not by injecting `gliese:hud-state` and assuming that changes local `GameShell` state.

## CI

Current `.github/workflows/ci.yml` already runs lint, type check, unit tests, builds, and the complete Playwright E2E suite on non-draft PRs. No Asset Integrity path-filter expansion is required for this redesign.

Review-capture scripts are manual evidence tooling; normal behavioral E2E remains in `tests/e2e/*.e2e.ts` and stays covered by core CI.

## Delivery

Keep the already-approved **single PR #39** rule, but every checkpoint must leave the branch runnable and its affected tests green.

Coherent checkpoints:

0. locale-parity guard + behavior-preserving E2E start helper migration,
1. screen extraction with visuals unchanged,
2. Heroic tokens/preferences/System,
3. atomic Title + slot envelope + Tauri file mapping + Save + durable autosave policy,
4. Field + directional focus model,
5. Bag/Gear/Skill,
6. Shop,
7. Quest/Map,
8. Dialogue,
9. pure battle/Flee contracts,
10. battle runtime/HUD/Victory,
11. thin gamepad layer over the already-landed focus model,
12. final art/parity sweep and release gates.

Execution risks:

- **Shipping persistence risk:** Tauri key-to-file routing changes in the same checkpoint as `gliese.saves.v1`.
- **Data-loss risk:** fog-only movement stops writing, but every successful durable save-state mutation autosaves.
- **E2E boot risk:** field-first tests use a helper before Title exists; the Title checkpoint changes only its body.
- **Navigation risk:** directional focus reducer lands before gamepad polling.
- **Visual-risk timing:** each surface is captured/reviewed when implemented, with 1440x900 set explicitly.
- **Visual-flake risk:** source/runtime review PNGs are human evidence, not CI pixel goldens.

The PR is not complete until all ten source-backed surfaces have approved runtime review captures, all visible actions pass the functional gate, and the shipping Tauri save path is covered by tests.
