# Shrine Interior Respawn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an enterable Shrine of Aurora interior and make battle defeat revive the hero there instead of at the meadow spawn.

**Architecture:** Extend the existing map-content model with one more compact interior map and a meadow doorway transition. Keep battle-scene flow unchanged; only the pure battle result application chooses the Shrine interior spawn for defeat. Reuse the existing localized battle summary key with updated text so no HUD contract changes are needed.

**Tech Stack:** TypeScript, Vitest, Svelte 5, Phaser scene tests, existing `WorldMapDefinition` content definitions.

---

## File Structure

- Modify `src/lib/game/content/maps.ts`: export `shrineOfAuroraInteriorMap`, add the meadow entry transition, register the map.
- Modify `src/lib/game/content/maps.test.ts`: test the Shrine transition, interior registration, props, and safe return arrival.
- Modify `src/lib/game/core/battle.ts`: target the Shrine interior map during `applyBattleDefeat`.
- Modify `src/lib/game/core/battle.test.ts`: update defeat expectations to the Shrine interior.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: update returned defeat integration expectations and add Shrine enter/exit scene transition coverage.
- Modify `src/lib/game/i18n/messages/{en,ja,zh-Hant}.ts`: update the defeat summary wording.

---

### Task 1: Add Failing Shrine Map Content Tests

**Files:**
- Modify: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `shrineOfAuroraInteriorMap` to the imports from `$lib/game/content/maps`.

Update the expected `meadowEntryMap.transitions` list to include:

```ts
{
	id: 'meadow-to-shrine-of-aurora',
	x: 1_050,
	y: 6_000,
	toMapId: 'shrine-of-aurora-interior',
	showMarker: false,
	arrival: { x: 256, y: 288, facing: 'up' }
}
```

Add `shrineOfAuroraInteriorMap` to the `interiors` arrays in:

```ts
it('registers all compact village interiors', () => {
	// include shrineOfAuroraInteriorMap
});

it('decorates compact village interiors with bounded props and ambient NPCs', () => {
	// include shrineOfAuroraInteriorMap
	expect(shrineOfAuroraInteriorMap.interiorProps?.map((prop) => prop.id)).toEqual([
		'shrine-of-aurora-rug',
		'shrine-of-aurora-west-lamp',
		'shrine-of-aurora-east-lamp',
		'shrine-of-aurora-west-bench',
		'shrine-of-aurora-east-bench',
		'shrine-of-aurora-offerings',
		'shrine-of-aurora-plant'
	]);
});
```

Add `shrineOfAuroraInteriorMap` to the safe return-arrival loop.

