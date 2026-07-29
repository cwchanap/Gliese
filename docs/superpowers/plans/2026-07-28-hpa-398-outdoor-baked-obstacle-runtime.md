# HPA-398 Outdoor Baked-Obstacle Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build reusable base/foreground regional-background rendering with
collision-independent live obstacle fallback, then prove the complete contract
with 21 selected Sundrop Village blockers and deterministic production assets.

**Architecture:** Keep map geometry and collision authoritative in the layered
TypeScript sources. Add semantic background planes, pure blocker-ownership
decisions, and per-descriptor render success tracking; assemble Sundrop
ownership only after all regions merge. Generate obstacle masks from the
assembled map, composite approved art into immutable HPA-307 ground plus a
sparse foreground plane, and validate both assets and every degraded runtime
state.

**Tech Stack:** TypeScript 6, Phaser 4, Svelte/Vite, Vitest, Playwright, Bun,
Sharp, Tauri 2, checked-in PNG/SVG/JSON evidence.

## Global Constraints

- Deliver one consolidated PR from
  `codex/hpa-398-outdoor-baked-obstacle-runtime`; use reviewable commits in this
  plan's order.
- The reviewed design supersedes two stale live-issue details: do not implement
  the unused `hidden` blocker mode, and do not split the delivery into a PR
  stack.
- Do not change Linear status or post detailed Linear evidence without separate
  user authorization.
- Preserve `village-layered.ts`, `compileLayeredRegion(...)`,
  `meadowEntryMap`, collision helpers, and save normalization as gameplay truth.
- Do not change collision geometry or the save schema. If any artwork cannot
  align to current collision, stop and return to design review with the exact
  blocker and proposed bounds.
- Use exactly 21 owned blockers: 14 base-only and seven
  base-plus-foreground. Keep `village-block-0-37`, `village-block-0-49`, and
  `village-block-46-2` live as `always`.
- Only these seven horizontal blockers may own foreground:
  - hedge: `village-block-2-2`, `village-block-2-49`,
    `village-block-3-2`, `corridor-wall-2b`;
  - low wall: `village-block-10-35`, `village-block-19-2`,
    `village-block-19-30`.
- The 14 base-only owners are:
  - hedge: `village-block-3-51`, `village-block-4-2`,
    `village-block-32-2`, `village-block-33-49`;
  - low wall: `village-block-4-35`, `village-block-11-35`,
    `village-block-20-2`, `village-block-20-34`,
    `village-block-25-20`;
  - root/rock: `village-block-32-8`, `village-block-32-24`,
    `village-block-32-33`, `village-block-33-24`,
    `village-block-41-24`.
- Every selected blocker uses base margins
  `{ top: 8, right: 8, bottom: 8, left: 8 }`. The seven foreground owners use
  foreground margins `{ top: 32, right: 8, bottom: 0, left: 8 }`; no other
  entry has foreground margins.
- Preserve `PLAYER_COLLISION_RADIUS = 12`; derive the foreground front-safe
  cutoff from the hero's `90px` display height as `45 - 12 = 33px`.
- Regional depths are fixed: ground `-10`, base `-9`, live world `0`,
  foreground `100`, discovery markers `1_000`, collision debug `10_000`.
- Both production assets are exactly `1792×1536` RGBA. Base alpha must equal
  `sundropVillageBackgroundAlpha(...)` at every pixel.
- Base review target/hard limit: `4 MiB`/`8 MiB`; foreground:
  `2 MiB`/`4 MiB`; combined hard limit: `12 MiB`. Do not raise a limit without
  explicit design approval and a recorded exception.
- Preserve aspect ratio. Candidate normalization may use uniform scaling and
  cropping only; non-uniform scaling is forbidden.
- Freeze the HPA-307 exporter, `art:controls:village`, its fixed filename
  inventory, generated fingerprint, and every file under
  `docs/superpowers/reports/img/hpa-307/`.
- HPA-398 controls may write only their fixed inventory under
  `docs/superpowers/reports/img/hpa-398/`.
- Historical HPA-307 reports remain untouched even after the old runtime PNG
  path is retired.
- Before retiring the old runtime PNG, archive its exact bytes as
  `docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png`.
  HPA-398 controls and finalization use that immutable archive so regeneration
  never depends on a retired public path.
- Use `rtk` for shell commands. Run tests from the repository root unless the
  command explicitly enters `src-tauri/`.

## File Structure

### New focused modules

- `src/lib/game/core/collision.ts` — shared `PLAYER_COLLISION_RADIUS`.
- `src/lib/game/content/maps/background-ownership.ts` — plane depths, generic
  ownership validation, and the pure live-visual decision.
- `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts` —
  WorldScene render-result event contracts and emitter.
- `src/lib/game/content/backgrounds/sundrop-village-backgrounds.ts` — final
  HPA-398 plane IDs, keys, paths, dimensions, budgets, and alpha contract.
- `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.ts` —
  exact 21-entry manifest, post-merge applicator, and Sundrop coverage
  validation.
- `src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.ts` —
  assembled-map control inputs, protected geometry, masks, deterministic
  artifact rendering, and HPA-398 fingerprinting.
- `src/lib/game/content/generated/sundrop-village-obstacle-control.ts` —
  generated HPA-398 fingerprint only.
- `src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.ts` —
  deterministic base/foreground compositing and provenance.
- `tools/export-sundrop-village-obstacle-controls.ts` — fixed-inventory HPA-398
  control exporter.
- `tools/finalize-sundrop-village-obstacles.ts` — canonical production
  compositor/finalizer.
- `src/lib/game/content/approvals/sundrop-village-backgrounds.ts` — combined
  control approval and independent per-plane asset approvals.
- `src/lib/game/content/sundrop-village-obstacle-assets.test.ts` — production
  pixel, alpha, mask, hash, and budget gate.
- `docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md`
  — final automated, visual, walkthrough, and performance evidence.

### Existing files changed in place

