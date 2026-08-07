# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Run one measured texture-safety preflight, delete superseded adapter/CI scaffolding, add deterministic draw order, generalize the existing fallback contract to alternative owner crops, and generate the complete browser-safe background/ownership arrays once from frozen HPA-399/HPA-496 data. PR 1 activates Crossroads/connectors plus Wildwood/east-boundary to prove a real multi-crop case; PR 2 only activates the remaining destination assets.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`: approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, bake/fallback dispositions, coverage attachments, overlaps, runtime coverage, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, hashes, planes, and approved PNG pixels are frozen.
- HPA-398 Sundrop background behavior and reviewed ownership remain semantically unchanged.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and save semantics remain live and authoritative.
- Base and foreground remain independent; a missing foreground never invalidates a good base.
- Runtime ownership may have multiple alternative crop owners. Never flatten alternative crops into one conjunctive background-ID list.
- `primaryRegionId`, `sourceRegionIds`, highest draw order, and overlap owner are not runtime owner selectors.
- Do not add story catalogs/fingerprints, packet schemas, generic art adapters, versioned runtime-package schemas, foreground dependency graphs, streaming/residency managers, load-strategy enums, or new approval layers.
- Fix source/crop/art defects at HPA-399/HPA-496 ownership instead of compensating in runtime.
- Normal every-PR CI must not rerun the full frozen HPA-496 production-art package.
- Final HPA-496 runtime copies add approximately 104.4 MiB compressed static assets and 377.25 MiB decoded RGBA before HPA-398/driver overhead; accept this unless measured behavior fails.

## Delivery Shape

### Implementation PR 1 — runtime seam + Crossroads/connectors + Wildwood multi-crop proof

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

PR 1 generates the **full final 22-export background registry and full final ownership table**, but activates only the crops above. It must prove `wildwood-north-climb-east-bank` has multiple alternative owner crops and that one complete crop suppresses live fallback even if another owner crop is unavailable.

### Implementation PR 2 — remaining destinations + final acceptance

Activate the remaining 6 HPA-496 textures:

```text
tidewatch-coast-base.png
tidewatch-coast-foreground.png
mistfen-base.png
mistfen-foreground.png
silverpine-base.png
silverpine-foreground.png
```

PR 2 must not change generated ownership unless HPA-399/HPA-496 frozen inputs are explicitly amended.

---

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

Start the tool with:

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

Serve only these files from a temporary Bun HTTP server.

- [ ] **Step 3: Upload and retain all textures in one Chromium/WebGL context**

In the evaluated browser page:

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

for (const asset of assets) {
	if (asset.width > maxTextureSize || asset.height > maxTextureSize) {
		results.push({ ...asset, status: 'failed', error: 'dimension exceeds MAX_TEXTURE_SIZE' });
		continue;
	}
	const response = await fetch(asset.url);
	const bitmap = await createImageBitmap(await response.blob());
	const texture = gl.createTexture();
	if (!texture) throw new Error(`createTexture failed for ${asset.id}`);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
	bitmap.close();
	const error = gl.getError();
	if (error !== gl.NO_ERROR) {
		gl.deleteTexture(texture);
		results.push({ ...asset, status: 'failed', error: `WebGL error ${error}` });
		continue;
	}
	retainedTextures.push(texture);
	results.push({ ...asset, status: 'uploaded' });
}
```

Keep every successful texture alive until all 22 attempts finish. Record `MAX_TEXTURE_SIZE`, per-texture timing/failure, total time, context loss, browser, and platform.

- [ ] **Step 4: Apply the hard gate**

```bash
bun run world:probe:meadow-entry-textures
```

Continue only when all 22 upload and `contextLost=false`.

If an individual texture fails, route it to HPA-399/HPA-496. If only aggregate residency fails, open one measured load-management ticket. Do not add streaming in HPA-406.

The result is Chromium-specific evidence; do not claim it proves Tauri WebView residency.

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

**Interfaces:**
- Produces: no live generic art-map adapter and no full frozen production-package validation on every PR.

- [ ] **Step 1: Confirm no active adapter consumer**

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- .
```

Historical plans/reports are not live consumers. If a runtime import or workflow invocation exists outside the adapter's own command/test/spec surface, stop deletion and document that concrete consumer.

