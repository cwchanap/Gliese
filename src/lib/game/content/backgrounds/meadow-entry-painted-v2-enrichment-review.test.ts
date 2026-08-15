import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MEDIAN_FLOOR,
	MEADOW_ENTRY_PAINTED_V2_DECORATION_CANDIDATE_MINIMUM_FLOOR,
	assertMeadowEntryPaintedV2DecorationEnergy,
	buildMeadowEntryPaintedV2DecorationEligibility,
	collectMeadowEntryPaintedV2DecorationTiles,
	measureMeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecorationEnergy,
	type MeadowEntryPaintedV2DecorationEligibilityInput
} from './meadow-entry-painted-v2-enrichment-review';
import type { MeadowEntryPaintedV2SceneryMaskSet } from './meadow-entry-painted-v2-scenery-bake';

function input(
	overrides: Partial<MeadowEntryPaintedV2DecorationEligibilityInput> = {}
): MeadowEntryPaintedV2DecorationEligibilityInput {
	const width = overrides.width ?? 8;
	const height = overrides.height ?? 8;
	const pixels = width * height;
	const empty = new Uint8Array(pixels);
	return {
		width,
		height,
		tileSizePx: overrides.tileSizePx ?? 4,
		cropUnion: overrides.cropUnion ?? [{ left: 0, top: 0, right: width, bottom: height }],
		sceneryMasks: overrides.sceneryMasks ?? {
			width: width as 6400,
			height: height as 6400,
			otherProtected: empty,
			groundAllowed: new Uint8Array(pixels).fill(1),
			sceneryAllowed: new Uint8Array(pixels),
			hedgeAllowed: new Uint8Array(pixels),
			woodlandAllowed: new Uint8Array(pixels),
			sourceHashes: { synthetic: 'a'.repeat(64) }
		},
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

function sceneryMasks(width: number, height: number): MeadowEntryPaintedV2SceneryMaskSet {
	const pixels = width * height;
	const groundAllowed = new Uint8Array(pixels).fill(1);
	const sceneryAllowed = new Uint8Array(pixels);
	const hedgeAllowed = new Uint8Array(pixels);
	const woodlandAllowed = new Uint8Array(pixels);
	for (let index = 0; index < pixels; index += 1) {
		sceneryAllowed[index] = index % 2;
		hedgeAllowed[index] = index % 2;
		woodlandAllowed[index] = 0;
	}
	return {
		width: width as 6400,
		height: height as 6400,
		otherProtected: new Uint8Array(pixels),
		groundAllowed,
		sceneryAllowed,
		hedgeAllowed,
		woodlandAllowed,
		sourceHashes: { synthetic: 'a'.repeat(64) }
	} as MeadowEntryPaintedV2SceneryMaskSet;
}

describe('Meadow Entry painted-v2 decoration eligibility', () => {
	it('uses the catalog mask ground raster as eligible without retaining a union mask', () => {
		const pixels = 8 * 8;
		const groundAllowed = new Uint8Array(pixels).fill(1);
		const sceneryAllowed = new Uint8Array(pixels);
		const hedgeAllowed = new Uint8Array(pixels);
		const woodlandAllowed = new Uint8Array(pixels);
		const otherProtected = new Uint8Array(pixels);
		const masks = {
			width: 8 as 6400,
			height: 8 as 6400,
			otherProtected,
			groundAllowed,
			sceneryAllowed,
			hedgeAllowed,
			woodlandAllowed,
			sourceHashes: { synthetic: 'a'.repeat(64) }
		} as MeadowEntryPaintedV2SceneryMaskSet;
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({ sceneryMasks: masks })
		);

		expect(eligibility.eligible).toBe(groundAllowed);
		expect('selectedBlockers' in eligibility).toBe(false);
		expect('decorationAllowed' in eligibility).toBe(false);
	});

	it('clips crop union with half-open bounds and uses the catalog ground raster verbatim', () => {
		const groundAllowed = new Uint8Array(8 * 8).fill(1);
		groundAllowed[0] = 0;
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({
				cropUnion: [
					{ left: 0, top: 0, right: 2, bottom: 1 },
					{ left: 2, top: 1, right: 5, bottom: 2 }
				],
				sceneryMasks: {
					...sceneryMasks(8, 8),
					groundAllowed
				}
			})
		);

		expect(eligibility.insideCropUnion[0]).toBe(1);
		expect(eligibility.insideCropUnion[1]).toBe(1);
		expect(eligibility.insideCropUnion[2]).toBe(0);
		expect(eligibility.insideCropUnion[8 + 2]).toBe(1);
		expect(eligibility.insideCropUnion[8 + 5]).toBe(0);
		expect(eligibility.eligible[0]).toBe(0);
		expect(eligibility.eligible).toBe(groundAllowed);
		expect(eligibility.eligible[0]).toBe(0);
	});

	it('retains a tile at exactly 50 percent and rejects one pixel below', () => {
		const firstEligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({
				width: 4,
				height: 4,
				sceneryMasks: {
					...sceneryMasks(4, 4),
					groundAllowed: new Uint8Array(16).fill(1)
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

	it('exposes named scenery masks and hashes without changing the 67-row energy contract', () => {
		const named = sceneryMasks(8, 8);
		const eligibility = buildMeadowEntryPaintedV2DecorationEligibility(
			input({ sceneryMasks: named })
		);
		const tiles = collectMeadowEntryPaintedV2DecorationTiles(eligibility);
		const energy = measureMeadowEntryPaintedV2DecorationEnergy(
			{
				width: 8,
				height: 8,
				data: Buffer.alloc(8 * 8 * 4, 255)
			},
			eligibility,
			tiles
		);

		expect(eligibility.groundAllowed).toEqual(eligibility.eligible);
		expect(eligibility.otherProtected).toEqual(named.otherProtected);
		expect(eligibility.hedgeAllowed).toEqual(named.hedgeAllowed);
		expect(eligibility.woodlandAllowed).toEqual(named.woodlandAllowed);
		expect(eligibility.sceneryAllowed).toEqual(named.sceneryAllowed);
		expect(eligibility.sourceHashes).toEqual(named.sourceHashes);
		expect(tiles.map(({ bounds }) => bounds)).toEqual(
			collectMeadowEntryPaintedV2DecorationTiles(
				buildMeadowEntryPaintedV2DecorationEligibility(input())
			).map(({ bounds }) => bounds)
		);
		expect(energy.qualifyingTileCount).toBe(4);
	});
});
