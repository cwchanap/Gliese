import { describe, expect, it } from 'vitest';
import { meadowEntryMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point, opening encounter, and connected exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 64, y: 64 });
		expect(meadowEntryMap.encounters[0]).toMatchObject({
			enemyId: 'slime-scout'
		});
		expect(meadowEntryMap.transitions[0]).toMatchObject({
			toMapId: 'ruins-threshold'
		});
	});
});
