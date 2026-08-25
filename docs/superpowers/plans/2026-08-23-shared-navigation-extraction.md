# Shared Navigation Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the current runtime and save-position collision decisions into one pure navigation module without changing map geometry, visual output, collision resolution, or save compatibility.

**Architecture:** `core/navigation.ts` becomes the only decision engine for grid walkability, swept movement, obstacle policies, axis resolution, and nearest-walkable recovery. A thin map-content adapter translates the existing blockers, fences, collidable decor, interior props, landmarks, transitions, and interactable NPCs into shared obstacle records. Existing maps use a cached all-open 32px grid plus their current obstacles until an authored generated grid is explicitly attached by the later Meadow or interior plans.

**Tech Stack:** TypeScript 6, Vitest, Phaser 4, Bun, existing `WorldMapDefinition` content, existing save parser and movement diagnostics.

**Spec:** `docs/superpowers/specs/2026-08-23-meadow-collision-live-assets-and-interiors-redesign-design.md`

**Sequence:** Execute this plan first. `2026-08-23-meadow-navigation-and-live-assets.md` and `2026-08-23-painted-village-interiors.md` depend on its exported contracts and green parity suite.

## Global Constraints

- Make no coordinate, map-size, renderer-mask, art, camera, animation, or save-schema change in this plan.
- Preserve the current player radius, NPC radii, landmark doorway width, transition radius, X-then-Y axis resolution, strict-rect escape behavior, escape-aware outward movement, segment intersection, and deterministic save-recovery search order.
- Maps without `navigationGrid` must receive one cached bounds-sized all-open grid at the current 32px authoring resolution. Do not rebuild that grid per frame.
- `core/navigation.ts` must not import Phaser, DOM APIs, `WorldMapDefinition`, or any content registry.
- The map adapter may translate content into shared records, but it may not decide collision, duplicate doorway carving, or implement a second nearest-walkable search.
- Ambient NPCs remain non-blocking. Interactable NPCs block runtime movement but do not invalidate a loaded save position.
- Preserve unrelated `.playwright-cli/`, `output/`, report images, and the pre-existing modified fallback screenshot.
- Run commands through `rtk`. After each task, request a spec-compliance review and then a code-quality review before continuing.

---

### Task 1: Define and Test the Pure Navigation Grid

**Files:**

- Create: `src/lib/game/core/navigation.ts`
- Create: `src/lib/game/core/navigation.test.ts`

**Interfaces:**

```ts
export interface NavigationPoint {
	readonly x: number;
	readonly y: number;
}

export interface NavigationMaskSource {
	readonly id: string;
	readonly mapId: string;
	readonly cellSizePx: number;
	readonly widthCells: number;
	readonly heightCells: number;
	readonly clearancePx: number;
	readonly rows: readonly string[];
}

export interface NavigationGrid {
	readonly id: string;
	readonly mapId: string;
	readonly cellSizePx: number;
	readonly widthCells: number;
	readonly heightCells: number;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly blockedBits: Uint8Array;
}

export function compileNavigationGrid(source: NavigationMaskSource): NavigationGrid;
export function createOpenNavigationGrid(input: {
	readonly id: string;
	readonly mapId: string;
	readonly cellSizePx: number;
	readonly widthCells: number;
	readonly heightCells: number;
}): NavigationGrid;
export function isWalkable(grid: NavigationGrid, x: number, y: number): boolean;
```

`blockedBits` is a packed bitset in row-major order. `compileNavigationGrid()` validates positive integer dimensions/cell size, exact row count and width, and the `.`/`#` alphabet. It expands raw `#` cells by `clearancePx` before packing player-centre walkability. A coordinate equal to the maximum world bound maps to the final cell for Phase-1 parity; coordinates below zero or above the maximum are invalid.

- [ ] **Step 1: Write RED validation and bitset tests**

Cover:

- valid `.`/`#` compilation and constant-time lookup;
- rejected row count, row width, glyph, zero dimension, and zero cell size;
- raw blocked-cell clearance expansion at horizontal, vertical, and diagonal edges;
- `createOpenNavigationGrid()` producing no blocked bits;
- inclusive maximum-bound compatibility and rejected out-of-bounds points;
- immutability of public metadata and no dependency on Phaser globals.

Use a tiny fixture whose expected cells can be enumerated directly:

```ts
const source: NavigationMaskSource = {
	id: 'tiny',
	mapId: 'tiny-map',
	cellSizePx: 16,
	widthCells: 3,
	heightCells: 3,
	clearancePx: 0,
	rows: ['...', '.#.', '...']
};

expect(isWalkable(compileNavigationGrid(source), 24, 24)).toBe(false);
expect(isWalkable(compileNavigationGrid(source), 8, 8)).toBe(true);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts
```

Expected: FAIL because `core/navigation.ts` does not exist.

- [ ] **Step 3: Implement source validation, clearance compilation, packed lookup, and open-grid creation**

Keep bit helpers private. Use squared point-to-raw-cell-rectangle distance for clearance expansion so diagonal behavior is deterministic; do not use a square `ceil(clearance / cellSize)` dilation. Freeze object metadata, but retain the private-by-convention typed array for constant-time reads.

- [ ] **Step 4: Run focused GREEN and static checks**

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts
rtk bun run check
rtk bunx prettier --check src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts
rtk bunx eslint src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts
rtk git diff --check
```

Expected: all pass.

- [ ] **Step 5: Commit Task 1 exactly**

```bash
rtk git add src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts
rtk git commit -m "feat(world): add pure navigation grid"
```

---

### Task 2: Centralize Swept Movement and Obstacle Policies

**Files:**

- Modify: `src/lib/game/core/navigation.ts`
- Modify: `src/lib/game/core/navigation.test.ts`

**Interfaces:**

```ts
export interface NavigationRect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export type NavigationObstacle =
	| {
			readonly id: string;
			readonly shape: 'rect';
			readonly bounds: NavigationRect;
			readonly movement: 'strict' | 'escape-aware';
			readonly invalidAtRest: boolean;
			readonly escapeOrigin?: NavigationPoint;
	  }
	| {
			readonly id: string;
			readonly shape: 'circle';
			readonly center: NavigationPoint;
			readonly radius: number;
			readonly movement: 'escape-aware';
			readonly invalidAtRest: boolean;
	  }
	| {
			readonly id: string;
			readonly shape: 'landmark';
			readonly landmarkId: string;
			readonly bounds: NavigationRect;
			readonly doorCandidates: readonly {
				readonly id: string;
				readonly point: NavigationPoint;
			}[];
			readonly doorwayWidthPx: number;
			readonly transitionRadiusPx: number;
			readonly invalidAtRest: true;
	  };

export function resolveMovementSegment(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	from: NavigationPoint,
	to: NavigationPoint,
	radius: number
): NavigationPoint;

export function isPositionWalkable(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	point: NavigationPoint,
	radius: number,
	mode?: 'movement-target' | 'resting-position'
): boolean;
```

`resolveMovementSegment()` checks every grid cell crossed by a segment, applies obstacle policies,
and resolves X before Y exactly like the current `WorldScene`. Landmark transition matching, doorway
carving, and the current below-footprint pass-through behavior live inside this module.

- [ ] **Step 1: Add RED parity tests for current movement semantics**

Add direct tests for:

- a large movement step crossing a one-cell barrier even when both endpoints are open;
- a blocked diagonal resolving to its open X or Y axis using X-then-Y order;
- a straight open segment remaining unchanged;
- strict rectangles blocking entry and small inside-to-inside movement while permitting a one-step escape;
- escape-aware rectangles and circles permitting only movement that increases distance from the escape origin while already embedded;
- a landmark with no matching doorway candidate;
- a landmark whose ID/point candidate matches the current rule, with a carved doorway, left/right
  body collision, and the existing below-bottom pass-through rule;
- radius expansion for rectangles/circles, with the authored grid already representing player-centre clearance;
- `invalidAtRest: false` NPC circles not participating in save-position validity.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts
```

