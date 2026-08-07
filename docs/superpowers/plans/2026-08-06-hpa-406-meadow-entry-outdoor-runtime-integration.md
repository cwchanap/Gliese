# HPA-406 Meadow Entry Outdoor Runtime Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate all 22 approved HPA-496 Meadow Entry exports through the existing HPA-398 background runtime, preserve live gameplay/collision/fallback ownership, and finish outdoor acceptance with the smallest runtime extension.

**Architecture:** Treat HPA-406 as frozen integration. Run one measured texture-safety preflight, remove superseded adapter/CI scaffolding, add `drawOrder` to the existing background descriptor, project HPA-399’s sealed `primaryRegionId` + disposition contract once into a full browser-safe visual-owner table, then use one direct Meadow Entry runtime registry consumed by the existing renderer. Base/foreground remain independent; PR 2 only appends assets and activates more already-fixed ownership rows.

**Tech Stack:** TypeScript 6, Phaser 4, Vite, Vitest 4, Playwright 1.59, Bun, Sharp, Tauri 2, Git LFS.

## Global Constraints

- HPA-406 is `frozen-integration`; approved geometry and art are inputs, not design work.
- HPA-399 crop geometry, crop `sourceRegionIds`, `primaryRegionId`, bake/fallback ownership, overlap contracts, and draw order are frozen.
- HPA-496 filenames, texture keys, dimensions, hashes, planes, and approved PNG pixels are frozen.
- HPA-398 Sundrop backgrounds and multi-owner fallback behavior remain unchanged except for explicit `drawOrder: 1000`.
- Collision, buildings, NPCs, pickups, discoveries, encounters, gates, transitions, minimap markers, and saves remain live and authoritative.
- Base and foreground remain independent; a missing foreground never invalidates a valid base.
- Runtime owner assignment comes from HPA-399 `primaryRegionId` + the unique approved crop carrying that region in `sourceRegionIds`. Geometry containment may fail validation but must never select another owner.
- The full HPA-406 visual-owner table is fixed in PR 1; PR 2 must not edit owner rows.
- Do not add story catalogs/fingerprints, packet schemas, generic art adapters, runtime-package schemas, dependency graphs, streaming/residency managers, load-strategy enums, or new approval layers.
- Normal PR CI must not rerun the full frozen HPA-496 production-art package.

## Delivery Shape

PR 1 activates 13 exports: Sundrop underlay base, Village↔Crossroads base/foreground, four Crossroads↔destination connector base/foreground pairs, and Crossroads base/foreground. It also creates the complete reusable seam and final visual-owner table.

PR 2 appends the remaining 9 exports: Tidewatch Coast, Mistfen, Silverpine, Wildwood base/foreground pairs plus the east-forest outer-boundary base. It must not change ownership assignment.

---

## PR 1

### Task 1: Run the Texture-Safety Preflight

