# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Run one measured texture-safety preflight, delete superseded adapter/CI scaffolding, add `drawOrder` to the existing background descriptor, project HPA-399’s already-sealed `primaryRegionId` + disposition contract once into a full browser-safe visual-owner table, then use one direct Meadow Entry runtime registry consumed by the existing renderer. Base/foreground remain independent; PR 2 only appends assets and activates more already-sealed ownership rows.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`: approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, `primaryRegionId`, bake/fallback ownership, overlap contracts, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, bytes, hashes, planes, and approved PNG pixels are frozen.
- HPA-398 Sundrop Village backgrounds and multi-owner fallback behavior remain unchanged except for explicit `drawOrder: 1000`.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and save semantics remain live and authoritative.
- Base and foreground remain independent; a missing foreground never invalidates a good base.
- Runtime owner assignment comes from HPA-399 `primaryRegionId` + disposition. Geometry containment is validation only, never owner selection.
- The full HPA-406 visual-owner table is fixed in PR 1; PR 2 must not rewrite owner rows.
- Do not add story catalogs/fingerprints, packet schemas, generic art adapters, runtime-package schemas, dependency graphs, streaming/residency managers, load-strategy enums, or new approval layers.
- Fix source/art defects at HPA-399/HPA-496 ownership instead of compensating in runtime.
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

PR 1 also builds the complete reusable seam and the **full final ownership table**.

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

PR 2 must not change ownership assignment. Its newly registered crops only activate existing rows from PR 1.

---

## PR 1

### Task 1: Run the Texture-Safety Preflight

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports`.
- Produces: `bun run world:probe:meadow-entry-textures` and `decision: 'proceed' | 'stop'`.

- [ ] **Step 1: Add the command**

Add to `package.json`:

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

- [ ] **Step 2: Build the exact 22-item inventory**

Start `tools/probe-meadow-entry-texture-safety.ts` with:

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

Serve only those approved artifact paths with a Bun HTTP server. In Chromium:

1. create WebGL2 or WebGL1;
2. query `gl.MAX_TEXTURE_SIZE`;
3. attach a `webglcontextlost` listener;
4. fetch and `createImageBitmap(...)` each PNG;
5. create/bind one `WebGLTexture` per PNG and upload it with `texImage2D`;
6. call `gl.getError()` after each upload;
7. retain every successful texture until all 22 uploads finish;
8. delete textures only after the aggregate result is recorded.

Return/print:

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

Set `decision: 'stop'` for an over-limit dimension, upload failure, context loss, or aggregate allocation failure.

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

Record `MAX_TEXTURE_SIZE`, failures if any, aggregate behavior, approximate timing, browser, and OS in PR 1’s description.

This result is **Chromium/WebGL-only evidence**. Do not claim it proves identical Tauri WebView limits. If packaged Tauri later fails, use that measured failure for a separate load-management ticket.

If the decision is `stop`, do not continue. Route an individual texture/crop failure to HPA-399/HPA-496; route aggregate-only residency failure to one dedicated load-management ticket.

- [ ] **Step 4: Commit**

```bash
git add package.json tools/probe-meadow-entry-texture-safety.ts
git commit -m "test(hpa-406): probe meadow texture safety"
```

---

### Task 2: Delete the Superseded Adapter Without Breaking the Retained Manual Validator

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

**Interfaces:**
- Produces: no live `art:map-package` surface; retained manual Meadow Entry art validation remains runnable; normal PR CI no longer reruns the frozen production package.

- [ ] **Step 1: Confirm the adapter has no active consumer**

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- .
```

Treat historical HPA-399/HPA-495/HPA-496 design/plan prose as documentation, not consumers. If a live runtime import or invoked workflow exists outside the adapter command/test/spec surface, stop deletion and record that concrete consumer.

- [ ] **Step 2: Delete the zero-consumer files and package script**

Delete the five files above and remove from `package.json`:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

Do not rewrite historical plans.

- [ ] **Step 3: Repair the retained manual validator’s test inventory**

In `tools/meadow-entry-art-test-files.ts`, remove exactly:

```ts
'src/lib/game/content/backgrounds/art-map-package-adapter.test.ts',
```

Keep every other `MEADOW_ENTRY_TEST_FILES` entry unchanged.

- [ ] **Step 4: Remove stale live skill guidance**

