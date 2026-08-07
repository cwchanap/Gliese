# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Measure texture viability first, delete superseded adapter/CI scaffolding, add draw order, generalize the current fallback model to OR-of-owner-crops / AND-of-required-planes, and generate the complete browser-safe background + ownership data once from frozen HPA-399/HPA-496 sources. PR 1 activates Crossroads/connectors plus Wildwood/east-boundary to prove the hard multi-crop case; PR 2 only activates the remaining destinations.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`: approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, bake dispositions, coverage attachments, overlaps, runtime coverage, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, hashes, planes, and approved pixels are frozen.
- HPA-398 Sundrop background and reviewed fallback behavior remain semantically unchanged.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and saves remain live and authoritative.
- Base and foreground remain independent; missing foreground never invalidates a good base.
- Runtime visual ownership is alternative crop groups: crops are OR; required planes inside one crop are AND.
- `primaryRegionId`, `sourceRegionIds`, highest draw order, and overlap owner are not runtime visual-owner selectors.
- Use final HPA-399 `crop.bounds`; coverage attachments are already folded into those bounds before HPA-496 export.
- Do not add story catalogs/fingerprints, packet schemas, generic art adapters, versioned runtime-package schemas, foreground dependency graphs, streaming/residency managers, load-strategy enums, or new approval layers.
- Normal every-PR CI must not rerun the full frozen HPA-496 production-art validator.
- Final HPA-496 public runtime copies add 109,509,947 bytes (~104.4 MiB) compressed and approximately 377.25 MiB decoded RGBA before HPA-398/driver overhead. Accept this unless measured behavior fails.

## Delivery Shape

### PR 1 — runtime seam + Crossroads/connectors + Wildwood multi-crop proof

Activate these 16 HPA-496 textures:

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

PR 1 generates the final 22-export registry and final full ownership table before any runtime activation. It must prove `wildwood-north-climb-east-bank` has both Wildwood and east-boundary as valid alternative owner crops.

### PR 2 — remaining destinations + final acceptance

Activate the remaining 6:

```text
tidewatch-coast-base.png
tidewatch-coast-foreground.png
mistfen-base.png
mistfen-foreground.png
silverpine-base.png
silverpine-foreground.png
```

PR 2 must not alter generated ownership unless HPA-399/HPA-496 frozen inputs are explicitly amended.

---

### Task 1: Run the Texture-Safety Preflight

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports`.
- Produces: `bun run world:probe:meadow-entry-textures` with `decision: 'proceed' | 'stop'`.

- [ ] **Step 1: Add the script**

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

- [ ] **Step 2: Build the exact approved inventory**

```ts
import { meadowEntryArtPackageApproval } from '../src/lib/game/content/approvals/meadow-entry-art-package';

const assets = meadowEntryArtPackageApproval.exports.map((asset) => ({
	id: `${asset.cropId}:${asset.plane}`,
	path: asset.path,
	width: asset.width,
	height: asset.height
}));

if (assets.length !== 22) throw new Error(`Expected 22 exports, found ${assets.length}`);
```

Serve only those artifact paths from a temporary Bun HTTP server.

- [ ] **Step 3: Upload all assets into one retained WebGL context**

Launch Chromium with Playwright. In the page:

```ts
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
if (!gl) throw new Error('WebGL unavailable');

