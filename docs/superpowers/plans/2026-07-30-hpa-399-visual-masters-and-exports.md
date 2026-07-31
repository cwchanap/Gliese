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
export async function encodeCanonicalMeadowEntryPng(
  raw: Buffer,
  width: number,
  height: number
): Promise<Buffer>;
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
  byteReproducibleGeneration: boolean;
}

export function validateMeadowEntryGenerationProvenance(
  provenance: MeadowEntryGenerationProvenance
): void;
```

- [ ] **Step 1: Write failing PNG and provenance tests**

```ts
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  decodeMeadowEntryRgba,
  encodeCanonicalMeadowEntryPng,
  validateCanonicalPngChunks
} from './meadow-entry-png';
import { validateMeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';

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
    })
      .png()
      .withMetadata({ density: 72 })
      .toBuffer();
    expect(() => validateCanonicalPngChunks(png)).toThrow(/non-canonical PNG chunk/i);
  });
});

describe('meadow-entry generation provenance', () => {
  it('accepts an honest non-seeded generative record', () => {
    expect(() =>
      validateMeadowEntryGenerationProvenance({
        mode: 'generative',
        provider: 'approved-provider',
        model: 'approved-model',
        modelVersion: '2026-07-30',
        tool: 'image-generation-client',
        toolVersion: '1.0.0',
        settings: { width: 2048, height: 2048 },
        seed: null,
        seedUnavailable: true,
        prompt: 'orthographic meadow-entry master',
        promptSha256: 'a'.repeat(64),
        referenceImageSha256: ['b'.repeat(64)],
        byteReproducibleGeneration: false
      })
    ).not.toThrow();
  });

  it('rejects a false byte-reproducibility claim without a seed', () => {
    expect(() =>
      validateMeadowEntryGenerationProvenance({
        mode: 'generative',
        provider: 'approved-provider',
        model: 'approved-model',
        modelVersion: '2026-07-30',
        tool: 'image-generation-client',
        toolVersion: '1.0.0',
        settings: {},
        seed: null,
        seedUnavailable: true,
        prompt: 'orthographic meadow-entry master',
        promptSha256: 'a'.repeat(64),
        referenceImageSha256: [],
        byteReproducibleGeneration: true
      })
    ).toThrow(/byte-reproducible/i);
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

- a generative entry without provider, model, version, prompt, or prompt hash;
- a manual entry with provider/model/seed populated;
- `seed: null` unless `seedUnavailable` is `true`;
- a claim of byte-reproducible generation when the record lacks a seed or deterministic-provider declaration;
- malformed SHA-256 values.

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

- Consumes: approved controls, candidate PNG buffers, transforms, raster masks, HPA-398 predecessor bytes/hashes, storage contract, and budgets.
- Produces:

```ts
export interface MeadowEntryMasterPolicy {
  width: number;
  height: number;
  baseReviewBytes: number;
  baseHardBytes: number;
  foregroundReviewBytes: number;
  foregroundHardBytes: number;
}

export const MEADOW_ENTRY_MASTER_POLICY: MeadowEntryMasterPolicy;

export interface MeadowEntryNormalizationTransform {
  native: { width: number; height: number };
  crop: { left: number; top: number; width: number; height: number };
  output: { width: number; height: number };
  scale: number;
}

export interface FinalizeMeadowEntryMastersInput {
  policy: MeadowEntryMasterPolicy;
  baseCandidatePng: Buffer;
  foregroundCandidatePng: Buffer;
  baseTransform: MeadowEntryNormalizationTransform;
  foregroundTransform: MeadowEntryNormalizationTransform;
  foregroundEligibleMaskPng: Buffer;
  protectedForegroundMaskPng: Buffer;
  controlFingerprint: string;
  approvedControlFingerprint: string;
  storageConfigurationSha256: string;
  approvedStorageConfigurationSha256: string;
  predecessor: {
    basePng: Buffer;
    foregroundPng: Buffer;
    approvedBaseSha256: string;
    approvedForegroundSha256: string;
  };
  generation: {
    base: MeadowEntryGenerationProvenance;
    foreground: MeadowEntryGenerationProvenance;
  };
  refinements: readonly MeadowEntryRefinementProvenance[];
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

- [ ] **Step 1: Write failing finalizer tests with concrete 2×2 fixtures**

```ts
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { decodeMeadowEntryRgba } from './meadow-entry-png';
import { finalizeMeadowEntryMasters } from './meadow-entry-master-finalizer';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

async function rgbaPng(width: number, height: number, bytes: number[]): Promise<Buffer> {
  return sharp(Buffer.from(bytes), { raw: { width, height, channels: 4 } }).png().toBuffer();
}

const identityTransform = (width: number, height: number) => ({
  native: { width, height },
  crop: { left: 0, top: 0, width, height },
  output: { width, height },
  scale: 1
});

const generation = {
  mode: 'manual' as const,
  provider: null,
  model: null,
  modelVersion: null,
  tool: 'fixture',
  toolVersion: '1',
  settings: {},
  seed: null,
  seedUnavailable: false,
  prompt: null,
  promptSha256: null,
  referenceImageSha256: [],
  byteReproducibleGeneration: true
};

describe('meadow-entry master finalizer', () => {
  it('forces opaque base and removes forbidden foreground pixels', async () => {
    const base = await rgbaPng(2, 2, [
      10, 20, 30, 20, 10, 20, 30, 40,
      10, 20, 30, 60, 10, 20, 30, 80
    ]);
    const foreground = await rgbaPng(2, 2, [
      200, 1, 2, 255, 200, 1, 2, 255,
      200, 1, 2, 255, 200, 1, 2, 255
    ]);
    const eligible = await rgbaPng(2, 2, [
      0, 0, 0, 255, 0, 0, 0, 0,
      0, 0, 0, 255, 0, 0, 0, 255
    ]);
    const protectedMask = await rgbaPng(2, 2, [
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 255, 0, 0, 0, 0
    ]);
    const predecessorBase = await rgbaPng(1, 1, [1, 2, 3, 255]);
    const predecessorForeground = await rgbaPng(1, 1, [0, 0, 0, 0]);

    const result = await finalizeMeadowEntryMasters({
      policy: {
        width: 2,
        height: 2,
        baseReviewBytes: 1024,
        baseHardBytes: 2048,
        foregroundReviewBytes: 1024,
        foregroundHardBytes: 2048
      },
      baseCandidatePng: base,
      foregroundCandidatePng: foreground,
      baseTransform: identityTransform(2, 2),
      foregroundTransform: identityTransform(2, 2),
      foregroundEligibleMaskPng: eligible,
      protectedForegroundMaskPng: protectedMask,
      controlFingerprint: 'a'.repeat(64),
      approvedControlFingerprint: 'a'.repeat(64),
      storageConfigurationSha256: 'b'.repeat(64),
      approvedStorageConfigurationSha256: 'b'.repeat(64),
      predecessor: {
        basePng: predecessorBase,
        foregroundPng: predecessorForeground,
        approvedBaseSha256: sha256(predecessorBase),
        approvedForegroundSha256: sha256(predecessorForeground)
      },
      generation: { base: generation, foreground: generation },
      refinements: []
    });

    const decodedBase = await decodeMeadowEntryRgba(result.basePng);
    const decodedForeground = await decodeMeadowEntryRgba(result.foregroundPng);
    expect([...decodedBase.data].filter((_, index) => index % 4 === 3)).toEqual([255, 255, 255, 255]);
    expect([...decodedForeground.data.subarray(4, 8)]).toEqual([0, 0, 0, 0]);
    expect([...decodedForeground.data.subarray(8, 12)]).toEqual([0, 0, 0, 0]);
    expect([...decodedForeground.data.subarray(0, 4)]).toEqual([200, 1, 2, 255]);
  });

  it('rejects a non-uniform transform', async () => {
    const png = await rgbaPng(2, 2, new Array(16).fill(255));
    const bad = { ...identityTransform(2, 2), crop: { left: 0, top: 0, width: 2, height: 1 } };
    await expect(
      finalizeMeadowEntryMasters({
        policy: {
          width: 2,
          height: 2,
          baseReviewBytes: 1024,
          baseHardBytes: 2048,
          foregroundReviewBytes: 1024,
          foregroundHardBytes: 2048
        },
        baseCandidatePng: png,
        foregroundCandidatePng: png,
        baseTransform: bad,
        foregroundTransform: identityTransform(2, 2),
        foregroundEligibleMaskPng: png,
        protectedForegroundMaskPng: await rgbaPng(2, 2, new Array(16).fill(0)),
        controlFingerprint: 'a'.repeat(64),
        approvedControlFingerprint: 'a'.repeat(64),
        storageConfigurationSha256: 'b'.repeat(64),
        approvedStorageConfigurationSha256: 'b'.repeat(64),
        predecessor: {
          basePng: png,
          foregroundPng: png,
          approvedBaseSha256: sha256(png),
          approvedForegroundSha256: sha256(png)
        },
        generation: { base: generation, foreground: generation },
        refinements: []
      })
    ).rejects.toThrow(/uniform/i);
  });
});
```

Also add table-driven cases for stale control hash, stale storage hash, changed predecessor hash, hard-budget excess, and identical-input byte identity.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts
```

- [ ] **Step 3: Implement exact-ratio normalization**

Validate:

```text
scale = output.width / crop.width = output.height / crop.height
crop fits native candidate
production policy = 6400×6400
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

`tools/finalize-meadow-entry-masters.ts` accepts:

```text
--plane base|foreground|both
--base-candidate
--foreground-candidate
--base-transform
--foreground-transform
--base-provenance
--foreground-provenance
--refinement-manifest
--output-root <path>          # defaults to artifacts/meadow-entry/hpa-399
--validate-only              # performs all checks without writing
```

In approved mode it writes temporary masters and provenance, validates the complete package, then atomically replaces:

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

- Consumes: current canonical master, replacement candidate, source-derived edit mask, protected/non-target masks, transform, approved crops, and control fingerprint.
- Produces:

```ts
export interface MeadowEntryRefinementProvenance {
  plane: 'base' | 'foreground';
  sourceRegionIds: readonly string[];
  editMaskSha256: string;
  replacementSha256: string;
  beforeMasterSha256: string;
  afterMasterSha256: string;
  changedBounds: PixelBounds;
  affectedCropIds: readonly string[];
  transform: MeadowEntryNormalizationTransform;
}

export interface MeadowEntryRefinementInput {
  plane: 'base' | 'foreground';
  currentMasterPng: Buffer;
  replacementPng: Buffer;
  editMaskPng: Buffer;
  protectedMaskPng: Buffer;
  nonTargetMaskPng: Buffer;
  transform: MeadowEntryNormalizationTransform;
  sourceRegionIds: readonly string[];
  controlFingerprint: string;
  approvedControlFingerprint: string;
}

export async function applyMeadowEntryRefinement(
  input: MeadowEntryRefinementInput
): Promise<{ masterPng: Buffer; provenance: MeadowEntryRefinementProvenance }>;
```

- [ ] **Step 1: Write failing mask-safety tests with a 2×1 master**

```ts
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { decodeMeadowEntryRgba } from './meadow-entry-png';
import { applyMeadowEntryRefinement } from './meadow-entry-master-refinement';

async function png(bytes: number[]): Promise<Buffer> {
  return sharp(Buffer.from(bytes), { raw: { width: 2, height: 1, channels: 4 } }).png().toBuffer();
}

const transform = {
  native: { width: 2, height: 1 },
  crop: { left: 0, top: 0, width: 2, height: 1 },
  output: { width: 2, height: 1 },
  scale: 1
};

describe('meadow-entry master refinement', () => {
  it('changes only edit-mask pixels', async () => {
    const result = await applyMeadowEntryRefinement({
      plane: 'base',
      currentMasterPng: await png([0, 0, 0, 255, 0, 0, 0, 255]),
      replacementPng: await png([255, 0, 0, 255, 255, 0, 0, 255]),
      editMaskPng: await png([0, 0, 0, 255, 0, 0, 0, 0]),
      protectedMaskPng: await png([0, 0, 0, 0, 0, 0, 0, 0]),
      nonTargetMaskPng: await png([0, 0, 0, 0, 0, 0, 0, 0]),
      transform,
      sourceRegionIds: ['crossroads'],
      controlFingerprint: 'a'.repeat(64),
      approvedControlFingerprint: 'a'.repeat(64)
    });
    expect([...((await decodeMeadowEntryRgba(result.masterPng)).data)]).toEqual([
      255, 0, 0, 255, 0, 0, 0, 255
    ]);
  });

  it('rejects protected-mask overlap', async () => {
    await expect(
      applyMeadowEntryRefinement({
        plane: 'base',
        currentMasterPng: await png([0, 0, 0, 255, 0, 0, 0, 255]),
        replacementPng: await png([255, 0, 0, 255, 255, 0, 0, 255]),
        editMaskPng: await png([0, 0, 0, 255, 0, 0, 0, 0]),
        protectedMaskPng: await png([0, 0, 0, 255, 0, 0, 0, 0]),
        nonTargetMaskPng: await png([0, 0, 0, 0, 0, 0, 0, 0]),
        transform,
        sourceRegionIds: ['crossroads'],
        controlFingerprint: 'a'.repeat(64),
        approvedControlFingerprint: 'a'.repeat(64)
      })
    ).rejects.toThrow(/protected/i);
  });
});
```

Also assert non-target rejection, foreground zero-RGB preservation, stale fingerprint rejection, and computed affected crop IDs from the approved crop table.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts
```

- [ ] **Step 3: Implement the compositor**

Normalize the replacement through the same transform validator as the master finalizer. Composite only where `editMask > 0`, fail on any protected/non-target intersection, canonical-encode, calculate changed bounds, derive every intersecting crop ID from the approved crop table, and record before/after hashes.

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

It refuses an unknown source region or a changed area not covered by approved crops/fallback policy. It writes a new candidate master and refinement sidecar under ignored `work/`; it never writes approved master paths directly.

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
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json`
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
floor, roots and cave approach. Quiet detail on routes, doorway approaches,
encounters, rewards and handoffs. Include only approved low static obstacle
treatment. Do not invent buildings, gates, signs, doors, NPCs, pickups, enemies,
markers, story objects, text, or false paths. Preserve all protected-live
footprints.
```

Record provider/model/tool/version/settings, prompt, reference hashes, native dimensions, seed or seed-unavailable declaration, and candidate SHA in the generation JSON.

- [ ] **Step 2: Normalize into an ignored review output**

```bash
rtk bun tools/finalize-meadow-entry-masters.ts \
  --plane base \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --base-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json \
  --output-root artifacts/meadow-entry/hpa-399/work/base-review
```

Expected: a review-only base and provenance are written under ignored `work/`; approved logical paths are untouched.

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

For each accepted refinement, record source region, edit mask, replacement hash, transform, changed-pixel bounds, and computed affected crop IDs. Re-review the recomposed full master and every affected handoff.

- [ ] **Step 5: Freeze the base candidate inputs**

When approved, update only the untracked generation/refinement provenance inputs consumed by finalization. Do not commit candidates or intermediate refinements.

No Git commit occurs in this task; the approved LFS master is committed atomically with the foreground in Task 5.

---

### Task 5: Produce the Sparse Foreground and Finalize Both Masters

**Files:**

- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json`
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

- [ ] **Step 2: Preflight foreground masks without writing**

```bash
rtk bun tools/finalize-meadow-entry-masters.ts \
  --plane foreground \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --foreground-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json \
  --validate-only
```

Require:

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
  --plane both \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --base-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json \
  --foreground-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json
```

Expected: both LFS masters and master provenance are written; HPA-398 hashes remain unchanged.

- [ ] **Step 5: Re-run finalization and prove byte identity**

```bash
rtk sha256sum artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json > /tmp/hpa399-master-hashes.before
rtk bun tools/finalize-meadow-entry-masters.ts \
  --plane both \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --base-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json \
  --foreground-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json
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
export interface MeadowEntryExportContract {
  crops: readonly MeadowEntryApprovedCrop[];
  overlaps: readonly MeadowEntryOverlap[];
}

export interface MeadowEntryExportResult {
  cropId: string;
  base: ValidatedMeadowEntryPng;
  foreground: ValidatedMeadowEntryPng | null;
}

export interface MeadowEntryDecodedExport {
  cropId: string;
  plane: 'base' | 'foreground';
  bounds: PixelBounds;
  width: number;
  height: number;
  rgba: Buffer;
}

export async function exportMeadowEntryRegions(input: {
  baseMasterPng: Buffer;
  foregroundMasterPng: Buffer;
  controlFingerprint: string;
  approvedControlFingerprint: string;
  contract: MeadowEntryExportContract;
}): Promise<{
  files: Readonly<Record<string, Buffer>>;
  results: readonly MeadowEntryExportResult[];
  decoded: readonly MeadowEntryDecodedExport[];
  provenanceJson: Buffer;
}>;

export function verifyMeadowEntryOverlapPixels(input: {
  decoded: readonly MeadowEntryDecodedExport[];
  overlaps: readonly MeadowEntryOverlap[];
}): void;
```

- [ ] **Step 1: Write failing exporter tests with a concrete 3×1 fixture master**

```ts
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { decodeMeadowEntryRgba } from './meadow-entry-png';
import {
  exportMeadowEntryRegions,
  verifyMeadowEntryOverlapPixels
} from './meadow-entry-exporter';

async function master(bytes: number[]): Promise<Buffer> {
  return sharp(Buffer.from(bytes), { raw: { width: 3, height: 1, channels: 4 } }).png().toBuffer();
}

const crop = {
  id: 'fixture',
  derivation: { mode: 'exact-bounds' as const },
  reviewBounds: { left: 1, top: 0, right: 3, bottom: 1 },
  coverageAttachments: [],
  preClampBounds: { left: 1, top: 0, right: 3, bottom: 1 },
  edgeClamp: null,
  bounds: { left: 1, top: 0, right: 3, bottom: 1 },
  expectedDimensions: { width: 2, height: 1 },
  baseFilename: 'fixture-base.png',
  foregroundFilename: null,
  textureKeys: { base: 'meadow-entry-fixture-base', foreground: null },
  drawOrder: 1,
  sourceRegionIds: ['crossroads'],
  neighborIds: [],
  overlapIds: [],
  alphaPolicy: { base: 'opaque' as const, foreground: null },
  sizeBudgets: {
    baseReviewBytes: 1024,
    baseHardBytes: 2048,
    foregroundReviewBytes: null,
    foregroundHardBytes: null
  }
};

describe('meadow-entry exporter', () => {
  it('extracts exact half-open pixels without resizing', async () => {
    const base = await master([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255
    ]);
    const transparent = await master(new Array(12).fill(0));
    const result = await exportMeadowEntryRegions({
      baseMasterPng: base,
      foregroundMasterPng: transparent,
      controlFingerprint: 'a'.repeat(64),
      approvedControlFingerprint: 'a'.repeat(64),
      contract: { crops: [crop], overlaps: [] }
    });
    const decoded = await decodeMeadowEntryRgba(result.files['fixture-base.png']!);
    expect([...decoded.data]).toEqual([0, 255, 0, 255, 0, 0, 255, 255]);
    expect(result.files['fixture-foreground.png']).toBeUndefined();
  });

  it('reports the first differing overlap coordinate', () => {
    const first = {
      cropId: 'a',
      plane: 'base' as const,
      bounds: { left: 0, top: 0, right: 2, bottom: 1 },
      width: 2,
      height: 1,
      rgba: Buffer.from([1, 2, 3, 255, 4, 5, 6, 255])
    };
    const second = {
      cropId: 'b',
      plane: 'base' as const,
      bounds: { left: 1, top: 0, right: 3, bottom: 1 },
      width: 2,
      height: 1,
      rgba: Buffer.from([9, 9, 9, 255, 7, 8, 9, 255])
    };
    expect(() =>
      verifyMeadowEntryOverlapPixels({
        decoded: [first, second],
        overlaps: [
          {
            id: 'a-b',
            firstCropId: 'a',
            secondCropId: 'b',
            bounds: { left: 1, top: 0, right: 2, bottom: 1 },
            routeMouth: {
              sharedAxis: 'x',
              bounds: { left: 1, top: 0, right: 2, bottom: 1 }
            },
            minimumSharedPixels: 1,
            planePolicy: 'base-only',
            ownerCropId: 'a'
          }
        ]
      })
    ).toThrow(/master=1,0.*crop=a.*crop=b/i);
  });
});
```

Add exact tests for transparent canonical foregrounds, two-dimensional corner groups, per-crop/aggregate budgets, stale fingerprints, and repeated byte identity.

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
- Produces:

```ts
export interface ApprovedPngArtifact {
  path: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
}

export interface ApprovedMeadowEntryExport extends ApprovedPngArtifact {
  cropId: string;
  plane: 'base' | 'foreground';
  textureKey: string;
  drawOrder: number;
}

export interface ApprovedMeadowEntryProof extends ApprovedPngArtifact {
  proofId: string;
  inputSha256: readonly string[];
}

export interface MeadowEntryArtPackageApproval {
  combinedControlFingerprint: string;
  storageMode: 'git-lfs';
  storageConfigurationSha256: string;
  baseMaster: ApprovedPngArtifact;
  foregroundMaster: ApprovedPngArtifact;
  cropManifestSha256: string;
  masterProvenanceSha256: string;
  exportProvenanceSha256: string;
  exports: readonly ApprovedMeadowEntryExport[];
  proofs: readonly ApprovedMeadowEntryProof[];
  evidencePath: 'docs/superpowers/reports/2026-07-30-hpa-399-visual-masters-exports-validation.md';
}

export const MEADOW_ENTRY_PROOF_FILENAMES: readonly string[];
export async function renderMeadowEntryReviewComposite(input: {
  baseMasterPng: Buffer;
  foregroundMasterPng: Buffer;
  sundropBasePng: Buffer;
  sundropForegroundPng: Buffer;
  sundropBounds: PixelBounds;
}): Promise<Buffer>;
export function buildMeadowEntryProofInventory(): readonly string[];
export const meadowEntryArtPackageApproval: MeadowEntryArtPackageApproval;
```

- [ ] **Step 1: Write failing proof tests with concrete ordering and inventory assertions**

```ts
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { decodeMeadowEntryRgba } from './meadow-entry-png';
import {
  MEADOW_ENTRY_PROOF_FILENAMES,
  buildMeadowEntryProofInventory,
  renderMeadowEntryReviewComposite
} from './meadow-entry-proof-renderer';

async function pixel(r: number, g: number, b: number, alpha: number): Promise<Buffer> {
  return sharp(Buffer.from([r, g, b, alpha]), {
    raw: { width: 1, height: 1, channels: 4 }
  }).png().toBuffer();
}

describe('meadow-entry proof renderer', () => {
  it('renders immutable Sundrop overlays above HPA-399 planes', async () => {
    const composite = await renderMeadowEntryReviewComposite({
      baseMasterPng: await pixel(0, 255, 0, 255),
      foregroundMasterPng: await pixel(0, 0, 255, 128),
      sundropBasePng: await pixel(255, 0, 0, 255),
      sundropForegroundPng: await pixel(255, 255, 0, 128),
      sundropBounds: { left: 0, top: 0, right: 1, bottom: 1 }
    });
    const rgba = (await decodeMeadowEntryRgba(composite)).data;
    expect([...rgba]).not.toEqual([0, 255, 0, 255]);
    expect(rgba[0]).toBeGreaterThan(rgba[2]!);
  });

  it('returns the exact fixed proof inventory', () => {
    expect(buildMeadowEntryProofInventory()).toEqual(MEADOW_ENTRY_PROOF_FILENAMES);
    expect(new Set(MEADOW_ENTRY_PROOF_FILENAMES).size).toBe(MEADOW_ENTRY_PROOF_FILENAMES.length);
  });
});
```

Add fixture tests for zero-valued overlap diffs, every crop/overlap/corner/clamp/fallback proof ID, four Sundrop edge proofs, and rejection of writes outside the fixed inventory.

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

`tools/approve-meadow-entry-art-package.ts` reads existing artifacts, hashes and decodes each one, and writes a concrete `MeadowEntryArtPackageApproval`. The independent asset test re-hashes every path, validates dimensions/bytes, confirms every approved export/proof exists exactly once, and matches the PR-1 fingerprint/storage hash.

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
PR-1 control regeneration in --check mode
master approval, predecessor freeze, canonical PNG, alpha, mask, and budget validation
export regeneration and clean hash comparison
overlap/corner verification
proof regeneration and clean hash comparison
all HPA-399 focused unit/asset tests
provenance and fixed-inventory/path allowlist verification
```

The validator does not claim to regenerate generative source candidates in CI. It validates approved masters and deterministically regenerates only exports and proofs from those masters.

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

Expected: PASS and no deterministic regeneration diff.

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
- explicit distinction between deterministic finalization/export and non-byte-reproducible generative recreation;
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
