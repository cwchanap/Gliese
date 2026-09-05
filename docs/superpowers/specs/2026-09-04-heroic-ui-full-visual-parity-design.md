# Heroic UI Full Visual Parity Design

## Summary

Replace Gliese's current mixed JRPG HUD/window presentation with the supplied
`Gliese UI Heroic(1).html` design as the visual authority for the entire playable
UI surface.

This is one implementation slice and one pull request. It covers the title flow,
field HUD, Bag/Gear, Shop, Quest Journal, Dialogue, Battle HUD, Victory, Save, and
System screens. Existing gameplay systems are reused wherever they already model
the design. Where the mockup exposes a control that current Gliese cannot honestly
represent, this slice adds the smallest runtime/data contract needed to make that
control real.

The redesign preserves the existing architecture:

- pure TypeScript owns game rules and canonical state,
- Phaser owns exploration and battle runtime,
- Svelte owns DOM UI and presentation,
- Phaser and Svelte communicate only through `ui-bridge/events.ts`,
- persistent preferences use the existing `SaveStorage` adapter.

This supersedes the May 2026 layout redesign where that earlier document excluded
portraits, minimap, battle UI, typewriter effects, and new save data.

## Visual Authority

The supplied Heroic UI mockup is the acceptance reference. The implementation is
not free to reinterpret its composition into a merely similar fantasy style.

The mockup defines ten canonical 1440x900 surfaces:

1. **Title** — crest, three gilded plates, Continue summary.
2. **Field HUD** — portrait medallion, command grid, gold-spined quest banner.
3. **Bag** — category rail, 24-slot item grid, paper doll, item detail card.
4. **Shop** — merchant panel, Buy/Sell, pre-purchase stat deltas.
5. **Quest journal** — progress rings, objective chain, reward plates.
6. **Dialogue** — character bust frame, gold nameplate, gilded choice list.
7. **Battle** — auto-battle presentation, turn ribbon, enemy plates, intervention tiles.
8. **Victory** — reward plates, quest tick, one gilded Continue action.
9. **Save** — three slots, screenshot thumbnail, stat strip, empty state.
10. **System** — category rail, segmented values, gilded active state.

The mockup's visual grammar is also authoritative:

- deep blue-violet windows over a near-black/navy base,
- fine warm-gold outer border and inlay line,
- etched corner marks,
- cream-gold selected fill with radiant highlight/glow,
- emerald for restorative state,
- azure for equipment/utility state,
- gold for progression/advance state,
- violet for skill/learning state,
- rose for damage/danger/back state,
- `Zen Maru Gothic`-style UI typography plus `Spectral`-style serif secondary copy,
- glints, shimmer sweeps, pulses, and rise transitions when Motion is On.

Representative mockup colors should become named CSS variables rather than being
retyped per screen: `#070512`, `#ffe08a`, `#8dffbd`, `#a9c8ff`, `#d9a9ff`, and
`#ff8a9e`, plus the repeated blue-violet surface gradients.

Do not introduce a generic design-system package. A small Heroic stylesheet plus
screen-focused components is enough.

## Goals

- Reach full visual parity with every supplied Heroic reference surface.
- Keep one coherent UI language from boot through field, menus, battle, and save.
- Reuse existing inventory, equipment, quest, shop, map, dialogue, battle reward,
  and persistence rules rather than rebuilding them in Svelte.
- Make every visible command either functional or explicitly unavailable for a
  source-backed reason.
- Add only the missing mechanics required by the mockup: title/start flow,
  three-slot save presentation/storage, dialogue portraits and text reveal,
  battle presentation telemetry and intervention commands, prompt modality,
  persisted UI preferences, and a minimal Skill surface.
- Keep keyboard navigation first-class and add gamepad navigation where prompt
  glyphs claim gamepad support.
- Make visual parity mechanically testable with deterministic screenshot states.

## Non-Goals