const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
const retainedTextures: WebGLTexture[] = [];
let contextLost = false;
canvas.addEventListener('webglcontextlost', (event) => {
	event.preventDefault();
	contextLost = true;
});
```

For each asset: fetch, `createImageBitmap`, `createTexture`, `texImage2D`, check `gl.getError()`, and retain every successful texture until all 22 finish. Record per-asset time/failure, total time, `MAX_TEXTURE_SIZE`, context loss, browser, and platform.

- [ ] **Step 4: Apply the hard gate**

```bash
bun run world:probe:meadow-entry-textures
```

Continue only for 22/22 successful uploads and no context loss. Individual texture failure goes to HPA-399/HPA-496. Aggregate-only failure gets one measured load-management ticket. Do not add streaming here.

Treat this as Chromium-scoped evidence, not proof of Tauri WebView GPU behavior.

- [ ] **Step 5: Commit**

```bash
git add package.json tools/probe-meadow-entry-texture-safety.ts
git commit -m "test(hpa-406): probe meadow texture safety"
```

---

### Task 2: Delete Superseded Adapter and Every-PR Production Validation

**Files:**
- Delete: `art-map-adapters/meadow-entry.v1.json`
- Delete: `tools/art-map-package.ts`
- Delete: `src/lib/game/content/backgrounds/art-map-package-adapter.test.ts`
- Delete: `src/lib/game/content/backgrounds/fixtures/future-map-adapter.v1.json`
- Delete: `docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md`
- Modify: `tools/meadow-entry-art-test-files.ts`
- Modify: `.agents/skills/gliese-world-expansion/references/authoring.md`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Confirm the adapter has no active consumer**

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- .
```

Historical docs are not consumers. Stop deletion only if a live runtime/workflow invocation exists outside the adapter's own command/test/spec surface.

- [ ] **Step 2: Delete the adapter surface**

Delete the five files and remove:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

from `package.json`.

- [ ] **Step 3: Repair the retained manual validator list**

Remove:

```text
src/lib/game/content/backgrounds/art-map-package-adapter.test.ts
```

from `MEADOW_ENTRY_TEST_FILES`.

Update current world-expansion authoring guidance so it no longer describes a live Meadow Entry adapter.

- [ ] **Step 4: Remove frozen production work from normal PR CI**

Delete the dedicated `meadow-entry-art-package` job and the `build-and-lint` step running:

```bash
bun run art:storage:meadow-entry
```

Keep production-art commands for explicit repair/re-export work.

- [ ] **Step 5: Verify retained workflows**

```bash
bun run art:validate:meadow-entry
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
bun run check
bun run lint
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(hpa-406): remove unused meadow art adapter"
```

---

### Task 3: Add Deterministic Background Draw Order

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `tools/render-sundrop-village-obstacle-proof.ts`

**Interfaces:**
- Produces: required `MapBackgroundImage.drawOrder` and `getMapBackgroundDepth(background)`.

- [ ] **Step 1: Write failing depth/order tests**

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
```

Add rejection tests for negative, non-integer, `> 1000`, and duplicate `(plane, drawOrder)` values.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
```

- [ ] **Step 3: Implement the descriptor extension**

```ts
export interface MapBackgroundImage extends MapRect {
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}
```

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Extend current validation with the order rules.

- [ ] **Step 4: Thread order through HPA-398**

Add required `drawOrder` input/return data to `createLayeredRegionBackground(...)`. Pass `drawOrder: 1_000` to both village background calls and update explicit fixtures/proofs. Do not add a default.

- [ ] **Step 5: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
git add src/lib/game/content/maps tools/render-sundrop-village-obstacle-proof.ts
git commit -m "feat(hpa-406): order regional backgrounds"
```

---

### Task 4: Generalize Fallback Ownership to Alternative Crops

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts`

**Interfaces:**
- Produces: `MapVisualOwnerCrop`, `MapVisualOwnership`, `shouldRenderOwnedVisual(...)`, `applyVisualOwnership(...)`.
- Keeps `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP` as the reviewed HPA-398 source contract.

- [ ] **Step 1: Write failing OR-of-crops tests**

```ts
const alternatives = {
	mode: 'fallback-only' as const,
	ownerCrops: [
		{ cropId: 'a', requiredBackgroundIds: ['a-base'] },
		{ cropId: 'b', requiredBackgroundIds: ['b-base'] }
	]
};

expect(shouldRenderOwnedVisual(alternatives, new Set())).toBe(true);
expect(shouldRenderOwnedVisual(alternatives, new Set(['a-base']))).toBe(false);
expect(shouldRenderOwnedVisual(alternatives, new Set(['b-base']))).toBe(false);
```

- [ ] **Step 2: Write failing AND-of-planes tests**