- [ ] **Step 2: Delete the zero-consumer surface**

Delete the five listed adapter files and remove:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

from `package.json`.

- [ ] **Step 3: Repair retained art-validation inputs**

Remove:

```text
src/lib/game/content/backgrounds/art-map-package-adapter.test.ts
```

from `MEADOW_ENTRY_TEST_FILES` in `tools/meadow-entry-art-test-files.ts`.

Update `.agents/skills/gliese-world-expansion/references/authoring.md` so current guidance says Meadow Entry retains map-specific controls/approved-package commands, not a live generic adapter.

- [ ] **Step 4: Remove production-art work from normal CI**

Delete the dedicated `meadow-entry-art-package` job and the `build-and-lint` step that runs:

```bash
bun run art:storage:meadow-entry
```

Do not delete manual/local finalize/export/proof/approve/validate/storage commands.

- [ ] **Step 5: Prove cleanup did not break the retained manual workflow**

```bash
bun run art:validate:meadow-entry
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
bun run check
bun run lint
```

All must pass.

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

Add fixtures with `drawOrder` and assert:

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
```

Also assert validation rejects:

```text
negative drawOrder
non-integer drawOrder
drawOrder > 1000
duplicate (plane, drawOrder)
```

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
```

- [ ] **Step 3: Implement the minimal model**

In `types.ts`:

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

Extend current background validation with the order rules.

- [ ] **Step 4: Thread order through Sundrop**

Add required `drawOrder` input/output to `createLayeredRegionBackground(...)`. Pass:

```ts
drawOrder: 1_000
```

at both HPA-398 village background call sites. Update test/proof fixtures explicitly; do not add a default.

- [ ] **Step 5: Verify green and commit**

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

### Task 4: Generalize Visual Ownership to Alternative Owner Crops

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts`

**Interfaces:**
- Produces: `MapVisualOwnerCrop`, `MapVisualOwnership`, `shouldRenderOwnedVisual(...)`, `applyVisualOwnership(...)`.
- HPA-398's reviewed `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP` remains its source contract.

- [ ] **Step 1: Write failing alternative-owner semantics tests**

Add:

```ts
const alternativeCrops = {
	mode: 'fallback-only' as const,
	ownerCrops: [
		{ cropId: 'crop-a', requiredBackgroundIds: ['a-base'] },
		{ cropId: 'crop-b', requiredBackgroundIds: ['b-base'] }
	]
};

expect(shouldRenderOwnedVisual(alternativeCrops, new Set())).toBe(true);
expect(shouldRenderOwnedVisual(alternativeCrops, new Set(['a-base']))).toBe(false);
expect(shouldRenderOwnedVisual(alternativeCrops, new Set(['b-base']))).toBe(false);
```

Add the conjunctive plane case:

```ts
const baseAndForeground = {
	mode: 'fallback-only' as const,
	ownerCrops: [
		{
			cropId: 'crop-a',
			requiredBackgroundIds: ['a-base', 'a-foreground']
		}
	]
};

expect(shouldRenderOwnedVisual(baseAndForeground, new Set(['a-base']))).toBe(true);
expect(
	shouldRenderOwnedVisual(baseAndForeground, new Set(['a-base', 'a-foreground']))
).toBe(false);
```

- [ ] **Step 2: Add the shared runtime type**

In `types.ts`:

```ts
export interface MapVisualOwnerCrop {
	readonly cropId: string;
	readonly requiredBackgroundIds: readonly string[];
}

export type MapVisualOwnership =
	| { mode: 'always' }
	| { mode: 'fallback-only'; ownerCrops: readonly MapVisualOwnerCrop[] };
```

Use `MapVisualOwnership` on `MapBlocker.visual`, `MapDecorBase.visual`, and change `MapFenceSegment` from a type alias into an interface extending `MapRect` with optional `visual`.

- [ ] **Step 3: Implement the one visibility rule**

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

Extend validation to reject:

- empty `ownerCrops`;
- duplicate `cropId` within one visual contract;
- empty `requiredBackgroundIds`;
- duplicate required background IDs within one crop;
- missing referenced background IDs.

- [ ] **Step 4: Add one generic attachment helper**

Implement:

```ts
export interface VisualOwnershipAssignment {
	readonly sourceId: string;
	readonly visual: MapVisualOwnership;
}

