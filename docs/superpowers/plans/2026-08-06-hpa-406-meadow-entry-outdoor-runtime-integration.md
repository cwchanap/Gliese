# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Run one measured texture-safety preflight, use one direct Meadow Entry runtime registry, add `drawOrder` to the existing background descriptor, extend the proven fallback visual contract from blockers to decor/fences, and keep `WorldScene` base/foreground planes independent. Delete the zero-consumer generic adapter and full frozen-art every-PR CI rather than extending them.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`: approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, overlap ownership, bake/fallback ownership, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, bytes, hashes, planes, and approved PNG pixels are frozen.
- HPA-398 Sundrop Village backgrounds and multi-owner fallback behavior remain unchanged except for explicit `drawOrder: 1000`.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and save semantics remain live and authoritative.
- Base and foreground remain independent; a missing foreground never invalidates a good base.
- Do not add story catalogs/fingerprints, packet schemas, generic art adapters, runtime-package schemas, dependency graphs, streaming/residency managers, load-strategy enums, or new approval layers.
- Fix source/art defects at HPA-399/HPA-496 ownership instead of compensating in runtime.
- Normal PR CI must not rerun the full frozen HPA-496 production-art package.

## Delivery Shape

PR 1 activates the reusable seam plus these 13 HPA-496 textures:

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

PR 2 appends the remaining 9:

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

---

### Task 1: Run the Texture-Safety Preflight

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports`.
- Produces: `bun run world:probe:meadow-entry-textures` and `decision: 'proceed' | 'stop'`.

- [ ] **Step 1: Add the command**

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

- [ ] **Step 2: Build the exact probe inventory**

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

Serve only the approved artifact paths with Bun. In Chromium create WebGL2 or WebGL1, query `MAX_TEXTURE_SIZE`, fetch/decode every PNG, upload it with `texImage2D`, and retain every successful `WebGLTexture` until all 22 attempts finish.

Return:

```ts
{
	maxTextureSize,
	results: [{ id, width, height, status, ms, error? }],
	contextLost,
	totalMs,
	environment: { browser, platform },
	decision
}
```

Set `stop` for an over-limit dimension, failed upload, context loss, or aggregate allocation failure.

- [ ] **Step 3: Run the hard gate**

```bash
bun run world:probe:meadow-entry-textures
```

Expected when viable:

```text
22/22 textures uploaded
contextLost=false
decision=proceed
```

Record `MAX_TEXTURE_SIZE`, failures if any, aggregate behavior, approximate timing, and environment in PR 1's description.

If `stop`, do not continue. Route individual texture/crop failure to HPA-399/HPA-496 or create one measured load-management ticket for aggregate residency failure.

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

- [ ] **Step 1: Confirm no active consumer**

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- .
```

Historical design/plan prose is documentation, not a consumer. If a live runtime/workflow import or invocation exists outside the adapter's own command/test/spec surface, stop deletion and document that concrete consumer.

- [ ] **Step 2: Delete the zero-consumer surface**

Delete the five listed files and remove:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

Do not rewrite historical HPA-399/HPA-496 plans.

- [ ] **Step 3: Remove production-art checks from normal PR CI**

Delete the dedicated `meadow-entry-art-package` job and the `build-and-lint` step running:

```bash
bun run art:storage:meadow-entry
```

Keep finalize/export/proof/approve/validate/storage commands for manual/local production-art repair.

- [ ] **Step 4: Verify and commit**

```bash
bun run check
bun run lint
git grep -n 'art:map-package' -- package.json .github src tools art-map-adapters || true
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
- Produces: `MapBackgroundImage.drawOrder` and `getMapBackgroundDepth(background)`.

- [ ] **Step 1: Write failing order/depth tests**

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

```ts
const BACKGROUND_ORDER_SCALE = 10_000;