```ts
const baseAndForeground = {
	mode: 'fallback-only' as const,
	ownerCrops: [
		{ cropId: 'a', requiredBackgroundIds: ['a-base', 'a-foreground'] }
	]
};

expect(shouldRenderOwnedVisual(baseAndForeground, new Set(['a-base']))).toBe(true);
expect(
	shouldRenderOwnedVisual(baseAndForeground, new Set(['a-base', 'a-foreground']))
).toBe(false);
```

- [ ] **Step 3: Implement the shared type and visibility rule**

```ts
export interface MapVisualOwnerCrop {
	readonly cropId: string;
	readonly requiredBackgroundIds: readonly string[];
}

export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerCrops: readonly MapVisualOwnerCrop[] };
```

Use it on blockers, decor, and fences.

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

Extend validation to reject empty owner-crop arrays, duplicate crop IDs, empty required-ID arrays, duplicate required IDs, and missing background IDs.

- [ ] **Step 4: Add one generic pure ownership applier**

```ts
export interface VisualOwnershipAssignment {
	readonly sourceId: string;
	readonly visual: MapVisualOwnership;
}

export function applyVisualOwnership<T extends { id: string; visual?: MapVisualOwnership }>(
	items: readonly T[],
	assignments: readonly VisualOwnershipAssignment[],
	options: { rejectExisting?: boolean } = {}
): T[];
```

Implementation requirements:

- duplicate assignment IDs throw;
- assignment IDs absent from `items` throw;
- `rejectExisting` rejects overwrites;
- unchanged and changed records are cloned; inputs are never mutated.

Write tests for all four behaviors.

- [ ] **Step 5: Mechanically route Sundrop through the generic helper**

Keep each reviewed Sundrop manifest entry's current `ownerBackgroundIds`. Convert it during application to:

```ts
{
	sourceId: entry.blockerId,
	visual: {
		mode: 'fallback-only',
		ownerCrops: [
			{
				cropId: 'sundrop-village-hpa-398',
				requiredBackgroundIds: [...entry.ownerBackgroundIds]
			}
		]
	}
}
```

Then call `applyVisualOwnership(...)`. Retain existing HPA-398 contract/coverage checks.

- [ ] **Step 6: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
git add src/lib/game/content/maps src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership*
git commit -m "refactor(hpa-406): share multi-crop visual ownership"
```

---

### Task 5: Generate the Full 22-Export Runtime Data Before Registration

**Files:**
- Create: `tools/generate-meadow-entry-runtime.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-generator.test.ts`
- Create: `src/lib/game/content/generated/meadow-entry-runtime.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `MEADOW_ENTRY_APPROVED_CROPS`, `MEADOW_ENTRY_BAKE_OWNERSHIP`, `collectMeadowEntrySourceCatalog()`, `meadowEntryArtPackageApproval.exports`, and HPA-398 Sundrop blocker IDs.
- Produces: all 22 browser-safe background rows plus the full non-Sundrop visual-owner table.
- Exports pure `collectMeadowEntryRuntimeData()` and `renderMeadowEntryRuntimeData(...)` from the tool for the server-side Vitest file under `src/**`.

- [ ] **Step 1: Add a failing exact background-join test**

In the `src/**` generator test, import:

```ts
import {
	collectMeadowEntryRuntimeData,
	renderMeadowEntryRuntimeData
} from '../../../../../tools/generate-meadow-entry-runtime';
```

Assert `collectMeadowEntryRuntimeData().backgrounds` has exactly 22 entries.

For each approved export, join its crop and assert:

```ts
{
	cropId: approved.cropId,
	id: `${approved.textureKey}-image`,
	textureKey: approved.textureKey,
	path: `/game/assets/regions/meadow-entry/${approved.path.split('/').at(-1)}`,
	x: (crop.bounds.left + crop.bounds.right) / 2,
	y: (crop.bounds.top + crop.bounds.bottom) / 2,
	width: approved.width,
	height: approved.height,
	plane: approved.plane,
	drawOrder: approved.drawOrder
}
```

- [ ] **Step 2: Add the two concrete ownership regression tests**

For `wildwood-forest-lane-west-bank`, raw source bounds are:

```text
left=4968 top=3200 right=5032 bottom=5300
```

After the frozen `8px` base margins, require the generated crop IDs to equal:

```ts
['outer-boundary-east-forest-lane']
```