export function applyVisualOwnership<T extends { id: string; visual?: MapVisualOwnership }>(
	items: readonly T[],
	assignments: readonly VisualOwnershipAssignment[],
	options: { rejectExisting?: boolean } = {}
): T[] {
	const byId = new Map<string, MapVisualOwnership>();
	for (const assignment of assignments) {
		if (byId.has(assignment.sourceId)) {
			throw new Error(`Duplicate visual ownership assignment: ${assignment.sourceId}`);
		}
		byId.set(assignment.sourceId, assignment.visual);
	}
	const itemIds = new Set(items.map(({ id }) => id));
	for (const sourceId of byId.keys()) {
		if (!itemIds.has(sourceId)) throw new Error(`Missing visual ownership source: ${sourceId}`);
	}
	return items.map((item) => {
		const visual = byId.get(item.id);
		if (!visual) return { ...item };
		if (options.rejectExisting && item.visual) {
			throw new Error(`Visual ownership already exists: ${item.id}`);
		}
		return { ...item, visual };
	});
}
```

Test duplicate, missing, immutable input, and reject-existing cases.

- [ ] **Step 5: Migrate Sundrop through the generic helper without changing its reviewed manifest**

Keep `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP` with its current reviewed `ownerBackgroundIds` source shape. Inside `applySundropObstacleOwnership(...)`, map each entry to:

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

then call `applyVisualOwnership(...)`.

Retain the existing HPA-398 contract/coverage validation functions unchanged except for adapting runtime visual assertions to the new shape.

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

### Task 5: Generate the Full Runtime Registry and Full Ownership Table

**Files:**
- Create: `tools/generate-meadow-entry-runtime.ts`
- Create: `tools/generate-meadow-entry-runtime.test.ts`
- Create: `src/lib/game/content/generated/meadow-entry-runtime.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `MEADOW_ENTRY_APPROVED_CROPS`, `MEADOW_ENTRY_BAKE_OWNERSHIP`, `collectMeadowEntrySourceCatalog()`, `meadowEntryArtPackageApproval.exports`, and `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP` IDs.
- Produces: `MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS` for all 22 HPA-496 exports and `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS` for all non-HPA-398 fallback obligations.
- Produces command: `bun run world:generate:meadow-entry-runtime [--check]`.

- [ ] **Step 1: Add a failing background-join test**

The collector must produce exactly 22 records. For each approval export, join its crop by `cropId` and assert the generated record is:

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

Also assert approval width/height/draw order agree with the crop contract before rendering output.

- [ ] **Step 2: Add the two ownership counterexample tests before implementation**

Resolve `wildwood-forest-lane-west-bank`. Its raw bounds are:

```text
left=4968 top=3200 right=5032 bottom=5300
```

For its `base-static` `8px` margins, the required base extent is:

```text
left=4960 top=3192 right=5040 bottom=5308
```

Assert the only complete crop is:

```ts
['outer-boundary-east-forest-lane']
```

because Wildwood ends at `bottom=5056`.

Resolve `wildwood-north-climb-east-bank`. With the same margins, assert the complete crops are exactly:

```ts
['outer-boundary-east-forest-lane', 'wildwood']
```

ordered by draw order.

These tests prove both the cross-region attachment case and genuine alternative ownership.

- [ ] **Step 3: Implement one reusable geometry collector**

Use existing `containsBounds(...)`; do not duplicate its math.

Implement a local helper:

```ts
function expandBounds(bounds: RawPixelBounds, margins: Insets): RawPixelBounds {
	return {
		left: bounds.left - margins.left,
		top: bounds.top - margins.top,
		right: bounds.right + margins.right,
		bottom: bounds.bottom + margins.bottom
	};
}
```

For each fallback obligation:

```ts
const completeCrops = MEADOW_ENTRY_APPROVED_CROPS.filter((crop) => {
	if (!containsBounds(crop.bounds, rasterizeCoverageBounds(baseExtent))) return false;
	if (entry.disposition.mode !== 'base-and-foreground') return true;
	if (crop.textureKeys.foreground === null) return false;
	return containsBounds(crop.bounds, rasterizeCoverageBounds(foregroundExtent));
});
```

