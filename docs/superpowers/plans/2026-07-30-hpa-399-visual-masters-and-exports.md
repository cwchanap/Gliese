# HPA-399 Visual Masters and Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, approve, and package one coherent `6400×6400` base master, one sparse foreground master, the exact Sundrop underlay, and every deterministic regional/connector export defined by the approved PR-1 crop contract.

**Architecture:** Treat the approved PR-1 controls, crop tables, runtime coverage, storage configuration, and combined fingerprint as immutable inputs. Keep art creation and regional refinement explicitly reviewed and provenance-rich, while making normalization, masking, PNG encoding, export, overlap checks, proof rendering, hash approval, and regeneration deterministic. Store masters, exports, and native proofs through the verified Git LFS contract and leave runtime registration to HPA-406.

**Tech Stack:** TypeScript 6, Bun, Vitest, Sharp 0.35.3, Git LFS, SVG/PNG/JSON, GitHub Actions, Prettier, ESLint, Svelte/Vite, Tauri 2.

## Global Constraints

- Start only after the controls/crops/storage PR is merged and its stop gate is explicitly approved. Create `codex/hpa-399-visual-masters-exports` from that merged `main` in an isolated worktree through `superpowers:using-git-worktrees`.
- Do not change Linear status or post detailed Linear evidence without separate user authorization.
- The generated `MEADOW_ENTRY_ART_CONTROL_FINGERPRINT`, approved crop/overlap/coverage tables, Git LFS configuration, HPA-398 asset hashes, and predecessor fingerprints are immutable inputs. Any drift blocks this plan.
- Do not change gameplay geometry, collision, encounters, transitions, pickups, discoveries, landmarks, NPCs, or save behavior.
- Do not add non-village runtime descriptors, preload registrations, `WorldScene` suppression, or fallback integration. HPA-406 owns all runtime integration.
- The base master is exactly `6400×6400` RGBA and alpha `255` at every pixel.
- The foreground master is exactly `6400×6400` RGBA, has alpha only inside the approved foreground-eligible mask, and has RGB `0,0,0` wherever alpha is `0`.
- The foreground contains no pixels over protected-live foreground `MapDecor`, buildings, gates, NPCs, pickups, transitions, encounters, discoveries, story objects, or animated/stateful visuals.
- Use the shared `33px` foreground front cutoff; a smaller reviewed per-entry value is allowed, a larger value is not.
- Mistfen fog-color treatment in base is opaque. Translucent fog remains live unless PR 1 approved an explicit foreground disposition and HPA-406 runtime obligation.
- `sundrop-village-underlay` is a base-only direct crop at `{ left: 256, top: 4352, right: 2048, bottom: 5888 }`; it has a `4 MiB` review target and `8 MiB` hard limit.
- Preserve `public/game/assets/regions/sundrop-village-base.png`, `sundrop-village-foreground.png`, HPA-307 evidence, and HPA-398 evidence byte-for-byte.
- Every regional export is a direct pixel crop of the approved master. No resampling, recoloring, sharpening, geometric transform, or crop-local retouch is allowed during export.
- All shared decoded RGBA overlap pixels must be byte-identical. Every declared corner group is validated in two dimensions.
- Candidate and refinement source images stay under ignored `artifacts/meadow-entry/hpa-399/candidates/` or `work/` paths and are never committed.
- Masters, exports, and native-resolution proofs are Git LFS objects. Compact JSON/Markdown/SVG reports remain ordinary Git.
- Base master operational budget: `128 MiB` review, `192 MiB` hard. Foreground: `48 MiB` review, `96 MiB` hard. Per-export and aggregate budgets come exclusively from the approved PR-1 manifest.
- Deterministic finalization/export may be called byte-reproducible. Generative recreation may not be called byte-reproducible unless the provider actually guarantees it.
- Commands below use `rtk`. Run from repository root unless noted.

## File Structure

### New focused modules

