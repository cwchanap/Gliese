# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Run one measured texture-safety preflight, then use one direct Meadow Entry runtime registry, add `drawOrder` to the existing background descriptor, extend the existing fallback visual contract from blockers to decor/fences, and keep `WorldScene` background planes independent. Delete the zero-consumer generic adapter and full frozen-art every-PR CI rather than extending them.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`: approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, overlap ownership, bake/fallback ownership, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, bytes, hashes, planes, and approved PNG pixels are frozen.
- HPA-398 Sundrop Village background and multi-owner fallback behavior remain unchanged except for explicit `drawOrder: 1000`.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and save semantics remain live and authoritative.
- Base and foreground remain independent; missing foreground never invalidates a good base.
- Do not add story catalogs/fingerprints, packet schemas, generic art adapters, runtime-package schemas, dependency graphs, streaming/residency managers, load-strategy enums, or new approval layers.
- Fix source/art defects at HPA-399/HPA-496 ownership rather than compensating in runtime.
- Normal PR CI must not rerun the full frozen HPA-496 production-art package.

## Delivery Shape

### Implementation PR 1 — Crossroads and connector proof

Activate these 13 HPA-496 textures:

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
```

PR 1 also builds the reusable runtime seam.

### Implementation PR 2 — Remaining regions and final acceptance

Append:

```text
tidewatch-coast-base.png
tidewatch-coast-foreground.png
mistfen-base.png
mistfen-foreground.png
silverpine-base.png
silverpine-foreground.png
wildwood-base.png
wildwood-foreground.png
outer-boundary-east-forest-lane-base.png
```

PR 2 should be mostly data activation plus final acceptance.

---

### Task 1: Run the Texture-Safety Preflight

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports`.
- Produces: `bun run world:probe:meadow-entry-textures` and a hard `proceed`/`stop` result.

- [ ] **Step 1: Add the command**

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

- [ ] **Step 2: Build the exact 22-item probe inventory**

```ts
import { chromium } from '@playwright/test';
import { meadowEntryArtPackageApproval } from '../src/lib/game/content/approvals/meadow-entry-art-package';

const approved = meadowEntryArtPackageApproval.exports.map((asset) => ({
	id: `${asset.cropId}:${asset.plane}`,
	path: asset.path,
	width: asset.width,
	height: asset.height
}));

if (approved.length !== 22) {
	throw new Error(`Expected 22 approved exports, found ${approved.length}`);
}
```

Serve only the approved artifact paths with a small Bun HTTP server. In Chromium, create WebGL2 or WebGL1, query `MAX_TEXTURE_SIZE`, fetch/decode every PNG, upload with `texImage2D`, and retain every successful `WebGLTexture` until all 22 attempts finish.

Collect:

```ts
{
	maxTextureSize,
	results: [{ id, width, height, status, ms, error? }],
	contextLost,
	totalMs,
	environment: { browser, platform },
	decision: 'proceed' | 'stop'
}
```

Set `stop` for an over-limit dimension, failed upload, context loss, or aggregate allocation failure.

- [ ] **Step 3: Run the hard gate**

```bash
bun run world:probe:meadow-entry-textures
```

Expected for normal continuation:

```text
22/22 textures uploaded
contextLost=false
decision=proceed
```

Record `MAX_TEXTURE_SIZE`, failures, aggregate behavior, approximate timing, and environment in PR 1's description.

If `stop`, do not continue to Task 2: route individual texture/crop failure to HPA-399/HPA-496 or create one measured load-management ticket for aggregate residency failure.

- [ ] **Step 4: Commit**

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
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: no live `art:map-package` surface and no full frozen production-package check on every PR.

