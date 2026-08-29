# Complete Eight Village Interiors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish Villager House 3 and the Shrine of Aurora, add an enterable functional Blacksmith,
and prove all eight Sundrop interiors in painted and atomic-fallback runtime modes.

**Architecture:** Extend the existing direct-map, 16px navigation, generic painted-package, story,
shop, and save-migration paths. Blacksmith is an eighth data entry, never a runtime special case.
Every map freezes and proves geometry before art; base images own presentation while collision,
actors, interactions, transitions, and state remain live.

**Tech Stack:** TypeScript, Svelte 5, Phaser 4, Vitest, Playwright, Bun, Sharp, Rust story compiler,
Git LFS, built-in image generation.

**Spec:** `docs/superpowers/specs/2026-08-29-complete-eight-village-interiors-expansion-brief.md`

## Global Constraints

- Work only in `/Users/chanwaichan/workspace/Gliese/.worktrees/hpa-586-interior-graybox` on
  `codex/hpa-586-painted-interiors`.
- Preserve the five approved painted interiors and all existing map, NPC, shop, quest, encounter,
  pickup, discovery, reward, exterior-lot, and return-arrival semantics.
- Blacksmith IDs are `blacksmith-interior`, `meadow-to-blacksmith`, `blacksmith-to-meadow`,
  `blacksmith-oren`, `sundrop-forge`, and `blacksmith-interior-painted`.
- Blacksmith stock is one finite copy each of `training-sword`, `iron-cap`, `grip-wraps`, and
  `traveler-vest`; do not add items, crafting, repair, upgrades, quests, combat, or rewards.
- Exact map dimensions are Blacksmith `896x704`, Villager House 3 `1024x704`, and Shrine
  `1024x896`.
- Primary routes are at least 96px wide; secondary/private routes are at least 64px wide.
- Do not change camera zoom. Do not move exterior geometry.
- Produce opaque base images. Add no foreground unless runtime evidence proves a real occluder;
  decorative overlays are forbidden.
- Missing any required image must select the complete legacy fallback for that map.
- Advance saves from v8 to v9 without losing existing shop purchases or any other state.
- Use TDD: capture each focused RED before production edits, then the smallest GREEN.
- Stop for controller layout approval before each art task and for painted runtime approval before
  each art commit.
- Do not merge or push without separate authorization.

## File Responsibilities

- `src/lib/game/content/maps/layouts/village-interiors-v2.ts`: exact room, corridor, wall, door,
  spawn, exit, NPC approach, prop-zone, and collision coordinates.
- `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`: exterior building/door/return contract.
- `src/lib/game/content/maps/regions/village.ts`: generated exterior-to-interior transitions.
- `src/lib/game/content/maps.ts`: direct interior maps and live fallback content.
- `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts` and
  `src/lib/game/content/generated/navigation-grids.generated.ts`: 16px navigation authority.
- `src/lib/game/content/backgrounds/village-interior-packages.ts`, manifests, registry, and image
  assets: atomic painted presentation.
- `src/lib/game/content/dialogue.ts`, `src/lib/game/content/shops.ts`, `story/`, and i18n messages:
  Oren and `sundrop-forge` content.
- `src/lib/game/save/save-state.ts` and `src/lib/game/save/storage.ts`: v8-to-v9 migration and
  persisted stock shape.
- `tools/validate-village-interior-art.ts` and `tools/render-complete-world-layout-review.ts`:
  validation and controller evidence.
- focused unit/E2E files: durable contracts; generated proof directories are review evidence only.

---

### Task 1: Make the Blacksmith Enterable as an Approved Graybox

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps/layouts/meadow-entry-v2.ts`
- Modify: `src/lib/game/content/maps/regions/village.ts`
- Modify: `src/lib/game/content/maps/layouts/complete-world-layout-foundation.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-package.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Modify: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/core/area-map.ts`
- Modify: `src/lib/game/i18n/messages/en.ts`
- Modify: `src/lib/game/i18n/messages/ja.ts`
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts`
- Modify: `tools/validate-village-interior-art.ts`
- Modify: `tools/render-complete-world-layout-review.ts`
- Test: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Test: `src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts`
- Test: `src/lib/game/content/maps.test.ts`
- Test: `src/lib/game/core/area-map.test.ts`
- Test: `tools/render-complete-world-layout-review.test.ts`
- Test: `tests/e2e/game.e2e.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/blacksmith-interior/`

**Interfaces:**

- Produces: `VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior']` with `28x22` tiles.
- Produces: `blacksmithInteriorMap: WorldMapDefinition` and
  `VILLAGE_INTERIOR_NAVIGATION_SOURCES` entry `blacksmith-interior-navigation`.
- Produces: an exterior transition generated from `SUNDROP_VILLAGE_V2_BUILDINGS.blacksmith`.
- Consumed later by: Oren/shop integration and the Blacksmith painted package.

- [ ] **Step 1: Write the failing structural and route contracts**

Add tests asserting:

```ts
expect(VILLAGE_INTERIOR_LAYOUTS['blacksmith-interior']).toMatchObject({
	widthTiles: 28,
	heightTiles: 22,
	spawn: { x: 448, y: 576 },
	exit: { x: 448, y: 688 }
});
expect(SUNDROP_VILLAGE_V2_BUILDINGS.blacksmith).toMatchObject({
	mapId: 'blacksmith-interior',
	transitionId: 'meadow-to-blacksmith',
	returnArrival: { x: 2272, y: 5248, facing: 'down' }
});
expect(maps['blacksmith-interior']).toBe(blacksmithInteriorMap);
expect(
	buildAreaMapState({
		map: blacksmithInteriorMap,
		player: blacksmithInteriorMap.spawn,
		revealedCells: [],
		quests: createInitialQuestState(),
		locale: 'en'
	}).name
).toBe('Sundrop Forge');
```

Use `buildVillageInteriorNavigationSource` to assert the spawn, exit, Oren approach, forge, armory,
storage, showroom, and both side loops are reachable with the required clearances. Add an E2E named
`Blacksmith graybox entrance` that walks to the authored exterior door, enters the map, and exits to
`{ x: 2272, y: 5248 }`.

- [ ] **Step 2: Run the focused tests and capture RED**

Run:

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts src/lib/game/content/maps.test.ts src/lib/game/core/area-map.test.ts
```

Expected: failures for missing `blacksmith-interior` layout, map, navigation, and transition.

- [ ] **Step 3: Add the exact Blacksmith layout**

Add this wall program and layout:

```ts
const blacksmithWalls: readonly NamedLayoutRect[] = [
	namedRect('blacksmith-wall-north', 0, 0, 896, 64),
	namedRect('blacksmith-wall-west', 0, 64, 64, 608),
	namedRect('blacksmith-wall-east', 832, 64, 64, 608),
	namedRect('blacksmith-wall-south-west', 0, 672, 384, 32),
	namedRect('blacksmith-wall-south-east', 512, 672, 384, 32),
	namedRect('blacksmith-forge-divider-north', 416, 64, 32, 96),
	namedRect('blacksmith-forge-divider-south', 416, 256, 32, 128),
	namedRect('blacksmith-armory-divider-north', 544, 64, 32, 96),
	namedRect('blacksmith-armory-divider-south', 544, 256, 32, 128),
	namedRect('blacksmith-showroom-divider-west', 64, 352, 384, 32),
	namedRect('blacksmith-showroom-divider-east', 544, 352, 288, 32)
];
```

```ts
'blacksmith-interior': {
	widthTiles: 28,
	heightTiles: 22,
	fullFloor: rect(0, 0, 896, 704),
	rooms: {
		forgeFloor: rect(64, 64, 352, 288),
		armoryDisplay: rect(576, 64, 256, 288),
		showroom: rect(64, 384, 768, 288)
	},
	corridors: {
		serviceSpine: rect(448, 64, 96, 320),
		entranceAisle: rect(384, 480, 128, 192)
	},
	doors: {
		forge: rect(416, 160, 32, 96),
		armory: rect(544, 160, 32, 96),
		hallToShowroom: rect(448, 352, 96, 32),
		exterior: rect(384, 672, 128, 32)
	},
	walls: blacksmithWalls,
	spawn: point(448, 576),
	exit: point(448, 688),
	npcApproaches: { oren: { npc: point(448, 416), approach: point(448, 480) } },
	propZones: {
		forge: rect(96, 96, 128, 160),
		anvil: rect(272, 160, 96, 96),
		serviceCounter: rect(256, 400, 384, 96),
		weaponRacks: rect(608, 96, 160, 192),
		coalStorage: rect(96, 288, 224, 64),
		showroomDisplay: rect(640, 480, 128, 128)
	},
	propCollisions: {
		forge: rect(112, 112, 96, 128),
		anvil: rect(288, 176, 64, 64),
		serviceCounter: rect(288, 448, 320, 8),
		weaponRacks: rect(624, 112, 128, 160),
		coalStorage: rect(112, 304, 192, 32),
		showroomDisplay: rect(656, 496, 96, 96)
	}
}
```

- [ ] **Step 4: Wire the exterior, map, and fallback visuals**

Extend the existing Blacksmith building record without changing its geometry:

```ts
mapId: 'blacksmith-interior',
transitionId: 'meadow-to-blacksmith',
returnArrival: { x: 2272, y: 5248, facing: 'down' }
```

Add `blacksmith-interior` to `VILLAGE_INTERIOR_EXTERIORS`,
`compactInteriorArrivals`, `COMPLETE_WORLD_MAP_IDS`, `VillageInteriorMapId`, validator map IDs, and
the map registry. Add `blacksmith-interior: 'content.maps.areas.blacksmith-interior'` to the
exhaustive `areaNameKeys` registry in `core/area-map.ts`. Add one small
`interiorWallBlockers(walls)` helper in `maps.ts` and use it for the new Blacksmith map; later layout
tasks also use it for their revised wall arrays. The fallback map uses existing `hearthLamp`,
`table`, `shopCounter`, `weaponRack`, `crateStack`, and `displayShelf` frames with collision copied
from `propCollisions`.

Add exact area text for `blacksmith-interior`: English `Sundrop Forge`, Japanese
`サンドロップ鍛冶場`, and Traditional Chinese `晴滴鍛造坊`. Do not add Oren yet.

- [ ] **Step 5: Generate navigation and run GREEN tests**

Run:

```bash
rtk bun run world:generate:navigation
rtk bun run world:check:navigation
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts src/lib/game/content/maps.test.ts src/lib/game/core/area-map.test.ts tools/render-complete-world-layout-review.test.ts
rtk bun tools/render-complete-world-layout-review.ts --map blacksmith-interior
rtk bun run test:e2e -- --grep "Blacksmith graybox entrance"
```

Expected: all pass; proof inventory includes coordinate, raw/player collision, anchors, route widths,
and both camera views.

- [ ] **Step 6: Review and approve the coordinate gate**

Inspect original-resolution proofs for the 96px entrance-to-counter route, both 64px side loops,
Oren approach, collision containment, exit approach, and camera composition. Stop for controller
approval. Apply only coordinate corrections, regenerate navigation, and repeat Step 5 until approved.

- [ ] **Step 7: Commit the approved Blacksmith graybox**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds/village-interior-package.ts src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts src/lib/game/core/area-map.ts src/lib/game/core/area-map.test.ts src/lib/game/i18n/messages tools/validate-village-interior-art.ts tools/render-complete-world-layout-review.ts tools/render-complete-world-layout-review.test.ts tests/e2e/game.e2e.ts
git commit -m "feat(world): add blacksmith interior layout"
```

