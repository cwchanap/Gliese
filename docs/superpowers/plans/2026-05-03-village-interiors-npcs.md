# Village Interiors And NPCs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a peaceful village opening with separate interior maps, static NPCs, proximity dialogue, and a road combat ramp into the existing ruins flow.

**Architecture:** Keep `WorldScene` as the only gameplay scene and extend the existing TypeScript map content model. Building doors use the current map transition flow, with per-transition combat gating so village interiors remain reachable while road enemies are alive. NPC dialogue publishes through the existing HUD status channel.

**Tech Stack:** SvelteKit, Svelte 5, TypeScript, Phaser, Vitest, Playwright, bun.

---

## File Structure

- Modify `src/lib/game/content/maps.ts`
  - Add `MapTransition.id`, `MapTransition.requiresClear`, `MapLandmark`, `MapNpc`, and `WorldMapDefinition.npcs` / `landmarks`.
  - Add six `16 x 12` interior maps.
  - Rework `meadow-entry` into village exterior plus eastern road.
- Modify `src/lib/game/content/maps.test.ts`
  - Verify interior map registry entries, bounds, NPC validity, landmark validity, transition return paths, and combat placement.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`
  - Render village landmarks.
  - Allow transitions to decide whether living enemies block them.
  - Render NPC markers and publish proximity dialogue without repeated HUD spam.
  - Generate interior tilemap data as enclosed rooms.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`
  - Update expected `meadow-entry` coordinates.
  - Add tests for building transitions, transition combat gating, landmark rendering, NPC rendering, and NPC dialogue.
- No Svelte file changes are planned.

---

### Task 1: Add Village And Interior Content

**Files:**

- Modify: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Write the failing content tests**

Add these imports at the top of `src/lib/game/content/maps.test.ts`:

```ts
import {
	guildHallMap,
	heroHouseMap,
	itemShopMap,
	maps,
	meadowEntryMap,
	ruinsThresholdMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
```

Replace the current map import line:

```ts
import { maps, meadowEntryMap, ruinsThresholdMap } from '$lib/game/content/maps';
```

with the expanded import above.

Replace the first test in `src/lib/game/content/maps.test.ts` with:

```ts
it('declares a village spawn, peaceful building doors, road encounters, and ruins exit', () => {
	expect(meadowEntryMap.spawn).toEqual({ x: 384, y: 1_344 });
	expect(meadowEntryMap.transitions.map((transition) => transition.id)).toEqual([
		'meadow-to-hero-house',
		'meadow-to-guild-hall',
		'meadow-to-item-shop',
		'meadow-to-villager-house-1',
		'meadow-to-villager-house-2',
		'meadow-to-villager-house-3',
		'meadow-to-ruins-threshold'
	]);
	expect(meadowEntryMap.encounters).toEqual([
		{ id: 'meadow-slime-west', x: 1_568, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 1_824, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 2_080, y: 1_280, enemyId: 'slime-scout' }
	]);
	expect(
		meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-ruins-threshold')
	).toMatchObject({
		toMapId: 'ruins-threshold',
		requiresClear: true
	});
	expect(
		meadowEntryMap.transitions
			.filter((transition) => transition.toMapId !== 'ruins-threshold')
			.every((transition) => transition.requiresClear !== true)
	).toBe(true);
});
```

Replace the arrival test with:

```ts
it('declares explicit arrival points for village doors and ruin doorway returns', () => {
	expect(
		meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-hero-house')
	).toMatchObject({
		toMapId: 'hero-house',
		arrival: { x: 256, y: 224, facing: 'up' }
	});
	expect(heroHouseMap.transitions).toEqual([
		{
			id: 'hero-house-to-meadow',
			x: 256,
			y: 336,
			toMapId: 'meadow-entry',
			arrival: { x: 384, y: 1_408, facing: 'down' }
		}
	]);
	expect(
		meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-ruins-threshold')
	).toMatchObject({
		toMapId: 'ruins-threshold',
		arrival: { x: 256, y: 480, facing: 'right' }
	});
	expect(
		ruinsThresholdMap.transitions.find((transition) => transition.id === 'threshold-to-meadow')
	).toMatchObject({
		toMapId: 'meadow-entry',
		arrival: { x: 2_176, y: 1_280, facing: 'left' }
	});
});
```

