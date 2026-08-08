# HPA-400 Guild Hall Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compact one-room Guild Hall with a 24×18 explorable headquarters while preserving its story, shop, transition, and save behavior.

**Architecture:** Keep `guild-hall` as a direct `WorldMapDefinition`. Reuse existing interior props and collision to create readable connected zones, update only the village-side interior arrival that depends on the moved entrance, and extend existing save normalization to reject positions embedded in collidable interior props. Do not add a new interior source model, renderer contract, background package, or compatibility layer.

**Tech Stack:** TypeScript, SvelteKit game content, Phaser, Vitest, Tauri.

## Global Constraints

- Keep `guild-hall` authored directly in `src/lib/game/content/maps.ts`.
- Target a 24×18 Guild Hall with entry transition `{ x: 384, y: 528 }` and spawn/inbound arrival `{ x: 384, y: 480, facing: 'up' }`.
- Preserve `guild-master`, `guild-quartermaster`, their dialogue IDs, shop `guild-quartermaster`, `guild-hall-to-meadow`, `meadow-to-guild-hall`, and exterior return `{ x: 1656, y: 5040, facing: 'down' }`.
- Keep story prose, quest definitions, and shop inventory unchanged.
- Reuse the existing `interiorPropAsset`; do not add art or backgrounds in this delivery.
- Do not add `LayeredInteriorSource`, a compiler, room graph, interior framework, or separate interior skill.
- Do not bump the save version or keep old 16×12 coordinate compatibility data.
- Only edit `village-layered.ts` for the Guild Hall transition's new interior arrival; do not redesign the exterior.
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

Update the nearby comments so they explicitly state that escape-aware landmarks and interior props are included to prevent loaded visual embedding, even though movement outward would otherwise be possible.

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

### Task 2: Re-author the Guild Hall as the direct-map vertical slice

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps/regions/village-layered.ts`
- Modify: `src/lib/game/content/maps.test.ts`

**Interfaces:**
- Consumes: existing `WorldMapDefinition`, `interiorPropAsset` frame names, the existing main-NPC and ambient-NPC IDs, and the village transition compiler.
- Produces: a 24×18 `guildHallMap` with five readable connected functions and a synchronized village-to-interior arrival.

- [ ] **Step 1: Write the failing Guild Hall shape and seam assertions**

In `src/lib/game/content/maps.test.ts`, update the tests whose wording currently assumes every village interior is compact, then add a focused HPA-400 test with these exact structural expectations:

```ts
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

Also preserve the existing assertions for the two main NPC IDs and shop/dialogue bindings.

- [ ] **Step 2: Add a small test-only route sampler**

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

Use it to prove the intended circulation rather than trying to certify every pixel:

```ts
expectInteriorRouteClear(guildHallMap, [{ x: 384, y: 480 }, { x: 384, y: 320 }], 'entrance-to-hub');
expectInteriorRouteClear(
	guildHallMap,
	[{ x: 384, y: 320 }, { x: 208, y: 320 }, { x: 208, y: 176 }],
	'hub-to-guild-master'
);
expectInteriorRouteClear(guildHallMap, [{ x: 384, y: 320 }, { x: 384, y: 208 }], 'hub-to-records');
expectInteriorRouteClear(
	guildHallMap,
	[{ x: 384, y: 320 }, { x: 560, y: 320 }, { x: 560, y: 176 }],
	'hub-to-quartermaster'
);
```

Assert the interaction approach points `{ x: 208, y: 176 }` and `{ x: 560, y: 176 }` are no more than 36 px from `guild-master` and `guild-quartermaster` respectively and are not inside prop collision.

- [ ] **Step 3: Run the focused map test and verify it fails on the old 16×12 room**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected before the map rewrite: the 24×18 dimension, entry/spawn, inbound arrival, and new route assertions fail.

- [ ] **Step 4: Replace only the Guild Hall direct-map data**

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

