# HPA-400 Guild Hall Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compact one-room Guild Hall with a 24×18 explorable headquarters while preserving its story, shop, transition, and save behavior.

**Architecture:** Keep `guild-hall` as a direct `WorldMapDefinition`. Reuse existing interior props and collision to create readable connected zones, update only the village-side interior arrival that depends on the moved entrance, and extend existing save normalization to reject positions embedded in collidable interior props. Do not add a new interior source model, renderer contract, background package, or compatibility layer.

**Tech Stack:** TypeScript, Svelte 5 + Vite, Phaser, Vitest, Playwright, Tauri.

## Global Constraints

- Keep `guild-hall` authored directly in `src/lib/game/content/maps.ts`.
- Target a 24×18 Guild Hall with entry transition `{ x: 384, y: 528 }` and spawn/inbound arrival `{ x: 384, y: 480, facing: 'up' }`.
- Preserve `guild-master`, `guild-quartermaster`, their dialogue IDs, shop `guild-quartermaster`, `guild-hall-to-meadow`, `meadow-to-guild-hall`, and exterior return `{ x: 1656, y: 5040, facing: 'down' }`.
- Preserve NPC identity fields (`id`, `dialogueId`, `role`, `shopId`, `frameName`) while intentionally updating Guild Hall NPC `x`/`y` coordinates.
- Keep story prose, quest definitions, and shop inventory unchanged.
- Reuse the existing `interiorPropAsset`; do not add art or backgrounds in this delivery.
- Do not add `LayeredInteriorSource`, a compiler, room graph, interior framework, or separate interior skill.
- Do not bump the save version or keep old 16×12 coordinate compatibility data.
- Only edit `village-layered.ts` for the Guild Hall transition's new interior arrival; do not redesign the exterior.
- Ambient NPCs remain presentation-only; do not invent collision semantics for them.
- Any reusable HPA-495 guidance change must be justified by a concrete implementation failure, not by prediction.

---

### Task 1: Normalize loaded positions against collidable interior props

**Files:**
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`

**Interfaces:**
- Consumes: `WorldMapDefinition['interiorProps']`, existing `normalizePlayerPosition(...)`, `isInsideAnyCollisionRect(...)`, `PLAYER_COLLISION_RADIUS`.
- Produces: loaded saves on any map are moved out of collidable interior props using the same nearest-walkable-tile machinery already used for other invalid positions.

- [ ] **Step 1: Add a failing save-normalization test**

In `src/lib/game/save/save-state.test.ts`, add a focused test that chooses any collidable Guild Hall prop rather than depending on a specific prop ID, serializes a valid save at that collision center, parses it, and asserts the normalized player is outside every collidable Guild Hall prop with player-radius padding.

Use this shape, adapting only existing imports in the file:

```ts
it('normalizes loaded guild hall positions out of interior prop collision', () => {
	const collision = guildHallMap.interiorProps?.find((prop) => prop.collision)?.collision;
	expect(collision).toBeDefined();

	const save = createNewSaveState();
	save.mapId = guildHallMap.id;
	save.player = {
		...save.player,
		x: collision!.x,
		y: collision!.y
	};

	const parsed = parseSaveState(serializeSaveState(save));
	expect(parsed).not.toBeNull();

	const interiorCollisions = (guildHallMap.interiorProps ?? []).flatMap((prop) =>
		prop.collision ? [prop.collision] : []
	);
	expect(
		isInsideAnyCollisionRect(
			parsed!.player.x,
			parsed!.player.y,
			interiorCollisions,
			PLAYER_COLLISION_RADIUS
		)
	).toBe(false);
});
```

Import `guildHallMap` and `PLAYER_COLLISION_RADIUS` only if they are not already imported.

- [ ] **Step 2: Run the focused test and verify the current behavior fails**

Run:

```bash
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected before the fix: the new test fails because `normalizePlayerPosition(...)` does not include `interiorProps[].collision` in its normalization rectangles.

- [ ] **Step 3: Add the smallest generic normalization helper**

