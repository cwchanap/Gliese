import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	assembleMeadowEntryPaintedV2Underlay,
	blendMeadowEntryOpaqueChannel,
	blendMeadowEntryDetailChannel,
	compositeMeadowEntryDetailPanel,
	meadowEntryDetailFeatherWeight,
	type MeadowEntryUnderlayDecodedPanel,
	type MeadowEntryUnderlayAssemblyInput
} from './meadow-entry-painted-v2-underlay-assembly';

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

function pixel(decoded: { data: Buffer; width: number }, x: number, y: number): number[] {
	const offset = (y * decoded.width + x) * 4;
	return [...decoded.data.subarray(offset, offset + 4)];
}

describe('Meadow Entry camera-safe underlay assembly', () => {
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
