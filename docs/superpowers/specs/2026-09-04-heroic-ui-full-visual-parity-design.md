# Heroic UI Full Visual Parity Design

## Summary

Replace Gliese's current mixed JRPG HUD/windows with the supplied
`Gliese UI Heroic(1).html` as the visual authority for the playable UI.

This is one implementation slice and one PR. It covers the ten supplied surfaces:
Title, Field HUD, Bag, Shop, Quest Journal, Dialogue, Battle, Victory, Save, and
System. Existing game systems stay authoritative. When the mockup exposes a control
Gliese cannot currently represent, add the smallest real mechanic/data contract
needed instead of faking the control.

Keep the existing architecture:

- pure TypeScript owns game rules/state,
- Phaser owns exploration and battle runtime,
- Svelte owns DOM UI/presentation,
- `ui-bridge/events.ts` remains the Phaser <-> Svelte boundary,
- persistent preferences continue through `SaveStorage`.

This supersedes the May 2026 layout spec where that earlier pass explicitly excluded
portraits, battle UI, typewriter effects, and new save data.

## Visual Authority

The supplied mockup defines ten canonical **1440x900** reference canvases:

1. **Title** — crest, three gilded plates, Continue summary.
2. **Field HUD** — portrait medallion, command grid, gold-spined quest banner.
3. **Bag** — category rail, 24-slot grid, paper doll, detail card.
4. **Shop** — merchant panel, Buy/Sell, pre-purchase stat deltas.
5. **Quest Journal** — progress rings, objective chain, reward plates.
6. **Dialogue** — bust frame, gold nameplate, gilded choices.
7. **Battle** — auto-battle presentation, turn ribbon, enemy plates, interventions.
8. **Victory** — reward plates, quest tick, one Continue action.
9. **Save** — three slots, screenshot, stat strip, empty state.
10. **System** — category rail, segmented values, gilded active state.

The shared grammar is also authoritative:

- near-black/navy base with deep blue-violet window gradients,
- warm gold outer border/inlay and etched corner marks,
- cream-gold selected fill with radiant highlight,
- emerald = restorative,
- azure = equipment/utility,
- gold = progression/advance,
- violet = skill/learning,
- rose = danger/back,
- Zen Maru Gothic-style UI typography plus Spectral-style serif secondary copy,
- shimmer/pulse/rise motion when Motion is On.

Promote repeated values such as `#070512`, `#ffe08a`, `#8dffbd`, `#a9c8ff`,
`#d9a9ff`, and `#ff8a9e` into CSS variables. Do not add a general-purpose design
system package; one Heroic stylesheet plus focused screen components is enough.

## Goals

- Full visual parity for all ten supplied reference canvases.
- One coherent UI language from title through field, battle, and save.
- Reuse inventory/equipment/shop/quest/map/dialogue/reward logic already in core.
- Every visible command is real or explicitly unavailable for a source-backed reason.
- Add only the missing mechanics required to make the mockup honest.
- Keyboard and generic gamepad prompts/actions agree with actual controls.
- Deterministic screenshot states make visual acceptance mechanical.

## Non-Goals

- No exploration rewrite.
- No replacement event/store architecture.
- No conversion of current realtime auto-attack combat into a new turn-based engine.
- No skill tree, skill points, crafting, party system, or roster system.
- No legacy-save migration; prototype saves may reset after the storage change.
- No speculative mobile redesign. Desktop/Tauri is the parity target.
- No invented audio system: the mockup shows an Audio rail item but defines no
  Audio values, and current Gliese has no audio runtime.

## UI Structure

`GameShell.svelte` remains the composition root but should no longer contain every
screen body. Prefer explicit, screen-focused files under `src/lib/game/ui/`:

- `TitleScreen.svelte`
- `FieldHud.svelte`
- `CommandGrid.svelte`
- `BagScreen.svelte`
- `ShopScreen.svelte`
- `QuestJournal.svelte`
- `BattleHud.svelte`
- `BattleSummary.svelte`
- `SaveScreen.svelte`
- `SystemScreen.svelte`
- `SkillScreen.svelte`
- `PromptGlyph.svelte`

Keep `DialoguePanel.svelte` but refactor its presentation. Reuse CSS classes/tokens
for frames and plates instead of building generic Svelte component abstractions.

Add only one shell mode:

```ts
type GameShellMode = 'title' | 'playing';
```

Title appears before Phaser mounts. Continue/New Run chooses the start state and then
mounts Phaser. System can open from Title without booting the game. Do not add a
router.

## Heroic Foundation

Add `heroic-ui.css` (or equivalent game UI stylesheet section) containing:

- color/gradient variables,
- frame/inlay/selection classes,
- semantic tint classes,
- focus-visible treatment,
- shimmer/pulse/rise animations,
- reduced-motion overrides,
- typography roles.

