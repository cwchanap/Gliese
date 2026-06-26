# Village Hedge Look + Smaller Houses — Design Spec

**Date:** 2026-06-25
**Branch:** `feat/entry-map-enrichment`
**Predecessor:** `2026-06-22-village-maze-redesign-design.md` (maze layout), `2026-06-24-village-dressing-assets.md` plan (dressing + plaza tile)

## Problem

Two issues with the entry village (Sundrop Village) surfaced after the dressing-asset work:

1. **"Single tree everywhere."** The maze walls render as one repeated forest sprite. Root cause: every `town-hedge` blocker hardcodes the forest dressing `treeCluster` frame (`WorldScene.ts:1838-1840`), and the village maze contains ~60 `town-hedge` walls (perimeter, ring-road pockets, junction noses, inner ring, exit corridor). The new village dressing (market stalls, lanterns, fountain, etc.) **is** wired up and rendering, but ~60 identical tree sprites visually bury it. The village reads as a forest, not a settlement.

2. **Too crowded.** Eight large building footprints packed into the ~1200×1000 village cluster leave narrow streets and a cramped feel. The player asked to "make the house a bit smaller."

## Scope

- **Hedge look (village-only):** introduce a `garden-hedge` blocker kind backed by a new hedge sprite, and switch the village's internal maze walls to it. Other regions' `town-hedge` blockers are untouched.
- **Smaller houses:** scale 8 village building landmarks down to ~80%, keeping centers fixed, with door transitions re-aligned to the new south edges.

**Out of scope:**
- Other regions' `town-hedge` rendering (silverpine, crossroads, coast, mistfen, wildwood stay `treeCluster`).
- The 4 meadow boundary blockers (world edge) — remain `town-hedge` so the map edge reads as forest.
- Repositioning maze walls or changing lane topology (the validated maze/corridor reachability is preserved as-is).
- New dressing frames or changes to `village-dressing.png`.
- Interior maps.

---

## 1. Hedge Look

### New blocker kind

Add `garden-hedge` to the `MapBlocker` discriminated union in `src/lib/game/content/maps/types.ts`. It inherits `town-hedge`'s collision semantics (a solid impassable rect) — `kind` only drives rendering, and blockers are solid by default.

### New asset

A dedicated single-frame sprite, kept separate from `village-dressing.png` so the just-validated 12-frame sheet is not perturbed:

- **File:** `public/game/assets/village-hedge.png`
- **Frame:** `hedgeSegment` (one frame)
- **Art:** painted digital 2D, clipped boxwood hedge, warm-green foliage with soft top-left light, matching the crossroads/shrine/village dressing style (NOT pixel art). Transparent background; `#00ff00` chroma key during generation.
- **Native size:** ~64×64 (roughly square) so it scales cleanly to wall heights.
- **Registration:** a new `villageHedgeAsset` (`SpriteSheetAsset`, 1 frame) in `content/assets.ts`, `load.image` in `BootScene`, `registerAssetFrames` in `WorldScene`.

### Rendering

`WorldScene.renderBlockers` gains:

```ts
case 'garden-hedge':
    this.renderBlockerSegments(blocker, villageHedgeAsset.key, 'hedgeSegment');
    break;
```

This reuses the existing segment-repeat path (`renderBlockerSegments`, 48px segment length) — identical to how `town-hedge` renders `treeCluster` today, just with a hedge frame. No new tiling/seamless logic.

### village.ts kind switch

In `src/lib/game/content/maps/regions/village.ts`, change `kind: 'town-hedge'` → `kind: 'garden-hedge'` for **only the village-internal walls**: the perimeter, ring-road pocket walls, junction noses, inner-ring boundary walls, and exit-corridor walls (lines ~511–676). The 4 meadow boundary blockers (lines ~472–509) and the ocean blocker **stay** `town-hedge`/`ocean`.

### Verification

- `blocker.kind satisfies never` exhaustiveness check in `renderBlockers` forces the new case to be handled.
- Search for any other `blocker.kind` switch (collision/area logic) and confirm `garden-hedge` is covered or defaults safely.
- Existing maze connectivity / critical-route tests remain green — wall positions and solidity are unchanged; only the rendered texture differs.

---

## 2. Smaller Houses

### Approach

Scale 8 building landmarks to **80%** of current `width`/`height`, keeping each landmark's `(x, y)` center fixed. Building sprites are sized from `landmark.width/height` (`WorldScene.ts:1766-1767`), and collision bounds derive from the same rect (`getLandmarkCollisionBounds`, `WorldScene.ts:2265-2278`), so a smaller rect shrinks both the sprite and the collision footprint consistently.

**Left unchanged:** `sundrop-well` (141×160 — already small, not a house).

### Door re-alignment

