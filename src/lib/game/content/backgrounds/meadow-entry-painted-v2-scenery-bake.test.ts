import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	blendMeadowEntryDetailChannel,
	meadowEntryDetailFeatherWeight,
	type MeadowEntryDetailDecodedPanel,
	type MeadowEntryUnderlayDecodedPanel
} from './meadow-entry-painted-v2-underlay-assembly';
import { MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS } from './meadow-entry-painted-v2-scenery';
import {
	erodeMeadowEntryMask8,
	enrichMeadowEntryPaintedV2Sources,
	meadowEntrySceneryInsetDistances,
	type DecodedMeadowEntryPaintedV2SceneryInsert,
	type MeadowEntryPaintedV2SceneryMaskSet
} from './meadow-entry-painted-v2-scenery-bake';

function bounds(left: number, top: number, right: number, bottom: number): PixelBounds {
	return { left, top, right, bottom };
}

function offset(width: number, x: number, y: number): number {
	return y * width + x;
}

function rgbaOffset(width: number, x: number, y: number): number {
	return offset(width, x, y) * 4;
}

function filledRgba(width: number, height: number, rgb: readonly [number, number, number]): Buffer {
	const data = Buffer.alloc(width * height * 4);
	for (let index = 0; index < width * height; index += 1) {
		data[index * 4] = rgb[0];
		data[index * 4 + 1] = rgb[1];
		data[index * 4 + 2] = rgb[2];
		data[index * 4 + 3] = 255;
	}
	return data;
}

function panel(
	id: string,
	width: number,
	height: number,
	rgb: readonly [number, number, number]
): MeadowEntryDetailDecodedPanel {
	return {
		id,
		bounds: bounds(0, 0, width, height),
		rgba: { width, height, data: filledRgba(width, height, rgb) },
		assemblyPriority: id === 'crossroads' ? 50 : id.startsWith('camera-underlay') ? 1 : 10
	};
}

function mask(width: number, height: number, fill = 0): Uint8Array {
	return new Uint8Array(width * height).fill(fill);
}

function syntheticMasks(width: number, height: number): MeadowEntryPaintedV2SceneryMaskSet {
	const selectedBlockers = mask(width, height);
	const otherProtected = mask(width, height);
	const groundAllowed = mask(width, height, 1);
	const sceneryAllowed = mask(width, height);
	const hedgeAllowed = mask(width, height);
	const woodlandAllowed = mask(width, height);
	const decorationAllowed = mask(width, height);

	for (let y = 1; y < height - 1; y += 1) {
		for (let x = 1; x < width - 1; x += 1) {
			const index = offset(width, x, y);
			sceneryAllowed[index] = 1;
			hedgeAllowed[index] = 1;
		}
	}
	for (let y = Math.max(4, height - 8); y < height - 2; y += 1) {
		for (let x = Math.max(4, width - 8); x < width - 2; x += 1) {
			const index = offset(width, x, y);
			hedgeAllowed[index] = 0;
			woodlandAllowed[index] = 1;
		}
	}
	const protectedOffset = offset(width, 1, 1);
	otherProtected[protectedOffset] = 1;
	sceneryAllowed[protectedOffset] = 0;
	hedgeAllowed[protectedOffset] = 1;
	const outsideOffset = offset(width, width - 2, 2);
	sceneryAllowed[outsideOffset] = 0;
	hedgeAllowed[outsideOffset] = 1;
	for (let index = 0; index < decorationAllowed.length; index += 1) {
		decorationAllowed[index] = groundAllowed[index] === 1 || sceneryAllowed[index] === 1 ? 1 : 0;
	}

	return {
		width: width as 6400,
		height: height as 6400,
		selectedBlockers,
		otherProtected,
		groundAllowed,
		sceneryAllowed,
		hedgeAllowed,
		woodlandAllowed,
		decorationAllowed,
		sourceHashes: { synthetic: createHash('sha256').update('synthetic').digest('hex') }
	} as MeadowEntryPaintedV2SceneryMaskSet;
}

function decodedInserts(width: number, height: number): DecodedMeadowEntryPaintedV2SceneryInsert[] {
	return MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) => ({
		id: insert.id,
		sceneryClass: insert.sceneryClass,
		owningSourceId: insert.owningSourceId,
		bounds: bounds(0, 0, width, height),
		rgba: {
			width,
			height,
			data:
				insert.sceneryClass === 'hedge'
					? filledRgba(width, height, [240 - index, 40 + index, 30])
					: filledRgba(width, height, [30, 70 + index, 230 - index])
		}
	}));
}

function affectedPanels(width: number, height: number): MeadowEntryDetailDecodedPanel[] {
	return [
		panel('camera-underlay-sundrop-south', width, height, [10, 20, 30]),
		panel('camera-underlay-crossroads-north', width, height, [40, 50, 60]),
		panel('camera-underlay-crossroads-south', width, height, [70, 80, 90]),
		panel('crossroads', width, height, [100, 110, 120]),
		panel('sundrop-north', width, height, [130, 140, 150])
	];
}

