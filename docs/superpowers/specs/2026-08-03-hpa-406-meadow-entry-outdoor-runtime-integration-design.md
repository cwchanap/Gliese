# HPA-406 Meadow-Entry Outdoor Runtime Integration Design

**Status:** Revised after YAGNI review; asset-safety preflight required before runtime foundation  
**Linear:** HPA-406  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-03

## 1. Purpose

Integrate every approved non-village `meadow-entry` base and foreground export into the existing Phaser regional-background runtime while preserving frozen gameplay geometry, collision, live semantic objects, fallback presentation, save behavior, and cross-region traversal.

This design deliberately minimizes new infrastructure. It adds only the contracts required by the 22 approved HPA-496 exports and the existing HPA-399 runtime-ownership obligations.

## 2. Delivery policy

HPA-406 maps to exactly **one Linear ticket and one pull request**.

The three regional checkpoints remain reviewable commit/evidence groups inside that PR:

1. Crossroads and connectors;
2. Tidewatch Coast and Silverpine;
3. Mistfen, Wildwood, and east forest boundary.

Do not open multiple PRs for HPA-406. If the preflight or implementation shows that the work cannot remain one reviewable PR, stop and rescope the remaining work into new Linear tickets before continuing.

HPA-514 and HPA-495 retain their own one-ticket/one-PR delivery. Runtime implementation cannot begin until the approved Story Integration Catalog/fingerprint and Area Expansion Packet/skill outputs exist and are current. The asset-safety preflight is independent and may run before those story/workflow prerequisites.

## 3. Frozen inputs

Consume without redesigning:

- HPA-399 source catalog, crop manifest, overlap manifest, runtime coverage, bake ownership, and `combinedControlFingerprint`;
- HPA-496 approved export inventory, exact bytes, dimensions, hashes, texture keys, draw orders, and provenance;
- HPA-398 Sundrop base/foreground IDs, assets, multi-owner blocker behavior, and semantic plane depths;
- HPA-514 structured story integration outputs;
- HPA-495 Area Expansion Packet and world-expansion skills.

Route defects upstream instead of correcting them locally:

- crop, overlap, ownership, route-mouth, or geometry defect → HPA-399;
- pixels, export dimensions, alpha, hash, provenance, or inventory defect → HPA-496;
- story/location/character/gate mismatch → HPA-514;
- reusable skill defect → HPA-495 while its PR is open, otherwise a new ticket;
- runtime registration, rendering, fallback, or diagnostics defect → HPA-406.

## 4. Non-goals

- No route, collision, encounter, NPC, reward, discovery, gate, transition, story, spoiler, or audio redesign.
- No visual-master regeneration or regional retouching.
- No general dependency graph for backgrounds.
- No speculative streaming API.
- No custom aggregate art-package fingerprint.
- No authored/composed background type hierarchy.
- No repository-wide regional-asset LFS migration.
- No exhaustive screenshot permutation for every crop.
- No final performance budget; HPA-411 owns final packaged-build and hardware acceptance.

## 5. Mandatory asset-safety preflight

Run this before implementing the runtime foundation.

The approved inventory contains two exports whose height exceeds 4096 pixels:

```text
wildwood-base.png                          2688 × 4928
outer-boundary-east-forest-lane-base.png   1440 × 4608
```

The full HPA-496 inventory is 109,509,947 compressed bytes and 98,893,824 pixels, approximately 377.25 MiB decoded as RGBA before the HPA-398 pair, mipmaps, driver overhead, or unrelated textures.

Add a small standalone probe that serves the exact approved artifact files, launches Chromium through Playwright, queries `MAX_TEXTURE_SIZE`, decodes every export, attempts WebGL texture upload, and records:

- renderer and `MAX_TEXTURE_SIZE`;
- every asset dimension;
- decode/upload success or error;
- total decode/upload time;
- context-loss or allocation symptoms;
- reference OS/browser/hardware.

The probe is not coupled to `BootScene`, the generated runtime package, or a future loading strategy.

Decision:

- If an approved dimension exceeds the tested renderer limit or texture upload fails for an individual asset, stop HPA-406 and route the required crop/export amendment to HPA-399/HPA-496. HPA-406 cannot work around an unsupported texture dimension while crop changes remain out of scope.
- If all individual textures upload but aggregate loading crashes, loses context, or is clearly unsafe, stop and create a dedicated load-management ticket before HPA-406 continues.
- If the complete probe succeeds, record the result and proceed with simple map-based eager loading. HPA-411 still owns final performance thresholds.

This gate occurs before the background model, generator, ownership, or renderer migrations.

## 6. Minimal background model

Keep one background descriptor type. Add only the fields the runtime needs:

```ts
export interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: 'base' | 'foreground';
  drawOrder: number;
}
```

