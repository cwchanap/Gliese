# HPA-406 Meadow Entry Outdoor Runtime Integration Design

**Status:** Revised after review; ownership contract sealed before implementation  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-06

## 1. Purpose

Integrate the approved HPA-496 Meadow Entry base/foreground exports into the existing HPA-398 regional-background runtime and finish outdoor acceptance without redesigning the map, regenerating art, or creating another authoring/package framework.

The player-facing result is the complete opening outdoor map rendered with the approved coherent artwork across Sundrop Village, Crossroads, every connector, Tidewatch Coast, Mistfen, Silverpine, Wildwood, and the reviewed east forest boundary while current gameplay behavior remains authoritative.

HPA-406 is **frozen integration**: geometry and art already exist, so the implementation is direct registration plus the smallest renderer/fallback changes required by the approved package.

## 2. Existing seam

The prerequisites already exist on `main`:

- HPA-398: `MapBackgroundImage`, base/foreground planes, successful-background tracking, blocker fallback ownership, diagnostics, and the proven Sundrop pair.
- HPA-399: frozen crop geometry, draw orders, `primaryRegionId`, bake dispositions, runtime fallback obligations, overlaps, and runtime coverage.
- HPA-496: 22 approved runtime exports with exact crop ID, filename, texture key, bounds, dimensions, bytes, hash, plane, and draw order.
- HPA-495: the lean `gliese-world-expansion` skill, which classifies this work as `frozen-integration`.

The runtime integration points are already centralized:

```text
src/lib/game/content/maps/types.ts
src/lib/game/content/maps/meadow-entry.ts
src/lib/game/content/assets.ts
src/lib/game/phaser/scenes/BootScene.ts
src/lib/game/phaser/scenes/WorldScene.ts
```

The missing runtime capabilities are deterministic overlapping background order, direct registration of approved exports, and fallback ownership for the blocker/decor/fence visuals that HPA-399 says are baked.

## 3. Frozen-integration rules

The implementation must:

- consume HPA-399/HPA-496 inputs without redesign;
- skip map-design and environment-art workflows;
- preserve collision, transitions, NPCs, encounters, rewards, discoveries, gates, minimap markers, and saves;
- keep backgrounds presentational;
- fix defects at the existing map/art/runtime owner instead of adding translation layers.

The implementation PR descriptions should record the player-facing outcome, frozen inputs consumed, ownership preserved, workflows intentionally skipped, and the controller walkthrough.

## 4. Non-goals

Do not add:

- Story Integration Catalog/fingerprint work;
- Area Expansion Packet/schema work;
- another art-package adapter;
- a generated runtime-package schema;
- foreground/base dependency graphs;
- streaming, residency managers, or load-strategy enums;
- another approval/fingerprint layer;
- new geometry, routes, encounters, rewards, NPCs, transitions, gates, or save behavior;
- art regeneration without a concrete source-art defect;
- screenshot/evidence matrices or a separate whole-map certification ticket.

## 5. Texture-safety preflight

Before changing runtime loading, run one standalone Chromium/WebGL probe that loads and retains all 22 approved HPA-496 textures together.

This is justified because the package includes large exports such as:

```text
wildwood-base.png                          2688 × 4928
outer-boundary-east-forest-lane-base.png   1440 × 4608
```

The probe must serve the exact approved artifact bytes, query `MAX_TEXTURE_SIZE`, decode/upload every PNG, retain successful textures until all attempts finish, and observe context loss/allocation failure.

Record only maximum texture size, failed texture if any, aggregate failure/context loss, approximate timing, and environment.

Decision:

- all 22 succeed → keep the current simple eager preload;
- one texture/dimension fails → repair/re-export at HPA-399/HPA-496 ownership;
- only aggregate residency fails → stop and create a measured load-management ticket.

The result applies only to the recorded Chromium/WebGL environment. It is a local stop/go gate against speculative loading architecture, **not** a claim that macOS or Windows Tauri WebViews have identical GPU limits or residency behavior. A later packaged-Tauri failure becomes the evidence for a separate load-management ticket.

A successful preflight is specifically evidence **not** to invent streaming.

## 6. Deletion-first cleanup

### 6.1 Remove frozen production validation from every PR

Delete the dedicated `Meadow Entry Art Package` CI job and the normal-PR `art:storage:meadow-entry` step. Keep the production commands available locally/manual for actual HPA-399/HPA-496 repair work.

Normal runtime CI should instead use a cheap focused test over the files under `public/game/assets/regions/meadow-entry/`: existence, dimensions, and approved SHA-256.

### 6.2 Delete the unused generic art-map adapter completely

After one final search confirms no active runtime/workflow consumer, delete:

```text
art-map-adapters/meadow-entry.v1.json
tools/art-map-package.ts
src/lib/game/content/backgrounds/art-map-package-adapter.test.ts
src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json
docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md
```