Expected: FAIL because obstacle resolution exports are absent.

- [ ] **Step 3: Implement swept grid traversal and obstacle resolution**

Use a bounded grid DDA/supercover traversal proportional to crossed cells, not a full-grid scan. Port
the existing slab segment/rectangle math and point-to-segment circle math without Phaser. Match and
decompose landmark collision internally from `landmarkId + bounds + doorCandidates`; adapters must
not select or pre-carve the doorway.

The X-then-Y flow is:

```ts
let x = to.x;
let y = to.y;
if (isSegmentBlocked(grid, obstacles, from, { x, y: from.y }, radius)) x = from.x;
if (isSegmentBlocked(grid, obstacles, { x, y: from.y }, { x, y }, radius)) y = from.y;
return { x, y };
```

- [ ] **Step 4: Run focused GREEN and checks**

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts
rtk bun run check
rtk bunx prettier --check src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts
rtk bunx eslint src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts
rtk git diff --check
```

- [ ] **Step 5: Commit Task 2 exactly**

```bash
rtk git add src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts
rtk git commit -m "refactor(world): centralize collision resolution"
```

---

### Task 3: Add the World-Map Navigation Adapter

**Files:**

- Create: `src/lib/game/content/maps/navigation.ts`
- Create: `src/lib/game/content/maps/navigation.test.ts`
- Modify: `src/lib/game/content/maps/types.ts`
- Modify: `src/lib/game/save/save-state.test.ts`

**Interfaces:**

```ts
// maps/types.ts
export interface WorldMapDefinition extends MapDefinition {
	// existing fields remain unchanged
	readonly navigationGrid?: NavigationGrid;
	readonly navigationGridOwnedSources?: readonly NavigationGridOwnedSource[];
}

export type NavigationGridOwnedSource =
	| 'blocker'
	| 'fence'
	| 'map-decor'
	| 'interior-prop';

// maps/navigation.ts
export function resolveMapNavigationGrid(map: WorldMapDefinition): NavigationGrid;
export function buildMapNavigationObstacles(
	map: WorldMapDefinition,
	options: { readonly includeInteractableNpcs: boolean }
): readonly NavigationObstacle[];
```

`resolveMapNavigationGrid()` returns `map.navigationGrid` when present. Otherwise it memoizes an all-open grid keyed by map ID, 32px width, 32px height, and current map dimensions. The adapter emits:

- strict rects for blockers, fences, and collidable map decor;
- escape-aware rects for collidable interior props;
- semantic landmark obstacles carrying the map's transition ID/point candidates without selecting
  or carving a doorway;
- escape-aware circles for interactable NPCs only when requested, using `NPC_PACK_COLLISION_RADIUS` or `STARTER_NPC_COLLISION_RADIUS`;
- no ambient-NPC obstacles.

When a later authored grid declares a source type in `navigationGridOwnedSources`, the adapter omits
that source type from obstacles because its collision is already compiled into the grid. Phase 1
sets neither optional field on production maps, so every current obstacle remains active.

- [ ] **Step 1: Write RED adapter tests**

Use a small literal `WorldMapDefinition` and assert exact obstacle records. Prove that the adapter
passes transition ID/point candidates without choosing one, missing candidates remain possible, NPC
radii retain their current frame-family behavior, ambient NPCs are excluded, and repeated open-grid
resolution returns the same object reference. The core tests from Task 2 own the current
transition-ID/landmark-ID match and solid-without-match behavior.

Also add save-state tests through the public save parse/normalize seam that lock the current row-major Chebyshev-ring recovery result before deleting the local helper.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/navigation.test.ts src/lib/game/save/save-state.test.ts
```

