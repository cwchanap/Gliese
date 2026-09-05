# Heroic UI Full Visual Parity Design

## Summary

Replace Gliese's current mixed JRPG HUD/windows with the supplied `Gliese UI Heroic(1).html` as the visual authority for the playable UI.

This remains one implementation ticket and draft PR #39. It covers the ten supplied surfaces: Title, Field HUD, Bag, Shop, Quest Journal, Dialogue, Battle, Victory, Save, and System. Existing game systems stay authoritative. When the mockup exposes a control Gliese cannot currently represent, add only the smallest honest behavior required; do not invent progression/content merely to fill a visual hole.

Keep the existing architecture:

- pure TypeScript owns game rules/state,
- Phaser owns exploration and battle runtime,
- Svelte owns DOM UI/presentation,
- `ui-bridge/events.ts` remains the Phaser <-> Svelte boundary,
- `SaveStorage` remains the persistence adapter.

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
- Produce deterministic 1440x900 source/runtime review captures plus automated structural/behavior assertions.
- Human PR comparison, not cross-platform pixel-golden CI, decides visual parity.

## Non-Goals

- No exploration rewrite or new event/store architecture.
- No turn-based combat rewrite.
- No skill tree, skill registry, skill points, crafting, party/roster system, or invented combat skills.
- No witness/testimony gauge seam until a witness-boss runtime actually exists.
- No audio runtime.
- No legacy-save migration.
- No controller remapping, rumble, brand-specific glyphs, or full controller movement project.
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

Use one token source. Replace the current Arcane/Glass language instead of running two palettes/fonts in parallel:

- Heroic color/type tokens live in the existing `src/app.css` `@theme` block.
- Optional `heroic-ui.css` contains repeated frame/plate/motion classes only; do not duplicate tokens.
- Remove redesigned-surface `.glass-*` / `.arcane-*` styling as those surfaces switch to Heroic.
- Remove Cinzel imports in the same typography checkpoint.
- Keep bundled Spectral and add bundled Zen Maru Gothic.
- Reuse the repo's existing Sharp-based art validation approach.

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

Use one new key such as `gliese.saves.v1`; once cut over, runtime no longer reads `gliese.save.v9` or its predecessor.

Rules:

- Slot 1 is autosave-only.
- Slots 2/3 are manual.
- Continue chooses newest `savedAt`.
- New Run does not touch manual slots.
- Slot 1 saves only on initial new-run WorldScene readiness, completed map transition, and applied battle result.
- Movement, fog reveal, discoveries, pickups, and dialogue do not write storage by themselves.
- Existing fog/discovery tests must be rewritten to prove in-memory state still changes while storage remains unchanged.
- Manual overwrite uses one in-screen confirmation.
- A small 16:9 thumbnail is metadata; thumbnail failure does not block saving.

When Title lands, remove obsolete `save` / `resume-save` bridge commands, `HudState.canResume`, and the old `loadStoredSaveState` / `saveGameState` runtime path together. The E2E suite gains and adopts a shared real `startNewRunFromTitle(page)` helper in the same checkpoint.

## Field HUD + Commands

Quiet density is the source-backed 1440x900 geometry. It includes portrait medallion, level, HP, XP, main quest banner, wallet, and transient status.

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

Extend `BattleOutcome` with `fled`. Incoming damage cancels the channel. Successful Flee returns to encounter `returnPosition` with current HP/inventory, grants no XP/coins/drops/quest defeat progress, does not clear the encounter, and produces no Victory/Defeat summary.

Victory reuses existing reward summary data and one Continue action.

## System / Preferences

Use the preference document that already ships. Replace the current raw locale value at **`gliese.preferences.v1`** with one validated JSON record; do not create `gliese.ui-preferences.v1` or a second preference store.

```ts
type UiPreferences = {
  locale: Locale;
  textSpeed: 'slow' | 'normal' | 'instant';
  hudDensity: 'quiet' | 'full';
  motion: 'on' | 'reduced';
  promptMode: 'auto' | 'pad' | 'keys';
};
```

`initializeLocale()`/locale state reads the locale field from this record; System writes through one update path. Malformed/old raw-string data falls back to defaults/detection; no migration framework is needed.

Source-selected state is English / Normal / **Quiet** / On / Auto.

System rail:

- Display — supplied screen.
- Audio — visible and disabled/unavailable.
- Input — focuses the prompt/input row rather than inventing another screen.

Reduced motion honors both saved preference and OS `prefers-reduced-motion` floor.

## Prompt / Gamepad Input

A/B/X/LB/RB glyphs must work for the UI controls that show them, but this slice does not claim full controller gameplay.

Use one pure `core/gamepad.ts` snapshot/action normalizer and one `GameShell`-owned poll loop for Svelte UI navigation/modality. Route game actions through existing `HudCommand`; do not add `gliese:menu-request`, another DOM event bus, or synthetic key events.

Supported pad scope:

- Title/command/overlay navigation.
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

## Localization / Accessibility

Update `en`, `ja`, and `zh-Hant` together. Preserve Escape/Back overlay ownership, focus enter/restore, `:focus-visible`, accessible image labels, real segmented controls, disabled Audio explanation, and reduced motion.

## Visual Acceptance

Export the ten source canvases to `docs/visual-references/heroic-ui/source/` and capture matching **1440x900 runtime PNGs** for Title, Field, Bag, Shop, Quest, Dialogue, Battle, Victory, Save, and System. Map and Skill get regression captures.

These PNGs are **human-review evidence**, not Playwright `toHaveScreenshot` goldens. Do not add `maxDiffPixels` or platform-sensitive pixel comparison as a CI merge gate. The PR reviewer compares source/runtime pairs.

Full parity still means:

- no intentional geometry/color/gradient/radius/spacing differences,
- no mockup image placeholders,
- no old glass styling on redesigned surfaces,
- correct source-locale wrapping at 1440x900,
- any intentional deviation documented and explicitly approved before merge.

Automated tests prove behavior/structure: title flow, all eight field commands through real UI interactions, 24-slot Bag/Gear deep-link, Shop affordability/stat preview, quest behavior, dialogue reveal, battle target/Heal/Item/Flee, Victory Continue, manual overwrite/newest Continue, persisted preferences, and supported pad UI navigation.

Local Svelte overlays must be opened through real command-grid/keyboard interactions, not by injecting `gliese:hud-state` and assuming that changes local `GameShell` state.

## Delivery

Keep the already-approved **single PR #39** rule, but every checkpoint must leave the branch runnable and its affected tests green. The plan must not rely on a final cleanup task to repair E2E.

Coherent checkpoints:

1. Heroic foundation + screen extraction while preserving current boot.
2. Unified preferences + System.
3. Atomic Title + slot envelope + Save + autosave policy + E2E start-helper cutover.
4. Field/Bag/Gear/Shop/Quest/Map/Skill surfaces.
5. Dialogue neutral bust + text reveal.
6. Pure battle/Flee contracts.
7. Battle runtime + HUD + Victory.
8. Minimal pad UI navigation through existing bridge only.
9. Production art + source/runtime review captures.
10. Full automated regression + explicit human visual-parity approval.

Execution risks:

- **E2E boot risk:** move the New Run helper and field-first tests in the same checkpoint as lazy Title.
- **Persistence-policy risk:** rewrite fog/discovery persistence assertions in the slot cutover because changed write timing is intentional.
- **Visual-flake risk:** use deterministic review captures plus structural/behavior tests instead of CI pixel goldens.

The PR is not complete until all ten source-backed surfaces have approved runtime review captures and all visible actions pass the functional gate.