- `src/lib/game/content/backgrounds/meadow-entry-png.ts` — canonical PNG options, decoding, alpha/RGB validation, hashing, canonical chunk validation, atomic writes, and budgets.
- `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts` — candidate, transform, generation/manual, refinement, control, storage, final master, export, and proof provenance schemas.
- `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.ts` — exact-ratio normalization, base/foreground validation, foreground masking, predecessor checks, canonical encoding, and atomic master-package finalization.
- `src/lib/game/content/backgrounds/meadow-entry-master-refinement.ts` — source-mask-constrained regional refinement composition against the current canonical master.
- `src/lib/game/content/backgrounds/meadow-entry-exporter.ts` — direct master crops, stable filenames/keys, deterministic PNGs, overlap/corner verification, budgets, and export provenance.
- `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts` — native control overlays, checkerboard foreground, immutable Sundrop composite, region/connector proofs, fallback boundaries, overlap diffs, corner proofs, and feather-edge proofs.
- `src/lib/game/content/approvals/meadow-entry-art-package.ts` — selected storage mode, master/export/provenance/proof hashes, dimensions, budgets, exceptions, and evidence path.
- `tools/finalize-meadow-entry-masters.ts`
- `tools/refine-meadow-entry-master.ts`
- `tools/export-meadow-entry-regions.ts`
- `tools/render-meadow-entry-art-proofs.ts`
- `tools/approve-meadow-entry-art-package.ts`
- `tools/validate-meadow-entry-art-package.ts`
- `docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md`

### New tests

- `src/lib/game/content/backgrounds/meadow-entry-png.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- `src/lib/game/content/meadow-entry-art-package.asset.test.ts`

### Existing files changed in place

- `package.json`
- `.github/workflows/ci.yml`

### LFS-backed logical package

```text
artifacts/meadow-entry/hpa-399/
  masters/
    meadow-entry-base-master.png
    meadow-entry-foreground-master.png
  exports/
    <crop-id>-base.png
    <crop-id>-foreground.png
  provenance/
    meadow-entry-master-provenance.json
    meadow-entry-export-provenance.json
    meadow-entry-crop-manifest.json
```

### LFS-backed native proofs

```text
docs/superpowers/reports/img/hpa-399/proofs/
  full/
  regions/
  connectors/
  overlaps/
  corners/
  clamps/
  fallback-boundaries/
  sundrop-feather/
```

---

### Task 1: Add Canonical PNG and Provenance Contracts

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-png.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-png.test.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`

**Interfaces:**

- Consumes: Sharp, approved storage configuration, approved control fingerprint.
- Produces:

```ts
export const MEADOW_ENTRY_PNG_OPTIONS = {
  palette: false,
  compressionLevel: 9,
  adaptiveFiltering: false,
  force: true
} as const;

export interface ValidatedMeadowEntryPng {
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

export async function decodeMeadowEntryRgba(png: Buffer): Promise<{
  data: Buffer;
  width: number;
  height: number;
}>;
export async function encodeCanonicalMeadowEntryPng(raw: Buffer, width: number, height: number): Promise<Buffer>;
export function validateCanonicalPngChunks(png: Buffer): void;
export async function writeAtomicMeadowEntryPng(path: string, png: Buffer): Promise<void>;

export interface MeadowEntryGenerationProvenance {
  mode: 'generative' | 'manual';
  provider: string | null;
  model: string | null;
  modelVersion: string | null;
  tool: string;
  toolVersion: string;
  settings: Readonly<Record<string, unknown>>;
  seed: number | string | null;
  seedUnavailable: boolean;
  prompt: string | null;
  promptSha256: string | null;
  referenceImageSha256: readonly string[];
}
```

- [ ] **Step 1: Write failing PNG tests**

