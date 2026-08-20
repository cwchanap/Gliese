import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_RIVER_SEGMENTS,
	MEADOW_ENTRY_V2_WORLD
} from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { rectContains, rectsOverlap, toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import { riverSystemRegion } from './river-system';

describe('Meadow river system', () => {
	it('keeps every crossing interior outside the watershed blockers', () => {
		for (const { rect: water } of MEADOW_ENTRY_V2_RIVER_SEGMENTS) {
			expect(rectContains(MEADOW_ENTRY_V2_WORLD, water)).toBe(true);
			for (const crossing of Object.values(MEADOW_ENTRY_V2_CROSSINGS)) {
				expect(rectsOverlap(water, crossing), `${water.x},${water.y} overlaps crossing`).toBe(
					false
				);
			}
		}
		for (const crossing of Object.values(MEADOW_ENTRY_V2_CROSSINGS)) {
			expect(rectContains(MEADOW_ENTRY_V2_WORLD, crossing)).toBe(true);
		}
	});

	it('keeps the crossing gaps and ferry approach dimensions exact', () => {
		expect(MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge.height).toBe(160);
		expect(MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge.height).toBe(192);
		expect(MEADOW_ENTRY_V2_CROSSINGS.sundropBridge.height).toBe(224);
		expect(MEADOW_ENTRY_V2_CROSSINGS.ferryApproach).toMatchObject({
			x: 3504,
			width: 208,
			height: 896
		});
		expect(
			3600 >= MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.x &&
				3600 <=
					MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.x + MEADOW_ENTRY_V2_CROSSINGS.ferryApproach.width
		).toBe(true);
	});

	it('compiles one matching sea patch and ocean blocker for every river segment', () => {
		const groundPatches = riverSystemRegion.groundPatches ?? [];
		const blockers = riverSystemRegion.blockers ?? [];
		const expectedGroundPatches = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect: bounds }) => ({
			...toMapRect(`${id}-water`, bounds),
			tile: 'seaTile' as const
		}));
		const expectedBlockers = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect: bounds }) => ({
			...toMapRect(`${id}-collision`, bounds),
			kind: 'ocean' as const
		}));

		expect(groundPatches.slice(0, expectedGroundPatches.length)).toEqual(expectedGroundPatches);
		expect(blockers).toEqual(expectedBlockers);
		for (const expected of expectedGroundPatches) {
			const blocker = blockers.find(
				(candidate) => candidate.id === expected.id.replace('-water', '-collision')
			);
			expect(blocker).toBeDefined();
			expect(blocker).toMatchObject({
				x: expected.x,
				y: expected.y,
				width: expected.width,
				height: expected.height
			});
		}
	});

	it('appends path patches for all crossings after the water patches', () => {
		const patches = riverSystemRegion.groundPatches ?? [];
		const crossingPatches = Object.entries(MEADOW_ENTRY_V2_CROSSINGS).map(([id, bounds]) => ({
			...toMapRect(`${id}-path`, bounds),
			tile: 'pathTile' as const
		}));
		expect(patches.slice(-crossingPatches.length)).toEqual(crossingPatches);
		for (const patch of crossingPatches) {
			expect(patch.tile).toBe('pathTile');
			expect(
				rectContains(MEADOW_ENTRY_V2_WORLD, {
					x: patch.x - patch.width / 2,
					y: patch.y - patch.height / 2,
					width: patch.width,
					height: patch.height
				})
			).toBe(true);
		}
	});

	it('keeps every authored river id unique', () => {
		const ids = [
			...MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id }) => id),
			...Object.keys(MEADOW_ENTRY_V2_CROSSINGS),
			...(riverSystemRegion.groundPatches ?? []).map(({ id }) => id),
			...(riverSystemRegion.blockers ?? []).map(({ id }) => id)
		];
		expect(new Set(ids).size).toBe(ids.length);
	});
});
