# HPA-406 Meadow Entry Outdoor Runtime Integration Design

**Status:** Approved direction for implementation planning  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-06

## 1. Purpose

Integrate the approved HPA-496 Meadow Entry base and foreground exports into the existing HPA-398 regional-background runtime and finish outdoor acceptance without redesigning the map, regenerating art, or introducing another world-authoring or asset-package framework.

The player-facing result is simple: Sundrop Village, Crossroads, every connector, Tidewatch Coast, Mistfen, Silverpine, Wildwood, and the reviewed east forest boundary should render the approved coherent Meadow Entry artwork while all current gameplay behavior remains authoritative and unchanged.

HPA-406 is **frozen integration**. Geometry and art already exist. The implementation should therefore be dominated by direct registration, small renderer/fallback extensions, and focused acceptance rather than new design machinery.

## 2. Current repository state

The required inputs already exist on `main`:

- HPA-398 provides `MapBackgroundImage`, base/foreground semantic planes, per-background load/render success tracking, blocker fallback ownership, fallback diagnostics, and the proven Sundrop Village background pair.
- HPA-399 provides the frozen crop manifest, draw orders, source ownership, runtime bake/fallback obligations, and the complete Meadow Entry control contract.
- HPA-496 provides the approved 22 non-HPA-398 runtime exports with exact crop IDs, filenames, texture keys, bounds, dimensions, bytes, hashes, planes, and draw orders.
- HPA-495 provides the lean `gliese-world-expansion` skill and explicitly classifies this work as `frozen-integration`.

The runtime seam is already narrow:

- `src/lib/game/content/maps/types.ts` models `MapBackgroundImage` with geometry, texture key, and plane.
- `src/lib/game/content/maps/meadow-entry.ts` is the final composition point after `mergeRegions(...)`.
- `src/lib/game/content/assets.ts` owns Phaser asset registration through `regionalBackgroundAssets`.
- `src/lib/game/phaser/scenes/BootScene.ts` preloads enabled regional backgrounds.
- `src/lib/game/phaser/scenes/WorldScene.ts` validates texture presence and dimensions, renders backgrounds, collects successful background IDs, and then decides whether fallback blocker visuals are needed.

The missing pieces are therefore ordering, the 22 approved runtime registrations, and extension of the existing fallback-ownership concept to the baked decor/fence obligations identified by HPA-399.

## 3. Frozen-integration classification

HPA-406 must follow the HPA-495 frozen-integration path:

- consume approved geometry and art;
- skip map design;
- skip environment-art production;
- skip a new Expansion Brief unless the PR description is insufficient;
- preserve collision, transitions, NPCs, encounters, rewards, discoveries, gates, saves, and other stateful ownership;
- fix a defect at its existing owner instead of adding a translation layer.

The implementation PR descriptions should record only:

1. the player-facing outcome;
2. the approved HPA-399/HPA-496 inputs consumed;
3. live, baked, collision, and stateful ownership that remains unchanged;
4. that geometry redesign and environment-art production were intentionally skipped;
5. the acceptance walkthrough performed.

## 4. Non-goals

HPA-406 does **not** add:

- a Story Integration Catalog or story fingerprint;
- an Area Expansion Packet or packet schema;
- another art-package adapter;
- a generated runtime-package schema;
- a background dependency graph;
- foreground-to-base dependency state;
- streaming, residency management, or load-strategy enums;
- another approval layer or aggregate fingerprint;
- new map geometry or route design;
- new encounters, rewards, NPCs, transitions, gates, or save semantics;
- art regeneration or independent regional retouching without a concrete visual defect;
- exhaustive screenshot matrices or a separate whole-map certification ticket.

The attached story plan and broader story systems are not runtime inputs for this frozen integration.

## 5. Checkpoint 0: texture-safety preflight

Before changing runtime loading, run a standalone WebGL probe against all 22 approved HPA-496 exports simultaneously.

This is the one justified load-safety gate because the approved package contains large textures, including:

```text
wildwood-base.png                          2688 × 4928
outer-boundary-east-forest-lane-base.png   1440 × 4608
```

The probe must:

1. serve the exact approved artifact files;
2. launch Chromium through Playwright;
3. create WebGL2 or WebGL1;
4. query `MAX_TEXTURE_SIZE`;
5. decode every export;
6. upload each export to a WebGL texture;
7. retain every successful texture until all uploads finish;
8. observe context loss and allocation/upload failures;
9. print approximate per-texture and aggregate timing plus environment information.

