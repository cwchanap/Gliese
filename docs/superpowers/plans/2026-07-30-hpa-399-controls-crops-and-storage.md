# HPA-399 Controls, Crops, and Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete source-derived `meadow-entry` authoring contract: semantic provenance, bake/fallback ownership, exact crops and overlaps, runtime coverage accounting, deterministic controls, and a verified Git LFS storage path.

**Architecture:** Keep the assembled live map and collision helpers authoritative. Add pure geometry and authoring-only registries above them, then deterministically derive controls, masks, fingerprints, budgets, and reviewed crop tables. Select and prove Git LFS before production art. PR 2 remains blocked until every source, outlier, crop, handoff, corner, runtime coverage region, predecessor hash, and storage object passes.

**Tech Stack:** TypeScript 6, Bun, Vitest, Sharp 0.35.3, SVG/JSON generation, Git LFS, GitHub Actions, Prettier, ESLint, Vite, Tauri 2.

## Global Constraints

- Start from `main` after PR #17 merges. Create `codex/hpa-399-controls-crops-storage` in an isolated worktree through `superpowers:using-git-worktrees`.
- Do not change Linear status or post detailed Linear evidence without separate user authorization.
- Preserve map geometry, collision, save normalization, encounters, transitions, pickups, discoveries, landmarks, NPCs, and live semantic behavior.
- World bounds are `0 ≤ left < right ≤ 6400` and `0 ≤ top < bottom ≤ 6400`; crop edges are `32px` aligned.
- Source-mask rasterization uses raw center edges, then `floor(left/top)` and `ceil(right/bottom)`.
- `MEADOW_ENTRY_MIN_HANDOFF_PX = 128`.
- Sundrop underlay is exact `{ left: 256, top: 4352, right: 2048, bottom: 5888 }` and never expanded.
- Hand-authored `reviewBounds` are partitions, not fragment bounding boxes.
- Every source has one exact primary owner. Every cross-region outlier has one typed resolution record.
- Every `pathsRegion` source maps to one explicit connector owner. Include inline `meadowBoundsRegion` sources.
- Every baked source is contained by at least one runtime base crop. Every intentional gap is explicit `fallback-tile` coverage.
- HPA-399 does not implement `MapDecor`/fence fallback. Baked decor/fence entries carry an HPA-406 obligation or remain `protected-live`.
- Preserve all HPA-307/HPA-398 tools, approvals, fingerprints, PNGs, and evidence byte-for-byte.
- Select Git LFS. If the canary cannot be pushed, materialized, and verified in CI, stop for design review; never silently commit PNG blobs through ordinary Git.
- Do not add production masters, regional exports, or native-resolution proof PNGs in this PR.
- Commands use `rtk` and run from repository root unless noted.

## File Structure

### New modules

- `src/lib/game/content/backgrounds/meadow-entry-authoring-types.ts`
- `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.ts`
- `src/lib/game/content/backgrounds/meadow-entry-storage.ts`
- `src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts`
- `src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts`
- `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts`
- `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts`
- `src/lib/game/content/backgrounds/meadow-entry-controls.ts`
- `src/lib/game/content/generated/meadow-entry-art-control.ts`
- `src/lib/game/content/approvals/meadow-entry-controls.ts`
- `tools/propose-meadow-entry-authoring-layout.ts`
- `tools/export-meadow-entry-art-controls.ts`
- `tools/approve-meadow-entry-controls.ts`
- `tools/verify-meadow-entry-art-storage.ts`

### New tests

- `src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-storage.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-controls.test.ts`
- `src/lib/game/content/meadow-entry-controls.asset.test.ts`

### Existing files modified

- `.gitattributes`
- `.gitignore`
- `.github/workflows/ci.yml`
- `package.json`
- `src/lib/game/content/maps/meadow-entry.ts`

### Compact proposal evidence

```text
docs/superpowers/reports/img/hpa-399/proposals/
  meadow-entry-layout-proposal.json
  meadow-entry-layout-proposal.svg
```