---

### Task 2: Add Oren, the Forge Shop, Story, and Save-v9 Migration

**Files:**

- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/dialogue.ts`
- Modify: `src/lib/game/content/shops.ts`
- Modify: `src/lib/game/story/browser-fixture.ts`
- Modify: `src/lib/game/i18n/messages/en.ts`
- Modify: `src/lib/game/i18n/messages/ja.ts`
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts`
- Modify: `story/manifest.yaml`
- Create: `story/beats/prologue/blacksmith-oren.md`
- Regenerate: `src-tauri/src/story/generated.rs`
- Regenerate: `story/reports/story-integration-report.md`
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `CLAUDE.md`
- Test: `src/lib/game/content/shops.test.ts`
- Test: `src/lib/game/content/dialogue.test.ts`
- Test: `src/lib/game/story/browser-fixture.test.ts`
- Test: `src/lib/game/save/save-state.test.ts`
- Test: `src/lib/game/save/storage.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `tests/e2e/complete-world-layout-journey.e2e.ts`
- Test: `tests/e2e/game.e2e.ts`

**Interfaces:**

- Produces: `shops['sundrop-forge']`, dialogue ID `blacksmith-oren`, and live Oren NPC.
- Produces: `SaveState.version: 9`, storage key `gliese.save.v9`, and deterministic v8 migration.
- Consumes: Task 1 layout approach `oren` and `blacksmithInteriorMap`.

- [ ] **Step 1: Write RED content and migration tests**

Assert the shop definition exactly:

```ts
expect(shops['sundrop-forge'].stock).toEqual([
	{ id: 'training-sword', itemId: 'training-sword', availability: { mode: 'finite', quantity: 1 } },
	{ id: 'iron-cap', itemId: 'iron-cap', availability: { mode: 'finite', quantity: 1 } },
	{ id: 'grip-wraps', itemId: 'grip-wraps', availability: { mode: 'finite', quantity: 1 } },
	{ id: 'traveler-vest', itemId: 'traveler-vest', availability: { mode: 'finite', quantity: 1 } }
]);
```

Add tests that Oren is at the approved layout point, his story choice opens `sundrop-forge`, and
an exact valid v8 payload becomes v9 while preserving its existing `guild-quartermaster` quantities
and adding forge quantities of `1`. Add rejection cases for malformed legacy shop IDs, stock IDs,
negative quantities, and quantities above legacy maxima.

- [ ] **Step 2: Run the focused tests and capture RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/shops.test.ts src/lib/game/content/dialogue.test.ts src/lib/game/story/browser-fixture.test.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: failures for missing Oren, forge, v9 schema, and migration.

- [ ] **Step 3: Add the merchant and shop through existing content paths**

Add `blacksmith-oren` to `NpcDialogueId` with one `shop` action targeting `sundrop-forge`. Wrap
`blacksmithInteriorMap` with the existing `addEnglishMapText` helper and add this NPC:

```ts
{
	id: 'blacksmith-oren',
	...blacksmithLayout.npcApproaches.oren.npc,
	nameKey: 'content.maps.npcs.blacksmith-oren.name',
	dialogueId: 'blacksmith-oren',
	role: 'shopkeeper',
	shopId: 'sundrop-forge',
	frameName: 'woodcutterNpc'
}
```

Add exact localized NPC and shop strings:

- English: `Sundrop Forge`, `Blacksmith Oren`,
  `Village-forged equipment for the road beyond Sundrop.`
- Japanese: `サンドロップ鍛冶場`, `鍛冶師オレン`,
  `サンドロップの外へ向かう旅人のための、村で鍛えた装備。`
- Traditional Chinese: `晴滴鍛造坊`, `鐵匠歐倫`,
  `為踏出晴滴村的旅人鍛造的實用裝備。`

- [ ] **Step 4: Add the minimal story beat**

Use the `gliese-story-writer` skill. Register `prologue.blacksmith-oren` and add
`blacksmith-interior`, `blacksmith-oren`, and `sundrop-forge` to required content. Author:

```md
# Blacksmith Oren