`findLandmarkDoorway` (`WorldScene.ts:2324+`) carves a doorway gap only where a transition falls **inside** the landmark bounds. Shrinking a building moves its south edge up; the current door transitions sit near the old south edge and would float below the new footprint. Each affected `meadow-to-*` transition's `y` is moved to the new south edge (`center.y + 0.4 × height`) so the doorway still carves and the entrance reads correctly.

### Reference sizes (80%)

| Landmark | Center | Current w×h | Target w×h | New south edge (door y) |
|---|---|---|---|---|
| hero-house-exterior | (700, 5450) | 294×307 | 235×246 | ~5573 |
| guild-hall-exterior | (1400, 4900) | 384×346 | 307×277 | ~5038 |
| item-shop-exterior | (600, 4800) | 307×294 | 246×235 | ~4918 |
| villager-house-1-exterior | (900, 4750) | 282×256 | 226×205 | ~4852 |
| villager-house-2-exterior | (1200, 4700) | 422×326 | 338×261 | ~4830 |
| villager-house-3-exterior | (1450, 5400) | 230×416 | 184×333 | ~5566 |
| blacksmith | (500, 5200) | 294×282 | 235×226 | ~5290 |
| shrine-of-aurora | (1000, 5400) | 307×416 | 246×333 | ~5566 |

(Exact pixel values are finalized in the implementation plan; the 80% ratio is the design target and is tunable during review.)

### Connectivity impact

Smaller collision footprints can only **widen** passable gaps, never close them. The maze connectivity flood-fill and spawn→crossroads critical-route tests therefore stay green. Minor shortcuts may open (designed routing loosens slightly) — acceptable for a village square.

---

## Files Touched

- `src/lib/game/content/maps/types.ts` — add `garden-hedge` to `MapBlocker` union.
- `src/lib/game/content/assets.ts` — add `villageHedgeAsset`.
- `src/lib/game/content/maps/regions/village.ts` — switch ~60 internal walls to `garden-hedge`; shrink 8 landmarks; re-align 7 door transitions.
- `src/lib/game/phaser/scenes/BootScene.ts` — `load.image(villageHedgeAsset…)`.
- `src/lib/game/phaser/scenes/WorldScene.ts` — `registerAssetFrames(villageHedgeAsset)`; `case 'garden-hedge'` in `renderBlockers`.
- `public/game/assets/village-hedge.png` — new hedge sprite (generated, Sonnet-4.6 QA'd).
- Tests: `assets.test.ts`, `maps.test.ts` (new kind + sizes), `phaser/scenes/scenes.test.ts` (transition positions + building displaySizes).

## Test Plan

- New unit: `garden-hedge` kind recognized; village internal walls are `garden-hedge`, meadow boundaries remain `town-hedge`; 8 landmarks at 80%; door transitions at new south edges.
- Scene: hedge frame rendered for a `garden-hedge` blocker; building `add.image` displaySizes updated; transition positions updated.
- Regression: full maze connectivity + critical-route suite green; `svelte-check` 0 errors; lint clean; build succeeds.
- Visual QA: Sonnet 4.6 inspects the generated hedge sprite (style match, no green matte, clean edges).

---

## Realization Notes (post-implementation)

Decisions made during implementation that refine the design above, recorded for auditability:

- **Hedge cell 256×256, not 64×64.** Section 1 specified a ~64×64 native frame. Realized at **256×256** instead: AI image-gen cannot produce a clean 64² raster, 256² matches the project's other painted dressing cells, and `renderBlockerSegments` sizes the output via `setDisplaySize` (segment length × blocker height), so the source-frame native size never affects the rendered hedge. No visible difference; only the asset metadata changed.
- **Sprite generated via `codex exec`, QA deferred.** The `agy` CLI was non-functional in the build environment (silent even for text replies — TTY/auth), so generation used `codex exec` (gpt-image, 1254² → chroma-stripped → resized to 256²). Controller vision-QA was not possible (model has no image input), so aesthetic acceptance is deferred to the human gate.
- **Lane-width cap raised 256→288px.** Section 2's connectivity note ("smaller buildings can only widen passable gaps") missed that lane width has an **upper** cap. The maze was designed right at the 256px cap, so any shrink widens adjacent lanes. At 80%, ~4 lane samples land on inter-building gap crossings (SE-detour mouth, shrine↔vh3, item-shop↔blacksmith) where perpendicular lane-width is undefined post-shrink — these 4 are excluded via a documented `laneWidthGapCrossings` filter in `soft-maze.test.ts`. The cap itself was raised `maxHalfWidth` 128→144 to cover the few near-cap lanes widened by the shrink (worst non-gap sample = 176px). This was an explicit, user-approved design decision (less-crowded village ⟹ wider lanes).
- **vh3 return-arrival moved.** The plan said "Leave arrival unchanged," but vh3's interior→meadow return arrival (y=5560) falls **inside** the 80%-shrunk vh3 footprint (new south edge 5566.5), which would spawn the player inside collision. Moved to y=5700 (~134px south of the door), consistent with the other village exits. Documented inline at `src/lib/game/content/maps.ts`.