Proposal artifacts are review aids, not part of the immutable generated control inventory.

### Fixed generated control inventory

```text
docs/superpowers/reports/img/hpa-399/controls/
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

**Files:** `.gitattributes`, `.gitignore`, `.github/workflows/ci.yml`, `package.json`, new storage module/test/verifier, and `artifacts/meadow-entry/hpa-399/lfs-canary.png`.

**Interfaces:**

```ts
export const MEADOW_ENTRY_ART_STORAGE = {
  mode: 'git-lfs',
  assetPattern: 'artifacts/meadow-entry/hpa-399/**/*.png',
  proofPattern: 'docs/superpowers/reports/img/hpa-399/proofs/**/*.png',
  canaryPath: 'artifacts/meadow-entry/hpa-399/lfs-canary.png'
} as const;

export function validateMeadowEntryStorageContract(
  value: typeof MEADOW_ENTRY_ART_STORAGE
): void;
```

- [ ] **Step 1: Write the failing pure contract test**

```ts
expect(() => validateMeadowEntryStorageContract(MEADOW_ENTRY_ART_STORAGE)).not.toThrow();
expect(MEADOW_ENTRY_ART_STORAGE.mode).toBe('git-lfs');
expect(MEADOW_ENTRY_ART_STORAGE.canaryPath).toBe(
  'artifacts/meadow-entry/hpa-399/lfs-canary.png'
);
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-storage.test.ts
```

- [ ] **Step 3: Add LFS and ignore rules**

```gitattributes
artifacts/meadow-entry/hpa-399/**/*.png filter=lfs diff=lfs merge=lfs -text
docs/superpowers/reports/img/hpa-399/proofs/**/*.png filter=lfs diff=lfs merge=lfs -text
```

```gitignore
artifacts/meadow-entry/hpa-399/candidates/
artifacts/meadow-entry/hpa-399/work/
```

- [ ] **Step 4: Generate and track a transparent one-pixel canary**

```bash
rtk git lfs install
rtk bun --eval "import sharp from 'sharp'; await sharp({create:{width:1,height:1,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).png().toFile('artifacts/meadow-entry/hpa-399/lfs-canary.png')"
rtk git add .gitattributes .gitignore artifacts/meadow-entry/hpa-399/lfs-canary.png
```

- [ ] **Step 5: Implement `art:storage:meadow-entry` verifier**

Verify:

```text
git lfs version
git check-attr filter -- canary => lfs
git lfs ls-files contains canary
git lfs fsck succeeds
index bytes are an LFS pointer
working-tree bytes have PNG signature
Sharp metadata is 1×1
```

- [ ] **Step 6: Enable LFS in every `actions/checkout@v4` and add CI verifier**

```yaml
- uses: actions/checkout@v4
  with:
    lfs: true
```

- [ ] **Step 7: Run gates and commit**

```bash
rtk bun run art:storage:meadow-entry
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-storage.test.ts
rtk git lfs fsck
rtk git add .gitattributes .gitignore .github/workflows/ci.yml package.json \
  src/lib/game/content/backgrounds/meadow-entry-storage.ts \
  src/lib/game/content/backgrounds/meadow-entry-storage.test.ts \
  tools/verify-meadow-entry-art-storage.ts \
  artifacts/meadow-entry/hpa-399/lfs-canary.png
rtk git commit -m "build(hpa-399): bootstrap meadow-entry Git LFS storage"
```

Stop here if the pushed canary does not materialize in GitHub Actions.

---

### Task 2: Add Shared Geometry and Rasterization

**Files:** new authoring types, geometry module, and test.

**Interfaces:**

```ts
export interface RawPixelBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
export type PixelBounds = RawPixelBounds;
export type WorldEdge = 'left' | 'right' | 'top' | 'bottom';
export interface Insets { top: number; right: number; bottom: number; left: number }

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
export function intersectBounds(a: PixelBounds, b: PixelBounds): PixelBounds | null;
export function containsBounds(container: PixelBounds, value: PixelBounds): boolean;
export function boundsArea(bounds: PixelBounds): number;
export function unionArea(bounds: readonly PixelBounds[]): number;
```

- [ ] **Step 1: Write failing exact tests**

```ts
expect(rasterizeCoverageBounds({ left: 7.5, top: 16.5, right: 12.5, bottom: 23.5 }))
  .toEqual({ left: 7, top: 16, right: 13, bottom: 24 });
