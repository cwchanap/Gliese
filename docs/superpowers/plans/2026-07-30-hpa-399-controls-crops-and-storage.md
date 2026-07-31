# HPA-399 Controls, Crops, and Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete source-derived `meadow-entry` authoring contract: semantic provenance, bake/fallback ownership, exact crop and overlap tables, runtime coverage accounting, deterministic controls, and a verified Git LFS storage path.

**Architecture:** Keep the assembled TypeScript map and collision helpers authoritative. Add authoring-only registries and pure geometry helpers above the live map, then derive fixed SVG/JSON controls and fingerprints from those registries. Select Git LFS before any production art, prove local and CI materialization with a canary, and block the visual-master PR until all crop, coverage, ownership, predecessor, and storage gates pass.

**Tech Stack:** TypeScript 6, Bun, Vitest, Sharp 0.35.3, SVG/JSON generation, Git LFS, GitHub Actions, Prettier, ESLint, Svelte/Vite, Tauri 2.

## Global Constraints

- Start from `main` after PR #17 is merged. Create `codex/hpa-399-controls-crops-storage` in an isolated worktree through `superpowers:using-git-worktrees`.
- Do not change Linear status or post detailed Linear evidence without separate user authorization.
- Preserve `meadowEntryMap`, all region fragments, collision geometry, save normalization, encounter geometry, and live semantic objects as gameplay truth.
- The world is exactly `6400×6400`; valid crop bounds obey `0 ≤ left < right ≤ 6400` and `0 ≤ top < bottom ≤ 6400`.
- Control rasterization uses raw center-based edges followed by `floor(left/top)` and `ceil(right/bottom)`.
- Crop edges are integers aligned to `32px`. `MEADOW_ENTRY_MIN_HANDOFF_PX` is exactly `128`.
- `sundrop-village-underlay` is exactly `{ left: 256, top: 4352, right: 2048, bottom: 5888 }` and is never expanded.
- Every required baked source must be covered by at least one runtime base crop. Every intentionally uncovered area must be declared `fallback-tile` with a reviewed reason.
- Hand-authored `reviewBounds` are spatial partitions, not raw fragment bounding boxes. Audit cross-region outliers explicitly.
- Every `pathsRegion` source has one exact connector primary owner. Include inline `meadowBoundsRegion` sources in every completeness and fingerprint pass.
- HPA-399 does not implement runtime `MapDecor` or fence suppression. Every baked decor/fence entry must carry an explicit HPA-406 runtime obligation; otherwise classify it `protected-live`.
- Preserve HPA-307 and HPA-398 tools, approvals, generated fingerprints, production PNGs, and evidence directories byte-for-byte.
- Select Git LFS (`Mode A`) in this PR. If the LFS canary cannot be pushed, materialized, and verified in CI, stop and return to design review; do not silently switch storage modes or commit full PNG blobs to ordinary Git.
- Do not add production masters, regional exports, or native-resolution proof PNGs in this PR.
- Commands below use `rtk` consistently with existing HPA plans. Run from the repository root unless noted.

## File Structure

### New focused modules

- `src/lib/game/content/backgrounds/meadow-entry-authoring-types.ts` — shared source, bounds, region, disposition, crop, overlap, coverage, storage, and fingerprint types.
- `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.ts` — raw bounds conversion, rasterization, snapping, clamping, intersections, containment, union area, and overlap helpers.
- `src/lib/game/content/backgrounds/meadow-entry-storage.ts` — checked-in Git LFS storage contract and pure validation.
- `src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts` — canonical source-fragment catalog and exact source lookup.
- `src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts` — hand-authored region partitions, `pathsRegion` ownership, cross-region attachments, and outlier declarations.
- `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts` — explicit per-source bake/fallback disposition and HPA-406 runtime obligation.
- `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts` — approved crops, edge clamps, overlaps, route mouths, corner groups, runtime baked/fallback coverage, filenames, texture keys, draw order, and computed budgets.
- `src/lib/game/content/backgrounds/meadow-entry-controls.ts` — deterministic control inputs, stable serialization, SVG/JSON renderers, source/authoring/combined fingerprints, and fixed inventory.
- `src/lib/game/content/generated/meadow-entry-art-control.ts` — generated combined control fingerprint.
- `src/lib/game/content/approvals/meadow-entry-controls.ts` — reviewed control/crop/storage approval data.
- `tools/propose-meadow-entry-authoring-layout.ts` — source inventory, outlier, partition, candidate crop, handoff, corner, and coverage proposal report.
- `tools/export-meadow-entry-art-controls.ts` — fixed-inventory deterministic control exporter with write and `--check` modes.
- `tools/approve-meadow-entry-controls.ts` — writes reviewed approval data from generated artifacts after explicit review.
- `tools/verify-meadow-entry-art-storage.ts` — Git LFS prerequisite, pointer, object, and materialization verifier.
- `artifacts/meadow-entry/hpa-399/lfs-canary.png` — one-pixel LFS-tracked canary used only to prove storage.
- `docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md` — final PR-1 evidence.

### New tests

- `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-storage.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-controls.test.ts`
- `src/lib/game/content/meadow-entry-controls.asset.test.ts`

### Existing files changed in place

- `.gitattributes`
- `.gitignore`
- `.github/workflows/ci.yml`
- `package.json`
- `src/lib/game/content/maps/meadow-entry.ts`

### Generated compact evidence

`docs/superpowers/reports/img/hpa-399/controls/` contains only:

```text
meadow-entry-control-manifest.json
meadow-entry-composite-control.svg
meadow-entry-terrain-path-mask.svg
meadow-entry-region-mask.svg
meadow-entry-collision-mask.svg
meadow-entry-building-footprint-mask.svg
meadow-entry-entrance-transition-mask.svg
meadow-entry-encounter-combat-mask.svg
meadow-entry-reward-discovery-mask.svg
meadow-entry-semantic-anchor-mask.svg
meadow-entry-protected-live-mask.svg
meadow-entry-forbidden-tall-mask.svg
meadow-entry-foreground-eligible-mask.svg
meadow-entry-handoff-mask.svg
meadow-entry-runtime-base-coverage-mask.svg
meadow-entry-runtime-fallback-coverage-mask.svg
meadow-entry-bake-ownership.json
meadow-entry-crop-manifest.json
```

---

### Task 1: Bootstrap and Prove Git LFS Storage

**Files:**

- Create: `.gitattributes`
- Modify: `.gitignore`
- Create: `src/lib/game/content/backgrounds/meadow-entry-storage.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-storage.test.ts`
- Create: `tools/verify-meadow-entry-art-storage.ts`
- Create: `artifacts/meadow-entry/hpa-399/lfs-canary.png`
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**

- Consumes: repository root, Git LFS executable, Git index, materialized working tree.
- Produces:

```ts
export const MEADOW_ENTRY_ART_STORAGE = {
  mode: 'git-lfs',
  assetPattern: 'artifacts/meadow-entry/hpa-399/**/*.png',
  proofPattern: 'docs/superpowers/reports/img/hpa-399/proofs/**/*.png',
  canaryPath: 'artifacts/meadow-entry/hpa-399/lfs-canary.png'
} as const;

export function validateMeadowEntryStorageContract(
  contract: typeof MEADOW_ENTRY_ART_STORAGE
): void;
```

- [ ] **Step 1: Write the failing pure storage-contract test**

```ts
import { describe, expect, it } from 'vitest';
import {
  MEADOW_ENTRY_ART_STORAGE,
  validateMeadowEntryStorageContract
} from './meadow-entry-storage';

describe('meadow-entry art storage', () => {
  it('locks masters, exports, and native proofs to Git LFS', () => {
    expect(() => validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE)).not.toThrow();
    expect(MEADOW_ENTRY_ART_STORAGE).toEqual({
      mode: 'git-lfs',
      assetPattern: 'artifacts/meadow-entry/hpa-399/**/*.png',
      proofPattern: 'docs/superpowers/reports/img/hpa-399/proofs/**/*.png',
      canaryPath: 'artifacts/meadow-entry/hpa-399/lfs-canary.png'
    });
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-storage.test.ts
```

Expected: FAIL because `meadow-entry-storage.ts` does not exist.

- [ ] **Step 3: Implement the storage contract and repository attributes**

Create `.gitattributes`:

```gitattributes
artifacts/meadow-entry/hpa-399/**/*.png filter=lfs diff=lfs merge=lfs -text
docs/superpowers/reports/img/hpa-399/proofs/**/*.png filter=lfs diff=lfs merge=lfs -text
```

Add to `.gitignore`:

```gitignore
# HPA-399 unapproved local art work
artifacts/meadow-entry/hpa-399/candidates/
artifacts/meadow-entry/hpa-399/work/
```

Implement `meadow-entry-storage.ts` with the exact constant above and reject any mode, pattern, or canary drift.

- [ ] **Step 4: Generate and track the one-pixel canary through LFS**

```bash
rtk git lfs install
rtk bun --eval "import sharp from 'sharp'; await sharp({create:{width:1,height:1,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile('artifacts/meadow-entry/hpa-399/lfs-canary.png')"
rtk git add .gitattributes .gitignore artifacts/meadow-entry/hpa-399/lfs-canary.png
rtk git lfs ls-files --name-only | grep -Fx artifacts/meadow-entry/hpa-399/lfs-canary.png
```

Expected: the exact canary path is printed.

- [ ] **Step 5: Implement the integration verifier**

`tools/verify-meadow-entry-art-storage.ts` must execute and check:

```text
git lfs version
git check-attr filter -- <canary path>        => filter: lfs
git lfs ls-files --name-only                  => contains the canary
git lfs fsck                                  => success
git show :<canary path>                       => starts with version https://git-lfs.github.com/spec/v1
working-tree canary bytes                     => start with the eight-byte PNG signature
working-tree canary Sharp metadata            => width=1, height=1
```

Exit non-zero with a path-specific message when any prerequisite, pointer, object, or materialized PNG is missing.

Add:

```json
"art:storage:meadow-entry": "bun tools/verify-meadow-entry-art-storage.ts"
```

- [ ] **Step 6: Enable LFS materialization in every CI checkout and add the storage gate**

Change each `actions/checkout@v4` step to:

```yaml
- uses: actions/checkout@v4
  with:
    lfs: true
```

In `build-and-lint`, after dependency installation, add:

```yaml
- name: Verify meadow-entry art storage
  run: bun run art:storage:meadow-entry
```

- [ ] **Step 7: Run the storage and unit gates**

```bash
rtk bun run art:storage:meadow-entry
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-storage.test.ts
rtk git lfs fsck
```

Expected: all pass and the canary remains an LFS pointer in Git but a one-pixel PNG in the working tree.

- [ ] **Step 8: Commit**

```bash
rtk git add \
  .gitattributes .gitignore .github/workflows/ci.yml package.json \
  src/lib/game/content/backgrounds/meadow-entry-storage.ts \
  src/lib/game/content/backgrounds/meadow-entry-storage.test.ts \
  tools/verify-meadow-entry-art-storage.ts \
  artifacts/meadow-entry/hpa-399/lfs-canary.png
rtk git commit -m "build(hpa-399): bootstrap meadow-entry Git LFS storage"
```