- [ ] **Step 2: Run the content tests to verify RED**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts --testNamePattern "compact village interiors|peaceful building doors|return arrivals"
```

Expected: FAIL because `shrineOfAuroraInteriorMap` is not exported and the meadow transition is missing.

- [ ] **Step 3: Commit nothing**

Do not commit red tests separately unless implementation is paused.

---

### Task 2: Implement Shrine Map Content

**Files:**
- Modify: `src/lib/game/content/maps.ts`

- [ ] **Step 1: Add the meadow Shrine transition**

In `meadowEntryMap.transitions`, insert:

```ts
{
	id: 'meadow-to-shrine-of-aurora',
	x: 1_050,
	y: 6_000,
	toMapId: 'shrine-of-aurora-interior',
	showMarker: false,
	arrival: { x: 256, y: 288, facing: 'up' }
}
```

- [ ] **Step 2: Add the Shrine interior map**

Place this after `villagerHouse3Map`:

```ts
export const shrineOfAuroraInteriorMap: WorldMapDefinition = {
	id: 'shrine-of-aurora-interior',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'shrine-of-aurora-to-meadow',
			...interiorDoor,
			toMapId: openingMapId,
			arrival: { x: 1_050, y: 6_104, facing: 'down' }
		}
	],
	interiorProps: [
		{
			id: 'shrine-of-aurora-rug',
			x: 256,
			y: 248,
			width: 132,
			height: 76,
			frameName: 'rug',
			depth: 'floor'
		},
		{
			id: 'shrine-of-aurora-west-lamp',
			x: 176,
			y: 128,
			width: 46,
			height: 56,
			frameName: 'hearthLamp',
			collision: { id: 'shrine-of-aurora-west-lamp-collision', x: 176, y: 128, width: 36, height: 42 }
		},
		{
			id: 'shrine-of-aurora-east-lamp',
			x: 336,
			y: 128,
			width: 46,
			height: 56,
			frameName: 'hearthLamp',
			collision: { id: 'shrine-of-aurora-east-lamp-collision', x: 336, y: 128, width: 36, height: 42 }
		},
		{
			id: 'shrine-of-aurora-west-bench',
			x: 128,
			y: 224,
			width: 86,
			height: 34,
			frameName: 'bench',
			collision: { id: 'shrine-of-aurora-west-bench-collision', x: 128, y: 224, width: 76, height: 26 }
		},
		{
			id: 'shrine-of-aurora-east-bench',
			x: 384,
			y: 224,
			width: 86,
			height: 34,
			frameName: 'bench',
			collision: { id: 'shrine-of-aurora-east-bench-collision', x: 384, y: 224, width: 76, height: 26 }
		},
		{
			id: 'shrine-of-aurora-offerings',
			x: 256,
			y: 144,
			width: 58,
			height: 40,
			frameName: 'papers',
			depth: 'floor'
		},
		{ id: 'shrine-of-aurora-plant', x: 432, y: 256, width: 36, height: 48, frameName: 'plant' }
	]
};
```

- [ ] **Step 3: Register the map**

Add:

```ts
[shrineOfAuroraInteriorMap.id]: shrineOfAuroraInteriorMap,
```

to the `maps` registry.

- [ ] **Step 4: Run content tests to verify GREEN**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts --testNamePattern "compact village interiors|peaceful building doors|return arrivals"
```

Expected: PASS.

---

### Task 3: Change Defeat Respawn with Failing Core Test First

**Files:**
- Modify: `src/lib/game/core/battle.test.ts`
- Modify: `src/lib/game/core/battle.ts`

- [ ] **Step 1: Update the failing core test**

Change the test name to:

```ts
it('applies a defeat result by sending the hero to the Shrine at 1 HP without rewards', () => {
```

Import `shrineOfAuroraInteriorMap` from `$lib/game/content/maps`.

Change expectations:

```ts
expect(application.saveState.mapId).toBe(shrineOfAuroraInteriorMap.id);
expect(application.saveState.player).toMatchObject({
	hp: 1,
	x: shrineOfAuroraInteriorMap.spawn.x,
	y: shrineOfAuroraInteriorMap.spawn.y,
	facing: shrineOfAuroraInteriorMap.spawnDirection
});
```

- [ ] **Step 2: Run the core battle test to verify RED**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/battle.test.ts --testNamePattern "defeat result"
```

Expected: FAIL because `applyBattleDefeat` still uses `openingMapId`.

- [ ] **Step 3: Implement the respawn target**

In `src/lib/game/core/battle.ts`, import `shrineOfAuroraInteriorMap` and change `applyBattleDefeat` to:

```ts
const shrine = shrineOfAuroraInteriorMap;

return {
	saveState: {
		...saveState,
		mapId: shrine.id,
		player: {
			...saveState.player,
			hp: 1,
			x: shrine.spawn.x,
			y: shrine.spawn.y,
			facing: shrine.spawnDirection
		},
		inventory: result.inventory
	},
	// summary unchanged
};
```

- [ ] **Step 4: Run the core battle test to verify GREEN**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/battle.test.ts --testNamePattern "defeat result"
```

Expected: PASS.

---

### Task 4: Update Scene Integration and Localized Copy

**Files:**
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/i18n/messages/en.ts`
- Modify: `src/lib/game/i18n/messages/ja.ts`
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts`