`coverageAttachments` are not unioned here: HPA-399 already folds them into final `crop.bounds` before export.

Skip blockers whose IDs are in `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`; HPA-398 remains separately reviewed.

Fail when `completeCrops.length === 0`.

- [ ] **Step 4: Build alternative crop groups**

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

Sort owner crops by `drawOrder`, then `id`. Sort source rows by `sourceType`, then `sourceId`.

Do not use `primaryRegionId` or `sourceRegionIds` as selectors. Include `primaryRegionId` only in thrown diagnostics when a source has no complete owner crop.

- [ ] **Step 5: Render one deterministic browser-safe generated module**

Render:

```ts
// @generated by tools/generate-meadow-entry-runtime.ts. Do not edit by hand.

import type {
	MapBackgroundImage,
	MapVisualOwnerCrop
} from '$lib/game/content/maps/types';

export interface GeneratedMeadowEntryBackground extends MapBackgroundImage {
	readonly cropId: string;
	readonly path: string;
}

export interface GeneratedMeadowEntryVisualOwner {
	readonly sourceType: 'blocker' | 'decor' | 'fence';
	readonly sourceId: string;
	readonly ownerCrops: readonly MapVisualOwnerCrop[];
}

export const MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS = /* deterministic array */;
export const MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS = /* deterministic array */;
```

The rendered file contains no approval hashes, provenance objects, source catalogs, or fingerprints.

- [ ] **Step 6: Implement atomic write and `--check` using the existing story-codegen pattern**

Use the same shape as `tools/export-story-content-references.ts`:

```ts
function syncGenerated(source: string, destinationPath: string, check: boolean): void {
	if (check) {
		if (!existsSync(destinationPath)) throw new Error(`generated meadow runtime is missing`);
		if (readFileSync(destinationPath, 'utf8') !== source) {
			throw new Error(`generated meadow runtime is stale`);
		}
		return;
	}
	mkdirSync(dirname(destinationPath), { recursive: true });
	const temporaryPath = `${destinationPath}.${process.pid}.${randomUUID()}.tmp`;
	try {
		writeFileSync(temporaryPath, source, { encoding: 'utf8', flag: 'wx' });
		renameSync(temporaryPath, destinationPath);
	} finally {
		if (existsSync(temporaryPath)) rmSync(temporaryPath);
	}
}
```

Accept only no args or exactly `--check`.

- [ ] **Step 7: Add scripts and CI freshness gate**

Add:

```json
"world:generate:meadow-entry-runtime": "bun tools/generate-meadow-entry-runtime.ts"
```

Run once to create the committed file:

```bash
bun run world:generate:meadow-entry-runtime
bun run world:generate:meadow-entry-runtime --check
```

Add a cheap `build-and-lint` CI step:

```yaml
- name: Verify Meadow Entry runtime data is current
  run: bun run world:generate:meadow-entry-runtime --check
```

- [ ] **Step 8: Run the focused generator tests**

```bash
bun run test:unit -- --run tools/generate-meadow-entry-runtime.test.ts
bun run world:generate:meadow-entry-runtime --check
bun run check
```

Expected: 22 background records; ownership counterexamples pass; generated file is current.

- [ ] **Step 9: Commit the pre-registration correctness gate**

```bash
git add tools/generate-meadow-entry-runtime.ts \
  tools/generate-meadow-entry-runtime.test.ts \
  src/lib/game/content/generated/meadow-entry-runtime.ts \
  package.json .github/workflows/ci.yml
git commit -m "feat(hpa-406): generate meadow runtime ownership"
```

Do not proceed to runtime PNG registration if this task is not green.

---

### Task 6: Activate the PR-1 Crops and Copy 16 Runtime PNGs

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
- Produces: active PR-1 background images/assets and active visual-owner assignments.

- [ ] **Step 1: Define the exact PR-1 crop activation set**

In `meadow-entry-runtime.ts`:

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

Test there are exactly 16 active HPA-496 background records.

- [ ] **Step 2: Project active backgrounds from generated data**

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

- [ ] **Step 3: Activate only complete generated owner crops**

Build active background IDs:

```ts
const activeBackgroundIds = new Set(meadowEntryRuntimeBackgrounds.map(({ id }) => id));
```