Stop the plan here if a pushed branch cannot materialize the canary in GitHub Actions.

---

### Task 2: Add Shared Authoring Geometry and Rasterization

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-authoring-types.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts`

**Interfaces:**

- Consumes: `MapRect` from `maps/types.ts`.
- Produces:

```ts
export interface RawPixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type PixelBounds = RawPixelBounds;
export type WorldEdge = 'left' | 'right' | 'top' | 'bottom';
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const MEADOW_ENTRY_WORLD_BOUNDS: PixelBounds;
export const MEADOW_ENTRY_TILE_SIZE_PX = 32;
export const MEADOW_ENTRY_MIN_HANDOFF_PX = 128;

export function toRawPixelBounds(rect: MapRect): RawPixelBounds;
export function rasterizeCoverageBounds(raw: RawPixelBounds): PixelBounds;
export function snapBoundsOutward(bounds: RawPixelBounds, gridPx?: number): PixelBounds;
export function clampBoundsToWorld(bounds: PixelBounds): {
  bounds: PixelBounds;
  clampedSides: readonly WorldEdge[];
};
export function intersectBounds(left: PixelBounds, right: PixelBounds): PixelBounds | null;
export function containsBounds(container: PixelBounds, contained: PixelBounds): boolean;
export function boundsArea(bounds: PixelBounds): number;
export function unionArea(bounds: readonly PixelBounds[]): number;
```

- [ ] **Step 1: Write failing geometry tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  clampBoundsToWorld,
  rasterizeCoverageBounds,
  snapBoundsOutward,
  toRawPixelBounds,
  unionArea
} from './meadow-entry-authoring-geometry';

describe('meadow-entry authoring geometry', () => {
  it('preserves odd-sized source coverage with floor/ceil', () => {
    const raw = toRawPixelBounds({ id: 'odd', x: 10, y: 20, width: 5, height: 7 });
    expect(raw).toEqual({ left: 7.5, top: 16.5, right: 12.5, bottom: 23.5 });
    expect(rasterizeCoverageBounds(raw)).toEqual({ left: 7, top: 16, right: 13, bottom: 24 });
  });

  it('allows right and bottom edges equal to 6400', () => {
    expect(clampBoundsToWorld({ left: 6272, top: 6272, right: 6528, bottom: 6528 })).toEqual({
      bounds: { left: 6272, top: 6272, right: 6400, bottom: 6400 },
      clampedSides: ['right', 'bottom']
    });
  });

  it('computes union area without double-counting overlaps', () => {
    expect(
      unionArea([
        { left: 0, top: 0, right: 32, bottom: 32 },
        { left: 16, top: 0, right: 48, bottom: 32 }
      ])
    ).toBe(48 * 32);
  });

  it('snaps candidate crops outward to the tile grid', () => {
    expect(snapBoundsOutward({ left: 33, top: 65, right: 127, bottom: 159 })).toEqual({
      left: 32,
      top: 64,
      right: 128,
      bottom: 160
    });
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts
```

Expected: FAIL because the geometry module does not exist.

- [ ] **Step 3: Implement the pure helpers**

Use a vertical sweep for `unionArea`: sort unique x edges, merge y intervals in each x strip, and sum strip area. Validate finite numbers, positive area, and world bounds in exported public validators.

- [ ] **Step 4: Run tests**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/game/content/backgrounds/meadow-entry-authoring-{types,geometry}.ts \
  src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts
rtk git commit -m "feat(hpa-399): add authoring geometry contracts"
```

---

### Task 3: Build the Canonical Source Catalog

**Files:**

- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts`

**Interfaces:**

- Consumes: all seven region fragments, exported `meadowBoundsRegion`, `meadowEntryMap`, and map source types.
- Produces:

```ts
export type MeadowEntrySourceType =
  | 'ground-patch'
  | 'blocker'
  | 'decor'
  | 'fence'
  | 'landmark'
  | 'transition'
  | 'npc'
  | 'ambient-npc'
  | 'pickup'
  | 'encounter'
  | 'combat-bounds'
  | 'discovery';

export interface MeadowEntrySourceRef {
  sourceType: MeadowEntrySourceType;
  sourceId: string;
}

export interface MeadowEntrySourceRecord {
  ref: MeadowEntrySourceRef;
  fragmentId:
    | 'village'
    | 'wildwood'
    | 'mistfen'
    | 'silverpine'
    | 'coast'
    | 'crossroads'
    | 'paths'
    | 'outer-boundary';
  bounds: RawPixelBounds | null;
  visualCapable: boolean;
}

export function meadowEntrySourceKey(ref: MeadowEntrySourceRef): string;
export function collectMeadowEntrySourceCatalog(): readonly MeadowEntrySourceRecord[];
export function resolveMeadowEntrySource(ref: MeadowEntrySourceRef): MeadowEntrySourceRecord;
```

- [ ] **Step 1: Export the inline boundary fragment without changing runtime behavior**

Change:

```ts
const meadowBoundsRegion: RegionFragment = {
```

to:

```ts
export const meadowBoundsRegion: RegionFragment = {
```

No other `meadow-entry.ts` behavior changes.

- [ ] **Step 2: Write failing catalog tests**