- `src/lib/game/content/maps/types.ts`
- `src/lib/game/content/maps/layered/region-background.ts`
- `src/lib/game/content/maps/meadow-entry.ts`
- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/village-layered.test.ts`
- `src/lib/game/content/maps/layered/village-art-control-inputs.ts`
- `src/lib/game/content/maps.test.ts`
- `src/lib/game/content/maps.ts`
- `src/lib/game/save/save-state.ts`
- `src/lib/game/save/save-state.test.ts`
- `src/lib/game/content/assets.ts`
- `src/lib/game/content/assets.test.ts`
- `src/lib/game/phaser/world-render-options.ts`
- `src/lib/game/phaser/world-render-options.test.ts`
- `src/lib/game/phaser/scenes/BootScene.ts`
- `src/lib/game/phaser/scenes/WorldScene.ts`
- `src/lib/game/phaser/scenes/scenes.test.ts`
- `tests/e2e/game.e2e.ts`
- `package.json`

### Retired runtime files

- `public/game/assets/regions/sundrop-village-background.png`
- `src/lib/game/content/approvals/sundrop-village-background.ts`
- `src/lib/game/content/sundrop-village-background.asset.test.ts`

The HPA-307 implementation helpers under
`src/lib/game/content/backgrounds/sundrop-village-*` remain available for
historical reproduction unless a live import is explicitly migrated below.

---

### Task 1: Commit the Reviewed Design and Execution Contract

**Files:**

- Modify:
  `docs/superpowers/specs/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime-design.md`
- Create:
  `docs/superpowers/plans/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime.md`

**Interfaces:**

- Consumes: approved third-pass design with the 21/14/7 ownership contract.
- Produces: a committed design and this task-by-task execution contract.

- [ ] **Step 1: Verify both Markdown documents are formatted**

Run:

```bash
rtk bunx prettier --check \
  docs/superpowers/specs/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime-design.md \
  docs/superpowers/plans/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime.md
```

Expected: `All matched files use Prettier code style!`

- [ ] **Step 2: Verify the approved ownership inventory in the design**

Run:

```bash
rtk bun --eval 'const p="docs/superpowers/specs/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime-design.md"; const t=await Bun.file(p).text(); const s=t.split("The exact motif and owner assignments are:")[1].split("The checked-in manifest")[0]; const ids=[...s.matchAll(/\x60((?:village-block|corridor-wall)-[^\x60]+)\x60/g)].map((m)=>m[1]); if(ids.length!==21||new Set(ids).size!==21) throw new Error("ownership inventory drift"); console.log("21 unique owners");'
```

Expected: `21 unique owners`

- [ ] **Step 3: Commit the approved documentation**

```bash
rtk git add \
  docs/superpowers/specs/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime-design.md \
  docs/superpowers/plans/2026-07-28-hpa-398-outdoor-baked-obstacle-runtime.md
rtk git commit -m "docs(hpa-398): lock baked obstacle implementation plan"
```

---

### Task 2: Add Pure Plane and Blocker-Ownership Contracts

**Files:**

- Create: `src/lib/game/core/collision.ts`
- Create: `src/lib/game/content/maps/background-ownership.ts`
- Create: `src/lib/game/content/maps/background-ownership.test.ts`
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/content/maps/layered/region-background.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `src/lib/game/content/maps/layered/village-art-control-inputs.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/content/maps.ts`

**Interfaces:**

- Consumes: current `MapBackgroundImage`, `MapBlocker`,
  `NORMALIZE_PLAYER_RADIUS`, and numeric-depth descriptor.
- Produces:

```ts
export const PLAYER_COLLISION_RADIUS = 12;

export type MapBackgroundPlane = 'base' | 'foreground';

export type MapBlockerVisual =
  | { mode: 'always' }
  | {
      mode: 'fallback-only';
      ownerBackgroundIds: readonly string[];
    };

export const MAP_BACKGROUND_DEPTHS = {
  base: -9,
  foreground: 100
} as const;

export function getMapBackgroundDepth(plane: MapBackgroundPlane): number;
export type MapBackgroundOwnershipSource = Pick<
  WorldMapDefinition,
  'backgroundImages' | 'blockers'
>;
export function validateMapBackgroundOwnership(
  map: MapBackgroundOwnershipSource
): void;
export function shouldRenderBlockerVisual(
  blocker: MapBlocker,
  successfulBackgroundIds: ReadonlySet<string>
): boolean;
```

- [ ] **Step 1: Write failing tests for the pure ownership contract**

Create table-driven tests in `background-ownership.test.ts` that assert:

```ts
it.each([
  ['omitted metadata', undefined, [], true],
  ['always', { mode: 'always' } as const, ['base'], true],
  [
    'base owner succeeds',
    { mode: 'fallback-only', ownerBackgroundIds: ['base'] } as const,
    ['base'],
    false
  ],
  [
    'base owner fails',
    { mode: 'fallback-only', ownerBackgroundIds: ['base'] } as const,
    [],
    true
  ],
  [
    'one of two owners fails',
    { mode: 'fallback-only', ownerBackgroundIds: ['base', 'foreground'] } as const,
    ['base'],
    true
  ],
  [
    'both owners succeed',
    { mode: 'fallback-only', ownerBackgroundIds: ['base', 'foreground'] } as const,
    ['base', 'foreground'],
    false
  ]
])('%s', (_name, visual, successfulIds, expected) => {
  const blocker = {
    id: 'blocker',
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    kind: 'garden-hedge',
    ...(visual ? { visual } : {})
  } satisfies MapBlocker;

  expect(shouldRenderBlockerVisual(blocker, new Set(successfulIds))).toBe(expected);
});
```

Add explicit validator tests for duplicate descriptor IDs, empty owner lists,
duplicate owner IDs, and missing owner IDs. Assert the thrown messages include
the blocker ID and offending owner ID.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/background-ownership.test.ts
```

Expected: FAIL because `background-ownership.ts` and the new map types do not
exist.

- [ ] **Step 3: Implement semantic map types and pure helpers**

Change `MapBackgroundImage` and `MapBlocker` to:

```ts
export type MapBackgroundPlane = 'base' | 'foreground';

export interface MapBackgroundImage extends MapRect {
  textureKey: string;
  plane: MapBackgroundPlane;
}

export type MapBlockerVisual =
  | { mode: 'always' }
  | { mode: 'fallback-only'; ownerBackgroundIds: readonly string[] };

export interface MapBlocker extends MapRect {
  kind: MapBlockerKind;
  label?: string;
  visual?: MapBlockerVisual;
}
```