and remove the `art:map-package` script.

Also update the two live references that would otherwise become stale:

- remove `art-map-package-adapter.test.ts` from `MEADOW_ENTRY_TEST_FILES` in `tools/meadow-entry-art-test-files.ts`;
- remove the obsolete “Meadow Entry adapter” wording from `.agents/skills/gliese-world-expansion/references/authoring.md` while preserving its map-specific crop/provenance guidance.

Run `bun run art:validate:meadow-entry` once after the cleanup to prove the retained manual production validator still works. This one-time validation does not restore the command to normal every-PR CI.

Historical HPA-399/HPA-495/HPA-496 planning documents may still describe the old exploration; they do not make it a live consumer and should not trigger a wholesale documentation rewrite.

## 7. Minimal background ordering

Extend the existing descriptor directly:

```ts
export interface MapBackgroundImage extends MapRect {
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}
```

Phaser depth remains renderer-owned:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Rules:

- HPA-496 keeps its frozen `0..240` orders;
- existing HPA-398 Sundrop base/foreground use `1000` so they stay above HPA-496 village underlay/overlap art on their planes;
- order must be a non-negative integer at or below `1000`;
- `(plane, drawOrder)` pairs must be unique in the final map.

No new background type hierarchy or raw Phaser depth field is needed.

## 8. One direct runtime registry

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts
```

with one small runtime record type:

```ts
export type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
	cropId: string;
	path: string;
};
```

The registry stores only runtime facts: crop ID, stable background ID, texture key, public path, x/y/width/height, plane, and draw order. Export two projections from the same records:

```ts
export const meadowEntryRuntimeBackgroundImages = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ cropId: _cropId, path: _path, ...image }) => image
);

export const meadowEntryRuntimeBackgroundAssets = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ textureKey, path }) => ({ key: textureKey, path })
);
```

Do not duplicate hashes, provenance, overlap graphs, source catalogs, or approvals into browser runtime data.

A focused test may import HPA-399/HPA-496 authoring contracts and prove every active runtime record exactly matches the approved inventory. The runtime module itself must not import those heavy authoring modules.

### Preload contract

`BootScene` depends only on structural preload metadata:

```ts
type RegionalBackgroundPreloadAsset = {
	readonly key: string;
	readonly path: string;
};
```

Existing Sundrop entries may retain their Sundrop-only `approvedControlFingerprint` / `approvedPngSha256` metadata. HPA-496 entries remain `{ key, path }`. No implementation should manufacture HPA-398 approval metadata merely to homogenize the array.

## 9. Runtime asset copies

Copy approved PNG bytes unchanged from:

```text
artifacts/meadow-entry/hpa-399/exports/
```

to:

```text
public/game/assets/regions/meadow-entry/
```

Add only:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

No generator/synchronization framework is needed. A focused asset test verifies each active runtime file exists and matches approved dimensions and SHA-256.

## 10. Composition

Keep `mergeRegions(...)` and every gameplay `RegionFragment` unchanged.

Append active HPA-496 descriptors only at the final `meadow-entry.ts` composition point:

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];
```

`drawOrder` determines overlap depth; array ownership does not.

## 11. Shared visual fallback ownership

Generalize the proven HPA-398 blocker model rather than inventing separate decor/fence systems:

```ts
export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };

export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}
```

Use `MapVisualOwnership` on blockers, decor, and fence segments.

Do not leave a second independent implementation of the old blocker-only rule. Either remove `shouldRenderBlockerVisual` and update all callers/tests in the same change, or temporarily retain it only as a one-line delegate:

```ts
return shouldRenderOwnedVisual(blocker.visual, successfulBackgroundIds);
```

The end state has one semantic decision function.

This preserves existing Sundrop multi-owner behavior exactly: live fallback is suppressed only when every required baked owner rendered successfully.

`validateMapBackgroundOwnership(...)` should validate background references for blocker, decor, and fence visual contracts through one shared validation path.

## 12. Sealed Meadow Entry runtime ownership projection

This is the critical correctness gate for HPA-406.

HPA-399 already seals, for every source, the tuple:

```text
sourceKey = primaryRegionId | disposition | runtimeRequirement
```

through `MEADOW_ENTRY_REVIEWED_BAKE_OWNERSHIP_SHA256`. Its design explicitly requires HPA-406 to consume those fingerprinted dispositions rather than invent another ownership policy.

Therefore HPA-406 **must not** select owners by “highest drawOrder crop that happens to contain this geometry.” Crop overlap and PR activation must never change an existing source’s owner.

### 12.1 Stable primary-region → runtime-crop mapping

Define one small reviewed mapping used only to project HPA-399 authoring ownership into runtime crop IDs:

```ts
const RUNTIME_CROP_BY_PRIMARY_REGION = {
	'sundrop-village': 'sundrop-village-underlay',
	crossroads: 'crossroads',
	'tidewatch-coast': 'tidewatch-coast',
	mistfen: 'mistfen',
	silverpine: 'silverpine',
	wildwood: 'wildwood',
	'connector-village-crossroads': 'village-crossroads-connector',
	'connector-crossroads-coast': 'crossroads-coast-connector',
	'connector-crossroads-mistfen': 'crossroads-mistfen-connector',
	'connector-crossroads-silverpine': 'crossroads-silverpine-connector',
	'connector-crossroads-wildwood': 'crossroads-wildwood-connector',
	'outer-boundary': null
} as const;
```

`outer-boundary` is intentionally `null`: current outer-boundary sources are protected/live or fallback-tile rather than HPA-406-owned baked blocker/decor/fence visuals. If a future HPA-399 fallback obligation has `primaryRegionId: 'outer-boundary'`, validation must fail and the frozen contract must be amended explicitly instead of guessing a crop.

### 12.2 Full ownership table is fixed before PR 1 activation

Add one browser-safe full table:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts
```

Each row contains:

```ts
export interface MeadowEntryRuntimeVisualOwner {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerCropId: string;
	ownerBackgroundIds: readonly string[];
}
```

The table contains **all** HPA-406 fallback obligations for the final 22-texture package, excluding blockers already owned by the immutable HPA-398 Sundrop manifest.

Projection rules are deterministic:

1. start from `MEADOW_ENTRY_BAKE_OWNERSHIP`;
2. keep only `existing-blocker-fallback`, `extend-decor-fallback`, and `extend-fence-fallback`;
3. exclude existing HPA-398-owned blockers;
4. map `primaryRegionId` through `RUNTIME_CROP_BY_PRIMARY_REGION`;
5. `base-static` → `${cropTextureKey}-base-image`;
6. `base-and-foreground` → base + foreground IDs for the same mapped crop;
7. assert the mapped crop contains the source bounds expanded by HPA-399’s frozen margins;
8. assert an expected foreground export exists when required.

Step 7 is a **validation diagnostic**, not an alternate selector. If the mapped primary crop does not contain its source, stop and repair the HPA-399 owner/crop contract; do not switch to a different overlapping crop.

A focused test derives the complete expected table independently from the sealed HPA-399 data and deep-compares it to the committed browser-safe table. No second hash is necessary: the HPA-399 ownership seal plus exact projection equality already catches drift.

### 12.3 PR activation never rewrites ownership

PR 1 and PR 2 use the same full ownership table.

An ownership row becomes active only when its `ownerCropId` is active in `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`. If the crop is active, every `ownerBackgroundIds` target required by that row must exist; missing base/foreground is an error, not a reason to silently drop the row.

PR 1 therefore activates the Crossroads/connector subset of the already-fixed table. PR 2 appends nine textures and automatically activates more existing rows. **No row is reassigned and no owner changes between PRs.**

## 13. Renderer behavior

Base and foreground remain independent. Do **not** add `dependsOnBackgroundId`, `blocked-by-base`, or a two-phase dependency engine.

`WorldScene.renderRegionalBackgrounds(...)` continues attempting each descriptor independently, collecting successful IDs. A missing foreground does not invalidate a good base; a missing base does not block unrelated foreground attempts.

Minimal renderer changes:

1. call `getMapBackgroundDepth(background)` so draw order affects depth;
2. pass the final `successfulBackgroundIds` into decor and fence rendering, as blocker rendering already receives it;
3. use the single `shouldRenderOwnedVisual(...)` semantic for blockers, decor, and fences;
4. optionally extend the existing diagnostic with selected fallback decor/fence IDs for focused tests.

Collision creation remains unconditional.

## 14. Loading

Do not add a production load-plan abstraction.

After a passing preflight, extend `regionalBackgroundAssets` with the active direct runtime assets and keep current `BootScene` behavior:

- regional backgrounds enabled → preload registered regional backgrounds;
- disabled → queue none.

`BootScene` reads only `{ key, path }`; Sundrop-only approval fields are not part of the preload contract.

The opening outdoor world is one `meadow-entry` map, so streaming adds no demonstrated value here.

## 15. Delivery split

### PR 1 — Crossroads and connector proof

Activate 13 HPA-496 textures:

- Sundrop underlay base;
- Village↔Crossroads base/foreground;
- four Crossroads↔destination connector base/foreground pairs;
- Crossroads base/foreground.

PR 1 also owns:

- texture preflight;
- deletion cleanup, including `MEADOW_ENTRY_TEST_FILES` and live skill wording;
- draw order;
- the **complete sealed runtime ownership table** and active-row selector;
- direct registry and runtime copies;
- shared visual ownership/helper migration;
- renderer support;
- cheap runtime asset tests.

Ownership projection must be green before the 13 textures are accepted as a runtime slice.

### PR 2 — Remaining regions and final acceptance

Append the remaining 9 textures:

- Coast base/foreground;
- Mistfen base/foreground;
- Silverpine base/foreground;
- Wildwood base/foreground;
- east forest outer-boundary base.

PR 2 does not recalculate or rewrite ownership. It only activates additional rows from the PR-1 sealed table because their owner crops now exist.

PR 2 should be mostly data activation plus final acceptance. Requiring another framework is a signal to fix PR 1’s seam or route a concrete defect upstream.

## 16. Validation

Automated checks cover:

- active runtime descriptor path/dimensions/geometry/plane/order against HPA-399/HPA-496;
- runtime PNG existence, dimensions, and approved hash;
- deterministic draw depth;
- independent base/foreground behavior;
- one shared blocker/decor/fence visual-ownership decision;
- full runtime ownership table equals the deterministic projection of HPA-399 `primaryRegionId` + disposition + runtime obligation;
- every mapped owner crop geometrically contains its expanded source as an assertion, never a selector;
- PR 1/PR 2 activation cannot change an existing row’s owner;
- representative missing-base and missing-foreground fallback;
- unchanged HPA-398 multi-owner ownership;
- existing map, transition, encounter, reward/discovery, save, and scene invariants;
- retained manual `art:validate:meadow-entry` succeeds after adapter deletion.

Use focused existing commands plus new focused tests:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
bun run check
bun run lint
bun run build
bun run build:tauri
```

