import { describe, expect, it } from 'vitest';
import { meadowEntryMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point and hostile exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 64, y: 64 });
		expect(meadowEntryMap.transitions[0]).toMatchObject({
			toMapId: 'ruins-threshold',
			hostile: true
		});
	});
});