- No rewrite of Phaser exploration.
- No replacement of the custom DOM event bridge.
- No conversion of combat into a separate turn-based rules engine. Current
  realtime movement/auto-attack behavior remains authoritative; the mockup's turn
  ribbon is a presentation of combat readiness/action cadence.
- No skill tree, skill-point currency, talent graph, or large new skill combat
  system.
- No new quest framework, inventory framework, shop framework, or map framework.
- No crafting, party system, or character roster system.
- No legacy save migration. Old prototype saves may be rejected/reset when the
  save schema/storage contract changes.
- No new audio runtime invented from the System rail. The mockup shows an Audio
  category but supplies no audio values or behavior. It stays visibly unavailable
  until an audio feature has its own design.
- No speculative mobile redesign. Desktop/Tauri is the parity target; narrower
  widths must remain usable but do not need a second bespoke mockup language.

## Architecture

### Ownership

`GameShell.svelte` remains the Svelte composition root, but it should stop being
the implementation body for every screen.

Recommended focused components:

- `TitleScreen.svelte`
- `FieldHud.svelte`
- `CommandGrid.svelte`
- `BagScreen.svelte`
- `ShopScreen.svelte`
- `QuestJournal.svelte`
- existing `DialoguePanel.svelte`, refactored for Heroic presentation
- `BattleHud.svelte`
- `BattleSummary.svelte`
- `SaveScreen.svelte`
- `SystemScreen.svelte`
- `SkillScreen.svelte`
- `PromptGlyph.svelte` for repeated pad/key prompt rendering

This is decomposition for maintainability, not a reusable component framework.
The visual frame/plate rules should primarily live in CSS classes and variables so
screen files can stay explicit and easy to compare to the reference.

### App/UI mode

Add a small Svelte-owned UI mode:

```ts
type GameShellMode = 'title' | 'playing';
```

The title screen appears before the Phaser instance is created. `Continue` or
`New Run` selects a save/start intent and then mounts Phaser. `System` can be used
from the title screen without booting the game runtime.

Do not add a router. Gliese still mounts one `App.svelte` at the root.

### HUD bridge

The bridge remains the single runtime boundary. Extend `HudState` only with
render-ready state needed by the supplied UI, and add commands only when a visible
UI action needs a real runtime operation.

Do not move combat arithmetic, equipment comparison, quest rules, or persistence
validation into Svelte components.

## Heroic Presentation Foundation

Add a small `heroic-ui.css` (or equivalent section in existing game UI CSS) with:

- named color variables,
- window/background gradients,
- gold inlay/frame treatment,
- selected cream-gold treatment,
- tint helpers for emerald/azure/gold/violet/rose/slate,
- common focus-visible ring,
- shimmer/pulse/rise keyframes,
- reduced-motion overrides,
- typography roles.

Use package-provided/bundled application fonts rather than runtime Google Font
network requests so the Tauri build remains offline-safe. Do not copy font bytes
from the uploaded mockup into the repository.

Decorative SVG line icons can live as inline paths or a small local icon module.
Do not bring in a large icon framework just for this redesign.

## Title Screen

### Layout

Match the mockup's title key art, crest/logo zone, and three vertical gilded
selection plates:

- Continue — metadata includes latest slot location and playtime.
- New Run — Chapter I.
- System — preference access.

### Behavior

- Continue is disabled when no valid save slot exists.
- Continue loads the newest valid slot by save timestamp, not hard-coded slot 1.
- New Run creates a clean run. Slot 1 receives its first autosave when the initial
  `WorldScene` is ready; it does not touch manual slots at selection time.
- After that, autosave writes Slot 1 only at coarse checkpoints: after a completed
  map transition and after a battle result is applied. Do not autosave movement,
  pickups, every dialogue line, or every HUD change.
- System opens `SystemScreen` over the title context and returns to Title on Back.

The game canvas is not mounted behind the title screen.

## Field HUD

### Persistent hero plate

Match the reference top-left medallion composition:

- hero face portrait,
- level badge,
- HP current/max and bar,
- XP progress and bar,
- same gold/blue-violet frame treatment.

