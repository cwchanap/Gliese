# HPA-406 Meadow Entry Outdoor Runtime Integration Design

**Status:** Revised after ownership-model review  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-06

## 1. Purpose

Integrate the approved HPA-496 Meadow Entry base/foreground exports into the existing HPA-398 regional-background runtime and finish outdoor acceptance without redesigning the map, regenerating art, or creating another authoring/package framework.

The player-facing result is the complete opening outdoor map rendered with the approved coherent artwork across Sundrop Village, Crossroads, every connector, Tidewatch Coast, Mistfen, Silverpine, Wildwood, and the reviewed east forest boundary while current gameplay remains authoritative.

HPA-406 is **frozen integration**. Geometry and art already exist. Runtime work should therefore be direct registration, one measured texture gate, the smallest reusable visual-ownership extension, and focused acceptance.

## 2. Existing frozen inputs

The required contracts already exist on `main`:

- **HPA-398** provides `MapBackgroundImage`, semantic base/foreground planes, background load/render success tracking, blocker fallback ownership, and the proven Sundrop Village pair.
- **HPA-399** provides the reviewed source catalog, bake dispositions, runtime fallback obligations, crop rectangles, coverage attachments, overlaps, draw order, and runtime baked/fallback coverage.
- **HPA-496** provides the approved regional PNG exports. Every export is a literal crop of one global base or foreground master at the HPA-399 crop rectangle.
- **HPA-495** provides the lean `gliese-world-expansion` skill and classifies this work as `frozen-integration`.

The runtime seam is already centralized:

```text
src/lib/game/content/maps/types.ts
src/lib/game/content/maps/background-ownership.ts
src/lib/game/content/maps/meadow-entry.ts
src/lib/game/content/assets.ts
src/lib/game/phaser/scenes/BootScene.ts
src/lib/game/phaser/scenes/WorldScene.ts
```

HPA-406 must not create another model of the world to integrate frozen data.

## 3. Frozen-integration rules

The implementation must:

- consume HPA-399/HPA-496 data without map or art redesign;
- skip Story Integration Catalog, Area Expansion Packet, map-design, and environment-art production workflows;
- keep collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and saves live and authoritative;
- keep backgrounds presentational;
- fix source/crop/art defects at their existing owner rather than compensating with runtime translation layers;
- update the world-expansion skill only if this real delivery exposes a reusable routing defect.

## 4. Non-goals

Do not add:

- story catalogs or fingerprints;
- packet schemas;
- another generic art adapter;
- a versioned runtime-package schema;
- foreground-to-base dependency state;
- `dependsOnBackgroundId` or `blocked-by-base`;
- streaming, residency managers, or load-strategy enums;
- a second approval/fingerprint layer;
- new gameplay geometry or routes;
- new encounters, rewards, NPCs, transitions, gates, or save semantics;
- art regeneration without a concrete source-art defect;
- screenshot/evidence matrices or a separate whole-map certification ticket.

A small build-time generator for frozen browser-safe data is permitted. It is code generation, not a new runtime package or workflow platform.

## 5. Highest-cost correctness risk: visual ownership

The most expensive failure is suppressing a live obstacle/decor/fence when the baked art that visually replaces it is not actually present. That produces invisible collision. The opposite failure produces duplicated baked + live art.

HPA-399's `primaryRegionId` is an **authoring owner**, not a unique runtime crop owner. Likewise, `sourceRegionIds` on crops is review/provenance metadata and is not unique: an outer-boundary crop can name Wildwood and Tidewatch Coast while those destination crops also name themselves.

Therefore HPA-406 must not select one owner crop using:

- primary region;
- `sourceRegionIds` uniqueness;
- highest draw order;
- nearest region;
- overlap owner alone.

The runtime replacement relationship is instead derived from the frozen pixels: because HPA-496 exports are direct crops of the same global master, **every crop that fully contains the required baked extent independently contains that visual**.

This relationship can be one-to-many.

## 6. Multi-crop visual ownership model

Use one shared runtime model for blockers, decor, and fences:

```ts
export interface MapVisualOwnerCrop {
	readonly cropId: string;
	readonly requiredBackgroundIds: readonly string[];
}

export type MapVisualOwnership =
	| { mode: 'always' }
	| {
			mode: 'fallback-only';
			ownerCrops: readonly MapVisualOwnerCrop[];
	  };
```

