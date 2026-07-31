# HPA-399 Visual Masters and Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce, approve, and package one coherent `6400×6400` base master, one sparse foreground master, the exact Sundrop underlay, and every deterministic regional/connector export defined by the approved PR-1 crop contract.

**Architecture:** Treat the merged PR-1 control fingerprint, crop/overlap/coverage tables, Git LFS configuration, and predecessor hashes as immutable inputs. Separate reviewed art creation from deterministic engineering: candidate creation and masked refinement are provenance-rich review steps; normalization, masking, PNG encoding, export, overlap comparison, proof generation, approval hashing, and CI validation are deterministic. HPA-399 stores the package but never registers it at runtime; HPA-406 owns integration and fallback execution.

**Tech Stack:** TypeScript 6, Bun, Vitest, Sharp 0.35.3, Git LFS, SVG/PNG/JSON, GitHub Actions, Prettier, ESLint, Vite, Tauri 2.

## Global Constraints

- Start only after the controls/crops/storage PR is merged and explicitly approved. Create `codex/hpa-399-visual-masters-exports` from that `main` in an isolated worktree using `superpowers:using-git-worktrees`.
- Do not change Linear status or post detailed Linear evidence without separate user authorization.
- The approved PR-1 control fingerprint, storage hash, crop/overlap/coverage tables, HPA-398 PNG hashes, and historical HPA-307 hashes are immutable inputs. Drift blocks all finalization and export.
- Do not change gameplay geometry, collision, encounters, transitions, pickups, discoveries, landmarks, NPCs, save data, preload registration, background descriptors, `WorldScene`, or live fallback logic.
- Base master: exactly `6400×6400` RGBA, alpha `255` everywhere, review target `128 MiB`, hard limit `192 MiB`.
- Foreground master: exactly `6400×6400` RGBA, pixels only inside the approved eligible mask, no pixels over protected-live foreground decor, RGB `0,0,0` whenever alpha is `0`, review target `48 MiB`, hard limit `96 MiB`.
- Shared foreground front cutoff is `33px`; smaller reviewed exceptions are allowed, larger values are forbidden.
- Mistfen fog-color ground is opaque base paint. Translucent fog remains live unless PR 1 approved explicit foreground ownership and an HPA-406 fallback obligation.
- `sundrop-village-underlay` is a direct base-only crop at `{ left: 256, top: 4352, right: 2048, bottom: 5888 }`, with `4 MiB` review and `8 MiB` hard limits.
- Preserve `public/game/assets/regions/sundrop-village-base.png`, `sundrop-village-foreground.png`, and all HPA-307/HPA-398 approvals/evidence byte-for-byte.
- Exports are direct half-open crops of approved masters. No resize, recolor, sharpen, warp, or crop-local retouch is permitted.
- Shared decoded RGBA overlap pixels must be identical; every corner group is validated in two dimensions.
- Candidate and refinement sources stay under ignored `artifacts/meadow-entry/hpa-399/candidates/` or `work/` paths and are never committed.
- Masters, exports, and native proofs are Git LFS objects. Compact JSON, Markdown, and SVG controls remain ordinary Git.
- CI validates approved masters and deterministically regenerates exports/proofs. CI does not claim to reproduce nondeterministic generative candidates.
- Commands use `rtk` and run from repository root unless noted.

## File Structure

### New modules

- `src/lib/game/content/backgrounds/meadow-entry-png.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-provenance.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-refinement.ts`
- `src/lib/game/content/backgrounds/meadow-entry-exporter.ts`
- `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts`
- `src/lib/game/content/approvals/meadow-entry-art-package.ts`
- `tools/finalize-meadow-entry-masters.ts`
- `tools/refine-meadow-entry-master.ts`
- `tools/export-meadow-entry-regions.ts`
- `tools/render-meadow-entry-art-proofs.ts`
- `tools/approve-meadow-entry-art-package.ts`
- `tools/validate-meadow-entry-art-package.ts`

### New tests

- `src/lib/game/content/backgrounds/meadow-entry-png.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts`
- `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- `src/lib/game/content/meadow-entry-art-package.asset.test.ts`

### Existing files modified

- `package.json`
- `.github/workflows/ci.yml`

### LFS-backed package

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

```ts
export const MEADOW_ENTRY_PNG_OPTIONS = {
  palette: false,
  compressionLevel: 9,
  adaptiveFiltering: false,
  force: true
} as const;

