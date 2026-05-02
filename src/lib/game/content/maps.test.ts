import { describe, expect, it } from 'vitest';
import { meadowEntryMap, ruinsThresholdMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point, opening encounter, and connected exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 64, y: 64 });
		expect(meadowEntryMap.encounter).toMatchObject({
			enemyId: 'slime-scout'
		});
		expect(meadowEntryMap.transitions[0]).toMatchObject({
			toMapId: 'ruins-threshold'
		});
	});

	it('declares explicit arrival points for doorway returns', () => {
		expect(meadowEntryMap.transitions[0]).toMatchObject({
			toMapId: 'ruins-threshold',
			arrival: {
				x: 48,
				y: 96,
				facing: 'left'
			}
		});
		expect(ruinsThresholdMap.transitions[0]).toMatchObject({
			toMapId: 'meadow-entry',
			arrival: {
				x: 320,
				y: 96,
				facing: 'left'
			}
		});
	});
});