Oren keeps Sundrop supplied with practical field equipment.

::: story
id: prologue.blacksmith-oren
chapter: prologue
map: blacksmith-interior
primaryNpc: blacksmith-oren
:::

::: dialogue
npc: blacksmith-oren
branch: always
speaker: Blacksmith Oren
choices: shop
shop: sundrop-forge
:::

Steel holds when the hand behind it does. Take what fits, and keep it dry.
```

Mirror the same shop intent in the browser fixture, then run `rtk bun run story:check`.

- [ ] **Step 5: Implement the exact v8-to-v9 migration**

Set `SaveState.version` and new saves to `9`; append `migrateV8ToV9` after `migrateV7ToV8`.
Validate v8 stock against the frozen legacy shape—only `guild-quartermaster` with `iron-cap`,
`grip-wraps`, and `traveler-vest`, each integer `0..1`—before returning:

```ts
{
	...value,
	version: 9,
	shops: {
		...value.shops,
		stock: {
			...value.shops.stock,
			'sundrop-forge': { ...createInitialShopStockState()['sundrop-forge'] }
		}
	}
}
```

Set `SAVE_STORAGE_KEY = 'gliese.save.v9'` and `PREVIOUS_SAVE_STORAGE_KEY = 'gliese.save.v8'`.
Update version literals in `WorldScene.ts`, both E2E files, tests, and `CLAUDE.md`. Do not reset or
reconstruct any other save field.

- [ ] **Step 6: Run GREEN verification**

```bash
rtk bun run story:check:strict
rtk bun run test:unit -- --run src/lib/game/content/shops.test.ts src/lib/game/content/dialogue.test.ts src/lib/game/story/browser-fixture.test.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "Blacksmith Oren equipment shop"
rtk bun run check
```

The E2E enters from Meadow, opens Oren's dialogue/shop, buys an unowned item, checks wallet and
stock, saves, reloads, and confirms the purchase remains.

- [ ] **Step 7: Commit the functional Blacksmith slice**

```bash
git add CLAUDE.md src/lib/game/content src/lib/game/save src/lib/game/phaser/scenes src/lib/game/story story src-tauri/src/story/generated.rs tests/e2e
git commit -m "feat(world): open Sundrop Forge"
```

---

### Task 3: Redesign and Approve Villager House 3 Geometry

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Test: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Test: `src/lib/game/content/maps.test.ts`
- Modify/Test: `tools/render-complete-world-layout-review.ts`
- Test: `tools/render-complete-world-layout-review.test.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/villager-house-3/`

**Interfaces:**

- Produces: approved `32x22` House 3 layout and `villager-house-3-navigation`.
- Preserves: `villager-io`, `villager-house-3-neighbor`, transition IDs, and exterior return.

- [ ] **Step 1: Write RED layout, route, and actor contracts**

Assert `1024x704`, the program keys below, Io/neighbor anchors, 96px entrance/reading circulation,
64px archive/bedroom access, every prop sample reachable, navigation parity, and a structural
signature distinct from Houses 1 and 2. Add House 3 to live-character proof eligibility and assert
exact hero/Io/neighbor composition.

- [ ] **Step 2: Run focused tests and capture RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
rtk bun test tools/render-complete-world-layout-review.test.ts --test-name-pattern "Villager House 3"
```

Expected: old `20x20` dimensions and anchors fail.

- [ ] **Step 3: Replace House 3 with the approved coordinate program**

Use this exact wall program:

```ts
const villagerHouse3Walls: readonly NamedLayoutRect[] = [
	namedRect('villager-house-3-wall-north', 0, 0, 1024, 64),
	namedRect('villager-house-3-wall-west', 0, 64, 64, 608),
	namedRect('villager-house-3-wall-east', 960, 64, 64, 608),
	namedRect('villager-house-3-wall-south-west', 0, 672, 448, 32),
	namedRect('villager-house-3-wall-south-east', 576, 672, 448, 32),
	namedRect('villager-house-3-archive-divider-north', 416, 64, 32, 96),
	namedRect('villager-house-3-archive-divider-south', 416, 256, 32, 96),
	namedRect('villager-house-3-bedroom-divider-north', 576, 64, 32, 96),
	namedRect('villager-house-3-bedroom-divider-south', 576, 256, 32, 96),
	namedRect('villager-house-3-sitting-divider-west', 64, 352, 384, 32),
	namedRect('villager-house-3-sitting-divider-east', 576, 352, 384, 32)
];
```