export function getMapBackgroundDepth(
	background: Pick<MapBackgroundImage, 'plane' | 'drawOrder'>
): number {
	return MAP_BACKGROUND_DEPTHS[background.plane] + background.drawOrder / BACKGROUND_ORDER_SCALE;
}
```

Extend `validateMapBackgroundOwnership(...)` with order validation while keeping descriptor-ID and owner-ID checks.

- [ ] **Step 4: Thread order through the existing helper**

Add `drawOrder` to `createLayeredRegionBackground(...)` input/return and set both current Sundrop calls to:

```ts
drawOrder: 1_000
```

Update proof/test fixtures explicitly; do not add a default.

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
- Produces: `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`, `meadowEntryRuntimeBackgroundImages`, `meadowEntryRuntimeBackgroundAssets`.
- Runtime module does not import HPA-399/HPA-496 authoring contracts; tests may.

- [ ] **Step 1: Write the failing exact-registry test**

Define:

```ts
export type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
	cropId: string;
	path: string;
};
```

The PR-1 key set is exactly:

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

For each runtime record, compare against `meadowEntryArtPackageApproval.exports` and `MEADOW_ENTRY_APPROVED_CROPS`: texture key, plane, draw order, dimensions, center coordinates, stable `${textureKey}-image` ID, and `/game/assets/regions/meadow-entry/<approved filename>` path.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
```

- [ ] **Step 3: Extract exact approved rows**

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['sundrop-village-underlay','village-crossroads-connector','crossroads-coast-connector','crossroads-mistfen-connector','crossroads-silverpine-connector','crossroads-wildwood-connector','crossroads']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Author the 13 runtime records from that output. Export projections from the same records:

```ts
export const meadowEntryRuntimeBackgroundImages = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ cropId: _cropId, path: _path, ...background }) => background
);

export const meadowEntryRuntimeBackgroundAssets = MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map(
	({ textureKey, path }) => ({ key: textureKey, path })
);
```

- [ ] **Step 4: Copy exact bytes and add scoped LFS**

Copy the 13 listed files without re-encoding from `artifacts/meadow-entry/hpa-399/exports/` to `public/game/assets/regions/meadow-entry/`.

Add:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Add cheap runtime asset integrity tests**

Use Sharp for dimensions and Node crypto for hashing:

```ts
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const bytes = Buffer.from(await Bun.file(filePath).arrayBuffer());
const digest = createHash('sha256').update(bytes).digest('hex');
const metadata = await sharp(bytes).metadata();

expect({ width: metadata.width, height: metadata.height }).toEqual({
	width: approved.width,
	height: approved.height
});
expect(digest).toBe(approved.sha256);
```

Also assert each runtime file exists.

- [ ] **Step 6: Register through `regionalBackgroundAssets`**

Append `...meadowEntryRuntimeBackgroundAssets` after the existing two Sundrop entries.

Update `assets.test.ts` to assert:

```ts
expect(regionalBackgroundAssets.slice(0, 2)).toEqual(existingApprovedSundropEntries);
expect(regionalBackgroundAssets.slice(2)).toEqual(meadowEntryRuntimeBackgroundAssets);
```

The HPA-496 runtime records do not need HPA-398-only approval metadata.

- [ ] **Step 7: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
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
- Produces: `MapVisualOwnership`, `shouldRenderOwnedVisual(...)`, `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`, `applyMeadowEntryRuntimeOwnership(...)`.

- [ ] **Step 1: Write failing shared-ownership tests**

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

Extend validation fixtures to prove empty, duplicate, and missing owner IDs fail for blocker, decor, and fence visual contracts.

- [ ] **Step 2: Implement one shared type/helper**

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

Use `MapVisualOwnership` on `MapBlocker`, `MapDecorBase`, and a `MapFenceSegment extends MapRect` interface. Preserve HPA-398 multi-owner semantics.

- [ ] **Step 3: Verify the shared behavior**

```bash
bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
```

- [ ] **Step 4: Derive the expected HPA-406 manifest in tests only**

In `meadow-entry-runtime-ownership.test.ts`:

1. read `MEADOW_ENTRY_BAKE_OWNERSHIP` and approved crops;
2. resolve source bounds with `collectMeadowEntrySourceCatalog()`;
3. consider only `existing-blocker-fallback`, `extend-decor-fallback`, `extend-fence-fallback`;
4. exclude blockers already covered by `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`;
5. expand source bounds using frozen bake margins;
6. choose the fully containing approved base crop with highest `drawOrder`;
7. keep the record only when that owner crop is active in `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`;
8. `base-static` uses the base ID; `base-and-foreground` uses base + foreground IDs and fails when the active crop lacks foreground.

Build a sorted expected array of:

```ts
type ExpectedOwner = {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerBackgroundIds: readonly string[];
};
```

Print the expected array once while authoring, then remove the print before commit.

- [ ] **Step 5: Author the exact explicit manifest**

Create:

```ts
export interface MeadowEntryRuntimeVisualOwner {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerBackgroundIds: readonly string[];
}
```

Copy the exact sorted records produced by Step 4 into `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS` and assert deep equality with the derived expected array. The committed array must be complete for currently active owner crops.

Implement `applyMeadowEntryRuntimeOwnership(...)` as a pure helper that clones changed objects, rejects missing source IDs, and rejects attempts to overwrite an existing `visual` contract.

- [ ] **Step 6: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
bun run check
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
- Consumes: registry and ownership helpers from Tasks 4-5.
- Produces: PR-1 `meadowEntryMap` with 13 HPA-496 + 2 HPA-398 descriptors.

- [ ] **Step 1: Write failing map-composition tests**

```ts
expect(meadowEntryMap.backgroundImages).toHaveLength(15);
```

Assert every PR-1 runtime background ID exists exactly once and both Sundrop descriptors remain at `drawOrder: 1000`. Reuse existing map tests to ensure transitions, encounters, rewards/discoveries, and save-owned map IDs did not change.

- [ ] **Step 2: Compose only after `mergeRegions(...)`**

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

Validate final arrays and pass `backgroundImages`, `owned.blockers`, `owned.mapDecor`, and `owned.fences` into `meadowEntryMap`. Do not edit region fragment files for baked-art registration.

- [ ] **Step 3: Write failing renderer tests**

Prove:

1. draw order controls overlap depth;
2. base and foreground render independently;
3. missing foreground leaves valid base successful;
4. `[base, foreground]` owned decor/fence returns live when only base succeeds;
5. base-only owned visual stays suppressed when base succeeds;
6. all owned fallback visuals return when regional backgrounds are disabled.

Do not add `blocked-by-base` behavior.

- [ ] **Step 4: Update `WorldScene` minimally**

Change:

```ts
.setDepth(getMapBackgroundDepth(background.plane));
```

to:

```ts
.setDepth(getMapBackgroundDepth(background));
```

Pass the final success set into all decor/fence render calls and skip live creation when `shouldRenderOwnedVisual(item.visual, successfulBackgroundIds)` is false. Collision stays unconditional.

- [ ] **Step 5: Extend existing diagnostics only as needed**

Add:

```ts
selectedFallbackDecorIds: string[];
selectedFallbackFenceIds: string[];
```

Populate from the same final success set. Do not create another diagnostics/evidence protocol.

- [ ] **Step 6: Extend existing regional-background e2e**

Assert PR-1 enabled load count, zero loads for `?regionalBackground=off`, one representative missing-base fallback, one representative missing-foreground fallback, and expected blocker/decor/fence fallback IDs.

- [ ] **Step 7: Verify and commit**

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
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts
git commit -m "feat(hpa-406): render crossroads baked backgrounds"
```

---

### Task 7: Complete PR-1 Acceptance

**Files:**
- Update PR description unless acceptance finds an owner-local defect.

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

Cross every changed mouth both ways and check seams, double-darkening, transparent holes, duplicate live/baked visuals, and collision alignment.

- [ ] **Step 2: Exercise representative states**

Verify enabled, disabled, one missing/invalid base, one missing foreground, collision debug overlay, and one save/reload.

- [ ] **Step 3: Run packaged Tauri and final PR-1 checks**

```bash
bun run test:unit -- --run
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