```ts
import { describe, expect, it } from 'vitest';
import { collectMeadowEntrySourceCatalog, resolveMeadowEntrySource } from './meadow-entry-source-catalog';

describe('meadow-entry source catalog', () => {
  it('contains unique kind-qualified references for every source', () => {
    const catalog = collectMeadowEntrySourceCatalog();
    const keys = catalog.map(({ ref }) => `${ref.sourceType}:${ref.sourceId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('includes inline meadowBoundsRegion sources', () => {
    expect(
      resolveMeadowEntrySource({
        sourceType: 'ground-patch',
        sourceId: 'sundrop-southwest-ocean-patch'
      }).fragmentId
    ).toBe('outer-boundary');
    expect(
      resolveMeadowEntrySource({
        sourceType: 'blocker',
        sourceId: 'meadow-east-boundary'
      }).fragmentId
    ).toBe('outer-boundary');
  });

  it('preserves source-fragment provenance lost by mergeRegions', () => {
    expect(
      resolveMeadowEntrySource({
        sourceType: 'ground-patch',
        sourceId: 'sundrop-forest-road-east'
      }).fragmentId
    ).toBe('wildwood');
  });
});
```

- [ ] **Step 3: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts
```

- [ ] **Step 4: Implement the catalog**

Define one checked-in fragment table importing the exact region exports. Flatten each field into `MeadowEntrySourceRecord`; use `toRawPixelBounds` for rectangles and `null` only for point-like records. Verify every catalog item resolves to a matching item in assembled `meadowEntryMap`.

- [ ] **Step 5: Run focused and map tests**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
  src/lib/game/content/maps.test.ts
```

Expected: PASS with no map-content changes.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts
rtk git commit -m "feat(hpa-399): catalog meadow-entry source provenance"
```

---

### Task 4: Freeze Authoring Partitions and Cross-Region Ownership

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts`
- Create: `tools/propose-meadow-entry-authoring-layout.ts`
- Generate: `docs/superpowers/reports/img/hpa-399/controls/meadow-entry-layout-proposal.json`
- Generate: `docs/superpowers/reports/img/hpa-399/controls/meadow-entry-layout-proposal.svg`

**Interfaces:**

- Consumes: canonical source catalog and geometry helpers.
- Produces:

```ts
export type MeadowEntryAuthoringRegionId =
  | 'sundrop-village'
  | 'crossroads'
  | 'tidewatch-coast'
  | 'mistfen'
  | 'silverpine'
  | 'wildwood'
  | 'connector-village-crossroads'
  | 'connector-crossroads-coast'
  | 'connector-crossroads-mistfen'
  | 'connector-crossroads-silverpine'
  | 'connector-crossroads-wildwood'
  | 'outer-boundary';

export interface MeadowEntryAuthoringRegion {
  id: MeadowEntryAuthoringRegionId;
  reviewBounds: PixelBounds;
  materialProfile: string;
  neighbors: readonly MeadowEntryAuthoringRegionId[];
}

export interface MeadowEntryCrossRegionCoverage {
  sourceKey: string;
  bounds: readonly PixelBounds[];
  secondaryRegions: readonly MeadowEntryAuthoringRegionId[];
}

export const MEADOW_ENTRY_AUTHORING_REGIONS: readonly MeadowEntryAuthoringRegion[];
export const MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS: Readonly<
  Record<string, MeadowEntryAuthoringRegionId>
>;
export const MEADOW_ENTRY_CROSS_REGION_COVERAGE: readonly MeadowEntryCrossRegionCoverage[];
export function validateMeadowEntryAuthoringLayout(): void;
```

- [ ] **Step 1: Write the proposal tool before the registry**

The tool must emit:

- every source key grouped by fragment;
- raw and raster bounds;
- fragment-envelope diagnostics, never approved as partitions automatically;
- mandatory `paths.ts` primary owners;
- sources crossing a proposed region boundary;
- `sundrop-forest-road-east` as a named outlier;
- uncovered outer-boundary sources;
- an SVG overlay showing source bounds and hand-authored partition candidates.

Run:

```bash
rtk bun tools/propose-meadow-entry-authoring-layout.ts
```

Expected: proposal JSON/SVG are generated without changing runtime source files.

- [ ] **Step 2: Write failing layout tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  MEADOW_ENTRY_CROSS_REGION_COVERAGE,
  MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS,
  validateMeadowEntryAuthoringLayout
} from './meadow-entry-authoring-layout';

describe('meadow-entry authoring layout', () => {
  it('has one primary owner for every source', () => {
    expect(() => validateMeadowEntryAuthoringLayout()).not.toThrow();
  });

  it('owns paths sources by exact connector IDs', () => {
    expect(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS['ground-patch:link-crossroads-coast']).toBe(
      'connector-crossroads-coast'
    );
    expect(MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS['decor:village-corridor-waymarker']).toBe(
      'connector-village-crossroads'
    );
  });

  it('resolves the Wildwood road outlier explicitly', () => {
    const key = 'ground-patch:sundrop-forest-road-east';
    const owner = MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS[key];
    const attachment = MEADOW_ENTRY_CROSS_REGION_COVERAGE.find(({ sourceKey }) => sourceKey === key);
    expect(owner).toBeDefined();
    expect(owner !== 'wildwood' || attachment !== undefined).toBe(true);
  });
});
```

- [ ] **Step 3: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts
```

- [ ] **Step 4: Review and commit exact partitions**

Use the proposal SVG at native world coordinates. For each region, commit an exact `32px`-aligned `reviewBounds` rectangle and explicit source ownership. Resolve each outlier through one of the design-approved actions: containment, cross-region attachment, authoring-only split bounds, re-ownership, or fallback/control-only classification. Do not use a raw fragment envelope as a shortcut.

The review record must explicitly include:

```text
sundrop-forest-road-east
sundrop-southwest-ocean-patch
all corridor-wall-* sources
village-corridor-waymarker
all link-* ground patches
```

- [ ] **Step 5: Run layout and proposal checks**

```bash
rtk bun tools/propose-meadow-entry-authoring-layout.ts
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts
```

Expected: no missing primary owner, no duplicate owner, and every outlier has an explicit resolution.

- [ ] **Step 6: Commit**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts \
  src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
  tools/propose-meadow-entry-authoring-layout.ts \
  docs/superpowers/reports/img/hpa-399/controls/meadow-entry-layout-proposal.{json,svg}
rtk git commit -m "feat(hpa-399): lock meadow-entry authoring partitions"
```