In `src/lib/game/save/save-state.ts`, keep `collectStrictCollisionRects(...)` semantically unchanged because interior props use escape-aware runtime collision rather than strict collision. Add a private helper next to the existing collision collectors:

```ts
function collectInteriorPropCollisionRects(map: WorldMapDefinition): CollisionRect[] {
	return (map.interiorProps ?? []).flatMap((prop) => (prop.collision ? [prop.collision] : []));
}
```

Then change the normalization set to:

```ts
const collisionRects = [
	...collectStrictCollisionRects(map),
	...collectInteriorPropCollisionRects(map),
	...collectLandmarkRects(map)
];
```

Update the existing `normalizePlayerPosition(...)` comment block as well as the nearby collector comment so they explicitly state:

- blockers, fences, and collidable map decor are strict movement collision;
- landmarks and collidable interior props are escape-aware at runtime but are still invalid loaded positions because they visually embed the player in opaque geometry.

Do not change `SaveState.version`, migrations, or storage keys.

- [ ] **Step 4: Run the save-state tests again**

Run:

```bash
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected: PASS, including the new interior-prop normalization case.

- [ ] **Step 5: Commit the isolated runtime correction**

```bash
git add src/lib/game/save/save-state.ts src/lib/game/save/save-state.test.ts
git commit -m "fix(save): normalize interior prop positions"
```

---

### Task 2: Re-author the Guild Hall and update its real coordinate consumers

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.ts`
- Modify: `src/lib/game/content/maps.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `tests/e2e/game.e2e.ts`

**Interfaces:**
- Consumes: existing `WorldMapDefinition`, `interiorPropAsset` frame names, the existing main-NPC and ambient-NPC IDs, village transition compiler, scene behavior tests, and Guild quest E2E fixture.
- Produces: a 24×18 `guildHallMap` with five readable connected functions, synchronized exterior/interior arrival, and behavior tests that no longer depend on removed 16×12 coordinates.

- [ ] **Step 1: Write the failing Guild Hall shape, compact-interior split, seam, and identity assertions**

In `src/lib/game/content/maps.test.ts`, replace the blanket “all compact village interiors are 16×12” assertion with two explicit contracts:

```ts
const compactInteriors = [
	heroHouseMap,
	itemShopMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map,
	shrineOfAuroraInteriorMap
];

for (const map of compactInteriors) {
	expect(map.width).toBe(16);
	expect(map.height).toBe(12);
	expect(map.transitions).toHaveLength(1);
	expect(map.transitions[0].toMapId).toBe('meadow-entry');
}

expect(maps['guild-hall']).toBe(guildHallMap);
expect(guildHallMap.width).toBe(24);
expect(guildHallMap.height).toBe(18);
expect(guildHallMap.spawnDirection).toBe('up');
expect(guildHallMap.spawn).toEqual({ x: 384, y: 480 });
expect(guildHallMap.transitions[0]).toMatchObject({
	id: 'guild-hall-to-meadow',
	x: 384,
	y: 528,
	toMapId: 'meadow-entry',
	arrival: { x: 1656, y: 5040, facing: 'down' }
});