**Files:**
- Create: `tools/probe-meadow-entry-texture-safety.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `meadowEntryArtPackageApproval.exports`.
- Produces: `bun run world:probe:meadow-entry-textures`; printed `decision: 'proceed' | 'stop'`.

- [ ] **Step 1: Add the command**

```json
"world:probe:meadow-entry-textures": "bun tools/probe-meadow-entry-texture-safety.ts"
```

- [ ] **Step 2: Build the exact approved inventory**

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

Serve only these artifact paths with Bun. In Chromium create WebGL2 or WebGL1, query `MAX_TEXTURE_SIZE`, attach `webglcontextlost`, fetch/decode each PNG, upload each with `texImage2D`, call `gl.getError()`, and retain every successful `WebGLTexture` until all 22 attempts finish.

Record `maxTextureSize`, each upload result/timing, `contextLost`, aggregate time, browser/platform, and the decision. Return `stop` for an over-limit dimension, failed upload, context loss, or aggregate allocation failure.

- [ ] **Step 3: Run the hard gate**

```bash
bun run world:probe:meadow-entry-textures
```

Continue only when all 22 upload and `contextLost=false`. Record the environment in PR 1. Do not claim Chromium proves Tauri WebView equivalence. A later packaged-native failure is evidence for a separate load-management ticket.

- [ ] **Step 4: Commit**

```bash
git add package.json tools/probe-meadow-entry-texture-safety.ts
git commit -m "test(hpa-406): probe meadow texture safety"
```

---

### Task 2: Delete the Superseded Adapter Without Breaking Manual Validation

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
- Produces: no live `art:map-package`; retained manual art validation remains runnable; normal PR CI stops rerunning frozen production validation.

- [ ] **Step 1: Confirm zero active consumers**

```bash
git grep -n -E 'art:map-package|art-map-adapters/meadow-entry|art-map-package\.ts|hpa-495-art-map-package-adapter-v1' -- .
```

Historical design/plan prose is not a consumer. If a live runtime import or invoked workflow exists outside the command/test/spec surface, stop deletion and record it.

- [ ] **Step 2: Delete the five adapter files and package script**

Remove from `package.json`:

```json
"art:map-package": "bun tools/art-map-package.ts"
```

- [ ] **Step 3: Repair the retained test inventory**

Remove exactly this entry from `MEADOW_ENTRY_TEST_FILES` in `tools/meadow-entry-art-test-files.ts`:

```ts
'src/lib/game/content/backgrounds/art-map-package-adapter.test.ts',
```

Keep every other test path unchanged.

- [ ] **Step 4: Repair current skill wording**

Change the final sentence in `.agents/skills/gliese-world-expansion/references/authoring.md` to:

```text
A new map does not inherit Meadow Entry's crop contract, provenance inventory, or approval machinery. Record the concrete need and build only the smallest asset path the real map requires.
```

- [ ] **Step 5: Remove full production validation from every-PR CI**

Delete the dedicated `meadow-entry-art-package` job and the `build-and-lint` step that runs `bun run art:storage:meadow-entry`. Keep the production commands in `package.json` for explicit repair work.

- [ ] **Step 6: Verify retained workflows**

```bash
bun run art:validate:meadow-entry
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
bun run check
bun run lint
git grep -n 'art:map-package' -- package.json .github src tools art-map-adapters || true
```

Expected: the retained manual validator, skill test, check, and lint pass; no live adapter command remains.

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
- Produces: `MapBackgroundImage.drawOrder`; `getMapBackgroundDepth(background)`.

- [ ] **Step 1: Write failing depth/order tests**

```ts
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 0 })).toBe(-9);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 240 })).toBe(-8.976);
expect(getMapBackgroundDepth({ plane: 'base', drawOrder: 1000 })).toBe(-8.9);
expect(getMapBackgroundDepth({ plane: 'foreground', drawOrder: 1000 })).toBe(100.1);
```

Add failures for negative/non-integer/`>1000` order and duplicate `(plane, drawOrder)`.

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

Extend `validateMapBackgroundOwnership(...)` with the order rules. Add `drawOrder` to `createLayeredRegionBackground(...)`; set both HPA-398 Sundrop calls to `1_000`; update fixtures/proof tooling explicitly.

- [ ] **Step 4: Verify and commit**

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

### Task 4: Seal the Full Visual-Ownership Projection and Use One Visibility Helper

**Files:**
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/background-ownership.ts`
- Modify: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`

**Interfaces:**
- Produces: `MapVisualOwnership`; `shouldRenderOwnedVisual(...)`; full `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`; `selectActiveMeadowEntryRuntimeVisualOwners(...)`; `applyMeadowEntryRuntimeOwnership(...)`.

- [ ] **Step 1: Write failing shared-helper tests**

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

Extend owner-reference validation to blockers, decor, and fences; each must reject empty, duplicate, or missing background IDs.

- [ ] **Step 2: Implement one semantic function**

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

Use `MapVisualOwnership` for blocker/decor/fence visuals. Do not leave two independent implementations. A temporary `shouldRenderBlockerVisual` may remain only as a one-line delegate until Task 6 migrates `WorldScene`; Task 6 then removes it.

- [ ] **Step 3: Derive the owner crop directly from the sealed crop contract**

In `meadow-entry-runtime-ownership.test.ts`, read `MEADOW_ENTRY_BAKE_OWNERSHIP`, `MEADOW_ENTRY_APPROVED_CROPS`, `collectMeadowEntrySourceCatalog()`, and `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP` **only from tests**.

Keep only runtime requirements:

```ts
const HPA406_RUNTIME_REQUIREMENTS = new Set([
	'existing-blocker-fallback',
	'extend-decor-fallback',
	'extend-fence-fallback'
]);
```

Exclude blockers already in `SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP`.

For each remaining entry, resolve the owner crop mechanically:

```ts
const matchingCrops = MEADOW_ENTRY_APPROVED_CROPS.filter((crop) =>
	crop.sourceRegionIds.includes(entry.primaryRegionId)
);
expect(matchingCrops).toHaveLength(1);
const ownerCrop = matchingCrops[0]!;
```

This lookup uses `sourceRegionIds`, not crop draw order or geometric multi-containment. If a future fallback obligation has zero or multiple primary-region crops, validation fails and HPA-399 must clarify the contract.

- [ ] **Step 4: Validate crop fit without using geometry as a selector**

Build a source map from `collectMeadowEntrySourceCatalog()` and require each HPA-406 fallback source to have rectangular bounds.

Use this test helper:

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

For `base-static`, assert the base-margin-expanded source fits `ownerCrop.bounds`. For `base-and-foreground`, assert both base-margin and foreground-margin expansions fit the **same** `ownerCrop`; require `ownerCrop.textureKeys.foreground` to be non-null. A failure stops implementation; never search another overlapping crop.

- [ ] **Step 5: Build the independent full expected table**

Runtime row type:

```ts
export interface MeadowEntryRuntimeVisualOwner {
	sourceType: 'blocker' | 'decor' | 'fence';
	sourceId: string;
	ownerCropId: string;
	ownerBackgroundIds: readonly string[];
}
```

For `base-static`, use `${ownerCrop.textureKeys.base}-image`. For `base-and-foreground`, use base and `${ownerCrop.textureKeys.foreground}-image`. Sort expected rows by `sourceType`, then `sourceId`.

- [ ] **Step 6: Materialize the exact full runtime table once**

During authoring only, print `expectedOwners`:

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

Use the exact printed sorted rows as the initializer of `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS`. Remove the temporary print branch before committing, then require:

```ts
expect(MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS).toEqual(expectedOwners);
```

No second ownership hash is added; HPA-399 already seals the source contract.

- [ ] **Step 7: Add stable activation**

```ts
export function selectActiveMeadowEntryRuntimeVisualOwners(
	owners: readonly MeadowEntryRuntimeVisualOwner[],
	backgrounds: readonly { cropId: string; id: string }[]
): readonly MeadowEntryRuntimeVisualOwner[];
```

Build active crop/background ID sets. Skip a row only when its `ownerCropId` is inactive. If its crop is active, require every `ownerBackgroundIds` target or throw. Return rows unchanged; never recalculate owners.

- [ ] **Step 8: Add pure ownership application**

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

For each row, require the source ID to exist, reject an existing `visual` contract, clone only the changed item, and set `fallback-only` with the row’s exact owner IDs.

- [ ] **Step 9: Verify the critical gate and commit**

```bash
bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts
bun run check
git add src/lib/game/content/maps src/lib/game/content/backgrounds
git commit -m "feat(hpa-406): seal meadow visual ownership"
```

Do not proceed to texture registration if full-table equality or primary-crop containment fails.

---

### Task 5: Register the PR-1 Backgrounds and Exact Runtime PNGs

**Files:**
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Create: `src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts`
- Add: 13 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: `.gitattributes`
- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.test.ts`

