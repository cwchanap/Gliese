import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { PixelBounds } from './meadow-entry-authoring-types';
import { buildMeadowEntryControlInputs } from './meadow-entry-controls';
import type { MeadowEntryPaintedV2DetailPair } from './meadow-entry-painted-v2-pilot';
import {
	assembleMeadowEntryPaintedV2Underlay,
	blendMeadowEntryAxisPairPixel,
	blendMeadowEntryDetailChannel,
	compositeMeadowEntryDetailPanels,
	meadowEntryDetailFeatherWeight,
	meadowEntryDetailPairCorrectionLastInsetIndex,
	type MeadowEntryDetailDecodedPanel
} from './meadow-entry-painted-v2-underlay-assembly';
import {
	MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
	MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS
} from './meadow-entry-painted-v2-scenery';
import {
	buildMeadowEntryPaintedV2SceneryMaskSetFromControls,
	buildMeadowEntryPaintedV2SceneryMaskSet,
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

function variedRgba(
	width: number,
	height: number,
	base: readonly [number, number, number],
	seed: number
): Buffer {
	const data = filledRgba(width, height, base);
	for (let y = 0; y < height; y += 1)
		for (let x = 0; x < width; x += 1) {
			const at = (y * width + x) * 4;
			const gradient =
				Math.floor((80 * x) / Math.max(1, width - 1)) +
				Math.floor((30 * y) / Math.max(1, height - 1)) +
				seed;
			const clump = (Math.floor(x / 8) * 5 + Math.floor(y / 8) * 3 + seed) % 5 === 0 ? 96 : 0;
			const texture = (x * 31 + y * 17 + seed * 13) % 32;
			data[at] = Math.min(255, base[0]! + gradient + clump + texture);
			data[at + 1] = Math.min(255, base[1]! + Math.floor(gradient / 2) + clump + texture);
			data[at + 2] = Math.min(255, base[2]! + Math.floor(gradient / 3) + clump + texture);
		}
	return data;
}

function panel(
	id: string,
	width: number,
	height: number,
	rgb: readonly [number, number, number]
): MeadowEntryDetailDecodedPanel {
	return panelWithBounds(id, bounds(0, 0, width, height), rgb);
}

function panelWithBounds(
	id: string,
	panelBounds: PixelBounds,
	rgb: readonly [number, number, number],
	assemblyPriority = id === 'crossroads' ? 50 : id.startsWith('camera-underlay') ? 1 : 10
): MeadowEntryDetailDecodedPanel {
	const width = panelBounds.right - panelBounds.left;
	const height = panelBounds.bottom - panelBounds.top;
	return {
		id,
		bounds: panelBounds,
		rgba: { width, height, data: filledRgba(width, height, rgb) },
		assemblyPriority
	};
}

function mask(width: number, height: number, fill = 0): Uint8Array {
	return new Uint8Array(width * height).fill(fill);
}

function syntheticMasks(width: number, height: number): MeadowEntryPaintedV2SceneryMaskSet {
	const otherProtected = mask(width, height);
	const groundAllowed = mask(width, height, 1);
	const sceneryAllowed = mask(width, height);
	const hedgeAllowed = mask(width, height);
	const woodlandAllowed = mask(width, height);

	for (let y = 1; y < height - 1; y += 1) {
		for (let x = 1; x < width - 1; x += 1) {
			const index = offset(width, x, y);
			sceneryAllowed[index] = 1;
			hedgeAllowed[index] = 1;
		}
	}
	for (let y = Math.max(4, height - 64); y < height - 2; y += 1) {
		for (let x = Math.max(4, width - 64); x < width - 2; x += 1) {
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
	return {
		width: width as 6400,
		height: height as 6400,
		otherProtected,
		groundAllowed,
		sceneryAllowed,
		hedgeAllowed,
		woodlandAllowed,
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
			data: variedRgba(
				width,
				height,
				insert.sceneryClass === 'hedge' ? [30, 60, 20] : [20, 40, 40],
				index
			)
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

function paintBounds(mask: Uint8Array, width: number, panelBounds: PixelBounds): void {
	for (let y = panelBounds.top; y < panelBounds.bottom; y += 1) {
		for (let x = panelBounds.left; x < panelBounds.right; x += 1) {
			mask[offset(width, x, y)] = 1;
		}
	}
}

function panelPixel(
	panelValue: MeadowEntryDetailDecodedPanel,
	x: number,
	y: number
): readonly [number, number, number, number] {
	const localX = x - panelValue.bounds.left;
	const localY = y - panelValue.bounds.top;
	const at = (localY * panelValue.rgba.width + localX) * 4;
	return [
		panelValue.rgba.data[at]!,
		panelValue.rgba.data[at + 1]!,
		panelValue.rgba.data[at + 2]!,
		panelValue.rgba.data[at + 3]!
	];
}

function rgbaPixel(
	data: Buffer,
	width: number,
	x: number,
	y: number
): readonly [number, number, number, number] {
	const at = rgbaOffset(width, x, y);
	return [data[at]!, data[at + 1]!, data[at + 2]!, data[at + 3]!];
}

function assemblyMasks(width: number, height: number): MeadowEntryPaintedV2SceneryMaskSet {
	const result = syntheticMasks(width, height);
	result.sceneryAllowed.fill(0);
	result.hedgeAllowed.fill(0);
	result.woodlandAllowed.fill(0);
	paintBounds(result.sceneryAllowed, width, bounds(208, 208, 304, 304));
	paintBounds(result.hedgeAllowed, width, bounds(208, 208, 304, 304));
	paintBounds(result.sceneryAllowed, width, bounds(320, 208, 416, 304));
	paintBounds(result.woodlandAllowed, width, bounds(320, 208, 416, 304));
	return result;
}

interface AssemblyFixture {
	readonly masks: MeadowEntryPaintedV2SceneryMaskSet;
	readonly panels: MeadowEntryDetailDecodedPanel[];
	readonly inserts: DecodedMeadowEntryPaintedV2SceneryInsert[];
	readonly underlayPairs: readonly {
		readonly northId: string;
		readonly southId: string;
		readonly bounds: PixelBounds;
	}[];
	readonly familyHandoff: {
		readonly sundropPanelIds: readonly string[];
		readonly crossroadsPanelIds: readonly string[];
		readonly bounds: PixelBounds;
	};
	readonly detailPairs: readonly MeadowEntryPaintedV2DetailPair[];
}

function assemblyFixture(): AssemblyFixture {
	const panels = [
		panelWithBounds('camera-underlay-sundrop-north', bounds(0, 0, 320, 320), [5, 15, 25], 0),
		panelWithBounds('camera-underlay-sundrop-south', bounds(0, 192, 320, 512), [10, 20, 30], 1),
		panelWithBounds('camera-underlay-crossroads-north', bounds(192, 0, 512, 320), [40, 50, 60], 2),
		panelWithBounds(
			'camera-underlay-crossroads-south',
			bounds(192, 192, 512, 512),
			[70, 80, 90],
			3
		),
		panelWithBounds('sundrop-north', bounds(0, 0, 320, 384), [100, 110, 120], 10),
		panelWithBounds('sundrop-south', bounds(0, 128, 320, 512), [130, 140, 150], 20),
		panelWithBounds('village-crossroads-connector', bounds(64, 192, 448, 448), [160, 170, 180], 40),
		panelWithBounds('crossroads', bounds(192, 128, 512, 448), [190, 200, 210], 50)
	];
	const inserts = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert, index) => {
		const owner = panels.find((panelValue) => panelValue.id === insert.owningSourceId);
		if (!owner) throw new Error(`Missing synthetic scenery owner ${insert.owningSourceId}`);
		const width = owner.bounds.right - owner.bounds.left;
		const height = owner.bounds.bottom - owner.bounds.top;
		return {
			id: insert.id,
			sceneryClass: insert.sceneryClass,
			owningSourceId: insert.owningSourceId,
			bounds: { ...owner.bounds },
			rgba: {
				width,
				height,
				data: variedRgba(
					width,
					height,
					insert.sceneryClass === 'hedge' ? [30, 60, 20] : [20, 40, 40],
					index
				)
			}
		};
	});
	return {
		masks: assemblyMasks(512, 512),
		panels,
		inserts,
		underlayPairs: [
			{
				northId: 'camera-underlay-sundrop-north',
				southId: 'camera-underlay-sundrop-south',
				bounds: bounds(0, 192, 320, 320)
			},
			{
				northId: 'camera-underlay-crossroads-north',
				southId: 'camera-underlay-crossroads-south',
				bounds: bounds(192, 192, 512, 320)
			}
		],
		familyHandoff: {
			sundropPanelIds: ['camera-underlay-sundrop-north', 'camera-underlay-sundrop-south'],
			crossroadsPanelIds: ['camera-underlay-crossroads-north', 'camera-underlay-crossroads-south'],
			bounds: bounds(192, 192, 320, 320)
		},
		detailPairs: [
			{
				firstId: 'sundrop-north',
				secondId: 'sundrop-south',
				bounds: bounds(0, 128, 320, 384),
				axis: 'y'
			},
			{
				firstId: 'village-crossroads-connector',
				secondId: 'crossroads',
				bounds: bounds(192, 192, 448, 448),
				axis: 'x'
			}
		]
	};
}

function underlayInput(fixture: AssemblyFixture, panels: readonly MeadowEntryDetailDecodedPanel[]) {
	const underlayIds = new Set(
		fixture.underlayPairs.flatMap(({ northId, southId }) => [northId, southId])
	);
	return {
		width: 512,
		height: 512,
		panels: panels.filter(({ id }) => underlayIds.has(id)),
		northSouthPairs: fixture.underlayPairs,
		familyHandoff: fixture.familyHandoff
	};
}

async function composeAssembly(
	fixture: AssemblyFixture,
	panels: readonly MeadowEntryDetailDecodedPanel[],
	pairs: readonly MeadowEntryPaintedV2DetailPair[] = fixture.detailPairs
) {
	const output = await assembleMeadowEntryPaintedV2Underlay(underlayInput(fixture, panels));
	const detailIds = new Set([
		'sundrop-north',
		'sundrop-south',
		'village-crossroads-connector',
		'crossroads'
	]);
	compositeMeadowEntryDetailPanels(
		output,
		panels.filter(({ id }) => detailIds.has(id)),
		pairs
	);
	return output;
}

function expectedPairCorrection(
	ordinary: readonly number[],
	first: MeadowEntryDetailDecodedPanel,
	second: MeadowEntryDetailDecodedPanel,
	pair: MeadowEntryPaintedV2DetailPair,
	x: number,
	y: number
): readonly [number, number, number, 255] {
	const axisPair = blendMeadowEntryAxisPairPixel(
		panelPixel(first, x, y),
		panelPixel(second, x, y),
		pair.bounds,
		pair.axis,
		x,
		y
	);
	const edgeDistance = Math.min(
		x - pair.bounds.left,
		pair.bounds.right - 1 - x,
		y - pair.bounds.top,
		pair.bounds.bottom - 1 - y
	);
	const weight = meadowEntryDetailFeatherWeight(
		edgeDistance,
		meadowEntryDetailPairCorrectionLastInsetIndex(pair.bounds)
	);
	return [
		blendMeadowEntryDetailChannel(ordinary[0]!, axisPair[0], weight),
		blendMeadowEntryDetailChannel(ordinary[1]!, axisPair[1], weight),
		blendMeadowEntryDetailChannel(ordinary[2]!, axisPair[2], weight),
		255
	];
}

describe('Meadow Entry painted-v2 scenery bake primitives', () => {
	it('returns exactly the five catalog-backed retained masks', () => {
		const controls = buildMeadowEntryControlInputs(process.cwd());
		const masks = buildMeadowEntryPaintedV2SceneryMaskSetFromControls(controls, {
			fixture: 'a'.repeat(64)
		});

		expect(Object.keys(masks).sort()).toEqual([
			'groundAllowed',
			'hedgeAllowed',
			'height',
			'otherProtected',
			'sceneryAllowed',
			'sourceHashes',
			'width',
			'woodlandAllowed'
		]);
	});

	it('rejects a uniform organic sample set before mutating any source panel', () => {
		const width = 160;
		const height = 160;
		const panels = affectedPanels(width, height);
		const inserts = decodedInserts(width, height).map((insert) => ({
			...insert,
			rgba: {
				...insert.rgba,
				data: filledRgba(
					width,
					height,
					insert.sceneryClass === 'hedge' ? [240, 40, 30] : [30, 70, 230]
				)
			}
		}));
		const masks = syntheticMasks(width, height);
		const before = clonePanels(panels);

		expect(() => enrichMeadowEntryPaintedV2Sources(panels, inserts, masks)).toThrow(
			/q40|q80|organic|degenerate/i
		);
		for (const [index, panel] of panels.entries())
			expect(panel.rgba.data).toEqual(before[index]!.rgba.data);
	});

	it('returns organic clump metrics for every literal blocker and keeps irregular holes exact', () => {
		const width = 160;
		const height = 160;
		const panels = affectedPanels(width, height);
		const masks = syntheticMasks(width, height);
		const inserts = decodedInserts(width, height).map((insert, index) => ({
			...insert,
			rgba: {
				...insert.rgba,
				data: Buffer.from(
					Buffer.from(insert.rgba.data).map((value, channel) =>
						channel % 4 === 3 ? 255 : (value + ((channel + index) % 7)) % 256
					)
				)
			}
		}));
		const result = enrichMeadowEntryPaintedV2Sources(panels, inserts, masks);

		expect(result.rows).toHaveLength(10);
		expect(result.intersections.length).toBe(16);
		expect(result.formulas.luma).toContain('54*r');
		expect(result.formulas.organicWeight).toContain('meadowEntryDetailFeatherWeight');
		expect(result.formulas.weightedCoverageThreshold).toBe('finalWeight>=32');
		for (const intersection of result.intersections) {
			expect(intersection.sampleCount).toBeGreaterThanOrEqual(64);
			expect(intersection.q40).toBeLessThan(intersection.q80);
			expect(intersection.weightSha256).toMatch(/^[a-f0-9]{64}$/);
		}
		for (const row of result.rows) {
			expect(row.coverage, row.blockerId).toBeGreaterThanOrEqual(0.25);
			expect(row.coverage, row.blockerId).toBeLessThanOrEqual(0.7);
			expect(row.weightSha256).toMatch(/^[a-f0-9]{64}$/);
			if (row.metricKind === 'clump-runs') {
				expect(row.longestRunP95Ratio, row.blockerId).toBeLessThanOrEqual(0.3);
				expect(row.longestRunMaximumRatio, row.blockerId).toBeLessThanOrEqual(0.5);
			} else {
				expect(row.weightedSliceCount).toBe(row.evaluableSliceCount);
				expect(row.distinctContourPairCount).toBeGreaterThan(1);
				expect(row.longestConstantContourRunRatio).toBeLessThanOrEqual(0.5);
				expect(row.contourProfileSha256).toMatch(/^[a-f0-9]{64}$/);
			}
		}
	});

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

	it('records a zero-organic tree stripe as an evaluable but unweighted slice', () => {
		const width = 320;
		const height = 320;
		const panels = affectedPanels(width, height);
		const otherProtected = mask(width, height);
		const groundAllowed = mask(width, height, 1);
		const sceneryAllowed = mask(width, height, 1);
		const hedgeAllowed = mask(width, height);
		const woodlandAllowed = mask(width, height);
		for (let y = 1; y < height - 1; y += 1)
			for (let x = 1; x < width - 1; x += 1)
				(y < height / 2 ? hedgeAllowed : woodlandAllowed)[offset(width, x, y)] = 1;
		const masks: MeadowEntryPaintedV2SceneryMaskSet = {
			width: width as 6400,
			height: height as 6400,
			otherProtected,
			groundAllowed,
			sceneryAllowed,
			hedgeAllowed,
			woodlandAllowed,
			sourceHashes: { synthetic: createHash('sha256').update('stripe').digest('hex') }
		};
		const inserts = decodedInserts(width, height).map((insert) => {
			if (insert.sceneryClass !== 'woodland') return insert;
			const data = Buffer.from(insert.rgba.data);
			for (let y = 0; y < height; y += 1) {
				for (let x = 90; x < 230; x += 1) {
					const at = rgbaOffset(width, x, y);
					data[at] = 100;
					data[at + 1] = 100;
					data[at + 2] = 100;
					data[at + 3] = 255;
				}
			}
			return { ...insert, rgba: { ...insert.rgba, data } };
		});
		const result = enrichMeadowEntryPaintedV2Sources(panels, inserts, masks);
		const treeRows = result.rows.filter((row) => row.language === 'tree-wall');
		expect(treeRows).toHaveLength(6);
		expect(treeRows[0]!.evaluableSliceCount).toBe(310);
		expect(treeRows.some((row) => row.evaluableSliceCount > row.weightedSliceCount)).toBe(true);
	});

	it('uses the expanded control rectangles for protected-live and other-protected masks', () => {
		const input = buildMeadowEntryControlInputs(process.cwd());
		const masks = buildMeadowEntryPaintedV2SceneryMaskSet(process.cwd());
		const protectedEntries = input.bakeOwnership.filter(
			(entry) => entry.disposition.mode === 'protected-live'
		);
		const selectedBlockerIds = new Set(
			MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map(({ sourceId }) => sourceId)
		);
		const expectedLive = mask(6400, 6400);
		const expectedOther = mask(6400, 6400);
		expect(input.protectedRects).toHaveLength(protectedEntries.length);
		for (const [index, protectedBounds] of input.protectedRects.entries()) {
			paintBounds(expectedLive, 6400, protectedBounds);
			if (!selectedBlockerIds.has(protectedEntries[index]!.ref.sourceId)) {
				paintBounds(expectedOther, 6400, protectedBounds);
			}
		}
		let expectedLivePixels = 0;
		let expectedOtherPixels = 0;
		let maskOtherPixels = 0;
		let groundOverlap = 0;
		let sceneryOverlap = 0;
		for (let index = 0; index < expectedLive.length; index += 1) {
			if (expectedLive[index] === 1) expectedLivePixels += 1;
			if (expectedOther[index] === 1) expectedOtherPixels += 1;
			if (masks.otherProtected[index] === 1) maskOtherPixels += 1;
			if (expectedLive[index] === 1 && masks.groundAllowed[index] === 1) groundOverlap += 1;
			if (expectedOther[index] === 1 && masks.sceneryAllowed[index] === 1) sceneryOverlap += 1;
		}

		expect({
			expectedLivePixels,
			expectedOtherPixels,
			maskOtherPixels,
			groundOverlap,
			sceneryOverlap
		}).toEqual({
			expectedLivePixels: 14_287_348,
			expectedOtherPixels: 13_818_312,
			maskOtherPixels: 13_818_312,
			groundOverlap: 0,
			sceneryOverlap: 0
		});
	});

	it('reports zero at outer and hole edges, caps at fifteen, and shares the feather formula', () => {
		const width = 160;
		const height = 160;
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
		const width = 160;
		const height = 160;
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

		const enriched = result.panels[0]!.rgba.data;
		const center = rgbaOffset(width, 20, 20);
		expect(enriched[center]).toBeGreaterThanOrEqual(0);
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
		const width = 160;
		const height = 160;
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
			'otherProtected',
			'groundAllowed',
			'sceneryAllowed',
			'hedgeAllowed',
			'woodlandAllowed'
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

	it('preserves every full underlay/detail boundary through the four-owner assembly', async () => {
		const fixture = assemblyFixture();
		const before = clonePanels(fixture.panels);
		const enriched = enrichMeadowEntryPaintedV2Sources(
			fixture.panels,
			fixture.inserts,
			fixture.masks
		);
		const plain = await composeAssembly(fixture, before);
		const baked = await composeAssembly(fixture, enriched.panels);
		const bakedUnderlay = await assembleMeadowEntryPaintedV2Underlay(
			underlayInput(fixture, enriched.panels)
		);
		const plainWithoutPairs = await composeAssembly(fixture, before, []);
		const bakedWithoutPairs = await composeAssembly(fixture, enriched.panels, []);
		const plainWithSunPair = await composeAssembly(fixture, before, [fixture.detailPairs[0]!]);
		const bakedWithSunPair = await composeAssembly(fixture, enriched.panels, [
			fixture.detailPairs[0]!
		]);
		const plainWithCrossroadsPair = await composeAssembly(fixture, before, [
			fixture.detailPairs[1]!
		]);
		const bakedWithCrossroadsPair = await composeAssembly(fixture, enriched.panels, [
			fixture.detailPairs[1]!
		]);
		const affectedOwnerIds = [
			'camera-underlay-sundrop-south',
			'camera-underlay-crossroads-north',
			'camera-underlay-crossroads-south',
			'crossroads'
		] as const;

		for (const ownerId of affectedOwnerIds) {
			const original = before.find(({ id }) => id === ownerId)!;
			const result = enriched.panels.find(({ id }) => id === ownerId)!;
			expect(result.rgba.data).not.toEqual(original.rgba.data);
			for (let y = result.bounds.top; y < result.bounds.bottom; y += 1) {
				for (let x = result.bounds.left; x < result.bounds.right; x += 1) {
					if (fixture.masks.sceneryAllowed[offset(512, x, y)] === 1) continue;
					const at = rgbaOffset(result.rgba.width, x - result.bounds.left, y - result.bounds.top);
					expect(result.rgba.data.subarray(at, at + 4)).toEqual(
						original.rgba.data.subarray(at, at + 4)
					);
				}
			}
		}

		let outsideSceneryDifferences = 0;
		let insideSceneryDifferences = 0;
		for (let y = 0; y < 512; y += 1) {
			for (let x = 0; x < 512; x += 1) {
				const at = rgbaOffset(512, x, y);
				if (plain.data.subarray(at, at + 4).equals(baked.data.subarray(at, at + 4))) continue;
				if (fixture.masks.sceneryAllowed[offset(512, x, y)] === 1) insideSceneryDifferences += 1;
				else outsideSceneryDifferences += 1;
			}
		}
		expect(outsideSceneryDifferences).toBe(0);
		expect(insideSceneryDifferences).toBeGreaterThan(0);

		const sunNorth = before.find(({ id }) => id === 'camera-underlay-sundrop-north')!;
		const sunSouth = before.find(({ id }) => id === 'camera-underlay-sundrop-south')!;
		const crossNorth = before.find(({ id }) => id === 'camera-underlay-crossroads-north')!;
		const crossSouth = before.find(({ id }) => id === 'camera-underlay-crossroads-south')!;
		const sunPair = fixture.underlayPairs[0]!;
		const crossPair = fixture.underlayPairs[1]!;
		expect(rgbaPixel(bakedUnderlay.data, 512, 32, 192)).toEqual(panelPixel(sunNorth, 32, 192));
		expect(rgbaPixel(bakedUnderlay.data, 512, 32, 319)).toEqual(panelPixel(sunSouth, 32, 319));
		expect(rgbaPixel(bakedUnderlay.data, 512, 400, 192)).toEqual(panelPixel(crossNorth, 400, 192));
		expect(rgbaPixel(bakedUnderlay.data, 512, 400, 319)).toEqual(panelPixel(crossSouth, 400, 319));

		const sunAtFamilyLeft = blendMeadowEntryAxisPairPixel(
			panelPixel(sunNorth, 192, 256),
			panelPixel(sunSouth, 192, 256),
			sunPair.bounds,
			'y',
			192,
			256
		);
		const crossAtFamilyLeft = blendMeadowEntryAxisPairPixel(
			panelPixel(crossNorth, 192, 256),
			panelPixel(crossSouth, 192, 256),
			crossPair.bounds,
			'y',
			192,
			256
		);
		const sunAtFamilyRight = blendMeadowEntryAxisPairPixel(
			panelPixel(sunNorth, 319, 256),
			panelPixel(sunSouth, 319, 256),
			sunPair.bounds,
			'y',
			319,
			256
		);
		const crossAtFamilyRight = blendMeadowEntryAxisPairPixel(
			panelPixel(crossNorth, 319, 256),
			panelPixel(crossSouth, 319, 256),
			crossPair.bounds,
			'y',
			319,
			256
		);
		expect(rgbaPixel(bakedUnderlay.data, 512, 192, 256)).toEqual(
			blendMeadowEntryAxisPairPixel(
				sunAtFamilyLeft,
				crossAtFamilyLeft,
				fixture.familyHandoff.bounds,
				'x',
				192,
				256
			)
		);
		expect(rgbaPixel(bakedUnderlay.data, 512, 319, 256)).toEqual(
			blendMeadowEntryAxisPairPixel(
				sunAtFamilyRight,
				crossAtFamilyRight,
				fixture.familyHandoff.bounds,
				'x',
				319,
				256
			)
		);

		const sunDetailNorth = before.find(({ id }) => id === 'sundrop-north')!;
		const sunDetailSouth = before.find(({ id }) => id === 'sundrop-south')!;
		const connector = before.find(({ id }) => id === 'village-crossroads-connector')!;
		const crossroads = before.find(({ id }) => id === 'crossroads')!;
		const sunDetailPair = fixture.detailPairs[0]!;
		const crossroadsDetailPair = fixture.detailPairs[1]!;
		expect(rgbaPixel(plain.data, 512, 32, 256)).toEqual(
			expectedPairCorrection(
				rgbaPixel(plainWithoutPairs.data, 512, 32, 256),
				sunDetailNorth,
				sunDetailSouth,
				sunDetailPair,
				32,
				256
			)
		);
		expect(rgbaPixel(baked.data, 512, 320, 320)).toEqual(
			expectedPairCorrection(
				rgbaPixel(bakedWithoutPairs.data, 512, 320, 320),
				connector,
				crossroads,
				crossroadsDetailPair,
				320,
				320
			)
		);

		const assertPairPerimeterIsOrdinary = (
			withPair: Buffer,
			withoutPair: Buffer,
			pair: MeadowEntryPaintedV2DetailPair
		): void => {
			for (let x = pair.bounds.left; x < pair.bounds.right; x += 1) {
				for (const y of [pair.bounds.top, pair.bounds.bottom - 1]) {
					expect(rgbaPixel(withPair, 512, x, y)).toEqual(rgbaPixel(withoutPair, 512, x, y));
				}
			}
			for (let y = pair.bounds.top + 1; y < pair.bounds.bottom - 1; y += 1) {
				for (const x of [pair.bounds.left, pair.bounds.right - 1]) {
					expect(rgbaPixel(withPair, 512, x, y)).toEqual(rgbaPixel(withoutPair, 512, x, y));
				}
			}
		};
		assertPairPerimeterIsOrdinary(plainWithSunPair.data, plainWithoutPairs.data, sunDetailPair);
		assertPairPerimeterIsOrdinary(bakedWithSunPair.data, bakedWithoutPairs.data, sunDetailPair);
		assertPairPerimeterIsOrdinary(
			plainWithCrossroadsPair.data,
			plainWithoutPairs.data,
			crossroadsDetailPair
		);
		assertPairPerimeterIsOrdinary(
			bakedWithCrossroadsPair.data,
			bakedWithoutPairs.data,
			crossroadsDetailPair
		);

		const edgeOwner = enriched.panels.find(({ id }) => id === 'camera-underlay-crossroads-south')!;
		const edgeOriginal = before.find(({ id }) => id === edgeOwner.id)!;
		const edgePixel = panelPixel(edgeOwner, 208, 208);
		const originalEdgePixel = panelPixel(edgeOriginal, 208, 208);
		expect(edgePixel).toEqual(originalEdgePixel);
		const innerPixel = panelPixel(edgeOwner, 209, 209);
		const originalInnerPixel = panelPixel(edgeOriginal, 209, 209);
		expect(innerPixel[0]).toBeGreaterThanOrEqual(originalInnerPixel[0]);
		expect(innerPixel[3]).toBe(255);
	});
});