```ts
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  decodeMeadowEntryRgba,
  encodeCanonicalMeadowEntryPng,
  validateCanonicalPngChunks
} from './meadow-entry-png';

describe('meadow-entry PNG contract', () => {
  it('encodes identical raw pixels byte-identically', async () => {
    const raw = Buffer.from([1, 2, 3, 255, 4, 5, 6, 0]);
    const first = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
    const second = await encodeCanonicalMeadowEntryPng(raw, 2, 1);
    expect(second).toEqual(first);
    expect(() => validateCanonicalPngChunks(first)).not.toThrow();
    expect(await decodeMeadowEntryRgba(first)).toMatchObject({ width: 2, height: 1 });
  });

  it('rejects non-canonical metadata chunks', async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 4, background: '#00000000' }
    }).png().withMetadata({ comment: 'not canonical' }).toBuffer();
    expect(() => validateCanonicalPngChunks(png)).toThrow(/non-canonical PNG chunk/i);
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-png.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
```

- [ ] **Step 3: Implement canonical encoding and atomic writes**

Reuse the proven HPA-398 PNG CRC/chunk and temporary-write patterns without modifying HPA-398 modules. Accept only `IHDR`, `IDAT`, and `IEND`; write to a randomized sibling temporary path, validate bytes after write, then rename atomically.

- [ ] **Step 4: Implement provenance validation**

Reject:

- a generative entry without provider/model/prompt;
- a manual entry with generative-only fields populated;
- `seed: null` unless `seedUnavailable` is `true`;
- missing control/storage hashes;
- a claim of byte-reproducible generation when the provider metadata does not declare deterministic bytes.

- [ ] **Step 5: Run tests**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-png.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add src/lib/game/content/backgrounds/meadow-entry-{png,master-provenance}.ts \
  src/lib/game/content/backgrounds/meadow-entry-{png,master-provenance}.test.ts
rtk git commit -m "feat(hpa-399): add master PNG and provenance contracts"
```

---

### Task 2: Implement Deterministic Master Finalization

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts`
- Create: `tools/finalize-meadow-entry-masters.ts`

**Interfaces:**

- Consumes: approved controls, base/foreground candidate PNGs, normalization transforms, generated raster masks, HPA-398 approvals, storage contract, budgets.
- Produces:

```ts
export interface MeadowEntryNormalizationTransform {
  native: { width: number; height: number };
  crop: { left: number; top: number; width: number; height: number };
  output: { width: 6400; height: 6400 };
  scale: number;
}

export interface FinalizeMeadowEntryMastersInput {
  baseCandidatePath: string;
  foregroundCandidatePath: string;
  baseTransform: MeadowEntryNormalizationTransform;
  foregroundTransform: MeadowEntryNormalizationTransform;
  foregroundEligibleMaskPng: Buffer;
  protectedForegroundMaskPng: Buffer;
  controlFingerprint: string;
  storageConfigurationSha256: string;
  generation: MeadowEntryGenerationProvenance;
}

export interface FinalizedMeadowEntryMasters {
  basePng: Buffer;
  foregroundPng: Buffer;
  provenanceJson: Buffer;
}

export async function finalizeMeadowEntryMasters(
  input: FinalizeMeadowEntryMastersInput
): Promise<FinalizedMeadowEntryMasters>;
```

- [ ] **Step 1: Write failing finalizer tests with small injected dimensions**

Expose a test-only dimensions parameter internally so unit tests do not allocate a full master. Tests must prove:

```ts
it('keeps base alpha fully opaque', async () => { /* every output alpha is 255 */ });
it('zeros foreground pixels outside eligibility', async () => { /* RGBA all zero */ });
it('zeros foreground pixels inside protected-live foreground masks', async () => {});
it('rejects non-uniform transforms', async () => {});
it('rejects stale control or storage fingerprints', async () => {});
it('does not mutate immutable Sundrop input hashes', async () => {});
it('returns byte-identical PNGs for identical inputs', async () => {});
```

