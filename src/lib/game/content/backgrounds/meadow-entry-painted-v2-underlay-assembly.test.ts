import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	assembleMeadowEntryPaintedV2Underlay,
	blendMeadowEntryAxisPairPixel,
	blendMeadowEntryOpaqueChannel,
	blendMeadowEntryDetailChannel,
	compositeMeadowEntryDetailPairCorrection,
	compositeMeadowEntryDetailPanel,
	compositeMeadowEntryDetailPanels,
	meadowEntryDetailFeatherWeight,
	meadowEntryDetailPairCorrectionLastInsetIndex,
	type MeadowEntryUnderlayDecodedPanel,
	type MeadowEntryUnderlayAssemblyInput
} from './meadow-entry-painted-v2-underlay-assembly';
import { decodeMeadowEntryRgba } from './meadow-entry-png';

import { MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS } from './meadow-entry-painted-v2-pilot';

function panel(id: string, bounds: PixelBounds, colour: number): MeadowEntryUnderlayDecodedPanel {
	const width = bounds.right - bounds.left;
	const height = bounds.bottom - bounds.top;
	const data = Buffer.alloc(width * height * 4);
	for (let offset = 0; offset < data.length; offset += 4) {
		data[offset] = colour;
		data[offset + 1] = colour;
		data[offset + 2] = colour;
		data[offset + 3] = 255;
	}
	return { id, bounds, rgba: { data, width, height } };
}

function rgbPanel(
	id: string,
	bounds: PixelBounds,
	rgb: readonly [number, number, number]
): MeadowEntryUnderlayDecodedPanel {
	const width = bounds.right - bounds.left;
	const height = bounds.bottom - bounds.top;
	const data = Buffer.alloc(width * height * 4);
	for (let offset = 0; offset < data.length; offset += 4) {
		data[offset] = rgb[0];
		data[offset + 1] = rgb[1];
		data[offset + 2] = rgb[2];
		data[offset + 3] = 255;
	}
	return { id, bounds, rgba: { data, width, height } };
}

function pixel(decoded: { data: Buffer; width: number }, x: number, y: number): number[] {
	const offset = (y * decoded.width + x) * 4;
	return [...decoded.data.subarray(offset, offset + 4)];
}