const inbound = meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-guild-hall');
expect(inbound?.arrival).toEqual({ x: 384, y: 480, facing: 'up' });
```

Update the existing Guild Hall NPC expectation to preserve identity/behavior fields while changing only the intended placement:

```ts
expect(guildHallMap.npcs).toMatchObject([
	{
		id: 'guild-master',
		x: 176,
		y: 176,
		nameKey: 'content.maps.npcs.guild-master.name',
		dialogueId: 'guild-master',
		role: 'guild',
		frameName: 'guildMasterNpc'
	},
	{
		id: 'guild-quartermaster',
		x: 592,
		y: 176,
		nameKey: 'content.maps.npcs.guild-quartermaster.name',
		dialogueId: 'guild-quartermaster',
		role: 'shopkeeper',
		frameName: 'quartermasterNpc',
		shopId: 'guild-quartermaster'
	}
]);
```

- [ ] **Step 2: Add a test-only route sampler using a pre-checked baseline**

Keep reachability validation local to `maps.test.ts`; do not add a runtime graph abstraction. Add a helper that accepts axis-aligned waypoints, samples every 16 px, and reuses `expectPointClearOfInteriorPropCollisions(...)`.

```ts
function expectInteriorRouteClear(
	map: WorldMapDefinition,
	waypoints: Array<{ x: number; y: number }>,
	label: string
) {
	for (let index = 1; index < waypoints.length; index += 1) {
		const from = waypoints[index - 1]!;
		const to = waypoints[index]!;
		expect(from.x === to.x || from.y === to.y, `${label} must be axis-aligned`).toBe(true);

		const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
		const steps = Math.max(1, Math.ceil(distance / 16));
		for (let step = 0; step <= steps; step += 1) {
			const ratio = step / steps;
			expectPointClearOfInteriorPropCollisions(
				map,
				{
					x: from.x + (to.x - from.x) * ratio,
					y: from.y + (to.y - from.y) * ratio
				},
				label
			);
		}
	}
}
```

Use these routes. They are chosen to clear the published prop rectangles rather than crossing the common table/bench:

```ts
const entrance = { x: 384, y: 480 };
const hub = { x: 384, y: 384 };
const guildMasterApproach = { x: 208, y: 176 };
const quartermasterApproach = { x: 560, y: 176 };

expectInteriorRouteClear(guildHallMap, [entrance, hub], 'entrance-to-hub');
expectInteriorRouteClear(
	guildHallMap,
	[
		hub,
		{ x: 192, y: 384 },
		{ x: 192, y: 208 },
		{ x: 208, y: 208 },
		guildMasterApproach
	],
	'hub-to-guild-master'
);
expectInteriorRouteClear(guildHallMap, [hub, { x: 384, y: 208 }], 'hub-to-records');
expectInteriorRouteClear(
	guildHallMap,
	[hub, { x: 560, y: 384 }, quartermasterApproach],
	'hub-to-quartermaster'
);
```

Then assert the two approach points:

```ts
const guildMaster = guildHallMap.npcs!.find((npc) => npc.id === 'guild-master')!;
const quartermaster = guildHallMap.npcs!.find((npc) => npc.id === 'guild-quartermaster')!;