For `wildwood-north-climb-east-bank`, require:

```ts
['outer-boundary-east-forest-lane', 'wildwood']
```

in draw-order order.

These are the gate proving the old single-region selector is gone.

- [ ] **Step 3: Implement required-bounds expansion using existing geometry helpers**

Rasterize the source first, expand by frozen margins, then clamp to the world:

```ts
function expandRequiredBounds(bounds: RawPixelBounds, margins: Insets): PixelBounds {
	const raster = rasterizeCoverageBounds(bounds);
	return clampBoundsToWorld({
		left: raster.left - margins.left,
		top: raster.top - margins.top,
		right: raster.right + margins.right,
		bottom: raster.bottom + margins.bottom
	}).bounds;
}
```

Use existing `containsBounds(...)`; do not duplicate containment math.

- [ ] **Step 4: Derive every complete owner crop geometrically**

Iterate HPA-399 entries with runtime requirement:

```text
existing-blocker-fallback
extend-decor-fallback
extend-fence-fallback
```

Skip blocker IDs already in `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`.

For `base-static`, select every crop satisfying:

```ts
containsBounds(crop.bounds, baseRequiredBounds)
```

For `base-and-foreground`, select every crop with a foreground texture and satisfying both:

```ts
containsBounds(crop.bounds, baseRequiredBounds)
containsBounds(crop.bounds, foregroundRequiredBounds)
```

`coverageAttachments` are not added separately; final `crop.bounds` already includes them by HPA-399 derivation.

If no complete crop exists, throw an error naming source type/ID and `primaryRegionId` for diagnosis. Do not use `primaryRegionId` or `sourceRegionIds` to select a crop.

- [ ] **Step 5: Build alternative crop groups**

For `base-static`:

```ts
{
	cropId: crop.id,
	requiredBackgroundIds: [`${crop.textureKeys.base}-image`]
}
```

For `base-and-foreground`:

```ts
{
	cropId: crop.id,
	requiredBackgroundIds: [
		`${crop.textureKeys.base}-image`,
		`${crop.textureKeys.foreground}-image`
	]
}
```

Sort crops by `drawOrder`, then ID. Sort rows by `sourceType`, then `sourceId`.

- [ ] **Step 6: Render one deterministic generated module**

The generated file starts with:

```ts
// @generated by tools/generate-meadow-entry-runtime.ts. Do not edit by hand.

import type { MapBackgroundImage, MapVisualOwnerCrop } from '$lib/game/content/maps/types';

export interface GeneratedMeadowEntryBackground extends MapBackgroundImage {
	readonly cropId: string;
	readonly path: string;
}

export interface GeneratedMeadowEntryVisualOwner {
	readonly sourceType: 'blocker' | 'decor' | 'fence';
	readonly sourceId: string;
	readonly ownerCrops: readonly MapVisualOwnerCrop[];
}
```

and exports:

```ts
MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS
MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
```

Do not emit approvals, fingerprints, provenance, overlap graphs, or source catalogs into runtime data.

- [ ] **Step 7: Implement atomic generation and `--check`**

Follow `tools/export-story-content-references.ts`: deterministic source text, temporary sibling file, atomic rename, cleanup in `finally`, and exact-byte `--check` failure for missing/stale output.

Accept only zero args or exactly `--check`.

- [ ] **Step 8: Add the script and CI freshness gate**

```json
"world:generate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime.ts"
```

Generate and check:

```bash
bun run world:generate:meadow-entry-runtime
bun run world:generate:meadow-entry-runtime --check
```

Add to normal `build-and-lint` CI:

```yaml
- name: Verify Meadow Entry runtime data is current
  run: bun run world:generate:meadow-entry-runtime --check
```

- [ ] **Step 9: Run the server-side generator test**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-generator.test.ts
bun run world:generate:meadow-entry-runtime --check
bun run check
```

- [ ] **Step 10: Commit the correctness gate**

```bash
git add tools/generate-meadow-entry-runtime.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-generator.test.ts \
  src/lib/game/content/generated/meadow-entry-runtime.ts \
  package.json .github/workflows/ci.yml