Record only:

- maximum supported texture size;
- which texture, if any, failed upload;
- whether aggregate context loss/allocation failure occurred;
- approximate load/decode/upload time;
- browser/OS environment.

Decision rule:

- If the complete approved package succeeds, proceed with the simplest eager loading already used by `BootScene`.
- If a texture exceeds the measured limit or fails individually, repair/re-export that asset at the HPA-399/HPA-496 owner.
- If only aggregate residency fails, stop and create a dedicated load-management ticket.

Do **not** respond to a successful preflight by adding streaming anyway.

## 6. Deletion-first cleanup

HPA-406 should remove process scaffolding that has no runtime consumer and is directly encountered by this integration.

### 6.1 Remove frozen art-package validation from every PR

The approved HPA-496 assets are now frozen runtime inputs. Normal PR CI should not install a separate macOS job solely to rerun the full Meadow Entry art-production validator.

Remove:

- the dedicated `Meadow Entry Art Package` CI job;
- the normal-PR `art:storage:meadow-entry` step that validates the production package rather than the runtime copy.

Keep the existing art-production commands available locally/manual for real HPA-399/HPA-496 repair work.

The normal runtime CI replacement is a cheap focused test over the actual files under `public/game/assets/regions/meadow-entry/`: existence, dimensions, and approved SHA-256.

### 6.2 Delete the unused generic art-map adapter

Before deletion, run one final code search for real consumers outside the adapter's own command/test/spec surface. If no runtime or active workflow consumer exists, delete:

```text
art-map-adapters/meadow-entry.v1.json
tools/art-map-package.ts
src/lib/game/content/backgrounds/art-map-package-adapter.test.ts
src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json
docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md
```

and remove the `art:map-package` package script.

Historical HPA-399/HPA-496 plans may mention that old exploration; they do not make it a live consumer and do not require wholesale documentation rewrites.

## 7. Minimal background ordering

The approved crops overlap intentionally, so runtime composition needs deterministic order.

Extend the existing descriptor directly:

```ts
export interface MapBackgroundImage extends MapRect {
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}
```

Do not add Phaser `depth` to content data.

The renderer continues to own semantic depths and derives a small order offset:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Rules:

- HPA-496 uses its frozen draw orders `0` through `240`.
- Existing HPA-398 Sundrop Village base and foreground use `1000` so they remain above the HPA-496 Sundrop underlay/overlap artwork on their respective planes.
- Draw order is a non-negative integer at or below `1000`.
- `(plane, drawOrder)` pairs should be unique within the final map descriptors.

This is enough to solve overlapping crop composition without a second descriptor hierarchy.

## 8. One direct Meadow Entry runtime registry

Add one map-specific module:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts
```

It is the runtime registration source for the HPA-496 exports. It should be deliberately boring.

```ts
type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
	cropId: string;
	path: string;
};

export const MEADOW_ENTRY_RUNTIME_BACKGROUNDS:
	readonly MeadowEntryRuntimeBackgroundDefinition[] = [/* approved entries */];

export const meadowEntryRuntimeBackgroundImages =
	MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(({ cropId: _cropId, path: _path, ...image }) => image);

export const meadowEntryRuntimeBackgroundAssets =
	MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(({ textureKey, path }) => ({
		key: textureKey,
		path
	}));
```

Each record contains only runtime facts:

- crop ID;
- stable background ID;
- texture key;
- public runtime path;
- x/y/width/height;
- plane;
- draw order.

Do not duplicate hashes, provenance, approvals, crop-neighbor graphs, overlap tables, or source catalogs into runtime code.

A focused test may import the HPA-399/HPA-496 authoring contracts to prove that these 22 runtime records exactly match the frozen approved inventory. The runtime module itself must not pull the heavy authoring/approval machinery into the browser bundle.

## 9. Runtime asset copies

Copy the exact approved HPA-496 bytes to:

```text
public/game/assets/regions/meadow-entry/
```

Add one scoped Git LFS rule:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

No asset generator or synchronization framework is required. The approved artifact copy remains the production source; the public path is the runtime copy.

A cheap asset-integrity test must verify each runtime file against the frozen HPA-496 approval:

- file exists;
- PNG dimensions match;
- SHA-256 matches the approved export.

Git LFS deduplicates identical objects by content, so storing an approved runtime copy does not require a custom package abstraction.

## 10. Composition point

Keep `mergeRegions(...)` unchanged.

HPA-496 backgrounds are presentation and should be appended at the final `meadow-entry.ts` composition point rather than embedded into the six gameplay `RegionFragment` files.

Conceptually:

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];
```

