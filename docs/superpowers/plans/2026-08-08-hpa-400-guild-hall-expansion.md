# HPA-400 Guild Hall Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compact one-room Guild Hall with a 24×18 explorable headquarters while preserving its story, shop, transition, and save behavior.

**Architecture:** Keep `guild-hall` as a direct `WorldMapDefinition`. Reuse existing interior props and collision to create readable connected zones, update only the village-side interior arrival that depends on the moved entrance, and extend existing save normalization to reject positions embedded in collidable interior props. Reuse and strengthen the repository's existing map-route and arrival invariants instead of adding Guild-Hall-only test machinery. Do not add a new interior source model, renderer contract, background package, or compatibility layer.

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
- Shared player/NPC collision and interaction radii must live in `core/collision.ts`; tests must not restate runtime numbers from memory.
- Any reusable HPA-495 guidance change must be justified by a concrete implementation failure, not by prediction.

---

### Task 1: Share NPC collision constants and normalize loaded positions against interior props

**Files:**
- Modify: `src/lib/game/core/collision.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`

**Interfaces:**
- Consumes: existing `PLAYER_COLLISION_RADIUS`, `WorldMapDefinition['interiorProps']`, `normalizePlayerPosition(...)`, and `isInsideAnyCollisionRect(...)`.
- Produces: shared `NPC_PACK_COLLISION_RADIUS`, `STARTER_NPC_COLLISION_RADIUS`, and `NPC_INTERACTION_RADIUS` constants; loaded saves on any map are moved out of collidable interior props using the existing nearest-walkable-tile machinery.

- [ ] **Step 1: Add a failing save-normalization test**

In `src/lib/game/save/save-state.test.ts`, add a focused test that chooses any collidable Guild Hall prop rather than depending on a specific prop ID, serializes a valid save at that collision center, parses it, and asserts the normalized player is outside every collidable Guild Hall prop with player-radius padding.

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

- [ ] **Step 2: Run the focused save-state test and verify the current behavior fails**

```bash
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
```

Expected before the fix: the new test fails because `normalizePlayerPosition(...)` does not include `interiorProps[].collision` in its normalization rectangles.

- [ ] **Step 3: Move shared NPC radii into `core/collision.ts` without changing behavior**

Extend `src/lib/game/core/collision.ts`:

```ts
export const PLAYER_COLLISION_RADIUS = 12;
export const NPC_PACK_COLLISION_RADIUS = 17;
export const STARTER_NPC_COLLISION_RADIUS = 11;
export const NPC_INTERACTION_RADIUS = 36;
```

In `WorldScene.ts`:

1. import all four constants from `$lib/game/core/collision`;
2. remove the private `npcPackCollisionRadius`, `starterNpcCollisionRadius`, and `npcInteractionRadius` literals;
3. keep `playerRadius = PLAYER_COLLISION_RADIUS` if the existing class alias remains useful;
4. make `getNpcCollisionRadius(...)` return `NPC_PACK_COLLISION_RADIUS` or `STARTER_NPC_COLLISION_RADIUS`;
5. make `findNearbyNpc()` compare against `PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS`.

This is a constant-ownership cleanup only. Do not change collision or interaction behavior.

- [ ] **Step 4: Add the smallest generic interior-prop normalization helper**

In `src/lib/game/save/save-state.ts`, keep `collectStrictCollisionRects(...)` semantically unchanged because interior props use escape-aware runtime collision rather than strict collision. Add:

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

Update the existing `normalizePlayerPosition(...)` comment block and nearby collector comments so they explicitly state:

- blockers, fences, and collidable map decor are strict movement collision;
- landmarks and collidable interior props are escape-aware at runtime but are still invalid loaded positions because they visually embed the player in opaque geometry.

Do not change `SaveState.version`, migrations, or storage keys.

- [ ] **Step 5: Run save and scene tests**

```bash
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS. The save test proves the new normalization behavior; the scene suite proves moving the NPC constants did not alter runtime interaction/collision behavior.

- [ ] **Step 6: Commit the isolated runtime correction**

```bash
git add \
  src/lib/game/core/collision.ts \
  src/lib/game/phaser/scenes/WorldScene.ts \
  src/lib/game/save/save-state.ts \
  src/lib/game/save/save-state.test.ts
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
- Consumes: existing direct `WorldMapDefinition`, `interiorPropAsset`, shared collision constants, existing map test helpers/invariants, village transition compiler, scene behavior tests, and Guild quest E2E fixture.
- Produces: a 24×18 `guildHallMap` with five readable connected functions, synchronized exterior/interior arrival, and behavior tests that no longer depend on removed 16×12 coordinates.