git commit -m "feat(hpa-406): generate meadow runtime ownership"
```

Do not proceed to runtime PNG registration unless this task is green.

---

### Task 6: Activate PR-1 Crops and Copy 16 Runtime PNGs

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime.test.ts`
- Create: `src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts`
- Add: 16 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: `.gitattributes`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

**Interfaces:**
- Consumes: generated full data from Task 5.
- Produces: active background images/assets and active fallback assignments for PR 1.

- [ ] **Step 1: Define the exact active crop IDs**

```ts
export const MEADOW_ENTRY_ACTIVE_CROP_IDS = [
	'sundrop-village-underlay',
	'village-crossroads-connector',
	'crossroads-coast-connector',
	'crossroads-mistfen-connector',
	'crossroads-silverpine-connector',
	'crossroads-wildwood-connector',
	'crossroads',
	'wildwood',
	'outer-boundary-east-forest-lane'
] as const;
```

Assert this produces exactly 16 active HPA-496 background records.

- [ ] **Step 2: Project active background images/assets**

```ts
const activeCropIds = new Set<string>(MEADOW_ENTRY_ACTIVE_CROP_IDS);

export const meadowEntryRuntimeBackgrounds =
	MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS.filter((background) =>
		activeCropIds.has(background.cropId)
	);

export const meadowEntryRuntimeBackgroundImages = meadowEntryRuntimeBackgrounds.map(
	({ cropId: _cropId, path: _path, ...background }) => background
);

export const meadowEntryRuntimeBackgroundAssets = meadowEntryRuntimeBackgrounds.map(
	({ textureKey, path }) => ({ key: textureKey, path })
);
```

- [ ] **Step 3: Activate only complete owner-crop groups**

```ts
const activeBackgroundIds = new Set(meadowEntryRuntimeBackgrounds.map(({ id }) => id));
```

For each generated visual-owner row:

```ts
const ownerCrops = row.ownerCrops.filter((crop) =>
	crop.requiredBackgroundIds.every((id) => activeBackgroundIds.has(id))
);
```

Omit rows with zero active complete crops so those live visuals stay unchanged. Otherwise expose:

```ts
{
	sourceType: row.sourceType,
	sourceId: row.sourceId,
	visual: { mode: 'fallback-only', ownerCrops }
}
```

Assert `wildwood-north-climb-east-bank` keeps both alternative owner crops in PR 1.

- [ ] **Step 4: Copy exact approved bytes and add scoped LFS**

Copy the 16 PR-1 filenames from `artifacts/meadow-entry/hpa-399/exports/` to `public/game/assets/regions/meadow-entry/` without re-encoding.

Add:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Add cheap runtime asset integrity tests**

For every active record, resolve its approved HPA-496 export, assert file existence, inspect dimensions with Sharp, and compute SHA-256 with Node crypto. Require exact approved dimensions/hash.

- [ ] **Step 6: Make the combined preload list structural**

In `assets.ts`:

```ts
export interface RegionalBackgroundPreloadAsset {
	readonly key: string;
	readonly path: string;
}
```

Keep the two Sundrop entries with their extra approval metadata in:

```ts
export const sundropRegionalBackgroundAssets = [/* existing two records */] as const;
```

Export:

```ts
export const regionalBackgroundAssets: readonly RegionalBackgroundPreloadAsset[] = [
	...sundropRegionalBackgroundAssets,
	...meadowEntryRuntimeBackgroundAssets
];
```

`BootScene` consumes only `{ key, path }`. Sundrop hash/fingerprint consumers use the Sundrop constant directly.

- [ ] **Step 7: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/assets.test.ts
bun run world:generate:meadow-entry-runtime --check
bun run check
git add .gitattributes src/lib/game/content public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): activate crossroads and wildwood backgrounds"
```

---

### Task 7: Compose and Render the PR-1 Slice

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: active PR-1 backgrounds and ownership assignments.
- Produces: final PR-1 map with 2 HPA-398 + 16 HPA-496 background descriptors.

- [ ] **Step 1: Write failing composition tests**

```ts
expect(meadowEntryMap.backgroundImages).toHaveLength(18);
```

Assert all 16 active HPA-496 IDs exist once and both HPA-398 descriptors have `drawOrder: 1000`.

- [ ] **Step 2: Compose after `mergeRegions(...)` only**

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);
```