Do not restore the full HPA-496 production-art validator to normal every-PR CI.

## 17. Manual acceptance

Final HPA-406 acceptance is one continuous controller route:

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

Cross every connector mouth both ways, exercise one representative route/reward/encounter per destination, save/reload once, verify one missing-base and one missing-foreground fallback, run a normal packaged Tauri build, and record one approximate load plus steady-state frame-time observation.

Subjective visual review remains manual; no screenshot permutation matrix is required.

## 18. Failure ownership

| Defect | Owner |
| --- | --- |
| `primaryRegionId` / bake disposition / runtime obligation / crop fit | HPA-399 source/contract |
| PNG pixels/alpha/dimensions/export | HPA-496 art source |
| Runtime registration/preload/order/render/fallback | HPA-406 runtime |
| Collision/route geometry | Existing map source |
| NPC/encounter/reward/discovery/transition/gate/save | Existing live gameplay source |
| Reusable routing guidance | HPA-495 skill |

Do not hide upstream defects with HPA-406 translation layers.

## 19. Highest-cost risk

The highest-cost HPA-406 failure is **incorrect visual owner assignment**, because it can produce either duplicated baked+live obstacles or invisible collision when the wrong live visual is suppressed.

That is why owner assignment is fixed from HPA-399’s sealed `primaryRegionId`/disposition contract before PR 1 texture activation. Draw-order math and byte copying are secondary risks and must not be allowed to define ownership implicitly.

## 20. Acceptance criteria

HPA-406 is complete when:

- HPA-495 classifies it as frozen integration and unnecessary design/art workflows are skipped;
- the texture preflight passes or a measured failure is routed before architecture expands;
- the full runtime visual-owner table is a fixed projection of HPA-399 and never changes owner between PRs;
- all 22 HPA-496 exports are eventually registered at approved coordinates, dimensions, plane, and draw order;
- HPA-398 Sundrop backgrounds remain the top village overlay on their planes;
- walked routes have no seam, double-darkening, transparent hole, duplicated baked/live visual, or invisible collision;
- missing base/foreground states preserve readable fallback and authoritative collision;
- live/stateful gameplay and saves remain functional;
- zero-consumer adapter/process scaffolding encountered by the work is deleted completely enough that the retained manual validator and current world-expansion skill remain valid;
- normal PR CI no longer reruns the frozen production package;
- focused tests, web/Tauri builds, and continuous controller walkthrough pass;
- outdoor acceptance finishes in HPA-406 without a separate whole-map certification ticket.

## 21. Resulting architecture

```text
HPA-399 sealed primaryRegionId + dispositions
        │
        ├── test-time exact projection ──► full MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
        │                                      │
HPA-496 approved crops/exports                 │ active iff owner crop registered
        │                                      ▼
        └──────────────► meadow-entry-runtime-backgrounds.ts
                               │
                               ├── images ──► meadow-entry.ts
                               └── assets ──► regionalBackgroundAssets → BootScene
                                                    │
                                                    ▼
                                           existing WorldScene renderer
                                                    │
                                                    └── one shared blocker/decor/fence fallback rule
```

The core decision remains modest: **approved images become one direct map-specific runtime registry, while HPA-399’s already-sealed source ownership is projected once into a fixed browser-safe fallback table.**