Expected: FAIL because the map adapter and `navigationGrid` field do not exist.

- [ ] **Step 3: Implement the adapter and type-only map contract**

Import `NavigationGrid` with `import type` in `maps/types.ts`. Keep map-to-obstacle coordinate conversion here; keep collision decisions in `core/navigation.ts`.

- [ ] **Step 4: Keep save-state behavior unchanged for now**

Do not rewire `normalizePlayerPosition()` in this task. The new save tests are parity fixtures for Task 5. Any direct save helper exports added only for a test must be removed before Task 5 completes.

- [ ] **Step 5: Run GREEN and static checks**

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/navigation.test.ts src/lib/game/save/save-state.test.ts
rtk bun run check
rtk bunx prettier --check src/lib/game/content/maps/navigation.ts src/lib/game/content/maps/navigation.test.ts src/lib/game/content/maps/types.ts src/lib/game/save/save-state.test.ts
rtk bunx eslint src/lib/game/content/maps/navigation.ts src/lib/game/content/maps/navigation.test.ts
rtk git diff --check
```

- [ ] **Step 6: Commit Task 3 exactly**

```bash
rtk git add src/lib/game/content/maps/navigation.ts src/lib/game/content/maps/navigation.test.ts src/lib/game/content/maps/types.ts src/lib/game/save/save-state.test.ts
rtk git commit -m "refactor(world): adapt maps to shared navigation"
```

---

### Task 4: Rewire WorldScene to Shared Navigation

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Behavior:**

On map creation, resolve and retain one navigation grid and one obstacle list for the active map. `resolvePlayerCollision()` becomes a narrow delegation to `resolveMovementSegment()`. Remove the private rectangle/circle/landmark collision decision helpers after the parity tests pass; retain only content/rendering helpers that are still used elsewhere.

- [ ] **Step 1: Add RED WorldScene delegation and parity tests**

Cover at least these current cases using the existing scene harness:

- blocker, fence, collidable decor, interior prop, and NPC entry are blocked;
- an embedded player can move outward from an escape-aware prop/NPC;
- landmark door movement succeeds while body movement fails;
- diagonal resolution remains X-then-Y;
- a large synthetic step cannot tunnel through a one-cell grid barrier;
- emitted `PlayerMovementDiagnostic` coordinates and `blocked` remain faithful.

Inject one authored tiny grid into a map fixture to prove WorldScene consumes `map.navigationGrid`; leave production maps unchanged.

- [ ] **Step 2: Run focused scene tests and verify RED**

```bash
rtk bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: the new grid-barrier/delegation assertions fail against the private scene implementation.

- [ ] **Step 3: Rewire scene creation and movement**

Add scene fields initialized on every map `create()`:

```ts
private navigationGrid!: NavigationGrid;
private navigationObstacles: readonly NavigationObstacle[] = [];
```

Resolve them from the already selected map. Delegate movement:

```ts
return resolveMovementSegment(
	this.navigationGrid,
	this.navigationObstacles,
	{ x: currentX, y: currentY },
	{ x: targetX, y: targetY },
	WorldScene.playerRadius
);
```

Delete the superseded private collision math and its Phaser distance calls. Do not change movement delta clamping, world-bound clamping, input, or diagnostics.

- [ ] **Step 4: Run focused GREEN and checks**

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts src/lib/game/content/maps/navigation.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run check
rtk bunx prettier --check src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bunx eslint src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk git diff --check
```

- [ ] **Step 5: Commit Task 4 exactly**

```bash
rtk git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk git commit -m "refactor(world): use shared navigation at runtime"
```

---

### Task 5: Rewire Save Recovery to the Same Contract

**Files:**

- Modify: `src/lib/game/core/navigation.ts`
- Modify: `src/lib/game/core/navigation.test.ts`
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`

**Interface:**

```ts
export function findNearestWalkablePosition(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	point: NavigationPoint,
	radius: number
): NavigationPoint | null;
```