Use package-provided/bundled application fonts so Tauri remains offline-safe. Do not
copy font bytes from the uploaded mockup. Inline/local SVG paths are enough for the
small icon set; do not add a large icon library.

## Title

Match the supplied key-art/crest composition and three selection plates:

- **Continue** — newest valid slot location + playtime.
- **New Run** — Chapter I.
- **System** — settings access.

Behavior:

- Continue is disabled with no valid slots.
- Continue loads the valid slot with newest `savedAt`.
- New Run creates a clean run without touching manual slots.
- Slot 1 receives its first autosave once the initial `WorldScene` is ready.
- Later autosaves update Slot 1 only after completed map transitions and applied
  battle results. Do not autosave movement, every pickup, or every dialogue line.
- System returns to Title on Back.
- Phaser is not mounted behind the title screen.

## Field HUD

Match the source top-left hero plate:

- hero face medallion,
- level badge,
- HP current/max + bar,
- XP progress + bar.

Reuse existing HUD HP/XP/level state. Render the active/main quest through the
source gold-spined banner and render wallet/transient feedback with Heroic plates.

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
- Skill -> minimal real Skill surface below.
- Rest -> existing field heal/charge action; no campsite/time system.
- Save -> three-slot Save screen.
- System -> System screen.

Shop remains a contextual NPC interaction rather than a ninth command.

## Bag / Gear

Preserve existing inventory and equipment rules.

Source categories:

- Potions -> consumables.
- Gear -> equipment inventory + equipped slots.
- Key -> key items.
- Loot -> non-usable material/drop items when present; otherwise source-style empty
  state. Do not invent crafting behavior.

Requirements:

- exactly 24 visible desktop slots,
- stable empty slots,
- cream-gold selected tile,
- quantity and semantic tint treatment,
- item detail panel,
- five paper-doll slots: Head, Weapon, Body, Hands, Accessory,
- equip/unequip through existing bridge/core rules.

No drag/drop requirement. Keyboard/gamepad selection + confirm is enough.

## Shop

Preserve existing stock, buy/sell, wallet, and inventory validation.

Match the source:

- merchant bust/identity,
- Buy/Sell tabs,
- image-first stock/inventory grid,
- selected item detail,
- price + owned quantity,
- wallet before/after,
- unaffordable state,
- equipment stat delta before purchase.

Stat deltas must use the same effective-stat/equipment logic as actual equip; no
second stat formula in Svelte.

## Quest Journal

Preserve existing quest definitions/state/acceptance.

Match the source layout:

- quest list with progress rings,
- main/side/offer differentiation,
- selected title/metadata,
- objective chain,
- rewards,
- giver/location,
- local map context when existing area-map data supports it.

Do not invent pathfinding or fake route lines to fill the map preview.

## Dialogue

Refactor `DialoguePanel.svelte` to match:

- large speaker bust,
- gold nameplate,
- bottom text plate,
- right-side gilded choice list,
- cream-gold selected choice,
- source advance/progress treatment.

Extend render state with portrait/bust identity keyed by NPC/speaker presentation
metadata. Story prose remains Rust-owned.

Add persisted Text Speed behavior:

- Slow
- Normal
- Instant

Confirm while text is revealing completes the current line; confirm after complete
advances/selects. Choice input must never select a still-hidden choice.

## Battle

### Preserve the current battle engine

Current `BattleScene` movement, auto-attack, enemy movement/attacks, invulnerability,
boss phase, drops, and outcomes remain authoritative. The mockup's TURN ribbon is a
presentation of readiness/cadence, not a new simulation queue.

### HUD telemetry

Extend active `HudBattleState` with render-ready data:

- hero HP/max HP,
- enemy unit ID/name/HP/max HP/defeated,
- current target ID,
- bounded readiness/ribbon entries from actual cooldowns,
- bounded recent combat feed,
- heal availability,
- usable battle-item count,
- flee channel/cooldown progress,
- optional secondary enemy gauge.

The optional secondary gauge is the small seam required by the story bible's
witness-boss **testimony gauge**. Normal enemies omit it; this ticket does not build
the full testimony/persuasion boss system.

### Targeting

Add one simple explicit target:

- nearest living enemy by default,
- left/right target cycling,
- auto-attack prefers selected target when in reach,
- if it dies, select nearest remaining enemy.

No tactical cursor/free target mode.

### Combat feed

Publish recent meaningful events only:

- hero damage,
- enemy damage,
- healing/item recovery,
- enemy defeat.

Do not persist the feed.

### Interventions

The source shows exactly:

- **Heal** — reuse existing heal/charge behavior in battle.
- **Item** — compact Heroic battle-consumable picker using existing inventory consume.
- **Flee** — new deterministic channel action.