For every generated owner row:

```ts
const ownerCrops = row.ownerCrops.filter((crop) =>
	crop.requiredBackgroundIds.every((id) => activeBackgroundIds.has(id))
);
```

If `ownerCrops.length === 0`, omit the row so the source stays live in this delivery. Otherwise expose:

```ts
{
	sourceType: row.sourceType,
	sourceId: row.sourceId,
	visual: { mode: 'fallback-only', ownerCrops }
}
```

Test `wildwood-north-climb-east-bank` exposes both Wildwood and east-boundary owner crops in PR 1.

- [ ] **Step 4: Copy exact approved bytes**

Copy the 16 PR-1 filenames from:

```text
artifacts/meadow-entry/hpa-399/exports/
```

to:

```text
public/game/assets/regions/meadow-entry/
```

Do not re-encode.

Add:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Add cheap active-runtime asset integrity tests**

For every active runtime background:

```ts
const approved = meadowEntryArtPackageApproval.exports.find(
	(entry) => entry.textureKey === background.textureKey
);
expect(approved).toBeDefined();

const runtimePath = resolve(`public${background.path}`);
expect(existsSync(runtimePath)).toBe(true);
const bytes = Buffer.from(await Bun.file(runtimePath).arrayBuffer());
const metadata = await sharp(bytes).metadata();
const digest = createHash('sha256').update(bytes).digest('hex');

expect({ width: metadata.width, height: metadata.height }).toEqual({
	width: approved!.width,
	height: approved!.height
});
expect(digest).toBe(approved!.sha256);
```

- [ ] **Step 6: Make preload typing structural**

In `assets.ts` add:

```ts
export interface RegionalBackgroundPreloadAsset {
	readonly key: string;
	readonly path: string;
}
```

Keep the existing HPA-398 Sundrop entries with their extra approval fields in a dedicated constant:

```ts
export const sundropRegionalBackgroundAssets = [/* existing two records */] as const;
```

Export the combined preload list as:

```ts
export const regionalBackgroundAssets: readonly RegionalBackgroundPreloadAsset[] = [
	...sundropRegionalBackgroundAssets,
	...meadowEntryRuntimeBackgroundAssets
];
```

Do not add fake HPA-398 approval fields to HPA-496 rows.

Update `assets.test.ts` to test Sundrop approval metadata through `sundropRegionalBackgroundAssets` and test the combined list structurally.

- [ ] **Step 7: Verify and commit**

```bash
bun run test:unit -- --run \
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
- Consumes: active backgrounds and ownership assignments from Task 6.
- Produces: final PR-1 `meadowEntryMap` with 2 HPA-398 + 16 active HPA-496 descriptors.

- [ ] **Step 1: Write failing map-composition tests**

Assert:

```ts
expect(meadowEntryMap.backgroundImages).toHaveLength(18);
```

Assert all 16 active generated IDs occur exactly once and both Sundrop descriptors remain at `drawOrder: 1000`.

- [ ] **Step 2: Compose only after `mergeRegions(...)`**

Use:

```ts
const backgroundImages = [
	...merged.backgroundImages,
	...meadowEntryRuntimeBackgroundImages
];

const sundropOwnedBlockers = applySundropObstacleOwnership(merged.blockers);

const blockerAssignments = activeMeadowEntryRuntimeVisualOwners
	.filter(({ sourceType }) => sourceType === 'blocker')
	.map(({ sourceId, visual }) => ({ sourceId, visual }));
const decorAssignments = activeMeadowEntryRuntimeVisualOwners
	.filter(({ sourceType }) => sourceType === 'decor')
	.map(({ sourceId, visual }) => ({ sourceId, visual }));
const fenceAssignments = activeMeadowEntryRuntimeVisualOwners
	.filter(({ sourceType }) => sourceType === 'fence')
	.map(({ sourceId, visual }) => ({ sourceId, visual }));