Use 8×8 fixtures generated in memory with Sharp and exact mask pixels.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts
```

- [ ] **Step 3: Implement exact-ratio normalization**

Validate:

```text
scale = output.width / crop.width = output.height / crop.height
crop fits native candidate
output = 6400×6400 in production
no non-uniform scale
no geometric warp
```

Normalize with one `extract` and one uniform `resize(..., { kernel: lanczos3 })`. Record native dimensions, crop, scale, candidate SHA, and normalized SHA.

- [ ] **Step 4: Implement base and foreground rules**

- Base: convert to sRGB RGBA, force every alpha byte to `255`, canonical-encode, and enforce base budget.
- Foreground: raster-mask by `foregroundEligibleMask ∩ ¬protectedForegroundMask`; set all four channels to `0` outside the allowed mask; canonical-encode and enforce foreground budget.
- Verify approved HPA-398 base/foreground hashes before any write.
- Validate the combined control fingerprint and storage hash against approved PR-1 data.

- [ ] **Step 5: Implement atomic CLI finalization**

`tools/finalize-meadow-entry-masters.ts` reads:

```text
--base-candidate
--foreground-candidate
--base-transform
--foreground-transform
--generation-provenance
```

It writes temporary masters and provenance, validates the complete trio, then atomically replaces:

```text
artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png
artifacts/meadow-entry/hpa-399/masters/meadow-entry-foreground-master.png
artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json
```

A failure leaves previous approved logical files untouched.

- [ ] **Step 6: Run focused tests**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit code only**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-master-finalizer.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts \
  tools/finalize-meadow-entry-masters.ts
rtk git commit -m "feat(hpa-399): finalize meadow-entry master planes"
```

---

### Task 3: Implement Controlled Regional Refinements

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-master-refinement.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts`
- Create: `tools/refine-meadow-entry-master.ts`

**Interfaces:**

- Consumes: current canonical master, replacement candidate, source-derived edit mask, protected/non-target masks, transform, control fingerprint.
- Produces:

```ts
export interface MeadowEntryRefinementInput {
  plane: 'base' | 'foreground';
  currentMasterPng: Buffer;
  replacementPng: Buffer;
  editMaskPng: Buffer;
  protectedMaskPng: Buffer;
  nonTargetMaskPng: Buffer;
  transform: MeadowEntryNormalizationTransform;
  sourceRegionIds: readonly string[];
  affectedCropIds: readonly string[];
  controlFingerprint: string;
}

export async function applyMeadowEntryRefinement(
  input: MeadowEntryRefinementInput
): Promise<{ masterPng: Buffer; provenance: object }>;
```

- [ ] **Step 1: Write failing mask-safety tests**

```ts
it('changes pixels only where edit mask is positive', async () => {});
it('rejects edit-mask overlap with protected pixels', async () => {});
it('rejects edit-mask overlap with non-target regions', async () => {});
it('preserves foreground zero-RGB outside alpha after refinement', async () => {});
it('reports every crop intersecting the changed master bounds', async () => {});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts
```

- [ ] **Step 3: Implement the compositor**

Normalize the replacement through the same transform validator as the master finalizer. Composite only where `editMask > 0`, fail on any protected/non-target intersection, canonical-encode, and record before/after hashes plus changed-pixel bounds.

- [ ] **Step 4: Implement the CLI**

`tools/refine-meadow-entry-master.ts` requires:

```text
--plane base|foreground
--current-master
--replacement
--edit-mask
--protected-mask
--non-target-mask
--transform
--source-region
```

It refuses a source region or affected crop set not present in the approved manifest. It writes a new candidate master under ignored `work/`; it never writes approved master paths directly.

- [ ] **Step 5: Run tests and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-master-refinement.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts \
  tools/refine-meadow-entry-master.ts
rtk git commit -m "feat(hpa-399): constrain regional master refinements"
```

---

### Task 4: Produce and Approve the Global Base Candidate

**Files:**

- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json`
- LFS output after Task 5 finalization: `artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png`

**Interfaces:**

- Consumes: full control composite, terrain/path, region, collision, protected-live, handoff, baked/fallback, and crop controls.
- Produces: one reviewed global base candidate and complete provenance.

- [ ] **Step 1: Generate or paint one square global candidate**

Use the complete control package as reference. The production brief is:

```text
Orthographic top-down JRPG overworld environment, one coherent square world.
Upper-left daylight, consistent soft contact shadows, no perspective tilt.
Continuous authored roads and transition throats matching the supplied controls.
Warm Sundrop underlay; worn Crossroads cobble and festival earth; Tidewatch sand,
salt grass and low shoreline rock; Mistfen mud, shallow pools, roots and opaque
fog-color ground; Silverpine autumn floor and ceremonial stone; Wildwood forest
floor, roots and cave approach. Quiet detail on routes, doors, encounters,
rewards and handoffs. Include only approved low static obstacle treatment.
Do not invent buildings, gates, signs, doors, NPCs, pickups, enemies, markers,
story objects, text, or false paths. Preserve all protected-live footprints.
```

Record provider/model/tool/version/settings, prompt, reference hashes, native dimensions, seed or seed-unavailable declaration, and candidate SHA in the generation JSON.

- [ ] **Step 2: Normalize into a review candidate**

Create an exact-ratio transform JSON and run the finalizer with a transparent placeholder foreground candidate solely to produce a base review output under ignored `work/`. Do not write approved logical paths yet.

- [ ] **Step 3: Review at native resolution**

Review the full candidate plus every crop/handoff overlay. Reject and refine when any of these occur:

```text
road centerline drift
false route or entrance
abrupt regional lighting/palette change
crop-local seam
missing required baked obstacle
invented live semantic object
foreground-like tall paint in forbidden area
unreviewed fallback boundary
Sundrop feather mismatch over the proposed underlay
```

- [ ] **Step 4: Apply controlled refinements only through Task 3 tooling**

For each accepted refinement, record source region, edit mask, replacement hash, transform, changed-pixel bounds, and affected crop IDs. Re-review the recomposed full master and all affected handoffs.

- [ ] **Step 5: Freeze the base candidate inputs**

When approved, update only the untracked generation/refinement provenance inputs consumed by finalization. Do not commit candidates or intermediate refinements.

No Git commit occurs in this task; the approved LFS master is committed atomically with the foreground in Task 5.

---

### Task 5: Produce the Sparse Foreground and Finalize Both Masters

**Files:**

- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json`
- Create LFS: `artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png`
- Create LFS: `artifacts/meadow-entry/hpa-399/masters/meadow-entry-foreground-master.png`
- Create: `artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json`

**Interfaces:**

- Consumes: approved base candidate, foreground eligible/protected masks, shared cutoff, candidate provenance.
- Produces: both canonical master planes plus master provenance.

- [ ] **Step 1: Create the foreground candidate against the approved base**

The foreground brief is:

```text
Transparent orthographic occlusion layer aligned exactly to the supplied base
master and foreground-eligible mask. Include only approved canopy tops, hedge
tops, wall fronts, arches, reeds and branches. Keep all RGB zero where alpha is
zero. Do not paint buildings, gates, NPCs, pickups, encounters, discoveries,
story/stateful objects, protected live foreground decor, routes, doorways, or
interaction clearances. Respect the shared 33px front cutoff and every smaller
entry-specific exception.
```

Record complete generation/manual provenance as in Task 4.

- [ ] **Step 2: Preflight foreground masks**

Run the finalizer in validation-only mode and require:

```text
foreground pixels outside eligible mask = 0
foreground pixels over protected foreground decor = 0
zero-alpha pixels with nonzero RGB = 0
forbidden-tall violations = 0
```

- [ ] **Step 3: Review foreground behavior**

Render on checkerboard and over the base. Inspect every eligible obstacle at native resolution, behind/front cutoff positions, every route mouth, discovery/reward clearance, Mistfen live fog footprint, and the immutable HPA-398 foreground boundary.