export interface DecodedMeadowEntryRgba {
  data: Buffer;
  width: number;
  height: number;
}

export interface ValidatedMeadowEntryPng {
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

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

export interface MeadowEntryNormalizationTransform {
  native: { width: number; height: number };
  crop: { left: number; top: number; width: number; height: number };
  output: { width: number; height: number };
  scale: number;
}

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

export async function decodeMeadowEntryRgba(png: Buffer): Promise<DecodedMeadowEntryRgba>;
export async function encodeCanonicalMeadowEntryPng(
  raw: Buffer,
  width: number,
  height: number
): Promise<Buffer>;
export function validateCanonicalPngChunks(png: Buffer): void;
export async function writeAtomicMeadowEntryPng(path: string, png: Buffer): Promise<void>;
export function validateMeadowEntryGenerationProvenance(
  value: MeadowEntryGenerationProvenance
): void;
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

  it('rejects PNG metadata chunks', async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 4, background: '#00000000' }
    })
      .png()
      .withMetadata({ density: 72 })
      .toBuffer();
    expect(() => validateCanonicalPngChunks(png)).toThrow(/non-canonical PNG chunk/i);
  });
});
```

- [ ] **Step 2: Write failing provenance tests**

```ts
import { describe, expect, it } from 'vitest';
import { validateMeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';

describe('meadow-entry generation provenance', () => {
  it('accepts a generative record when the provider exposes no seed', () => {
    expect(() =>
      validateMeadowEntryGenerationProvenance({
        mode: 'generative',
        provider: 'approved-provider',
        model: 'approved-model',
        modelVersion: '2026-07-30',
        tool: 'image-client',
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

  it('accepts manual production with no seed semantics', () => {
    expect(() =>
      validateMeadowEntryGenerationProvenance({
        mode: 'manual',
        provider: null,
        model: null,
        modelVersion: null,
        tool: 'manual-paint',
        toolVersion: '1',
        settings: {},
        seed: null,
        seedUnavailable: false,
        prompt: null,
        promptSha256: null,
        referenceImageSha256: [],
        byteReproducibleGeneration: true
      })
    ).not.toThrow();
  });

  it('rejects a false byte-reproducibility claim for a seedless model', () => {
    const invalid = {
      mode: 'generative' as const,
      provider: 'approved-provider',
      model: 'approved-model',
      modelVersion: '2026-07-30',
      tool: 'image-client',
      toolVersion: '1.0.0',
      settings: {},
      seed: null,
      seedUnavailable: true,
      prompt: 'orthographic meadow-entry master',
      promptSha256: 'a'.repeat(64),
      referenceImageSha256: [],
      byteReproducibleGeneration: true
    };
    expect(() => validateMeadowEntryGenerationProvenance(invalid)).toThrow(/byte-reproducible/i);
  });
});
```

- [ ] **Step 3: Run and verify failure**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-png.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
```

- [ ] **Step 4: Implement canonical encoding and validation**

Reuse the proven HPA-398 CRC/chunk and randomized sibling temporary-write patterns without modifying HPA-398 modules. Accept only `IHDR`, `IDAT`, and `IEND` chunks.

Provenance rules:

- generative mode requires provider, model, model version, prompt, and prompt hash;
- in generative mode, `seed: null` requires `seedUnavailable: true`;
- manual mode requires provider/model/modelVersion/seed/prompt/promptSha256 to be `null` and `seedUnavailable: false`;
- a generative record may claim byte reproducibility only when its provider declaration and seed support that claim;
- all hashes are lowercase 64-character SHA-256 values.

- [ ] **Step 5: Run tests and commit**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-png.test.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-provenance.test.ts
rtk git add src/lib/game/content/backgrounds/meadow-entry-{png,master-provenance}.ts \
  src/lib/game/content/backgrounds/meadow-entry-{png,master-provenance}.test.ts
rtk git commit -m "feat(hpa-399): add master PNG and provenance contracts"
```

---

### Task 2: Implement Deterministic Base and Foreground Finalizers

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts`
- Create: `tools/finalize-meadow-entry-masters.ts`

**Interfaces:**

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

export interface MeadowEntryFinalizerContext {
  policy: MeadowEntryMasterPolicy;
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
}

export interface FinalizeMeadowEntryBaseInput extends MeadowEntryFinalizerContext {
  candidatePng: Buffer;
  transform: MeadowEntryNormalizationTransform;
  generation: MeadowEntryGenerationProvenance;
  refinements: readonly MeadowEntryRefinementProvenance[];
}

export interface FinalizeMeadowEntryForegroundInput extends MeadowEntryFinalizerContext {
  candidatePng: Buffer;
  transform: MeadowEntryNormalizationTransform;
  eligibleMaskPng: Buffer;
  protectedMaskPng: Buffer;
  generation: MeadowEntryGenerationProvenance;
  refinements: readonly MeadowEntryRefinementProvenance[];
}

export async function finalizeMeadowEntryBase(
  input: FinalizeMeadowEntryBaseInput
): Promise<{ png: Buffer; provenance: object }>;
export async function finalizeMeadowEntryForeground(
  input: FinalizeMeadowEntryForegroundInput
): Promise<{ png: Buffer; provenance: object }>;
export async function finalizeMeadowEntryMasters(input: {
  base: FinalizeMeadowEntryBaseInput;
  foreground: FinalizeMeadowEntryForegroundInput;
}): Promise<{ basePng: Buffer; foregroundPng: Buffer; provenanceJson: Buffer }>;
```

- [ ] **Step 1: Write failing 2×2 finalizer tests**

Use in-memory Sharp fixtures. The first test must prove:

```ts
const base = await finalizeMeadowEntryBase({
  ...context,
  candidatePng: rgbaPngWithNonOpaqueAlpha,
  transform: identityTransform(2, 2),
  generation: manualFixture,
  refinements: []
});
expect(alphaBytes(await decodeMeadowEntryRgba(base.png))).toEqual([255, 255, 255, 255]);

const foreground = await finalizeMeadowEntryForeground({
  ...context,
  candidatePng: fullyPaintedForeground,
  transform: identityTransform(2, 2),
  eligibleMaskPng: eligiblePixelsZeroAndThree,
  protectedMaskPng: protectedPixelThree,
  generation: manualFixture,
  refinements: []
});
expect(pixel(await decodeMeadowEntryRgba(foreground.png), 0)).toEqual([200, 1, 2, 255]);
expect(pixel(await decodeMeadowEntryRgba(foreground.png), 1)).toEqual([0, 0, 0, 0]);
expect(pixel(await decodeMeadowEntryRgba(foreground.png), 3)).toEqual([0, 0, 0, 0]);
```

Add exact failure cases for non-uniform transforms, stale control hash, stale storage hash, changed predecessor hash, hard-budget excess, wrong mask dimensions, and repeated byte identity.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts
```

- [ ] **Step 3: Implement exact-ratio normalization and plane rules**

Validate:

```text
scale = output.width / crop.width = output.height / crop.height
crop fits native input
production policy = 6400×6400
no non-uniform scale or warp
```

Use one `extract` and one uniform Lanczos3 resize. Base output forces all alpha to `255`. Foreground output applies `eligible ∩ ¬protected`, and sets all four channels to zero outside that mask. Validate predecessor hashes before producing bytes.

- [ ] **Step 4: Implement the CLI**

```text
--plane base|foreground|both
--base-candidate
--foreground-candidate
--base-transform
--foreground-transform
--base-provenance
--foreground-provenance
--refinement-manifest
--output-root <path>       # default artifacts/meadow-entry/hpa-399
--validate-only
```

`base` and `foreground` modes call the corresponding pure finalizer and support ignored review output roots. `both` finalizes both planes, validates one combined provenance object, then atomically replaces the approved logical package. Failure leaves prior approved files untouched.

- [ ] **Step 5: Run tests and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-finalizer.test.ts
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
  controlFingerprint: string;
  approvedControlFingerprint: string;
  approvedCrops: readonly MeadowEntryApprovedCrop[];
}

export async function applyMeadowEntryRefinement(
  input: MeadowEntryRefinementInput
): Promise<{ masterPng: Buffer; provenance: MeadowEntryRefinementProvenance }>;
```

- [ ] **Step 1: Write failing 2×1 mask-safety tests**

Create a black two-pixel master, red replacement, and a mask selecting only pixel zero. Assert the result is red/black. Then create a protected mask selecting pixel zero and assert `/protected/i`. Add cases for non-target overlap, stale fingerprint, foreground zero-RGB preservation, changed-bounds calculation, and affected-crop derivation.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts
```

- [ ] **Step 3: Implement compositor and CLI**

Normalize the replacement through the shared transform validator. Composite only where `editMask > 0`; reject protected or non-target intersections; canonical-encode; derive changed bounds and every intersecting approved crop; record before/after hashes.

CLI:

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

Write only an ignored `work/` candidate plus refinement sidecar. Never write approved master paths.

- [ ] **Step 4: Run tests and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts
rtk git add \
  src/lib/game/content/backgrounds/meadow-entry-master-refinement.ts \
  src/lib/game/content/backgrounds/meadow-entry-master-refinement.test.ts \
  tools/refine-meadow-entry-master.ts
rtk git commit -m "feat(hpa-399): constrain regional master refinements"
```

---

### Task 4: Produce and Review the Global Base Candidate

**Files:**

- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json`
- Local untracked: `artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json`

- [ ] **Step 1: Generate or manually paint one global candidate**

Use the full control package. Production brief:

```text
Orthographic top-down JRPG overworld, one coherent square world. Upper-left
sunlight, consistent soft contact shadows, no perspective tilt. Continuous
roads and transition throats exactly matching controls. Warm Sundrop underlay;
worn Crossroads cobble and festival earth; Tidewatch sand, salt grass and low
shoreline rock; Mistfen mud, shallow pools, roots and opaque fog-color ground;
Silverpine autumn floor and ceremonial stone; Wildwood forest floor, roots and
cave approach. Quiet detail on routes, doorway approaches, encounters, rewards
and handoffs. Include only approved low static obstacle treatment. Do not
invent buildings, gates, signs, doors, NPCs, pickups, enemies, markers, story
objects, text, or false paths. Preserve every protected-live footprint.
```

Record provider/model/tool/version/settings, prompt/reference hashes, native dimensions, seed or seed-unavailable declaration, and candidate SHA.

- [ ] **Step 2: Normalize to ignored review output**

```bash
rtk bun tools/finalize-meadow-entry-masters.ts \
  --plane base \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --base-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json \
  --output-root artifacts/meadow-entry/hpa-399/work/base-review
```

- [ ] **Step 3: Review and refine**

Inspect full master, every crop, every handoff, every baked/fallback boundary, and Sundrop feather composition. Reject road drift, false entrances, palette breaks, crop seams, missing baked obstacles, invented live objects, forbidden tall paint, or unapproved fallback boundaries.

Apply all corrections through Task 3 tooling and re-review every affected crop/handoff. Do not commit candidates or intermediate refinements.

---

### Task 5: Produce Foreground and Finalize Both Masters

**Files:**

- Local untracked: foreground candidate/provenance/transform
- Create LFS: `artifacts/meadow-entry/hpa-399/masters/meadow-entry-base-master.png`
- Create LFS: `artifacts/meadow-entry/hpa-399/masters/meadow-entry-foreground-master.png`
- Create: `artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json`

- [ ] **Step 1: Create the sparse foreground candidate**

```text
Transparent orthographic occlusion layer aligned to the approved base and
eligible mask. Include only approved canopy tops, hedge tops, wall fronts,
arches, reeds, and branches. Do not paint buildings, gates, NPCs, pickups,
encounters, discoveries, story/stateful objects, protected live foreground
decor, routes, doorways, or interaction clearances. Respect the shared 33px
front cutoff and every smaller approved exception. RGB must be zero when alpha
is zero.
```

- [ ] **Step 2: Validate without writing**

```bash
rtk bun tools/finalize-meadow-entry-masters.ts \
  --plane foreground \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --foreground-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json \
  --validate-only
```

Require zero pixels outside eligibility, over protected foreground decor, or with nonzero RGB at zero alpha.

- [ ] **Step 3: Review on checkerboard and over base**

Inspect every eligible obstacle, cutoff case, route mouth, discovery/reward clearance, Mistfen live fog footprint, and immutable HPA-398 foreground boundary.

- [ ] **Step 4: Finalize atomically and prove repeatability**

```bash
rtk bun tools/finalize-meadow-entry-masters.ts --plane both \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --base-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json \
  --foreground-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json
rtk sha256sum artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json > /tmp/hpa399-masters.before
rtk bun tools/finalize-meadow-entry-masters.ts --plane both \
  --base-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-candidate.png \
  --foreground-candidate artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-candidate.png \
  --base-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-transform.json \
  --foreground-transform artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-transform.json \
  --base-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-base-generation.json \
  --foreground-provenance artifacts/meadow-entry/hpa-399/candidates/meadow-entry-foreground-generation.json \
  --refinement-manifest artifacts/meadow-entry/hpa-399/candidates/meadow-entry-refinements.json
rtk sha256sum artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json > /tmp/hpa399-masters.after
rtk diff -u /tmp/hpa399-masters.before /tmp/hpa399-masters.after
```

- [ ] **Step 5: Verify LFS and commit**

```bash
rtk git add artifacts/meadow-entry/hpa-399/masters/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-master-provenance.json
rtk git lfs fsck
rtk git commit -m "art(hpa-399): add approved meadow-entry masters"
```

---

### Task 6: Export Crops and Verify Shared Pixels

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-exporter.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts`
- Create: `tools/export-meadow-entry-regions.ts`
- Create LFS: `artifacts/meadow-entry/hpa-399/exports/*.png`
- Create provenance JSON files.

**Interfaces:**

```ts
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
  crops: readonly MeadowEntryApprovedCrop[];
  overlaps: readonly MeadowEntryOverlap[];
}): Promise<{
  files: Readonly<Record<string, Buffer>>;
  decoded: readonly MeadowEntryDecodedExport[];
  provenanceJson: Buffer;
}>;

export function verifyMeadowEntryOverlapPixels(input: {
  decoded: readonly MeadowEntryDecodedExport[];
  overlaps: readonly MeadowEntryOverlap[];
}): void;
```

- [ ] **Step 1: Write failing fixture tests**

Use a `3×1` red/green/blue master and a crop `[1,3)`; assert exported bytes are green/blue and no foreground file exists for a base-only crop. Create two decoded overlapping exports with different RGBA values and assert the error reports both crop IDs plus `master=1,0`. Add cases for transparent canonical foregrounds, corner groups, stale fingerprints, budget calculation, and repeated byte identity.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts
```

- [ ] **Step 3: Implement direct extraction and verification**

Use one Sharp `extract` per plane/crop and no resize. Compare decoded result pixels against master coordinates. Enforce filenames, texture keys, dimensions, draw order, plane policy, per-crop budgets, and computed aggregate budgets. Compare overlap/corner pixels channel-by-channel and report first differing master/local coordinates.

- [ ] **Step 4: Implement atomic CLI, export twice, and commit**

```bash
rtk bun tools/export-meadow-entry-regions.ts
rtk sha256sum artifacts/meadow-entry/hpa-399/exports/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json > /tmp/hpa399-exports.before
rtk bun tools/export-meadow-entry-regions.ts
rtk sha256sum artifacts/meadow-entry/hpa-399/exports/*.png \
  artifacts/meadow-entry/hpa-399/provenance/meadow-entry-export-provenance.json > /tmp/hpa399-exports.after
rtk diff -u /tmp/hpa399-exports.before /tmp/hpa399-exports.after
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts
rtk git add artifacts/meadow-entry/hpa-399/exports/*.png \
  artifacts/meadow-entry/hpa-399/provenance/*.json \
  src/lib/game/content/backgrounds/meadow-entry-exporter.ts \
  src/lib/game/content/backgrounds/meadow-entry-exporter.test.ts \
  tools/export-meadow-entry-regions.ts
rtk git lfs fsck
rtk git commit -m "art(hpa-399): export approved meadow-entry regions"
```

---

### Task 7: Render Native Proofs and Approve the Package

**Files:**

- Create: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.ts`
- Create: `src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts`
- Create: `tools/render-meadow-entry-art-proofs.ts`
- Create: `tools/approve-meadow-entry-art-package.ts`
- Create: `src/lib/game/content/approvals/meadow-entry-art-package.ts`
- Create: `src/lib/game/content/meadow-entry-art-package.asset.test.ts`
- Create LFS proof inventory.

**Interfaces:**

```ts
export interface ApprovedPngArtifact {
  path: string;
  sha256: string;
  bytes: number;
  width: number;
  height: number;
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
  exports: readonly (ApprovedPngArtifact & {
    cropId: string;
    plane: 'base' | 'foreground';
    textureKey: string;
    drawOrder: number;
  })[];
  proofs: readonly (ApprovedPngArtifact & {
    proofId: string;
    inputSha256: readonly string[];
  })[];
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
```

- [ ] **Step 1: Write failing proof tests**

Use four one-pixel layers to prove immutable Sundrop base/foreground composite above HPA-399 planes. Assert the fixed proof inventory has no duplicates. Add cases for zero-valued overlap diffs, every crop/overlap/corner/clamp/fallback proof ID, four Sundrop edge proofs, and rejection of unexpected output paths.

- [ ] **Step 2: Run and verify failure**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts
```

- [ ] **Step 3: Implement and render proofs**

Generate full base, foreground checkerboard, immutable-Sundrop composite, protected/collision/eligibility overlays, baked/fallback coverage, every region/connector, overlap diff, corner group, edge clamp, fallback boundary, and four Sundrop feather edges. Sidecars record input hashes and master coordinates. Writes are fixed-inventory and atomic.

```bash
rtk bun tools/render-meadow-entry-art-proofs.ts
rtk git lfs ls-files --name-only | grep '^docs/superpowers/reports/img/hpa-399/proofs/'
```

- [ ] **Step 4: Review and approve**

Require zero overlap differences, zero unexplained coverage, continuous feather edges, readable interactions, and no protected foreground overlap.

`tools/approve-meadow-entry-art-package.ts` hashes/decodes every master, export, and proof and writes a concrete `MeadowEntryArtPackageApproval`. The independent asset test re-hashes every path, validates dimensions/bytes, checks exact inventory membership, and matches PR-1 control/storage hashes.

```bash
rtk bun tools/approve-meadow-entry-art-package.ts \
  --reviewed-by "$USER" \
  --reviewed-at "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/meadow-entry-proof-renderer.test.ts \
  src/lib/game/content/meadow-entry-art-package.asset.test.ts
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

- [ ] **Step 1: Add scripts**

```json
"art:finalize:meadow-entry": "bun tools/finalize-meadow-entry-masters.ts",
"art:export:meadow-entry": "bun tools/export-meadow-entry-regions.ts",
"art:proof:meadow-entry": "bun tools/render-meadow-entry-art-proofs.ts",
"art:approve:meadow-entry": "bun tools/approve-meadow-entry-art-package.ts",
"art:validate:meadow-entry": "bun tools/validate-meadow-entry-art-package.ts"
```

- [ ] **Step 2: Implement validator orchestration**

Stop on first failure:

```text
Git LFS prerequisite, pointer, object, and materialization verification
PR-1 controls in --check mode
master approval, predecessor freeze, canonical PNG, alpha, mask, and budget checks
export regeneration and clean hash comparison
overlap/corner verification
proof regeneration and clean hash comparison
all HPA-399 focused unit/asset tests
provenance and fixed-inventory/path allowlist checks
```

The validator never claims to recreate generative candidates. It validates approved masters and regenerates only deterministic downstream artifacts.

- [ ] **Step 3: Add CI job**

Use `actions/checkout@v4` with `lfs: true`, frozen Bun install, then:

```yaml
- name: Validate HPA-399 art package
  run: bun run art:validate:meadow-entry
```

- [ ] **Step 4: Run focused and repository gates**

```bash
rtk bun run art:validate:meadow-entry
rtk git diff --exit-code
rtk git lfs fsck
rtk bun run check
rtk bun run lint
rtk bun run test:unit -- --run
rtk bun run build
rtk bun run build:tauri
```

Run `rtk bun run tauri build` only on a supported host when packaging evidence is intended.

- [ ] **Step 5: Write final evidence report**

Record source commit, PR-1 fingerprint, LFS version/object/materialization results, master hashes/dimensions/budgets, generation/manual provenance, refinements, crop/export counts, `exportAreaRatio`, aggregate budgets, overlap/corner/clamp/fallback results, predecessor hashes, feather proofs, proof inventory, all command results, reviewer/time, deterministic-versus-generative reproducibility distinction, and explicit non-claims for runtime integration/traversal/fallback execution/GPU/save/performance.

- [ ] **Step 6: Format, revalidate, and commit**

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

- [ ] **Step 7: Final HPA-399 stop gate**

Reviewers must approve:

```text
canonical base and foreground hashes
immutable HPA-398 composite and feather proofs
all direct exports
zero overlap/corner differences
all clamps and baked/fallback boundaries
complete LFS materialization
complete provenance and budgets
clean deterministic regeneration
no runtime integration in this PR
```