Add these new tests after the arrival test:

```ts
it('registers all compact village interiors', () => {
	expect(maps['hero-house']).toBe(heroHouseMap);
	expect(maps['guild-hall']).toBe(guildHallMap);
	expect(maps['item-shop']).toBe(itemShopMap);
	expect(maps['villager-house-1']).toBe(villagerHouse1Map);
	expect(maps['villager-house-2']).toBe(villagerHouse2Map);
	expect(maps['villager-house-3']).toBe(villagerHouse3Map);

	for (const map of [
		heroHouseMap,
		guildHallMap,
		itemShopMap,
		villagerHouse1Map,
		villagerHouse2Map,
		villagerHouse3Map
	]) {
		expect(map.width).toBe(16);
		expect(map.height).toBe(12);
		expect(map.transitions).toHaveLength(1);
		expect(map.transitions[0]!.toMapId).toBe('meadow-entry');
	}
});

it('defines village NPCs with stable ids and bounded coordinates', () => {
	const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);

	expect(guildHallMap.npcs).toEqual([
		{
			id: 'guild-clerk',
			x: 256,
			y: 144,
			name: 'Guild Clerk',
			dialogue: 'Morning. The ruins survey is posted; take the east road when you are ready.',
			role: 'guild',
			frameName: 'titleBadge'
		}
	]);
	expect(itemShopMap.npcs?.[0]).toMatchObject({
		id: 'shopkeeper-mira',
		name: 'Mira',
		role: 'shopkeeper'
	});
	expect(new Set(npcs.map((npc) => npc.id)).size).toBe(npcs.length);

	for (const map of Object.values(maps)) {
		for (const npc of map.npcs ?? []) {
			expect(npc.name.length).toBeGreaterThan(0);
			expect(npc.dialogue.length).toBeGreaterThan(0);
			expect(['guild', 'shopkeeper', 'villager', 'home']).toContain(npc.role);
			expect(npc.x).toBeGreaterThanOrEqual(0);
			expect(npc.y).toBeGreaterThanOrEqual(0);
			expect(npc.x).toBeLessThan(map.width * 32);
			expect(npc.y).toBeLessThan(map.height * 32);
		}
	}
});

it('defines exterior building landmarks for each village door', () => {
	expect(meadowEntryMap.landmarks?.map((landmark) => landmark.id)).toEqual([
		'hero-house-exterior',
		'guild-hall-exterior',
		'item-shop-exterior',
		'villager-house-1-exterior',
		'villager-house-2-exterior',
		'villager-house-3-exterior'
	]);

	for (const landmark of meadowEntryMap.landmarks ?? []) {
		expect(landmark.label.length).toBeGreaterThan(0);
		expect(landmark.width).toBeGreaterThan(32);
		expect(landmark.height).toBeGreaterThan(32);
		expect(landmark.x).toBeGreaterThanOrEqual(0);
		expect(landmark.y).toBeGreaterThanOrEqual(0);
		expect(landmark.x).toBeLessThan(meadowEntryMap.width * 32);
		expect(landmark.y).toBeLessThan(meadowEntryMap.height * 32);
	}
});

it('keeps meadow enemies east of the village cluster', () => {
	for (const encounter of meadowEntryMap.encounters ?? []) {
		expect(encounter.x).toBeGreaterThanOrEqual(1_500);
	}
});
```

In the existing placed pickup test, update the expected `meadow-entry` pickups to:

```ts
expect(maps['meadow-entry'].pickups).toEqual([
	{ id: 'meadow-entry-potion', x: 704, y: 1_248, itemId: 'field-potion', quantity: 2 },
	{ id: 'meadow-entry-charm', x: 960, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
	{ id: 'meadow-entry-token', x: 1_280, y: 1_152, itemId: 'meadow-token', quantity: 1 }
]);
```

- [ ] **Step 2: Run the content tests and verify they fail**

Run:

```bash
bun run test:unit -- src/lib/game/content/maps.test.ts
```

Expected: FAIL because `heroHouseMap`, `guildHallMap`, `itemShopMap`, villager maps, `npcs`, `landmarks`, transition ids, and `requiresClear` do not exist yet.

- [ ] **Step 3: Implement the map content model and village content**

In `src/lib/game/content/maps.ts`, replace `MapTransition` with:

```ts
export interface MapTransition {
	id: string;
	x: number;
	y: number;
	toMapId: string;
	requiresClear?: boolean;
	arrival?: {
		x: number;
		y: number;
		facing: WorldMapDefinition['spawnDirection'];
	};
}
```

Add these interfaces below `MapPickup`:

```ts
export type MapNpcRole = 'guild' | 'shopkeeper' | 'villager' | 'home';

export interface MapNpc {
	id: string;
	x: number;
	y: number;
	name: string;
	dialogue: string;
	role: MapNpcRole;
	frameName: 'titleBadge';
}

export interface MapLandmark {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
	label: string;
}
```

Extend `WorldMapDefinition`:

```ts
export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
	pickups?: MapPickup[];
	encounters?: MapEncounter[];
	npcs?: MapNpc[];
	landmarks?: MapLandmark[];
}
```

Replace `meadowEntryMap` with:

```ts
export const meadowEntryMap: WorldMapDefinition = {
	id: openingMapId,
	width: 80,
	height: 80,
	spawnDirection: 'down',
	spawn: { x: 384, y: 1_344 },
	landmarks: [
		{ id: 'hero-house-exterior', x: 384, y: 1_312, width: 192, height: 128, label: "Hero's House" },
		{ id: 'guild-hall-exterior', x: 800, y: 1_088, width: 256, height: 160, label: 'Guild' },
		{ id: 'item-shop-exterior', x: 832, y: 1_472, width: 192, height: 128, label: 'Item Shop' },
		{
			id: 'villager-house-1-exterior',
			x: 352,
			y: 1_024,
			width: 160,
			height: 112,
			label: 'Villager Home'
		},
		{
			id: 'villager-house-2-exterior',
			x: 576,
			y: 1_568,
			width: 160,
			height: 112,
			label: 'Villager Home'
		},
		{
			id: 'villager-house-3-exterior',
			x: 1_056,
			y: 1_344,
			width: 160,
			height: 112,
			label: 'Villager Home'
		}
	],
	transitions: [
		{
			id: 'meadow-to-hero-house',
			x: 384,
			y: 1_408,
			toMapId: 'hero-house',
			arrival: { x: 256, y: 224, facing: 'up' }
		},
		{
			id: 'meadow-to-guild-hall',
			x: 800,
			y: 1_168,
			toMapId: 'guild-hall',
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-item-shop',
			x: 832,
			y: 1_536,
			toMapId: 'item-shop',
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-1',
			x: 352,
			y: 1_080,
			toMapId: 'villager-house-1',
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-2',
			x: 576,
			y: 1_624,
			toMapId: 'villager-house-2',
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-villager-house-3',
			x: 1_056,
			y: 1_400,
			toMapId: 'villager-house-3',
			arrival: { x: 256, y: 288, facing: 'up' }
		},
		{
			id: 'meadow-to-ruins-threshold',
			x: 2_304,
			y: 1_280,
			toMapId: 'ruins-threshold',
			requiresClear: true,
			arrival: { x: 256, y: 480, facing: 'right' }
		}
	],
	pickups: [
		{ id: 'meadow-entry-potion', x: 704, y: 1_248, itemId: 'field-potion', quantity: 2 },
		{ id: 'meadow-entry-charm', x: 960, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
		{ id: 'meadow-entry-token', x: 1_280, y: 1_152, itemId: 'meadow-token', quantity: 1 }
	],
	encounters: [
		{ id: 'meadow-slime-west', x: 1_568, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-center', x: 1_824, y: 1_280, enemyId: 'slime-scout' },
		{ id: 'meadow-slime-east', x: 2_080, y: 1_280, enemyId: 'slime-scout' }
	]
};
```