In `.agents/skills/gliese-world-expansion/references/authoring.md`, change the final sentence from the adapter-specific wording to:

```text
A new map does not inherit Meadow Entry's crop contract, provenance inventory, or approval machinery. Record the concrete need and build only the smallest asset path the real map requires.
```

No new skill file or workflow is needed.

- [ ] **Step 5: Remove production-art checks from normal PR CI**

In `.github/workflows/ci.yml`:

- delete the dedicated `meadow-entry-art-package` job;
- delete the `build-and-lint` step that runs `bun run art:storage:meadow-entry`.

Keep `art:validate:meadow-entry`, `art:storage:meadow-entry`, finalize/export/proof/approve commands in `package.json` for explicit repair work.

- [ ] **Step 6: Verify the retained paths before commit**

```bash
bun run art:validate:meadow-entry
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
bun run check
bun run lint
git grep -n 'art:map-package' -- package.json .github src tools art-map-adapters || true
```

Expected:

- manual Meadow Entry production validation passes without the deleted test;
- world-expansion skill mechanical tests pass;
- check/lint pass;
- no live `art:map-package` command/implementation remains.

- [ ] **Step 7: Commit**

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
- Produces: required `MapBackgroundImage.drawOrder`; `getMapBackgroundDepth(background)`.

- [ ] **Step 1: Write failing order/depth tests**

Update background fixtures with `drawOrder` and add:

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
```

Add validation cases for:

- negative order;
- non-integer order;
- order above `1000`;
- duplicate `(plane, drawOrder)` pairs.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
```

- [ ] **Step 3: Implement the minimal descriptor/depth change**

In `maps/types.ts`:

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

Extend `validateMapBackgroundOwnership(...)` with the four order invariants while retaining descriptor-ID/owner checks.

- [ ] **Step 4: Thread order through the existing village helper**

Add `drawOrder` to `createLayeredRegionBackground(...)` input and return. Set both current HPA-398 Sundrop calls to:

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

### Task 4: Seal the Full HPA-406 Visual-Ownership Projection and Migrate to One Helper

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`

**Interfaces:**
- Produces: `MapVisualOwnership`; `shouldRenderOwnedVisual(...)`; full `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`; `selectActiveMeadowEntryRuntimeVisualOwners(...)`; `applyMeadowEntryRuntimeOwnership(...)`.
- Consumes in tests only: `MEADOW_ENTRY_BAKE_OWNERSHIP`, `MEADOW_ENTRY_APPROVED_CROPS`, `collectMeadowEntrySourceCatalog()`, `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`.

- [ ] **Step 1: Write failing tests for one shared visual helper**

Add:

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

Extend ownership validation fixtures so empty, duplicate, and missing owner IDs fail for blockers, decor, and fences.

- [ ] **Step 2: Replace the blocker-only semantic implementation**

In `maps/types.ts`:

```ts
export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };
```

Use it for `MapBlocker.visual`, `MapDecorBase.visual`, and a real `MapFenceSegment extends MapRect` interface with optional `visual`.

In `background-ownership.ts`:

```ts
export function shouldRenderOwnedVisual(
	visual: MapVisualOwnership | undefined,
	successfulBackgroundIds: ReadonlySet<string>
): boolean {
	if (!visual || visual.mode === 'always') return true;
	return !visual.ownerBackgroundIds.every((id) => successfulBackgroundIds.has(id));
}
```

Do not keep a second independent implementation. Prefer deleting `shouldRenderBlockerVisual` and updating its tests/callers in Task 6. If keeping it temporarily to keep Task 4 independently green, its body must be exactly:

```ts
return shouldRenderOwnedVisual(blocker.visual, successfulBackgroundIds);
```

and Task 6 removes the wrapper after migrating `WorldScene`.

Update `MapBackgroundOwnershipSource` / validation to include `mapDecor` and `fences` and run all three visual collections through one owner-ID validator.

- [ ] **Step 3: Define the test-only primary-region mapping**

In `meadow-entry-runtime-ownership.test.ts`:

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

Do **not** choose an owner by crop `drawOrder` or multi-containment.

- [ ] **Step 4: Derive the complete expected owner table from HPA-399**

Build maps:

```ts
const sourcesByKey = new Map(
	collectMeadowEntrySourceCatalog().map((source) => [
		`${source.ref.sourceType}:${source.ref.sourceId}`,
		source
	])
);
const cropsById = new Map(MEADOW_ENTRY_APPROVED_CROPS.map((crop) => [crop.id, crop]));
const sundropOwnedBlockerIds = new Set(
	SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map((entry) => entry.blockerId)
);
```

Keep only HPA-399 entries with runtime requirement:

```ts
new Set([
	'existing-blocker-fallback',
	'extend-decor-fallback',
	'extend-fence-fallback'
]);
```

Exclude a blocker when its ID is in `sundropOwnedBlockerIds`.

For each remaining entry:

1. resolve `ownerCropId = RUNTIME_CROP_BY_PRIMARY_REGION[entry.primaryRegionId]`;
2. fail if `ownerCropId === null`;
3. fetch that exact crop;
4. require the source catalog record to have rectangle bounds;
5. check the mapped crop contains the source expanded by the disposition margins;
6. never search another crop when containment fails;
7. use the crop’s approved `textureKeys.base` / `textureKeys.foreground` to create stable `${textureKey}-image` owner IDs.

Use this local test helper for raw bounds expansion:

```ts
function expandBounds(
	bounds: { left: number; top: number; right: number; bottom: number },
	margins: { top: number; right: number; bottom: number; left: number }
) {
	return {
		left: bounds.left - margins.left,
		top: bounds.top - margins.top,
		right: bounds.right + margins.right,
		bottom: bounds.bottom + margins.bottom
	};
}

