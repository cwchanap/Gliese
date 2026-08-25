# Painted Village Interiors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all seven village interiors from approved coordinates, compile their 16px navigation grids, bake rich static scenery into exact-size painted packages, and activate each map atomically while preserving live actors/interactions and a playable layout-matched legacy fallback.

**Architecture:** Keep `VILLAGE_INTERIOR_LAYOUTS` as the sole room/wall/door/spawn/approach/prop source and direct `WorldMapDefinition` literals as the gameplay maps. One narrow `village-interior-package.ts` builder validates manifest/layout dimensions, derives the navigation source, and creates generic `MapBackgroundPackageDefinition` data. A generic registry supplies per-map production defaults. Each interior lands as an independent complete package; unfinished maps continue to use their complete revised legacy rendering.

**Tech Stack:** TypeScript 6, Vitest, Phaser 4, Playwright, Bun, Sharp, existing complete-world layout renderer, generic map-background package/ownership system, built-in image generation, `2d-game-asset-workflow`.

**Spec:** `docs/superpowers/specs/2026-08-23-meadow-collision-live-assets-and-interiors-redesign-design.md`

**Dependencies:** Complete `2026-08-23-shared-navigation-extraction.md` and the shared navigation/tooling portions of `2026-08-23-meadow-navigation-and-live-assets.md` first. Before interior runtime review, complete the approved hero/NPC atlas task from the Meadow plan so interior live actors use the coherent final character family.

## Global Constraints

- Preserve the seven map IDs, transition destinations/semantics, NPC identities/roles/dialogue/shops, pickups, quests, save schema, and current centered camera-bounds/player-follow behavior.
- Redesign dimensions, rooms, corridors, doors, walls, prop zones/collisions, spawns, exits, NPC positions/approaches, and ambient positions only through `VILLAGE_INTERIOR_LAYOUTS` plus direct-map derivation.
- Keep each map one connected floor. Add no second floor, room-loading maps, room graph, procedural generator, generalized editor, or replacement direct-map compiler.
- Primary routes are at least 96px wide; secondary passages and doors are at least 64px wide. Every entrance axis, functional zone, NPC approach, exit, and return transition must be reachable in the compiled 16px player-centre grid.
- Do not change camera zoom per map. Compact interiors must fill representative viewports through approved dimensions/composition; Guild Hall and Shrine may scroll lightly under current follow behavior.
- Static floors, walls, rugs, furniture, storage, lighting, clutter, and environmental storytelling are baked. Player, interactable/ambient NPCs, transitions, pickups, and interactions remain live.
- Each package has one exact-size opaque base, an optional exact-size transparent foreground, one compiled navigation grid, and one manifest with dimensions, SHA-256 image hashes, and navigation metadata.
- Painted activation is all-or-nothing per map. Any missing/invalid required texture or descriptor yields zero painted images and the complete revised legacy base/walls/props. Geometry/navigation remain identical in both modes.
- When painted mode is active, no checkerboard floor, legacy wall strip, or stray static prop sprite remains. Foreground art may contain only reviewed occluding pixels.
- No final image generation begins until that map's coordinate controls, navigation overlays, NPC/ambient anchors, prop zones, and representative current-camera graybox are approved.
- Use the `imagegen` skill and built-in image-generation tool for every base/foreground creation or edit. Use `2d-game-asset-workflow` for exact dimensions, opacity/transparency, manifests, import, and runtime QA.
- Art is corrected to approved geometry; approved geometry is never moved merely to accept an image candidate.
- Keep Lynn/family in House 1, Toma/workshop in House 2, Io/archive-study in House 3, Guild Master/quartermaster in Guild Hall, and Mira/shop behavior in Item Shop.
- Before every art commit, verify runtime/evidence PNGs match the declared Git LFS filters and appear
  as LFS pointers in the staged diff.
- Preserve unrelated dirty/untracked files. Run commands through `rtk`. Obtain spec and code-quality review after every shared-code task and every interior slice.

---

### Task 1: Build the Shared Interior Package and Generic Registry

**Files:**