- [ ] **Step 4: Finalize atomically**

```bash
rtk bun tools/finalize-meadow-entry-masters.ts \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --generation-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-generation.json
```

Expected: both LFS masters and master provenance are written; HPA-398 hashes remain unchanged.

- [ ] **Step 5: Re-run finalization and prove byte identity**

```bash
rtk sha256sum artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json > /tmp/hpa399-master-hashes.before
rtk bun tools/finalize-meadow-entry-masters.ts \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --generation-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-generation.json
rtk sha256sum artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json > /tmp/hpa399-master-hashes.after
rtk diff -u /tmp/hpa399-master-hashes.before /tmp/hpa399-master-hashes.after
```

Expected: no diff.

- [ ] **Step 6: Verify LFS and budgets**

```bash
rtk git add artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json
rtk git lfs ls-files --name-only | grep -E '^artifacts/meadow-entry/hpa-399/masters/.+\.png$'
rtk git lfs fsck
```

- [ ] **Step 7: Commit**

```bash
rtk git commit -m "art(hpa-399): add approved meadow-entry masters"
```

---

### Task 6: Export Every Approved Crop and Verify Shared Pixels

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-exporter.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts`
- Create: `tools/export-meadow-entry-regions.ts`
- Create LFS: `artifacts/meadow-entry/hpa-399/exports/*.png`
- Create: `artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json`
- Copy generated contract: `artifacts/meadow-entry/hpa-399/provenance/meadow-entry-crop-manifest.json`

**Interfaces:**

- Consumes: canonical masters and approved crop/overlap/corner tables.
- Produces:

```ts
export interface MeadowEntryExportResult {
  cropId: string;
  base: ValidatedMeadowEntryPng;
  foreground: ValidatedMeadowEntryPng | null;
}

export async function exportMeadowEntryRegions(input: {
  baseMasterPng: Buffer;
  foregroundMasterPng: Buffer;
  controlFingerprint: string;
}): Promise<{
  files: Readonly<Record<string, Buffer>>;
  results: readonly MeadowEntryExportResult[];
  provenanceJson: Buffer;
}>;

export function verifyMeadowEntryOverlapPixels(/* decoded exports and manifest */): void;
```

- [ ] **Step 1: Write failing exporter tests with small fixture masters**

```ts
it('exports exact half-open crop pixels without resampling', async () => {});
it('omits foreground for base-only crops', async () => {});
it('emits a transparent canonical foreground when the approved crop has no foreground pixels', async () => {});
it('finds the first differing RGBA pixel in an overlap', async () => {});
it('validates two-dimensional corner groups', async () => {});
it('computes per-crop and aggregate bytes from the approved manifest', async () => {});
it('repeats byte-identically', async () => {});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts
```

- [ ] **Step 3: Implement direct cropping and canonical encoding**

For each approved crop, use exactly one Sharp `extract` against each master and no `resize`. Decode each result and compare every pixel with the corresponding master coordinates before encoding approval. Enforce stable filename, texture-key, plane, draw-order, dimensions, and budget data.

- [ ] **Step 4: Implement overlap and corner verification**

Decode each pair and compare shared coordinates channel-by-channel. On failure report:

```text
firstCropId
secondCropId
plane
masterX/masterY
first local coordinate and RGBA
second local coordinate and RGBA
cornerGroupId when present
```

- [ ] **Step 5: Implement atomic exporter CLI**

`tools/export-meadow-entry-regions.ts` validates masters and approvals, writes all outputs to a temporary directory, verifies the complete package, then atomically replaces only the fixed export/provenance inventory.

- [ ] **Step 6: Export twice and prove identity**

```bash
rtk bun tools/export-meadow-entry-regions.ts
rtk sha256sum artifacts/meadow-entry/hpa-399/exports/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json > /tmp/hpa399-export-hashes.before
rtk bun tools/export-meadow-entry-regions.ts
rtk sha256sum artifacts/meadow-entry/hpa-399/exports/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json > /tmp/hpa399-export-hashes.after
rtk diff -u /tmp/hpa399-export-hashes.before /tmp/hpa399-export-hashes.after
```

Expected: no diff.

- [ ] **Step 7: Run tests and LFS verification**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts
rtk git add artifacts/meadow-entry/hpa-399/exports/*.png \
  artifacts/meadow-entry/hpa-399/provenance/*.json
rtk git lfs fsck
```