expect(clampBoundsToWorld({ left: 6272, top: 6272, right: 6528, bottom: 6528 }))
  .toEqual({
    bounds: { left: 6272, top: 6272, right: 6400, bottom: 6400 },
    clampedSides: ['right', 'bottom']
  });
expect(unionArea([
  { left: 0, top: 0, right: 32, bottom: 32 },
  { left: 16, top: 0, right: 48, bottom: 32 }
])).toBe(48 * 32);
```

- [ ] **Step 2: Implement, run, and commit**

Use a vertical sweep for union area and reject non-finite, inverted, or out-of-world public values.

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts
rtk git add src/lib/game/content/backgrounds/meadow-entry-authoring-{types,geometry}.ts \
  src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts
rtk git commit -m "feat(hpa-399): add authoring geometry contracts"
```

---

### Task 3: Build the Canonical Source Catalog

**Files:** export `meadowBoundsRegion` from `meadow-entry.ts`; add source catalog and tests.

**Interfaces:**

```ts
export type MeadowEntrySourceType =
  | 'ground-patch' | 'blocker' | 'decor' | 'fence' | 'landmark'
  | 'transition' | 'npc' | 'ambient-npc' | 'pickup' | 'encounter'
  | 'combat-bounds' | 'discovery';

export interface MeadowEntrySourceRef {
  sourceType: MeadowEntrySourceType;
  sourceId: string;
}

export interface MeadowEntrySourceRecord {
  ref: MeadowEntrySourceRef;
  fragmentId:
    | 'village' | 'wildwood' | 'mistfen' | 'silverpine'
    | 'coast' | 'crossroads' | 'paths' | 'outer-boundary';
  bounds: RawPixelBounds | null;
  visualCapable: boolean;
}

export function meadowEntrySourceKey(ref: MeadowEntrySourceRef): string;
export function collectMeadowEntrySourceCatalog(): readonly MeadowEntrySourceRecord[];
export function resolveMeadowEntrySource(ref: MeadowEntrySourceRef): MeadowEntrySourceRecord;
```

- [ ] **Step 1: Write failing provenance tests**

Assert kind-qualified uniqueness, `sundrop-southwest-ocean-patch` belongs to `outer-boundary`, `meadow-east-boundary` belongs to `outer-boundary`, and `sundrop-forest-road-east` retains fragment provenance `wildwood`.

- [ ] **Step 2: Export the inline fragment and implement catalog**

Change only `const meadowBoundsRegion` to `export const meadowBoundsRegion`. Import exact fragment objects, flatten stable-sorted sources, derive raw bounds, and verify each record resolves against assembled `meadowEntryMap`.

- [ ] **Step 3: Run and commit**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts \
  src/lib/game/content/maps.test.ts
rtk git add src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts
rtk git commit -m "feat(hpa-399): catalog meadow-entry source provenance"
```

---

### Task 4: Freeze Authoring Partitions and Outlier Resolutions

**Files:** authoring layout module/test, proposal tool, compact proposal JSON/SVG.

**Interfaces:**

```ts
export type MeadowEntryAuthoringRegionId =
  | 'sundrop-village' | 'crossroads' | 'tidewatch-coast'
  | 'mistfen' | 'silverpine' | 'wildwood'
  | 'connector-village-crossroads' | 'connector-crossroads-coast'
  | 'connector-crossroads-mistfen' | 'connector-crossroads-silverpine'
  | 'connector-crossroads-wildwood' | 'outer-boundary';

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