**Interfaces:**
- Produces: `MEADOW_ENTRY_RUNTIME_BACKGROUNDS`; `meadowEntryRuntimeBackgroundImages`; `meadowEntryRuntimeBackgroundAssets`.
- Boot preload contract: `{ readonly key: string; readonly path: string }` only.

- [ ] **Step 1: Write the exact registry test**

```ts
export type MeadowEntryRuntimeBackgroundDefinition = MapBackgroundImage & {
	cropId: string;
	path: string;
};
```

Require exactly these PR-1 crop/plane pairs:

```text
sundrop-village-underlay:base
village-crossroads-connector:base
village-crossroads-connector:foreground
crossroads-coast-connector:base
crossroads-coast-connector:foreground
crossroads-mistfen-connector:base
crossroads-mistfen-connector:foreground
crossroads-silverpine-connector:base
crossroads-silverpine-connector:foreground
crossroads-wildwood-connector:base
crossroads-wildwood-connector:foreground
crossroads:base
crossroads:foreground
```

For each record, compare texture key, plane, draw order, dimensions, center coordinates, `${textureKey}-image` ID, and `/game/assets/regions/meadow-entry/<approved filename>` path against HPA-399/HPA-496.

- [ ] **Step 2: Verify red**

```bash
bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts
```