```ts
fullFloor: rect(0, 0, 1024, 704),
rooms: {
	archiveStudy: rect(64, 64, 352, 288),
	bedroomStorage: rect(608, 64, 352, 288),
	sittingRoom: rect(64, 384, 896, 288)
},
corridors: { hall: rect(448, 64, 128, 320) },
doors: {
	archive: rect(416, 160, 32, 96),
	bedroom: rect(576, 160, 32, 96),
	hallToSitting: rect(448, 352, 128, 32),
	exterior: rect(448, 672, 128, 32)
},
walls: villagerHouse3Walls,
spawn: point(512, 576),
exit: point(512, 688),
npcApproaches: { io: { npc: point(256, 224), approach: point(304, 224) } },
ambientActivity: { 'villager-house-3-neighbor': point(768, 544) },
propZones: {
	westArchiveShelves: rect(96, 96, 128, 192),
	readingTable: rect(256, 416, 224, 128),
	bedroom: rect(672, 96, 160, 160),
	travelStorage: rect(832, 96, 96, 192),
	sitting: rect(608, 448, 224, 128)
},
propCollisions: {
	ioWestArchiveShelves: rect(112, 112, 96, 160),
	readingTable: rect(288, 448, 160, 64),
	bedroom: rect(688, 112, 128, 128),
	travelStorage: rect(848, 112, 64, 160),
	sitting: rect(640, 480, 160, 64)
}
```

Update the map props/anchors, use `interiorWallBlockers`, register its navigation source, and attach
the generated grid/owned-source contract.

- [ ] **Step 4: Generate, verify, render, and obtain layout approval**

```bash
rtk bun run world:generate:navigation
rtk bun run world:check:navigation
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-3
```

Inspect archive readability, Io approach, travel/storage identity, clear floors, route widths, and
both camera views. Stop for controller approval; repeat only coordinate corrections and verification.

- [ ] **Step 5: Commit approved House 3 geometry**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts tools/render-complete-world-layout-review.ts tools/render-complete-world-layout-review.test.ts
git commit -m "feat(world): approve scholar home layout"
```

---

### Task 4: Paint and Ship Villager House 3

**Files:**

- Create: `public/game/assets/interiors/villager-house-3/base.png`
- Create: `src/lib/game/content/backgrounds/manifests/villager-house-3.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.ts`
- Test: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Test: `src/lib/game/content/village-interior-assets.asset.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `src/lib/game/save/save-state.test.ts`
- Test: `tools/validate-village-interior-art.test.ts`
- Test: `tools/render-complete-world-layout-review.test.ts`
- Test: `tests/e2e/game.e2e.ts`

**Interfaces:**

- Produces: `villager-house-3-painted`, base descriptor
  `villager-house-3-painted-base-image`, and production default selection.

- [ ] **Step 1: Write RED package, asset, runtime, and E2E contracts**

Require one opaque `1024x704` RGB/RGBA base, manifest/grid parity `64x44`, complete static visual
ownership, atomic missing-base fallback, live Io/neighbor/hero, route/save/re-entry coverage, and
registry/package counts increased from five to six.

- [ ] **Step 2: Capture RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts
rtk bun test tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts --test-name-pattern "Villager House 3"
```

Expected: manifest/package/image/default are absent.

- [ ] **Step 3: Generate the approved base image**

Use the `imagegen` and `2d-game-asset-workflow` skills. Feed the approved coordinate/collision/live
actor proofs into built-in image generation. Prompt for a warm scholar/traveler home with archive
shelves, books/maps, reading table, sitting area, bed, travel trunks, layered light, and restrained
clutter; keep every approved walkable route visibly clear and include no actor or text.

Normalize the selected candidate to an opaque exact `1024x704` PNG at the path above. Compute its
SHA-256 with `shasum -a 256` and write that exact output into the manifest. Do not add foreground.

- [ ] **Step 4: Register and validate the package**

Add the manifest import, navigation lookup, `buildVillageInteriorPackage` call, package registry
entry, and production default. Run:

```bash
rtk bun tools/validate-village-interior-art.ts --map villager-house-3
rtk bun tools/render-complete-world-layout-review.ts --map villager-house-3
rtk bun run world:check:navigation
```

Inspect painted, collision, live-actor, anchors, and fallback images at original resolution. Reject
art with baked actors, blocked routes, collision/silhouette drift, matte seams, or overlay clutter.

- [ ] **Step 5: Prove runtime and obtain painted approval**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts
rtk bun test tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts --test-name-pattern "Villager House 3"
rtk bun run test:e2e -- --grep "Villager House 3 painted interior"
rtk bun run check
```

Stop for controller approval of painted and forced-fallback runtime screenshots.

- [ ] **Step 6: Verify LFS and commit**