export type MeadowEntryOutlierResolution =
  | { sourceKey: string; mode: 'contained' }
  | { sourceKey: string; mode: 'cross-region'; coverageIndex: number }
  | { sourceKey: string; mode: 'split'; bounds: readonly PixelBounds[] }
  | { sourceKey: string; mode: 're-owned'; owner: MeadowEntryAuthoringRegionId }
  | { sourceKey: string; mode: 'deferred-to-disposition'; reason: string };

export const MEADOW_ENTRY_AUTHORING_REGIONS: readonly MeadowEntryAuthoringRegion[];
export const MEADOW_ENTRY_PRIMARY_SOURCE_OWNERS: Readonly<Record<string, MeadowEntryAuthoringRegionId>>;
export const MEADOW_ENTRY_CROSS_REGION_COVERAGE: readonly MeadowEntryCrossRegionCoverage[];
export const MEADOW_ENTRY_OUTLIER_RESOLUTIONS: readonly MeadowEntryOutlierResolution[];
export function validateMeadowEntryAuthoringLayout(): void;
```

- [ ] **Step 1: Implement proposal tool first**

Emit all source keys, raw/raster bounds, fragment envelopes as diagnostics only, mandatory exact `paths.ts` owners, boundary sources, crossing sources, and candidate hand-authored partitions. Write only to `.../proposals/`.

- [ ] **Step 2: Write failing layout tests**

Assert one primary owner per source, exact connector ownership for every `paths.ts` source, and exactly one outlier-resolution record for each detected outlier. Require named records for `sundrop-forest-road-east` and `sundrop-southwest-ocean-patch`.

- [ ] **Step 3: Review and commit partitions/resolutions**

Every outlier must be contained, attached, split, re-owned, or deferred to the later disposition registry with a reason. Do not infer partitions from full fragment envelopes.

```bash
rtk bun tools/propose-meadow-entry-authoring-layout.ts
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-authoring-layout.ts \
  src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts \
  tools/propose-meadow-entry-authoring-layout.ts \
  docs/superpowers/reports/img/hpa-399/proposals
rtk git commit -m "feat(hpa-399): lock meadow-entry authoring partitions"
```

---

### Task 5: Classify Bake, Live, and Runtime Fallback

**Files:** bake ownership module/test.

**Interfaces:**

```ts
export type MeadowEntryBakeDisposition =
  | { mode: 'base-underlay' }
  | { mode: 'base-static'; margins: Insets; motif: string }
  | { mode: 'base-and-foreground'; baseMargins: Insets; foregroundMargins: Insets; frontCutoffPx: number; motif: string }
  | { mode: 'protected-live'; protectionMargins: Insets; reason: string }
  | { mode: 'runtime-fallback-only'; reason: string }
  | { mode: 'control-only'; reason: string };

export type MeadowEntryRuntimeOwnershipRequirement =
  | 'existing-blocker-fallback' | 'extend-decor-fallback'
  | 'extend-fence-fallback' | 'remain-live' | 'fallback-tile' | 'none';

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

- [ ] **Step 1: Write failing completeness/safety tests**

Assert every source appears exactly once, cutoff equals HPA-398 `33`, every baked decor/fence carries the matching extension obligation, every deferred outlier is resolved here, and southwest ocean is explicitly base-underlay or fallback-only.

- [ ] **Step 2: Implement explicit sorted registry**

Semantic controls are `control-only`; live semantic/stateful items are `protected-live`; every ground patch is base-underlay or runtime-fallback-only; translucent Mistfen fog stays protected-live unless explicitly foreground-owned with an accepted decor fallback obligation.