- Create: `src/lib/game/content/backgrounds/village-interior-package.ts`
- Create: `src/lib/game/content/backgrounds/village-interior-package.test.ts`
- Create: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Create: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Create: `src/lib/game/content/backgrounds/map-background-registry.ts`
- Create: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts`
- Modify: `src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts`
- Modify: `src/lib/game/phaser/scenes/BootScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**

```ts
export type VillageInteriorMapId =
	| 'hero-house'
	| 'guild-hall'
	| 'item-shop'
	| 'villager-house-1'
	| 'villager-house-2'
	| 'villager-house-3'
	| 'shrine-of-aurora-interior';

export interface VillageInteriorImageManifest {
	readonly id: string;
	readonly textureKey: string;
	readonly path: string;
	readonly sha256: string;
}

export interface VillageInteriorPackageManifest {
	readonly version: 1;
	readonly mapId: VillageInteriorMapId;
	readonly dimensionsPx: { readonly width: number; readonly height: number };
	readonly base: VillageInteriorImageManifest;
	readonly foreground?: VillageInteriorImageManifest;
	readonly navigation: {
		readonly gridId: string;
		readonly cellSizePx: 16;
		readonly widthCells: number;
		readonly heightCells: number;
		readonly clearancePx: 12;
		readonly source: 'layout' | 'explicit-reviewed-override';
	};
}

export interface BuildVillageInteriorPackageInput {
	readonly mapId: VillageInteriorMapId;
	readonly layout: VillageInteriorLayout;
	readonly manifest: VillageInteriorPackageManifest;
	readonly visualOwners: readonly MapBackgroundVisualOwner[];
	readonly navigationSource: NavigationMaskSource;
}

export interface BuiltVillageInteriorPackage {
	readonly definition: MapBackgroundPackageDefinition;
	readonly navigationSource: NavigationMaskSource;
}

export const VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES = Object.freeze([
	'blocker',
	'interior-prop'
] as const satisfies readonly NavigationGridOwnedSource[]);

export function buildVillageInteriorPackage(
	input: BuildVillageInteriorPackageInput
): BuiltVillageInteriorPackage;

export function buildVillageInteriorNavigationSource(input: {
	readonly mapId: VillageInteriorMapId;
	readonly layout: VillageInteriorLayout;
	readonly navigationOverride?: NavigationMaskSource;
}): NavigationMaskSource;
```

The builder verifies layout pixels equal manifest pixels, all dimensions divide by 16,
base/foreground descriptors cover the exact full map, navigation metadata matches the
derived/override source, and every visual-owner source ID is unique. Package coverage is always
`full-map`. Every revised direct interior map attaches its generated grid and the shared
`VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES`, so walls and collidable interior props are not applied
twice.

Move the generic registry out of the Meadow-specific runtime module:

```ts
export const MAP_BACKGROUND_PACKAGE_REGISTRY: readonly MapBackgroundPackageDefinition[];
export const MAP_BACKGROUND_DEFAULT_SELECTIONS: Readonly<
	Partial<Record<string, ResolveMapBackgroundPackageInput['defaultSelection']>>
>;
```

Initially `village-interior-navigation-sources.ts` exports an empty frozen source array and
`village-interior-packages.ts` exports an empty frozen definition array. An approved coordinate
slice joins the first registry before art; it joins the package registry only after its manifest and
images pass. These empty arrays accurately represent unfinished interiors and are valid registry
states.

- [ ] **Step 1: Write RED builder and registry tests**

Use a 10x8-tile fixture layout and temporary manifest. Cover independent navigation-source creation,
exact descriptor construction, optional
foreground, all static-owner types, dimension/grid mismatch rejection, duplicate owners, invalid
override dimensions, the exact `['blocker', 'interior-prop']` grid-ownership list, frozen results,
registry ID/map/default uniqueness, and current Meadow packages/default preservation.

Add BootScene/WorldScene tests proving defaults are looked up by `mapId`, all selected packages preload, and a selected non-Meadow package flows through existing transactional rendering.

- [ ] **Step 2: Run RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

- [ ] **Step 3: Implement the builder and registry refactor**