Extend battle outcome with `fled`. A fled result applies hero HP, consumed inventory,
and return position, then returns directly to `WorldScene` with no Victory/Defeat
summary.

Flee rules:

- fixed short channel shown by source countdown/progress,
- taking damage cancels the active channel,
- success returns to encounter `returnPosition`,
- no XP/coins/drops/quest defeat progress,
- encounter is not marked cleared and remains in the world.

No random flee percentage.

## Victory

Replace the current summary modal with the source Victory window. Reuse current
summary data for XP, coins, drops, defeated count, level-up, quest progress and
rewards. One gilded Continue action uses the existing BattleScene -> WorldScene
handoff. No separate reward-claim state.

## Save

The source requires:

- Slot 1 — Autosave.
- Slot 2 — Manual.
- Slot 3 — Manual/empty.

Replace the anonymous single-save key with one slot envelope, not three independent
persistence systems:

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

The envelope is storage metadata; keep `SaveState` focused on canonical game state.
No migration from `gliese.save.v9` is required.

Behavior:

- Slot 1 only receives autosaves.
- Slots 2/3 are manual targets.
- overwriting a populated manual slot uses one in-screen confirmation state.
- Continue chooses newest `savedAt` across valid slots.
- invalid slot data disables that slot without crashing Title.

Save cards show chapter/location/playtime/timestamp plus level/coins/HP derived from
the record's `SaveState`.

Capture a small 16:9 JPEG/WebP data URL from the Phaser canvas. Do not persist a
full-resolution screenshot. Thumbnail failure must not block saving; use a stable
fallback image.

## System / Preferences

Extend the existing preference storage with:

```ts
type TextSpeed = 'slow' | 'normal' | 'instant';
type HudDensity = 'quiet' | 'full';
type MotionPreference = 'on' | 'reduced';
type PromptMode = 'auto' | 'pad' | 'keys';
```

Language continues to support `en`, `ja`, and `zh-Hant` even though the mockup only
demonstrates English/Japanese buttons.

The source Display & Text reference contains:

- Language
- Text speed
- HUD density
- Motion
- Prompts

Source-selected reference values are English / Normal / **Quiet** / On / Auto.

- Quiet must reproduce the supplied Field HUD exactly.
- Full may add secondary runtime/status detail without altering the source-backed
  Quiet geometry.
- Reduced disables decorative continuous motion and reduces entrance motion.
- OS `prefers-reduced-motion` is a safety floor even when saved Motion = On.

The System rail visibly includes Display, Audio, Input:

- Display is the supplied screen.
- Input is functional as navigation/focus to the prompt/input control rather than an
  invented second settings design.
- Audio remains visible but disabled/unavailable because neither the source nor the
  game defines audio controls yet.

## Prompt / Gamepad Input

A/B/X/LB/RB-style glyphs must not be decorative-only.

Support one standard gamepad:

- D-pad/left stick menu navigation,
- confirm/cancel and rail switching,
- exploration movement,
- advertised field interaction/menu actions.

Prompt mode:

- Auto -> most recently used keyboard/pad modality,
- Pad -> generic pad glyphs,
- Keys -> keyboard glyphs.

No remapping, multi-controller assignment, rumble, or Xbox/PlayStation-specific
layouts. Existing keyboard behavior remains unchanged.

## Skill

The Field source includes a Skill command but no dedicated Skill reference screen.
The user requested implied missing mechanisms to be included, so the button must be
real without expanding into a skill-tree project.

Add a tiny `SkillDefinition` registry with localized ID/name/description,
unlock level, icon, and tint. Known skills are derived from player level; no skill
points and no learned-skill persistence. The screen is read-only and shows known
plus next level-gated entries. Active combat skill use is out of scope.

Because there is no supplied Skill canvas, it follows Heroic frame/selection grammar
but is not judged against source pixel geometry.

## Area Map

Keep existing pause/fog/marker/navigation behavior. Only replace chrome/focus styling
with Heroic grammar. The mockup has no dedicated Map canvas, so Map receives a
regression screenshot, not a source-pixel-parity claim.

## Art

Required production art from the mockup:

1. Title key art.
2. Dialogue busts for Liam, Mira, Guild Master Arlen, Quartermaster Vale, Blacksmith
   Oren — neutral, pleased, and concerned variants as specified.
3. Face portraits for medallions.
4. Liam paper-doll silhouette.
5. Eight menu icons.
6. Combat icons.
7. Slime Scout + Ruins Warden enemy plate art.
8. Battle backdrop compatible with source composition.
9. Runtime save-thumbnail treatment.
10. Victory flourish.

Store new art under `public/game/assets/heroic-ui/`; add metadata to the existing
asset layer only where Phaser must preload it. Do not regenerate world/background
art solely for this UI change.