`createLayeredRegionBackground(...)` accepts and returns `drawOrder`. The only current authored HPA-398 call sites pass:

```ts
drawOrder: 1_000
```

Generated HPA-399 descriptors copy their frozen manifest orders:

```text
0, 10, 100, 110, 120, 130, 140, 200, 210, 220, 230, 240
```

No raw Phaser `depth` field is added.

Depth remains renderer-owned:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
  background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
  return MAP_BACKGROUND_DEPTHS[background.plane]
    + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Validation rejects duplicate `(plane, drawOrder)` pairs, non-integers, negative values, and values above `1_000`.

This keeps all HPA-399 crops below the immutable HPA-398 Sundrop overlay on the corresponding plane.

## 7. Derived foreground/base pairing

Do not add `dependsOnBackgroundId` or a general dependency graph.

Foreground-to-base pairing is mechanically derived from stable IDs:

```ts
export function getRequiredBaseBackgroundId(
  background: MapBackgroundImage
): string | null {
  if (background.plane === 'base') return null;

  if (background.id === 'sundrop-village-foreground-image') {
    return 'sundrop-village-base-image';
  }

  const suffix = '-foreground-image';
  if (!background.id.endsWith(suffix)) {
    throw new Error(`Unsupported foreground background ID: ${background.id}`);
  }

  return `${background.id.slice(0, -suffix.length)}-base-image`;
}
```

Package and map validation require every derived base ID to exist and use plane `base`. No cycle detection is needed because bases cannot depend on another background and foreground pairing is not authored data.

## 8. Generated runtime package

Use one focused module plus one generated file:

```text
src/lib/game/content/backgrounds/meadow-entry-runtime-package.ts
src/lib/game/content/generated/meadow-entry-runtime-package.ts
tools/generate-meadow-entry-runtime-package.ts
```

The generator consumes the HPA-399/HPA-496 TypeScript contracts directly and emits:

```ts
export interface RegionalBackgroundAsset {
  id: string;
  key: string;
  path: string;
  compressedBytes: number;
  decodedRgbaBytes: number;
  approvedPngSha256: string;
}

export interface RuntimeVisualOwner {
  sourceId: string;
  ownerBackgroundId: string;
}

export interface MeadowEntryRuntimePackage {
  version: 1;
  controlFingerprint: string;
  assets: readonly RegionalBackgroundAsset[];
  backgrounds: readonly MapBackgroundImage[];
  ownership: {
    blockers: readonly RuntimeVisualOwner[];
    decor: readonly RuntimeVisualOwner[];
    fences: readonly RuntimeVisualOwner[];
  };
}
```

Do not duplicate plane, dimensions, draw order, or foreground pairing in `RegionalBackgroundAsset`; those belong to `MapBackgroundImage`.

Stable mappings:

```ts
backgroundId = `${approvedExport.textureKey}-image`;
runtimePath = `/game/assets/regions/meadow-entry/${approvedFilename}`;
```

The package stores the existing HPA-399 `combinedControlFingerprint`. It does not invent another aggregate fingerprint; `--check` validates every HPA-496 approval field and export hash directly.

The generator:

1. validates the HPA-399 control fingerprint against the HPA-496 approval;
2. verifies crop ID, plane, filename, texture key, dimensions, hash, bytes, and draw order;
3. builds descriptors and minimal loader assets;
4. builds generated ownership records;
5. copies exact approved bytes to `public/game/assets/regions/meadow-entry/`;
6. publishes atomically;
7. supports non-mutating `--check`.

## 9. Runtime asset storage

Add Git LFS only for:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

Keep the existing HPA-398 Sundrop sibling PNGs under their current raw-blob policy.

The storage check verifies:

- each new runtime file is LFS tracked;
- materialized bytes begin with a valid PNG signature;
- runtime SHA-256 equals the approved export SHA-256;
- pointer text is not passed to the build.

Do not add a separate LFS-OID equality assertion; matching approved bytes plus correct LFS tracking is sufficient.

## 10. Visual ownership

Generalize the existing blocker contract because decor and fences are actually baked in the approved regions:

```ts
export type MapVisualOwnership =
  | { mode: 'always' }
  | { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };
```

Add optional `visual` to blockers, decor, and fence segments. Use one helper:

```ts
export function shouldRenderOwnedVisual(
  visual: MapVisualOwnership | undefined,
  successfulBackgroundIds: ReadonlySet<string>
): boolean {
  if (!visual || visual.mode === 'always') return true;
  return !visual.ownerBackgroundIds.every((id) =>
    successfulBackgroundIds.has(id)
  );
}
```

Preserve immutable HPA-398 multi-owner behavior exactly.

Every new HPA-406 ownership record has one authoritative base owner. Resolve it by:

1. expand the source bounds using the frozen ownership margins and existing HPA-399 geometry helpers;
2. find approved base crops that fully contain the required bounds;
3. choose the containing crop with the highest frozen `drawOrder`;
4. verify the selected crop agrees with `ownerCropId` wherever both overlapping crops fully contain the source;
5. fail when no eligible owner exists.

Do not use `primaryRegionId` in owner selection or add a separate provenance cross-check. The source catalog and frozen overlap manifest already own that validation.

Map ownership validation checks only:

- non-empty owner arrays;
- unique owner IDs;
- referenced descriptor IDs exist;
- new generated entries contain one base owner;
- generated ownership does not overwrite an existing HPA-398-owned blocker.

Do not duplicate `mergeRegions` collection-ID uniqueness checks.

## 11. Post-merge composition

Keep `mergeRegions(...)` unchanged.

After merge:

```ts
const backgroundImages = [
  ...merged.backgroundImages,
  ...meadowEntryRuntimePackage.backgrounds
];

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);
const blockers = applyGeneratedVisualOwnership(
  sundropOwnedBlockers,
  meadowEntryRuntimePackage.ownership.blockers,
  { rejectAlreadyOwned: true }
);
const mapDecor = applyGeneratedVisualOwnership(
  merged.mapDecor,
  meadowEntryRuntimePackage.ownership.decor
);
const fences = applyGeneratedVisualOwnership(
  merged.fences,
  meadowEntryRuntimePackage.ownership.fences
);
```

The helpers are pure: return new arrays, clone only changed objects, and never mutate region fragments.

Run background order/pair validation, generic ownership validation, generated single-owner validation, and the existing Sundrop coverage validation against the final arrays.

## 12. Two-phase rendering

Change `WorldScene.renderRegionalBackgrounds` from one input-order pass to:

1. render all base descriptors in ascending `drawOrder`;
2. render all foreground descriptors in ascending `drawOrder` only when `getRequiredBaseBackgroundId(...)` is present in the base success set;
3. emit `blocked-by-base` for a foreground whose required base failed;
4. after both phases, select blocker/decor/fence fallback visuals from the final success set.

Disabled mode emits `disabled` for every descriptor and selects fallback from an empty success set.

Extend diagnostics additively with selected decor and fence fallback IDs. Keep collision creation independent from visual suppression.

## 13. Loading

Do not introduce a load-strategy union.

Use one production function:

```ts
export interface RegionalBackgroundLoadPlan {
  assetIds: readonly string[];
  estimatedCompressedBytes: number;
  estimatedDecodedRgbaBytes: number;
}

export function buildRegionalBackgroundLoadPlan(
  map: WorldMapDefinition,
  inventory: readonly RegionalBackgroundAsset[]
): RegionalBackgroundLoadPlan;
```

It selects exactly the assets referenced by `map.backgroundImages`, validates every reference, and returns deterministic descriptor order.

When regional backgrounds are disabled, `BootScene` queues none and emits an empty-plan diagnostic. It does not label disabled mode as streaming.

The standalone preflight has its own `buildFullInventoryProbeList(...)`; it does not go through the production map-load function.

A future load-management ticket may replace the production loader if the preflight or HPA-411 requires it. HPA-406 does not define that future API.

## 14. Evidence

Use tests for exhaustive failure permutations and screenshots only for behaviorally distinct visual proof.

For each regional checkpoint capture:

- enabled visual composition;
- collision overlay;
- continuous controller traversal.

For each checkpoint also capture one representative case for:

- disabled or missing/invalid base;
- partial foreground / `blocked-by-base`;
- save/reload.

Checkpoint 1 additionally records the standalone texture-safety probe and its go/stop decision in the Markdown report. Do not add a custom TypeScript evidence schema or validator for one-off JSON.

## 15. Acceptance criteria

HPA-406 is complete when:

- the asset preflight permits runtime integration, or HPA-406 is stopped and correctly rescoped;
- every approved runtime file and descriptor matches HPA-399/HPA-496 inputs;
- every HPA-399 crop renders below the immutable HPA-398 overlay on its plane;
- all base descriptors are evaluated before foregrounds;
- failed bases produce `blocked-by-base` foreground diagnostics;
- generated blocker/decor/fence ownership has one base owner and never overwrites HPA-398 ownership;
- collision and all live semantic objects remain unchanged;
- Crossroads/connectors, Coast/Silverpine, and Mistfen/Wildwood/east boundary pass focused visual, fallback, save, and traversal evidence;
- no permanent checkpoint selector remains;
- the complete unit, e2e, static, web, Tauri, asset, and storage gates pass;
- HPA-411 can begin without unresolved integration or load-policy ambiguity.