A single owner crop may require:

- base only for `base-static` visuals;
- base + foreground for `base-and-foreground` visuals.

Different owner crops are **alternatives**. Within one crop, required planes are **conjunctive**.

```ts
export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerCrops.some((crop) =>
		crop.requiredBackgroundIds.every((id) => successfulBackgroundIds.has(id))
	);
}
```

This means:

- one complete owner crop is enough to suppress the live fallback;
- failure of a second overlapping crop does not re-enable a duplicate live visual when another complete crop already supplies it;
- a base+foreground owner is complete only when both required planes rendered;
- if no owner crop is complete, the live fallback renders.

HPA-398 Sundrop ownership is the degenerate one-crop case. Its existing reviewed `ownerBackgroundIds` remain the source contract and are mechanically converted to one `MapVisualOwnerCrop` when applied, preserving current behavior.

## 7. Deriving owner crops from HPA-399

The full runtime visual-owner table is generated once from the frozen HPA-399 contract before runtime asset activation.

For every HPA-399 entry whose `runtimeRequirement` is:

```text
existing-blocker-fallback
extend-decor-fallback
extend-fence-fallback
```

excluding blockers already owned by the immutable HPA-398 Sundrop manifest:

1. resolve the exact source record from `collectMeadowEntrySourceCatalog()`;
2. require rectangle bounds for the source;
3. expand those bounds using the frozen bake margins:
   - `base-static` → `margins`;
   - `base-and-foreground` → both `baseMargins` and `foregroundMargins`;
4. consider every `MEADOW_ENTRY_APPROVED_CROPS` entry;
5. for `base-static`, select every crop whose final `crop.bounds` fully contains the expanded base extent;
6. for `base-and-foreground`, select every crop that has a foreground export and whose final `crop.bounds` fully contains both expanded extents;
7. map each selected crop to stable background IDs;
8. sort deterministically by crop draw order then crop ID;
9. fail generation if no complete owner crop exists.

Use the existing HPA-399 `containsBounds(...)` helper. Do not create a second geometry algorithm.

### Coverage attachments

Do **not** union `coverageAttachments` a second time during HPA-406 ownership generation.

HPA-399 already derives each final crop rectangle from:

```text
reviewBounds + coverageAttachments
→ expansion
→ grid snap
→ declared world-edge clamp
→ crop.bounds
```

HPA-496 then exports exactly `crop.bounds` from the global master. Therefore final `crop.bounds` is the correct runtime containment surface and already incorporates the reviewed attachments.

### Runtime-coverage cross-check

`MEADOW_ENTRY_RUNTIME_COVERAGE` already uses the same final crop bounds to attribute each coverage cell to all containing crop IDs. HPA-406 may test consistency against that table, but the runtime does not import the heavy authoring contract.

`primaryRegionId` and `sourceRegionIds` may appear in generator diagnostics. They are not selectors and no uniqueness assertion is allowed.

## 8. Reproducible generated runtime data

Do not use print-and-paste steps for the highest-risk table.

Add one committed build-time generator:

```text
tools/generate-meadow-entry-runtime.ts
```

It consumes the frozen HPA-399/HPA-496 TypeScript contracts and writes one browser-safe generated data module:

```text
src/lib/game/content/generated/meadow-entry-runtime.ts
```

The generated module contains only plain runtime data:

```ts
export const MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS = [/* all 22 exports */] as const;
export const MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS = [/* complete fallback obligations */] as const;
```

Each background row contains:

- crop ID;
- stable background ID;
- texture key;
- public path;
- x/y/width/height;
- plane;
- draw order.

Each visual-owner row contains:

- source type (`blocker` | `decor` | `fence`);
- source ID;
- alternative `ownerCrops`;
- required background IDs within each crop.

Do not copy provenance, hashes, overlap graphs, source catalogs, approval objects, or fingerprints into browser runtime data.

The generator supports:

```bash
bun tools/generate-meadow-entry-runtime.ts
bun tools/generate-meadow-entry-runtime.ts --check
```

Follow the repository's existing generated-story pattern:

- deterministic ordering;
- exact text rendering;
- atomic temp-file + rename writes;
- `--check` fails when the committed output is missing or stale;
- CI runs `--check`.

No runtime generation occurs in the browser or Tauri app.

## 9. Texture-safety preflight