Record texture-preflight result/environment, approximate regional-load observation, and one steady-state frame observation. Run `art:validate:meadow-entry` only if the production HPA-496 package itself changed.

- [ ] **Step 4: Update PR 1 description and merge**

Record player-facing outcome, HPA-399/HPA-496 inputs, preserved ownership, frozen-integration/skipped workflows, preflight, walkthrough, and validation commands. Merge PR 1 before starting PR 2.

---

### Task 8: Append the Remaining Nine Region Textures in PR 2

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`
- Add: remaining 9 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: expected map/scene/e2e counts only as required

**Interfaces:**
- Extends runtime registry from 13 to all 22 HPA-496 entries.
- Final map contains 24 descriptors including 2 HPA-398 Sundrop descriptors.

- [ ] **Step 1: Change registry expectation to full approval**

```ts
const expected = meadowEntryArtPackageApproval.exports.map(
	(asset) => `${asset.cropId}:${asset.plane}`
);
expect(runtimeKeys).toEqual(expected);
expect(MEADOW_ENTRY_RUNTIME_BACKGROUNDS).toHaveLength(22);
```

Keep every per-record geometry/path/order assertion from Task 4.

- [ ] **Step 2: Verify red, then extract exact rows**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['tidewatch-coast','mistfen','silverpine','wildwood','outer-boundary-east-forest-lane']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Append those exact nine records in approved order and copy the nine approved PNG bytes unchanged into the existing public runtime directory.

- [ ] **Step 3: Expand the explicit ownership manifest through the same test**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
```

Because the expected derivation filters by active crop IDs, it now reveals the additional region-owned blocker/decor/fence records. Copy those exact sorted records into `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`; do not alter the derivation rule.

- [ ] **Step 4: Update counts, not architecture**

Update map background count from 15 to 24 and HPA-496 runtime load expectations from 13 to 22. Renderer behavior should not otherwise change.

- [ ] **Step 5: Verify and commit**

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
git add src/lib/game/content src/lib/game/phaser tests/e2e/game.e2e.ts public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): integrate remaining meadow backgrounds"
```

---

### Task 9: Finish Outdoor Acceptance in PR 2

**Files:**
- No new framework/file required.
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

For every destination cross the connector both ways, walk one optional route, exercise one representative existing reward/discovery/encounter, and confirm collision aligns with art.

- [ ] **Step 2: Verify final fallback/save behavior**

Check one missing base and one missing foreground. Missing foreground must leave the valid base rendered while any visual requiring foreground returns live. Collision is unchanged. Verify disabled mode, then save/reload one representative outdoor checkpoint and confirm player/progression state remains correct.

- [ ] **Step 3: Run complete validation**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
git diff --check
```

Rerun the texture probe only if approved runtime PNG bytes changed during a real source-art repair; otherwise reuse PR 1's measured result.

- [ ] **Step 4: Record completion**

In PR 2 record all 22 exports integrated, skipped geometry/art production, continuous walkthrough, fallback/save behavior, Tauri result, approximate load/frame observation, and any source/art defect repaired at its owner.

When PR 2 merges, HPA-406 owns final outdoor acceptance; do not create a separate whole-map certification ticket.

---

## Plan Self-Review

### Spec coverage

- Frozen integration and measured texture gate: Task 1.
- Deletion-first adapter/CI cleanup: Task 2.
- Minimal draw order: Task 3.
- Direct approved runtime registry + cheap asset guard: Task 4.
- Shared blocker/decor/fence fallback preserving HPA-398: Task 5.
- Post-merge composition and independent planes: Task 6.
- Crossroads/connectors proof: Task 7.
- Remaining regions as append-only activation: Task 8.
- Controller/save/Tauri final acceptance: Task 9.

### Sequencing check

PR 1's ownership manifest is filtered to active owner crops. PR 2 activates more crops, causing the same HPA-399 derivation test to expand expected ownership. PR 1 therefore never references a deferred PR-2 background ID.

### Placeholder/type check

The plan contains no `TBD`, `TODO`, incomplete committed code, alternate dependency model, or unnamed follow-up framework. The implementation names remain consistent:

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