- [ ] **Step 1: Update the existing map contracts before changing content**

In `src/lib/game/content/maps.test.ts`, update all existing consumers of the Guild Hall seam and dimensions up front.

#### 1a. Update the exhaustive Meadow Entry transition snapshot

The `expect(meadowEntryMap.transitions).toEqual([...])` block already pins every transition. Change only the `meadow-to-guild-hall` arrival from the old compact spawn to:

```ts
{
	id: 'meadow-to-guild-hall',
	x: 1_616,
	y: 5_040,
	toMapId: 'guild-hall',
	showMarker: false,
	arrival: { x: 384, y: 480, facing: 'up' }
}
```

Do not loosen or delete this exhaustive snapshot.

#### 1b. Split compact-interior dimensions from the Guild Hall contract

Replace the blanket 16×12 loop with:

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
```

Do **not** add another hardcoded `inbound?.arrival === {384,480}` assertion. The generic inbound invariant below owns that relationship.

#### 1c. Preserve NPC identity while updating coordinates

Update the existing Guild Hall NPC expectation:

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

Identity/behavior fields remain stable; coordinates intentionally do not.

#### 1d. Extend the existing arrival tests with reusable interior invariants

Keep the current explicit hero-house and ruins return assertions where they document special routes. Add this generic village-interior relationship to the existing arrival test:

```ts
const villageInteriors = [
	heroHouseMap,
	guildHallMap,
	itemShopMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map,
	shrineOfAuroraInteriorMap
];

for (const interior of villageInteriors) {
	const inbound = meadowEntryMap.transitions.find((transition) => transition.toMapId === interior.id);
	expect(inbound).toBeDefined();
	expect(inbound!.arrival).toEqual({
		...interior.spawn,
		facing: interior.spawnDirection
	});
}
```

This is the invariant HPA-414 should inherit: moving an interior spawn requires its Meadow Entry inbound arrival to move with it.

Also extend the existing `keeps every transition arrival inside its current target map` loop with:

```ts
expectPointClearOfInteriorPropCollisions(
	targetMap,
	transition.arrival,
	`${map.id}:${transition.id} arrival`
);
```

That protects every future interior arrival from newly moved furniture instead of protecting Guild Hall only.

- [ ] **Step 2: Reuse the existing route helper and runtime collision predicate**

Do not add a second interior-only sampler. Replace `expectHorizontalRouteClear(...)` with one test-local polyline helper, `expectRouteClear(...)`, and update its two existing ruins callers plus the new Guild Hall routes.

First, change `expectPointClearOfInteriorPropCollisions(...)` so it uses the same inclusive predicate and shared radius as save normalization/runtime geometry rather than a literal 24×24 rectangle:

```ts
function expectPointClearOfInteriorPropCollisions(
	map: WorldMapDefinition,
	point: { x: number; y: number },
	label: string
) {
	for (const prop of map.interiorProps ?? []) {
		if (!prop.collision) continue;
		expect(
			isInsideCollisionRect(point.x, point.y, prop.collision, PLAYER_COLLISION_RADIUS),
			`${map.id}:${label} blocked by ${prop.id}`
		).toBe(false);
	}
}
```

Import `isInsideCollisionRect` from `save-state.ts` and the shared radii from `core/collision.ts`.

Add a tiny test helper for interactive NPC body radius:

```ts
function getTestNpcBodyRadius(npc: NonNullable<WorldMapDefinition['npcs']>[number]) {
	return (
		PLAYER_COLLISION_RADIUS +
		(isNpcPackFrameName(npc.frameName) ? NPC_PACK_COLLISION_RADIUS : STARTER_NPC_COLLISION_RADIUS)
	);
}
```

Then replace `expectHorizontalRouteClear(...)` with:

```ts
function expectRouteClear(
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
			const point = {
				x: from.x + (to.x - from.x) * ratio,
				y: from.y + (to.y - from.y) * ratio
			};

			expect(point.x).toBeGreaterThanOrEqual(PLAYER_COLLISION_RADIUS);
			expect(point.y).toBeGreaterThanOrEqual(PLAYER_COLLISION_RADIUS);
			expect(point.x).toBeLessThanOrEqual(map.width * 32 - PLAYER_COLLISION_RADIUS);
			expect(point.y).toBeLessThanOrEqual(map.height * 32 - PLAYER_COLLISION_RADIUS);

			for (const blocker of map.blockers ?? []) {
				expect(
					isInsideCollisionRect(point.x, point.y, blocker, PLAYER_COLLISION_RADIUS),
					`${map.id}:${label} blocked by ${blocker.id}`
				).toBe(false);
			}

			expectPointClearOfInteriorPropCollisions(map, point, label);

			for (const npc of map.npcs ?? []) {
				expect(
					Math.hypot(point.x - npc.x, point.y - npc.y),
					`${map.id}:${label} crosses NPC ${npc.id}`
				).toBeGreaterThanOrEqual(getTestNpcBodyRadius(npc));
			}
		}
	}
}
```

This remains test-only geometry. It models the three movement constraints relevant to these routes—map bounds, blockers, collidable interior furniture, and interactive NPC bodies—without creating pathfinding or a runtime room graph.

Update the existing ruins route assertions to call `expectRouteClear(map, [from, to], label)` so there is one route contract in the file.

- [ ] **Step 3: Add the Guild Hall routes and two-sided interaction approach assertions**

Use the pre-checked route baseline:

```ts
const entrance = { x: 384, y: 480 };
const hub = { x: 384, y: 384 };
const guildMasterApproach = { x: 208, y: 176 };
const quartermasterApproach = { x: 560, y: 176 };