- [ ] **Step 1: Confirm no active consumer**

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- .
```

Classify historical design/plan prose as documentation, not consumers. If a live runtime/workflow import or invocation exists outside the adapter's own command/test/spec surface, stop deletion and document that concrete consumer.

- [ ] **Step 2: Delete the zero-consumer files and script**

Delete the five listed files and remove:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

Do not rewrite historical HPA-399/HPA-496 plans.

- [ ] **Step 3: Remove production-art checks from normal PR CI**

Delete the dedicated `meadow-entry-art-package` job and remove the `build-and-lint` step that runs:

```bash
bun run art:storage:meadow-entry
```

Keep finalize/export/proof/approve/validate/storage commands in `package.json` for manual/local production-art repair.

- [ ] **Step 4: Verify cleanup**

```bash
bun run check
bun run lint
git grep -n 'art:map-package' -- package.json .github src tools art-map-adapters || true
```

Expected: check/lint pass; no live command/implementation remains.

- [ ] **Step 5: Commit**

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

- [ ] **Step 1: Write failing order/depth tests**

Update background fixtures with `drawOrder` and assert:

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
```

Add validation failures for negative, non-integer, `> 1000`, and duplicate `(plane, drawOrder)` descriptors.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts src/lib/game/content/maps/regions/village-layered.test.ts
```

- [ ] **Step 3: Implement the minimal model**

```ts
export interface MapBackgroundImage extends MapRect {
	textureKey: string;
	plane: MapBackgroundPlane;
	drawOrder: number;
}
```

In `background-ownership.ts`:

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Extend `validateMapBackgroundOwnership(...)` with order validation while retaining existing ID/owner validation.

- [ ] **Step 4: Thread order through the current helper**

Add `drawOrder` to `createLayeredRegionBackground(...)` input and return value. Set both current village calls to:

```ts
drawOrder: 1_000
```

Update proof/test fixtures explicitly; do not add a default.

- [ ] **Step 5: Verify green**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
bun run check
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/content/maps tools/render-sundrop-village-obstacle-proof.ts
git commit -m "feat(hpa-406): order regional backgrounds"
```

---

### Task 4: Add the PR-1 Direct Runtime Registry and Asset Copies

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Create: `src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts`
- Add: 13 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: `.gitattributes`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`

**Interfaces:**
- Produces: `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`, `meadowEntryRuntimeBackgroundImages`, and `meadowEntryRuntimeBackgroundAssets`.
- Runtime module never imports HPA-399/HPA-496 authoring contracts; tests may.

- [ ] **Step 1: Write the failing exact-registry test**

Define:

```ts
export type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
	cropId: string;
	path: string;
};
```

Use the exact PR-1 key set:

```ts
const PR1_KEYS = [
	'sundrop-village-underlay:base',
	'village-crossroads-connector:base',
	'village-crossroads-connector:foreground',
	'crossroads-coast-connector:base',
	'crossroads-coast-connector:foreground',
	'crossroads-mistfen-connector:base',
	'crossroads-mistfen-connector:foreground',
	'crossroads-silverpine-connector:base',
	'crossroads-silverpine-connector:foreground',
	'crossroads-wildwood-connector:base',
	'crossroads-wildwood-connector:foreground',
	'crossroads:base',
	'crossroads:foreground'
] as const;
```

For every runtime record, find the matching `meadowEntryArtPackageApproval.exports` entry and `MEADOW_ENTRY_APPROVED_CROPS` crop and assert texture key, draw order, plane, dimensions, center coordinates, stable ID, and public filename match exactly.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
```

- [ ] **Step 3: Extract approved rows instead of transcribing from memory**

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['sundrop-village-underlay','village-crossroads-connector','crossroads-coast-connector','crossroads-mistfen-connector','crossroads-silverpine-connector','crossroads-wildwood-connector','crossroads']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Author the 13 exact records from this output. Export projections from the same records:

```ts
export const meadowEntryRuntimeBackgroundImages = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ cropId: _cropId, path: _path, ...background }) => background
);

export const meadowEntryRuntimeBackgroundAssets = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ textureKey, path }) => ({ key: textureKey, path })
);
```

- [ ] **Step 4: Copy exact approved bytes to the runtime path**

Copy the 13 listed files without re-encoding from:

```text
artifacts/meadow-entry/hpa-399/exports/
```

to:

```text
public/game/assets/regions/meadow-entry/
```

Add:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Add the cheap runtime asset test**

For every active runtime record:

```ts
const metadata = await sharp(filePath).metadata();
expect({ width: metadata.width, height: metadata.height }).toEqual({
	width: approved.width,
	height: approved.height
});
expect(sha256(await Bun.file(filePath).arrayBuffer())).toBe(approved.sha256);
```