describe('Meadow Entry camera-safe underlay assembly', () => {
	it('pins the decoded RGBA bytes from the four checked-in underlay panels', async () => {
		const underlays = await Promise.all(
			MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.filter(({ role }) => role === 'underlay').map(
				async (source) => ({
					id: source.id,
					bounds: source.bounds,
					rgba: await decodeMeadowEntryRgba(await readFile(source.normalizedPath))
				})
			)
		);
		const result = await assembleMeadowEntryPaintedV2Underlay({
			width: 6400,
			height: 6400,
			panels: underlays,
			northSouthPairs: [
				{
					northId: 'camera-underlay-sundrop-north',
					southId: 'camera-underlay-sundrop-south',
					bounds: { left: 0, top: 4736, right: 3200, bottom: 4864 }
				},
				{
					northId: 'camera-underlay-crossroads-north',
					southId: 'camera-underlay-crossroads-south',
					bounds: { left: 2368, top: 3776, right: 5568, bottom: 3904 }
				}
			],
			familyHandoff: {
				sundropPanelIds: ['camera-underlay-sundrop-north', 'camera-underlay-sundrop-south'],
				crossroadsPanelIds: [
					'camera-underlay-crossroads-north',
					'camera-underlay-crossroads-south'
				],
				bounds: { left: 2368, top: 3200, right: 3200, bottom: 5440 }
			}
		});
		expect(createHash('sha256').update(result.data).digest('hex')).toBe(
			'9b6ff9c9b333297096442f42dd49efb9669c7b04044ff398b053a5d11a9d3f42'
		);
	});

	it('uses endpoint-preserving half-up integer blend rounding', () => {
		expect(blendMeadowEntryOpaqueChannel(10, 210, 0, 127)).toBe(10);
		expect(blendMeadowEntryOpaqueChannel(10, 210, 127, 127)).toBe(210);
		expect(blendMeadowEntryOpaqueChannel(0, 255, 63, 127)).toBe(126);
		expect(() => blendMeadowEntryOpaqueChannel(0, 255, 1, 0)).toThrow(/lastIndex/);
		expect(() => blendMeadowEntryOpaqueChannel(-1, 255, 1, 127)).toThrow(/channel/);
	});

	it('uses the approved 128px inward smoothstep feather and channel blend', () => {
		expect(meadowEntryDetailFeatherWeight(0)).toBe(0);
		expect(meadowEntryDetailFeatherWeight(63)).toBe(126);
		expect(meadowEntryDetailFeatherWeight(127)).toBe(255);
		expect(meadowEntryDetailFeatherWeight(128)).toBe(255);
		expect(blendMeadowEntryDetailChannel(10, 210, 126)).toBe(109);
		expect(() => meadowEntryDetailFeatherWeight(-1)).toThrow(/edgeDistance/);
		expect(() => meadowEntryDetailFeatherWeight(0, 0)).toThrow(/lastInsetIndex/);
	});

	it('keeps every detail perimeter equal to the prior composite and source cores exact', () => {
		const targetData = Buffer.alloc(255 * 255 * 4);
		const detailData = Buffer.alloc(255 * 255 * 4);
		for (let offset = 0; offset < targetData.length; offset += 4) {
			targetData[offset] = 10;
			targetData[offset + 1] = 20;
			targetData[offset + 2] = 30;
			targetData[offset + 3] = 255;
			detailData[offset] = 210;
			detailData[offset + 1] = 220;
			detailData[offset + 2] = 230;
			detailData[offset + 3] = 255;
		}
		const sourceBefore = Buffer.from(detailData);
		const target = { data: targetData, width: 255, height: 255 };
		const detail = {
			id: 'detail',
			bounds: { left: 0, top: 0, right: 255, bottom: 255 },
			rgba: { data: detailData, width: 255, height: 255 }
		};

		compositeMeadowEntryDetailPanel(target, detail);
		for (let index = 0; index < 255; index += 1) {
			expect(pixel(target, index, 0), `top edge ${index}`).toEqual([10, 20, 30, 255]);
			expect(pixel(target, index, 254), `bottom edge ${index}`).toEqual([10, 20, 30, 255]);
			expect(pixel(target, 0, index), `left edge ${index}`).toEqual([10, 20, 30, 255]);
			expect(pixel(target, 254, index), `right edge ${index}`).toEqual([10, 20, 30, 255]);
		}
		expect(pixel(target, 127, 127)).toEqual([210, 220, 230, 255]);
		expect(pixel(target, 63, 127)).toEqual([
			blendMeadowEntryDetailChannel(10, 210, 126),
			blendMeadowEntryDetailChannel(20, 220, 126),
			blendMeadowEntryDetailChannel(30, 230, 126),
			255
		]);
		expect(detailData).toEqual(sourceBefore);
	});

	it('feathers a later-priority detail over the already-composed current master', () => {
		const targetData = Buffer.alloc(5 * 5 * 4, 255);
		for (let offset = 0; offset < targetData.length; offset += 4) {
			targetData[offset] = 10;
			targetData[offset + 1] = 10;
			targetData[offset + 2] = 10;
		}
		const first = panel('first', { left: 0, top: 0, right: 3, bottom: 3 }, 0);
		const second = panel('second', { left: 1, top: 1, right: 4, bottom: 4 }, 200);
		const target = { data: targetData, width: 5, height: 5 };
		compositeMeadowEntryDetailPanel(target, first, 1);
		const currentAtSecondPerimeter = pixel(target, 1, 1);
		compositeMeadowEntryDetailPanel(target, second, 1);
		expect(pixel(target, 1, 1)).toEqual(currentAtSecondPerimeter);
		expect(pixel(target, 2, 2)).toEqual([200, 200, 200, 255]);
	});

	it('corrects a narrow axis pair without washing its midpoint or mutating sources', () => {
		const pairBounds = { left: 1, top: 1, right: 2625, bottom: 129 };
		const first = rgbPanel('sundrop-north', pairBounds, [10, 20, 30]);
		const second = rgbPanel('sundrop-south', pairBounds, [210, 220, 230]);
		const width = 2626;
		const height = 130;
		const targetData = Buffer.alloc(width * height * 4);
		for (let offset = 0; offset < targetData.length; offset += 4) {
			targetData[offset] = 7;
			targetData[offset + 1] = 8;
			targetData[offset + 2] = 9;
			targetData[offset + 3] = 10;
		}
		for (let y = pairBounds.top; y < pairBounds.bottom; y += 1) {
			for (let x = pairBounds.left; x < pairBounds.right; x += 1) {
				const offset = (y * width + x) * 4;
				targetData[offset] = 129;
				targetData[offset + 1] = 129;
				targetData[offset + 2] = 129;
				targetData[offset + 3] = 255;
			}
		}
		const beforeSources = [Buffer.from(first.rgba.data), Buffer.from(second.rgba.data)];
		const before = Buffer.from(targetData);
		const pair = {
			firstId: 'sundrop-north',
			secondId: 'sundrop-south',
			bounds: pairBounds,
			axis: 'y' as const
		};
		expect(meadowEntryDetailPairCorrectionLastInsetIndex(pairBounds)).toBe(63);
		expect(meadowEntryDetailFeatherWeight(0, 63)).toBe(0);
		expect(meadowEntryDetailFeatherWeight(63, 63)).toBe(255);
		const ordinaryWashedMidpoint = [129, 129, 129, 255];
		const target = { data: targetData, width, height };
		compositeMeadowEntryDetailPairCorrection(target, first, second, pair);

		for (let x = pairBounds.left; x < pairBounds.right; x += 1) {
			expect(pixel(target, x, pairBounds.top), `top edge ${x}`).toEqual(
				pixel({ data: before, width }, x, pairBounds.top)
			);
			expect(pixel(target, x, pairBounds.bottom - 1), `bottom edge ${x}`).toEqual(
				pixel({ data: before, width }, x, pairBounds.bottom - 1)
			);
		}
		for (let y = pairBounds.top; y < pairBounds.bottom; y += 1) {
			expect(pixel(target, pairBounds.left, y), `left edge ${y}`).toEqual(
				pixel({ data: before, width }, pairBounds.left, y)
			);
			expect(pixel(target, pairBounds.right - 1, y), `right edge ${y}`).toEqual(
				pixel({ data: before, width }, pairBounds.right - 1, y)
			);
		}
		const midpoint = pixel(target, 1313, 64);
		expect(midpoint).toEqual([109, 119, 129, 255]);
		expect(midpoint).not.toEqual(ordinaryWashedMidpoint);
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				if (
					x >= pairBounds.left &&
					x < pairBounds.right &&
					y >= pairBounds.top &&
					y < pairBounds.bottom
				)
					continue;
				expect(pixel(target, x, y), `outside ${x},${y}`).toEqual(
					pixel({ data: before, width }, x, y)
				);
			}
		}
		for (let y = pairBounds.top; y < pairBounds.bottom; y += 1) {
			for (let x = pairBounds.left; x < pairBounds.right; x += 1) {
				expect(pixel(target, x, y)[3]).toBe(255);
			}
		}
		expect(first.rgba.data).toEqual(beforeSources[0]);
		expect(second.rgba.data).toEqual(beforeSources[1]);

		const repeat = { data: Buffer.from(before), width, height };
		compositeMeadowEntryDetailPairCorrection(repeat, first, second, pair);
		expect(repeat.data).toEqual(target.data);
	});

	it('derives axis-pair endpoints with the shared helper', () => {
		expect(
			blendMeadowEntryAxisPairPixel(
				[10, 20, 30, 255],
				[210, 220, 230, 255],
				{ left: 0, top: 0, right: 4, bottom: 4 },
				'x',
				0,
				2
			)
		).toEqual([10, 20, 30, 255]);
		expect(
			blendMeadowEntryAxisPairPixel(
				[10, 20, 30, 255],
				[210, 220, 230, 255],
				{ left: 0, top: 0, right: 4, bottom: 4 },
				'x',
				3,
				2
			)
		).toEqual([210, 220, 230, 255]);
	});

	it('sorts ordinary detail panels by priority and rejects duplicate priorities', () => {
		const bounds = { left: 0, top: 0, right: 300, bottom: 300 };
		const panels = [
			{ ...panel('late', bounds, 50), assemblyPriority: 50 },
			{ ...panel('early', bounds, 10), assemblyPriority: 10 }
		];
		const target = { data: Buffer.alloc(300 * 300 * 4, 255), width: 300, height: 300 };
		compositeMeadowEntryDetailPanels(target, panels, []);
		expect(pixel(target, 150, 150)).toEqual([50, 50, 50, 255]);
		expect(() =>
			compositeMeadowEntryDetailPanels(
				{ data: Buffer.alloc(300 * 300 * 4, 255), width: 300, height: 300 },
				[
					{ ...panel('first', bounds, 10), assemblyPriority: 10 },
					{ ...panel('second', bounds, 20), assemblyPriority: 10 }
				],
				[]
			)
		).toThrow(/priority/i);
	});

	it('blends north/south family seams before the east/west handoff', async () => {
		const input: MeadowEntryUnderlayAssemblyInput = {
			width: 4,
			height: 4,
			panels: [
				panel('sundrop-north', { left: 0, top: 0, right: 3, bottom: 3 }, 0),
				panel('sundrop-south', { left: 0, top: 1, right: 3, bottom: 4 }, 100),
				panel('crossroads-north', { left: 1, top: 0, right: 4, bottom: 3 }, 200),
				panel('crossroads-south', { left: 1, top: 1, right: 4, bottom: 4 }, 250)
			],
			northSouthPairs: [
				{
					northId: 'sundrop-north',
					southId: 'sundrop-south',
					bounds: { left: 0, top: 1, right: 3, bottom: 3 }
				},
				{
					northId: 'crossroads-north',
					southId: 'crossroads-south',
					bounds: { left: 1, top: 1, right: 4, bottom: 3 }
				}
			],
			familyHandoff: {
				sundropPanelIds: ['sundrop-north', 'sundrop-south'],
				crossroadsPanelIds: ['crossroads-north', 'crossroads-south'],
				bounds: { left: 1, top: 0, right: 3, bottom: 4 }
			}
		};

		const result = await assembleMeadowEntryPaintedV2Underlay(input);
		const repeat = await assembleMeadowEntryPaintedV2Underlay(input);
		expect(repeat).toEqual(result);
		expect(pixel(result, 0, 0)).toEqual([0, 0, 0, 255]);
		expect(pixel(result, 0, 2)).toEqual([100, 100, 100, 255]);
		expect(pixel(result, 1, 2)).toEqual([100, 100, 100, 255]);
		expect(pixel(result, 2, 2)).toEqual([250, 250, 250, 255]);
		expect(pixel(result, 1, 3)).toEqual([100, 100, 100, 255]);
		expect(pixel(result, 2, 3)).toEqual([250, 250, 250, 255]);
		expect(pixel(result, 3, 3)).toEqual([250, 250, 250, 255]);
		expect(pixel(result, 3, 0)).toEqual([200, 200, 200, 255]);
		expect([...result.data.filter((_, index) => index % 4 === 3)]).toEqual(new Array(16).fill(255));
	});
});