```bash
git check-attr filter -- public/game/assets/interiors/villager-house-3/base.png
git add public/game/assets/interiors/villager-house-3 src/lib/game/content/backgrounds src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tools tests/e2e/game.e2e.ts
git show :public/game/assets/interiors/villager-house-3/base.png
git commit -m "feat(art): ship painted scholar home"
```

The staged image must be an LFS pointer whose oid matches the working PNG SHA-256.

---

### Task 5: Redesign and Approve Shrine Geometry

**Files:**

- Modify: `src/lib/game/content/maps/layouts/village-interiors-v2.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts`
- Regenerate: `src/lib/game/content/generated/navigation-grids.generated.ts`
- Test: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Test: `src/lib/game/content/maps.test.ts`
- Modify/Test: `tools/render-complete-world-layout-review.ts`
- Test: `tools/render-complete-world-layout-review.test.ts`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/shrine-of-aurora-interior/`

**Interfaces:**

- Produces: approved `32x28` Shrine layout and `shrine-of-aurora-interior-navigation`.
- Preserves: Shrine exterior, transition, return arrival, and no-NPC contract.

- [ ] **Step 1: Write RED layout and route contracts**

Assert `1024x896`, exact program keys, 96px nave/procession, 64px side-room access, altar/focal and
all prop samples reachable, empty NPC arrays, grid parity, and light-scroll camera coverage.

- [ ] **Step 2: Capture RED**

```bash
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
```

Expected: old `24x22` dimensions and service-pocket wall freeze fail.

- [ ] **Step 3: Replace the Shrine coordinate program**

Use this exact wall program:

```ts
const shrineOfAuroraWalls: readonly NamedLayoutRect[] = [
	namedRect('shrine-of-aurora-wall-north', 0, 0, 1024, 64),
	namedRect('shrine-of-aurora-wall-west', 0, 64, 64, 800),
	namedRect('shrine-of-aurora-wall-east', 960, 64, 64, 800),
	namedRect('shrine-of-aurora-wall-south-west', 0, 864, 448, 32),
	namedRect('shrine-of-aurora-wall-south-east', 576, 864, 448, 32),
	namedRect('shrine-of-aurora-sanctum-divider-west', 256, 288, 160, 32),
	namedRect('shrine-of-aurora-sanctum-divider-east', 608, 288, 160, 32),
	namedRect('shrine-of-aurora-west-room-divider-north', 256, 320, 64, 128),
	namedRect('shrine-of-aurora-west-room-divider-south', 256, 544, 64, 128),
	namedRect('shrine-of-aurora-east-room-divider-north', 704, 320, 64, 128),
	namedRect('shrine-of-aurora-east-room-divider-south', 704, 544, 64, 128),
	namedRect('shrine-of-aurora-nave-entrance-divider-west', 320, 672, 96, 32),
	namedRect('shrine-of-aurora-nave-entrance-divider-east', 608, 672, 96, 32)
];
```

```ts
fullFloor: rect(0, 0, 1024, 896),
rooms: {
	innerSanctum: rect(256, 64, 512, 224),
	westPreparation: rect(64, 320, 192, 352),
	eastArchive: rect(768, 320, 192, 352)
},
corridors: {
	nave: rect(320, 320, 384, 352),
	entranceHall: rect(320, 704, 384, 160)
},
doors: {
	sanctumOpening: rect(416, 288, 192, 32),
	westRoomOpening: rect(256, 448, 64, 96),
	eastRoomOpening: rect(704, 448, 64, 96),
	naveToEntrance: rect(416, 672, 192, 32),
	exterior: rect(448, 864, 128, 32)
},
walls: shrineOfAuroraWalls,
spawn: point(512, 784),
exit: point(512, 880),
npcApproaches: {},
propZones: {
	altar: rect(384, 96, 256, 128),
	luminousFocal: rect(448, 224, 128, 64),
	westBenches: rect(352, 384, 96, 224),
	eastBenches: rect(576, 384, 96, 224),
	preparation: rect(96, 384, 128, 192),
	archive: rect(800, 352, 128, 256),
	entranceLamps: rect(384, 736, 256, 96)
},
propCollisions: {
	altar: rect(416, 128, 192, 64),
	westBenches: rect(368, 400, 64, 192),
	eastBenches: rect(592, 400, 64, 192),
	preparation: rect(112, 400, 96, 160),
	archive: rect(816, 368, 96, 224)
}
```

The luminous focal and entrance lamps have no collision, leaving the 128px central nave clear.

Update fallback props, use `interiorWallBlockers`, register the navigation source, and attach the
generated grid/owned sources.

- [ ] **Step 4: Generate, verify, render, and obtain layout approval**

```bash
rtk bun run world:generate:navigation
rtk bun run world:check:navigation
rtk bun run test:unit -- --run src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps.test.ts
rtk bun tools/render-complete-world-layout-review.ts --map shrine-of-aurora-interior
```

Inspect procession, altar sightline, luminous hierarchy, both side rooms, collision containment,
exit route, and current-camera scroll. Stop for controller approval and repeat corrections as needed.

- [ ] **Step 5: Commit approved Shrine geometry**

```bash
git add src/lib/game/content/maps src/lib/game/content/backgrounds/village-interior-navigation-sources.ts src/lib/game/content/generated/navigation-grids.generated.ts tools/render-complete-world-layout-review.ts tools/render-complete-world-layout-review.test.ts
git commit -m "feat(world): approve Shrine interior layout"
```

---

### Task 6: Paint and Ship the Shrine of Aurora

**Files:**

- Create: `public/game/assets/interiors/shrine-of-aurora-interior/base.png`
- Create: `src/lib/game/content/backgrounds/manifests/shrine-of-aurora-interior.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.ts`
- Test: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Test: `src/lib/game/content/village-interior-assets.asset.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `src/lib/game/save/save-state.test.ts`
- Test: `tools/validate-village-interior-art.test.ts`
- Test: `tools/render-complete-world-layout-review.test.ts`
- Test: `tests/e2e/game.e2e.ts`

