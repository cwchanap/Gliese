# HPA-406 Implementation Plan Amendments

> **Authority:** This file is part of the HPA-406 implementation plan and supersedes the named steps in `2026-08-03-hpa-406-meadow-entry-outdoor-runtime-integration.md`. All other tasks and steps in the base plan remain unchanged.

**Design state:** The user's instruction to proceed to the implementation plan is approval to leave design review and begin execution planning. Runtime implementation remains blocked on the approved HPA-514 and HPA-495 outputs described in Task 1.

## Amendment 1 — Task 1, Step 2: prerequisite discovery must not match plan/spec prose

Replace Task 1, Step 2 with:

- [ ] **Step 2: Resolve and verify the current HPA-514 integration catalog**

Run discovery only across runtime/story output locations, never `docs/superpowers`:

```bash
catalog_path=$(git grep -l 'Story Integration Catalog' -- story src-tauri | head -n 1)
test -n "$catalog_path"
printf 'catalog=%s\n' "$catalog_path"
bun run story:check:strict
```

Expected: one non-documentation repository path is printed and strict story validation exits `0`. If no path is found, stop; HPA-514 is not consumable yet. Record the exact path and fingerprint in the Checkpoint 1 report.

## Amendment 2 — Task 8, Step 1: use a failed base for `blocked-by-base`

Replace the contradictory status example with two tests:

```ts
it('renders a dependent foreground after its base succeeds even when input order is reversed', () => {
  expect(renderStatuses).toEqual([
    ['base-a', 'rendered'],
    ['foreground-a', 'rendered']
  ]);
  expect(successfulBackgroundIds).toEqual(['base-a', 'foreground-a']);
});

it('blocks a dependent foreground after its base fails', () => {
  expect(renderStatuses).toEqual([
    ['base-a', 'render-failed'],
    ['foreground-a', 'blocked-by-base']
  ]);
  expect(successfulBackgroundIds).toEqual([]);
});
```

The first fixture supplies input as `[foreground-a, base-a]` to prove array order is irrelevant. The second fixture injects failure for `base-a`. Both fixtures declare `foreground-a.dependsOnBackgroundId = 'base-a'`.

## Amendment 3 — Task 9: disabled loading uses an explicit empty plan

Replace the ambiguous disabled-mode test and BootScene instruction with this exact contract:

```ts
const disabledPlan = buildRegionalBackgroundLoadPlan({
  strategy: 'streamed',
  map,
  inventory,
  requestedAssetIds: [],
  reason: 'regional backgrounds disabled'
});

expect(disabledPlan.assetIds).toEqual([]);
expect(disabledPlan.estimatedCompressedBytes).toBe(0);
expect(disabledPlan.estimatedDecodedRgbaBytes).toBe(0);
```

`BootScene` uses this explicit empty plan when `resolveWorldRenderOptions().regionalBackgrounds` is false. It uses `strategy: 'eager-map'` only when regional backgrounds are enabled. No third strategy value is introduced.

## Amendment 4 — Task 10, Step 5: generate validated evidence instead of committing placeholder values

Replace the JSON template with the following schema and validation requirements:

```ts
export interface MeadowEntryLoadSafetyEvidence {
  version: 1;
  issue: 'HPA-406';
  inventoryAssetCount: 24;
  hpa496AssetCount: 22;
  hpa496CompressedBytes: 109_509_947;
  hpa496Pixels: 98_893_824;
  hpa496DecodedRgbaBytes: 395_575_296;
  combinedDecodedRgbaEstimateBytes: 417_595_392;
  strategyDecision: 'eager-map' | 'streamed-required';
  decisionAcceptedBy: string;
  referenceEnvironment: {
    browser: string;
    renderer: 'webgl' | 'canvas';
    maxTextureSize: number | null;
    os: string;
    hardware: string;
  };
  load: {
    queued: number;
    completed: number;
    loadMs: number;
    bootToWorldReadyMs: number;
    loaderErrors: readonly string[];
    contextLost: boolean;
    allocationFailure: boolean;
  };
  residualRisks: readonly string[];
}
```

The evidence writer constructs this object from observed diagnostics and operator-supplied environment/approval metadata, then validates before writing:

```ts
export function validateMeadowEntryLoadSafetyEvidence(
  evidence: MeadowEntryLoadSafetyEvidence
): void {
  if (!evidence.decisionAcceptedBy.trim()) {
    throw new Error('Load-safety evidence requires decisionAcceptedBy');
  }
  if (!evidence.referenceEnvironment.browser.trim()) {
    throw new Error('Load-safety evidence requires browser');
  }
  if (!evidence.referenceEnvironment.os.trim()) {
    throw new Error('Load-safety evidence requires os');
  }
  if (!evidence.referenceEnvironment.hardware.trim()) {
    throw new Error('Load-safety evidence requires hardware');
  }
  if (evidence.load.queued !== evidence.inventoryAssetCount) {
    throw new Error('Full-inventory probe must queue every regional asset');
  }
  if (evidence.load.completed !== evidence.load.queued) {
    throw new Error('Full-inventory probe did not complete every queued asset');
  }
  if (evidence.load.loadMs < 0 || evidence.load.bootToWorldReadyMs < 0) {
    throw new Error('Load-safety timings must be non-negative');
  }
}
```

`HPA406_WRITE_EVIDENCE=1` may write `checkpoint-1-load-safety.json` only after this validator passes. The committed file must contain observed values; no empty strings, sentinel zeros, or unreviewed decision identity are permitted.

## Amendment 5 — Task 10: route reusable HPA-495 gaps before checkpoint acceptance

Insert after Task 10, Step 8:

- [ ] **Step 8a: Route reusable workflow gaps**

For every reusable HPA-495 skill defect found during Checkpoint 1:

1. add the failing regression scenario and smallest correction to the existing HPA-495 PR;
2. rerun that HPA-495 regression scenario;
3. rerun the affected HPA-406 Checkpoint 1 command;
4. record the HPA-495 commit SHA and result in `checkpoint-1-crossroads-connectors.md`.

Do not copy the reusable skill correction into HPA-406. If HPA-495 has already merged, stop and create one new Linear ticket and one PR for that correction before accepting Checkpoint 1.

## Self-review result

- Spec coverage: every design section maps to Tasks 1–13 or one of the amendments above.
- Placeholder scan: the authoritative evidence step contains a concrete schema and validator; it does not permit committed placeholder values.
- Type consistency: authored/composed background types, descriptor IDs, visual ownership, load-plan inputs, render statuses, and checkpoint IDs are named consistently across tasks.
- Dependency order: HPA-514/HPA-495 preflight → model foundations → package/ownership generation → composition/render/load plan → Checkpoints 1–3 → final gate.