function contains(
	container: { left: number; top: number; right: number; bottom: number },
	value: { left: number; top: number; right: number; bottom: number }
) {
	return (
		container.left <= value.left &&
		container.top <= value.top &&
		container.right >= value.right &&
		container.bottom >= value.bottom
	);
}
```

For `base-static`, assert the base-expanded bounds fit the mapped crop and emit one base owner ID. For `base-and-foreground`, assert both base-margin and foreground-margin expansions fit that same crop, require a foreground texture key, and emit base + foreground owner IDs.

Sort expected rows by `sourceType`, then `sourceId`.

Expected runtime row type:

```ts
export interface MeadowEntryRuntimeVisualOwner {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerCropId: string;
	ownerBackgroundIds: readonly string[];
}
```

- [ ] **Step 5: Author the full browser-safe table once**

Temporarily add this authoring-only branch inside the test:

```ts
if (process.env.PRINT_MEADOW_ENTRY_RUNTIME_OWNERS === '1') {
	console.log(JSON.stringify(expectedOwners, null, 2));
}
```

Run:

```bash
PRINT_MEADOW_ENTRY_RUNTIME_OWNERS=1 \
  bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
```

Copy the exact printed sorted rows into:

```ts
export const MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS:
	readonly MeadowEntryRuntimeVisualOwner[] = [/* exact printed rows in the implementation commit */];
```

Then remove the temporary print branch **before committing** and assert:

```ts
expect(MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS).toEqual(expectedOwners);
```

The committed table must contain all final HPA-406 obligations, not only PR-1-active rows. No second hash is added.

- [ ] **Step 6: Add stable activation semantics**

Implement:

```ts
export function selectActiveMeadowEntryRuntimeVisualOwners(
	owners: readonly MeadowEntryRuntimeVisualOwner[],
	backgrounds: readonly { cropId: string; id: string }[]
): readonly MeadowEntryRuntimeVisualOwner[];
```

Behavior:

1. build `activeCropIds` and `backgroundIds` from `backgrounds`;
2. skip an owner row only when `ownerCropId` is not active;
3. when its crop is active, require every `ownerBackgroundIds` value to exist or throw;
4. return rows unchanged — never rewrite `ownerCropId` or owner IDs.

Tests:

```ts
expect(selectActiveMeadowEntryRuntimeVisualOwners(fullOwners, pr1Backgrounds)).toEqual(
	fullOwners.filter((owner) => pr1CropIds.has(owner.ownerCropId))
);
```

Also remove one required foreground ID from an active crop fixture and expect the selector to throw.

- [ ] **Step 7: Add pure application**

Implement:

```ts
export function applyMeadowEntryRuntimeOwnership(
	source: {
		blockers: readonly MapBlocker[];
		mapDecor: readonly MapDecor[];
		fences: readonly MapFenceSegment[];
	},
	owners: readonly MeadowEntryRuntimeVisualOwner[]
): {
	blockers: MapBlocker[];
	mapDecor: MapDecor[];
	fences: MapFenceSegment[];
};
```

For each owner row:

- require the `sourceId` to exist in the matching collection;
- reject an existing `visual` field so HPA-398 ownership cannot be overwritten;
- clone only the modified item;
- set `{ mode: 'fallback-only', ownerBackgroundIds: [...owner.ownerBackgroundIds] }`.

- [ ] **Step 8: Verify the critical ownership gate**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
bun run check
```