- [ ] **Step 3: Run and commit**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
rtk git add src/lib/game/content/backgrounds/meadow-entry-bake-ownership.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts
rtk git commit -m "feat(hpa-399): classify meadow-entry bake ownership"
```

---

### Task 6: Freeze Crops, Overlaps, Clamps, Corners, Coverage, and Budgets

**Files:** crop manifest module/test; extend proposal tool.

**Interfaces:**

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
  alphaPolicy: { base: 'opaque'; foreground: 'sparse-eligible-mask' | null };
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

- [ ] **Step 1: Write failing exact tests**

Assert Sundrop exact bounds/base-only/4 MiB/8 MiB; declared clamps; every route mouth has at least 128 pixels on its declared axis; all triple intersections are empty or corner-grouped; every baked source is crop-covered; unexplained coverage is zero; aggregate budgets equal per-crop sums.

- [ ] **Step 2: Generate and review candidates**

Start from review bounds plus attachments, expand 128, snap to 32, record pre-clamp, apply declared world-edge clamps, then compare approved post-clamp values. Calculate pair intersections, route-mouth axes, triple intersections, union/overlap area, budgets, and uncovered baked extents. Add base-only `outer-boundary-*` crops when required.

- [ ] **Step 3: Freeze exact tables and commit**

Use stable filenames/keys and plane-scoped draw order: underlay `0`, edge crops `10..90`, connectors `100..140`, regions `200..240`.

```bash
rtk bun tools/propose-meadow-entry-authoring-layout.ts
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.ts \
  src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts \
  tools/propose-meadow-entry-authoring-layout.ts \
  docs/superpowers/reports/img/hpa-399/proposals
rtk git commit -m "feat(hpa-399): freeze meadow-entry crop and coverage contract"
```

---

### Task 7: Generate Deterministic Controls and Fingerprints

**Files:** controls module/test, exporter, generated fingerprint, fixed control inventory.

**Interfaces:**

```ts
export interface MeadowEntryRasterMask {
  width: 6400;
  height: 6400;
  alpha: Buffer;
}