Keep selection/application/rendering logic in the existing generic background-package modules and scene path. Do not create an interior-only renderer. `BootScene` and `WorldScene` pass `MAP_BACKGROUND_DEFAULT_SELECTIONS[map.id] ?? null` to the current resolver.

- [ ] **Step 4: Run GREEN and checks**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/backgrounds/map-background-package.test.ts src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run check
rtk bunx prettier --check src/lib/game/content/backgrounds/village-interior-package.ts src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts
rtk git diff --check
```

- [ ] **Step 5: Commit Task 1 exactly**

```bash
rtk git add src/lib/game/content/backgrounds/village-interior-package.ts src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.ts src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk git commit -m "feat(world): build generic interior background packages"
```

---

### Task 2: Derive Interior Navigation, Validate Art, and Render Per-Map Proofs

**Files:**

- Modify: `.gitattributes`
- Modify: `src/lib/game/content/backgrounds/village-interior-package.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-package.test.ts`
- Modify: `src/lib/game/content/backgrounds/navigation-source-registry.ts`
- Modify: `tools/generate-navigation-runtime.ts`
- Modify: `tools/generate-navigation-runtime.test.ts`
- Create: `tools/validate-village-interior-art.ts`
- Create: `tools/validate-village-interior-art.test.ts`
- Create: `src/lib/game/content/village-interior-assets.asset.test.ts`
- Modify: `tools/render-complete-world-layout-review.ts`
- Modify: `tools/render-complete-world-layout-review.test.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `package.json`

**Navigation derivation:**

For a layout-derived source, begin with all `.` cells inside the exact map bounds, rasterize every `walls` and `propCollisions` rectangle to raw `#` cells, then let `compileNavigationGrid()` apply 12px player clearance. A raw cell is blocked when its 16px cell centre lies inside a blocking top-left layout rectangle. An optional full-size reviewed override replaces the derived rows; it does not silently patch them.

Add Git LFS patterns before any interior runtime or evidence PNG is committed:

```gitattributes
public/game/assets/interiors/**/*.png filter=lfs diff=lfs merge=lfs -text
docs/superpowers/reports/img/hpa-586-interiors/**/*.png filter=lfs diff=lfs merge=lfs -text
```

**Art validator:**

`validate-village-interior-art.ts --map <id> [--check]` reads one registered manifest;
`--all [--check]` validates every registered interior. The modes are mutually exclusive. Validation
requires exact image dimensions, requires every base alpha byte to be 255, requires a foreground
(when present) to contain both transparent and non-transparent pixels, validates SHA-256, and
refuses paths outside `public/game/assets/interiors/<mapId>/`.

**Proof renderer:**

Extend the existing complete-world layout renderer with `--map <VillageInteriorMapId>` and emit:

- coordinate graybox with rooms/corridors/doors/walls/prop zones;
- raw collision and player-centre navigation overlays;
- spawn/exit/NPC/ambient/approach anchors;
- route-width annotations;
- representative 640x360 and 1280x720 current-camera crops;
- painted base, foreground alpha, collision overlay, live-actor overlay, and fallback comparison once assets exist.

- [ ] **Step 1: Write RED shared-tool tests**

Cover exact wall/prop rasterization, 96px and 64px clearance fixtures, override replacement
validation, navigation-source registry aggregation, art opacity/transparency/hash/path rules,
per-map/all CLI parsing, deterministic proof inventory, and `--check` freshness. The asset test reads
every currently registered manifest/runtime image from the repository and applies the same exact
dimension, alpha, path, and SHA rules; the empty registry passes before the first art slice.