Also assert the runtime file exists. This is the normal-CI replacement for the full production-art job.

- [ ] **Step 6: Register through the existing asset seam**

Append `...meadowEntryRuntimeBackgroundAssets` to `regionalBackgroundAssets` after the existing two Sundrop entries.

Update `assets.test.ts` so it still asserts the first two entries exactly match the HPA-398 approved Sundrop metadata, then asserts the remaining entries equal `meadowEntryRuntimeBackgroundAssets`. Do not require the new records to carry HPA-398-only approval fields.

- [ ] **Step 7: Verify**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
```

- [ ] **Step 8: Commit**

```bash
git add .gitattributes src/lib/game/content public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): register crossroads background assets"
```

---

### Task 5: Generalize Visual Ownership and Add the Active-Crop Manifest

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`

**Interfaces:**
- Produces: `MapVisualOwnership`, `shouldRenderOwnedVisual(...)`, `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`, and `applyMeadowEntryRuntimeOwnership(...)`.

- [ ] **Step 1: Write failing generic ownership tests**

Assert:

```ts
expect(shouldRenderOwnedVisual(undefined, new Set())).toBe(true);
expect(shouldRenderOwnedVisual({ mode: 'always' }, new Set())).toBe(true);
expect(
	shouldRenderOwnedVisual(
		{ mode: 'fallback-only', ownerBackgroundIds: ['base'] },
		new Set(['base'])
	)
).toBe(false);
expect(
	shouldRenderOwnedVisual(
		{ mode: 'fallback-only', ownerBackgroundIds: ['base', 'foreground'] },
		new Set(['base'])
	)
).toBe(true);
```

Extend ownership validation fixtures to cover blocker, decor, and fence empty/duplicate/missing owner IDs.

- [ ] **Step 2: Implement the shared type/helper**

```ts
export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };
```

Use it on `MapBlocker`, `MapDecorBase`, and a new `MapFenceSegment extends MapRect` interface.

Implement once:

```ts
export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}
```

Preserve HPA-398 multi-owner semantics exactly.

- [ ] **Step 3: Verify shared ownership green**

```bash
bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
```

- [ ] **Step 4: Derive expected ownership in the test only**

In `meadow-entry-runtime-ownership.test.ts`:

1. read `MEADOW_ENTRY_BAKE_OWNERSHIP` and approved crops;
2. resolve source bounds with `collectMeadowEntrySourceCatalog()`;
3. consider only `existing-blocker-fallback`, `extend-decor-fallback`, and `extend-fence-fallback`;
4. exclude blockers already owned by `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`;
5. expand source bounds using the frozen disposition margins;
6. choose the fully containing approved base crop with highest draw order;
7. **keep the record only when that owner crop is active in `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`;**
8. map `base-static` to the base background ID;
9. map `base-and-foreground` to base + foreground IDs and fail if the active crop has no foreground.

This active-crop filter is the PR sequencing rule: PR 1 expects only Crossroads/connector-owned entries; the same test automatically expands when PR 2 activates the remaining crops.

Expected shape:

```ts
type ExpectedOwner = {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerBackgroundIds: readonly string[];
};
```

- [ ] **Step 5: Author the explicit runtime manifest until the derivation test is green**

```ts
export interface MeadowEntryRuntimeVisualOwner {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerBackgroundIds: readonly string[];
}

export const MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS: readonly MeadowEntryRuntimeVisualOwner[] = [
	/* populate exact records from the failing test diff before committing */
];
```

The committed file must contain every exact active record and no placeholder comment.

Implement `applyMeadowEntryRuntimeOwnership(...)` as a pure helper that clones changed elements, rejects missing IDs, and rejects attempts to overwrite an existing visual contract.