Use this concrete placement baseline. Small coordinate adjustments are allowed only to satisfy the route/interaction assertions without changing the 24×18 zone model.

| Purpose | ID / item | Position | Notes |
| --- | --- | ---: | --- |
| Guild Master | `guild-master` | 176,176 | Preserve all dialogue/role/frame fields |
| Quartermaster | `guild-quartermaster` | 592,176 | Preserve dialogue, role, frame, `shopId` |
| Reception board | `guild-hall-notice-board` | 240,432 | Existing notice-board frame; keep approach open |
| Reception bench | `guild-hall-east-bench` | 528,432 | Reuse bench frame/collision |
| Common rug | new/reused Guild Hall rug ID | 256,304 | `rug`, floor depth, no collision |
| Common table | `guild-hall-west-desk` or a clearer replacement ID | 256,304 | `table`; collision stays west of central spine |
| Common bench | `guild-hall-west-bench` | 256,352 | Keep meeting area off main spine |
| Master bookshelf | new/reused Guild Hall bookshelf ID | 80,96 | `bookshelf` with collision |
| Master records | `guild-hall-records` | 240,96 | `papers` with collision |
| Records shelf | new Guild Hall records-shelf ID | 352,96 | `bookshelf` with collision |
| Training rack | `guild-hall-weapon-rack` | 480,96 | Existing weapon-rack frame/collision |
| Quartermaster counter | `guild-hall-east-desk` or clearer replacement ID | 656,176 | Prefer `shopCounter`; shift collision right so the NPC approach at x=560 stays clear |
| Quartermaster crates | new/reused Guild Hall crate ID | 688,272 | Existing `crateStack` frame/collision |
| Ambient west member | `guild-hall-member-west` | 288,416 | Preserve ID/role; keep central spine clear |
| Ambient east member | `guild-hall-member-east` | 512,336 | Preserve ID/role; keep NPC approaches clear |

Keep `x = 384` mostly open from the entrance to the north-center junction. The purpose of the table is functional zoning, not exact visual micromanagement; route tests and in-game readability are the deciding constraints.

Do not add `blockers` merely to simulate interior walls. Do not add backgrounds.

- [ ] **Step 5: Update the owning village transition arrival**

In `src/lib/game/content/maps/regions/village-layered.ts`, find `meadow-to-guild-hall` and change only its `arrival` to:

```ts
arrival: { x: 384, y: 480, facing: 'up' }
```

Keep its exterior `col`, `row`, ID, target map, and marker behavior unchanged.

- [ ] **Step 6: Run focused map and save tests**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected: PASS. If a route fails, move the offending Guild Hall prop rather than adding a new collision or room abstraction.

- [ ] **Step 7: Verify story and shop semantics without editing those registries**

Run:

```bash
bun run story:check
bun run test:unit -- --run src/lib/game/content/shops.test.ts
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
bun run test:unit -- --run src/lib/game/content/quests.test.ts
```

Expected: PASS with no changes required to story, shops, dialogue, or quests.

- [ ] **Step 8: Commit the player-facing vertical slice**

```bash
git add src/lib/game/content/maps.ts src/lib/game/content/maps/regions/village-layered.ts src/lib/game/content/maps.test.ts
git commit -m "feat(hpa-400): expand Guild Hall headquarters"
```

---

## Final verification

- [ ] Run repository checks:

```bash
bun run check
bun run lint
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

- [ ] Confirm the final diff contains no new interior framework, background package, story prose, or unrelated village redesign.

## Expected implementation PR shape

Prefer one implementation PR containing the two commits above:

1. `fix(save): normalize interior prop positions`
2. `feat(hpa-400): expand Guild Hall headquarters`

The implementation PR should summarize the concrete HPA-495 field validation: direct-map routing was correct, existing prop art was sufficient, and the only reusable code gap discovered was loaded-position normalization for collidable interior furniture.