- [ ] **Step 8: Commit**

```bash
rtk git commit -m "art(hpa-399): export approved meadow-entry regions"
```

---

### Task 7: Render Native Proofs and Approve the Art Package

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- Create: `tools/render-meadow-entry-art-proofs.ts`
- Create: `tools/approve-meadow-entry-art-package.ts`
- Create: `src/lib/game/content/approvals/meadow-entry-art-package.ts`
- Create: `src/lib/game/content/meadow-entry-art-package.asset.test.ts`
- Create LFS: `docs/superpowers/reports/img/hpa-399/proofs/**/*.png`

**Interfaces:**

- Consumes: masters, exports, controls, runtime coverage, HPA-398 assets, provenance.
- Produces: fixed proof inventory and hash approval.

- [ ] **Step 1: Write failing proof tests**

```ts
it('composes HPA-399 base below immutable HPA-398 base', async () => {});
it('composes HPA-399 foreground below immutable HPA-398 foreground', async () => {});
it('renders every crop, overlap, corner, clamp, fallback boundary, and Sundrop edge proof', async () => {});
it('produces zero-valued overlap difference images', async () => {});
it('does not write outside the fixed proof inventory', async () => {});
```

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts
```

- [ ] **Step 3: Implement fixed proof rendering**

Generate:

```text
full base
foreground on checkerboard
full immutable-Sundrop composite
protected/collision/foreground-eligible overlays
runtime baked/fallback coverage overlays
every region and connector at native resolution
every overlap difference image
every corner group
every declared edge clamp
every baked-to-fallback boundary
four Sundrop feather-over-underlay edges
```

Proof sidecars record input hashes and master coordinates. The renderer rejects unexpected files and writes atomically.

- [ ] **Step 4: Render and review proofs**

```bash
rtk bun tools/render-meadow-entry-art-proofs.ts
rtk git lfs ls-files --name-only | grep '^docs/superpowers/reports/img/hpa-399/proofs/'
```

Review all native proofs. The approval gate requires zero overlap differences, no unexplained coverage, continuous Sundrop feather edges, readable interactions, and no protected-live foreground overlap.

- [ ] **Step 5: Write the approval tool and asset test**

`tools/approve-meadow-entry-art-package.ts` reads existing artifacts and writes:

```ts
export const meadowEntryArtPackageApproval = {
  combinedControlFingerprint: string,
  storageMode: 'git-lfs',
  baseMaster: { sha256: string, bytes: number, width: 6400, height: 6400 },
  foregroundMaster: { sha256: string, bytes: number, width: 6400, height: 6400 },
  cropManifestSha256: string,
  exportProvenanceSha256: string,
  exports: readonly /* exact per-export hashes and dimensions */[],
  proofs: readonly /* durable LFS proof hashes */[],
  evidencePath: 'docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md'
} as const;
```

The asset test independently re-hashes and decodes every approved item.

- [ ] **Step 6: Approve after explicit review**

```bash
rtk bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by "$USER" \
  --reviewed-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
rtk bun run test:unit -- --run src/lib/game/content/meadow-entry-art-package.asset.test.ts
```

- [ ] **Step 7: Commit**

```bash
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/approvals/meadow-entry-art-package.ts \
  src/lib/game/content/meadow-entry-art-package.asset.test.ts \
  tools/render-meadow-entry-art-proofs.ts \
  tools/approve-meadow-entry-art-package.ts \
  docs/superpowers/reports/img/hpa-399/proofs
