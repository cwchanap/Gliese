import { describe, expect, it } from 'vitest';

import {
	SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID
} from './sundrop-village-backgrounds';
import {
	applySundropObstacleOwnership,
	SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP,
	validateSundropObstacleCoverage
} from './sundrop-village-obstacle-ownership';
import { meadowEntryMap, mergeRegions } from '$lib/game/content/maps/meadow-entry';
import { createLayeredRegionBackground } from '$lib/game/content/maps/layered/region-background';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import {
	SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY,
	SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_TEXTURE_KEY
} from './sundrop-village-backgrounds';

const finalBackgrounds = [
	createLayeredRegionBackground(sundropVillageLayered, {
		id: SUNDROP_VILLAGE_BASE_BACKGROUND_ID,
		textureKey: SUNDROP_VILLAGE_BASE_BACKGROUND_TEXTURE_KEY,
		plane: 'base'
	}),
	createLayeredRegionBackground(sundropVillageLayered, {
		id: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID,
		textureKey: SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_TEXTURE_KEY,
		plane: 'foreground'
	})
];

describe('Sundrop Village obstacle ownership', () => {
	it('locks the reviewed 21-entry ownership manifest', () => {
		expect(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP).toHaveLength(21);
		expect(new Set(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map((entry) => entry.blockerId)).size).toBe(
			21
		);
		expect(
			SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((entry) =>
				entry.ownerBackgroundIds.includes(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID)
			).map((entry) => entry.blockerId)
		).toEqual([
			'village-block-2-2',
			'village-block-2-49',
			'village-block-3-2',
			'corridor-wall-2b',
			'village-block-10-35',
			'village-block-19-2',
			'village-block-19-30'
		]);
		expect(
			SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter(
				(entry) => !entry.ownerBackgroundIds.includes(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID)
			)
		).toHaveLength(14);
		expect(
			Object.fromEntries(
				['hedge', 'low-wall', 'root-rock'].map((motif) => [
					motif,
					SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter((entry) => entry.motif === motif).length
				])
			)
		).toEqual({ hedge: 8, 'low-wall': 8, 'root-rock': 5 });
		expect(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map((entry) => entry.blockerId)).not.toEqual(
			expect.arrayContaining(['village-block-0-37', 'village-block-0-49', 'village-block-46-2'])
		);
		const blockersById = new Map(
			(meadowEntryMap.blockers ?? []).map((blocker) => [blocker.id, blocker])
		);
		const verticalHedgeAndWallIds = SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.filter(
			(entry) => entry.motif !== 'root-rock' && !entry.foregroundMargins
		).map((entry) => entry.blockerId);
		expect(verticalHedgeAndWallIds).toHaveLength(9);
		for (const blockerId of verticalHedgeAndWallIds) {
			const blocker = blockersById.get(blockerId);
			expect(blocker?.height).toBeGreaterThan(blocker?.width ?? Number.POSITIVE_INFINITY);
		}
	});

	it('resolves the connector only after regions are merged and stamps only manifest blockers', () => {
		expect(villageRegion.blockers?.some((blocker) => blocker.id === 'corridor-wall-2b')).toBe(
			false
		);
		const merged = mergeRegions([villageRegion, pathsRegion]);
		expect(merged.blockers.some((blocker) => blocker.id === 'corridor-wall-2b')).toBe(true);

		const applied = applySundropObstacleOwnership(meadowEntryMap.blockers ?? []);
		const selectedIds = new Set(SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP.map((entry) => entry.blockerId));
		for (const blocker of applied) {
			if (selectedIds.has(blocker.id)) {
				expect(blocker.visual).toMatchObject({ mode: 'fallback-only' });
			} else {
				expect(blocker.visual?.mode ?? 'always').toBe('always');
			}
		}
		expect(applied.find((blocker) => blocker.id === 'meadow-west-boundary')?.height).toBe(6_400);
	});

	it('rejects missing and duplicate ownership entries', () => {
		expect(() =>
			applySundropObstacleOwnership(
				(meadowEntryMap.blockers ?? []).filter((blocker) => blocker.id !== 'village-block-2-2')
			)
		).toThrow('village-block-2-2');
		expect(() =>
			applySundropObstacleOwnership(meadowEntryMap.blockers ?? [], [
				...SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP,
				SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP[0]
			])
		).toThrow('village-block-2-2');
	});

	it('validates full margin-expanded ownership coverage without clipping crop-edge extents', () => {
		const map = { blockers: meadowEntryMap.blockers, backgroundImages: finalBackgrounds };
		expect(() => validateSundropObstacleCoverage(map)).not.toThrow();
		expect(() =>
			validateSundropObstacleCoverage({
				blockers: meadowEntryMap.blockers,
				backgroundImages: finalBackgrounds.slice(0, 1)
			})
		).toThrow(SUNDROP_VILLAGE_FOREGROUND_BACKGROUND_ID);
		expect(() =>
			validateSundropObstacleCoverage(
				{
					blockers: [
						{
							id: 'crop-edge',
							x: finalBackgrounds[0].x - finalBackgrounds[0].width / 2,
							y: finalBackgrounds[0].y,
							width: 1,
							height: 1,
							kind: 'garden-hedge'
						}
					],
					backgroundImages: finalBackgrounds
				},
				[
					{
						...SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP[0],
						blockerId: 'crop-edge'
					}
				]
			)
		).toThrow('crop-edge');
	});
});