Split `activeMeadowEntryRuntimeVisualOwners` by `sourceType` and call the same `applyVisualOwnership(...)` for blockers, decor, and fences. Use `rejectExisting: true` for blockers so HPA-406 cannot overwrite HPA-398 ownership.

Validate final background and visual-owner references. Do not edit region fragments for baked-art registration.

- [ ] **Step 3: Write renderer tests before changing call sites**

Prove:

1. draw order affects depth;
2. missing foreground leaves valid base successful;
3. base+foreground ownership remains live with base only;
4. base+foreground ownership suppresses when one crop has both planes;
5. multi-crop ownership suppresses when Wildwood alone is complete;
6. the same source suppresses when east-boundary alone is complete;
7. live fallback returns only when no owner crop is complete;
8. disabled regional backgrounds restore all owned visuals.

- [ ] **Step 4: Converge all rendering on `shouldRenderOwnedVisual(...)`**

Use:

```ts
.setDepth(getMapBackgroundDepth(background));
```

Pass the final `successfulBackgroundIds` into blocker/decor/fence render methods and gate each visual through:

```ts
shouldRenderOwnedVisual(item.visual, successfulBackgroundIds)
```

Remove `shouldRenderBlockerVisual` after all call sites/tests migrate; do not leave two equivalent semantics.

Collision remains unconditional.

- [ ] **Step 5: Extend existing diagnostics minimally**

Add only:

```ts
selectedFallbackDecorIds: string[];
selectedFallbackFenceIds: string[];
```

using the same final success set.

- [ ] **Step 6: Put mechanical failures in e2e**

Extend current regional-background e2e to cover:

- PR-1 preload count `18` including HPA-398;
- disabled mode loads zero regional backgrounds;
- one missing-base case;
- one missing-foreground case;
- one alternative-owner case;
- blocker/decor/fence selected fallback IDs.

Do not repeat those failure injections in manual acceptance.

- [ ] **Step 7: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
bun run world:generate:meadow-entry-runtime --check
bun run check
bun run lint
bun run build
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): render meadow baked backgrounds"
```

---

### Task 8: Complete PR-1 Controller and Packaged Acceptance

**Files:**
- Update: PR 1 description unless acceptance finds an owner-local defect.

- [ ] **Step 1: Walk Crossroads and all connector mouths**

```text
Sundrop Village
→ Crossroads
→ Coast connector mouth → Crossroads
→ Mistfen connector mouth → Crossroads
→ Silverpine connector mouth → Crossroads
→ Wildwood connector mouth
```

Cross every changed mouth both ways.

- [ ] **Step 2: Exercise the real multi-crop route**

Continue into Wildwood through the forest lane/north climb and inspect the bank visuals covered by Wildwood plus `outer-boundary-east-forest-lane`.

Require:

```text
no duplicated live bank/hedge
no invisible collision
no transparent seam/hole
correct foreground occlusion where present
```

- [ ] **Step 3: Save/reload once and run packaged Tauri**

Save at one outdoor checkpoint, reload, and continue. Run:

```bash
bun run build:tauri
bun run tauri build
```

Record the native platform used.

- [ ] **Step 4: Run full PR-1 gates**

```bash
bun run world:generate:meadow-entry-runtime --check
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

Record the texture-preflight result and approximate normal load/steady-state observation in the PR description. Do not create a custom evidence schema.

---