const blockers = applyVisualOwnership(sundropOwnedBlockers, blockerAssignments, {
	rejectExisting: true
});
const mapDecor = applyVisualOwnership(merged.mapDecor, decorAssignments);
const fences = applyVisualOwnership(merged.fences, fenceAssignments);
```

Run background/owner validation against these final arrays. Do not edit region fragments for art registration.

- [ ] **Step 3: Write renderer tests for alternative crop behavior**

Prove all of these before editing `WorldScene`:

1. draw order changes background depth;
2. missing foreground leaves a valid base successful;
3. a base+foreground owner remains live when only its base succeeds;
4. a base+foreground owner is suppressed when both planes of one owner crop succeed;
5. a multi-crop source is suppressed when Wildwood succeeds even if east-boundary fails;
6. the same source is suppressed when east-boundary succeeds even if Wildwood fails;
7. it returns live only when no complete owner crop succeeds;
8. all owned visuals return live when regional backgrounds are disabled.

Do not add `blocked-by-base`.

- [ ] **Step 4: Update renderer call sites to one shared visibility function**

Change background depth use from:

```ts
getMapBackgroundDepth(background.plane)
```

to:

```ts
getMapBackgroundDepth(background)
```

Pass the final `successfulBackgroundIds` into blocker, decor, and fence rendering.

Replace all blocker-only visibility call sites with:

```ts
shouldRenderOwnedVisual(item.visual, successfulBackgroundIds)
```

Remove `shouldRenderBlockerVisual` after the final call site/test migrates; do not leave two equivalent public helpers.

Collision remains unconditional.

- [ ] **Step 5: Extend existing diagnostics only with fallback IDs needed by tests**

Add:

```ts
selectedFallbackDecorIds: string[];
selectedFallbackFenceIds: string[];
```

Use the same final success set. Do not add another evidence protocol.

- [ ] **Step 6: Put mechanical failure cases in e2e, not the manual walkthrough**

Extend the existing regional-background e2e to cover:

- expected PR-1 preload count (`18` including HPA-398);
- zero regional loads under `?regionalBackground=off`;
- one missing-base fallback;
- one missing-foreground fallback;
- one multi-crop alternative-owner case;
- expected blocker/decor/fence fallback IDs.

- [ ] **Step 7: Verify and commit**

```bash
bun run test:unit -- --run \
  tools/generate-meadow-entry-runtime.test.ts \
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
- Update: PR 1 description only unless acceptance finds an owner-local defect.

- [ ] **Step 1: Walk the Crossroads/connector route**

```text
Sundrop Village
→ Crossroads
→ Coast connector mouth → Crossroads
→ Mistfen connector mouth → Crossroads
→ Silverpine connector mouth → Crossroads
→ Wildwood connector mouth
```

Cross every changed mouth both directions.

- [ ] **Step 2: Walk the actual multi-crop proof**

Continue into Wildwood through the forest lane/north climb and specifically inspect the live fallback sources covered by both Wildwood and `outer-boundary-east-forest-lane`.

Acceptance:

- no duplicate hedge/bank visual;
- no invisible collision;
- no seam/hole at the Wildwood/east-boundary overlap;
- player remains occluded correctly where foreground is present.

Mechanical missing-plane injection is already covered by Task 7 e2e and is not repeated manually.

- [ ] **Step 3: Save/reload once and run packaged Tauri**

Save at one representative outdoor checkpoint, reload, and continue the route.

Run:

```bash
bun run build:tauri
bun run tauri build
```

Record the native development platform used.

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

### Task 9: Activate the Remaining Six Destination Textures in PR 2

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime.test.ts`
- Add: 6 PNGs under `public/game/assets/regions/meadow-entry/`
- Existing asset/map/scene/e2e tests update only for final counts/active rows.

**Interfaces:**
- Consumes: the unchanged full generated background and ownership data from PR 1.
- Produces: all 22 HPA-496 exports active; all eligible generated ownership rows automatically become active.

- [ ] **Step 1: Extend the active crop list**

Append:

```ts
'tidewatch-coast',
'mistfen',
'silverpine'
```

to `MEADOW_ENTRY_ACTIVE_CROP_IDS`.

Do not edit generated data manually.

- [ ] **Step 2: Prove generation remains byte-current**

```bash
bun run world:generate:meadow-entry-runtime --check
git diff --exit-code -- src/lib/game/content/generated/meadow-entry-runtime.ts
```

Expected: no generated ownership/background change.

- [ ] **Step 3: Copy the six exact approved runtime files**

Copy without re-encoding:

```text
tidewatch-coast-base.png
tidewatch-coast-foreground.png
mistfen-base.png
mistfen-foreground.png
silverpine-base.png
silverpine-foreground.png
```

into `public/game/assets/regions/meadow-entry/`.

- [ ] **Step 4: Update count/activation tests**

Assert:

```ts
expect(meadowEntryRuntimeBackgrounds).toHaveLength(22);
expect(meadowEntryMap.backgroundImages).toHaveLength(24); // 22 HPA-496 + 2 HPA-398
```

Assert every generated visual-owner row with at least one complete owner crop is now active.

- [ ] **Step 5: Run focused automated gates**

```bash
bun run test:unit -- --run \
  tools/generate-meadow-entry-runtime.test.ts \
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
```

- [ ] **Step 6: Commit**

```bash
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
- Update: PR 2 description only unless a concrete defect requires an owner-local fix.