Implement `background-ownership.ts` with no Phaser imports:

```ts
export const MAP_BACKGROUND_DEPTHS = {
  base: -9,
  foreground: 100
} as const satisfies Record<MapBackgroundPlane, number>;

export function getMapBackgroundDepth(plane: MapBackgroundPlane): number {
  return MAP_BACKGROUND_DEPTHS[plane];
}

export function shouldRenderBlockerVisual(
  blocker: MapBlocker,
  successfulBackgroundIds: ReadonlySet<string>
): boolean {
  if (!blocker.visual || blocker.visual.mode === 'always') return true;
  return !blocker.visual.ownerBackgroundIds.every((id) =>
    successfulBackgroundIds.has(id)
  );
}
```

`validateMapBackgroundOwnership(...)` must build the descriptor-ID set once,
reject duplicate descriptor IDs, and validate every `fallback-only` blocker
without mutating the map.

Re-export `MapBackgroundPlane` and `MapBlockerVisual` from
`src/lib/game/content/maps.ts`; import pure helper functions directly from
`$lib/game/content/maps/background-ownership` to avoid a map-registry cycle.

- [ ] **Step 4: Replace numeric descriptor depth with `plane`**

Change `createLayeredRegionBackground(...)` to require:

```ts
input: {
  id: string;
  textureKey: string;
  plane: MapBackgroundPlane;
}
```

Return `plane: input.plane`; remove the `depth` input and default. Migrate the
current Sundrop descriptor to `plane: 'base'` and update map/layered tests to
expect `plane: 'base'`.

- [ ] **Step 5: Extract the shared player radius**

Create:

```ts
export const PLAYER_COLLISION_RADIUS = 12;
```

Replace `WorldScene.playerRadius`'s literal, `NORMALIZE_PLAYER_RADIUS`, and the
art-control input import with `PLAYER_COLLISION_RADIUS`. Update every current
`NORMALIZE_PLAYER_RADIUS` test import in the same step; do not keep a
compatibility alias.

- [ ] **Step 6: Run focused contract, map, and save tests**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/save/save-state.test.ts
```

Expected: PASS with all assertions executed.

- [ ] **Step 7: Run static checking**

Run:

```bash
rtk bun run check
rtk git diff --check
```

Expected: both commands exit `0`.

- [ ] **Step 8: Commit the pure contract**

```bash
rtk git add \
  src/lib/game/core/collision.ts \
  src/lib/game/content/maps/background-ownership.ts \
  src/lib/game/content/maps/background-ownership.test.ts \
  src/lib/game/content/maps/types.ts \
  src/lib/game/content/maps/layered/region-background.ts \
  src/lib/game/content/maps/layered/village-art-control-inputs.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/maps.ts \
  src/lib/game/save/save-state.ts \
  src/lib/game/save/save-state.test.ts \
  src/lib/game/phaser/scenes/WorldScene.ts
rtk git commit -m "feat(hpa-398): add baked obstacle ownership contracts"
```

---

### Task 3: Render Independent Planes and Restore Live Fallbacks

**Files:**

- Create:
  `src/lib/game/phaser/regional-background-plane-render-diagnostics.ts`
- Create:
  `src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
- Modify: `src/lib/game/phaser/world-render-options.ts`
- Modify: `src/lib/game/phaser/world-render-options.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**

- Consumes: `getMapBackgroundDepth(...)`,
  `shouldRenderBlockerVisual(...)`, and semantic descriptors from Task 2.
- Produces:

```ts
export type RegionalBackgroundRenderStatus =
  | 'disabled'
  | 'rendered'
  | 'missing-texture'
  | 'invalid-dimensions'
  | 'render-failed';

export interface RegionalBackgroundPlaneRenderDiagnosticEntry {
  id: string;
  textureKey: string;
  plane: MapBackgroundPlane;
  expectedDimensions: { width: number; height: number };
  observedDimensions: { width: number; height: number } | null;
  status: RegionalBackgroundRenderStatus;
}

export interface RegionalBackgroundPlaneRenderDiagnostic {
  mapId: string;
  regionalBackgroundsEnabled: boolean;
  entries: readonly RegionalBackgroundPlaneRenderDiagnosticEntry[];
  successfulBackgroundIds: readonly string[];
}
```

- [ ] **Step 1: Write failing parser and diagnostic tests**

Extend `world-render-options.test.ts` with:

```ts
expect(
  parseWorldRenderOptions(
    '?regionalBackgroundFault=sundrop-village-foreground-image:render'
  )
).toEqual({
  regionalBackgrounds: true,
  collisionDebug: false,
  regionalBackgroundFault: {
    backgroundId: 'sundrop-village-foreground-image',
    mode: 'render'
  }
});
```

Assert malformed values, empty IDs, extra colons, texture-key-only values, and
unsupported modes all produce `regionalBackgroundFault: null`.

In the new diagnostic test, attach a listener to a local `EventTarget`, emit a
two-entry diagnostic, and assert descriptor order is preserved while successful
IDs are sorted.

- [ ] **Step 2: Run parser and diagnostic tests to verify failure**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/phaser/world-render-options.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts
```

Expected: FAIL because the fault field and render diagnostic module are absent.

- [ ] **Step 3: Implement typed render-fault parsing**

Extend `WorldRenderOptions`:

```ts
regionalBackgroundFault: {
  backgroundId: string;
  mode: 'render';
} | null;
```

Parse only a value matching one non-empty descriptor ID followed by
`:render`. Keep `parseWorldRenderOptions(...)` as the only query-string parser.

- [ ] **Step 4: Implement the render diagnostic module**

Export the event name:

```ts
export const REGIONAL_BACKGROUND_PLANE_RENDER_DIAGNOSTIC_EVENT =
  'gliese:regional-background-plane-render-diagnostic';
```

Implement an emitter that dispatches only in a browser or against an injected
`EventTarget`. Sort a copied `successfulBackgroundIds` array and never reorder
`entries`.

- [ ] **Step 5: Write the failing WorldScene matrix**

Extend `scenes.test.ts` with a two-descriptor support map and assert:

- both images receive their source-derived center, exact display size, and
  `-9`/`100` depth;
- disabled mode produces two ordered `disabled` entries and no images;
- missing, `__MISSING`, wrong-size, image-creation exception, and post-creation
  exception each affect only their descriptor;
- a retained partial image is destroyed on post-creation failure;
- successful IDs reset between scene creations and are sorted in diagnostics;
- base success/foreground failure renders live visuals only for multi-owner
  blockers;
- base failure/foreground success renders live visuals for both base-only and
  multi-owner blockers;
- omitted/`always` blocker visuals render in every mode;
- collision movement and debug envelopes use the unchanged blocker list;
- debug depth remains `10_000`.

Use exact marker counts in each fixture rather than `toBeGreaterThan(0)`.

- [ ] **Step 6: Run the scene matrix and confirm it fails**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because WorldScene does not retain successful IDs, emit per-plane
status, honor fixed semantic depth, or filter live blocker visuals.

- [ ] **Step 7: Implement guarded per-descriptor rendering**

Change `renderRegionalBackgrounds(...)` to return a fresh
`ReadonlySet<string>`. For each descriptor:

```ts
let image: Phaser.GameObjects.Image | undefined;
try {
  // validate texture and dimensions first
  image = this.add.image(background.x, background.y, background.textureKey);
  if (
    this.renderOptions.regionalBackgroundFault?.backgroundId === background.id
  ) {
    throw new Error('injected regional background render failure');
  }
  image
    .setOrigin(0.5, 0.5)
    .setDisplaySize(background.width, background.height)
    .setDepth(getMapBackgroundDepth(background.plane));
  successfulBackgroundIds.add(background.id);
} catch {
  image?.destroy();
  // record render-failed and emit one contextual warning
}
```

Record one diagnostic entry for every descriptor, including disabled mode.
Reject missing textures, the `__MISSING` placeholder, unavailable dimensions,
and mismatched dimensions before inserting an ID into the success set.

- [ ] **Step 8: Connect blocker fallback to exact successful IDs**

In `create(...)`:

```ts
this.renderGround(map);
const successfulBackgroundIds = this.renderRegionalBackgrounds(map);
this.renderMapDecor(map, ['floor', 'furniture']);
this.renderFences(map);
this.renderBlockers(map, successfulBackgroundIds);
```

Change `renderBlockers(...)` to skip only blockers for which
`shouldRenderBlockerVisual(...)` returns `false`. Do not pass visual metadata to
collision, normalization, debug, or route code. Leave `ocean`'s collision-only
branch unchanged.

- [ ] **Step 9: Re-run focused runtime tests**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/phaser/world-render-options.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/renderer-diagnostics.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 10: Run static checking and commit**

```bash
rtk bun run check
rtk git diff --check
rtk git add \
  src/lib/game/content/maps/background-ownership.ts \
  src/lib/game/phaser/world-render-options.ts \
  src/lib/game/phaser/world-render-options.test.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.ts \
  src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/WorldScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
rtk git commit -m "feat(hpa-398): render independent baked obstacle planes"
```

---

### Task 4: Lock the Sundrop Manifest and Deterministic Controls

**Files:**

- Create:
  `src/lib/game/content/backgrounds/sundrop-village-backgrounds.ts`
- Create:
  `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.ts`
- Create:
  `src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts`
- Create:
  `src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.ts`
- Create:
  `src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts`
- Create:
  `src/lib/game/content/generated/sundrop-village-obstacle-control.ts`
- Create: `tools/export-sundrop-village-obstacle-controls.ts`
- Create: six fixed artifacts under
  `docs/superpowers/reports/img/hpa-398/`
- Create:
  `docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png`
- Modify: `package.json`

**Interfaces:**

- Consumes: the final assembled blocker list, HPA-307 fingerprint/artifact
  hashes, `PLAYER_COLLISION_RADIUS`, and hero display dimensions.
- Produces:

```ts
export const SUNDROP_VILLAGE_BASE_BACKGROUND_ID =
  'sundrop-village-base-image';
export const SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID =
  'sundrop-village-foreground-image';

export interface SundropObstacleMargins {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface SundropObstacleOwnershipEntry {
  readonly blockerId: string;
  readonly motif: 'hedge' | 'low-wall' | 'root-rock';
  readonly ownerBackgroundIds: readonly string[];
  readonly baseMargins: SundropObstacleMargins;
  readonly foregroundMargins?: SundropObstacleMargins;
}

export function applySundropObstacleOwnership(
  blockers: readonly MapBlocker[],
  manifest?: readonly SundropObstacleOwnershipEntry[]
): MapBlocker[];

export function validateSundropObstacleCoverage(
  map: MapBackgroundOwnershipSource,
  manifest?: readonly SundropObstacleOwnershipEntry[]
): void;
```

- [ ] **Step 1: Write the exact manifest tests**

Assert:

```ts
expect(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP).toHaveLength(21);
expect(
  new Set(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map((x) => x.blockerId)).size
).toBe(21);
expect(
  SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((x) =>
    x.ownerBackgroundIds.includes(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID)
  ).map((x) => x.blockerId)
).toEqual([
  'village-block-2-2',
  'village-block-2-49',
  'village-block-3-2',
  'corridor-wall-2b',
  'village-block-10-35',
  'village-block-19-2',
  'village-block-19-30'
]);
```

Compare sets if manifest ordering groups motifs differently. Also assert 14
base-only entries, exact motif counts `8/8/5`, no excluded feather-band IDs,
and zero foreground ownership for every vertical blocker.

- [ ] **Step 2: Write coverage and applicator failure tests**

Use cloned assembled-map fixtures whose `backgroundImages` are replaced with
the final base and foreground descriptors derived by
`createLayeredRegionBackground(...)`. Assert:

- `corridor-wall-2b` resolves only after `pathsRegion` is merged;
- a missing manifest blocker throws with its exact ID;
- a missing owner descriptor throws with its exact ID;
- duplicate manifest blocker IDs throw;
- each base/foreground margin-expanded rectangle fits its owner image;
- a positive outward margin on a crop-edge fixture throws instead of clipping;
- only manifest blockers receive `fallback-only`;
- all unlisted blockers retain omitted/`always` semantics;
- the three feather-band IDs remain `always`;
- `meadow-west-boundary` stays `6400px` tall.