expect(Math.hypot(guildMasterApproach.x - guildMaster.x, guildMasterApproach.y - guildMaster.y)).toBeLessThanOrEqual(36);
expect(Math.hypot(quartermasterApproach.x - quartermaster.x, quartermasterApproach.y - quartermaster.y)).toBeLessThanOrEqual(36);
expectPointClearOfInteriorPropCollisions(guildHallMap, guildMasterApproach, 'guild-master-approach');
expectPointClearOfInteriorPropCollisions(guildHallMap, quartermasterApproach, 'quartermaster-approach');
```

The 36 px assertion is deliberately stricter than the runtime interaction threshold of `PLAYER_COLLISION_RADIUS + npcInteractionRadius = 48` px. Both planned approaches are 32 px from their NPCs and remain outside the NPC-pack body collision radius (`PLAYER_COLLISION_RADIUS + npcPackCollisionRadius = 29` px).

Do **not** add collision assertions for `ambientNpcs`: `WorldScene` renders them as ambient sprites and movement collision iterates `map.npcs`, not `map.ambientNpcs`.

- [ ] **Step 3: Run the focused map test and verify it fails on the old room**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected before the map rewrite: the 24×18 dimension, entry/spawn, inbound arrival, NPC placement, and new route assertions fail.

- [ ] **Step 4: Replace only the Guild Hall direct-map data with the pre-checked placement baseline**

In `src/lib/game/content/maps.ts`, leave the shared `interiorDoor` constant in place for the other compact interiors. Give Guild Hall its own larger entry coordinates instead of changing the shared constant.

Set:

```ts
width: 24,
height: 18,
spawnDirection: 'up',
spawn: { x: 384, y: 480 },
```

and its outbound transition anchor to:

```ts
x: 384,
y: 528,
```

while keeping `id: 'guild-hall-to-meadow'`, `toMapId: openingMapId`, and exterior arrival `{ x: 1656, y: 5040, facing: 'down' }`.

Use this placement baseline:

| Purpose | ID | Position | Frame / collision |
| --- | --- | ---: | --- |
| Guild Master | `guild-master` | 176,176 | Preserve current identity/dialogue/role/frame fields |
| Quartermaster | `guild-quartermaster` | 592,176 | Preserve identity/dialogue/role/frame/`shopId` fields |
| Reception board | `guild-hall-notice-board` | 240,432 | `noticeBoard`, 112×72; collision 240,432,96×34 |
| Reception bench | `guild-hall-east-bench` | 528,432 | `bench`, 96×34; collision 528,432,86×26 |
| Common rug | `guild-hall-common-rug` | 256,304 | `rug`, 192×112, `depth: 'floor'`, no collision; intentionally underneath common table |
| Common table | `guild-hall-common-table` | 256,304 | `table`, 96×54; collision 256,304,88×44 |
| Common bench | `guild-hall-west-bench` | 256,352 | `bench`, 96×34; collision 256,352,86×26 |
| Master bookshelf | `guild-hall-master-bookshelf` | 80,96 | `bookshelf`, 64×96; collision 80,96,56×86 |
| Master records | `guild-hall-records` | 240,96 | `papers`, 52×64; collision 240,96,42×44 |
| Records shelf | `guild-hall-records-shelf` | 352,96 | `bookshelf`, 64×96; collision 352,96,56×86 |
| Training rack | `guild-hall-weapon-rack` | 480,96 | `weaponRack`, 56×86; collision 480,96,44×72 |
| Quartermaster counter | `guild-hall-quartermaster-counter` | 656,176 | `shopCounter`, 128×58; collision 672,176,96×48 so the west customer approach stays open |
| Quartermaster crates | `guild-hall-quartermaster-crates` | 688,272 | `crateStack`, 58×58; collision 688,272,48×48 |
| Ambient west member | `guild-hall-member-west` | 288,416 | Preserve frame/role; presentation-only |
| Ambient east member | `guild-hall-member-east` | 512,336 | Preserve frame/role; presentation-only |

The published route intentionally branches at `y = 384`, not `y = 320`: that keeps the west/east corridor south of the common table and bench. The west branch uses `x = 192` until `y = 208` before moving to the Guild Master approach, keeping the route clear of both common-area props and the Guild Master's NPC body. The east branch uses `x = 560`, which stays west of the Quartermaster counter and 32 px from the Quartermaster at its final approach.

Delete superseded Guild Hall prop literals that are not part of this table rather than keeping duplicate old-room furniture. Keep `x = 384` open from the entrance through the north-center junction.

Do not add `blockers` merely to simulate interior walls. Do not add backgrounds.

- [ ] **Step 5: Update the owning village transition arrival**

In `src/lib/game/content/maps/regions/village-layered.ts`, find `meadow-to-guild-hall` and change only its `arrival` to:

```ts
arrival: { x: 384, y: 480, facing: 'up' }
```

Keep its exterior `col`, `row`, ID, target map, and marker behavior unchanged.

- [ ] **Step 6: Update scene tests that consume Guild Hall coordinates**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update every test that creates `guild-hall` and depends on the old `(192,144)` Guild Master or `(352,144)` Quartermaster positions.

First, update the render assertion to the new data positions:

```ts
expect(scene.add.image).toHaveBeenCalledWith(176, 176, 'npc-pack', 'guildMasterNpc');
expect(scene.add.image).toHaveBeenCalledWith(592, 176, 'npc-pack', 'quartermasterNpc');
```

For dialogue, quest, and shop tests, use the explicit valid approach points rather than standing inside the NPC body:

```ts
const guildMasterApproach = { x: 208, y: 176 };
const quartermasterApproach = { x: 560, y: 176 };
```

Use `guildMasterApproach` wherever a Guild Hall test needs `findNearbyNpc()` to resolve `guild-master`, including briefing, side-quest, and stale-out-of-range setup. Use `quartermasterApproach` for Quartermaster dialogue/shop setup.

For the existing generic NPC-body movement tests that use the Quartermaster as their fixture, preserve their relative offsets around the new Quartermaster position `{ x: 592, y: 176 }`:

```text
old 352,185  → new 592,217  (41 px south; move toward NPC)
old 316,180  → new 556,212  (36 px west/south; diagonal slide case)
old 352,150  → new 592,182  (6 px south; move away from overlap)
old 352,174  → new 592,206  (30 px south; fast-movement tunneling case)
```

Use a repository search before finishing this step so no old Guild Hall fixture remains accidentally:

```bash
rg -n "guild-hall|192, y: 144|352, y: 144" src/lib/game/phaser/scenes/scenes.test.ts
```

Do not rewrite unrelated item-shop or villager fixtures that happen to use similar numbers.

- [ ] **Step 7: Update the Guild quest E2E fixture**

In `tests/e2e/game.e2e.ts`, update only the `quest log shows main quest and accepts Guild side quests` save fixture from the removed Guild Master coordinate to the new approach point:

```ts
player: { level: 1, xp: 0, hp: 20, attack: 3, x: 208, y: 176, facing: 'up' }
```

Keep the existing E2E flow unchanged: resume the save, verify Guild Master proximity, interact, and exercise the quest log / side-quest behavior.

- [ ] **Step 8: Run focused map, save, scene, and Guild E2E tests**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run test:e2e -- --grep "quest log shows main quest and accepts Guild side quests"
```