- [ ] **Step 2: Run RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/village-interior-assets.asset.test.ts
rtk bun test tools/generate-navigation-runtime.test.ts tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts
```

- [ ] **Step 3: Implement shared derivation, validation, and proof rendering**

Add:

```json
"art:validate:village-interiors": "bun tools/validate-village-interior-art.ts --all --check"
```

The navigation generator imports the combined Meadow plus interior source registry and still emits one sorted generated module. Do not add a second generator.

- [ ] **Step 4: Replace obsolete layout-test freezes with approved-contract helpers**

Prepare reusable assertions for dimensions/program keys, grid continuity, route widths, door connectivity, spawn/exit validity, NPC approaches, and map-specific signatures. Remove the old `ROOM_CENTER_COLLISION_REPLACEMENTS`-based Guild Hall test and old seven-program snapshot only when each replacement assertion is present. Retain and later update the three-home distinctness test.

- [ ] **Step 5: Run GREEN and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/village-interior-assets.asset.test.ts
rtk bun test tools/generate-navigation-runtime.test.ts tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts
rtk bun run check
rtk git diff --check
rtk git add .gitattributes package.json src/lib/game/content/backgrounds/village-interior-package.ts src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/navigation-source-registry.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/village-interior-assets.asset.test.ts tools/generate-navigation-runtime.ts tools/generate-navigation-runtime.test.ts tools/validate-village-interior-art.ts tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.ts tools/render-complete-world-layout-review.test.ts
rtk git commit -m "feat(world): validate painted interior slices"
```

---

### Task 3: Complete Hero House as the End-to-End Pilot

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/hero-house.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/hero-house/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/hero-house/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create evidence under: `docs/superpowers/reports/img/hpa-586-interiors/hero-house/`

**Functional program:** clear entrance axis; living kitchen; bedroom; study; storage; personal details. No NPC identity is added. Live player and transition remain the only required actors/interaction anchors.

- [ ] **Step 1: Write RED layout and runtime contract tests**

Assert the exact new dimension/program keys chosen in the coordinate design; at least 96px
entrance/living route; at least 64px doors/secondary passage; reachable bedroom/study/storage
samples; clear spawn/exit; adequate camera-edge clearance; revised legacy ground/walls/props
derived from the same layout; manifest/map/grid dimension parity; the generated grid plus shared
interior ownership list attached to the direct map; and all static sources owned by the painted
package.

- [ ] **Step 2: Author and render the Hero House coordinate package**

Redesign only the Hero House entry in `VILLAGE_INTERIOR_LAYOUTS`, then update direct-map props and collisions from its named zones. Generate the navigation registry and per-map proof:

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map hero-house
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

- [ ] **Step 3: STOP for Hero House Gates 1 and 2**

Present coordinate/navigation/current-camera graybox. Approval covers functional readability, dimensions, 96/64px routes, entrance/exit, storage, camera fill, and no zoom change. Revise layout source on rejection.

- [ ] **Step 4: Commit the approved Hero House coordinates before art**

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/hero-house
rtk git commit -m "feat(world): approve Hero House layout"
```

- [ ] **Step 5: Confirm Gate 3 live-asset composition**

Overlay the already approved hero atlas at spawn and representative room positions. No new live asset is generated in this task. If the shared hero art is rejected globally, return to the character-art owner in the Meadow plan.

- [ ] **Step 6: Generate the exact-size painted base/foreground**

Use built-in image generation from the approved graybox and Meadow style reference. Bake floors, walls, kitchen, bed, study/storage, rugs, lighting, clutter, and personal storytelling. Keep base fully opaque; put only tall occluding pixels in optional foreground. Normalize/validate, write exact hashes into `hero-house.json`, and register the complete package/default.

```bash
rtk bun tools/validate-village-interior-art.ts --map hero-house
rtk bun tools/render-complete-world-layout-review.ts --map hero-house
```

- [ ] **Step 7: STOP for Hero House Gate 4**

Present base, foreground alpha, navigation overlay, live-player overlay, and legacy fallback comparison. Reject checkerboard remnants, stray props, collision mismatch, poor composition, or alpha/occlusion errors.

- [ ] **Step 8: Prove atomic runtime and Gate 5**

Add focused tests for normal painted mode, missing base, missing foreground when declared, complete legacy fallback, movement through every functional area, exit/re-entry, save/reload, and current-camera screenshots.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map hero-house --check
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run check
rtk bun run build
rtk bun run test:e2e -- --grep "Hero House painted interior"
```

Present actual runtime/fallback/reload evidence and obtain approval.

- [ ] **Step 9: Commit the approved Hero House package**