Do not proceed to runtime texture registration unless the full-table equality and mapped-crop containment assertions pass.

- [ ] **Step 9: Commit**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds
git commit -m "feat(hpa-406): seal meadow visual ownership"
```

---

### Task 5: Add the PR-1 Direct Runtime Registry and Exact Asset Copies

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
- `BootScene` preload contract is only `{ key: string; path: string }`.

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

- [ ] **Step 3: Extract exact approved rows instead of transcribing them from memory**

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

Add to `.gitattributes`:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Add the cheap runtime asset-integrity test**

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

This normal unit-test coverage is the cheap PR-CI replacement for the removed full production-package job.

- [ ] **Step 6: Keep the preload type rule structural**

In `assets.ts`, document/encode the preload contract as:

```ts
type RegionalBackgroundPreloadAsset = {
	readonly key: string;
	readonly path: string;
};
```

`regionalBackgroundAssets` may remain a heterogeneous inferred array/tuple: the two existing Sundrop entries retain their extra approval fields while the HPA-496 projection remains `{ key, path }`.

Do not add fake `approvedControlFingerprint` or `approvedPngSha256` values to HPA-496 entries merely to homogenize the shape. Ensure any BootScene-facing annotation accepts `readonly RegionalBackgroundPreloadAsset[]` structurally.

Update `assets.test.ts` to keep its exact two-entry HPA-398 assertion and separately assert that the appended records equal `meadowEntryRuntimeBackgroundAssets` by `{ key, path }`.

- [ ] **Step 7: Verify active-owner selection against the new PR-1 registry**

Extend `meadow-entry-runtime-ownership.test.ts`:

```ts
const active = selectActiveMeadowEntryRuntimeVisualOwners(
	MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS,
	MEADOW_ENTRY_RUNTIME_BACKGROUNDS
);
const activeCropIds = new Set(MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map((background) => background.cropId));
expect(active).toEqual(
	MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS.filter((owner) => activeCropIds.has(owner.ownerCropId))
);
```

The full table must remain unchanged.

- [ ] **Step 8: Verify and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/assets.test.ts
bun run check
git add .gitattributes src/lib/game/content public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): register crossroads background assets"
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
- Consumes: registry and full/active ownership helpers from Tasks 4-5.
- Produces: PR-1 `meadowEntryMap` with 13 HPA-496 + 2 HPA-398 descriptors and one shared blocker/decor/fence fallback semantic.

- [ ] **Step 1: Write failing map-composition tests**

```ts
expect(meadowEntryMap.backgroundImages).toHaveLength(15);
```

Assert every PR-1 runtime background ID exists exactly once and both HPA-398 Sundrop descriptors remain at `drawOrder: 1000`. Reuse existing map tests to ensure transitions, encounters, rewards/discoveries, and save-owned map IDs did not change.

- [ ] **Step 2: Compose only after `mergeRegions(...)`**

Use:

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);
const activeRuntimeOwners = selectActiveMeadowEntryRuntimeVisualOwners(
	MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS,
	MEADOW_ENTRY_RUNTIME_BACKGROUNDS
);
const owned = applyMeadowEntryRuntimeOwnership(
	{
		blockers: sundropOwnedBlockers,
		mapDecor: merged.mapDecor,
		fences: merged.fences
	},
	activeRuntimeOwners
);
```

Validate the final `backgroundImages`, blockers, decor, and fences, then pass them into `meadowEntryMap`. Do not edit regional gameplay fragments for baked-art registration.

- [ ] **Step 3: Write failing renderer tests**

Prove:

1. draw order controls overlap depth;
2. base and foreground render independently;
3. missing foreground leaves valid base successful;
4. `[base, foreground]` owned decor/fence returns live when only base succeeds;
5. base-only owned visual stays suppressed when base succeeds;
6. all owned fallback visuals return when regional backgrounds are disabled.

