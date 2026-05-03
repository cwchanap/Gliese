import { describe, expect, it } from 'vitest';
import { enemies } from '$lib/game/content/enemies';
import { getItem } from '$lib/game/content/items';
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

describe('opening map content', () => {
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

	it('defines village NPCs with stable ids and bounded coordinates', () => {
		const npcs = Object.values(maps).flatMap((map) => map.npcs ?? []);
		const roles = ['guild', 'shopkeeper', 'villager', 'home'];

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
				expect(npc.name).not.toHaveLength(0);
				expect(npc.dialogue).not.toHaveLength(0);
				expect(roles).toContain(npc.role);
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
			expect(landmark.label).not.toHaveLength(0);
			expect(landmark.width).toBeGreaterThan(32);
			expect(landmark.height).toBeGreaterThan(32);
			expect(landmark.x).toBeGreaterThanOrEqual(0);
			expect(landmark.y).toBeGreaterThanOrEqual(0);
			expect(landmark.x).toBeLessThan(meadowEntryMap.width * 32);
			expect(landmark.y).toBeLessThan(meadowEntryMap.height * 32);
		}
	});

	it('keeps meadow enemies east of the village cluster', () => {
		expect(meadowEntryMap.encounters?.every((encounter) => encounter.x >= 1_500)).toBe(true);
	});

	it('defines valid placed pickups with stable ids and item ids', () => {
		const pickups = Object.values(maps).flatMap((map) => map.pickups ?? []);

		expect(maps['meadow-entry'].pickups).toEqual([
			{ id: 'meadow-entry-potion', x: 704, y: 1_248, itemId: 'field-potion', quantity: 2 },
			{ id: 'meadow-entry-charm', x: 960, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
			{ id: 'meadow-entry-token', x: 1_280, y: 1_152, itemId: 'meadow-token', quantity: 1 }
		]);
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