- [ ] **Step 3: Run ownership tests to verify failure**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts
```

Expected: FAIL because the manifest and applicator do not exist.

- [ ] **Step 4: Implement final HPA-398 constants and the manifest**

Define both plane IDs, texture keys, paths, dimensions, budgets, combined
budget, and `SUNDROP_VILLAGE_FOREGROUND_FRONT_CUTOFF_PX = 33` in
`sundrop-village-backgrounds.ts`.

Encode all 21 reviewed entries literally. Do not infer membership from ID
prefix, coordinates, orientation, or blocker kind. Give every entry the exact
base margins `{ top: 8, right: 8, bottom: 8, left: 8 }`; give only the seven
foreground owners `{ top: 32, right: 8, bottom: 0, left: 8 }`.

- [ ] **Step 5: Implement applicator and coverage validation**

`applySundropObstacleOwnership(...)` must:

1. index manifest entries by exact blocker ID;
2. reject duplicate or missing IDs;
3. return new blocker objects;
4. stamp only selected blockers with:

```ts
visual: {
  mode: 'fallback-only',
  ownerBackgroundIds: [...entry.ownerBackgroundIds]
}
```

The coverage validator resolves rectangles from the final map, expands each
plane with its explicit margins, and rejects any extent outside the matching
descriptor bounds.

- [ ] **Step 6: Write failing control-artifact tests**

In `sundrop-village-obstacle-controls.test.ts`, assert:

- the fixed filename set is exactly the six design filenames;
- the ownership JSON resolves all 21 world rectangles;
- base and foreground SVG masks use local `1792×1536` coordinates;
- the protected mask covers every in-crop `MapDecor`, landmark exterior,
  NPC/ambient-NPC body, pickup body, transition/doorway approach, encounter
  body, discovery interaction clearance, reward pocket, and regional handoff;
- every other in-crop static or stateful live-object display footprint at depth
  `100` or below is protected;
- both stone-lantern `180×180` render rectangles are fully protected;
- the foreground mask contains only the seven horizontal entries;
- foreground coverage stops at each local
  `blockerBottom - 33 - cropTop`;
- all three feather-band blockers have zero base and foreground mask coverage;
- the fingerprint changes when an owner, margin, protected rectangle, hero
  display height, HPA-307 artifact hash, or source hash changes.

`buildSundropVillageObstacleControlInputs(...)` must use the actual
`meadowEntryMap` for post-merge blockers/live objects, but replace its temporary
single HPA-307 descriptor in a copied control map with the two final
source-derived HPA-398 descriptors. Task 6 makes that copied descriptor set the
real runtime set; the resulting control fingerprint must remain unchanged.

- [ ] **Step 7: Implement the isolated HPA-398 control exporter**

Before the first export, archive the exact HPA-307 production input:

```bash
rtk cp \
  public/game/assets/regions/sundrop-village-background.png \
  docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png
rtk shasum -a 256 \
  docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png
```

Expected SHA-256:
`3933829f19e7eab4b26ba2d31c7a0cfac25d4fae0a16196893fac6dbf02187c1`.
Use this archived path—not the public runtime path—as the HPA-398 fingerprint's
ground input.

The exporter must write only:

```ts
export const SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES = [
  'village-obstacle-ownership.json',
  'village-obstacle-base-mask.svg',
  'village-obstacle-foreground-mask.svg',
  'village-obstacle-protected-mask.svg',
  'village-obstacle-composite-control.svg',
  'village-obstacle-control-manifest.json'
] as const;
```

Hash the frozen HPA-307 control fingerprint and artifact files as inputs. Write
the generated HPA-398 fingerprint to
`src/lib/game/content/generated/sundrop-village-obstacle-control.ts`. Do not
import or call the HPA-307 renderer to rewrite its outputs.
`tools/export-sundrop-village-obstacle-controls.ts` must import and iterate
`SUNDROP_VILLAGE_OBSTACLE_CONTROL_FILENAMES` when it constructs its output
allowlist.

- [ ] **Step 8: Add and run the exporter command**

Add:

```json
"art:controls:village-obstacles": "bun tools/export-sundrop-village-obstacle-controls.ts"
```

Run:

```bash
rtk bun run art:controls:village-obstacles
rtk git diff --exit-code -- \
  docs/superpowers/reports/img/hpa-307 \
  src/lib/game/content/generated/sundrop-village-art-control.ts
```

Expected: the exporter writes the six HPA-398 artifacts and generated
fingerprint; the HPA-307 diff command exits `0`.

- [ ] **Step 9: Run ownership/control tests and commit**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts
rtk bun run check
rtk git diff --check
rtk git add \
  package.json \
  tools/export-sundrop-village-obstacle-controls.ts \
  src/lib/game/content/backgrounds/sundrop-village-backgrounds.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-ownership.test.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-controls.test.ts \
  src/lib/game/content/generated/sundrop-village-obstacle-control.ts \
  docs/superpowers/reports/img/hpa-398
rtk git commit -m "feat(hpa-398): lock Sundrop obstacle controls"
```

---

### Task 5: Produce and Validate the Base/Foreground Assets

**Required skills during execution:** Use `2d-game-asset-workflow` for the
source-aligned game-art process and `imagegen` for the candidate edit.

**Files:**

- Create:
  `src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.ts`
- Create:
  `src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.test.ts`
- Create: `tools/finalize-sundrop-village-obstacles.ts`
- Create: `src/lib/game/content/approvals/sundrop-village-backgrounds.ts`
- Create: `src/lib/game/content/sundrop-village-obstacle-assets.test.ts`
- Create: `public/game/assets/regions/sundrop-village-base.png`
- Create: `public/game/assets/regions/sundrop-village-foreground.png`
- Create: candidate, prompt, transform, and provenance artifacts under
  `docs/superpowers/reports/img/hpa-398/`
- Modify: `package.json`

**Interfaces:**

- Consumes: immutable
  `docs/superpowers/reports/img/hpa-398/sundrop-village-hpa-307-ground-input.png`,
  HPA-398 masks, candidate PNG, and generated control fingerprint.
