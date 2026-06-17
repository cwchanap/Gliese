# Entry Map Enrichment — Design

> **Status:** Approved design, ready for implementation planning.
> **Supersedes for execution:** `docs/entry-map-exploration-enrichment-plan-reviewed.md` (kept as background; this doc is the tightened, scoped version we build from).

## Purpose

Turn `meadow-entry` from a visually dressed six-region overworld into a *motivated*
exploration space: every 10–20 seconds of normal movement the player should hit a
curiosity hook, a route choice, a payoff, a danger cue, a lore hint, a strong reveal,
or a navigation cue. This design adds a new examinable `MapDiscovery` primitive,
authors content across all regions, and locks in deterministic data-level tests that
prevent future sparse maps.

## Current state (verified against code)

The first enrichment pass already shipped:

- `meadow-entry.ts` composes seven fragments — `village`, `wildwood`, `mistfen`,
  `silverpine`, `coast`, `crossroads`, `paths` — through `mergeRegions`, which has a
  fail-fast duplicate-id guard, then `addEnglishMapText` bakes English
  landmark/NPC labels.
- Primitives exist in `maps/types.ts` and `regions/types.ts`: `groundPatches`,
  `landmarks`, `mapDecor` (a discriminated union keyed by sheet `textureKey`),
  `ambientNpcs`, `npcs`, `pickups`, `encounters`, `combatBounds`,
  `blockers` (`city-wall | town-hedge | ruin-wall | future-gate | ocean`), `fences`.
- The map is decently *dressed* but exploration-thin. Each non-village region follows
  one template — `1 anchor + 1 straight path + 1 pickup + 1 future-gate` — with little
  real branching. **Crossroads, the hub, has no payoff pickup at all.** `paths.ts` is
  pure connector ground, i.e. the "empty connector walk" encoded literally.

Integration points confirmed for the new work:

- **Save:** `SaveState.version` is currently `6`; `SAVE_STORAGE_KEY = 'gliese.save.v6'`
  with `'gliese.save.v5'` as the legacy fallback. A v5→v6 migration already exists and
  `loadStoredSaveResult` reads both keys. `isSaveState` gates on `version !== 6` and a
  code comment requires version / `SAVE_STORAGE_KEY` / `isSaveState` to move in lockstep.
- **Dialogue:** `HudDialogueState.mode` already includes `'system'`; existing
  `dialogue-advance` / `dialogue-close` commands drive it. **No new `HudCommand` needed.**
- **Area map:** `HudAreaMapMarkerKind = 'building' | 'exit' | 'quest'`; markers are
  filtered through `isWorldPositionRevealed`. We add a `'discovery'` kind.
- **i18n:** locales are `en` / `ja` / `zh-Hant`; UI/content strings live under
  `i18n/messages/` and are covered by message-key parity tests.

## Locked decisions (from brainstorm)

1. **Scope ceiling:** full scope — content pass + data-level tests + the `MapDiscovery`
   primitive + area-map markers for major discoveries.
2. **Discovery state:** *hybrid*. Discovery text is **repeatable** (re-readable, never
   consumed). A persisted `seenDiscoveries` set exists **only** to light area-map markers
   across reloads.
3. **Design metadata:** **no** `meta` field on `RegionFragment`. A test-side authoring
   manifest (non-shipped) keyed by region id references entity IDs; tests assert those IDs
   resolve to real entities.
4. **Route-interest test:** **lenient** — assert "no route segment runs empty" with a
   generous interest radius, rather than "every fixed-interval sample has interest."
5. **Sequencing:** tests define the exploration bar *first* (red), then content is authored
   to satisfy them — to avoid confirmation-biased tests.

## Non-goals

- No new dungeons, interiors, chapters, enemies, or major systems.
- No removal of village / guild / shop / ruins / main-quest progression.
- No new generated art — content uses existing sheets.
- No scattering of random props to fill space; stop conditions (below) bound density.
- No timed-playtest artifact authored by the agent (that is a human checkpoint).

## Design

### A. `MapDiscovery` primitive

Add to `src/lib/game/content/maps/types.ts`:

```ts
export type MapDiscoveryKind = 'sign' | 'lore' | 'vista' | 'secret' | 'warning' | 'foreshadow';

export interface MapDiscovery {
  id: string;
  x: number;
  y: number;
  radius?: number;          // interact proximity; default a shared constant
  labelKey: MessageKey;
  descriptionKey: MessageKey;
  kind: MapDiscoveryKind;
  revealMarker?: boolean;   // true → eligible to become an area-map pin once seen
}
```