- [ ] **Step 6: Verify ownership**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
bun run check
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds
git commit -m "feat(hpa-406): share baked visual fallback ownership"
```

---

### Task 6: Compose and Render the Crossroads/Connector Slice

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes the direct registry and ownership helpers from Tasks 4-5.
- Produces PR-1 `meadowEntryMap` with 13 HPA-496 descriptors + 2 HPA-398 descriptors.

- [ ] **Step 1: Write failing map-composition tests**

Assert:

```ts
expect(meadowEntryMap.backgroundImages).toHaveLength(15);
```

Assert every PR-1 runtime background ID exists once and both Sundrop IDs still exist at `drawOrder: 1000`.

Use existing map invariants to confirm integration does not alter transition/encounter/reward/discovery/save-owned IDs.

- [ ] **Step 2: Compose after `mergeRegions(...)`**

Keep `mergeRegions(...)` unchanged:

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);
const owned = applyMeadowEntryRuntimeOwnership({
	blockers: sundropOwnedBlockers,
	mapDecor: merged.mapDecor,
	fences: merged.fences
});
```

Validate against the final arrays, then assign `backgroundImages`, `owned.blockers`, `owned.mapDecor`, and `owned.fences` to `meadowEntryMap`.

Do not edit the six region fragment files to register baked art.

- [ ] **Step 3: Write failing renderer tests**

Prove:

1. draw order controls overlapping depth;
2. base and foreground render independently;
3. missing foreground keeps a valid base successful;
4. `[base, foreground]` owned decor/fence returns live when only base succeeds;
5. base-only owned visual stays suppressed when base succeeds;
6. all fallback visuals return when regional backgrounds are disabled.

Do not add `blocked-by-base` behavior.

- [ ] **Step 4: Update renderer minimally**

Change:

```ts
.setDepth(getMapBackgroundDepth(background.plane));
```

to:

```ts
.setDepth(getMapBackgroundDepth(background));
```

Pass the final success set into decor/fence rendering at every relevant call site and skip visual creation when:

```ts
!shouldRenderOwnedVisual(item.visual, successfulBackgroundIds)
```

Collision remains unconditional.

- [ ] **Step 5: Extend the existing diagnostic only as needed**

Add:

```ts
selectedFallbackDecorIds: string[];
selectedFallbackFenceIds: string[];
```

Populate them from the same final success set. Do not add another diagnostic/evidence protocol.

- [ ] **Step 6: Extend existing regional-background e2e**

Assert:

- expected PR-1 regional load completion count;
- zero regional loads for `?regionalBackground=off`;
- one representative missing-base fallback;
- one representative missing-foreground fallback;
- expected blocker/decor/fence fallback IDs.

Use current hooks; do not create a new debug API.

- [ ] **Step 7: Verify PR 1 runtime**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
bun run check
bun run lint
bun run build
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): render crossroads baked backgrounds"
```

---

### Task 7: Complete PR-1 Acceptance

**Files:**
- Update PR description only unless acceptance reveals an owner-local defect.

- [ ] **Step 1: Walk the connector proof route**

```text
Sundrop Village
→ Village/Crossroads connector
→ Crossroads
→ Coast connector mouth → Crossroads
→ Mistfen connector mouth → Crossroads
→ Silverpine connector mouth → Crossroads
→ Wildwood connector mouth → Crossroads
→ Village/Crossroads connector
→ Sundrop Village
```

Cross every changed mouth both directions. Check seams, double-darkening, transparent holes, duplicate live/baked visuals, and collision alignment.

- [ ] **Step 2: Exercise representative fallback/save states**

Verify enabled, disabled, one missing/invalid base, one missing foreground, collision debug overlay, and one save/reload.

- [ ] **Step 3: Run packaged Tauri and record observations**

```bash
bun run build:tauri
```

Record texture-preflight environment/result, approximate before/after regional-load observation, and one steady-state frame observation. Do not invent a hard performance budget.

- [ ] **Step 4: Run final PR-1 checks**

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

Run `bun run art:validate:meadow-entry` only if the production HPA-496 package itself changed.

- [ ] **Step 5: Update PR 1 description**

Record the player-facing result, HPA-399/HPA-496 inputs, preserved ownership, frozen-integration/skipped workflows, preflight result, walkthrough, and validation commands.

Merge PR 1 before starting PR 2.

---

### Task 8: Append the Remaining Nine Region Textures in PR 2

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`
- Add: remaining 9 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: affected expected counts in map/scene/e2e tests

**Interfaces:**
- Extends runtime registry from 13 to all 22 HPA-496 entries.
- Final map has 24 descriptors including the 2 HPA-398 Sundrop descriptors.

- [ ] **Step 1: Change registry expectation to the full approval**