Do not add `blocked-by-base` behavior.

- [ ] **Step 4: Migrate `WorldScene` to the single helper**

Change:

```ts
.setDepth(getMapBackgroundDepth(background.plane));
```

to:

```ts
.setDepth(getMapBackgroundDepth(background));
```

Replace blocker rendering decisions with:

```ts
shouldRenderOwnedVisual(blocker.visual, successfulBackgroundIds)
```

Pass the same final success set into all decor/fence render calls and use `shouldRenderOwnedVisual(item.visual, successfulBackgroundIds)` there too.

Remove `shouldRenderBlockerVisual` once no caller/test needs it. The final codebase must contain one fallback-visibility implementation.

Collision creation remains unconditional.

- [ ] **Step 5: Extend existing diagnostics only as needed**

Add to the existing regional background diagnostic shape:

```ts
selectedFallbackDecorIds: string[];
selectedFallbackFenceIds: string[];
```

Populate them from the same final success set. Do not create another diagnostics/evidence protocol.

- [ ] **Step 6: Extend existing regional-background e2e**

Assert:

- PR-1 enabled regional-background load count;
- zero loads for `?regionalBackground=off`;
- one representative missing-base fallback;
- one representative missing-foreground fallback;
- expected blocker/decor/fence fallback IDs.

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
- Update PR description unless acceptance exposes an owner-local defect.

- [ ] **Step 1: Walk the connector proof route**

```text
Sundrop Village
→ Crossroads
→ Coast connector mouth → Crossroads
→ Mistfen connector mouth → Crossroads
→ Silverpine connector mouth → Crossroads
→ Wildwood connector mouth → Crossroads
→ Sundrop Village
```

Cross each changed connector mouth in both directions.

- [ ] **Step 2: Exercise representative gameplay**

Verify one representative encounter/reward/discovery on the reachable PR-1 route remains live and collision matches the unchanged map source.

- [ ] **Step 3: Exercise fallback and save**

Run:

- regional backgrounds disabled;
- one missing-base case;
- one missing-foreground case;
- one save/reload checkpoint.

Confirm fallback visuals return without changing collision.

- [ ] **Step 4: Run packaged/current-platform validation**

```bash
bun run build:tauri
```

Launch the normal current-platform Tauri build/dev package used for acceptance and record approximate startup/background load plus steady-state frame-time observations. Do not infer Windows/macOS equivalence from the Chromium preflight.

- [ ] **Step 5: Run PR-1 gates**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

- [ ] **Step 6: Update PR description**

Record only:

- player-facing outcome;
- HPA-399/HPA-496 inputs consumed;
- unchanged live/collision/stateful ownership;
- skipped geometry/art workflows;
- texture-preflight environment/result;
- sealed owner projection result;
- acceptance walkthrough and build/test results.

No Expansion Brief or evidence schema is required.

---

## PR 2

### Task 8: Append the Remaining Nine Textures Without Editing Ownership

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Modify: `src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts`
- Add: 9 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: `src/lib/game/content/assets.test.ts` only if its exact count/list assertion requires it.
- **Do not modify:** `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`

**Interfaces:**
- Extends `MEADOW_ENTRY_RUNTIME_BACKGROUNDS` from 13 to 22 HPA-496 records.
- Automatically activates more rows from the unchanged `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`.

- [ ] **Step 1: Expand the registry test to the complete approved inventory**

Replace the PR-1 key set assertion with:

```ts
expect(MEADOW_ENTRY_RUNTIME_BACKGROUNDS).toHaveLength(22);
```

For every HPA-496 approval export, require exactly one runtime record and verify path, ID, geometry, dimensions, plane, and draw order against the frozen approval/crop contracts.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts
```

Expected: missing nine records/files.

- [ ] **Step 3: Append exact approved rows**

Extract the remaining inventory from the approved provenance rather than transcribing dimensions:

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const current=new Set(['sundrop-village-underlay','village-crossroads-connector','crossroads-coast-connector','crossroads-mistfen-connector','crossroads-silverpine-connector','crossroads-wildwood-connector','crossroads']); console.log(JSON.stringify(p.inventory.filter((x:any)=>!current.has(x.cropId)), null, 2))"
```