The final ordering is controlled by `drawOrder`, not array ownership.

This keeps region files focused on gameplay/world authoring and gives frozen approved art one integration seam.

## 11. Shared visual fallback ownership

HPA-398 proves the correct behavioral model for baked static visuals:

- collision remains authoritative;
- live fallback is suppressed only when all backgrounds that own that visual rendered successfully;
- if a required background is unavailable, the live visual returns.

Generalize the existing visual ownership type instead of creating separate blocker/decor/fence systems:

```ts
export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };
```

Use it on:

- `MapBlocker.visual`;
- `MapDecor.visual`;
- `MapFenceSegment.visual`.

Use one decision helper:

```ts
export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}
```

Preserve the existing HPA-398 Sundrop multi-owner semantics exactly.

## 12. Meadow Entry visual-ownership manifest

Add one explicit runtime manifest:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts
```

It contains only the HPA-406 ownership required to suppress already-baked blocker/decor/fence visuals.

Runtime ownership is explicit rather than dynamically computed in the browser. Tests may use HPA-399 authoring geometry to prove the manifest matches the frozen bake contract.

Ownership rules:

- `base-static` source → one owning base background ID;
- `base-and-foreground` source → owning base and foreground background IDs;
- existing HPA-398-owned blocker → leave its existing ownership unchanged;
- `protected-live`, `runtime-fallback-only`, `control-only`, and stateful/live sources → never suppress through HPA-406.

For HPA-406-owned entries, the expected crop is the highest-draw-order approved base crop that fully contains the HPA-399 source bounds expanded by the frozen bake margins. A test should fail if no crop contains the source, if a required foreground is absent, or if the explicit manifest disagrees with the frozen contract.

The containment calculation belongs in tests/authoring validation, not in runtime rendering.

## 13. Renderer behavior

Keep foreground and base planes independent.

Do **not** add `dependsOnBackgroundId`, `blocked-by-base`, or a foreground/base dependency graph.

`WorldScene.renderRegionalBackgrounds(...)` should continue evaluating each descriptor independently:

- missing base does not prevent an unrelated foreground from being attempted;
- missing foreground does not invalidate a successfully rendered base;
- successful background IDs are collected independently;
- final fallback selection happens only after all background attempts are complete.

The only renderer changes are:

1. derive depth from the full background descriptor including `drawOrder`;
2. pass `successfulBackgroundIds` into decor/fence rendering just as blocker rendering already receives it;
3. skip a decor/fence live visual when `shouldRenderOwnedVisual(...)` says its baked owner set succeeded;
4. extend existing diagnostics with selected fallback decor/fence IDs if needed by focused tests/e2e.

Collision construction remains unconditional and independent of visual suppression.

## 14. Loading

Do not add a production load-plan abstraction.

Once the texture preflight passes, extend `regionalBackgroundAssets` with the approved Meadow Entry runtime assets and keep the existing `BootScene` behavior:

- regional backgrounds enabled → preload the registered regional background images;
- regional backgrounds disabled → queue none.

The opening outdoor world is one `meadow-entry` map, so map-scoped streaming does not buy useful complexity for this milestone.

If a measured failure later proves eager loading unsuitable, that becomes a separate load-management task with real evidence.

## 15. Delivery split

Follow the HPA-406 ticket's two implementation PRs.

### PR 1 — Crossroads and connector proof

Integrate 13 HPA-496 textures:

- `sundrop-village-underlay` base;
- Village ↔ Crossroads connector base/foreground;
- Crossroads ↔ Coast connector base/foreground;
- Crossroads ↔ Mistfen connector base/foreground;
- Crossroads ↔ Silverpine connector base/foreground;
- Crossroads ↔ Wildwood connector base/foreground;
- Crossroads base/foreground.

PR 1 also owns the reusable runtime seam:

- texture preflight;
- deletion-first cleanup;
- `drawOrder`;
- direct runtime registry;
- public/LFS runtime copies;
- shared blocker/decor/fence visual ownership;
- renderer support;
- focused asset-integrity checks.

### PR 2 — Remaining regions and final outdoor acceptance

Append the remaining 9 HPA-496 textures:

- Tidewatch Coast base/foreground;
- Mistfen base/foreground;
- Silverpine base/foreground;
- Wildwood base/foreground;
- east forest outer-boundary base.

PR 2 should primarily be data registration plus final acceptance. If it requires another framework, that is a signal that PR 1's seam is wrong or a concrete defect belongs upstream.

## 16. Focused validation

Automated tests should cover only meaningful contracts:

- every runtime descriptor matches approved path, dimensions, plane, draw order, and geometry;
- every runtime PNG exists and matches approved dimensions/hash;
- draw order produces deterministic overlapping depth;
- base and foreground remain independent;
- missing base restores the appropriate fallback visual;
- missing foreground restores foreground-owned fallback without disabling a valid base;
- blocker/decor/fence runtime ownership matches HPA-399 obligations;
- HPA-398 multi-owner Sundrop ownership remains unchanged;
- transitions, encounters, rewards, discoveries, and saves touched by integration remain valid through existing tests.

Use the existing focused commands from the world-expansion skill:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bun run lint
bun run build
bun run build:tauri
```

