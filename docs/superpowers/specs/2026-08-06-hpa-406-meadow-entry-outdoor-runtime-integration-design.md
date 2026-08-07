# HPA-406 Meadow Entry Outdoor Runtime Integration Design

**Status:** Approved direction for implementation planning  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-06

## 1. Purpose

Integrate the approved HPA-496 Meadow Entry base/foreground exports into the existing HPA-398 regional-background runtime and finish outdoor acceptance without redesigning the map, regenerating art, or creating another authoring/package framework.

The player-facing result is the complete opening outdoor map rendered with the approved coherent artwork across Sundrop Village, Crossroads, every connector, Tidewatch Coast, Mistfen, Silverpine, Wildwood, and the reviewed east forest boundary while current gameplay behavior remains authoritative.

HPA-406 is **frozen integration**: geometry and art already exist, so the implementation should be direct registration plus the smallest renderer/fallback changes required by the approved package.

## 2. Existing seam

The prerequisites already exist on `main`:

- HPA-398: `MapBackgroundImage`, base/foreground planes, successful-background tracking, blocker fallback ownership, diagnostics, and the proven Sundrop pair.
- HPA-399: frozen crop geometry, draw orders, source ownership, bake/fallback obligations, overlaps, and runtime coverage.
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

The missing runtime capabilities are only deterministic overlapping background order, direct registration of the approved exports, and fallback ownership for the decor/fence visuals HPA-399 says are baked.

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

A successful preflight is specifically evidence **not** to invent streaming.

## 6. Deletion-first cleanup

### 6.1 Remove frozen production validation from every PR

Delete the dedicated `Meadow Entry Art Package` CI job and the normal-PR `art:storage:meadow-entry` step. Keep the production commands available locally/manual for actual HPA-399/HPA-496 repair work.

Normal runtime CI should instead use a cheap focused test over the files under `public/game/assets/regions/meadow-entry/`: existence, dimensions, and approved SHA-256.

### 6.2 Delete the unused generic art-map adapter

After one final search confirms no active runtime/workflow consumer, delete:

```text
art-map-adapters/meadow-entry.v1.json
tools/art-map-package.ts
src/lib/game/content/backgrounds/art-map-package-adapter.test.ts
src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json
docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md
```

and remove the `art:map-package` script.

Historical planning documents may still describe that exploration; they do not make it a live consumer and should not trigger a wholesale HPA-399/HPA-496 rewrite.

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
type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
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
```

Use it on blockers, decor, and fence segments with one decision helper:

```ts
export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}
```

This preserves existing Sundrop multi-owner behavior exactly: live fallback is suppressed only when every required baked owner rendered successfully.

## 12. Explicit Meadow Entry ownership manifest

Add:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts
```

Runtime ownership is explicit and small; browser code does not calculate geometry ownership dynamically. Tests derive expected ownership from frozen HPA-399 geometry/bake contracts and compare it to the explicit manifest.

Rules:

- `base-static` → owning base background ID;
- `base-and-foreground` → owning base and foreground IDs;
- existing HPA-398-owned blockers retain existing ownership and are never overwritten;
- protected/live/fallback-tile/control-only/stateful sources remain live;
- expected owner crop is the highest-draw-order approved base crop that fully contains the source bounds expanded by frozen margins.

**Delivery sequencing:** the explicit manifest contains only entries whose selected owner crop is active in the current implementation PR. PR 1 therefore covers Crossroads/connector-owned visuals only; when PR 2 activates the remaining region crops, the same derivation test expands the expected manifest to the complete HPA-399 runtime obligations. This prevents PR 1 from referencing background IDs that do not exist yet.

The containment calculation is test/authoring validation only, never runtime behavior.

## 13. Renderer behavior

Base and foreground remain independent. Do **not** add `dependsOnBackgroundId`, `blocked-by-base`, or a two-phase dependency engine.

`WorldScene.renderRegionalBackgrounds(...)` continues attempting each descriptor independently, collecting successful IDs. A missing foreground does not invalidate a good base; a missing base does not block unrelated foreground attempts.

Minimal renderer changes:

1. call `getMapBackgroundDepth(background)` so draw order affects depth;
2. pass the final `successfulBackgroundIds` into decor and fence rendering, as blocker rendering already receives it;
3. skip live decor/fence when `shouldRenderOwnedVisual(...)` says all baked owners succeeded;
4. optionally extend the existing diagnostic with selected fallback decor/fence IDs for focused tests.

Collision creation remains unconditional.

## 14. Loading

Do not add a production load-plan abstraction.

After a passing preflight, extend `regionalBackgroundAssets` with the active direct runtime assets and keep current `BootScene` behavior:

- regional backgrounds enabled → preload registered regional backgrounds;
- disabled → queue none.

The opening outdoor world is one `meadow-entry` map, so streaming adds no demonstrated value here.

## 15. Delivery split

### PR 1 — Crossroads and connector proof

Activate 13 HPA-496 textures:

- Sundrop underlay base;
- Village↔Crossroads base/foreground;
- four Crossroads↔destination connector base/foreground pairs;
- Crossroads base/foreground.

PR 1 also owns the preflight, deletion cleanup, draw order, direct registry, runtime copies, shared visual ownership, renderer support, and cheap runtime asset test.

### PR 2 — Remaining regions and final acceptance

Append the remaining 9 textures:

- Coast base/foreground;
- Mistfen base/foreground;
- Silverpine base/foreground;
- Wildwood base/foreground;
- east forest outer-boundary base.

PR 2 should be mostly data activation plus final acceptance. Requiring another framework is a signal to fix PR 1's seam or route a concrete defect upstream.

## 16. Validation

Automated checks cover:

- active runtime descriptor path/dimensions/geometry/plane/order against HPA-399/HPA-496;
- runtime PNG existence, dimensions, and approved hash;
- deterministic draw depth;
- independent base/foreground behavior;
- representative missing-base and missing-foreground fallback;
- active blocker/decor/fence ownership against HPA-399 obligations;
- unchanged HPA-398 multi-owner ownership;
- existing map, transition, encounter, reward/discovery, save, and scene invariants.

Use focused existing commands plus new focused tests:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bun run lint
bun run build
bun run build:tauri
```

Do not rerun the full HPA-496 production-art validator in normal every-PR CI.

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
| Crop/overlap/route-mouth/bake ownership | HPA-399 source/contract |
| PNG pixels/alpha/dimensions/export | HPA-496 art source |
| Registration/preload/order/render/fallback | HPA-406 runtime |
| Collision/route geometry | Existing map source |
| NPC/encounter/reward/discovery/transition/gate/save | Existing live gameplay source |
| Reusable routing guidance | HPA-495 skill |

Do not hide upstream defects with HPA-406 translation layers.

## 19. Acceptance criteria

HPA-406 is complete when:

- HPA-495 classifies it as frozen integration and unnecessary design/art workflows are skipped;
- the texture preflight passes or a measured failure is routed before architecture expands;
- all 22 HPA-496 exports are eventually registered at approved coordinates, dimensions, plane, and draw order;
- HPA-398 Sundrop backgrounds remain the top village overlay on their planes;
- walked routes have no seam, double-darkening, transparent hole, duplicated baked/live visual, or invisible collision;
- missing base/foreground states preserve readable fallback and authoritative collision;
- live/stateful gameplay and saves remain functional;
- zero-consumer adapter/process scaffolding encountered by the work is deleted rather than extended;
- normal PR CI no longer reruns the frozen production package;
- focused tests, web/Tauri builds, and continuous controller walkthrough pass;
- outdoor acceptance finishes in HPA-406 without a separate whole-map certification ticket.

## 20. Resulting architecture

```text
HPA-399/HPA-496 frozen contracts
        │
        │ focused tests only
        ▼
meadow-entry-runtime-backgrounds.ts
        │
        ├── background images ──► meadow-entry.ts
        └── preload assets ─────► BootScene
                                  │
                                  ▼
                         existing WorldScene renderer
                                  │
                                  └── shared blocker/decor/fence fallback
```

The core decision is intentionally modest: **approved images become one direct map-specific runtime registry consumed by the existing renderer.**