```bash
rtk git add src/lib/game/content/backgrounds/manifests/hero-house.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/hero-house docs/superpowers/reports/img/hpa-586-interiors/hero-house
rtk git commit -m "feat(art): ship painted Hero House"
```

---

### Task 4: Redesign and Paint Guild Hall

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/guild-hall.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/guild-hall/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/guild-hall/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/guild-hall/`

**Functional program:** public entrance/lobby; quest/records area; Guild Master station; quartermaster station; gathering area; training space. Preserve interactable `guild-master` and `guild-quartermaster`, shop binding `guild-quartermaster`, and ambient `guild-hall-member-west`/`guild-hall-member-east` identities while moving their anchors through approved layout data.

- [ ] **Step 1: Write RED Guild Hall contracts**

Replace the obsolete room-center/replacement test with exact approved Guild Hall dimensions/program keys, reachable Guild Master and quartermaster approaches, counter/desk collision, ambient activity positions, 96px public/training routes, 64px secondary doors, entrance/exit connectivity, light-scroll camera coverage, manifest/grid parity, and complete static ownership.

- [ ] **Step 2: Author, render, and obtain Gates 1/2 approval**

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map guild-hall
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Review the civic hierarchy, readable stations without labels, interaction approaches,
gathering/training circulation, entrance axis, and current-camera scroll. After approval, commit the
coordinate slice before art:

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/guild-hall
rtk git commit -m "feat(world): approve Guild Hall layout"
```

- [ ] **Step 3: Confirm approved live-character composition**

Overlay Guild Master, quartermaster, both ambient members, and hero at their approved display sizes and depths. Return any global character mismatch to the shared atlas owner; do not move layout anchors to hide it.

- [ ] **Step 4: Generate/validate painted art and obtain Gate 4 approval**

Bake records, quest presentation, counters, gathering furniture, training equipment, guild heraldry, warm lighting, and clutter into the exact-size base; isolate only true occluders in foreground.

```bash
rtk bun tools/validate-village-interior-art.ts --map guild-hall
rtk bun tools/render-complete-world-layout-review.ts --map guild-hall
```

- [ ] **Step 5: Prove Gate 5 and commit**

Test both NPC interactions/shop, ambient positions, all zones, depth/foreground, exit/re-entry, save/reload, missing-asset fallback, and current-camera scroll.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map guild-hall --check
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Guild Hall painted interior"
rtk bun run check
rtk git diff --check
```

After user runtime approval, commit the package and evidence:

```bash
rtk git add src/lib/game/content/backgrounds/manifests/guild-hall.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/guild-hall docs/superpowers/reports/img/hpa-586-interiors/guild-hall
rtk git commit -m "feat(art): ship painted Guild Hall"
```

---

### Task 5: Redesign and Paint Item Shop

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/item-shop.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/item-shop/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/item-shop/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/item-shop/`

**Functional program:** entrance and sales floor; unmistakable counter approach; product displays; stockroom; work/office space. Preserve interactable `shopkeeper-mira`, shop `miras-item-shop`, and ambient `item-shop-customer` identities.

- [ ] **Step 1: Write RED Item Shop contracts**

Assert exact approved dimensions/program keys, 96px entrance/sales circulation, 64px stockroom/office passages, clear Mira approach within interaction radius and outside counter collision, reachable displays/stock/work zones, ambient customer activity anchor, camera fill, manifest/grid parity, and static ownership.

- [ ] **Step 2: Author, render, and obtain Gates 1/2 approval**

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map item-shop
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Approve shopping flow, counter readability, inventory density without blocked aisles, service rooms,
and current-camera composition. Then commit the approved coordinate slice:

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/item-shop
rtk git commit -m "feat(world): approve Item Shop layout"
```

- [ ] **Step 3: Confirm live Mira/customer/hero composition**

Use approved character atlas and depth. Any asset-wide rejection returns to the atlas task; layout remains fixed.

- [ ] **Step 4: Generate/validate painted art and obtain Gate 4 approval**

Bake counter, displays, bottles/packages, shelving, stock/work details, signage-without-runtime-text, lighting, and clutter into base/foreground.

```bash
rtk bun tools/validate-village-interior-art.ts --map item-shop
rtk bun tools/render-complete-world-layout-review.ts --map item-shop
```

- [ ] **Step 5: Prove Gate 5 and commit**

Test Mira interaction/shop open-close flow, counter collision/approach, all zones, customer position, foreground depth, exit/re-entry, save/reload, and total fallback.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map item-shop --check
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Item Shop painted interior"
rtk bun run check
```