Add the new runtime asset/ownership tests to the focused unit invocation as appropriate.

Do not rerun the full HPA-496 production-art validator in normal every-PR CI.

## 17. Manual acceptance

Final HPA-406 acceptance is one continuous controller walkthrough:

1. start in Sundrop Village;
2. reach Crossroads through the village connector and return once;
3. from Crossroads visit Tidewatch Coast and return;
4. visit Mistfen and return;
5. visit Silverpine and return;
6. visit Wildwood and return;
7. cross every connector mouth in both directions;
8. exercise one representative route/reward/encounter per destination;
9. save and reload at one representative outdoor checkpoint;
10. run one representative missing-base fallback;
11. run one representative missing-foreground fallback;
12. run a normal packaged Tauri build;
13. record one before/after load observation and one steady-state frame-time observation.

Subjective visual review stays manual. Do not create screenshot permutations for every crop.

## 18. Failure ownership

If acceptance exposes a defect, fix it at the existing owner:

| Defect | Owner |
| --- | --- |
| Crop bounds, overlap, route mouth, geometry, bake ownership | HPA-399 source/contract |
| PNG pixels, alpha, dimensions, approved export | HPA-496 art source |
| Background registration, preload, order, rendering, fallback | HPA-406 runtime |
| Collision or route geometry | Existing map source |
| NPC, encounter, reward, discovery, transition, gate, save behavior | Existing live gameplay source |
| Reusable world-expansion routing instruction | HPA-495 skill |

Do not hide an upstream defect with an HPA-406 translation layer.

## 19. Acceptance criteria

HPA-406 is complete when:

- HPA-495 correctly classifies the work as frozen integration and no unnecessary map/art workflow is invoked;
- the texture-safety preflight passes or a measured failure is routed to the correct owner before runtime architecture expands;
- every approved HPA-496 non-village/opening-map export is registered at the approved coordinates, dimensions, plane, and draw order;
- the HPA-398 Sundrop backgrounds remain the authoritative top village overlay on their planes;
- no connector seam, double-darkening, transparent hole, duplicated baked/live obstacle, or invisible collision remains on walked routes;
- missing base/foreground states preserve readable live fallback and authoritative collision;
- buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and saves remain live and functional;
- zero-consumer art-map adapter/process scaffolding encountered by this work is deleted rather than extended;
- normal PR CI no longer reruns the full frozen HPA-496 production package;
- focused unit/e2e/static checks, web build, Tauri build, and the continuous controller walkthrough pass;
- outdoor acceptance is finished in HPA-406 with no separate HPA-411-style certification ticket required.

## 20. Resulting architecture

```text
HPA-399/HPA-496 frozen approvals
        │
        │ tests validate against them
        ▼
meadow-entry-runtime-backgrounds.ts
        │
        ├── meadowEntryRuntimeBackgroundImages
        │          │
        │          ▼
        │   meadow-entry.ts composition
        │
        └── meadowEntryRuntimeBackgroundAssets
                   │
                   ▼
             BootScene preload
                   │
                   ▼
        WorldScene existing renderer
                   │
                   └── shared blocker/decor/fence fallback ownership
```

The key architectural decision is intentionally modest: **22 approved images become one direct map-specific runtime registry consumed by the existing renderer.** Everything else stays at its current owner.