- [ ] **Step 3: Extract approved rows and author the registry**

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const wanted=new Set(['sundrop-village-underlay','village-crossroads-connector','crossroads-coast-connector','crossroads-mistfen-connector','crossroads-silverpine-connector','crossroads-wildwood-connector','crossroads']); console.log(JSON.stringify(p.inventory.filter((x:any)=>wanted.has(x.cropId)), null, 2))"
```

Author the 13 exact records from this output and export two projections from the same records: runtime map images without `cropId/path`, and preload assets `{ key: textureKey, path }`.

- [ ] **Step 4: Copy exact bytes and add scoped LFS**

Copy the 13 listed approved PNGs without re-encoding from `artifacts/meadow-entry/hpa-399/exports/` to `public/game/assets/regions/meadow-entry/` and add:

```text
public/game/assets/regions/meadow-entry/**/*.png filter=lfs diff=lfs merge=lfs -text
```

- [ ] **Step 5: Add cheap runtime integrity tests**

For every active runtime file, use Sharp and SHA-256:

```ts
const bytes = Buffer.from(await Bun.file(filePath).arrayBuffer());
const digest = createHash('sha256').update(bytes).digest('hex');
const metadata = await sharp(bytes).metadata();

expect({ width: metadata.width, height: metadata.height }).toEqual({
	width: approved.width,
	height: approved.height
});
expect(digest).toBe(approved.sha256);
```

Also assert the file exists.

- [ ] **Step 6: Keep preload shape heterogeneous but structurally safe**

Define/document:

```ts
type RegionalBackgroundPreloadAsset = {
	readonly key: string;
	readonly path: string;
};
```

Append `meadowEntryRuntimeBackgroundAssets` after the two existing Sundrop entries. Sundrop keeps its extra approval fields; HPA-496 entries stay `{ key, path }`. Ensure BootScene-facing typing relies only on `RegionalBackgroundPreloadAsset`. Do not invent HPA-398 metadata for HPA-496 rows.

- [ ] **Step 7: Prove PR-1 activation uses the fixed table**

```ts
const activeCropIds = new Set(MEADOW_ENTRY_RUNTIME_BACKGROUNDS.map((background) => background.cropId));
expect(
	selectActiveMeadowEntryRuntimeVisualOwners(
		MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS,
		MEADOW_ENTRY_RUNTIME_BACKGROUNDS
	)
).toEqual(
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

### Task 6: Compose and Render the PR-1 Slice

**Files:**
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Modify: `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: registry + fixed/active ownership helpers.
- Produces: PR-1 `meadowEntryMap` with 13 HPA-496 + 2 HPA-398 descriptors; one blocker/decor/fence fallback semantic.

- [ ] **Step 1: Write map-composition tests**

Require 15 background descriptors, every PR-1 background ID exactly once, and both Sundrop descriptors at `drawOrder: 1000`. Existing transition/encounter/reward/discovery/save-map tests remain unchanged.

- [ ] **Step 2: Compose after `mergeRegions(...)` only**

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

Validate final backgrounds/visual references and pass `owned` arrays into `meadowEntryMap`. Do not modify gameplay region fragments for art registration.

- [ ] **Step 3: Write renderer tests**

Prove draw-order depth, base/foreground independence, valid base surviving missing foreground, base+foreground fallback returning when either owner fails, base-only fallback staying suppressed when base succeeds, and all fallbacks returning when regional backgrounds are disabled.

- [ ] **Step 4: Migrate `WorldScene` to one helper**

Use `getMapBackgroundDepth(background)`. Replace blocker calls with `shouldRenderOwnedVisual(blocker.visual, successfulBackgroundIds)`, pass the final success set into decor/fence rendering, and use the same helper there. Remove `shouldRenderBlockerVisual` once no caller/test uses it. Collision remains unconditional.

- [ ] **Step 5: Extend existing diagnostics only**

Add `selectedFallbackDecorIds` and `selectedFallbackFenceIds` alongside existing blocker IDs. Do not create another evidence protocol.

- [ ] **Step 6: Extend regional-background e2e**

Assert enabled PR-1 load count, zero disabled-mode loads, one missing-base fallback, one missing-foreground fallback, and expected blocker/decor/fence fallback IDs.

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
- Update PR description only unless acceptance exposes a defect needing a regression test.

- [ ] **Step 1:** Walk `Sundrop → Crossroads → each of the four destination connector mouths → Crossroads → Sundrop`, crossing each changed mouth both directions.
- [ ] **Step 2:** Exercise one representative existing encounter/reward/discovery on the reachable route.
- [ ] **Step 3:** Verify backgrounds-disabled, one missing-base case, one missing-foreground case, and one save/reload checkpoint.
- [ ] **Step 4:** Run `bun run build:tauri`, launch the normal current-platform Tauri acceptance path, and record approximate load/startup plus steady-state frame-time observation. Do not infer another platform’s GPU behavior.
- [ ] **Step 5:** Run full PR-1 gates:

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

Record in the PR description: player-facing outcome, frozen inputs, unchanged ownership, skipped design/art workflows, preflight environment/result, sealed-owner projection result, walkthrough, and checks.

---

## PR 2

### Task 8: Append the Remaining Nine Textures Without Editing Ownership

**Files:**
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-backgrounds.test.ts`
- Modify: `src/lib/game/content/meadow-entry-runtime-assets.asset.test.ts`
- Add: 9 PNGs under `public/game/assets/regions/meadow-entry/`
- Modify: `src/lib/game/content/assets.test.ts` only if exact count/list assertions require it.
- Do not modify: `src/lib/game/content/backgrounds/meadow-entry-runtime-ownership.ts`

**Interfaces:**
- Extends HPA-496 registry from 13 to 22 records.
- Activates additional rows from the unchanged PR-1 visual-owner table.

- [ ] **Step 1:** Expand the registry test to require all 22 approved HPA-496 records and exact approval/crop parity.
- [ ] **Step 2:** Verify red on the missing nine records/files.
- [ ] **Step 3:** Extract remaining approval rows:

```bash
bun -e "const p=await Bun.file('artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json').json(); const current=new Set(['sundrop-village-underlay','village-crossroads-connector','crossroads-coast-connector','crossroads-mistfen-connector','crossroads-silverpine-connector','crossroads-wildwood-connector','crossroads']); console.log(JSON.stringify(p.inventory.filter((x:any)=>!current.has(x.cropId)), null, 2))"
```

Append those exact nine records and copy their approved bytes unchanged.

- [ ] **Step 4:** Prove ownership remains fixed:

```ts
expect(
	selectActiveMeadowEntryRuntimeVisualOwners(
		MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS,
		MEADOW_ENTRY_RUNTIME_BACKGROUNDS
	)
).toEqual(MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS);
```

If an owner needs reassignment, stop and route the defect to HPA-399 rather than editing the PR-1 table.

- [ ] **Step 5:** Verify final map has 24 descriptors total: 22 HPA-496 + 2 HPA-398.

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

### Task 9: Finish Outdoor Acceptance

**Files:**
- Modify tests only for concrete regressions discovered during acceptance.
- Update PR description with observed results.

- [ ] **Step 1:** Walk the complete route:

```text
Sundrop Village
→ Crossroads
→ Tidewatch Coast → Crossroads
→ Mistfen → Crossroads
→ Silverpine → Crossroads
→ Wildwood → Crossroads
→ Sundrop Village
```

Cross every connector mouth both directions.

- [ ] **Step 2:** Exercise one representative existing route/reward/encounter/discovery per destination; confirm live objects and authoritative collision remain intact.
- [ ] **Step 3:** Exercise one missing-base texture, one missing-foreground texture, and backgrounds-disabled mode; confirm the correct blocker/decor/fence fallback returns.
- [ ] **Step 4:** Save/reload once at an outdoor checkpoint; verify player position/progression and relevant collected/cleared state.
- [ ] **Step 5:** Run packaged/current-native acceptance and record approximate startup/background-load plus steady-state frame-time observations. Native failure after Chromium success creates a measured load-management ticket; do not add ad hoc streaming here.
- [ ] **Step 6:** Run final gates:

```bash
bun run test:unit -- --run
bun run test:e2e
bun run check
bun run lint
bun run build
bun run build:tauri
```

- [ ] **Step 7:** Final diff review: no geometry/art redesign, no adapter/runtime-package/dependency/loading framework, no temporary print/debug code, all 22 exports registered, and `MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS` unchanged from PR 1.

---

## Self-Review

### Spec coverage

- Texture stop/go gate: Task 1.
- Complete adapter deletion + retained manual validator: Task 2.
- Draw order: Task 3.
- One fallback visibility semantic + full HPA-399-sealed owner projection: Task 4.
- PR-1 direct assets and structural preload contract: Task 5.
- Post-merge composition + renderer/e2e: Task 6.
- PR-1 controller/fallback/save/native proof: Task 7.
- Remaining assets without owner reassignment: Task 8.
- Full outdoor acceptance: Task 9.

### Consistent names

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

### Highest-cost gate

Incorrect owner assignment can create duplicated baked+live art or invisible collision. The plan now fixes owners from HPA-399’s sealed `primaryRegionId`/disposition contract and the crop contract’s `sourceRegionIds` before PR-1 texture activation. Geometry can invalidate that projection but cannot choose another crop, and PR 2 cannot change the table.

No task introduces a generic framework for future maps, load strategies, story handoffs, or additional approval machinery.