export interface MeadowEntryControlInputs {
  mapId: 'meadow-entry';
  worldBounds: PixelBounds;
  tileSizePx: 32;
  playerCollisionRadiusPx: 12;
  foregroundFrontCutoffPx: 33;
  sourceCatalog: readonly MeadowEntrySourceRecord[];
  authoringRegions: readonly MeadowEntryAuthoringRegion[];
  primarySourceOwners: Readonly<Record<string, MeadowEntryAuthoringRegionId>>;
  outlierResolutions: readonly MeadowEntryOutlierResolution[];
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
export function renderMeadowEntryControls(input: MeadowEntryControlInputs): Readonly<Record<string, string>>;
export function buildMeadowEntryForegroundEligibleRasterMask(input: MeadowEntryControlInputs): MeadowEntryRasterMask;
export function buildMeadowEntryProtectedForegroundRasterMask(input: MeadowEntryControlInputs): MeadowEntryRasterMask;
export function computeMeadowEntryGameplaySourceFingerprint(input: MeadowEntryControlInputs): string;
export function computeMeadowEntryAuthoringContractFingerprint(input: MeadowEntryControlInputs): string;
export function computeMeadowEntryCombinedControlFingerprint(input: MeadowEntryControlInputs): string;
```

The raster-mask builders are deterministic in-memory inputs consumed by PR 2; they are not additional checked-in PNG files.

- [ ] **Step 1: Write failing inventory/fingerprint/mask tests**

Assert two renders are byte-identical, keys exactly equal fixed inventory, fingerprint is lowercase SHA-256, mask dimensions are 6400×6400, protected pixels are excluded from eligibility, and HPA-398 hashes are present.

- [ ] **Step 2: Implement normal and `--check` exporter modes**

Render all bytes in memory. Normal mode writes a temporary directory then atomically replaces controls and generated fingerprint module. `--check` compares every rendered byte to checked-in files without writing. Reject all unexpected paths and HPA-307/HPA-398 destinations.

- [ ] **Step 3: Prove repeatability and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-controls.test.ts
rtk bun tools/export-meadow-entry-art-controls.ts
find docs/superpowers/reports/img/hpa-399/controls -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/hpa399-controls.before
sha256sum src/lib/game/content/generated/meadow-entry-art-control.ts >> /tmp/hpa399-controls.before
rtk bun tools/export-meadow-entry-art-controls.ts
find docs/superpowers/reports/img/hpa-399/controls -type f -print0 | sort -z | xargs -0 sha256sum > /tmp/hpa399-controls.after
sha256sum src/lib/game/content/generated/meadow-entry-art-control.ts >> /tmp/hpa399-controls.after
rtk diff -u /tmp/hpa399-controls.before /tmp/hpa399-controls.after
rtk bun tools/export-meadow-entry-art-controls.ts --check
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

**Files:** approval module, asset test, approval tool, `package.json`.

**Interfaces:**

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

- [ ] **Step 1: Write failing asset test**

Assert approval fingerprint equals generated fingerprint; independently hash crop manifest and bake ownership; assert storage mode/configuration.

- [ ] **Step 2: Add scripts and approval tool**

```json
"art:controls:meadow-entry": "bun tools/export-meadow-entry-art-controls.ts",
"art:approve:meadow-entry-controls": "bun tools/approve-meadow-entry-controls.ts",
"art:validate:meadow-entry-controls": "bun run art:storage:meadow-entry && bun tools/export-meadow-entry-art-controls.ts --check && bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-authoring-geometry.test.ts src/lib/game/content/backgrounds/meadow-entry-storage.test.ts src/lib/game/content/backgrounds/meadow-entry-source-catalog.test.ts src/lib/game/content/backgrounds/meadow-entry-authoring-layout.test.ts src/lib/game/content/backgrounds/meadow-entry-bake-ownership.test.ts src/lib/game/content/backgrounds/meadow-entry-crop-manifest.test.ts src/lib/game/content/backgrounds/meadow-entry-controls.test.ts src/lib/game/content/meadow-entry-controls.asset.test.ts"
```

Review partitions, outliers, crops, clamps, route mouths, corners, coverage, masks, predecessors, budgets, and the CI canary. Then:

```bash
rtk bun run art:approve:meadow-entry-controls -- \
  --reviewed-by "$USER" --reviewed-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
rtk bun run art:validate:meadow-entry-controls
rtk git add package.json \
  src/lib/game/content/approvals/meadow-entry-controls.ts \
  src/lib/game/content/meadow-entry-controls.asset.test.ts \
  tools/approve-meadow-entry-controls.ts
rtk git commit -m "test(hpa-399): approve meadow-entry control contract"
```

---

### Task 9: Run Full Validation and Write Evidence

**Files:** `docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md`.

- [ ] **Step 1: Run focused and repository gates**

```bash
rtk bun run art:validate:meadow-entry-controls
rtk git diff --exit-code
rtk git lfs fsck
rtk bun run check
rtk bun run lint
rtk bun run test:unit -- --run
rtk bun run build
rtk bun run build:tauri
```

Do not claim Tauri packaging unless `bun run tauri build` runs successfully on a supported host.

- [ ] **Step 2: Record evidence**

Include source commit, fingerprints, crop/overlap/route-mouth/corner counts, `exportAreaRatio`, baked/fallback/unexplained area, clamps, fallback reasons, LFS version and canary pointer/object hashes, CI materialization URL, predecessor hashes, review identity/time, command results, and explicit non-inclusion of masters/exports/native proofs/runtime integration.

- [ ] **Step 3: Format, revalidate, commit, and stop**

```bash
rtk bunx prettier --write docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md
rtk bun run art:validate:meadow-entry-controls
rtk bunx prettier --check docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md
rtk git add docs/superpowers/reports/2026-07-30-hpa-399-controls-crops-storage-validation.md
rtk git commit -m "docs(hpa-399): record controls and storage validation"
```

PR 2 may not begin until reviewers approve exact partitions, all outlier resolutions, bake/fallback ownership, HPA-406 obligations, exact crop/overlap/route-mouth/clamp/corner tables, zero unexplained coverage, LFS materialization, approved fingerprint, and clean repository gates.
