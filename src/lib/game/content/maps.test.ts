import { describe, expect, it } from 'vitest';
import { meadowEntryMap, ruinsThresholdMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point, opening encounter, and connected exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 256, y: 1_280 });
		expect(meadowEntryMap.encounter).toMatchObject({
			x: 1_280,
			y: 1_280,
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
				x: 256,
				y: 480,
				facing: 'right'
			}
		});
		expect(ruinsThresholdMap.transitions[0]).toMatchObject({
			toMapId: 'meadow-entry',
			arrival: {
				x: 2_176,
				y: 1_280,
				facing: 'left'
			}
		});
	});
});