Before changing runtime loading, run one standalone Chromium/WebGL probe that loads and retains all 22 approved HPA-496 textures together.

The package contains large exports, including:

```text
wildwood-base.png                          2688 × 4928
outer-boundary-east-forest-lane-base.png   1440 × 4608
```

The probe must:

1. serve the exact approved artifact bytes;
2. create WebGL2 or WebGL1;
3. query `MAX_TEXTURE_SIZE`;
4. decode every export;
5. upload every export;
6. retain every successful texture until all 22 attempts finish;
7. record context loss/allocation/upload failure;
8. record approximate timing and environment.

Decision:

- all 22 succeed → keep simple eager loading;
- one texture/dimension fails → repair/re-export at HPA-399/HPA-496 ownership;
- aggregate residency fails → create one measured load-management ticket.

This is **environment-scoped evidence**. A Chromium success does not prove macOS/Windows Tauri WebView residency. A later native failure becomes the measured follow-up; it does not justify speculative streaming now.

## 10. Accepted asset cost

The approved HPA-496 exports total **109,509,947 bytes (~104.4 MiB)** compressed and approximately **377.25 MiB** decoded RGBA before HPA-398 textures, mipmaps/driver overhead, and unrelated game assets.

The final public runtime copies therefore add roughly 104 MiB to browser/Tauri static output, and CI jobs that checkout Git LFS materialized assets will transfer those objects.

This is an accepted hobby-project milestone cost. HPA-406 does not add CDN/streaming/bundling machinery unless measured load or package behavior fails.

## 11. Deletion-first cleanup

### 11.1 Remove frozen production validation from every PR

Delete the dedicated `Meadow Entry Art Package` CI job and the normal `build-and-lint` step that reruns `art:storage:meadow-entry`.

Keep HPA-399/HPA-496 production commands available locally/manual for real repair/re-export work.

Normal runtime CI uses:

- generated runtime `--check`;
- cheap public runtime PNG existence/dimension/hash tests;
- normal check/lint/build/e2e gates.

### 11.2 Delete the zero-consumer generic adapter

After one final live-consumer search, delete:

```text
art-map-adapters/meadow-entry.v1.json
tools/art-map-package.ts
src/lib/game/content/backgrounds/art-map-package-adapter.test.ts
src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json
docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md
```

Also:

- remove `art:map-package` from `package.json`;
- remove the deleted adapter test from `MEADOW_ENTRY_TEST_FILES` in `tools/meadow-entry-art-test-files.ts`;
- update current `gliese-world-expansion` authoring guidance so it no longer describes a live Meadow Entry adapter;
- run the retained `bun run art:validate:meadow-entry` once after deletion to prove the manual production workflow still works.

Historical plans/reports need not be rewritten.

## 12. Deterministic background order

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

- HPA-496 keeps frozen draw orders `0..240`;
- existing HPA-398 Sundrop base/foreground use `1000` and remain above HPA-496 village underlay/overlaps on their respective planes;
- order must be a non-negative integer at or below `1000`;
- `(plane, drawOrder)` pairs must be unique in final map descriptors.

No raw Phaser depth is added to content data.

## 13. One generic visual-ownership applier

Do not implement `applyMeadowEntryRuntimeOwnership(...)` as a second copy of `applySundropObstacleOwnership(...)`.

Extract one generic pure helper in the existing ownership module:

```ts
export interface VisualOwnershipAssignment {
	readonly sourceId: string;
	readonly visual: MapVisualOwnership;
}

export function applyVisualOwnership<T extends { id: string; visual?: MapVisualOwnership }>(
	items: readonly T[],
	assignments: readonly VisualOwnershipAssignment[],
	options?: { rejectExisting?: boolean }
): T[];
```

It must:

- reject duplicate assignment IDs;
- reject assignment IDs absent from the target collection;
- optionally reject overwriting an existing `visual` contract;
- clone only changed records;
- never mutate source arrays.

`applySundropObstacleOwnership(...)` remains the HPA-398-specific contract/validation wrapper but delegates its actual attachment work to this helper after mechanically converting its reviewed manifest into the new one-crop runtime form.

HPA-406 uses the same helper for blocker, decor, and fence rows.

## 14. Runtime activation, not regenerated ownership

The generator emits **all 22** background records and the **full final ownership table** in implementation PR 1.

