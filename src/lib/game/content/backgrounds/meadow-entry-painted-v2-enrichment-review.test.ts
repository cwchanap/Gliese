import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR,
	MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR,
	assertMeadowEntryPaintedV2DecorationEnergy,
	buildMeadowEntryPaintedV2DecorationEligibility,
	collectMeadowEntryPaintedV2DecorationTiles,
	measureMeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecodedAlphaMask,
	type MeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecorationEligibilityInput
} from './meadow-entry-painted-v2-enrichment-review';

function mask(width: number, height: number, fill = 0): MeadowEntryPaintedV2DecodedAlphaMask {
	return { width, height, alpha: Buffer.alloc(width * height, fill) };
}

function input(
	overrides: Partial<MeadowEntryPaintedV2DecorationEligibilityInput> = {}
): MeadowEntryPaintedV2DecorationEligibilityInput {
	const width = overrides.width ?? 8;
	const height = overrides.height ?? 8;
	const empty = mask(width, height);
	return {
		width,
		height,
		tileSizePx: overrides.tileSizePx ?? 4,
		cropUnion: overrides.cropUnion ?? [{ left: 0, top: 0, right: width, bottom: height }],
		masks: overrides.masks ?? {
			protectedLive: empty,
			buildingFootprint: empty,
			entranceTransition: empty,
			rewardDiscovery: empty,
			semanticAnchor: empty
		},
		terrainRects: overrides.terrainRects ?? [],
		...overrides
	};
}

function energyResult(overrides: Partial<MeadowEntryPaintedV2DecorationEnergy> = {}) {
	return {
		tileSizePx: 512,
		qualifyingTileCount: 67,
		sheetTileCounts: [16, 16, 16, 16, 3],
		candidateMinimumFloor: MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR,
		candidateMedianFloor: MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR,
		minimumRgbStep: 1.5,
		medianRgbStep: MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR,
		tiles: [],
		...overrides
	} satisfies MeadowEntryPaintedV2DecorationEnergy;
}