- Produces canonical base/foreground PNGs and one provenance JSON document.

- [ ] **Step 1: Write failing compositor tests with tiny RGBA fixtures**

Use `4×4` fixture buffers to assert:

- base RGBA is byte-identical to the ground outside the base mask;
- inside the base mask, RGB comes from the candidate while alpha comes from the
  supplied base-alpha function;
- foreground alpha is zero outside its mask and protected pixels;
- foreground alpha is:

```ts
Math.round((candidateAlpha * edgeAlpha) / 255)
```

- foreground pixels below a supplied front-safe cutoff are zero;
- canonical output is deterministic for identical inputs;
- a non-uniform transform is rejected;
- provenance contains source, candidate, mask, output, and decoded-pixel
  SHA-256 values plus zero violation counts.

- [ ] **Step 2: Run compositor tests and verify failure**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.test.ts
```

Expected: FAIL because the compositor does not exist.

- [ ] **Step 3: Implement deterministic compositing**

Export:

```ts
export interface SundropVillageObstacleCompositeResult {
  readonly basePng: Buffer;
  readonly foregroundPng: Buffer;
  readonly provenanceJson: Buffer;
}

export async function compositeSundropVillageObstacles(
  input: SundropVillageObstacleCompositeInput
): Promise<SundropVillageObstacleCompositeResult>;
```

Decode all sources to RGBA with Sharp, assert exact dimensions, perform
mask/protected/cutoff decisions in integer pixel coordinates, encode with the
existing canonical PNG options, and calculate hashes from both encoded bytes
and decoded RGBA.

- [ ] **Step 4: Generate one aligned obstacle candidate**

Rasterize the SVG control to a temporary PNG without changing dimensions:

```bash
rtk bun --eval 'import sharp from "sharp"; await sharp("docs/superpowers/reports/img/hpa-398/village-obstacle-composite-control.svg").png().toFile("/tmp/hpa-398-village-obstacle-composite-control.png");'
```

Use the archived ground PNG and
`/tmp/hpa-398-village-obstacle-composite-control.png` as image-generation
references with this prompt:

```text
Edit this source-aligned JRPG village map crop without moving, replacing, or
redrawing the existing terrain, buildings, roads, doors, objects, or landmarks.
Paint coherent static obstacle treatments only inside the colored obstacle
control regions: clipped leafy hedges for hedge regions, low weathered
stone/timber walls for low-wall regions, and low roots/rocks for root-rock
regions. Keep paths and every protected area completely clear. Keep all
obstacles low enough for the supplied collision footprints. Preserve the exact
1792x1536 canvas, camera, coordinates, lighting, palette, and aspect ratio.
Return one aligned RGBA candidate with no labels, legends, guides, or text.
```

Save the unmodified result as
`docs/superpowers/reports/img/hpa-398/village-obstacle-candidate.png` and save
the exact prompt as `village-obstacle-generation-prompt.txt`.

- [ ] **Step 5: Normalize uniformly and finalize both planes**

Add:

```json
"art:finalize:village-obstacles": "bun tools/finalize-sundrop-village-obstacles.ts"
```

The tool reads fixed repository paths, records the uniform scale/crop transform,
calls `compositeSundropVillageObstacles(...)`, and writes the two production
PNGs plus `village-obstacle-provenance.json`.

Run:

```bash
rtk bun run art:finalize:village-obstacles
```

If base exceeds `8 MiB`, first simplify detail/shadows inside the base mask,
then move eligible horizontal detail to foreground. Stop for design approval if
both assets still cannot meet their hard limits.

- [ ] **Step 6: Create independent approvals**

Run the finalizer once more and copy its exact `controlFingerprint`,
`base.sha256`, and `foreground.sha256` values:

```bash
rtk bun run art:finalize:village-obstacles
```

Create `sundropVillageBackgroundsApproval` with:

- `approvedControlFingerprint` equal to that emitted `controlFingerprint`;
- `base.approvedPngSha256` equal to the emitted `base.sha256`;
- `foreground.approvedPngSha256` equal to the emitted
  `foreground.sha256`;
- the base size exception text exactly:
  `Tier 0 preserves the approved HPA-307 ground and aligned obstacle detail while remaining below the 8 MiB hard limit.`;
- `foreground.sizeBudgetException: null`;
- both evidence reports set to
  `docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md`.

The asset test in the next step must fail if any copied value differs from the
recomputed output.

- [ ] **Step 7: Write the production asset gate**

The test must decode both PNGs and prove:

- exact dimensions, canonical chunks, approved encoded hashes, and decoded
  pixel hashes;
- base identity outside its permitted mask;
- exact HPA-307 alpha at every base pixel;
- foreground alpha zero outside its mask and throughout protected areas;
- exact foreground edge-alpha modulation;
- exact `33px` front-safe cutoff for all seven horizontal owners;
- zero base/foreground changes for the three feather-band `always` blockers;
- zero foreground pixels for nine vertical hedge/low-wall runs and five
  root/rock runs;
- exact ownership counts `21/14/7`;
- base, foreground, and combined hard limits.

- [ ] **Step 8: Add the asset gate to the standard art command**

Update `art:validate:village` so it runs the new asset, ownership, control, and
compositor tests while preserving the historical HPA-307 validation tests.

Run:

```bash
rtk bun run art:validate:village
rtk bun run test:unit -- --run \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.test.ts \
  src/lib/game/content/sundrop-village-obstacle-assets.test.ts
rtk git diff --exit-code -- docs/superpowers/reports/img/hpa-307
```

Expected: all tests pass and HPA-307 artifacts remain unchanged.

- [ ] **Step 9: Inspect both planes and the normal composite**

Render and inspect:

- base alone;
- foreground on transparency;
- base plus foreground;
- player immediately front/south of one hedge and one low wall;
- player behind/north of the same blockers;
- all four crop edges.

Reject the candidate if routes, buildings, live-object footprints, or edge
feathering are altered even when automated masks pass.

- [ ] **Step 10: Commit approved assets and provenance**

```bash
rtk git add \
  package.json \
  tools/finalize-sundrop-village-obstacles.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.ts \
  src/lib/game/content/backgrounds/sundrop-village-obstacle-composite.test.ts \
  src/lib/game/content/approvals/sundrop-village-backgrounds.ts \
  src/lib/game/content/sundrop-village-obstacle-assets.test.ts \
  public/game/assets/regions/sundrop-village-base.png \
  public/game/assets/regions/sundrop-village-foreground.png \
  docs/superpowers/reports/img/hpa-398