### Task 9: Activate the Remaining Six Textures in PR 2

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime.test.ts`
- Add: 6 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify only final count expectations in existing map/scene/e2e tests.

**Interfaces:**
- Consumes: unchanged generated full data from PR 1.
- Produces: all 22 HPA-496 backgrounds active.

- [ ] **Step 1: Add the final active crop IDs**

Append:

```ts
'tidewatch-coast',
'mistfen',
'silverpine'
```

to `MEADOW_ENTRY_ACTIVE_CROP_IDS`.

- [ ] **Step 2: Prove ownership generation is unchanged**

```bash
bun run world:generate:meadow-entry-runtime --check
git diff --exit-code -- src/lib/game/content/generated/meadow-entry-runtime.ts
```

- [ ] **Step 3: Copy the six exact HPA-496 PNGs**

Copy the six PR-2 files to `public/game/assets/regions/meadow-entry/` without re-encoding.

- [ ] **Step 4: Update final counts**

```ts
expect(meadowEntryRuntimeBackgrounds).toHaveLength(22);
expect(meadowEntryMap.backgroundImages).toHaveLength(24);
```

Assert every generated row with at least one complete active owner crop is now exposed by `activeMeadowEntryRuntimeVisualOwners`.

- [ ] **Step 5: Run focused gates and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-generator.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
bun run world:generate:meadow-entry-runtime --check
bun run check
bun run lint
bun run build
bun run build:tauri
git add src/lib/game/content/backgrounds/meadow-entry-runtime* \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  public/game/assets/regions/meadow-entry \
  tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): activate remaining meadow backgrounds"
```

---

### Task 10: Finish Outdoor Acceptance

**Files:**
- Update: PR 2 description unless a concrete defect requires an owner-local fix.

- [ ] **Step 1: Walk one continuous route**

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

Cross each connector mouth in both directions.

- [ ] **Step 2: Exercise representative live gameplay**

Per destination, use one existing route/reward/encounter/discovery. Confirm live NPCs, pickups, encounters, gates, transitions, collision, and minimap state remain authoritative.

- [ ] **Step 3: Save/reload once**

Save at one representative checkpoint, reload, and continue. Confirm player position and persistent exploration/reward state remain valid.

- [ ] **Step 4: Record lightweight packaged-runtime observations**

Record:

```text
reference platform
approximate initial outdoor load time
one steady-state frame-time/FPS observation
whether any texture/context warning occurred
```

No dashboard or load subsystem is added.

- [ ] **Step 5: Run final gates**

```bash
bun run world:generate:meadow-entry-runtime --check
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

- [ ] **Step 6: Final PR description**

Record:

- player-facing outdoor result;
- HPA-399/HPA-496 frozen inputs consumed;
- geometry/art workflows intentionally skipped;
- generated ownership unchanged from PR 1;
- continuous controller route result;
- save/reload result;
- approximate load/frame observation;
- outdoor acceptance completed inside HPA-406.

---

## Self-Review

### Spec coverage

- Texture viability: Task 1.
- Deletion-first cleanup: Task 2.
- Draw order: Task 3.
- OR-of-crops / AND-of-planes ownership and one generic applier: Task 4.
- Reproducible final 22-export + ownership projection: Task 5.
- Hard Wildwood/east-boundary case in PR 1: Tasks 5-8.
- Public/LFS assets and preload typing: Tasks 6 and 9.
- Existing composition/renderer seam: Task 7.
- Mechanical missing-plane regressions: Task 7 automated tests only.
- Final controller acceptance: Task 10.

### Ownership invariant

```text
render live fallback
iff
NO owner crop has ALL of its required background IDs rendered
```

This preserves HPA-398's one-crop base/base+foreground behavior and correctly handles HPA-496 overlapping crop alternatives.

### Generation invariant

```text
tools/generate-meadow-entry-runtime.ts
  → src/lib/game/content/generated/meadow-entry-runtime.ts
```

PR 2 changes activation/public PNGs only. `--check` must remain byte-clean.

### Placeholder/type check

There is no `TBD`, `TODO`, temporary print/paste branch, hand-maintained generated owner table, duplicate visibility helper, or unnamed future framework. Stable names are:

```text
MapBackgroundImage.drawOrder
getMapBackgroundDepth(background)
MapVisualOwnerCrop
MapVisualOwnership
shouldRenderOwnedVisual(...)
applyVisualOwnership(...)
collectMeadowEntryRuntimeData()
renderMeadowEntryRuntimeData(...)
MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS
MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
MEADOW_ENTRY_ACTIVE_CROP_IDS
meadowEntryRuntimeBackgroundImages
meadowEntryRuntimeBackgroundAssets
activeMeadowEntryRuntimeVisualOwners
```