Search the grid cell containing `point`, then outward in Chebyshev rings. Within each ring preserve the current row-major ordering. Candidate coordinates are cell centres. A candidate is valid only when its grid cell is open and it is outside every `invalidAtRest` obstacle. The caller retains map spawn as the terminal fallback.

- [ ] **Step 1: Add RED direct recovery tests**

Cover:

- current-cell success;
- a blocked grid cell recovering to the current deterministic first candidate;
- a strict rect, escape-aware rect, and landmark all being invalid at rest;
- an NPC with `invalidAtRest: false` not displacing a save;
- an entirely blocked map returning `null`;
- 16px and 32px grids both returning their own cell centres.

- [ ] **Step 2: Run focused tests and verify RED**

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts src/lib/game/save/save-state.test.ts
```

- [ ] **Step 3: Implement recovery and replace save-local decisions**

In `normalizePlayerPosition()`:

1. preserve the current map lookup and bound clamp;
2. resolve the same map grid as runtime;
3. build obstacles with `includeInteractableNpcs: false`;
4. return the clamped point when `isPositionWalkable(..., 'resting-position')` succeeds;
5. call `findNearestWalkablePosition()` otherwise;
6. retain `map.spawn` as the terminal fallback.

Delete `CollisionRect`, `isInsideAnyCollisionRect`, `isInsideCollisionRect`, `findNearestWalkableTile`, and duplicate doorway/collision decision logic from `save-state.ts`. Move no such logic into a second save helper.

- [ ] **Step 4: Run GREEN and the Phase-1 regression gate**

```bash
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts src/lib/game/content/maps/navigation.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/content/maps.test.ts src/lib/game/content/maps/layouts/layouts.test.ts
rtk bun run check
rtk bun run lint
rtk bun run build
rtk git diff --check
```

Expected: all focused suites, checks, lint, and browser build pass with no production map carrying an authored grid yet.

- [ ] **Step 5: Run the existing real-runtime fallback traversal smoke**

```bash
rtk bun run test:e2e -- --grep "Complete world layout foundation traverses every map in fallback mode"
```

Expected: PASS, with movement diagnostics matching the pre-extraction behavior.

- [ ] **Step 6: Commit Task 5 exactly**

```bash
rtk git add src/lib/game/core/navigation.ts src/lib/game/core/navigation.test.ts src/lib/game/save/save-state.ts src/lib/game/save/save-state.test.ts
rtk git commit -m "refactor(save): share runtime navigation recovery"
```

---

### Task 6: Close the Extraction Phase

**Files:**

- Modify only if evidence is needed: `docs/superpowers/reports/2026-08-23-shared-navigation-extraction.md`

- [ ] **Step 1: Verify no duplicate decision engine remains**

```bash
rtk rg -n "findNearestWalkableTile|doesMovementSegmentIntersectRect|isMovementBlockedByStrictRect|isMovementBlockedByEscapeAwareRect" src/lib/game
```

Expected: collision decisions exist only in `core/navigation.ts`; tests may mention historical names only in descriptions.

- [ ] **Step 2: Run the complete one-shot unit suite separately from focused evidence**

```bash
rtk bun run test:unit -- --run
```

Record the exact result. If an existing image-heavy/resource-sensitive aggregate failure occurs, report it separately; do not represent it as a pass and do not weaken the focused gate.

- [ ] **Step 3: Record the Phase-1 boundary**

The evidence report must state:

- no production coordinates or visuals changed;
- no production map has an authored grid yet;
- runtime and save recovery use the same module;
- focused tests/check/lint/build/runtime smoke results;
- any aggregate-only resource issue.

- [ ] **Step 4: Commit the evidence report if created**

```bash
rtk git add docs/superpowers/reports/2026-08-23-shared-navigation-extraction.md
rtk git commit -m "docs(world): record navigation extraction evidence"
```