---

### Task 5: Classify Bake, Live, and Runtime-Fallback Ownership

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts`

**Interfaces:**

- Consumes: source catalog, primary owners, shared foreground cutoff inputs, HPA-398 blocker ownership.
- Produces:

```ts
export type MeadowEntryBakeDisposition =
  | { mode: 'base-underlay' }
  | { mode: 'base-static'; margins: Insets; motif: string }
  | {
      mode: 'base-and-foreground';
      baseMargins: Insets;
      foregroundMargins: Insets;
      frontCutoffPx: number;
      motif: string;
    }
  | { mode: 'protected-live'; protectionMargins: Insets; reason: string }
  | { mode: 'runtime-fallback-only'; reason: string }
  | { mode: 'control-only'; reason: string };

export type MeadowEntryRuntimeOwnershipRequirement =
  | 'existing-blocker-fallback'
  | 'extend-decor-fallback'
  | 'extend-fence-fallback'
  | 'remain-live'
  | 'fallback-tile'
  | 'none';

export interface MeadowEntryBakeOwnershipEntry {
  ref: MeadowEntrySourceRef;
  primaryRegionId: MeadowEntryAuthoringRegionId;
  disposition: MeadowEntryBakeDisposition;
  runtimeRequirement: MeadowEntryRuntimeOwnershipRequirement;
}

export const MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX: number;
export const MEADOW_ENTRY_BAKE_OWNERSHIP: readonly MeadowEntryBakeOwnershipEntry[];
export function validateMeadowEntryBakeOwnership(): void;
```

- [ ] **Step 1: Write failing completeness and safety tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  MEADOW_ENTRY_BAKE_OWNERSHIP,
  MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX,
  validateMeadowEntryBakeOwnership
} from './meadow-entry-bake-ownership';
import { SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX } from './sundrop-village-backgrounds';

describe('meadow-entry bake ownership', () => {
  it('classifies every source exactly once', () => {
    expect(() => validateMeadowEntryBakeOwnership()).not.toThrow();
  });

  it('shares the HPA-398 front cutoff', () => {
    expect(MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX).toBe(33);
    expect(MEADOW_ENTRY_FOREGROUND_FRONT_CUTOFF_PX).toBe(
      SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX
    );
  });

  it('requires decor and fence fallback obligations before baking', () => {
    for (const entry of MEADOW_ENTRY_BAKE_OWNERSHIP) {
      if (
        (entry.ref.sourceType === 'decor' || entry.ref.sourceType === 'fence') &&
        (entry.disposition.mode === 'base-static' ||
          entry.disposition.mode === 'base-and-foreground')
      ) {
        expect(entry.runtimeRequirement).toMatch(/^extend-(decor|fence)-fallback$/);
      }
    }
  });

  it('classifies the southwest ocean patch explicitly', () => {
    const entry = MEADOW_ENTRY_BAKE_OWNERSHIP.find(
      ({ ref }) =>
        ref.sourceType === 'ground-patch' && ref.sourceId === 'sundrop-southwest-ocean-patch'
    );
    expect(['base-underlay', 'runtime-fallback-only']).toContain(entry?.disposition.mode);
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts
```

- [ ] **Step 3: Implement the exact registry**

Generate one checked-in entry per catalog source. Use explicit source keys in stable sorted order. Non-visual semantic entries are `control-only`; live buildings, transitions, NPCs, pickups, discoveries, and stateful/animated visuals are `protected-live`; ground patches are explicitly `base-underlay` or `runtime-fallback-only`; blockers/decor/fences require individual reviewed decisions.

For translucent Mistfen fog, use `protected-live` unless the same entry has an accepted `extend-decor-fallback` obligation and explicit foreground eligibility. Never place translucent fog in base alpha.

- [ ] **Step 4: Run ownership tests**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
```

Expected: all sources classified once and all predecessor tests unchanged.

- [ ] **Step 5: Commit**

```bash
rtk git add src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts
rtk git commit -m "feat(hpa-399): classify meadow-entry bake ownership"
```

---

### Task 6: Freeze Crops, Overlaps, Clamps, Corners, and Runtime Coverage

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts`
- Modify: `tools/propose-meadow-entry-authoring-layout.ts`

**Interfaces:**

- Consumes: authoring partitions, cross-region coverage, bake ownership, geometry helpers.
- Produces:

```ts
export type MeadowEntryCropDerivation =
  | { mode: 'expanded-review-bounds'; expansionPx: 128 }
  | { mode: 'exact-bounds' };

export interface MeadowEntryApprovedCrop {
  id: string;
  derivation: MeadowEntryCropDerivation;
  reviewBounds: PixelBounds;
  coverageAttachments: readonly PixelBounds[];
  preClampBounds: PixelBounds;
  edgeClamp: { sides: readonly WorldEdge[]; reason: string } | null;
  bounds: PixelBounds;
  expectedDimensions: { width: number; height: number };
  baseFilename: string;
  foregroundFilename: string | null;
  textureKeys: { base: string; foreground: string | null };
  drawOrder: number;
  sourceRegionIds: readonly MeadowEntryAuthoringRegionId[];
  neighborIds: readonly string[];
  overlapIds: readonly string[];
  alphaPolicy: {
    base: 'opaque';
    foreground: 'sparse-eligible-mask' | null;
  };
  sizeBudgets: {
    baseReviewBytes: number;
    baseHardBytes: number;
    foregroundReviewBytes: number | null;
    foregroundHardBytes: number | null;
  };
}

export interface MeadowEntryOverlap {
  id: string;
  firstCropId: string;
  secondCropId: string;
  bounds: PixelBounds;
  routeMouth: { sharedAxis: 'x' | 'y'; bounds: PixelBounds };
  minimumSharedPixels: 128;
  planePolicy: 'base-only' | 'base-and-foreground';
  ownerCropId: string;
  cornerGroupId?: string;
}

export type MeadowEntryRuntimeCoverage =
  | { mode: 'baked'; bounds: PixelBounds; cropIds: readonly string[] }
  | { mode: 'fallback-tile'; bounds: PixelBounds; reason: string };

export interface MeadowEntryCropBudgetSummary {
  exportAreaRatio: number;
  overlapArea: number;
  aggregateBaseReviewBytes: number;
  aggregateBaseHardBytes: number;
  aggregateForegroundReviewBytes: number;
  aggregateForegroundHardBytes: number;
}

export const MEADOW_ENTRY_APPROVED_CROPS: readonly MeadowEntryApprovedCrop[];
export const MEADOW_ENTRY_APPROVED_OVERLAPS: readonly MeadowEntryOverlap[];
export const MEADOW_ENTRY_RUNTIME_COVERAGE: readonly MeadowEntryRuntimeCoverage[];
export const MEADOW_ENTRY_CROP_BUDGET_SUMMARY: MeadowEntryCropBudgetSummary;
export function validateMeadowEntryCropContract(): void;
```

- [ ] **Step 1: Write failing contract tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  MEADOW_ENTRY_APPROVED_CROPS,
  MEADOW_ENTRY_APPROVED_OVERLAPS,
  validateMeadowEntryCropContract
} from './meadow-entry-crop-manifest';

