import { describe, expect, it } from 'vitest';

import { maps } from '$lib/game/content/maps';
import {
	COMPLETE_WORLD_LAYOUT_DECISIONS,
	COMPLETE_WORLD_MAP_IDS,
	type CompleteWorldMapId
} from './complete-world-layout-foundation';

const EXPECTED_MAP_IDS = [
	'meadow-entry',
	'hero-house',
	'guild-hall',
	'item-shop',
	'villager-house-1',
	'villager-house-2',
	'villager-house-3',
	'shrine-of-aurora-interior',
	'blacksmith-interior',
	'ruins-threshold',
	'ruins-core'
] as const satisfies readonly CompleteWorldMapId[];

const EXPECTED_DECISIONS = {
	'meadow-entry': {
		action: 'change',
		reasonIds: ['continuous-watershed', 'crossing-route-network']
	},
	'hero-house': { action: 'preserve', reasonIds: ['existing-v2-room-program'] },
	'guild-hall': { action: 'preserve', reasonIds: ['existing-v2-room-program'] },
	'item-shop': { action: 'preserve', reasonIds: ['existing-v2-room-program'] },
	'villager-house-1': { action: 'preserve', reasonIds: ['existing-v2-room-program'] },
	'villager-house-2': { action: 'preserve', reasonIds: ['existing-v2-room-program'] },
	'villager-house-3': { action: 'preserve', reasonIds: ['existing-v2-room-program'] },
	'shrine-of-aurora-interior': {
		action: 'preserve',
		reasonIds: ['existing-v2-room-program']
	},
	'blacksmith-interior': { action: 'change', reasonIds: ['new-blacksmith-room-program'] },
	'ruins-threshold': { action: 'preserve', reasonIds: ['expanded-puzzle-shell'] },
	'ruins-core': { action: 'preserve', reasonIds: ['expanded-puzzle-shell'] }
} as const;

const STATEFUL_COLLECTIONS = [
	'transitions',
	'pickups',
	'encounters',
	'npcs',
	'landmarks',
	'ambientNpcs',
	'discoveries',
	'combatBounds'
] as const;

describe('complete world layout foundation', () => {
	it('freezes the exact eleven-map decision inventory', () => {
		expect(COMPLETE_WORLD_MAP_IDS).toEqual(EXPECTED_MAP_IDS);
		expect(COMPLETE_WORLD_LAYOUT_DECISIONS).toEqual(EXPECTED_DECISIONS);
		expect(Object.isFrozen(COMPLETE_WORLD_LAYOUT_DECISIONS)).toBe(true);
		for (const mapId of COMPLETE_WORLD_MAP_IDS) {
			expect(Object.isFrozen(COMPLETE_WORLD_LAYOUT_DECISIONS[mapId])).toBe(true);
			expect(Object.isFrozen(COMPLETE_WORLD_LAYOUT_DECISIONS[mapId].reasonIds)).toBe(true);
		}
	});

	it('matches the registered map inventory without duplicate stateful ids', () => {
		expect(Object.keys(maps).sort()).toEqual([...EXPECTED_MAP_IDS].sort());

		for (const map of Object.values(maps)) {
			for (const collection of STATEFUL_COLLECTIONS) {
				const ids = (map[collection] ?? []).map((item) => item.id);
				expect(new Set(ids).size, `${map.id}:${collection}`).toBe(ids.length);
			}
		}
	});
});