Existing `hp`, `maxHp`, `level`, and `xp` remain authoritative.

### Quest banner

Keep the active/main objective in the Heroic gold-spined banner treatment. Reuse
the existing quest HUD state; do not create a duplicate active-quest field.

### Currency and field feedback

Wallet and transient status feedback should use the small Heroic pill/plate
language instead of the old glass HUD cards.

### Command grid

The command grid must expose the supplied eight entries in the supplied order:

1. Bag
2. Gear
3. Quest
4. Map
5. Skill
6. Rest
7. Save
8. System

Behavior:

- **Bag** opens Bag on the Potions category.
- **Gear** opens Bag directly on the Gear category.
- **Quest** opens Quest Journal.
- **Map** opens the existing Area Map overlay with Heroic chrome.
- **Skill** opens the minimal Skill screen described below.
- **Rest** reuses the existing field-heal action/charge semantics; it is not a new
  campsite/time system.
- **Save** opens the three-slot Save screen rather than immediately writing one
  anonymous save.
- **System** opens System.

The current nearby Shop interaction remains contextual; it does not consume one of
the eight mockup command slots. Existing NPC/shop interaction can still open Shop
automatically through the bridge.

## Bag And Gear

The Bag screen replaces the current inventory modal presentation while preserving
its canonical inventory/equipment data.

### Categories

Match the supplied rail:

- Potions
- Gear
- Key
- Loot

Mapping:

- Potions -> existing consumable stacks.
- Gear -> existing equipment inventory + equipped slots.
- Key -> existing key items.
- Loot -> non-usable material/drop stacks when such items exist; otherwise render
  the source-designed empty grid state. Do not invent crafting value for Loot.

### Item grid

- Keep exactly 24 visible slots at the canonical desktop state.
- Empty slots remain fixed so layout does not jump.
- Selected item receives the cream-gold treatment.
- Quantity badges and semantic tint follow the mockup.
- Existing item icons remain valid until replacement art is approved; no missing
  icon may render as a broken image.

### Gear paper doll

Render the five existing equipment slots around the hero paper-doll:

- Head
- Weapon
- Body
- Hands
- Accessory

Selection/equip/unequip continues through existing core rules and bridge commands.
The item detail panel renders stat modifiers from canonical item metadata.

No drag/drop is required; keyboard/gamepad selection plus confirm is sufficient.

## Shop

Reuse existing buy/sell stock, wallet, and inventory validation.

The Heroic Shop must render:

- merchant portrait/bust area,
- shop/merchant identity,
- Buy/Sell tabs,
- image-first stock/inventory grid,
- selected-item detail panel,
- price and owned quantity,
- wallet before/after value,
- explicit unaffordable state,
- equipment stat delta preview before purchase.

Stat delta preview must be derived from the same effective-stat/equipment logic the
game uses after equip. Svelte must not implement a second stat formula.

## Quest Journal

Reuse the existing quest definitions/state and quest acceptance flow.

Match the reference composition:

- left quest list,
- progress rings,
- main/side/offer differentiation,
- selected quest title and metadata,
- objective chain,
- rewards,
- giver/location context,
- local area/map preview where existing area-map data can represent it.

Do not invent pathfinding or world navigation to support the preview. If an exact
mini-map route is not available, show the existing map marker/context rather than a
fake route.

## Dialogue

### Presentation

Refactor `DialoguePanel.svelte` to match the mockup:

- large speaker bust frame,
- gold nameplate,
- wide bottom text plate,
- selected choice uses cream-gold treatment,
- choice list sits to the right as designed,
- progress/advance indicator matches the supplied composition.

### Portrait contract

Extend dialogue render state with a portrait/bust identity, not raw prose-specific
asset paths embedded in Svelte logic.

Static mapping can live in content/presentation metadata keyed by speaker/NPC ID.
Story prose remains Rust-owned; this change must not push dialogue prose into the
frontend bundle.

### Text reveal