rtk git commit -m "feat(hpa-398): add approved Sundrop obstacle planes"
```

---

### Task 6: Migrate Sundrop Runtime Ownership and Browser Proof

**Files:**

- Modify: `src/lib/game/content/assets.ts`
- Modify: `src/lib/game/content/assets.test.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.test.ts`
- Modify: `src/lib/game/content/maps/meadow-entry.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Modify: `package.json`
- Delete:
  `src/lib/game/content/approvals/sundrop-village-background.ts`
- Delete:
  `src/lib/game/content/sundrop-village-background.asset.test.ts`
- Delete:
  `public/game/assets/regions/sundrop-village-background.png`

**Interfaces:**

- Consumes: final assets/approvals, runtime plane support, exact manifest, and
  assembly validators.
- Produces: the complete normal/degraded Sundrop runtime and browser evidence.

- [ ] **Step 1: Write the final assembly test before changing the map**

Assert `meadowEntryMap` has exactly:

```ts
[
  {
    id: 'sundrop-village-base-image',
    textureKey: 'sundrop-village-base',
    plane: 'base',
    x: 1152,
    y: 5120,
    width: 1792,
    height: 1536
  },
  {
    id: 'sundrop-village-foreground-image',
    textureKey: 'sundrop-village-foreground',
    plane: 'foreground',
    x: 1152,
    y: 5120,
    width: 1792,
    height: 1536
  }
]
```

Assert 21 exact `fallback-only` blockers, 14 base-only, seven multi-owner, the
three feather-band IDs `always`, and `corridor-wall-2b` owned after merge.

- [ ] **Step 2: Run final assembly tests and verify failure**

Run:

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts
```

Expected: FAIL because the current map has one old descriptor and no ownership.

- [ ] **Step 3: Migrate the asset registry and descriptors**

Register exactly:

```ts
export const regionalBackgroundAssets = [
  {
    key: SUNDROP_VILLAGE_BASE_TEXTURE_KEY,
    path: SUNDROP_VILLAGE_BASE_PATH,
    approvedControlFingerprint:
      sundropVillageBackgroundsApproval.approvedControlFingerprint,
    approvedPngSha256:
      sundropVillageBackgroundsApproval.base.approvedPngSha256
  },
  {
    key: SUNDROP_VILLAGE_FOREGROUND_TEXTURE_KEY,
    path: SUNDROP_VILLAGE_FOREGROUND_PATH,
    approvedControlFingerprint:
      sundropVillageBackgroundsApproval.approvedControlFingerprint,
    approvedPngSha256:
      sundropVillageBackgroundsApproval.foreground.approvedPngSha256
  }
] as const;
```

Create both source-derived descriptors in `villageRegion`.

- [ ] **Step 4: Apply ownership and validate at module assembly**

Immediately after `mergeRegions(...)`:

```ts
const ownedBlockers = applySundropObstacleOwnership(merged.blockers);
const ownershipSource = {
  blockers: ownedBlockers,
  backgroundImages: merged.backgroundImages
};

validateMapBackgroundOwnership(ownershipSource);
validateSundropObstacleCoverage(
  ownershipSource,
  SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP
);

export const meadowEntryMap = addEnglishMapText({
  id: openingMapId,
  width: 200,
  height: 200,
  spawnDirection: 'up',
  spawn: { x: 624, y: 5_776 },
  landmarks: merged.landmarks,
  transitions: merged.transitions,
  groundPatches: merged.groundPatches,
  blockers: ownedBlockers,
  fences: merged.fences,
  mapDecor: merged.mapDecor,
  combatBounds: merged.combatBounds,
  encounters: merged.encounters,
  npcs: merged.npcs,
  ambientNpcs: merged.ambientNpcs,
  pickups: merged.pickups,
  discoveries: merged.discoveries,
  backgroundImages: merged.backgroundImages
});
```

Keep both validator calls after ownership stamping and before
`addEnglishMapText(...)`/export.

- [ ] **Step 5: Update BootScene and scene expectations**

Enabled preload must complete two regional assets. Disabled mode queues zero.
Update scene tests to assert:

- normal mode renders two images and zero selected live blocker sprites;
- the three feather-band `always` blockers still render live sprites;
- base missing/invalid/render-failed restores all 21 selected live fallbacks;
- foreground missing/invalid/render-failed restores exactly seven;
- valid planes remain visible in each asymmetric state;
- warnings include ID, plane, texture key, and map ID;
- collision and debug geometry are unchanged.

For live-render counts, calculate the expected selected segment total with the
production renderer's `Math.ceil(length / 48)` rule. Separately assert the
exact blocker decision sets contain `21`, `7`, or `0` selected IDs for
base-failed, foreground-failed, and normal modes; do not mistake 21 blockers
for 21 image sprites.

- [ ] **Step 6: Install both browser diagnostic listeners**

Import the WorldScene render diagnostic event/type into `game.e2e.ts`. Keep the
existing BootScene renderer-capability listener and add one binding for ordered
per-plane render entries.

Assert enabled mode has two preload completions and two `rendered` entries.
Assert disabled mode has zero completions and two ordered `disabled` entries.

- [ ] **Step 7: Add the browser failure matrix**

Use scoped request interception for:

- missing base;
- missing foreground;
- wrong-sized base;
- wrong-sized foreground.

Use:

```text
?regionalBackgroundFault=sundrop-village-base-image:render
?regionalBackgroundFault=sundrop-village-foreground-image:render
```

for post-creation failures. In every case assert the canvas boots, the expected
valid plane remains, diagnostics match, live fallback count is exact, and
collision movement remains blocked at a representative obstacle.

- [ ] **Step 8: Extend the headed source-derived walkthrough**

Capture normal, disabled, missing-base, missing-foreground, wrong-size,
render-failure, collision-debug, and disabled-plus-collision states. Traverse:

- Home Yard, Well Plaza, Market Lane, North Residences, Shrine Garden, East
  Gate;
- every building entrance/exit round trip;
- market and shrine rewards;
- East Gate to Crossroads and return;
- save/reload at Home Yard, Well Plaza, Shrine Garden, and East Gate;
- area map/minimap.

At every movement burst assert saved map ID, position, facing, and relevant
pickup state. Capture front/behind/after positions for one horizontal hedge and
one low wall, plus base-only vertical and root/rock examples.

- [ ] **Step 9: Retire the old runtime surface**

Migrate every live source/test/tool/package reference to:

```text
sundrop-village-regional-background
sundrop-village-background
/game/assets/regions/sundrop-village-background.png
```

The first value is the old descriptor ID, the second the old texture key, and
the third the old runtime path. After migration, delete the old runtime PNG,
singular approval module, and singular runtime asset test.

Keep historical HPA-307 report text/artifacts. Keep
`art:controls:village` frozen. Remove package-script exposure for old HPA-307
normalization/finalization/retouch/evidence commands that target the retired
runtime path; retain their source files for historical reproduction. Replace
the deleted singular asset test in `art:validate:village` with
`sundrop-village-obstacle-assets.test.ts` while keeping the other HPA-307
algorithm/control tests.

Verify remaining occurrences:

```bash
rtk rg -n \
  "sundrop-village-regional-background|sundrop-village-background\\.png" \
  src/lib/game/content/assets.ts \
  src/lib/game/content/maps \
  src/lib/game/phaser \
  tests \
  package.json