After runtime approval, commit the package and evidence:

```bash
rtk git add src/lib/game/content/backgrounds/manifests/item-shop.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/item-shop docs/superpowers/reports/img/hpa-586-interiors/item-shop
rtk git commit -m "feat(art): ship painted Item Shop"
```

---

### Task 6: Redesign and Paint Villager House 1

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/villager-house-1.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/villager-house-1/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/villager-house-1/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/villager-house-1/`

**Functional program:** family-oriented cottage with entrance/living axis, family table, kitchen, bedroom, storage, and domestic details. Preserve interactable `villager-lynn` and ambient `villager-house-1-family` identities.

- [ ] **Step 1: Write RED House 1 contracts**

Assert exact approved dimensions/program keys, 96px main family circulation, 64px private/storage passages, clear Lynn approach, valid family activity anchor, reachable domestic zones, camera fill, manifest/grid parity, and a structural signature distinct from Houses 2 and 3.

- [ ] **Step 2: Author, render, and approve coordinates**

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-1
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Approve family warmth/readability, circulation, NPC approaches, entrance axis, and current-camera
fill. Then commit the approved coordinate slice:

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/villager-house-1
rtk git commit -m "feat(world): approve family cottage layout"
```

- [ ] **Step 3: Confirm live-character composition, generate art, and approve Gate 4**

Overlay Lynn/family/hero, then use built-in image generation to bake a warm lived-in cottage with family table, kitchen, bedding, storage, lighting, textiles, and small personal clutter. Validate exact images and review collision/foreground overlays.

```bash
rtk bun tools/validate-village-interior-art.ts --map villager-house-1
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-1
```

- [ ] **Step 4: Prove Gate 5 and commit**

Test Lynn interaction, family anchor, all zones/routes, exit/re-entry, save/reload, foreground depth, and full fallback.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map villager-house-1 --check
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Villager House 1 painted interior"
rtk bun run check
```

After runtime approval, commit the package and evidence:

```bash
rtk git add src/lib/game/content/backgrounds/manifests/villager-house-1.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/villager-house-1 docs/superpowers/reports/img/hpa-586-interiors/villager-house-1
rtk git commit -m "feat(art): ship painted family cottage"
```

---

### Task 7: Redesign and Paint Villager House 2

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/villager-house-2.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/villager-house-2/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/villager-house-2/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/villager-house-2/`

**Functional program:** artisan home/workshop with entrance/living axis, working bench, material/tool storage, bedroom, and domestic/artisan overlap. Preserve interactable `villager-toma` and ambient `villager-house-2-neighbor` identities.

- [ ] **Step 1: Write RED House 2 contracts**

Assert exact approved dimensions/program keys, 96px entrance/workshop route, 64px bedroom/storage passage, clear Toma approach outside workbench collision, valid neighbor anchor, reachable work/storage/living zones, camera fill, manifest/grid parity, and a signature distinct from the family and scholar homes.

- [ ] **Step 2: Author, render, and approve coordinates**

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-2
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Approve workshop hierarchy, safe workbench interaction, domestic readability, entrance axis, and
viewport composition. Then commit the approved coordinate slice:

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/villager-house-2
rtk git commit -m "feat(world): approve artisan home layout"
```

- [ ] **Step 3: Confirm live-character composition, generate art, and approve Gate 4**

Overlay Toma/neighbor/hero, then bake bench, tools, materials, storage, bed/living details, work lighting, worn surfaces, and artisan clutter. Keep walkable floor visibly clear and foreground limited to real occluders.

```bash
rtk bun tools/validate-village-interior-art.ts --map villager-house-2
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-2
```

- [ ] **Step 4: Prove Gate 5 and commit**

Test Toma interaction and workbench collision, neighbor anchor, all routes, exit/re-entry, save/reload, depth, and full fallback.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map villager-house-2 --check
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Villager House 2 painted interior"
rtk bun run check
```