Add real typewriter/reveal state driven by the persisted Text Speed preference:

- Slow
- Normal
- Instant

Interaction rule:

- confirm while text is revealing -> reveal the current line immediately,
- confirm after full reveal -> advance/select as today,
- choice mode does not select a hidden/partially revealed choice by accident.

The exact milliseconds-per-character can be implementation constants and should be
tuned for the three supplied labels; they are not save-game state.

## Battle

### Preserve current combat rules

Do not convert the current realtime `BattleScene` into a new turn-based simulator.
The hero can keep moving and auto-attacking; enemies keep their current movement,
attack, invulnerability, boss phase, drops, and outcome rules.

The Heroic Battle UI presents that runtime in the language shown by the mockup.

### Required render state

Extend `HudBattleState` for the active phase with render-ready telemetry:

- hero HP/max HP,
- enemy unit ID/name/HP/max HP/defeated state,
- current target ID,
- readiness/order ribbon entries derived from actual cooldown/action readiness,
- recent combat feed entries,
- heal availability,
- usable battle-item count,
- flee cooldown/channel progress,
- optional secondary enemy gauge for future story boss presentation.

The optional secondary gauge is the seam needed by the story bible's witness-boss
`testimony gauge`; it remains absent for normal enemies. This UI slice does not
implement the full testimony/persuasion boss system.

### Targeting

Current auto-attack behavior needs one explicit target concept for the Heroic
`TARGETED` enemy plate. Keep it simple:

- default target is the nearest living enemy,
- keyboard/gamepad left/right target cycling changes the target,
- auto-attack prefers the selected target when in range,
- if target dies, choose the nearest remaining enemy.

No free cursor or tactical targeting mode.

### Turn ribbon

The supplied `TURN` ribbon is a presentation of recent/next action readiness, not a
new queue that controls simulation truth.

Build its entries from hero/enemy attack cooldowns and active/inactive state. The
ribbon can show a bounded number of upcoming actors and may update as cooldowns
change.

### Combat feed

Publish a small bounded feed of recent meaningful events:

- hero damage to enemy,
- enemy damage to hero,
- heal/item recovery,
- defeated enemy.

Do not persist the feed in SaveState.

### Intervention tiles

Match the supplied three actions:

- **Heal** — reuse the existing heal/charge behavior inside battle.
- **Item** — opens a compact Heroic battle consumable selector and consumes through
  existing inventory logic.
- **Flee** — new real command with visible channel/cooldown state.

Extend the core battle outcome contract with `fled`. A fled battle applies the
hero HP/inventory/return position but produces no Battle Summary; `BattleScene`
returns directly to `WorldScene`.

Flee behavior:

- starts a short fixed channel represented by the supplied countdown/progress
  treatment,
- taking damage cancels the active flee channel,
- successful flee returns to the encounter's `returnPosition`,
- grants no XP, coins, drops, quest defeat progress, or cleared-encounter flag,
- preserves current hero HP and inventory consumption,
- the encounter remains available in the world.

This keeps the mechanic deterministic; no random flee percentage is needed.

## Victory

Replace the current summary modal with the supplied Victory composition.

Reuse existing summary data:

- XP gained,
- coins gained,
- drops,
- enemies defeated,
- level-up state,
- quest completion/progress/rewards.

There is one primary Continue action. It dismisses the result and returns through
the existing BattleScene -> WorldScene handoff.

No second reward claim state is introduced.

## Save System

### Storage model

The mockup requires three visible slots:

- Slot 1 — Autosave
- Slot 2 — Manual
- Slot 3 — Manual/empty

Replace the single anonymous save key with a small slot envelope rather than
creating three unrelated persistence implementations.

Suggested shape:

```ts
type SaveSlotKind = 'autosave' | 'manual';

type SaveSlotRecord = {
  kind: SaveSlotKind;
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

The slot envelope is a storage concern. Keep the existing `SaveState` focused on
canonical game state unless a field such as playtime truly belongs in the game
save itself.

No migration from `gliese.save.v9` is required. A stale prototype save may reset.

### Slot behavior

- Slot 1 is reserved for autosave writes.
- Slots 2 and 3 are manual save targets.
- Manual Save screen selection can overwrite a populated manual slot after one
  in-screen confirmation state.
- Selecting a populated slot from Title/Continue loads it.
- Continue chooses the record with the newest `savedAt`.
- Empty manual slot shows the exact empty-state language from the mockup.

### Thumbnail

Store a small JPEG/WebP data URL or equivalent compact browser-safe encoded image
captured from the Phaser canvas at save time.

Do not store a full-resolution screenshot. Target the 16:9 card use case only.
If capture fails, save must still succeed and render a deterministic placeholder.

### Metadata

The UI needs:

- chapter label,
- location label,
- playtime,
- save timestamp,
- level,
- coins,
- HP/max HP.

Level/coins/HP derive from `SaveState` at render time. Store only metadata that
cannot be recovered cheaply (timestamp, playtime, thumbnail, human-readable
location label if the canonical map label is not directly available).

## System / Preferences

Preferences stay in the existing preference-backed `SaveStorage`, separate from
save slots.

Add one preferences object/version that includes:

```ts
type TextSpeed = 'slow' | 'normal' | 'instant';
type HudDensity = 'quiet' | 'full';
type MotionPreference = 'on' | 'reduced';
type PromptMode = 'auto' | 'pad' | 'keys';
```

Language continues to use the existing locale registry and should remain compatible
with `en`, `ja`, and `zh-Hant`, even though the static mockup only demonstrates
English and Japanese buttons.

### Display & Text

Implement the supplied rows:

- Language
- Text speed
- HUD density
- Motion
- Prompts

Behavior:

- **HUD Full** is the canonical visual-parity state.
- **HUD Quiet** hides secondary field plates/banner detail while retaining critical
  HP/danger, interaction prompt, and active modal/dialogue state.
- **Motion On** enables reference glints/sweeps/pulses.
- **Motion Reduced** disables continuous/decorative animation and reduces screen
  entrance motion while keeping state changes readable.
- OS `prefers-reduced-motion` acts as a safety floor even if the saved preference
  says On.

### System rail

The mockup visibly includes Display, Audio, and Input categories.

- Display is implemented by this slice.
- Input opens the prompt/input presentation controls.
- Audio remains present but disabled with an accessible unavailable label because
  the supplied source defines no Audio values and current Gliese has no audio
  runtime. Do not invent Master/Music/SFX sliders in this ticket.

## Prompt And Gamepad Input

The design visibly uses A/B/X/LB/RB-style glyphs, so gamepad presentation must not
be decorative-only.

Add a small input-modality layer for Svelte menus:

- keyboard remains supported everywhere,
- one connected standard gamepad can navigate Heroic menus with D-pad/left stick,
  confirm/cancel, and rail switching,
- the same standard gamepad can move the hero in exploration and trigger the
  currently advertised field interaction/menu actions, so pad field prompts are
  never decorative-only,
- `PromptMode='auto'` displays glyphs for the most recently used supported
  modality,
- `pad` forces pad glyphs,
- `keys` forces keyboard glyphs.

Do not add remapping, multiple-controller assignment, rumble, or platform-specific
Xbox/PlayStation detection. One generic pad glyph set is sufficient.

Keyboard exploration remains unchanged. Gamepad movement/interaction is added only
to the same basic actions the field UI advertises; do not add remapping, rumble,
or controller-specific action layers.

## Skill Screen

The Field mockup includes a Skill command but supplies no Skill screen reference.
The user requested missing implied mechanics to be in scope, so implement the
smallest real surface instead of a dead button.

Add a tiny content-driven skill registry with:

- ID,
- localized name/description,
- unlock level,
- semantic tint/icon metadata.

Known skills are derived from current player level; do not add skill points or a
separate learned-skill persistence list. The screen is read-only: it shows known
and next-level skills in the Heroic window language.

This makes the command meaningful without expanding combat rules. Active skill
activation is explicitly outside this ticket.

## Area Map

Keep the existing pause-owned Area Map behavior, fog-of-war, markers, and keyboard
navigation.

Only change its presentation shell and selection/focus treatment so it belongs to
the Heroic UI. The supplied ten-screen mockup has no separate Map reference, so the
Field/Bag window grammar is the source for its chrome rather than inventing a new
map visual language.

## Art Assets

The mockup explicitly calls for production art rather than empty image slots.
Required art set:

1. Title key art.
2. Character dialogue busts for Liam, Mira, Guild Master Arlen, Quartermaster Vale,
   and Blacksmith Oren, including the expression variants actually used by current
   dialogue.
3. Face portraits for medallion/identity plates.
4. Liam paper-doll silhouette.
5. Eight command/menu icons.
6. Combat intervention/event icons.
7. Enemy plate portraits for Slime Scout and Ruins Warden.
8. Battle backdrop compatible with the reference composition.
9. Save thumbnail treatment (runtime captures, not three fixed paintings).
10. Victory flourish.

Generated or painted assets should live under `public/game/assets/heroic-ui/` with
metadata in the existing asset content layer where Phaser needs to preload them.
Svelte-only static UI art can reference the public paths directly.

Do not regenerate existing world/background art solely for this UI ticket. The
Heroic overlay must work over current world rendering.

## Localization

All visible UI strings continue through the existing i18n system.

Add keys for:

- title actions and metadata labels,
- eight field commands,
- Bag category names,
- Battle action/status/feed labels,
- Save slot labels/confirmation,
- System preference labels/options,
- Skill surface labels,
- accessibility/unavailable text.

Update `en`, `ja`, and `zh-Hant` together.

Content-derived names continue through existing localized content helpers.

## Accessibility And Focus

Every screen must remain fully usable without a mouse.

- Escape/B closes the current overlay according to ownership.
- focus moves into newly opened screen/modal and returns to the invoking command.
- visible selected state and `:focus-visible` must agree.
- image tiles have accessible labels from item/enemy/character names.
- segmented settings are real radio/button controls, not styled spans.
- disabled Audio category announces why it is unavailable.
- motion preference and OS reduced-motion are honored.
- no focus trap may strand the user behind the Phaser canvas.

## Error Handling

Keep failure behavior simple and local:

- missing optional portrait -> deterministic silhouette/fallback frame,
- missing thumbnail -> placeholder image, save still succeeds,
- invalid slot record -> mark that slot unavailable; do not crash the title screen,
- no valid slots -> Continue disabled,
- unavailable battle item -> Item tile disabled with current inventory count,
- Flee cannot start while battle is already resolving/summary,
- optional secondary boss gauge omitted when no data exists,
- unsupported gamepad APIs fall back to keyboard prompts in Auto mode.

Do not add a global error framework.

## Full Visual Parity Acceptance

### Canonical viewport

The primary comparison viewport is **1440x900**, exactly matching every supplied
reference canvas.

### Required reference states

At minimum capture deterministic visual evidence for:

- Title with Continue selected and valid save metadata.
- Field HUD with Full density and command grid open.
- Bag / Potions with a selected occupied slot.
- Bag / Gear with equipped and empty paper-doll slots.
- Shop / Buy with an equipment item selected and stat delta visible.
- Quest Journal with a selected active quest.
- Dialogue with a bust and multiple choices, first choice selected.
- Battle with two enemies, one targeted, populated turn ribbon/feed, Heal selected,
  and Flee cooling/channeling.
- Victory with XP/coins/drop/foes and quest update.
- Save with autosave, manual save, and empty slot.
- System / Display & Text with one active segmented option per row.
- Area Map under Heroic chrome.
- Skill screen with at least one known and one future level-gated entry.

### Pixel gate

Use Playwright screenshot assertions for canonical states. Expected screenshots are
checked into the normal Playwright snapshot location.

Acceptance rules:

- no intentional geometry differences,
- no intentional color/gradient/border-radius/spacing differences,
- no placeholder `image-slot` boxes,
- no old glass-panel styling visible on redesigned surfaces,
- text wrapping must match at the canonical viewport for the reference locale,
- antialiasing/subpixel rendering may use a very small technical screenshot
  tolerance, but the tolerance cannot hide layout/color drift.

Any intentional deviation from the supplied mockup must be called out in the PR
and approved before merge. The default is parity, not reinterpretation.

### Functional gate

Visual parity is not sufficient if the controls are fake. The same acceptance run
must verify:

- Continue/New Run/System title flow,
- every field command,
- Bag equip/use/unequip,
- Shop buy/sell and unaffordable state,
- quest selection/acceptance where applicable,
- dialogue reveal/advance/choice,
- battle target cycling, Heal, Item, Flee,
- Victory Continue,
- manual save overwrite and latest-slot Continue,
- persisted System preferences,
- keyboard and generic gamepad menu navigation.

## Testing Strategy

### Pure TypeScript

Add focused tests for new logic only:

- save-slot select/latest/write behavior,
- flee state machine/result semantics,
- battle target selection/cycling,
- turn-ribbon derivation from cooldown/readiness,
- bounded combat feed,
- text-speed preference normalization,
- prompt-mode/modality selection,
- skill level-gating.

### Svelte browser/component tests

Cover:

- each screen renders the required reference information,
- keyboard focus/close/restore behavior,
- segmented settings are interactive,
- text reveal completion vs advance,
- Bag Gear deep-link and fixed 24 slots,
- Shop delta/affordability treatment,
- battle intervention disabled/cooling states,
- title Continue disabled when slots are empty.

### Phaser scene tests

Extend existing scene tests for:

- active battle telemetry publication,
- target changes affecting preferred auto-attack target,
- heal/item bridge commands in battle,
- flee cancellation on damage and successful return without rewards/clear flags,
- save thumbnail capture command seam only if Phaser owns capture.

### E2E

Update the existing game boot flow to start at Title, then cover one integrated
path through Continue/New Run into the field.

Add deterministic screenshots for the canonical parity states listed above. Prefer
fixture/save seeding and existing command seams over long brittle movement scripts
when the purpose is UI state verification.

## Likely Files / Modules

The implementation plan may refine names, but expected ownership is:

- `src/lib/game/GameShell.svelte`
- `src/lib/game/DialoguePanel.svelte`
- new focused Svelte files under `src/lib/game/ui/`
- `src/lib/game/ui/heroic-ui.css` or equivalent imported stylesheet
- `src/lib/game/ui-bridge/events.ts`
- `src/lib/game/ui-bridge/store.ts`
- `src/lib/game/phaser/scenes/BattleScene.ts`
- `src/lib/game/phaser/scenes/WorldScene.ts`
- `src/lib/game/core/battle.ts`
- new small core modules for battle targeting/flee/save slots/input modality/skills
  only where pure logic deserves separation
- `src/lib/game/save/storage.ts` plus slot storage helper
- existing i18n preference module extended for Heroic UI preferences
- `src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts`
- `src/lib/game/content/assets.ts` and/or presentation metadata
- `public/game/assets/heroic-ui/`
- existing Svelte/unit/scene/E2E tests and Playwright snapshots.

Do not create a second store architecture or introduce a state-management library.

## Delivery Shape

This ticket lands as **one pull request**.

Implementation can be worked in internal checkpoints, but there is no mergeable
partial-Heroic state:

1. Heroic tokens/components + title shell.
2. Field HUD/command grid + Bag/Shop/Quest/Map/Skill/System surfaces.
3. Dialogue portraits + text reveal.
4. Battle telemetry/interventions + Victory.
5. Three-slot save flow.
6. Art integration and canonical screenshot parity pass.
7. Full regression and E2E verification.

The PR is complete only when all canonical surfaces satisfy the visual and
functional gates above.