- `WorldMapDefinition` gains `discoveries?: MapDiscovery[]`; `RegionFragment` gains
  `discoveries?: MapDiscovery[]` so regions author their own, merged by `mergeRegions`
  (extend the merged-key list + `assertUniqueIds`).
- **Interaction:** `WorldScene` detects the nearest discovery within `radius` on the
  interact key and emits a `system`-mode dialogue using the existing dialogue path
  (`labelKey` → speaker/title, `descriptionKey` → line). Reading does **not** consume.
  On first read of a given id, `WorldScene` adds the id to `seenDiscoveries` and persists
  through the existing save path.
- **Text:** `labelKey` / `descriptionKey` resolve through the i18n `translate`/`content`
  helpers at display time (consistent with how markers resolve `labelKey`). No English
  baking in `addEnglishMapText` is required.
- **Curated set (~6–7), each tied to a dead-end / gate / hub:**
  crossroads waystone (navigation), castle gate (warning), ferry shrine (lore),
  coast jetty (sea-route foreshadow), witchwood gate (poison warning),
  silverpine amulet rack (pact foreshadow), wildwood cave (danger).

### B. Save schema change (v6 → v7)

- `SaveState` gains `seenDiscoveries: string[]`.
- Bump `version` `6 → 7`, `SAVE_STORAGE_KEY` `gliese.save.v6 → gliese.save.v7`, set
  `PREVIOUS_SAVE_STORAGE_KEY = 'gliese.save.v6'`.
- `createNewSaveState` initializes `seenDiscoveries: []`.
- Extend the migration chain so a v6 payload migrates to v7 by defaulting
  `seenDiscoveries: []` (v5 still chains through to v7).
- Extend `isSaveState`: gate `version !== 7` and validate
  `Array.isArray(seenDiscoveries) && every string`.
- Tests: round-trip serialize/parse, v6→v7 migration default, rejection of bad shapes.

### C. Area-map discovery markers

- Add `'discovery'` to `HudAreaMapMarkerKind`.
- `buildAreaMapState` takes the `seenDiscoveries` set; a `buildDiscoveryMarkers` includes
  a discovery only when `revealMarker === true` **and** its id is in `seenDiscoveries`.
  The existing `isWorldPositionRevealed` filter still applies.
- Quest markers stay visually dominant; minor secrets stay unmarked.
- Tests: a `revealMarker` discovery appears only after it is seen; non-`revealMarker`
  discoveries never appear.

### D. Content pass (per region)

Each major region must end with: an **anchor**, **approach** clues, at least one optional
**choice**/nook, a **payoff** for every intentional dead end, and an **exit hook**. Use
existing primitives plus discoveries. Specifics:

- **Village → Crossroads:** add a waymarker + a short off-path nook with a payoff +
  travel-implying decor/ambient between the two, keeping the direct path clear.
- **Crossroads (hub):** place the waystone clearly at the decision point, add a behind-stall
  nook **with a payoff** (fixes the missing-hub-payoff gap), strengthen the Castle Gate
  approach (banner → warning line → sealed gate) with the castle-gate discovery.
- **Coast:** make ferry shrine / tidepool side-reward / jetty three distinct nodes; the
  pickup rewards the side area; the jetty is a scenic dead end with the sea-route discovery.
- **Mistfen:** curved approach to Witchwood Gate via reeds/dead-trees/blooms as
  breadcrumbs, one optional side pocket with a payoff, poison-warning discovery at the gate.
- **Silverpine:** lantern cadence as an ascent, a side grove/offering nook holding the
  pickup, pilgrim facing the shrine, amulet-rack foreshadow discovery.
- **Wildwood:** a safe staging point before combat, one brush-hidden side reward, escalating
  density near the cave with a danger discovery; preserve slime encounter IDs, combat bounds,
  and the quest-gated ruins transition.

**Stop conditions (do not over-fill):** stop when every region has anchor / approach /
choice / payoff / exit hook, every intentional dead end has a payoff, route-interest and
dead-end tests pass, and the critical path stays readable. Density is a means, not a goal.

### E. Authoring manifest + test architecture