After runtime approval, commit the package and evidence:

```bash
rtk git add src/lib/game/content/backgrounds/manifests/villager-house-2.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/villager-house-2 docs/superpowers/reports/img/hpa-586-interiors/villager-house-2
rtk git commit -m "feat(art): ship painted artisan home"
```

---

### Task 8: Redesign and Paint Villager House 3

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/villager-house-3.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/villager-house-3/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/villager-house-3/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/villager-house-3/`

**Functional program:** scholar/archive/traveler home with entrance/sitting axis, archive shelving, reading/study table, bedroom, travel/storage details. Preserve interactable `villager-io` and ambient `villager-house-3-neighbor` identities.

- [ ] **Step 1: Write RED House 3 contracts**

Assert exact approved dimensions/program keys, 96px entrance/reading circulation, 64px archive/bedroom passage, clear Io approach outside archive collision, valid neighbor anchor, reachable archive/study/sitting zones, camera fill, manifest/grid parity, and a signature distinct from Houses 1 and 2. Update the retained three-home distinctness test to the three approved signatures.

- [ ] **Step 2: Author, render, and approve coordinates**

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-3
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Approve archive readability, Io interaction, travel/scholar identity, entrance axis, and viewport
composition. Then commit the approved coordinate slice:

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/villager-house-3
rtk git commit -m "feat(world): approve scholar home layout"
```

- [ ] **Step 3: Confirm live-character composition, generate art, and approve Gate 4**

Overlay Io/neighbor/hero, then bake shelves, books/maps, reading table, seating, bed, travel storage, layered lighting, and scholarly clutter. Keep collision aligned with shelf geometry and occlusion isolated.

```bash
rtk bun tools/validate-village-interior-art.ts --map villager-house-3
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-3
```

- [ ] **Step 4: Prove Gate 5 and commit**

Test Io interaction and shelf collision, neighbor anchor, all routes, exit/re-entry, save/reload, depth, and full fallback.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map villager-house-3 --check
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Villager House 3 painted interior"
rtk bun run check
```

After runtime approval, commit the package and evidence:

```bash
rtk git add src/lib/game/content/backgrounds/manifests/villager-house-3.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/villager-house-3 docs/superpowers/reports/img/hpa-586-interiors/villager-house-3
rtk git commit -m "feat(art): ship painted scholar home"
```

---

### Task 9: Redesign and Paint the Shrine of Aurora

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Create: `src/lib/game/content/backgrounds/manifests/shrine-of-aurora-interior.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Create: `public/game/assets/interiors/shrine-of-aurora-interior/base.png`
- Create if approved occlusion needs it: `public/game/assets/interiors/shrine-of-aurora-interior/foreground.png`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/shrine-of-aurora-interior/`

**Functional program:** processional entrance/nave; altar; preparation alcove; archive; reflective or luminous focal area. No new NPC identity is added.

- [ ] **Step 1: Write RED Shrine contracts**

Replace the old service-pocket wall freeze with exact approved dimensions/program keys; 96px processional route; 64px alcove/archive passages; reachable altar/preparation/archive/focal samples; clear spawn/exit; light-scroll camera coverage; manifest/grid parity; and complete ownership. Retain proof that no inaccessible decorative pocket is mistaken for walkable space.

- [ ] **Step 2: Author, render, and approve coordinates**

```bash
rtk bun run world:generate:navigation
rtk bun tools/render-complete-world-layout-review.ts --map shrine-of-aurora-interior
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Approve procession, altar sightline, luminous focal hierarchy, side-space access, entrance/exit, and
current-camera scrolling. Then commit the approved coordinate slice:

```bash
rtk git add src/lib/game/content/maps/layouts/village-interiors-v2.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts docs/superpowers/reports/img/hpa-586-interiors/shrine-of-aurora-interior
rtk git commit -m "feat(world): approve Shrine interior layout"
```