Append the nine exact runtime records and copy their approved PNG bytes unchanged to the public runtime directory.

- [ ] **Step 4: Prove the ownership table did not change**

Run the full projection test:

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
```

Then assert all final rows are active:

```ts
expect(
	selectActiveMeadowEntryRuntimeVisualOwners(
		MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS,
		MEADOW_ENTRY_RUNTIME_BACKGROUNDS
	)
).toEqual(MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS);
```

If this fails because an owner must be reassigned, stop: that is an HPA-399 contract defect, not a PR-2 ownership rewrite.

- [ ] **Step 5: Verify assets and map composition**

The final map must contain 24 descriptors total: 22 HPA-496 + 2 HPA-398 Sundrop.

```bash
bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts \
  src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts \
  src/lib/game/content/assets.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
bun run check
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/content public/game/assets/regions/meadow-entry
git commit -m "feat(hpa-406): integrate remaining meadow backgrounds"
```

---

### Task 9: Complete Full Outdoor Acceptance

**Files:**
- Modify tests only if a concrete acceptance gap requires a durable regression test.
- Update PR description with observed results.

- [ ] **Step 1: Walk the complete controller route**

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

Cross every connector mouth both ways.

- [ ] **Step 2: Check one representative gameplay point per destination**

At each destination, exercise at least one existing route/reward/encounter/discovery relevant to the integration. Confirm live objects are not baked away and collision remains authoritative.

- [ ] **Step 3: Perform representative fallback checks**

Exercise:

- one missing-base texture;
- one missing-foreground texture;
- regional backgrounds disabled.

Confirm the appropriate blocker/decor/fence live fallback returns and collision remains unchanged.

- [ ] **Step 4: Save/reload**

Save at one representative outdoor checkpoint, reload, and confirm player position/progression plus relevant collected/cleared state are unchanged by background integration.

- [ ] **Step 5: Run packaged Tauri and observe performance**

Run the normal packaged/current-native acceptance path and record:

- approximate background load/startup observation;
- steady-state frame-time observation;
- any context-loss/allocation symptoms.

Do not create a performance framework. If native loading fails after Chromium preflight passed, file the measured load-management ticket rather than adding streaming inside HPA-406 ad hoc.

- [ ] **Step 6: Run final automated gates**

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

The full production-art validator remains manual and is not restored to normal CI.

- [ ] **Step 7: Final review**

Inspect the final diff and verify:

- no geometry/art redesign;
- no runtime-package/adaptor/dependency/loading framework;
- `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS` is unchanged from PR 1;
- all 22 approved exports are registered;
- all live/stateful ownership remains live;
- no temporary print/debug code remains;
- no screenshot/evidence matrix was added.

---

## Self-Review Checklist

### Spec coverage

- Texture compatibility gate: Task 1.
- Complete adapter deletion and retained manual validator: Task 2.
- Draw order: Task 3.
- One shared visual fallback semantic: Task 4 + Task 6.
- HPA-399-sealed owner projection: Task 4.
- Owner rows fixed before PR-1 activation: Task 4.
- PR-1 direct registry/runtime copies/preload contract: Task 5.
- Post-merge composition and renderer integration: Task 6.
- PR-1 controller/fallback/save/Tauri proof: Task 7.
- Remaining nine exports without owner reassignment: Task 8.
- Full outdoor acceptance: Task 9.

### Type/name consistency

The plan uses these names consistently:

```text
MapBackgroundImage.drawOrder
getMapBackgroundDepth(background)
MapVisualOwnership
shouldRenderOwnedVisual(visual, successfulBackgroundIds)
MeadowEntryRuntimeVisualOwner
MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
selectActiveMeadowEntryRuntimeVisualOwners(...)
applyMeadowEntryRuntimeOwnership(...)
MeadowEntryRuntimeBackgroundDefinition
MEADOW_ENTRY_RUNTIME_BACKGROUNDS
meadowEntryRuntimeBackgroundImages
meadowEntryRuntimeBackgroundAssets
```

### Scope check

The highest-risk step is owner assignment, and it now has an independent source of truth: HPA-399’s sealed `primaryRegionId` + disposition/runtime-requirement data. Geometry containment can fail the gate but cannot choose a different owner. PR 2 cannot change owner rows.

No task introduces a generic framework for future maps, load strategies, story handoffs, or additional approval machinery.