**Interfaces:**

- Produces: `shrine-of-aurora-interior-painted`, opaque `1024x896` base, production default.

- [ ] **Step 1: Write and run RED contracts**

Require manifest/grid parity `64x56`, opaque exact base, complete ownership, no actor package,
processional/side route coverage, save/re-entry, atomic fallback, and package count seven.

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts
rtk bun test tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts --test-name-pattern "Shrine"
```

- [ ] **Step 2: Generate and normalize the Shrine base**

Use `imagegen` and `2d-game-asset-workflow` with approved proofs. Prompt for luminous stone and
wood, a northern altar/focal glow, paired benches framing a clear nave, west preparation details,
east archive, rugs, lamps, and restrained devotional clutter. Include no people, text, or foreground.
Normalize to opaque `1024x896`, compute SHA-256, and write the exact manifest.

- [ ] **Step 3: Register, validate, and review**

Add package/default wiring, then run:

```bash
rtk bun tools/validate-village-interior-art.ts --map shrine-of-aurora-interior
rtk bun tools/render-complete-world-layout-review.ts --map shrine-of-aurora-interior
rtk bun run world:check:navigation
rtk bun run test:e2e -- --grep "Shrine of Aurora painted interior"
```

Inspect painted, collision, anchors, and fallback images; reject any blocked nave or inaccessible
visual pocket. Stop for painted runtime approval.

- [ ] **Step 4: Run GREEN tests, verify LFS, and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts
rtk bun run check
git check-attr filter -- public/game/assets/interiors/shrine-of-aurora-interior/base.png
git add public/game/assets/interiors/shrine-of-aurora-interior src/lib/game/content/backgrounds src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tools tests/e2e/game.e2e.ts
git show :public/game/assets/interiors/shrine-of-aurora-interior/base.png
git commit -m "feat(art): ship painted Shrine interior"
```

---

### Task 7: Paint and Ship the Functional Blacksmith

**Files:**

- Create: `public/game/assets/interiors/blacksmith-interior/base.png`
- Create: `src/lib/game/content/backgrounds/manifests/blacksmith-interior.json`
- Modify: `src/lib/game/content/backgrounds/village-interior-packages.ts`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.ts`
- Test: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Test: `src/lib/game/content/village-interior-assets.asset.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `src/lib/game/save/save-state.test.ts`
- Test: `tools/validate-village-interior-art.test.ts`
- Test: `tools/render-complete-world-layout-review.test.ts`
- Test: `tests/e2e/game.e2e.ts`

**Interfaces:**

- Produces: `blacksmith-interior-painted`, opaque `896x704` base, production default.
- Consumes: approved Task 1 geometry and live Oren/shop from Task 2.

- [ ] **Step 1: Write and run RED package/runtime contracts**

Require manifest/grid parity `56x44`, exact opaque base, complete ownership, live hero/Oren
composition, Oren/shop interaction, forge/armory/storage routes, save/re-entry, missing-base fallback,
and final package count eight.

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts
rtk bun test tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts --test-name-pattern "Blacksmith"
```

- [ ] **Step 2: Generate and normalize the Blacksmith base**

Use `imagegen` and `2d-game-asset-workflow` with coordinate, collision, and live-actor proofs.
Prompt for a soot-dark timber/stone smithy with warm forge glow, anvil and quench area west, central
counter, weapon/armor display east, coal/material storage, worn floor, and small metallic clutter.
Keep every route visibly open and include no people, text, grass, or exterior scenery. Normalize to
opaque `896x704`, compute SHA-256, and write the exact manifest. Add no foreground.

- [ ] **Step 3: Register, validate, and review**

Add package/default wiring, then run:

```bash
rtk bun tools/validate-village-interior-art.ts --map blacksmith-interior
rtk bun tools/render-complete-world-layout-review.ts --map blacksmith-interior
rtk bun run world:check:navigation
rtk bun run test:e2e -- --grep "Blacksmith painted interior"
```

Inspect base, collision, live actor, anchors, and fallback at original resolution. Verify Oren is not
baked, counter/forge silhouettes match collision, and the shop remains reachable. Stop for painted
runtime approval.

- [ ] **Step 4: Run GREEN tests, verify LFS, and commit**

```bash
rtk bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts
rtk bun run check
git check-attr filter -- public/game/assets/interiors/blacksmith-interior/base.png
git add public/game/assets/interiors/blacksmith-interior src/lib/game/content/backgrounds src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tools tests/e2e/game.e2e.ts
git show :public/game/assets/interiors/blacksmith-interior/base.png
git commit -m "feat(art): ship painted Sundrop Forge"
```

---

### Task 8: Close the All-Eight Regression and Runtime Gate

**Files:**

- Modify: `src/lib/game/content/maps/layouts/layouts.test.ts`
- Modify: `src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/core/area-map.test.ts`
- Modify: `src/lib/game/content/backgrounds/map-background-registry.test.ts`
- Modify: `src/lib/game/content/village-interior-assets.asset.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `tests/e2e/complete-world-layout-journey.e2e.ts`
- Modify: `tests/e2e/game.e2e.ts`
- Create: `docs/superpowers/reports/2026-08-29-complete-eight-village-interiors-runtime-review.md`
- Create/update evidence: `docs/superpowers/reports/img/hpa-586-interiors/final/`