describe('meadow-entry crop contract', () => {
  it('validates exact crops, overlaps, clamps, corners, budgets, and coverage', () => {
    expect(() => validateMeadowEntryCropContract()).not.toThrow();
  });

  it('keeps the Sundrop underlay exact and base-only', () => {
    const crop = MEADOW_ENTRY_APPROVED_CROPS.find(({ id }) => id === 'sundrop-village-underlay')!;
    expect(crop.derivation).toEqual({ mode: 'exact-bounds' });
    expect(crop.bounds).toEqual({ left: 256, top: 4352, right: 2048, bottom: 5888 });
    expect(crop.foregroundFilename).toBeNull();
    expect(crop.sizeBudgets).toMatchObject({
      baseReviewBytes: 4 * 1024 * 1024,
      baseHardBytes: 8 * 1024 * 1024
    });
  });

  it('declares every edge clamp and compares post-clamp bounds', () => {
    for (const crop of MEADOW_ENTRY_APPROVED_CROPS) {
      if (crop.edgeClamp) {
        expect(crop.edgeClamp.sides.length).toBeGreaterThan(0);
        expect(crop.edgeClamp.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it('provides 128px on the declared shared axis at every route mouth', () => {
    for (const overlap of MEADOW_ENTRY_APPROVED_OVERLAPS) {
      const sharedPixels =
        overlap.routeMouth.sharedAxis === 'x'
          ? overlap.bounds.right - overlap.bounds.left
          : overlap.bounds.bottom - overlap.bounds.top;
      expect(sharedPixels).toBeGreaterThanOrEqual(overlap.minimumSharedPixels);
    }
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts
```

- [ ] **Step 3: Generate candidate crops from reviewed partitions**

Extend the proposal tool to:

1. expand reviewed bounds and attachments by `128`;
2. snap outward to `32`;
3. record pre-clamp bounds;
4. clamp only declared world edges;
5. calculate intersections, route-mouth axes and widths, triple intersections, crop-union area, overlap area, aggregate budgets, and uncovered baked source extents;
6. propose base-only `outer-boundary-*` crops when a baked source or camera-visible reviewed edge is otherwise uncovered.

Run:

```bash
rtk bun tools/propose-meadow-entry-authoring-layout.ts
```

- [ ] **Step 4: Commit the exact reviewed tables**

Copy the reviewed post-clamp candidates into `MEADOW_ENTRY_APPROVED_CROPS`; add every pairwise overlap and every non-empty triple intersection with `cornerGroupId`. Declare fallback-tile coverage only where the current tilemap is intentionally retained. Every baked source must name at least one containing crop.

Use exact stable API conventions:

```text
filename: <crop-id>-base.png / <crop-id>-foreground.png
texture:  meadow-entry-<crop-id>-base / meadow-entry-<crop-id>-foreground
```

Use the design’s plane-scoped draw-order ranges: underlay `0`, optional edge crops `10..90`, connectors `100..140`, destination regions `200..240`.

- [ ] **Step 5: Run crop and coverage tests**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts
```

Expected: zero unexplained runtime coverage area, every baked source covered, all route mouths ≥128px on their declared axes, all corners declared, and aggregate budgets equal the sum of per-crop budgets.

- [ ] **Step 6: Commit**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
  tools/propose-meadow-entry-authoring-layout.ts \
  docs/superpowers/reports/img/hpa-399/controls/meadow-entry-layout-proposal.{json,svg}
rtk git commit -m "feat(hpa-399): freeze meadow-entry crop and coverage contract"
```

---

### Task 7: Generate Deterministic Full-Map Controls and Fingerprints

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-controls.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-controls.test.ts`
- Create: `tools/export-meadow-entry-art-controls.ts`
- Create: `src/lib/game/content/generated/meadow-entry-art-control.ts`
- Generate: fixed control inventory under `docs/superpowers/reports/img/hpa-399/controls/`

**Interfaces:**

- Consumes: source catalog, layout, ownership, crop/coverage contract, collision collectors, HPA-307/HPA-398 fingerprints and hashes.
- Produces:

```ts
export interface MeadowEntryControlInputs {
  mapId: 'meadow-entry';
  worldBounds: PixelBounds;
  tileSizePx: 32;
  playerCollisionRadiusPx: 12;
  foregroundFrontCutoffPx: 33;
  sourceCatalog: readonly MeadowEntrySourceRecord[];
  authoringRegions: readonly MeadowEntryAuthoringRegion[];
  primarySourceOwners: Readonly<Record<string, MeadowEntryAuthoringRegionId>>;
  crossRegionCoverage: readonly MeadowEntryCrossRegionCoverage[];
  bakeOwnership: readonly MeadowEntryBakeOwnershipEntry[];
  crops: readonly MeadowEntryApprovedCrop[];
  overlaps: readonly MeadowEntryOverlap[];
  runtimeCoverage: readonly MeadowEntryRuntimeCoverage[];
  cropBudgetSummary: MeadowEntryCropBudgetSummary;
  strictCollisionRects: readonly PixelBounds[];
  landmarkCollisionRects: readonly PixelBounds[];
  protectedRects: readonly PixelBounds[];
  predecessor: {
    hpa307ArtifactHashes: Readonly<Record<string, string>>;
    hpa398ControlFingerprint: string;
    hpa398BaseSha256: string;
    hpa398ForegroundSha256: string;
  };
  storage: typeof MEADOW_ENTRY_ART_STORAGE;
  sourceFileHashes: Readonly<Record<string, string>>;
}

export const MEADOW_ENTRY_CONTROL_FILENAMES: readonly string[];
export function buildMeadowEntryControlInputs(): MeadowEntryControlInputs;
export function renderMeadowEntryControls(
  inputs: MeadowEntryControlInputs
): Readonly<Record<string, string>>;
export function computeMeadowEntryGameplaySourceFingerprint(
  inputs: MeadowEntryControlInputs
): string;
export function computeMeadowEntryAuthoringContractFingerprint(
  inputs: MeadowEntryControlInputs
): string;
export function computeMeadowEntryCombinedControlFingerprint(
  inputs: MeadowEntryControlInputs
): string;
```

- [ ] **Step 1: Write failing deterministic-control tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  MEADOW_ENTRY_CONTROL_FILENAMES,
  buildMeadowEntryControlInputs,
  computeMeadowEntryCombinedControlFingerprint,
  renderMeadowEntryControls
} from './meadow-entry-controls';

describe('meadow-entry controls', () => {
  it('renders the fixed inventory deterministically', () => {
    const inputs = buildMeadowEntryControlInputs();
    const first = renderMeadowEntryControls(inputs);
    const second = renderMeadowEntryControls(inputs);
    expect(Object.keys(first).sort()).toEqual([...MEADOW_ENTRY_CONTROL_FILENAMES].sort());
    expect(second).toEqual(first);
  });

  it('creates a 64-character combined fingerprint', () => {
    expect(computeMeadowEntryCombinedControlFingerprint(buildMeadowEntryControlInputs())).toMatch(
      /^[0-9a-f]{64}$/
    );
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-controls.test.ts
```

- [ ] **Step 3: Implement canonical inputs and renderers**

Follow the existing HPA-398 stable serializer and SHA-256 pattern. Hash sorted kind-qualified sources, source file hashes, layout, ownership, crops, overlaps, route mouths, coverage, storage configuration, budgets, HPA-398 approvals, and required HPA-307 historical hashes.

All SVGs use `viewBox="0 0 6400 6400"`. Render raw/raster source metadata in JSON and rasterized integer bounds in masks. Render separate baked and fallback coverage masks.

- [ ] **Step 4: Implement write and check modes**

The exporter must:

- reject writes outside the exact inventory;
- render all outputs in memory first;
- in normal mode, write to a temporary directory and atomically replace the generated controls;
- in `--check` mode, compare rendered bytes with every checked-in output and fail without writing;
- update only `src/lib/game/content/generated/meadow-entry-art-control.ts` with the combined fingerprint in normal mode;
- compare the generated module in `--check` mode;
- refuse to write HPA-307/HPA-398 paths.

- [ ] **Step 5: Run tests and prove repeated output identity**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-controls.test.ts
rtk bun tools/export-meadow-entry-art-controls.ts
find docs/superpowers/reports/img/hpa-399/controls -type f -print0 | sort -z | \
  xargs -0 sha256sum > /tmp/hpa399-controls.before
sha256sum src/lib/game/content/generated/meadow-entry-art-control.ts >> /tmp/hpa399-controls.before
rtk bun tools/export-meadow-entry-art-controls.ts
find docs/superpowers/reports/img/hpa-399/controls -type f -print0 | sort -z | \
  xargs -0 sha256sum > /tmp/hpa399-controls.after
sha256sum src/lib/game/content/generated/meadow-entry-art-control.ts >> /tmp/hpa399-controls.after
rtk diff -u /tmp/hpa399-controls.before /tmp/hpa399-controls.after
rtk bun tools/export-meadow-entry-art-controls.ts --check
```

Expected: no hash diff and `--check` passes.

- [ ] **Step 6: Commit**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-controls.ts \
  src/lib/game/content/backgrounds/meadow-entry-controls.test.ts \
  src/lib/game/content/generated/meadow-entry-art-control.ts \
  tools/export-meadow-entry-art-controls.ts \
  docs/superpowers/reports/img/hpa-399/controls
rtk git commit -m "feat(hpa-399): generate full meadow-entry controls"
```

---

### Task 8: Add Reviewed Approval and One-Command Validation

**Files:**

- Create: `src/lib/game/content/approvals/meadow-entry-controls.ts`
- Create: `src/lib/game/content/meadow-entry-controls.asset.test.ts`
- Create: `tools/approve-meadow-entry-controls.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: generated control fingerprint and fixed generated artifacts.
- Produces:

```ts
export interface MeadowEntryControlsApproval {
  combinedControlFingerprint: string;
  cropManifestSha256: string;
  bakeOwnershipSha256: string;
  storageMode: 'git-lfs';
  storageConfigurationSha256: string;
  evidencePath: 'docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md';
}

export const meadowEntryControlsApproval: MeadowEntryControlsApproval;
```

- [ ] **Step 1: Write the failing asset/approval test**

```ts
import { describe, expect, it } from 'vitest';
import { MEADOW_ENTRY_ART_CONTROL_FINGERPRINT } from './generated/meadow-entry-art-control';
import { meadowEntryControlsApproval } from './approvals/meadow-entry-controls';

describe('meadow-entry control approval', () => {
  it('matches the reviewed generated fingerprint', () => {
    expect(meadowEntryControlsApproval.combinedControlFingerprint).toBe(
      MEADOW_ENTRY_ART_CONTROL_FINGERPRINT
    );
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/meadow-entry-controls.asset.test.ts
```

- [ ] **Step 3: Add scripts**

Add:

```json
"art:controls:meadow-entry": "bun tools/export-meadow-entry-art-controls.ts",
"art:approve:meadow-entry-controls": "bun tools/approve-meadow-entry-controls.ts",
"art:validate:meadow-entry-controls": "bun run art:storage:meadow-entry && bun tools/export-meadow-entry-art-controls.ts --check && bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts src/lib/game/content/backgrounds/meadow-entry-storage.test.ts src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts src/lib/game/content/backgrounds/meadow-entry-controls.test.ts src/lib/game/content/meadow-entry-controls.asset.test.ts"
```

- [ ] **Step 4: Perform explicit control review before approval**

Review at native SVG coordinates:

- every region partition and outlier;
- all crop rectangles, edge clamps, overlaps, route mouths, and corner groups;
- baked and fallback coverage masks;
- protected-live and foreground-eligible masks;
- collision, building, entrance, encounter, reward, and anchor controls;
- HPA-398 predecessor overlay bounds and hashes;
- storage canary in CI.

Then run:

```bash
rtk bun run art:approve:meadow-entry-controls -- --reviewed-by "$USER" --reviewed-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

The approval tool reads generated hashes and writes the exact approval module; it never regenerates controls.

- [ ] **Step 5: Run the one-command gate**

```bash
rtk bun run art:validate:meadow-entry-controls
```

Expected: PASS without modifying generated files.

- [ ] **Step 6: Commit**

```bash
rtk git add package.json \
  src/lib/game/content/approvals/meadow-entry-controls.ts \
  src/lib/game/content/meadow-entry-controls.asset.test.ts \
  tools/approve-meadow-entry-controls.ts
rtk git commit -m "test(hpa-399): approve meadow-entry control contract"
```

---

### Task 9: Run Full PR-1 Validation and Write the Evidence Report

**Files:**

- Create: `docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md`

**Interfaces:**

- Consumes: all PR-1 modules, generated controls, approval, LFS canary, repository gates.
- Produces: a reviewable report proving PR 2 may begin.

- [ ] **Step 1: Run the focused deterministic gate from a clean tree**

```bash
rtk git status --short
rtk bun run art:validate:meadow-entry-controls
rtk git diff --exit-code
```

Expected: clean tree after validation.

- [ ] **Step 2: Run repository checks**

```bash
rtk bun run check
rtk bun run lint
rtk bun run test:unit -- --run
rtk bun run build
rtk bun run build:tauri
```

Expected: all pass. Do not claim Tauri packaging unless `bun run tauri build` is also run successfully on a supported host.

- [ ] **Step 3: Re-prove LFS materialization in a fresh clone/worktree**

```bash
rtk git lfs fsck
rtk git lfs ls-files --name-only | grep -Fx artifacts/meadow-entry/hpa-399/lfs-canary.png
rtk bun run art:storage:meadow-entry
```

Record the CI run URL that proves `actions/checkout` materialized the canary.

- [ ] **Step 4: Write the validation report**

The report must include:

- source commit and branch;
- exact generated control fingerprint;
- crop/overlap/coverage table hashes;
- crop count, overlap count, route-mouth count, corner count, `exportAreaRatio`, baked area, fallback area, unexplained area (`0`);
- every edge clamp and fallback-tile reason;
- LFS version, canary pointer/object hashes, and CI materialization result;
- HPA-307/HPA-398 predecessor hashes;
- focused and repository command results;
- native review checklist and reviewer identity/time;
- explicit statement that no production master, export, native proof PNG, or runtime integration is included.

- [ ] **Step 5: Format and verify the report**

```bash
rtk bunx prettier --write docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md
rtk bunx prettier --check docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md
rtk bun run art:validate:meadow-entry-controls
```

- [ ] **Step 6: Commit**

```bash
rtk git add docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md
rtk git commit -m "docs(hpa-399): record controls and storage validation"
```

- [ ] **Step 7: Final PR-1 stop gate**

Do not start the visual-master plan until reviewers approve all of the following:

```text
exact authoring partitions
complete bake/fallback ownership
HPA-406 decor/fence obligations
exact crop/overlap/route-mouth/clamp/corner tables
zero unexplained runtime coverage
Git LFS canary materialized in CI
approved deterministic control fingerprint
clean repository checks
```