## Localization

All visible strings stay in the current i18n system. Update `en`, `ja`, and
`zh-Hant` together for title actions, field commands, Bag categories, battle labels,
Save text, preferences, Skill text, and accessibility/unavailable labels.

## Accessibility / Focus

- Escape/B closes according to overlay ownership.
- opening screens moves focus inside; closing restores invoking control.
- visual selection and `:focus-visible` agree.
- image tiles expose names.
- segmented settings use actual controls.
- disabled Audio explains why it is unavailable.
- reduced motion is honored.
- no focus trap strands the user behind Phaser.

## Error Handling

Keep failures local:

- missing portrait -> deterministic silhouette,
- missing thumbnail -> fallback image; save still succeeds,
- invalid slot -> unavailable card,
- no slots -> Continue disabled,
- no battle consumable -> Item disabled,
- Flee disabled while battle is resolving/summary,
- no secondary boss gauge -> omit it,
- unsupported gamepad -> Auto falls back to keyboard.

No global error framework.

## Full Visual Parity Gate

### Source-backed pixel states

At **1440x900**, capture deterministic Playwright screenshots for all ten supplied
surfaces:

- Title — Continue selected with valid metadata.
- Field HUD — source-selected Quiet density, command grid open.
- Bag — Potions selected item; also validate Gear paper-doll state.
- Shop — Buy equipment selected with stat delta.
- Quest Journal — active quest selected.
- Dialogue — bust + multiple choices, first selected.
- Battle — two enemies, one targeted, populated ribbon/feed, Heal selected, Flee
  cooling/channeling.
- Victory — XP/coins/drop/foes + quest update.
- Save — autosave/manual/empty.
- System — English/Normal/Quiet/On/Auto active states.

Area Map and Skill get deterministic regression screenshots but are not called
source-pixel-parity screens because no dedicated reference canvas exists.

Acceptance:

- no intentional geometry/color/gradient/radius/spacing differences,
- no mockup `image-slot` placeholders,
- no old glass-panel styling on redesigned surfaces,
- source-locale wrapping matches at 1440x900,
- only tiny antialias/subpixel screenshot tolerance is allowed,
- any intentional source deviation is documented in the PR and approved before merge.

### Functional gate

The same PR must verify:

- Continue/New Run/System title flow,
- all eight field commands,
- use/equip/unequip,
- Shop buy/sell/unaffordable,
- quest selection/acceptance,
- dialogue reveal/advance/choice,
- battle target cycle/Heal/Item/Flee,
- Victory Continue,
- manual overwrite + newest-slot Continue,
- persisted preferences,
- keyboard + generic gamepad field/menu use.

## Testing

### Pure TypeScript

Add focused tests for:

- save-slot latest/read/write,
- flee state/result semantics,
- target selection/cycling,
- turn-ribbon derivation,
- bounded combat feed,
- preference normalization,
- prompt modality,
- level-gated skills.

### Svelte/browser

Cover screen state, keyboard focus/restore, segmented settings, text reveal,
24-slot Bag, Gear deep-link, Shop delta/affordability, battle intervention states,
and disabled Continue with empty saves.

### Phaser scenes

Cover active battle telemetry, selected target preference, battle Heal/Item, flee
cancel/success, and the save-thumbnail capture seam if Phaser owns capture.

### E2E

Boot now starts at Title. Cover one real New Run/Continue path into the field and
use deterministic fixture/save seeding for screenshot states rather than brittle
long movement scripts.

## Expected Files

Likely ownership:

- `src/lib/game/GameShell.svelte`
- `src/lib/game/DialoguePanel.svelte`
- `src/lib/game/ui/*`
- `src/lib/game/ui-bridge/{events,store}.ts`
- `src/lib/game/phaser/scenes/{WorldScene,BattleScene}.ts`
- `src/lib/game/core/battle.ts`
- small pure helpers for slots/flee/targeting/input/skills only where useful,
- `src/lib/game/save/storage.ts` + slot helper,
- existing preference/i18n modules,
- `src/lib/game/content/assets.ts` and small presentation metadata,
- `public/game/assets/heroic-ui/`,
- existing unit/component/scene/E2E tests + Playwright snapshots.

Do not introduce a second store architecture or state-management library.

## Delivery

One PR only. Internal implementation checkpoints may be:

1. Heroic foundation + Title.
2. Field + Bag/Shop/Quest/Map/Skill/System.
3. Dialogue portraits + text reveal.
4. Battle telemetry/interventions + Victory.
5. Three-slot saves.
6. Art integration + pixel parity.
7. Full regression/E2E verification.

The PR is not complete until all ten source-backed surfaces pass the visual gate and
all visible actions pass the functional gate.