A non-shipped manifest (test fixture or `*.ts` imported only by tests) declares, per major
region: `anchorIds`, `approachClueIds`, `optionalBranchIds`, `payoffIds`, `exitHookIds`
(+ optional `emotion` / `density` for documentation). `paths` is exempt / lighter.

Tests in `maps.test.ts` (or a focused sibling):

1. **Manifest completeness** — every major region declares ≥1 anchor, payoff, approach clue,
   and exit hook; every declared id resolves to a real entity (landmark / pickup / decor /
   npc / encounter / blocker / discovery).
2. **Dead-end payoff** — authored dead-end endpoints (coast jetty, witchwood gate, silver
   shrine gate, castle gate) each have ≥1 nearby payoff; future-gate dead ends additionally
   require a nearby story-facing element (discovery/landmark), not just a blocker.
3. **Route-interest (lenient)** — authored route polylines; assert no segment runs empty
   within a generous radius. Failure names the route and the approximate empty point.
4. **Critical-route collision sanity** — sample critical polylines (~32–64px) and assert no
   sample sits inside a blocker; optionally check decor/fence/landmark collision boxes with a
   conservative radius. Limited to critical routes, not every shortcut.
5. **Discovery validity** — discovery frames/coords in bounds, valid `kind`, and
   `labelKey`/`descriptionKey` parity across `en`/`ja`/`zh-Hant`.

Tests are written to fail meaningfully if a payoff is removed.

## Sequencing

1. **Audit (light doc)** — `docs/superpowers/reports/2026-06-17-entry-map-exploration-audit.md`,
   route-by-route, naming the weakest segments. Drives the edits; no code change.
2. **Type + save scaffolding (no behavior)** — `MapDiscovery` type,
   `WorldMapDefinition.discoveries`, `RegionFragment.discoveries` + merge wiring,
   `SaveState.seenDiscoveries` + v7 bump/migration/`isSaveState`, authoring-manifest type.
3. **Write the test suite (red)** — manifest completeness, dead-end payoff, route-interest,
   collision sanity, discovery validity. They go red where the map is empty today
   (e.g. Crossroads has no payoff).
4. **Author content (green)** — per-region edits + the curated discoveries, until tests pass
   and stop conditions hold.
5. **Wire engine** — `WorldScene` discovery detection + `system` dialogue + `seenDiscoveries`
   persistence.
6. **Area-map markers** — `'discovery'` kind gated on `seen ∧ revealMarker`; HUD tests.
7. **i18n parity** — add all discovery label/description keys to `en`/`ja`/`zh-Hant`.
8. **Validation + human checkpoint** — `bun run test:unit -- --run`, `bun run check`,
   `bun run lint`, `bun run test:e2e`; then a human walks the five routes and the three worst
   findings are patched.

## Risks

- **Save migration regressions.** Mitigation: keep `seenDiscoveries` purely additive, default
  `[]`, and cover v6→v7 + fresh-boot + invalid-shape in tests.
- **Route-interest brittleness.** Mitigation: lenient "no empty segment" assertion + generous
  radius + authored polylines, not straight lines.
- **Decor collision creep on critical routes.** Mitigation: the collision-sanity test on
  critical polylines.
- **i18n drift.** Mitigation: discovery keys ride the existing parity test.
- **Over-filling.** Mitigation: explicit stop conditions and the manifest as a structural
  budget, not a maximum.

## Acceptance

- Every major region has anchor / approach / choice / payoff / exit hook; Crossroads has a
  payoff. Every intentional dead end has a payoff; every future gate has foreshadowing beyond
  the collision rectangle.
- New tests fail meaningfully if a payoff is removed; all suites green.
- Fresh-save boot works; existing ruins/main-quest progression intact; v6 saves load as v7.
- Discoveries are readable, repeatable, don't interfere with NPC/shop/battle/transition flows,
  and the map is fully playable if discovery markers are ignored.

## Changes from the reviewed plan

- **Task 8 `RegionDesignMeta` on fragments** → replaced by a non-shipped authoring manifest.
- **Task 14 timed playtest report** → a human checkpoint with a route list, not an agent doc.
- **Task 16 final review doc** → folded into the PR description.
- **Task 1 audit** → kept but lightweight; its only job is to drive edits.
- **Save version** → corrected to **v6 → v7** (the plan assumed v5).
- **Sequencing** → tests authored before content, not after.
- **Route-interest test** → lenient, not the strict fixed-interval form.
