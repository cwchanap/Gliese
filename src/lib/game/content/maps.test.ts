import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getItem } from '$lib/game/content/items';
import { getShop } from '$lib/game/content/shops';
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
	it('declares a village spawn, peaceful building doors, forest encounters, and ruins exit', () => {
		expect(meadowEntryMap.width).toBe(80);
		expect(meadowEntryMap.height).toBe(80);
		expect(meadowEntryMap.spawnDirection).toBe('down');
		expect(meadowEntryMap.spawn).toEqual({ x: 384, y: 1_376 });
		expect(meadowEntryMap.transitions).toEqual([
			{
				id: 'meadow-to-hero-house',
				x: 384,
				y: 1_344,
				toMapId: 'hero-house',
				showMarker: false,
				arrival: { x: 256, y: 224, facing: 'up' }
			},
			{
				id: 'meadow-to-guild-hall',
				x: 800,
				y: 1_136,
				toMapId: 'guild-hall',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-item-shop',
				x: 832,
				y: 1_504,
				toMapId: 'item-shop',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-1',
				x: 352,
				y: 1_048,
				toMapId: 'villager-house-1',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-2',
				x: 576,
				y: 1_592,
				toMapId: 'villager-house-2',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-villager-house-3',
				x: 1_056,
				y: 1_368,
				toMapId: 'villager-house-3',
				showMarker: false,
				arrival: { x: 256, y: 288, facing: 'up' }
			},
			{
				id: 'meadow-to-ruins-threshold',
				x: 2_304,
				y: 704,
				toMapId: 'ruins-threshold',
				requiresClear: true,
				questRequirement: {
					questId: 'investigate-the-ruins',
					objectiveId: 'talk-to-guild-master'
				},
				arrival: { x: 256, y: 480, facing: 'right' }
			}
		]);
		expect(meadowEntryMap.encounters).toEqual([
			{ id: 'meadow-slime-west', x: 1_664, y: 832, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-center', x: 2_016, y: 640, enemyId: 'slime-scout' },
			{ id: 'meadow-slime-east', x: 2_304, y: 512, enemyId: 'slime-scout' }
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
				arrival: { x: 384, y: 1_456, facing: 'down' }
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

	it('defines village NPCs with stable ids and bounded coordinates', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);
		const roles = ['guild', 'shopkeeper', 'villager', 'home'];

		expect(heroHouseMap.npcs ?? []).toEqual([]);
		expect(guildHallMap.npcs).toEqual([
			{
				id: 'guild-master',
				x: 192,
				y: 144,
				name: 'Guild Master Arlen',
				dialogue: 'The ruins are stirring again. Speak with me, then clear the warden.',
				role: 'guild',
				frameName: 'guildMasterNpc'
			},
			{
				id: 'guild-quartermaster',
				x: 352,
				y: 144,
				name: 'Quartermaster Vale',
				dialogue: 'Need field gear before the ruins? Guild stock is limited, but sturdy.',
				role: 'shopkeeper',
				frameName: 'quartermasterNpc',
				shopId: 'guild-quartermaster'
			}
		]);
		expect(itemShopMap.npcs).toEqual([
			{
				id: 'shopkeeper-mira',
				x: 256,
				y: 144,
				name: 'Mira',
				dialogue: 'Fresh tonics are on the shelf. The guild already stocked your field kit today.',
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
				expect(npc.name).not.toHaveLength(0);
				expect(npc.dialogue).not.toHaveLength(0);
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
		expect(meadowEntryMap.landmarks).toEqual([
			{
				id: 'hero-house-exterior',
				x: 384,
				y: 1_289,
				width: 192,
				height: 174,
				label: "Hero's House"
			},
			{ id: 'guild-hall-exterior', x: 800, y: 1_054, width: 256, height: 228, label: 'Guild' },
			{
				id: 'item-shop-exterior',
				x: 832,
				y: 1_436,
				width: 192,
				height: 200,
				label: 'Item Shop'
			},
			{
				id: 'villager-house-1-exterior',
				x: 352,
				y: 991,
				width: 160,
				height: 178,
				label: 'Villager Home'
			},
			{
				id: 'villager-house-2-exterior',
				x: 576,
				y: 1_535,
				width: 160,
				height: 178,
				label: 'Villager Home'
			},
			{
				id: 'villager-house-3-exterior',
				x: 1_056,
				y: 1_311,
				width: 160,
				height: 178,
				label: 'Villager Home'
			}
		]);

		for (const landmark of meadowEntryMap.landmarks ?? []) {
			expect(landmark.label).not.toHaveLength(0);
			expect(landmark.width).toBeGreaterThan(32);
			expect(landmark.height).toBeGreaterThan(32);
			expect(landmark.x).toBeGreaterThanOrEqual(0);
			expect(landmark.y).toBeGreaterThanOrEqual(0);
			expect(landmark.x).toBeLessThan(meadowEntryMap.width * 32);
			expect(landmark.y).toBeLessThan(meadowEntryMap.height * 32);
		}
	});

	it('keeps meadow enemies inside the bounded forest zone', () => {
		expect(meadowEntryMap.forestZone).toEqual({
			id: 'east-forest',
			x: 2_016,
			y: 544,
			width: 1_088,
			height: 832,
			aggroRadius: 240,
			leashRadius: 420
		});
		expectRectInsideMap(meadowEntryMap.forestZone!);

		for (const encounter of meadowEntryMap.encounters ?? []) {
			expectPointInsideRect(encounter, meadowEntryMap.forestZone!);
		}
	});

	it('defines village fences and forest dressing inside the meadow map bounds', () => {
		expect(meadowEntryMap.fences).toEqual([
			{ id: 'village-fence-north-west', x: 392, y: 848, width: 432, height: 32 },
			{ id: 'village-fence-north-east', x: 920, y: 848, width: 320, height: 32 },
			{ id: 'village-fence-west', x: 176, y: 1_296, width: 32, height: 832 },
			{ id: 'village-fence-south-west', x: 232, y: 1_744, width: 112, height: 32 },
			{ id: 'village-fence-south-center', x: 752, y: 1_744, width: 320, height: 32 },
			{ id: 'village-fence-south-east', x: 1_080, y: 1_744, width: 272, height: 32 },
			{ id: 'village-fence-east-north', x: 1_216, y: 1_024, width: 32, height: 320 },
			{ id: 'village-fence-east-south', x: 1_216, y: 1_568, width: 32, height: 352 }
		]);
		expect(meadowEntryMap.forestDecor).toEqual([
			{ id: 'forest-floor', x: 2_016, y: 544, width: 960, height: 704, frameName: 'forestFloor' },
			{
				id: 'forest-canopy-north',
				x: 2_016,
				y: 64,
				width: 1_088,
				height: 128,
				frameName: 'treeCluster'
			},
			{
				id: 'forest-canopy-south',
				x: 2_016,
				y: 1_024,
				width: 1_088,
				height: 128,
				frameName: 'treeCluster'
			},
			{
				id: 'forest-canopy-west',
				x: 1_408,
				y: 544,
				width: 128,
				height: 832,
				frameName: 'treeCluster'
			},
			{
				id: 'forest-canopy-east',
				x: 2_528,
				y: 544,
				width: 64,
				height: 832,
				frameName: 'treeCluster'
			},
			{
				id: 'forest-entrance',
				x: 1_472,
				y: 832,
				width: 160,
				height: 160,
				frameName: 'forestEntrance'
			},
			{
				id: 'forest-brush-clearing',
				x: 2_016,
				y: 704,
				width: 512,
				height: 192,
				frameName: 'brush'
			}
		]);

		const ids = [
			...(meadowEntryMap.fences ?? []).map((fence) => fence.id),
			...(meadowEntryMap.forestDecor ?? []).map((decor) => decor.id)
		];
		expect(new Set(ids).size).toBe(ids.length);

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