Add these interior maps after `meadowEntryMap`:

```ts
const interiorDoor = { x: 256, y: 336 } as const;

export const heroHouseMap: WorldMapDefinition = {
	id: 'hero-house',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 224 },
	transitions: [
		{
			id: 'hero-house-to-meadow',
			x: interiorDoor.x,
			y: interiorDoor.y,
			toMapId: openingMapId,
			arrival: { x: 384, y: 1_408, facing: 'down' }
		}
	]
};

export const guildHallMap: WorldMapDefinition = {
	id: 'guild-hall',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'guild-hall-to-meadow',
			x: interiorDoor.x,
			y: interiorDoor.y,
			toMapId: openingMapId,
			arrival: { x: 800, y: 1_168, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'guild-clerk',
			x: 256,
			y: 144,
			name: 'Guild Clerk',
			dialogue: 'Morning. The ruins survey is posted; take the east road when you are ready.',
			role: 'guild',
			frameName: 'titleBadge'
		}
	]
};

export const itemShopMap: WorldMapDefinition = {
	id: 'item-shop',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'item-shop-to-meadow',
			x: interiorDoor.x,
			y: interiorDoor.y,
			toMapId: openingMapId,
			arrival: { x: 832, y: 1_536, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'shopkeeper-mira',
			x: 256,
			y: 144,
			name: 'Mira',
			dialogue: 'Fresh tonics are on the shelf. The guild already stocked your field kit today.',
			role: 'shopkeeper',
			frameName: 'titleBadge'
		}
	]
};

export const villagerHouse1Map: WorldMapDefinition = {
	id: 'villager-house-1',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'villager-house-1-to-meadow',
			x: interiorDoor.x,
			y: interiorDoor.y,
			toMapId: openingMapId,
			arrival: { x: 352, y: 1_080, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'villager-ina',
			x: 256,
			y: 144,
			name: 'Ina',
			dialogue: 'A peaceful morning is best spent before the road dust rises.',
			role: 'villager',
			frameName: 'titleBadge'
		}
	]
};

export const villagerHouse2Map: WorldMapDefinition = {
	id: 'villager-house-2',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'villager-house-2-to-meadow',
			x: interiorDoor.x,
			y: interiorDoor.y,
			toMapId: openingMapId,
			arrival: { x: 576, y: 1_624, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'villager-bran',
			x: 256,
			y: 144,
			name: 'Bran',
			dialogue:
				'The ruins bells were quiet last night. That usually means trouble waited politely.',
			role: 'villager',
			frameName: 'titleBadge'
		}
	]
};

export const villagerHouse3Map: WorldMapDefinition = {
	id: 'villager-house-3',
	width: 16,
	height: 12,
	spawnDirection: 'up',
	spawn: { x: 256, y: 288 },
	transitions: [
		{
			id: 'villager-house-3-to-meadow',
			x: interiorDoor.x,
			y: interiorDoor.y,
			toMapId: openingMapId,
			arrival: { x: 1_056, y: 1_400, facing: 'down' }
		}
	],
	npcs: [
		{
			id: 'villager-sena',
			x: 256,
			y: 144,
			name: 'Sena',
			dialogue: 'When the guild sends you east, keep your blade hand loose.',
			role: 'villager',
			frameName: 'titleBadge'
		}
	]
};
```

Update `ruinsThresholdMap.transitions` to include ids and retain clear-gated ruin behavior:

```ts
transitions: [
	{
		id: 'threshold-to-meadow',
		x: 128,
		y: 480,
		toMapId: openingMapId,
		requiresClear: true,
		arrival: { x: 2_176, y: 1_280, facing: 'left' }
	},
	{
		id: 'threshold-to-core',
		x: 704,
		y: 480,
		toMapId: 'ruins-core',
		requiresClear: true,
		arrival: { x: 256, y: 480, facing: 'right' }
	}
],
```

Update `ruinsCoreMap.transitions`:

```ts
transitions: [
	{
		id: 'core-to-threshold',
		x: 128,
		y: 480,
		toMapId: 'ruins-threshold',
		requiresClear: true,
		arrival: { x: 576, y: 480, facing: 'left' }
	}
],
```

Update `maps`:

```ts
export const maps: DefinitionRegistry<WorldMapDefinition> = {
	[meadowEntryMap.id]: meadowEntryMap,
	[heroHouseMap.id]: heroHouseMap,
	[guildHallMap.id]: guildHallMap,
	[itemShopMap.id]: itemShopMap,
	[villagerHouse1Map.id]: villagerHouse1Map,
	[villagerHouse2Map.id]: villagerHouse2Map,
	[villagerHouse3Map.id]: villagerHouse3Map,
	[ruinsThresholdMap.id]: ruinsThresholdMap,
	[ruinsCoreMap.id]: ruinsCoreMap
};
```

- [ ] **Step 4: Run the content tests**

Run:

