import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getDialogue } from '$lib/game/content/dialogue';
import { getItem } from '$lib/game/content/items';
import { getShop } from '$lib/game/content/shops';
import { t } from '$lib/game/i18n/translate';
import {
	guildHallMap,
	heroHouseMap,
	itemShopMap,
	maps,
	meadowEntryMap,
	ruinsCoreMap,
	ruinsThresholdMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';
import type { WorldMapDefinition } from '$lib/game/content/maps';

function expectEnglishMessage(key: Parameters<typeof t>[1]): string {
	const value = t('en', key);
	expect(value).not.toMatch(/^\[/);
	expect(value.trim()).not.toHaveLength(0);
	return value;
}

type CenterRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

function expectRectInsideMap(rect: CenterRect, map = meadowEntryMap) {
	expect(rect.width).toBeGreaterThan(0);
	expect(rect.height).toBeGreaterThan(0);
	expect(rect.x - rect.width / 2).toBeGreaterThanOrEqual(0);
	expect(rect.y - rect.height / 2).toBeGreaterThanOrEqual(0);
	expect(rect.x + rect.width / 2).toBeLessThanOrEqual(map.width * 32);
	expect(rect.y + rect.height / 2).toBeLessThanOrEqual(map.height * 32);
}

function expectPointInsideRect(point: { x: number; y: number }, rect: CenterRect) {
	expect(point.x).toBeGreaterThanOrEqual(rect.x - rect.width / 2);
	expect(point.x).toBeLessThanOrEqual(rect.x + rect.width / 2);
	expect(point.y).toBeGreaterThanOrEqual(rect.y - rect.height / 2);
	expect(point.y).toBeLessThanOrEqual(rect.y + rect.height / 2);
}

describe('opening map content', () => {
	it('supports authored ground patches, blockers, stair markers, and route combat bounds', () => {
		const modelTestMap: WorldMapDefinition = {
			id: 'model-test',
			width: 200,
			height: 200,
			spawnDirection: 'down',
			spawn: { x: 320, y: 320 },
			transitions: [
				{
					id: 'model-test-stair',
					x: 640,
					y: 640,
					toMapId: 'hero-house',
					marker: 'stair'
				}
			],
			groundPatches: [
				{
					id: 'model-test-path',
					x: 320,
					y: 320,
					width: 320,
					height: 96,
					tile: 'pathTile'
				}
			],
			blockers: [
				{
					id: 'model-test-wall',
					x: 480,
					y: 320,
					width: 64,
					height: 320,
					kind: 'city-wall'
				},
				{
					id: 'model-test-future-gate',
					x: 640,
					y: 320,
					width: 96,
					height: 64,
					kind: 'future-gate',
					label: 'Future switch gate'
				}
			],
			combatBounds: [
				{
					id: 'model-test-combat-pocket',
					x: 800,
					y: 320,
					width: 480,
					height: 320,
					encounterIds: ['model-test-slime'],
					aggroRadius: 240,
					leashRadius: 420
				}
			]
		};

		expect(modelTestMap.transitions[0].marker).toBe('stair');
		expect(modelTestMap.groundPatches?.[0]).toMatchObject({
			id: 'model-test-path',
			tile: 'pathTile'
		});
		expect(modelTestMap.blockers?.map((blocker) => blocker.kind)).toEqual([
			'city-wall',
			'future-gate'
		]);
		expect(modelTestMap.combatBounds?.[0].encounterIds).toEqual(['model-test-slime']);
	});

	it('declares a village spawn, peaceful building doors, city route combat pockets, and ruins exit', () => {
		expect(meadowEntryMap.width).toBe(200);
		expect(meadowEntryMap.height).toBe(200);
		expect(meadowEntryMap.spawnDirection).toBe('down');
		expect(meadowEntryMap.spawn).toEqual({ x: 640, y: 5_200 });
		expect(meadowEntryMap.forestZone).toBeUndefined();
		expect(meadowEntryMap.combatBounds?.map((bounds) => bounds.id)).toEqual([
			'city-west-combat-pocket',
			'city-center-combat-pocket',
			'city-east-combat-pocket'
		]);
		expect(meadowEntryMap.transitions).toEqual([
			{
				id: 'meadow-to-hero-house',
				x: 640,
				y: 5_168,
				toMapId: 'hero-house',
				showMarker: false,
				arrival: { x: 256, y: 224, facing: 'up' }
			},
			{
				id: 'meadow-to-guild-hall',
				x: 1_600,
				y: 4_352,
				toMapId: 'guild-hall',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-item-shop',
				x: 2_240,
				y: 5_040,
				toMapId: 'item-shop',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-1',
				x: 960,
				y: 4_552,
				toMapId: 'villager-house-1',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-2',
				x: 1_460,
				y: 5_512,
				toMapId: 'villager-house-2',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-3',
				x: 2_800,
				y: 4_552,
				toMapId: 'villager-house-3',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-ruins-threshold',
				x: 5_760,
				y: 960,
				toMapId: 'ruins-threshold',
				requiresClear: true,
				marker: 'stair',
				questRequirement: {
					questId: 'investigate-the-ruins',
					objectiveId: 'talk-to-guild-master'
				},
				arrival: { x: 512, y: 3_200, facing: 'right' }
			}
		]);
		expect(meadowEntryMap.encounters).toEqual([
			{ id: 'meadow-slime-west', x: 3_200, y: 3_840, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-center', x: 4_128, y: 2_880, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-east', x: 5_120, y: 1_600, enemyId: 'slime-scout' }
		]);
		expect(
			meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-ruins-threshold')
		).toMatchObject({
			toMapId: 'ruins-threshold',
			requiresClear: true,
			questRequirement: {
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			}
		});
		expect(
			meadowEntryMap.transitions
				.filter((transition) => transition.id !== 'meadow-to-ruins-threshold')
				.every((transition) => transition.requiresClear !== true)
		).toBe(true);
	});

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
				arrival: { x: 640, y: 5_248, facing: 'down' }
			}
		]);
		expect(
			meadowEntryMap.transitions.find((transition) => transition.id === 'meadow-to-ruins-threshold')
		).toMatchObject({
			toMapId: 'ruins-threshold',
			arrival: { x: 512, y: 3_200, facing: 'right' }
		});
		expect(
			ruinsThresholdMap.transitions.find((transition) => transition.id === 'threshold-to-meadow')
		).toMatchObject({
			toMapId: 'meadow-entry',
			arrival: { x: 2_176, y: 704, facing: 'left' }
		});
		expect(ruinsThresholdMap.transitions).toEqual([
			{
				id: 'threshold-to-meadow',
				x: 128,
				y: 480,
				toMapId: 'meadow-entry',
				requiresClear: true,
				arrival: { x: 2_176, y: 704, facing: 'left' }
			},
			{
				id: 'threshold-to-core',
				x: 704,
				y: 480,
				toMapId: 'ruins-core',
				requiresClear: true,
				arrival: { x: 256, y: 480, facing: 'right' }
			}
		]);
		expect(ruinsCoreMap.transitions).toEqual([
			{
				id: 'core-to-threshold',
				x: 128,
				y: 480,
				toMapId: 'ruins-threshold',
				requiresClear: true,
				arrival: { x: 576, y: 480, facing: 'left' }
			}
		]);
	});

	it('registers all compact village interiors', () => {
		const interiors = [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map
		];

		expect(maps['hero-house']).toBe(heroHouseMap);
		expect(maps['guild-hall']).toBe(guildHallMap);
		expect(maps['item-shop']).toBe(itemShopMap);
		expect(maps['villager-house-1']).toBe(villagerHouse1Map);
		expect(maps['villager-house-2']).toBe(villagerHouse2Map);
		expect(maps['villager-house-3']).toBe(villagerHouse3Map);

		for (const map of interiors) {
			expect(map.width).toBe(16);
			expect(map.height).toBe(12);
			expect(map.transitions).toHaveLength(1);
			expect(map.transitions[0].toMapId).toBe('meadow-entry');
		}
	});

	it('places interior return arrivals outside the exterior doorway trigger radius', () => {
		const triggerRadius = 30;
		const exteriorTransitions = new Map(
			meadowEntryMap.transitions.map((transition) => [transition.toMapId, transition])
		);

		for (const interiorMap of [
			heroHouseMap,
			guildHallMap,
			itemShopMap,
			villagerHouse1Map,
			villagerHouse2Map,
			villagerHouse3Map
		]) {
			const returnTransition = interiorMap.transitions[0];
			const exteriorTransition = exteriorTransitions.get(interiorMap.id);
			expect(exteriorTransition).toBeDefined();
			expect(returnTransition.arrival).toBeDefined();

			const distance = Math.hypot(
				returnTransition.arrival!.x - exteriorTransition!.x,
				returnTransition.arrival!.y - exteriorTransition!.y
			);

			expect(distance).toBeGreaterThan(triggerRadius);
		}
	});

	it('declares exact exterior return arrivals for compact village interiors', () => {
		expect(heroHouseMap.transitions[0].arrival).toEqual({ x: 640, y: 5_248, facing: 'down' });
		expect(guildHallMap.transitions[0].arrival).toEqual({ x: 1_600, y: 4_432, facing: 'down' });
		expect(itemShopMap.transitions[0].arrival).toEqual({ x: 2_240, y: 5_120, facing: 'down' });
		expect(villagerHouse1Map.transitions[0].arrival).toEqual({
			x: 960,
			y: 4_632,
			facing: 'down'
		});
		expect(villagerHouse2Map.transitions[0].arrival).toEqual({
			x: 1_460,
			y: 5_592,
			facing: 'down'
		});
		expect(villagerHouse3Map.transitions[0].arrival).toEqual({
			x: 2_800,
			y: 4_632,
			facing: 'down'
		});
	});

	it('defines village NPCs with stable ids and bounded coordinates', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);
		const roles = ['guild', 'shopkeeper', 'villager', 'home'];

		expect(heroHouseMap.npcs ?? []).toEqual([]);
		expect(guildHallMap.npcs).toMatchObject([
			{
				id: 'guild-master',
				x: 192,
				y: 144,
				nameKey: 'content.maps.npcs.guild-master.name',
				dialogueId: 'guild-master',
				role: 'guild',
				frameName: 'guildMasterNpc'
			},
			{
				id: 'guild-quartermaster',
				x: 352,
				y: 144,
				nameKey: 'content.maps.npcs.guild-quartermaster.name',
				dialogueId: 'guild-quartermaster',
				role: 'shopkeeper',
				frameName: 'quartermasterNpc',
				shopId: 'guild-quartermaster'
			}
		]);
		expect(itemShopMap.npcs).toMatchObject([
			{
				id: 'shopkeeper-mira',
				x: 256,
				y: 144,
				nameKey: 'content.maps.npcs.shopkeeper-mira.name',
				dialogueId: 'shopkeeper-mira',
				role: 'shopkeeper',
				frameName: 'miraItemShopNpc',
				shopId: 'miras-item-shop'
			}
		]);
		expect(villagerHouse1Map.npcs ?? []).toEqual([]);
		expect(villagerHouse2Map.npcs ?? []).toEqual([]);
		expect(villagerHouse3Map.npcs ?? []).toEqual([]);
		expect(new Set(npcs.map((npc) => npc.id)).size).toBe(npcs.length);

		for (const map of Object.values(maps)) {
			for (const npc of map.npcs ?? []) {
				expectEnglishMessage(npc.nameKey);
				expect(getDialogue(npc.dialogueId)).toBeDefined();
				expect(roles).toContain(npc.role);
				expect(npc.x).toBeGreaterThanOrEqual(0);
				expect(npc.y).toBeGreaterThanOrEqual(0);
				expect(npc.x).toBeLessThan(map.width * 32);
				expect(npc.y).toBeLessThan(map.height * 32);
				expect(npc.frameName).not.toBe('titleBadge');
				if (npc.shopId) {
					expect(getShop(npc.shopId)).toBeDefined();
					expect(npc.role).toBe('shopkeeper');
				}
			}
		}
	});

	it('defines exterior building landmarks for each village door', () => {
		expect(meadowEntryMap.landmarks).toMatchObject([
			{
				id: 'hero-house-exterior',
				x: 640,
				y: 5_088,
				width: 192,
				height: 174,
				labelKey: 'content.maps.landmarks.hero-house-exterior.label'
			},
			{
				id: 'guild-hall-exterior',
				x: 1_600,
				y: 4_256,
				width: 256,
				height: 228,
				labelKey: 'content.maps.landmarks.guild-hall-exterior.label'
			},
			{
				id: 'item-shop-exterior',
				x: 2_240,
				y: 4_960,
				width: 192,
				height: 200,
				labelKey: 'content.maps.landmarks.item-shop-exterior.label'
			},
			{
				id: 'villager-house-1-exterior',
				x: 960,
				y: 4_480,
				width: 160,
				height: 178,
				labelKey: 'content.maps.landmarks.villager-house-1-exterior.label'
			},
			{
				id: 'villager-house-2-exterior',
				x: 1_460,
				y: 5_440,
				width: 160,
				height: 178,
				labelKey: 'content.maps.landmarks.villager-house-2-exterior.label'
			},
			{
				id: 'villager-house-3-exterior',
				x: 2_800,
				y: 4_480,
				width: 160,
				height: 178,
				labelKey: 'content.maps.landmarks.villager-house-3-exterior.label'
			}
		]);

		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expectEnglishMessage(landmark.labelKey);
			expect(landmark.width).toBeGreaterThan(32);
			expect(landmark.height).toBeGreaterThan(32);
			expect(landmark.x).toBeGreaterThanOrEqual(0);
			expect(landmark.y).toBeGreaterThanOrEqual(0);
			expect(landmark.x).toBeLessThan(meadowEntryMap.width * 32);
			expect(landmark.y).toBeLessThan(meadowEntryMap.height * 32);
		}
	});

	it('folds meadow combat into city route pockets instead of a separate forest arena', () => {
		expect(meadowEntryMap.forestZone).toBeUndefined();
		expect(meadowEntryMap.encounters).toEqual([
			{ id: 'meadow-slime-west', x: 3_200, y: 3_840, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-center', x: 4_128, y: 2_880, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-east', x: 5_120, y: 1_600, enemyId: 'slime-scout' }
		]);

		const encountersById = new Map(
			(meadowEntryMap.encounters ?? []).map((encounter) => [encounter.id, encounter])
		);

		for (const combatBounds of meadowEntryMap.combatBounds ?? []) {
			expectRectInsideMap(combatBounds);
			for (const encounterId of combatBounds.encounterIds) {
				const encounter = encountersById.get(encounterId);
				expect(encounter).toBeDefined();
				expectPointInsideRect(encounter!, combatBounds);
			}
		}
	});

	it('defines city route ground patches, blockers, fences, and forest dressing inside the meadow map bounds', () => {
		expect(meadowEntryMap.groundPatches).toEqual([
			{
				id: 'city-loop-south-road',
				x: 1_650,
				y: 5_200,
				width: 2_300,
				height: 160,
				tile: 'pathTile'
			},
			{
				id: 'city-loop-west-road',
				x: 640,
				y: 4_640,
				width: 160,
				height: 1_280,
				tile: 'pathTile'
			},
			{
				id: 'city-loop-north-road',
				x: 1_760,
				y: 4_256,
				width: 2_560,
				height: 160,
				tile: 'pathTile'
			},
			{
				id: 'city-loop-east-road',
				x: 2_880,
				y: 4_160,
				width: 160,
				height: 1_280,
				tile: 'pathTile'
			},
			{
				id: 'city-outskirts-road',
				x: 4_320,
				y: 2_640,
				width: 2_900,
				height: 160,
				tile: 'pathTile'
			},
			{
				id: 'city-ruins-road',
				x: 5_640,
				y: 1_760,
				width: 160,
				height: 1_760,
				tile: 'pathTile'
			},
			{
				id: 'city-west-combat-ground',
				x: 3_200,
				y: 3_840,
				width: 720,
				height: 512,
				tile: 'pathTile'
			},
			{
				id: 'city-center-combat-ground',
				x: 4_128,
				y: 2_880,
				width: 720,
				height: 512,
				tile: 'pathTile'
			},
			{
				id: 'city-east-combat-ground',
				x: 5_120,
				y: 1_600,
				width: 800,
				height: 512,
				tile: 'pathTile'
			}
		]);
		expect(meadowEntryMap.blockers).toEqual([
			{
				id: 'city-west-district-wall',
				x: 320,
				y: 4_960,
				width: 64,
				height: 1_600,
				kind: 'city-wall'
			},
			{
				id: 'city-south-district-wall',
				x: 1_600,
				y: 5_872,
				width: 2_560,
				height: 64,
				kind: 'city-wall'
			},
			{
				id: 'city-north-district-wall',
				x: 1_600,
				y: 3_936,
				width: 2_560,
				height: 64,
				kind: 'city-wall'
			},
			{
				id: 'city-east-district-wall-north',
				x: 3_200,
				y: 3_920,
				width: 64,
				height: 1_024,
				kind: 'city-wall'
			},
			{
				id: 'city-east-district-wall-south',
				x: 3_200,
				y: 5_280,
				width: 64,
				height: 960,
				kind: 'city-wall'
			},
			{
				id: 'city-outskirts-north-tree-line',
				x: 4_480,
				y: 2_160,
				width: 2_720,
				height: 96,
				kind: 'city-wall'
			},
			{
				id: 'city-outskirts-south-tree-line',
				x: 4_480,
				y: 3_120,
				width: 2_720,
				height: 96,
				kind: 'city-wall'
			},
			{
				id: 'city-ruins-approach-west-wall',
				x: 5_360,
				y: 1_760,
				width: 96,
				height: 1_760,
				kind: 'city-wall'
			},
			{
				id: 'city-ruins-approach-east-wall',
				x: 6_016,
				y: 1_760,
				width: 96,
				height: 1_760,
				kind: 'city-wall'
			}
		]);
		expect(meadowEntryMap.fences).toEqual([
			{ id: 'village-fence-south-west', x: 960, y: 5_648, width: 640, height: 32 },
			{ id: 'village-fence-south-east', x: 2_240, y: 5_648, width: 640, height: 32 },
			{ id: 'village-fence-west-north', x: 448, y: 4_512, width: 32, height: 736 },
			{ id: 'village-fence-west-south', x: 448, y: 5_360, width: 32, height: 384 },
			{ id: 'village-fence-east-north', x: 3_008, y: 4_448, width: 32, height: 640 },
			{ id: 'village-fence-east-south', x: 3_008, y: 5_280, width: 32, height: 512 }
		]);
		expect(meadowEntryMap.forestDecor).toEqual([
			{
				id: 'outskirts-tree-line-north',
				x: 4_480,
				y: 2_080,
				width: 2_560,
				height: 160,
				frameName: 'treeCluster'
			},
			{
				id: 'outskirts-tree-line-south',
				x: 4_480,
				y: 3_200,
				width: 2_560,
				height: 160,
				frameName: 'treeCluster'
			},
			{
				id: 'outskirts-brush-west-pocket',
				x: 3_200,
				y: 3_840,
				width: 560,
				height: 256,
				frameName: 'brush'
			},
			{
				id: 'outskirts-brush-center-pocket',
				x: 4_128,
				y: 2_880,
				width: 560,
				height: 256,
				frameName: 'brush'
			},
			{
				id: 'outskirts-brush-east-pocket',
				x: 5_120,
				y: 1_600,
				width: 640,
				height: 256,
				frameName: 'brush'
			}
		]);

		const ids = [
			...(meadowEntryMap.groundPatches ?? []).map((patch) => patch.id),
			...(meadowEntryMap.blockers ?? []).map((blocker) => blocker.id),
			...(meadowEntryMap.fences ?? []).map((fence) => fence.id),
			...(meadowEntryMap.forestDecor ?? []).map((decor) => decor.id)
		];
		expect(new Set(ids).size).toBe(ids.length);

		for (const patch of meadowEntryMap.groundPatches ?? []) {
			expectRectInsideMap(patch);
		}

		for (const blocker of meadowEntryMap.blockers ?? []) {
			expectRectInsideMap(blocker);
		}

		for (const fence of meadowEntryMap.fences ?? []) {
			expectRectInsideMap(fence);
		}

		for (const decor of meadowEntryMap.forestDecor ?? []) {
			expectRectInsideMap(decor);
		}
	});

	it('defines valid placed pickups with stable ids and item ids', () => {
		const pickups = Object.values(maps).flatMap((map) => map.pickups ?? []);

		expect(maps['meadow-entry'].pickups ?? []).toEqual([]);
		expect(maps['ruins-threshold'].pickups).toEqual([
			{ id: 'ruins-threshold-cap', x: 416, y: 352, itemId: 'iron-cap', quantity: 1 },
			{ id: 'ruins-threshold-rune', x: 576, y: 608, itemId: 'threshold-rune', quantity: 1 },
			{ id: 'ruins-threshold-salve', x: 320, y: 640, itemId: 'sunleaf-salve', quantity: 2 }
		]);
		expect(maps['ruins-core'].pickups).toEqual([
			{ id: 'ruins-core-mail', x: 448, y: 608, itemId: 'stone-mail', quantity: 1 },
			{ id: 'ruins-core-draught', x: 544, y: 352, itemId: 'ruin-draught', quantity: 1 }
		]);

		expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(pickups.length);

		for (const map of Object.values(maps)) {
			for (const pickup of map.pickups ?? []) {
				expect(getItem(pickup.itemId)).toBeDefined();
				expect(pickup.quantity).toBeGreaterThan(0);
				expect(pickup.x).toBeGreaterThanOrEqual(0);
				expect(pickup.y).toBeGreaterThanOrEqual(0);
				expect(pickup.x).toBeLessThan(map.width * 32);
				expect(pickup.y).toBeLessThan(map.height * 32);
			}
		}
	});

	it('defines valid multi-encounters with stable ids and enemy definitions', () => {
		const encounters = Object.values(maps).flatMap((map) => map.encounters ?? []);

		expect(maps['ruins-threshold'].encounters).toEqual([
			{ id: 'threshold-slime-west', x: 416, y: 480, enemyId: 'slime-scout' },
			{ id: 'threshold-slime-east', x: 576, y: 480, enemyId: 'slime-scout' }
		]);
		expect(maps['ruins-core'].encounters).toEqual([
			{ id: 'ruins-warden', x: 640, y: 480, enemyId: 'ruins-warden', completion: 'victory' }
		]);
		expect(new Set(encounters.map((encounter) => encounter.id)).size).toBe(encounters.length);

		for (const map of Object.values(maps)) {
			for (const encounter of map.encounters ?? []) {
				expect(enemies[encounter.enemyId]).toBeDefined();
				expect(encounter.x).toBeGreaterThanOrEqual(0);
				expect(encounter.y).toBeGreaterThanOrEqual(0);
				expect(encounter.x).toBeLessThan(map.width * 32);
				expect(encounter.y).toBeLessThan(map.height * 32);
			}
		}
	});
});