describe('Meadow Entry painted-v2 decoration eligibility', () => {
	it('clips crop union with half-open bounds and subtracts every control alpha', () => {
		const masks = {
			protectedLive: mask(8, 8),
			buildingFootprint: mask(8, 8),
			entranceTransition: mask(8, 8),
			rewardDiscovery: mask(8, 8),
			semanticAnchor: mask(8, 8)
		};
		masks.protectedLive.alpha[0] = 255;
		masks.buildingFootprint.alpha[1] = 255;
		masks.entranceTransition.alpha[8 + 2] = 255;
		masks.rewardDiscovery.alpha[8 + 3] = 255;
		masks.semanticAnchor.alpha[8 + 4] = 255;
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({
				cropUnion: [
					{ left: 0, top: 0, right: 2, bottom: 1 },
					{ left: 2, top: 1, right: 5, bottom: 2 }
				],
				masks
			})
		);

		expect(eligibility.insideCropUnion[0]).toBe(1);
		expect(eligibility.insideCropUnion[1]).toBe(1);
		expect(eligibility.insideCropUnion[2]).toBe(0);
		expect(eligibility.insideCropUnion[8 + 2]).toBe(1);
		expect(eligibility.insideCropUnion[8 + 5]).toBe(0);
		expect(eligibility.eligible[0]).toBe(0);
		expect(eligibility.eligible[1]).toBe(0);
		expect(eligibility.eligible[8 + 2]).toBe(0);
		expect(eligibility.eligible[8 + 3]).toBe(0);
		expect(eligibility.eligible[8 + 4]).toBe(0);
	});

	it('insets terrain rectangles once with the exported protection margins', () => {
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({
				width: 100,
				height: 100,
				cropUnion: [{ left: 0, top: 0, right: 100, bottom: 100 }],
				terrainRects: [
					{ left: 0, top: 0, right: 100, bottom: 100 },
					{ left: 0, top: 0, right: 48, bottom: 48 }
				]
			})
		);

		expect(eligibility.routeCoreRects).toEqual([{ left: 16, top: 32, right: 84, bottom: 84 }]);
		expect(eligibility.routeCore[32 * 100 + 16]).toBe(1);
		expect(eligibility.routeCore[31 * 100 + 16]).toBe(0);
		expect(eligibility.routeCore[32 * 100 + 15]).toBe(0);
	});

	it('retains a tile at exactly 50 percent and rejects one pixel below', () => {
		const firstEligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({
				width: 4,
				height: 4,
				masks: {
					protectedLive: mask(4, 4),
					buildingFootprint: mask(4, 4),
					entranceTransition: mask(4, 4),
					rewardDiscovery: mask(4, 4),
					semanticAnchor: mask(4, 4)
				}
			})
		);
		firstEligibility.eligible.fill(0);
		firstEligibility.eligible.fill(1, 0, 8);
		const exactlyHalf = collectMeadowEntryPaintedV2DecorationTiles(firstEligibility);
		expect(exactlyHalf).toHaveLength(1);

		firstEligibility.eligible[0] = 0;
		expect(collectMeadowEntryPaintedV2DecorationTiles(firstEligibility)).toHaveLength(0);
	});

	it('orders rows deterministically and partitions qualifying tiles into 16/16/16/16/3 sheets', () => {
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({ width: 24, height: 48, tileSizePx: 4 })
		);
		eligibility.eligible.fill(1);
		for (let y = 40; y < 44; y += 1) {
			for (let x = 16; x < 24; x += 1) eligibility.eligible[y * 24 + x] = 0;
		}
		for (let y = 44; y < 48; y += 1) {
			for (let x = 12; x < 24; x += 1) eligibility.eligible[y * 24 + x] = 0;
		}
		const tiles = collectMeadowEntryPaintedV2DecorationTiles(eligibility);
		expect(tiles.map(({ row, column }) => [row, column])).toEqual(
			[...tiles]
				.sort((a, b) => a.row - b.row || a.column - b.column)
				.map(({ row, column }) => [row, column])
		);
		expect(tiles.map(({ sheetIndex }) => sheetIndex).filter((value) => value === 0)).toHaveLength(
			16
		);
		expect(tiles.map(({ sheetIndex }) => sheetIndex).filter((value) => value === 1)).toHaveLength(
			16
		);
		expect(tiles.map(({ sheetIndex }) => sheetIndex).filter((value) => value === 2)).toHaveLength(
			16
		);
		expect(tiles.map(({ sheetIndex }) => sheetIndex).filter((value) => value === 3)).toHaveLength(
			16
		);
		expect(tiles.map(({ sheetIndex }) => sheetIndex).filter((value) => value === 4)).toHaveLength(
			3
		);
		expect(tiles.slice(-3).map(({ row, column }) => [row, column])).toEqual([
			[11, 0],
			[11, 1],
			[11, 2]
		]);
	});

	it('measures RGB step over eligible right/down pairs only', () => {
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({ width: 2, height: 2, tileSizePx: 2 })
		);
		eligibility.eligible.fill(1);
		const tiles = collectMeadowEntryPaintedV2DecorationTiles(eligibility);
		const image = {
			width: 2,
			height: 2,
			data: Buffer.from([0, 0, 0, 255, 3, 6, 9, 255, 6, 12, 18, 255, 9, 18, 27, 255])
		};
		const result = measureMeadowEntryPaintedV2DecorationEnergy(image, eligibility, tiles);
		expect(result.tiles[0]?.rgbStep).toBe(9);
		expect(result.tiles[0]?.pairCount).toBe(4);
	});

	it('fails minimum and nearest-rank median gates independently', () => {
		expect(() =>
			assertMeadowEntryPaintedV2DecorationEnergy(
				energyResult({ minimumRgbStep: 1.499999999, medianRgbStep: 4 })
			)
		).toThrow(/minimum/);
		expect(() =>
			assertMeadowEntryPaintedV2DecorationEnergy(
				energyResult({ minimumRgbStep: 2, medianRgbStep: 3.18 })
			)
		).toThrow(/median/);
	});

	it('fails closed when a candidate has the legacy non-67 row count', () => {
		expect(() =>
			assertMeadowEntryPaintedV2DecorationEnergy(
				energyResult({ qualifyingTileCount: 60, sheetTileCounts: [16, 16, 16, 12] })
			)
		).toThrow(/exactly 67/);
	});

	it('is byte-deterministic for repeated eligibility and energy measurements', () => {
		const build = () => {
			const result = buildMeadowEntryPaintedV2DecorationEligibility(input());
			return {
				eligibility: result,
				tiles: collectMeadowEntryPaintedV2DecorationTiles(result)
			};
		};
		expect(JSON.stringify(build())).toBe(JSON.stringify(build()));
	});
});