```

Expected: no live runtime/test/package references. Separately inspect matches
under historical HPA-307 tooling; each remaining occurrence must be an input or
reproduction default outside active package scripts, never the HPA-398
production output.

- [ ] **Step 10: Run focused runtime and browser gates**

```bash
rtk bun run test:unit -- --run \
  src/lib/game/content/assets.test.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run build
rtk bun run test:e2e -- --grep "regional background|Sundrop|village"
rtk git diff --check
```

Expected: all focused gates pass.

- [ ] **Step 11: Commit the runtime migration**

```bash
rtk git add -A -- \
  package.json \
  src/lib/game/content/assets.ts \
  src/lib/game/content/assets.test.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps/regions/village-layered.test.ts \
  src/lib/game/content/maps/meadow-entry.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/content/approvals/sundrop-village-background.ts \
  src/lib/game/content/sundrop-village-background.asset.test.ts \
  src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts \
  public/game/assets/regions/sundrop-village-background.png
rtk git commit -m "feat(hpa-398): migrate Sundrop to baked obstacle ownership"
```

---

### Task 7: Prove the Whole Delivery and Commit Acceptance Evidence

**Files:**

- Create:
  `docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md`
- Create/update runtime screenshots and diagnostic JSON under
  `docs/superpowers/reports/img/hpa-398/`
- Modify implementation/tests only for failures discovered by the full gate

**Interfaces:**

- Consumes: the complete branch from Tasks 1–6.
- Produces: final reproducible evidence and a branch ready for whole-branch
  review.

- [ ] **Step 1: Prove control and asset reproducibility**

Run:

```bash
rtk bun run art:controls:village-obstacles
rtk bun run art:finalize:village-obstacles
rtk bun run art:validate:village
rtk git diff --exit-code -- docs/superpowers/reports/img/hpa-307
```

Expected: HPA-398 outputs reproduce byte-for-byte, all art gates pass, and
HPA-307 artifacts are unchanged.

- [ ] **Step 2: Run the full TypeScript and browser gates**

```bash
rtk bun run check
rtk bun run lint
rtk bun run test:unit -- --run
rtk bun run test:e2e
rtk bun run build
```

Expected: every command exits `0`. If concurrent server image tests time out,
rerun the server suite without file parallelism:

```bash
rtk bun run test:unit -- --run --project server --no-file-parallelism
```

- [ ] **Step 3: Run the authoritative release gate**

Run:

```bash
rtk bun run tauri build
```

Expected: strict story generation, Tauri-mode Vite build,
no-frontend-story-prose assertion, and native packaging all pass.

- [ ] **Step 4: Record performance evidence**

For the same source-derived walking route, record enabled and disabled samples
covering:

- exact request count `2` enabled/`0` disabled;
- preload completions `2` enabled/`0` disabled;
- descriptor render successes `2` enabled;
- WebGL `MAX_TEXTURE_SIZE >= 1792` or successful Canvas decode/draw;
- no uncaught page errors or WebGL context loss;
- no regional texture re-upload across interior round trips;
- enabled p95 walking frame no more than `2ms` slower than disabled on the
  reference device.

- [ ] **Step 5: Write the acceptance report**

Include exact:

- final commit and scope;
- HPA-398 control fingerprint and all asset/decoded-pixel hashes;
- encoded sizes, budgets, and exceptions;
- 21/14/7 ownership inventory;
- statement that all 21 live fallbacks still use
  `village-hedge/hedgeSegment`;
- automated command outputs;
- per-failure diagnostics;
- visual capture paths and inspection notes;
- foreground-success/base-failure duplication with all 21 fallbacks;
- base-success/foreground-failure duplication with seven fallbacks and 14
  suppressed base-only blockers;
- walkthrough/save/minimap results;
- texture, load, memory, and frame-time evidence;
- native-device or production limitations, explicitly `none` when no
  limitation remains.

- [ ] **Step 6: Run the final cleanliness gate**

```bash
rtk git diff --check
rtk git status --short
```

Expected before the evidence commit: only the acceptance report, HPA-398
evidence, and any verified final-fix files are modified.

- [ ] **Step 7: Commit acceptance evidence**

```bash
rtk git add \
  docs/superpowers/reports/2026-07-28-hpa-398-outdoor-baked-obstacle-validation.md \
  docs/superpowers/reports/img/hpa-398
rtk git commit -m "test(hpa-398): prove Sundrop baked obstacle runtime"
```

- [ ] **Step 8: Run a whole-branch review**

Review the full diff against `main`, verify every finding against current code,
fix only still-valid findings, and re-run the smallest affected gate plus the
final full gate before declaring the branch ready.

Do not push, create a PR, merge, update Linear, or post Linear evidence until
the user chooses the finishing action.