function clonePanels(
	panels: readonly MeadowEntryDetailDecodedPanel[]
): MeadowEntryDetailDecodedPanel[] {
	return panels.map((item) => ({
		...item,
		bounds: { ...item.bounds },
		rgba: { ...item.rgba, data: Buffer.from(item.rgba.data) }
	}));
}

describe('Meadow Entry painted-v2 scenery bake primitives', () => {
	it('performs exact repeated 8-neighbor erosion without mutating the source', () => {
		const width = 9;
		const height = 9;
		const source = mask(width, height);
		for (let y = 1; y < height - 1; y += 1) {
			for (let x = 1; x < width - 1; x += 1) source[offset(width, x, y)] = 1;
		}
		source[offset(width, 4, 4)] = 0;
		const snapshot = source.slice();
		const first = erodeMeadowEntryMask8(source, width, height);
		const second = erodeMeadowEntryMask8(first, width, height);

		expect(source).toEqual(snapshot);
		expect(first[offset(width, 1, 1)]).toBe(0);
		expect(first[offset(width, 2, 2)]).toBe(1);
		expect(first[offset(width, 3, 3)]).toBe(0);
		expect(second[offset(width, 2, 2)]).toBe(0);
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const at = offset(width, x, y);
				if (first[at] !== 1) continue;
				for (let dy = -1; dy <= 1; dy += 1) {
					for (let dx = -1; dx <= 1; dx += 1) {
						const nx = x + dx;
						const ny = y + dy;
						expect(nx >= 0 && nx < width && ny >= 0 && ny < height).toBe(true);
						expect(source[offset(width, nx, ny)]).toBe(1);
					}
				}
			}
		}
	});

	it('reports zero at outer and hole edges, caps at fifteen, and shares the feather formula', () => {
		const width = 40;
		const height = 40;
		const classAllowed = mask(width, height);
		for (let y = 1; y < height - 1; y += 1) {
			for (let x = 1; x < width - 1; x += 1) classAllowed[offset(width, x, y)] = 1;
		}
		classAllowed[offset(width, 2, 2)] = 0;
		const distances = meadowEntrySceneryInsetDistances(classAllowed, width, height);

		expect(distances[offset(width, 1, 1)]).toBe(0);
		expect(distances[offset(width, 1, 2)]).toBe(0);
		expect(distances[offset(width, 20, 20)]).toBe(15);
		expect(distances[offset(width, 0, 0)]).toBe(0);
		expect(distances[offset(width, width - 2, height - 1)]).toBe(0);
		expect(distances[offset(width, width - 1, height - 2)]).toBe(0);
		expect(meadowEntryDetailFeatherWeight(distances[offset(width, 20, 20)]!, 15)).toBe(255);
		expect(meadowEntryDetailFeatherWeight(distances[offset(width, 1, 1)]!, 15)).toBe(0);
	});

	it('validates all seven insert rows before reading any source pixels', () => {
		const width = 8;
		const height = 8;
		const panels = affectedPanels(width, height);
		const masks = syntheticMasks(width, height);
		const inserts = decodedInserts(width, height);
		const missing = inserts.slice(1);
		expect(() => enrichMeadowEntryPaintedV2Sources(panels, missing, masks)).toThrow(
			/coverage|insert|seven/i
		);

		const extra = [...inserts, { ...inserts[0]!, id: 'extra-insert' }];
		expect(() => enrichMeadowEntryPaintedV2Sources(panels, extra, masks)).toThrow(
			/coverage|insert|seven/i
		);
	});

	it('blends source-local scenery with class precedence and leaves protected/wrong-class pixels exact', () => {
		const width = 40;
		const height = 40;
		const panels = affectedPanels(width, height);
		const before = clonePanels(panels);
		const masks = syntheticMasks(width, height);
		const inserts = decodedInserts(width, height);
		const result = enrichMeadowEntryPaintedV2Sources(panels, inserts, masks);

		expect(result.panels).toHaveLength(panels.length);
		expect(result.panels[4]).toBe(panels[4]);
		for (const id of [
			'camera-underlay-sundrop-south',
			'camera-underlay-crossroads-north',
			'camera-underlay-crossroads-south',
			'crossroads'
		]) {
			const original = before.find((item) => item.id === id)!;
			const enriched = result.panels.find((item) => item.id === id)!;
			expect(enriched).not.toBe(original);
			expect(enriched.rgba.data).not.toBe(original.rgba.data);
			const protectedAt = rgbaOffset(width, 1, 1);
			const outsideAt = rgbaOffset(width, width - 2, 2);
			expect(enriched.rgba.data.subarray(protectedAt, protectedAt + 4)).toEqual(
				original.rgba.data.subarray(protectedAt, protectedAt + 4)
			);
			expect(enriched.rgba.data.subarray(outsideAt, outsideAt + 4)).toEqual(
				original.rgba.data.subarray(outsideAt, outsideAt + 4)
			);
			expect(enriched.rgba.data[rgbaOffset(width, 20, 20) + 3]).toBe(255);
		}

		const original = before[0]!.rgba.data;
		const enriched = result.panels[0]!.rgba.data;
		const center = rgbaOffset(width, 20, 20);
		const hedgeDistances = meadowEntrySceneryInsetDistances(masks.hedgeAllowed, width, height);
		const expectedWeight = meadowEntryDetailFeatherWeight(
			hedgeDistances[offset(width, 20, 20)]!,
			15
		);
		expect(enriched[center]).toBe(
			blendMeadowEntryDetailChannel(original[center]!, 240, expectedWeight)
		);
		expect(result.changedPixelCount).toBeGreaterThan(0);
		expect(result.classChangedPixelCounts.hedge).toBeGreaterThan(0);
		expect(result.classChangedPixelCounts.woodland).toBeGreaterThan(0);
		expect(Object.keys(result.enrichedSourceSha256).sort()).toEqual([
			'camera-underlay-crossroads-north',
			'camera-underlay-crossroads-south',
			'camera-underlay-sundrop-south',
			'crossroads'
		]);
		for (const [id, hash] of Object.entries(result.enrichedSourceSha256)) {
			const source = result.panels.find((item) => item.id === id)!;
			expect(hash).toBe(createHash('sha256').update(source.rgba.data).digest('hex'));
		}
	});

	it('is byte-deterministic and applying disjoint classes in reverse order cannot change output', () => {
		const width = 40;
		const height = 40;
		const panels = affectedPanels(width, height);
		const masks = syntheticMasks(width, height);
		const inserts = decodedInserts(width, height);
		const first = enrichMeadowEntryPaintedV2Sources(panels, inserts, masks);
		const second = enrichMeadowEntryPaintedV2Sources(panels, [...inserts].reverse(), masks);
		expect(first.changedPixelCount).toBe(second.changedPixelCount);
		expect(first.classChangedPixelCounts).toEqual(second.classChangedPixelCounts);
		expect(first.enrichedSourceSha256).toEqual(second.enrichedSourceSha256);
		for (const [index, panelResult] of first.panels.entries()) {
			expect(panelResult.rgba.data).toEqual(second.panels[index]!.rgba.data);
		}
	});

	it('does not mutate panel, insert, or mask inputs', () => {
		const width = 40;
		const height = 40;
		const panels = affectedPanels(width, height);
		const inserts = decodedInserts(width, height);
		const masks = syntheticMasks(width, height);
		const panelBytes = panels.map((item) => Buffer.from(item.rgba.data));
		const insertBytes = inserts.map((item) => Buffer.from(item.rgba.data));
		const maskKeys = [
			'selectedBlockers',
			'otherProtected',
			'groundAllowed',
			'sceneryAllowed',
			'hedgeAllowed',
			'woodlandAllowed',
			'decorationAllowed'
		] as const;
		const maskBytes = Object.fromEntries(
			maskKeys.map((key) => [key, masks[key].slice()])
		) as Record<(typeof maskKeys)[number], Uint8Array>;

		enrichMeadowEntryPaintedV2Sources(panels, inserts, masks);
		for (const [index, item] of panels.entries()) expect(item.rgba.data).toEqual(panelBytes[index]);
		for (const [index, item] of inserts.entries())
			expect(item.rgba.data).toEqual(insertBytes[index]);
		for (const key of maskKeys) expect(masks[key]).toEqual(maskBytes[key]);
	});

	it('keeps the existing underlay assembly as the downstream owner of boundaries', async () => {
		const width = 8;
		const height = 8;
		const panels = affectedPanels(width, height);
		const masks = syntheticMasks(width, height);
		const enriched = enrichMeadowEntryPaintedV2Sources(
			panels,
			decodedInserts(width, height),
			masks
		);
		const { assembleMeadowEntryPaintedV2Underlay } =
			await import('./meadow-entry-painted-v2-underlay-assembly');
		const input = (sourcePanels: readonly MeadowEntryUnderlayDecodedPanel[]) => ({
			width,
			height,
			panels: sourcePanels,
			northSouthPairs: [
				{
					northId: 'camera-underlay-sundrop-south',
					southId: 'camera-underlay-crossroads-north',
					bounds: bounds(0, 0, width, height)
				},
				{
					northId: 'camera-underlay-crossroads-north',
					southId: 'camera-underlay-crossroads-south',
					bounds: bounds(0, 0, width, height)
				}
			],
			familyHandoff: {
				sundropPanelIds: ['camera-underlay-sundrop-south'],
				crossroadsPanelIds: ['camera-underlay-crossroads-north'],
				bounds: bounds(0, 0, width, height)
			}
		});
		const plain = await assembleMeadowEntryPaintedV2Underlay(input(panels));
		const baked = await assembleMeadowEntryPaintedV2Underlay(
			input(enriched.panels.filter(({ id }) => id.startsWith('camera-underlay')))
		);
		expect(baked.data.some((value, index) => value !== plain.data[index])).toBe(true);
	});
});