```bash
bun run test:unit -- src/lib/game/content/maps.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit content changes**

```bash
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts
git commit -m "Add village interior map content"
```

---

### Task 2: Render Village Landmarks And Fix Transition Gating

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing scene tests for landmark rendering and peaceful building doors**

In `src/lib/game/phaser/scenes/scenes.test.ts`, extend `createOverlayMarker()` return object with `setOrigin`:

```ts
setOrigin: vi.fn(() => marker),
```

Update `OverlayMarker`-like reset for overlay markers by adding:

```ts
marker.setOrigin?.mockReset?.();
```

The local helper type is inferred from the object literal, so adding `setOrigin` to `createOverlayMarker()` is enough for all overlay markers created by that helper.

Add this test in the `WorldScene` describe block after the first rendering test:

```ts
it('renders village building landmarks before doorway markers', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });

	expect(scene.add.rectangle).toHaveBeenCalledWith(384, 1_312, 192, 128, 0x5b4636, 0.9);
	expect(scene.add.rectangle).toHaveBeenCalledWith(384, 1_376, 192, 24, 0x2f241c, 0.95);
	expect(scene.add.text).toHaveBeenCalledWith(384, 1_252, "Hero's House", {
		color: '#f8fafc',
		fontSize: '12px'
	});
	expect(scene.add.image).toHaveBeenCalledWith(384, 1_408, 'starter-pack', 'doorwayTile');
	expect(scene.add.image).toHaveBeenCalledWith(800, 1_168, 'starter-pack', 'doorwayTile');
	expect(scene.add.image).toHaveBeenCalledWith(2_304, 1_280, 'starter-pack', 'doorwayTile');
});
```

Update the existing test named `renders tilemap ground, a hero sprite, and encounter art for the resolved map`:

```ts
expect(tilemapData[40][0]).toBe(1);
expect(scene.add.sprite).toHaveBeenCalledWith(
	meadowEntryMap.spawn.x,
	meadowEntryMap.spawn.y,
	'animation-pack',
	'heroIdle0'
);
expect(scene.add.sprite).toHaveBeenCalledWith(1_824, 1_280, 'animation-pack', 'slimeScoutIdle0');
expect(phaserState.enemyMarkers).toHaveLength(3);
expect(scene.add.image).toHaveBeenCalledWith(2_304, 1_280, 'starter-pack', 'doorwayTile');
```

Add this transition test near the existing transition tests:

```ts
it('allows peaceful village building transitions while road enemies are alive', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 384, y: 1_408 });

	scene.update(0, 16);

	expect(scene.scene.restart).toHaveBeenCalledWith({
		reason: 'transition',
		saveState: expect.objectContaining({
			mapId: 'hero-house',
			player: expect.objectContaining({
				x: 256,
				y: 224,
				facing: 'up'
			})
		})
	});
});
```

Update existing movement and combat tests that use old meadow coordinates:

```ts
Object.assign(phaserState.playerMarker, { x: 1_568, y: 1_280 });
```

Use that replacement where tests currently move the hero to `1_024, 1_280` to attack or defeat `meadow-slime-west`.

Update pickup tests:

```ts
expect(scene.add.image).not.toHaveBeenCalledWith(704, 1_248, 'starter-pack', 'healFlask');
expect(scene.add.image).toHaveBeenCalledWith(960, 1_408, 'starter-pack', 'healFlask');
expect(scene.add.image).toHaveBeenCalledWith(1_280, 1_152, 'starter-pack', 'healFlask');
```

and:

```ts
const marker = phaserState.imageMarkers.find(
	(imageMarker) => imageMarker.x === 704 && imageMarker.y === 1_248
)!;
Object.assign(phaserState.playerMarker, { x: 704, y: 1_248 });
```

- [ ] **Step 2: Run the scene tests and verify they fail**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because landmark rendering does not exist and `tryTransition()` still blocks all transitions while any enemy is alive.

- [ ] **Step 3: Implement landmark rendering**

In `src/lib/game/phaser/scenes/WorldScene.ts`, update `OverlayMarker`:

```ts
type OverlayMarker = {
	x?: number;
	y?: number;
	setAlpha: (alpha: number) => unknown;
	setOrigin?: (x: number, y?: number) => unknown;
	setPosition: (x: number, y: number) => unknown;
	setScale: (x: number, y?: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};
```

After `this.renderGround(map);` in `create()`, add:

```ts
this.renderLandmarks(map);
```

Add this method before `renderPickups()`:

```ts
private renderLandmarks(map: WorldMapDefinition) {
	for (const landmark of map.landmarks ?? []) {
		this.add.rectangle(landmark.x, landmark.y, landmark.width, landmark.height, 0x5b4636, 0.9);
		this.add.rectangle(
			landmark.x,
			landmark.y + landmark.height / 2,
			landmark.width,
			24,
			0x2f241c,
			0.95
		);
		const label = this.add.text(landmark.x, landmark.y - landmark.height / 2 + 4, landmark.label, {
			color: '#f8fafc',
			fontSize: '12px'
		}) as OverlayMarker;
		label.setOrigin?.(0.5, 0);
	}
}
```

- [ ] **Step 4: Implement per-transition combat gating**

Replace `tryTransition()` with:

```ts
private tryTransition() {
	if (!this.player) {
		return false;
	}

	const map = this.resolveMap(this.mapId);
	const hasLivingEnemies = this.hasLivingEnemies();

	for (const transition of map.transitions) {
		if (transition.requiresClear === true && hasLivingEnemies) {
			continue;
		}

		const distance = Phaser.Math.Distance.Between(
			this.player.x,
			this.player.y,
			transition.x,
			transition.y
		);

		if (distance <= WorldScene.playerRadius + WorldScene.transitionRadius) {
			this.scene.restart({
				saveState: this.buildTransitionSaveState(transition),
				reason: 'transition'
			});
			return true;
		}
	}

	return false;
}
```

- [ ] **Step 5: Render interior tilemaps as enclosed rooms**

Replace `buildGroundTileData()` with:

```ts
private buildGroundTileData(map: WorldMapDefinition) {
	const baseTile = WorldScene.terrainTileIndexes[getGroundFrameName(map.id)];
	const pathTile = WorldScene.terrainTileIndexes.pathTile;
	const stoneTile = WorldScene.terrainTileIndexes.stoneWallTile;
	const centerRow = Math.floor(map.height / 2);

	return Array.from({ length: map.height }, (_, row) =>
		Array.from({ length: map.width }, (_, column) => {
			if (map.id === openingMapId && Math.abs(row - centerRow) <= 1) {
				return pathTile;
			}

			if (
				map.id !== openingMapId &&
				(row === 0 || column === 0 || row === map.height - 1 || column === map.width - 1)
			) {
				return stoneTile;
			}

			return baseTile;
		})
	);
}
```

This method already has the correct interior behavior for every non-opening map after Task 1 adds interiors. Keep the replacement if surrounding edits changed the method while resolving conflicts.

- [ ] **Step 6: Run the scene tests**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit rendering and transition changes**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Render village landmarks and interior doors"
```

---

### Task 3: Add NPC Rendering And Proximity Dialogue

**Files:**

- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing NPC scene tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add this test after the landmark test:

```ts
it('renders NPC markers for maps with NPC definitions', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'guild-hall' });

	expect(scene.add.image).toHaveBeenCalledWith(256, 144, 'starter-pack', 'titleBadge');
	const npcMarkers = phaserState.imageMarkers.filter(
		(marker) => marker.x === 256 && marker.y === 144 && marker.frame === 'titleBadge'
	);
	expect(npcMarkers).toHaveLength(1);
	expect(npcMarkers[0]!.setDisplaySize).toHaveBeenCalledWith(30, 36);
});
```

Add this test after the NPC marker test:

```ts
it('publishes NPC dialogue once when the hero enters proximity', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'guild-hall' });
	emitHudStateSpy.mockClear();
	Object.assign(phaserState.playerMarker, { x: 256, y: 144 });

	scene.update(0, 16);
	scene.update(100, 16);

	expect(emitHudStateSpy).toHaveBeenCalledTimes(1);
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			mapId: 'guild-hall',
			status:
				'Guild Clerk: Morning. The ruins survey is posted; take the east road when you are ready.'
		})
	);
});
```

Add this test after the dialogue-once test:

```ts
it('allows NPC dialogue to publish again after leaving and re-entering proximity', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();

	scene.create({ mapId: 'item-shop' });
	emitHudStateSpy.mockClear();
	Object.assign(phaserState.playerMarker, { x: 256, y: 144 });

	scene.update(0, 16);
	Object.assign(phaserState.playerMarker, { x: 64, y: 64 });
	scene.update(100, 16);
	Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
	scene.update(200, 16);

	expect(emitHudStateSpy).toHaveBeenCalledTimes(2);
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			status: 'Mira: Fresh tonics are on the shelf. The guild already stocked your field kit today.'
		})
	);
});
```

- [ ] **Step 2: Run the NPC tests and verify they fail**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts -- --runInBand
```

Expected: FAIL because `WorldScene` does not render NPC markers or publish NPC dialogue.

- [ ] **Step 3: Implement NPC marker state and rendering**

In `src/lib/game/phaser/scenes/WorldScene.ts`, add this type near `PickupMarker`:

```ts
type NpcMarker = {
	setDisplaySize: (width: number, height: number) => unknown;
};
```

Add static radius:

```ts
private static readonly npcInteractionRadius = 36;
```

Add class fields near `pickupMarkers`:

```ts
private currentNearbyNpcId: string | null = null;
private npcMarkers = new Map<string, NpcMarker>();
```

In `create()`, reset NPC state near other reset code:

```ts
this.currentNearbyNpcId = null;
this.npcMarkers.clear();
```

After `this.renderPickups(map);`, add:

```ts
this.renderNpcs(map);
```

Add this method after `renderPickups()`:

```ts
private renderNpcs(map: WorldMapDefinition) {
	this.npcMarkers.clear();

	for (const npc of map.npcs ?? []) {
		const marker = this.add.image(npc.x, npc.y, starterPackAsset.key, npc.frameName) as NpcMarker;
		marker.setDisplaySize(30, 36);
		this.npcMarkers.set(npc.id, marker);
	}
}
```

- [ ] **Step 4: Implement proximity dialogue**

In `update()`, add NPC dialogue before pickup collection so pickup, combat, and transition status messages can replace nearby NPC text:

```ts
this.updateNpcDialogue();
this.tryCollectPickup();
```

Add this method before `tryCollectPickup()`:

```ts
private updateNpcDialogue() {
	if (!this.player) {
		return;
	}

	const map = this.resolveMap(this.mapId);
	const nearbyNpc = (map.npcs ?? [])
		.map((npc) => ({
			npc,
			distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, npc.x, npc.y)
		}))
		.filter(
			({ distance }) => distance <= WorldScene.playerRadius + WorldScene.npcInteractionRadius
		)
		.sort((left, right) => left.distance - right.distance)[0]?.npc;

	if (!nearbyNpc) {
		this.currentNearbyNpcId = null;
		return;
	}

	if (this.currentNearbyNpcId === nearbyNpc.id) {
		return;
	}

	this.currentNearbyNpcId = nearbyNpc.id;
	this.publishHudState(`${nearbyNpc.name}: ${nearbyNpc.dialogue}`);
}
```

- [ ] **Step 5: Run the NPC scene tests**

Run:

```bash
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit NPC runtime changes**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Add village NPC proximity dialogue"
```

---

### Task 4: Full Verification And E2E Smoke

**Files:**

- Modify only if verification reveals a focused issue:
  - `src/lib/game/content/maps.ts`
  - `src/lib/game/content/maps.test.ts`
  - `src/lib/game/phaser/scenes/WorldScene.ts`
  - `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Run all unit tests**