```ts
const expected = meadowEntryArtPackageApproval.exports.map(
	(asset) => `${asset.cropId}:${asset.plane}`
);

expect(runtimeKeys).toEqual(expected);
expect(MEADOW_ENTRY_RUNTIME_BACKGROUNDS).toHaveLength(22);
```

Keep every per-record geometry/path/order assertion from Task 4.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
```

- [ ] **Step 3: Extract and append exact remaining rows**

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['tidewatch-coast','mistfen','silverpine','wildwood','outer-boundary-east-forest-lane']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Append the exact nine records in approved draw-order order and copy the nine unchanged approved PNGs to the existing public runtime directory.

- [ ] **Step 4: Let the same ownership test expand to the newly active crops**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
```

Because expected ownership is filtered by active crop IDs, the test now exposes the additional region-owned blocker/decor/fence records. Add those exact entries to `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`; do not change the derivation algorithm.

- [ ] **Step 5: Update counts, not architecture**

Update map background count from 15 to 24 and regional-load expectations from 13 HPA-496 runtime entries to 22. Renderer code should not otherwise change.

If a new renderer abstraction appears necessary, stop and review PR 1's seam first.

- [ ] **Step 6: Verify PR 2 integration**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bunx playwright test tests/e2e/game.e2e.ts --grep "regional background"
bun run check
bun run lint
bun run build
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): integrate remaining meadow backgrounds"
```

---

### Task 9: Finish Outdoor Acceptance in PR 2

**Files:**
- No required new framework/file.
- Modify only the existing owner when acceptance reveals a concrete defect.
- Update PR description.

- [ ] **Step 1: Run one continuous outdoor route**

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

For every destination, cross the connector both ways, walk one optional route, exercise one representative existing reward/discovery/encounter, and confirm collision aligns with art.

- [ ] **Step 2: Verify final fallback behavior**

Check one missing base and one missing foreground. Missing foreground must leave the valid base rendered while any visual requiring that foreground returns live. Collision must be unchanged. Also verify regional-background-disabled mode remains readable.

- [ ] **Step 3: Verify save/reload**

Save at one representative outdoor checkpoint, reload, and confirm player position plus reward/discovery/encounter state are unchanged by background integration.

- [ ] **Step 4: Run complete validation**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

Rerun `bun run world:probe:meadow-entry-textures` only if approved runtime PNG bytes changed during a real source-art repair; otherwise reuse the original preflight result.

- [ ] **Step 5: Record completion in PR 2 description**

Record all 22 approved exports integrated, skipped geometry/art production, continuous walkthrough, fallback/save behavior, packaged Tauri result, approximate load/frame observation, and any source/art defect repaired at its owner.

When PR 2 merges, HPA-406 owns final outdoor acceptance; do not create a separate whole-map certification ticket.

---

## Plan Self-Review

### Spec coverage

- Frozen-integration routing: Tasks 1, 7, 9.
- Measured texture gate without speculative loading: Task 1.
- Deletion-first adapter/CI cleanup: Task 2.
- Minimal draw order: Task 3.
- Direct approved runtime registry and cheap runtime asset verification: Task 4.
- Shared blocker/decor/fence fallback preserving HPA-398: Task 5.
- Post-merge composition and independent planes: Task 6.
- Crossroads/connectors proof before remaining regions: Tasks 6-7.
- Remaining regions as append-only activation: Task 8.
- Controller/save/Tauri final acceptance: Task 9.

### Sequencing check

PR 1's ownership manifest is intentionally filtered to active owner crops. PR 2 activates additional crops, causing the same test-only HPA-399 derivation to expand the expected manifest. No PR-1 runtime object references a background ID that is deferred to PR 2.

### Type consistency

The plan uses one set of names throughout:

```text
MapBackgroundImage.drawOrder
getMapBackgroundDepth(background)
MapVisualOwnership
shouldRenderOwnedVisual(...)
MEADOW_ENTRY_RUNTIME_BACKGROUNDS
meadowEntryRuntimeBackgroundImages
meadowEntryRuntimeBackgroundAssets
MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
applyMeadowEntryRuntimeOwnership(...)
```

No dependency graph, runtime package, or load-plan type appears later in the plan.