- [ ] **Step 1: Walk one continuous outdoor route**

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

Cross every connector mouth in both directions.

- [ ] **Step 2: Exercise representative live gameplay per destination**

For each destination use one existing route/reward/encounter/discovery relevant to that region. Confirm live NPCs, pickups, encounters, gates, transitions, and collision remain authoritative.

- [ ] **Step 3: Save/reload at one representative checkpoint**

Confirm the player resumes at a valid position and exploration/reward state remains correct.

- [ ] **Step 4: Record lightweight performance observations**

In a normal packaged Tauri run record:

```text
reference platform
approximate initial outdoor load time
one steady-state frame-time/FPS observation
whether any texture/context warning occurred
```

No performance dashboard or residency subsystem is added.

- [ ] **Step 5: Run final repository gates**

```bash
bun run world:generate:meadow-entry-runtime --check
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

All must pass.

- [ ] **Step 6: Final PR description checklist**

PR 2 must state:

- player-facing outdoor result;
- HPA-399/HPA-496 frozen inputs consumed;
- that geometry/art production was intentionally skipped;
- that multi-crop fallback ownership remained unchanged from PR 1 generated data;
- continuous controller walkthrough result;
- one save/reload result;
- approximate load/frame observation;
- no separate HPA-411-style certification ticket is required for HPA-406 completion.

---

## Self-Review

### Spec coverage

- Frozen integration: Tasks 1-10 preserve frozen HPA-399/HPA-496 inputs.
- Texture risk: Task 1 measures all 22 before loading architecture changes.
- Deletion-first cleanup: Task 2 removes adapter and every-PR production validation, including the retained test-file list and skill wording.
- Draw order: Task 3.
- Alternative crop ownership: Task 4.
- Reproducible full owner/background projection: Task 5 with committed `--check` generator.
- Real multi-crop proof before PR 2: Tasks 5-8 using Wildwood + east-boundary.
- Exact public assets/LFS/preload typing: Task 6 and Task 9.
- Existing renderer/composition seam: Task 7.
- Mechanical fallback regressions: Task 7 automated tests, not duplicated manually.
- Final outdoor acceptance: Task 10.

### Ownership consistency

The final model is deliberately two-level:

```text
ownerCrops = alternatives (OR)
requiredBackgroundIds inside one owner crop = required planes (AND)
```

Therefore:

```text
render live fallback
iff
no owner crop has every required background rendered
```

This preserves the HPA-398 one-crop/base+foreground behavior and correctly handles HPA-496 overlapping crops.

### Generation consistency

There is one reproducible generated artifact:

```text
tools/generate-meadow-entry-runtime.ts
  → src/lib/game/content/generated/meadow-entry-runtime.ts
```

PR 2 changes only activation/public files. `--check` must remain byte-clean.

### Placeholder/type check

The plan contains no `TBD`, `TODO`, temporary print-and-paste branch, hand-maintained generated owner table, second visibility helper, or unnamed future framework. Stable names are:

```text
MapBackgroundImage.drawOrder
getMapBackgroundDepth(background)
MapVisualOwnerCrop
MapVisualOwnership
shouldRenderOwnedVisual(...)
applyVisualOwnership(...)
MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS
MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
MEADOW_ENTRY_ACTIVE_CROP_IDS
meadowEntryRuntimeBackgroundImages
meadowEntryRuntimeBackgroundAssets
activeMeadowEntryRuntimeVisualOwners
```