expectRouteClear(guildHallMap, [entrance, hub], 'entrance-to-hub');
expectRouteClear(
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
expectRouteClear(guildHallMap, [hub, { x: 384, y: 208 }], 'hub-to-records');
expectRouteClear(
	guildHallMap,
	[hub, { x: 560, y: 384 }, quartermasterApproach],
	'hub-to-quartermaster'
);
```

Then verify that each approach is both outside the NPC body and inside actual interaction range:

```ts
const guildMaster = guildHallMap.npcs!.find((npc) => npc.id === 'guild-master')!;
const quartermaster = guildHallMap.npcs!.find((npc) => npc.id === 'guild-quartermaster')!;

for (const [npc, approach] of [
	[guildMaster, guildMasterApproach],
	[quartermaster, quartermasterApproach]
] as const) {
	const distance = Math.hypot(approach.x - npc.x, approach.y - npc.y);
	expect(distance).toBeGreaterThan(getTestNpcBodyRadius(npc));
	expect(distance).toBeLessThanOrEqual(PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS);
	expectPointClearOfInteriorPropCollisions(guildHallMap, approach, `${npc.id}-approach`);
}
```

Both published approach distances are 32 px. For these NPC-pack sprites the body threshold is 29 px and the interaction threshold is 48 px.

Do **not** add collision assertions for `ambientNpcs`: the runtime renders them but movement collision iterates only `map.npcs`.

- [ ] **Step 4: Run the focused map test and verify it fails on current content**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected before the map rewrite: failures include the new 24×18 contract, the updated exhaustive inbound snapshot, NPC coordinates, inbound-equals-spawn relation, and Guild Hall routes/approaches. Existing ruins route checks should remain green under the unified runtime-aware sampler.

- [ ] **Step 5: Replace only the Guild Hall direct-map data with the pre-checked baseline**

In `src/lib/game/content/maps.ts`, leave the shared `interiorDoor` constant in place for the other compact interiors. Give Guild Hall its own larger entry coordinates.

```ts
width: 24,
height: 18,
spawnDirection: 'up',
spawn: { x: 384, y: 480 },
```

Outbound transition:

```ts
x: 384,
y: 528,
```

Keep `id: 'guild-hall-to-meadow'`, `toMapId: openingMapId`, and exterior arrival `{ x: 1656, y: 5040, facing: 'down' }`.

Use this placement baseline:

| Purpose | ID | Position | Frame / collision |
| --- | --- | ---: | --- |
| Guild Master | `guild-master` | 176,176 | Preserve identity/dialogue/role/frame fields |
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
| Quartermaster counter | `guild-hall-quartermaster-counter` | 656,176 | `shopCounter`, 128×58; collision 672,176,96×48 |
| Quartermaster crates | `guild-hall-quartermaster-crates` | 688,272 | `crateStack`, 58×58; collision 688,272,48×48 |
| Ambient west member | `guild-hall-member-west` | 128,416 | Preserve frame/role; presentation-only and visually clear of notice board/common furniture |
| Ambient east member | `guild-hall-member-east` | 512,336 | Preserve frame/role; presentation-only |

The original proposed ambient-west anchor `(288,416)` sits inside the notice-board sprite footprint and on its collision edge. The replacement `(128,416)` keeps the 96×87 ambient sprite clear of the notice board and common-area furniture while retaining a west-side Guild-member presence.

The Quartermaster anchor `(592,176)` intentionally meets the west edge of the counter visual so Vale reads as stationed at the counter. The counter collision is deliberately offset east (`x=672`, width `96`), leaving both the NPC anchor and the west customer approach outside furniture collision.

The route branches at `y = 384`, not `y = 320`, keeping it south of the common table/bench. Delete superseded Guild Hall prop literals rather than preserving old-room furniture. Keep `x = 384` open from the entrance through the north-center junction.

Do not add `blockers` to simulate interior walls. Do not add backgrounds.

- [ ] **Step 6: Update only the owning village transition arrival**

In `src/lib/game/content/maps/regions/village-layered.ts`, find `meadow-to-guild-hall` and change only:

```ts
arrival: { x: 384, y: 480, facing: 'up' }
```

Keep its exterior `col`, `row`, ID, target map, and marker behavior unchanged.

- [ ] **Step 7: Update scene tests that consume Guild Hall coordinates**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update every Guild Hall test that depends on the old `(192,144)` Guild Master or `(352,144)` Quartermaster positions.

Render assertions:

```ts
expect(scene.add.image).toHaveBeenCalledWith(176, 176, 'npc-pack', 'guildMasterNpc');
expect(scene.add.image).toHaveBeenCalledWith(592, 176, 'npc-pack', 'quartermasterNpc');
```

Dialogue/quest/shop setup should stand at the valid approach points instead of inside NPC bodies:

```ts
const guildMasterApproach = { x: 208, y: 176 };
const quartermasterApproach = { x: 560, y: 176 };
```

Use `guildMasterApproach` for Guild Master briefing/quest/stale-dialogue setup and `quartermasterApproach` for Quartermaster dialogue/shop setup.

For existing generic NPC-body movement tests that use the Quartermaster as their fixture, preserve their relative offsets around the new Quartermaster position `{ x: 592, y: 176 }`:

```text
old 352,185  → new 592,217  (41 px south; move toward NPC)
old 316,180  → new 556,212  (36 px west/south; diagonal slide case)
old 352,150  → new 592,182  (6 px south; move away from overlap)
old 352,174  → new 592,206  (30 px south; fast-movement tunneling case)
```

Use both searches before finishing this step:

```bash
rg -n "mapId: 'guild-hall'|create\(\{ mapId: 'guild-hall'" src/lib/game/phaser/scenes/scenes.test.ts
rg -n "(192|352).*144|144.*(192|352)" src/lib/game/phaser/scenes/scenes.test.ts
```

Inspect Guild Hall blocks from the first search and any old coordinate-pair hits from the second. Do not rewrite unrelated item-shop/villager fixtures that happen to use the same numbers.

- [ ] **Step 8: Update the Guild quest E2E fixture**

In `tests/e2e/game.e2e.ts`, update only `quest log shows main quest and accepts Guild side quests`:

```ts
player: { level: 1, xp: 0, hp: 20, attack: 3, x: 208, y: 176, facing: 'up' }
```

Keep the existing E2E flow unchanged: resume the save, verify Guild Master proximity, interact, and exercise the quest log/side-quest behavior.

- [ ] **Step 9: Run focused map, save, scene, and Guild E2E tests**

```bash
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/save/save-state.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run test:e2e -- --grep "quest log shows main quest and accepts Guild side quests"
```

Expected: PASS. If the map route test fails, correct the conflicting Guild Hall content coordinate while preserving the published zone model; do not weaken the runtime-aware route invariant.

- [ ] **Step 10: Verify story and registry semantics without editing those registries**

```bash
bun run story:check
bun run test:unit -- --run src/lib/game/content/shops.test.ts
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
bun run test:unit -- --run src/lib/game/content/quests.test.ts
```

Expected: PASS with no changes required to story, shops, dialogue, or quests.

- [ ] **Step 11: Commit the player-facing vertical slice and its coordinate consumers**

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

- [ ] Run the focused behavioral set after both commits:

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

- [ ] Run repository-wide verification so another hardcoded Guild Hall coordinate cannot remain hidden in a different unit test:

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

Prefer one implementation PR containing two reviewable commits:

1. `fix(save): normalize interior prop positions`
2. `feat(hpa-400): expand Guild Hall headquarters`

The first commit also centralizes the already-existing NPC collision/interaction radius constants so the test layer can use the exact runtime contract without retyping numbers. The second commit contains the direct-map content, village arrival seam, strengthened map invariants, scene coordinate consumers, and the one Guild quest E2E fixture because those move atomically with the new Guild Hall layout.

The implementation PR should summarize the concrete HPA-495 field validation: direct-map routing was correct, existing prop art was sufficient, and the only reusable behavioral gap discovered was loaded-position normalization for collidable interior furniture.