Run:

```bash
bun run test:unit
```

Expected: PASS for server and browser-component projects.

- [ ] **Step 2: Run Svelte type checking**

Run:

```bash
bun run check
```

Expected: PASS with no Svelte or TypeScript errors.

- [ ] **Step 3: Run lint**

Run:

```bash
bun run lint
```

Expected: PASS. When formatting fails, run:

```bash
bun run format
```

Then rerun:

```bash
bun run lint
```

- [ ] **Step 4: Run Playwright e2e**

Run:

```bash
bun run test:e2e
```

Expected: PASS. The existing `/game` boot and inventory smoke tests should still pass.

- [ ] **Step 5: Run a production build**

Run:

```bash
bun run build
```

Expected: PASS after Wrangler types check and Vite build.

- [ ] **Step 6: Commit verification fixes if any were needed**

When Steps 1-5 require code fixes, commit those exact files:

```bash
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Stabilize village interiors verification"
```

When no fixes were needed, do not create an empty commit.

---

## Manual QA Checklist

- [ ] Start `/game`.
- [ ] Confirm the hero starts in the village area, not beside the old slime line.
- [ ] Walk into Hero's house and return to `meadow-entry`.
- [ ] Walk into the Guild and see the Guild Clerk dialogue in HUD status.
- [ ] Walk into the Item Shop and see Mira's dialogue in HUD status.
- [ ] Walk into all three villager houses and see one villager line per house.
- [ ] Confirm the ruins exit is blocked while road slimes are alive.
- [ ] Defeat the road slimes and enter `ruins-threshold`.
- [ ] Confirm the existing ruins threshold and core flow still works.

---

## Self-Review Notes

- Spec coverage:
  - Peaceful village exterior and six interiors: Task 1.
  - Static NPCs with dialogue: Task 1 and Task 3.
  - Existing transition model for doors: Task 1 and Task 2.
  - Road enemies away from village cluster: Task 1 tests.
  - No shop/currency/quest/save schema changes: all tasks avoid those areas.
  - Testing requirements: Tasks 1-4.
- Incomplete-step scan: none of the forbidden incomplete patterns, deferred implementation steps, or unspecified test instructions are intentionally present.
- Type consistency:
  - `MapTransition.id`, `requiresClear`, `MapNpc.frameName`, `MapLandmark`, `npcMarkers`, and `currentNearbyNpcId` are introduced before later tasks use them.