Expected: PASS. If a route test fails, fix the conflicting Guild Hall prop coordinate while keeping the published zone model; do not weaken the route assertion or add a new collision abstraction.

- [ ] **Step 9: Verify story and registry semantics without editing those registries**

Run:

```bash
bun run story:check
bun run test:unit -- --run src/lib/game/content/shops.test.ts
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
bun run test:unit -- --run src/lib/game/content/quests.test.ts
```

Expected: PASS with no changes required to story, shops, dialogue, or quests.

- [ ] **Step 10: Commit the player-facing vertical slice and its coordinate consumers**

```bash
git add \
  src/lib/game/content/maps.ts \
  src/lib/game/content/maps/regions/village-layered.ts \
  src/lib/game/content/maps.test.ts \
  src/lib/game/phaser/scenes/scenes.test.ts \
  tests/e2e/game.e2e.ts
git commit -m "feat(hpa-400): expand Guild Hall headquarters"
```

---

## Final verification

- [ ] Run the focused behavioral set once more after both commits:

```bash
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run test:unit -- --run src/lib/game/content/shops.test.ts
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
bun run test:unit -- --run src/lib/game/content/quests.test.ts
bun run test:e2e -- --grep "quest log shows main quest and accepts Guild side quests"
bun run story:check
```

- [ ] Run repository-wide TypeScript/unit verification so another hardcoded Guild Hall coordinate cannot remain hidden in a different unit test:

```bash
bun run check
bun run lint
bun run test:unit -- --run
bun run build
bun run build:tauri
```

- [ ] Run the controller walkthrough from the brief in a normal web session:
  1. Village → Guild Hall entry.
  2. Reception.
  3. Common area.
  4. Guild Master dialogue/quest action.
  5. Records/training area.
  6. Quartermaster shop open/close.
  7. Guild Hall → Village return.
  8. Representative save/reload inside the Guild Hall.

- [ ] Repeat the same happy path in a packaged Tauri run.

- [ ] Inspect the actual implementation for an HPA-495 guidance gap. If the current skill correctly led to direct-map authoring and no unnecessary workflow, record that fact in the implementation PR description and do not edit the skill.

- [ ] Confirm the final diff contains no new interior framework, background package, story prose, ambient-NPC collision behavior, or unrelated village redesign.

## Expected implementation PR shape

Prefer one implementation PR containing the two commits above:

1. `fix(save): normalize interior prop positions`
2. `feat(hpa-400): expand Guild Hall headquarters`

The second commit includes the direct-map content, village arrival seam, scene coordinate consumers, and the one Guild quest E2E fixture because those all move atomically with the new Guild Hall layout.

The implementation PR should summarize the concrete HPA-495 field validation: direct-map routing was correct, existing prop art was sufficient, and the only reusable code gap discovered was loaded-position normalization for collidable interior furniture.