rtk git commit -m "test(hpa-399): approve meadow-entry art package"
```

---

### Task 8: Add One-Command Validation, CI, and Final Evidence

**Files:**

- Create: `tools/validate-meadow-entry-art-package.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Create: `docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md`

**Interfaces:**

- Consumes: all approved masters, exports, proofs, controls, storage, provenance, and tests.
- Produces: one deterministic validation command and the final HPA-399 evidence report.

- [ ] **Step 1: Add package scripts**

```json
"art:finalize:meadow-entry": "bun tools/finalize-meadow-entry-masters.ts",
"art:export:meadow-entry": "bun tools/export-meadow-entry-regions.ts",
"art:proof:meadow-entry": "bun tools/render-meadow-entry-art-proofs.ts",
"art:approve:meadow-entry": "bun tools/approve-meadow-entry-art-package.ts",
"art:validate:meadow-entry": "bun tools/validate-meadow-entry-art-package.ts"
```

- [ ] **Step 2: Implement the validator orchestration**

It must run in this order and stop on first failure:

```text
Git LFS prerequisite/pointer/object/materialization verification
PR-1 control regeneration and clean-diff check
master approval and canonical PNG validation
export regeneration and clean-diff check
overlap/corner verification
proof regeneration and clean-diff check
all HPA-399 focused unit/asset tests
HPA-307/HPA-398 predecessor hash freeze
budget and provenance verification
fixed-inventory/path allowlist verification
```

- [ ] **Step 3: Add an HPA-399 art CI job**

Add a job using `actions/checkout@v4` with `lfs: true`, Bun setup, frozen install, and:

```yaml
- name: Validate HPA-399 art package
  run: bun run art:validate:meadow-entry
```

Do not add runtime `public/` assets or alter existing app build behavior.

- [ ] **Step 4: Run focused validation from a clean tree**

```bash
rtk bun run art:validate:meadow-entry
rtk git diff --exit-code
rtk git lfs fsck
```

Expected: PASS and no regeneration diff.

- [ ] **Step 5: Run repository gates**

```bash
rtk bun run check
rtk bun run lint
rtk bun run test:unit -- --run
rtk bun run build
rtk bun run build:tauri
```

Run `rtk bun run tauri build` on a supported host only when packaging evidence is intended; do not claim it otherwise.

- [ ] **Step 6: Write the final report**

Include:

- source commit/branch and approved PR-1 control fingerprint;
- storage mode, LFS version, object counts, pointer/materialization checks;
- base/foreground dimensions, hashes, byte counts, budgets, and exceptions;
- generation/manual provenance and refinement list;
- complete crop/export count, `exportAreaRatio`, aggregate budgets, hashes, and dimensions;
- overlap/corner/clamp/fallback-boundary results;
- Sundrop predecessor hashes and four feather-edge results;
- proof inventory and durable object hashes;
- focused/repository command results;
- explicit native-review identity/time;
- explicit statement that no non-village runtime integration, traversal, fallback execution, GPU, save/reload, or performance claim is made.

- [ ] **Step 7: Format, revalidate, and commit**

```bash
rtk bunx prettier --write \
  docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md
rtk bun run art:validate:meadow-entry
rtk bunx prettier --check \
  docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md
rtk git add package.json .github/workflows/ci.yml \
  tools/validate-meadow-entry-art-package.ts \
  docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md
rtk git commit -m "docs(hpa-399): record visual package validation"
```

- [ ] **Step 8: Final HPA-399 stop gate**

Before handing off to HPA-406, reviewers must approve:

```text
canonical base and foreground hashes
immutable HPA-398 composite and feather proofs
all direct regional exports
zero overlap/corner differences
all clamps and baked/fallback boundaries
complete LFS materialization
complete provenance and budgets
clean deterministic regeneration
no runtime integration in this PR
```