- [ ] **Step 3: Confirm hero composition, generate art, and approve Gate 4**

Overlay the hero along the nave and altar approach. Bake luminous stone/wood, altar, archive/preparation details, reflective focal treatment, rugs/benches, layered light, and devotional clutter while preserving clear circulation. Put tall architectural occluders only in foreground.

```bash
rtk bun tools/validate-village-interior-art.ts --map shrine-of-aurora-interior
rtk bun tools/render-complete-world-layout-review.ts --map shrine-of-aurora-interior
```

- [ ] **Step 4: Prove Gate 5 and commit**

Test processional movement, all side/focal zones, foreground occlusion, exit/re-entry, save/reload, current-camera scroll/edges, and full fallback.

```bash
rtk bun run world:check:navigation
rtk bun tools/validate-village-interior-art.ts --map shrine-of-aurora-interior --check
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Shrine of Aurora painted interior"
rtk bun run check
```

After runtime approval, commit the package and evidence:

```bash
rtk git add src/lib/game/content/backgrounds/manifests/shrine-of-aurora-interior.json src/lib/game/content/backgrounds/village-interior-packages.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts public/game/assets/interiors/shrine-of-aurora-interior docs/superpowers/reports/img/hpa-586-interiors/shrine-of-aurora-interior
rtk git commit -m "feat(art): ship painted Shrine interior"
```

---

### Task 10: Close All-Seven Interior Regression and Runtime Review

**Files:**

- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create: `docs/superpowers/reports/2026-08-23-painted-village-interiors-runtime-review.md`
- Add final comparison/runtime evidence under: `docs/superpowers/reports/img/hpa-586-interiors/final/`

- [ ] **Step 1: Add the all-seven contract matrix**

For every interior assert:

- approved dimensions and functional program keys;
- 16px generated grid current under `--check`;
- spawn, exit, doors, room samples, NPC approaches, ambient anchors, and transitions valid/reachable;
- 96px primary and 64px secondary clearance;
- manifest/image/map/grid dimension parity and current hashes;
- production package/default registered exactly once;
- base/optional foreground exact and valid;
- every static legacy source owned by the painted package;
- three home signatures remain distinct;
- no map-specific camera zoom setting exists.

- [ ] **Step 2: Add one data-driven all-seven E2E traversal**

For each map, enter from Meadow, traverse every required zone/interaction, prove foreground depth where present, exit/re-enter, save/reload, capture normal painted mode, force missing-required-texture fallback, verify zero partial painted images, and confirm the same revised navigation/coordinates in fallback.

- [ ] **Step 3: Run the focused completion gate**

```bash
rtk bun run world:check:navigation
rtk bun run art:validate:village-interiors
rtk bun test tools/generate-navigation-runtime.test.ts tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts src/lib/game/content/maps/navigation.test.ts src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/map-background-package.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run check
rtk bun run lint
rtk bun run build
rtk bun run test:e2e -- --grep "all seven painted village interiors"
rtk git check-attr filter -- public/game/assets/interiors/*/*.png docs/superpowers/reports/img/hpa-586-interiors/*/*.png
rtk git lfs ls-files
rtk git diff --check
```

- [ ] **Step 4: Capture and obtain final Gate 5 approval**

The report and evidence include painted/fallback/current-camera comparisons for all seven, every NPC interaction, representative navigation overlays, foreground depth, exit/re-entry, save/reload, and missing-asset fallback. Present these actual runtime outputs; source/test claims alone are insufficient.

- [ ] **Step 5: Run aggregate suites separately**

```bash
rtk bun run test:unit -- --run
rtk bun run test:e2e
```

Record exact results. Any image-heavy/resource-sensitive aggregate failure is reported separately and does not erase focused failures or substitute for a pass.

- [ ] **Step 6: Commit final matrix and evidence**

```bash
rtk git add src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/game.e2e.ts docs/superpowers/reports/2026-08-23-painted-village-interiors-runtime-review.md docs/superpowers/reports/img/hpa-586-interiors/final
rtk git commit -m "test(world): prove all painted village interiors"
```