A tiny handwritten runtime wrapper owns only delivery activation:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime.ts
```

It defines active crop IDs and projects the generated data into:

```ts
meadowEntryRuntimeBackgroundImages
meadowEntryRuntimeBackgroundAssets
activeMeadowEntryRuntimeVisualOwners
```

A generated visual-owner row is active when at least one of its owner crops has all required background IDs registered by the current active crop set. Owner rows themselves never change between PR 1 and PR 2.

This keeps the two-PR delivery reviewable without making PR staging part of the frozen ownership model.

## 15. Delivery split

PR 1 must prove both the easy connector seam **and a real multi-crop ownership case**.

### Implementation PR 1 — seam + Crossroads/connectors + Wildwood boundary proof

Activate 16 HPA-496 textures:

```text
sundrop-village-underlay-base.png
village-crossroads-connector-base.png
village-crossroads-connector-foreground.png
crossroads-coast-connector-base.png
crossroads-coast-connector-foreground.png
crossroads-mistfen-connector-base.png
crossroads-mistfen-connector-foreground.png
crossroads-silverpine-connector-base.png
crossroads-silverpine-connector-foreground.png
crossroads-wildwood-connector-base.png
crossroads-wildwood-connector-foreground.png
crossroads-base.png
crossroads-foreground.png
wildwood-base.png
wildwood-foreground.png
outer-boundary-east-forest-lane-base.png
```

PR 1 owns:

- texture preflight;
- deletion cleanup;
- draw order;
- shared multi-crop visual ownership;
- generic ownership applier;
- generator + `--check`;
- full generated background/ownership data;
- the active runtime wrapper;
- 16 public/LFS PNG copies;
- renderer support;
- cheap runtime asset tests;
- Crossroads/connector traversal plus a Wildwood forest-lane multi-crop proof.

### Implementation PR 2 — remaining destinations + final acceptance

Activate the remaining 6 textures:

```text
tidewatch-coast-base.png
tidewatch-coast-foreground.png
mistfen-base.png
mistfen-foreground.png
silverpine-base.png
silverpine-foreground.png
```

PR 2 changes the active crop list and adds exact runtime PNG copies. It must not change the generated ownership result unless HPA-399/HPA-496 frozen inputs themselves are amended.

## 16. Runtime asset copies and preload contract

Copy approved PNG bytes unchanged from:

```text
artifacts/meadow-entry/hpa-399/exports/
```

to:

```text
public/game/assets/regions/meadow-entry/
```

Add scoped LFS:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

A cheap asset test verifies active runtime files against HPA-496 approval:

- file exists;
- dimensions match;
- SHA-256 matches.

Do not re-encode copied PNGs.

### `regionalBackgroundAssets` typing

The combined preload list is not a heterogeneous frozen tuple API.

Introduce the structural preload contract:

```ts
export interface RegionalBackgroundPreloadAsset {
	readonly key: string;
	readonly path: string;
}
```

Keep the existing Sundrop entries/constants with their HPA-398-only approval metadata. Export the combined list as:

```ts
export const regionalBackgroundAssets: readonly RegionalBackgroundPreloadAsset[] = [
	...sundropRegionalBackgroundAssets,
	...meadowEntryRuntimeBackgroundAssets
];
```

`BootScene` consumes only `{ key, path }`. Code needing Sundrop hashes/fingerprints uses the Sundrop constants, not the widened combined preload list.

## 17. Composition

Keep `mergeRegions(...)` and gameplay `RegionFragment` files unchanged.

At the final `meadow-entry.ts` composition point:

1. append active generated HPA-496 background descriptors to existing HPA-398 descriptors;
2. apply HPA-398 Sundrop ownership through its existing wrapper/generic helper;
3. filter full generated HPA-406 ownership to currently complete active owner crops;
4. apply active blocker/decor/fence ownership through the same generic helper;
5. validate final background/order/owner references.

No baked-art registration is pushed down into region gameplay files.

## 18. Renderer behavior

Base and foreground remain independent.

`WorldScene.renderRegionalBackgrounds(...)` continues attempting every active descriptor independently and collecting successful background IDs.

Minimal renderer changes:

1. call `getMapBackgroundDepth(background)`;
2. pass the final success set into blocker, decor, and fence rendering;
3. use the shared `shouldRenderOwnedVisual(...)` for all three source types;
4. optionally extend existing diagnostics with selected fallback decor/fence IDs for focused e2e tests.

Do not add foreground/base dependency state.

Collision creation remains unconditional.

## 19. Automated validation

Automated checks cover:

- generator output is current (`--check`);
- all 22 generated background descriptors exactly match HPA-399/HPA-496 frozen data;
- every generated fallback source has at least one complete owner crop;
- multi-crop ownership uses alternative crop groups, not a flat conjunction;
- the Wildwood + east-boundary example exercises more than one owner crop;
- active runtime PNGs exist and match approved dimensions/hash;
- draw order produces deterministic depth;
- base and foreground remain independent;
- a base+foreground owner is incomplete when either required plane fails;
- a multi-crop visual stays suppressed when one complete owner crop succeeds even if another owner crop fails;
- all owned fallback visuals return when no owner crop is complete;
- HPA-398 Sundrop behavior remains unchanged;
- existing map/transition/encounter/reward/discovery/save invariants stay green.

Mechanical missing-base/missing-foreground fallback is tested in unit/e2e. The manual controller pass does not duplicate those failure injections.

Core commands:

```bash
bun run world:generate:meadow-entry-runtime --check
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bun run lint
bun run build
bun run build:tauri
```

Do not put the full HPA-496 production-art validator back into every-PR CI.

## 20. Manual acceptance

PR 1 manual acceptance covers:

- Sundrop Village → Crossroads → connector mouths → return;
- Crossroads → Wildwood forest lane/east boundary → return;
- visual confirmation that the multi-crop forest-bank source has neither duplicate live art nor invisible collision;
- one representative save/reload;
- normal packaged Tauri run.

Final HPA-406 acceptance covers one continuous controller route:

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

Cross every connector mouth both directions and exercise one representative route/reward/encounter per destination. Record one approximate load observation and one steady-state frame-time observation.

Subjective visual review remains manual.

## 21. Failure ownership

| Defect | Owner |
| --- | --- |
| Bake disposition/source geometry/crop coverage | HPA-399 source/contract |
| PNG pixels/alpha/dimensions/export | HPA-496 art source |
| Generated runtime join/order/registration/preload/fallback | HPA-406 runtime |
| Collision/route geometry | Existing map source |
| NPC/encounter/reward/discovery/transition/gate/save | Existing live gameplay source |
| Reusable routing guidance | HPA-495 skill |

Zero complete crop owners for a required fallback source is a frozen-contract defect, not a signal to add partial-source runtime segmentation.

## 22. Acceptance criteria

HPA-406 is complete when:

- HPA-495 classifies it as frozen integration and unnecessary design/art workflows are skipped;
- the texture preflight passes or a measured failure is routed before loading architecture expands;
- generated runtime data is deterministic and `--check` clean;
- all 22 HPA-496 exports are eventually active at approved coordinates, dimensions, planes, and draw orders;
- visual ownership represents alternative overlapping crops correctly;
- PR 1 proves at least one genuine multi-crop Wildwood/east-boundary fallback source before PR 2;
- HPA-398 Sundrop visual behavior remains unchanged;
- walked routes have no seam, double-darkening, transparent hole, duplicated baked/live visual, or invisible collision;
- missing/failed planes preserve readable fallback and authoritative collision;
- live/stateful gameplay and saves remain functional;
- zero-consumer adapter/process scaffolding encountered by the work is deleted;
- normal PR CI no longer reruns the frozen production package;
- focused tests, generated-data check, web/Tauri builds, and controller walkthrough pass;
- outdoor acceptance finishes in HPA-406 without a separate whole-map certification ticket.

## 23. Resulting architecture

```text
HPA-399 bake/crop/runtime-coverage contracts + HPA-496 approval
                         │
                         ▼
        tools/generate-meadow-entry-runtime.ts
                         │ --check
                         ▼
       generated browser-safe backgrounds + full
            multi-crop visual-owner table
                         │
                  active crop IDs
                         ▼
       meadow-entry-runtime.ts (tiny wrapper)
             │                         │
             ├── images ───────────────► meadow-entry.ts
             └── preload assets ───────► BootScene
                                           │
                                           ▼
                                  existing WorldScene
                                           │
                                           └── one shared blocker/decor/fence fallback rule
```

The core decision remains modest: **frozen HPA-399/HPA-496 data is deterministically projected into browser-safe runtime arrays and consumed by the existing renderer; overlapping crops are modeled as alternative visual owners rather than forced into one owner.**