**Interfaces:**

- Produces: one data-driven eight-interior contract matrix and one real-browser completion route.
- Confirms: 11 complete-world maps, eight packages/defaults, three distinct villager-home
  signatures, v8-to-v9 migration, and no per-map camera zoom.

- [ ] **Step 1: Write the all-eight matrix**

For each interior assert approved dimensions/program keys, current 16px grid, reachable spawn/exit,
doors/zones/NPC approaches/ambient anchors, clearance, exact image/manifest/grid parity, one package
and default, complete static ownership, live stateful content, fallback geometry parity, and current
camera behavior. Assert all eight manifests validate and the only base-only packages are those whose
approved design needs no foreground.

- [ ] **Step 2: Write the all-eight E2E walkthrough**

Add one test named `all eight painted village interiors`. For each map, enter from Meadow, traverse
required zones/interactions, open shops where present, exit/re-enter, save/reload, capture painted
evidence, intercept one required texture, reload, assert zero selected painted images, and repeat the
critical route in fallback. Verify Oren stock persists across the Blacksmith save cycle.

- [ ] **Step 3: Run the focused completion gate**

```bash
rtk bun run story:check:strict
rtk bun run world:check:navigation
rtk bun run art:validate:village-interiors
rtk bun test tools/generate-navigation-runtime.test.ts tools/validate-village-interior-art.test.ts tools/render-complete-world-layout-review.test.ts
rtk bun run test:unit -- --run src/lib/game/core/navigation.test.ts src/lib/game/core/shop.test.ts src/lib/game/core/area-map.test.ts src/lib/game/content/maps/navigation.test.ts src/lib/game/content/backgrounds/village-interior-package.test.ts src/lib/game/content/backgrounds/map-background-package.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts src/lib/game/content/maps.test.ts src/lib/game/content/shops.test.ts src/lib/game/content/dialogue.test.ts src/lib/game/story/browser-fixture.test.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts src/lib/game/phaser/scenes/scenes.test.ts
rtk bun run test:e2e -- --grep "all eight painted village interiors"
rtk bun run check
rtk bun run lint
rtk bun run build
rtk proxy git diff --check
```

- [ ] **Step 4: Capture and obtain final runtime approval**

The report records painted/fallback/current-camera screenshots for all eight, every live NPC/shop
interaction, representative navigation overlays, exit/re-entry, save/reload, exact hashes, and any
resource-sensitive aggregate behavior. Stop for final controller approval.

- [ ] **Step 5: Run aggregate suites serially**

```bash
rtk bun run test:unit -- --run --maxWorkers=1
rtk bun run test:e2e -- --workers=1
```

Record exact file/test counts and durations. A resource timeout is reported separately and its
isolated test rerun is recorded; it is never silently treated as a pass.

- [ ] **Step 6: Verify every PNG is an LFS pointer and commit the final matrix**

```bash
git check-attr filter -- public/game/assets/interiors/*/*.png
git lfs ls-files
git status --short
git add src/lib/game/content/maps/layouts/layouts.test.ts src/lib/game/content/maps/layouts/complete-world-layout-foundation.test.ts src/lib/game/content/maps.test.ts src/lib/game/core/area-map.test.ts src/lib/game/content/backgrounds/map-background-registry.test.ts src/lib/game/content/village-interior-assets.asset.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/save/save-state.test.ts tests/e2e/complete-world-layout-journey.e2e.ts tests/e2e/game.e2e.ts docs/superpowers/reports/2026-08-29-complete-eight-village-interiors-runtime-review.md docs/superpowers/reports/img/hpa-586-interiors/final
git diff --cached --name-only
git diff --cached --check
git commit -m "test(world): prove all eight painted interiors"
```

After commit, require a clean worktree. Preserve the branch/worktree; do not merge or push.