- [ ] **Step 1: Update failing scene tests**

Rename the returned defeat test to mention Shrine and change expectations:

```ts
expect(builtSave.mapId).toBe('shrine-of-aurora-interior');
expect(builtSave.player).toMatchObject({ hp: 1, x: 256, y: 288, facing: 'up' });
expect(parseSaveState(storedSaves.at(-1)!)).toMatchObject({
	mapId: 'shrine-of-aurora-interior',
	flags: expect.objectContaining({ clearedEncounters: [] }),
	player: expect.objectContaining({ hp: 1, x: 256, y: 288, facing: 'up' }),
	wallet: { coins: 9 }
});
```

Add a scene transition test near the peaceful building transition tests:

```ts
it('enters the Shrine of Aurora from the meadow and exits below the Shrine doorway', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({
		saveState: {
			...createNewSaveState(),
			mapId: 'meadow-entry',
			flags: {
				clearedEncounters: [],
				clearedEncounterUnitCounts: {},
				collectedPickups: [],
				resolvedEncounterDrops: {}
			}
		}
	});
	Object.assign(phaserState.playerMarker, { x: 1_050, y: 6_000 });
	scene.update(0, 16);

	expect(scene.scene.restart).toHaveBeenCalledWith({
		reason: 'transition',
		saveState: expect.objectContaining({
			mapId: 'shrine-of-aurora-interior',
			player: expect.objectContaining({ x: 256, y: 288, facing: 'up' })
		})
	});

	const shrineScene = new WorldScene();
	phaserState.reset();
	shrineScene.create({
		saveState: {
			...createNewSaveState(),
			mapId: 'shrine-of-aurora-interior'
		}
	});
	Object.assign(phaserState.playerMarker, { x: 256, y: 336 });
	shrineScene.update(0, 16);

	expect(shrineScene.scene.restart).toHaveBeenCalledWith({
		reason: 'transition',
		saveState: expect.objectContaining({
			mapId: 'meadow-entry',
			player: expect.objectContaining({ x: 1_050, y: 6_104, facing: 'down' })
		})
	});
});
```

- [ ] **Step 2: Run scene tests to verify RED**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts --testNamePattern "returned battle defeat|Shrine of Aurora"
```

Expected: FAIL until the battle respawn implementation and map transition exist.

- [ ] **Step 3: Update localized copy**

Change `defeatReturnedToVillage` values:

```ts
// en
defeatReturnedToVillage: 'No rewards gained. Returned to the Shrine.',

// ja
defeatReturnedToVillage: '報酬はありません。社へ戻りました。',

// zh-Hant
defeatReturnedToVillage: '沒有獲得獎勵。已返回神社。',
```

- [ ] **Step 4: Run scene tests to verify GREEN**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts --testNamePattern "returned battle defeat|Shrine of Aurora"
```

Expected: PASS.

---

### Task 5: Full Verification and Commit

**Files:**
- All modified files above.

- [ ] **Step 1: Run focused tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts src/lib/game/core/battle.test.ts src/lib/game/phaser/scenes/scenes.test.ts --testNamePattern "compact village interiors|peaceful building doors|return arrivals|defeat result|returned battle defeat|Shrine of Aurora"
```

Expected: PASS.

- [ ] **Step 2: Run project checks**

Run:

```sh
bun run check
```

Expected: PASS with 0 errors and 0 warnings.

- [ ] **Step 3: Browser smoke**

Use the in-app browser at `http://127.0.0.1:5173/`, reload the running app, and verify it still boots with a canvas. If needed, add a Playwright smoke script that starts a save in `shrine-of-aurora-interior` and captures a screenshot.

- [ ] **Step 4: Commit implementation**

Run:

```sh
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/core/battle.ts src/lib/game/core/battle.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/i18n/messages/en.ts src/lib/game/i18n/messages/ja.ts src/lib/game/i18n/messages/zh-Hant.ts
git commit -m "feat: add shrine interior respawn"
```

Expected: implementation commit succeeds.
