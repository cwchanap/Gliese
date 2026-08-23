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
	MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
	type MeadowEntryPaintedV2SceneryBlocker
} from './meadow-entry-painted-v2-scenery';
import {
	buildMeadowEntryPaintedV2SceneryMaskSetFromControls,
	buildMeadowEntryPaintedV2SceneryMaskSet,
	erodeMeadowEntryMask8,
	enrichMeadowEntryPaintedV2Sources,
	enrichMeadowEntryPaintedV2SourcesWithOrganicApron,
	enrichMeadowEntryPaintedV2WorldWithOrganicApron,
	MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY,
	meadowEntrySceneryInsetDistances,
	meadowEntrySceneryOutwardDistances,
	shapeMeadowEntryPaintedV2SceneryContributions,
	type DecodedMeadowEntryPaintedV2SceneryInsert,
	type MeadowEntryPaintedV2SceneryContribution,
	type MeadowEntryPaintedV2SceneryMaskSet
} from './meadow-entry-painted-v2-scenery-bake';

function bounds(left: number, top: number, right: number, bottom: number): PixelBounds {
	return { left, top, right, bottom };
}

function offset(width: number, x: number, y: number): number {
	return y * width + x;
}

function stableJson(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
	if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
		.join(',')}}`;
}

function stableHash(value: unknown): string {
	return createHash('sha256').update(stableJson(value)).digest('hex');
}

function topologyBlocker(
	sourceId: string,
	blockerBounds: PixelBounds,
	language: MeadowEntryPaintedV2SceneryBlocker['language'],
	sceneryClass: MeadowEntryPaintedV2SceneryBlocker['sceneryClass']
): MeadowEntryPaintedV2SceneryBlocker {
	return { sourceId, bounds: blockerBounds, language, sceneryClass };
}

function topologyContribution(
	blockerId: string,
	insertId: string,
	worldIndex: number,
	rawFinalWeight: number,
	organicSignal = 128,
	edgeWeight = 255,
	ownerPriority = 1,
	sceneryClass: MeadowEntryPaintedV2SceneryBlocker['sceneryClass'] = 'woodland'
): MeadowEntryPaintedV2SceneryContribution {
	return {
		blockerId,
		insertId,
		owningSourceId: `owner-${insertId}`,
		ownerPriority,
		sceneryClass,
		worldIndex,
		rawFinalWeight,
		organicSignal,
		edgeWeight,
		ownerRelativeTone: [100, 120, 140]
	};
}

function sparseTopologyFixture(): {
	readonly width: number;
	readonly height: number;
	readonly blockers: readonly MeadowEntryPaintedV2SceneryBlocker[];
	readonly contributions: readonly MeadowEntryPaintedV2SceneryContribution[];
} {
	const width = 24;
	const height = 36;
	const blockerId = 'synthetic-sparse-belt';
	const blocker = topologyBlocker(blockerId, bounds(2, 0, 18, 12), 'hedge', 'hedge');
	const contributions: MeadowEntryPaintedV2SceneryContribution[] = [];
	for (let y = blocker.bounds.top; y < blocker.bounds.bottom; y += 1) {
		for (let x = blocker.bounds.left; x < blocker.bounds.right; x += 1) {
			const worldIndex = offset(width, x, y);
			const saturated = y >= 2 && y < 10;
			contributions.push(
				topologyContribution(
					blockerId,
					'sparse-insert',
					worldIndex,
					saturated ? 255 : 16,
					255,
					255,
					1,
					'hedge'
				)
			);
			if (x === 4 && y === 5)
				contributions.push(
					topologyContribution(
						blockerId,
						'sparse-insert-saturated-overlap',
						worldIndex,
						255,
						192,
						255,
						1,
						'hedge'
					)
				);
			if (x === 4 && y === 5)
				contributions.push(
					topologyContribution(
						blockerId,
						'sparse-insert-shadow',
						worldIndex,
						220,
						64,
						255,
						1,
						'hedge'
					)
				);
		}
	}
	return { width, height, blockers: [blocker], contributions };
}

function treeTopologyFixture(): {
	readonly width: number;
	readonly height: number;
	readonly blockers: readonly MeadowEntryPaintedV2SceneryBlocker[];
	readonly contributions: readonly MeadowEntryPaintedV2SceneryContribution[];
} {
	const width = 28;
	const height = 40;
	const blockerId = 'synthetic-tree-wall';
	const blocker = topologyBlocker(blockerId, bounds(2, 20, 22, 25), 'tree-wall', 'woodland');
	const contributions: MeadowEntryPaintedV2SceneryContribution[] = [];
	for (let x = blocker.bounds.left; x < blocker.bounds.right; x += 1) {
		for (let y = blocker.bounds.top; y < blocker.bounds.bottom; y += 1) {
			const slice = x - blocker.bounds.left;
			const strong = slice % 2 === 0 && y === blocker.bounds.top + (slice % 5);
			const worldIndex = offset(width, x, y);
			contributions.push(
				topologyContribution(
					blockerId,
					'tree-insert',
					worldIndex,
					strong ? 64 : 8,
					strong ? 220 : 80,
					64
				)
			);
		}
	}
	return { width, height, blockers: [blocker], contributions };
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
	if (width < 64) {
		hedgeAllowed.fill(0);
		woodlandAllowed.fill(0);
		const splitX = Math.floor(width * 0.375);
		paintBounds(hedgeAllowed, width, bounds(1, 1, splitX, height - 1));
		paintBounds(woodlandAllowed, width, bounds(splitX, 1, width - 1, height - 1));
	}
	const woodlandStart = Math.max(4, height - 64);
	const contourStart = Math.floor((woodlandStart + height - 1) / 2);
	for (let x = Math.max(4, width - 64); x < width - 2; x += 1) {
		const notch = width < 64 ? (x * 7) % 7 : (x * 7) % 17;
		for (let y = contourStart; y < contourStart + notch && y < height - 2; y += 1)
			woodlandAllowed[offset(width, x, y)] = 0;
	}
	const protectedOffset = offset(width, 1, 1);
	otherProtected[protectedOffset] = 1;
	sceneryAllowed[protectedOffset] = 0;
	hedgeAllowed[protectedOffset] = 1;
	const outsideOffset = offset(width, width - 2, 2);
	sceneryAllowed[outsideOffset] = 0;
	hedgeAllowed[outsideOffset] = width < 64 ? 0 : 1;
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

function syntheticTopologyBlockers(
	width: number,
	height: number
): MeadowEntryPaintedV2SceneryBlocker[] {
	if (width >= 512 && height >= 512) {
		const hedgeBounds = bounds(208, 208, 304, 304);
		const forestBounds = bounds(320, 212, 416, 239);
		const treeBounds = bounds(320, 239, 416, 304);
		return MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map((blocker) => ({
			...blocker,
			bounds:
				blocker.language === 'tree-wall'
					? treeBounds
					: blocker.language === 'forest-bank'
						? forestBounds
						: hedgeBounds
		}));
	}
	const woodlandTop =
		width < 64 ? 4 : Math.max(8, height === 320 ? Math.floor(height / 2) : height - 64);
	const woodlandLeft =
		width < 64
			? Math.floor(width * 0.375)
			: width >= 320
				? 5
				: Math.max(4, Math.floor(width * 0.6));
	const right = Math.max(woodlandLeft + 1, width - 1);
	const split = Math.max(woodlandTop + 2, Math.floor((woodlandTop + height - 1) / 2));
	const hedgeBounds =
		width < 64
			? bounds(4, 4, woodlandLeft, Math.max(5, height - 4))
			: bounds(1, 1, Math.max(2, width - 1), woodlandTop);
	const forestBounds = bounds(woodlandLeft, woodlandTop, right, split);
	const treeBounds = bounds(
		woodlandLeft,
		split,
		right,
		width < 64 ? Math.max(split + 1, height - 2) : Math.max(split + 1, height - 1)
	);
	return MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map((blocker) => ({
		...blocker,
		bounds:
			blocker.language === 'tree-wall'
				? treeBounds
				: blocker.language === 'forest-bank'
					? width < 64 && blocker.sourceId === 'wildwood-north-climb-west-bank'
						? bounds(woodlandLeft + 4, woodlandTop + 2, woodlandLeft + 12, woodlandTop + 10)
						: forestBounds
					: hedgeBounds
	}));
}

function adjacentClassFixture(
	width: number,
	height: number
): {
	readonly masks: MeadowEntryPaintedV2SceneryMaskSet;
	readonly blockers: MeadowEntryPaintedV2SceneryBlocker[];
	readonly hedgeBounds: PixelBounds;
	readonly woodlandBounds: PixelBounds;
} {
	const masks = syntheticMasks(width, height);
	const hedgeBounds = bounds(8, 8, 72, 80);
	const woodlandBounds = bounds(72, 8, 136, 80);
	const woodlandForestBounds = bounds(72, 8, 136, 44);
	const woodlandTreeBounds = bounds(72, 44, 136, 80);
	masks.otherProtected.fill(0);
	masks.groundAllowed.fill(1);
	masks.sceneryAllowed.fill(0);
	masks.hedgeAllowed.fill(0);
	masks.woodlandAllowed.fill(0);
	paintBounds(masks.sceneryAllowed, width, hedgeBounds);
	paintBounds(masks.sceneryAllowed, width, woodlandBounds);
	paintBounds(masks.hedgeAllowed, width, hedgeBounds);
	paintBounds(masks.woodlandAllowed, width, woodlandBounds);
	const blockers = syntheticTopologyBlockers(width, height).map((blocker) => ({
		...blocker,
		bounds:
			blocker.sceneryClass === 'hedge'
				? hedgeBounds
				: blocker.language === 'forest-bank'
					? woodlandForestBounds
					: woodlandTreeBounds
	}));
	return { masks, blockers, hedgeBounds, woodlandBounds };
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

function forcedSignalInserts(
	width: number,
	height: number
): DecodedMeadowEntryPaintedV2SceneryInsert[] {
	return decodedInserts(width, height).map((insert, insertIndex) => {
		const data = Buffer.alloc(width * height * 4);
		for (let y = 0; y < height; y += 1)
			for (let x = 0; x < width; x += 1) {
				const at = rgbaOffset(width, x, y);
				const value = x < width / 2 ? 240 - insertIndex * 3 : 16 + insertIndex * 3;
				data[at] = value;
				data[at + 1] = Math.max(0, value - 8);
				data[at + 2] = Math.min(255, value + 8);
				data[at + 3] = 255;
			}
		return { ...insert, rgba: { width, height, data } };
	});
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

function preSceneryMaster(
	width: number,
	height: number,
	value: readonly [number, number, number] = [100, 110, 120]
): { width: number; height: number; data: Buffer } {
	return { width, height, data: filledRgba(width, height, value) };
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
	for (let x = 320; x < 416; x += 1) {
		const notch = x % 2 === 0 ? 0 : 20;
		for (let y = 239; y < 239 + notch; y += 1) result.woodlandAllowed[offset(width, x, y)] = 0;
	}
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
		const data = variedRgba(
			width,
			height,
			insert.sceneryClass === 'hedge' ? [30, 60, 20] : [20, 40, 40],
			index
		);
		if (insert.sceneryClass === 'woodland') {
			for (let y = 0; y < height; y += 1) {
				for (let x = 0; x < width; x += 1) {
					const at = rgbaOffset(width, x, y);
					const value = (Math.floor(x / 32) + Math.floor(y / 32) + index) % 2 === 0 ? 220 : 30;
					data[at] = value;
					data[at + 1] = Math.min(255, value + 8);
					data[at + 2] = Math.min(255, value + 16);
				}
			}
		}
		return {
			id: insert.id,
			sceneryClass: insert.sceneryClass,
			owningSourceId: insert.owningSourceId,
			bounds: { ...owner.bounds },
			rgba: {
				width,
				height,
				data
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
	it('shapes a uniform saturated sparse belt and preserves sub-cap raw weights', () => {
		const fixture = sparseTopologyFixture();
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(
				fixture.contributions,
				fixture.blockers,
				fixture.width,
				fixture.height
			)
		).not.toThrow();
		const result = shapeMeadowEntryPaintedV2SceneryContributions(
			fixture.contributions,
			fixture.blockers,
			fixture.width,
			fixture.height
		);
		const topology = result.rowTopology['synthetic-sparse-belt'];
		expect(topology).toMatchObject({
			kind: 'sparse-core-cap',
			erosionCount: 3,
			originalSaturatedPixelCount: 128,
			retainedSaturatedPixelCount: 20,
			demotedContributionCount: 109
		});
		const rawWeights = fixture.contributions.map(({ rawFinalWeight }) => rawFinalWeight);
		const shapedWeights = [...result.shapedWeights];
		const shadowIndex = fixture.contributions.findIndex(
			({ rawFinalWeight }) => rawFinalWeight === 220
		);
		expect(shadowIndex).toBeGreaterThanOrEqual(0);
		expect(shapedWeights[shadowIndex]).toBe(220);
		expect(rawWeights.filter((value) => value >= 32).length).toBe(
			shapedWeights.filter((value) => value >= 32).length
		);
		expect(shapedWeights.filter((value) => value === 191).length).toBe(109);
		const saturatedRequests = result.requests.filter(({ rawWeight }) => rawWeight >= 254);
		expect(saturatedRequests).toHaveLength(109);
		expect(saturatedRequests.every(({ shapedWeight }) => shapedWeight === 191)).toBe(true);
		for (const request of result.requests) {
			expect(request.reasons).toEqual(['sparse-core-cap']);
			expect(request.shapedWeight).toBe(191);
		}
		expect(result.requests.map(({ contributionIndex }) => contributionIndex)).toEqual(
			[...result.requests.map(({ contributionIndex }) => contributionIndex)].sort((a, b) => a - b)
		);
		expect(result.requestSha256).toBe(stableHash(result.requests));
		expect(topology?.requestSha256).toBe(stableHash(result.requests));
	});

	it('repairs tree slices and fills only distinct edge-capable world pixels', () => {
		const fixture = treeTopologyFixture();
		const lowEdgeSource = fixture.contributions.find(({ rawFinalWeight }) => rawFinalWeight < 32)!;
		const lowEdgeIndex = fixture.contributions.length;
		const contributions = [
			...fixture.contributions,
			topologyContribution(
				'synthetic-tree-wall',
				'tree-low-edge',
				lowEdgeSource.worldIndex,
				31,
				255,
				16,
				9
			)
		];
		const result = shapeMeadowEntryPaintedV2SceneryContributions(
			contributions,
			fixture.blockers,
			fixture.width,
			fixture.height
		);
		const topology = result.rowTopology['synthetic-tree-wall'];
		expect(topology).toMatchObject({
			kind: 'tree-continuity-floor',
			missingSlicePromotionCount: 10,
			coveragePromotionCount: 5,
			promotedWorldPixelCount: 15
		});
		const reasons = result.requests.flatMap(({ reasons }) => reasons);
		expect(reasons.filter((reason) => reason === 'tree-missing-slice')).toHaveLength(10);
		expect(reasons.filter((reason) => reason === 'tree-coverage-floor')).toHaveLength(5);
		expect(result.requests.every(({ shapedWeight, rawWeight }) => shapedWeight >= rawWeight)).toBe(
			true
		);
		expect(result.requests.every(({ shapedWeight }) => shapedWeight >= 32)).toBe(true);
		expect(
			result.requests.some(({ contributionIndex }) => contributionIndex === lowEdgeIndex)
		).toBe(false);
		expect(
			result.requests.every(
				({ contributionIndex }) => contributions[contributionIndex]!.edgeWeight >= 32
			)
		).toBe(true);
		const requestedPixels = result.requests.map(({ worldIndex }) => worldIndex);
		expect(new Set(requestedPixels).size).toBe(requestedPixels.length);
		for (const { worldIndex } of result.requests) {
			const x = worldIndex % fixture.width;
			const y = Math.floor(worldIndex / fixture.width);
			expect(x).toBeGreaterThanOrEqual(fixture.blockers[0]!.bounds.left);
			expect(x).toBeLessThan(fixture.blockers[0]!.bounds.right);
			expect(y).toBeGreaterThanOrEqual(fixture.blockers[0]!.bounds.top);
			expect(y).toBeLessThan(fixture.blockers[0]!.bounds.bottom);
		}
		expect(topology.requestSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.requestSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.requestSha256).toBe(stableHash(result.requests));
		expect(topology.requestSha256).toBe(stableHash(result.requests));
	});

	it('uses every comparator tie-breaker and rejects candidates outside the literal row', () => {
		const fixture = treeTopologyFixture();
		const baseIndex = fixture.contributions.length;
		const candidate = (
			insertId: string,
			y: number,
			rawFinalWeight: number,
			organicSignal: number,
			edgeWeight: number,
			ownerPriority: number
		) =>
			topologyContribution(
				'synthetic-tree-wall',
				insertId,
				offset(fixture.width, 3, y),
				rawFinalWeight,
				organicSignal,
				edgeWeight,
				ownerPriority
			);
		const winner = (candidates: readonly MeadowEntryPaintedV2SceneryContribution[]) => {
			const result = shapeMeadowEntryPaintedV2SceneryContributions(
				[...fixture.contributions, ...candidates],
				fixture.blockers,
				fixture.width,
				fixture.height
			);
			const request = result.requests.find(
				({ contributionIndex, reasons }) =>
					contributionIndex >= baseIndex && reasons.includes('tree-missing-slice')
			);
			expect(request).toBeDefined();
			return { insertId: request!.insertId, worldIndex: request!.worldIndex };
		};

		expect(
			winner([candidate('cmp-raw', 20, 31, 80, 64, 1), candidate('cmp-other', 21, 30, 255, 255, 9)])
		).toEqual({ insertId: 'cmp-raw', worldIndex: offset(fixture.width, 3, 20) });
		expect(
			winner([
				candidate('cmp-organic', 20, 31, 120, 64, 1),
				candidate('cmp-other', 21, 31, 100, 255, 9)
			])
		).toEqual({ insertId: 'cmp-organic', worldIndex: offset(fixture.width, 3, 20) });
		expect(
			winner([
				candidate('cmp-edge', 20, 31, 120, 80, 1),
				candidate('cmp-other', 21, 31, 120, 64, 9)
			])
		).toEqual({ insertId: 'cmp-edge', worldIndex: offset(fixture.width, 3, 20) });
		expect(
			winner([
				candidate('cmp-priority', 20, 31, 120, 80, 2),
				candidate('cmp-other', 21, 31, 120, 80, 1)
			])
		).toEqual({ insertId: 'cmp-priority', worldIndex: offset(fixture.width, 3, 20) });
		expect(
			winner([candidate('cmp-a', 20, 31, 120, 80, 2), candidate('cmp-z', 21, 31, 120, 80, 2)])
		).toEqual({ insertId: 'cmp-a', worldIndex: offset(fixture.width, 3, 20) });
		const worldTie = winner([
			candidate('cmp-same', 21, 31, 120, 80, 2),
			candidate('cmp-same', 20, 31, 120, 80, 2)
		]);
		expect(worldTie).toEqual({ insertId: 'cmp-same', worldIndex: offset(fixture.width, 3, 20) });

		const outsideRow = topologyContribution(
			'synthetic-tree-wall',
			'outside-literal-row',
			offset(fixture.width, 3, fixture.blockers[0]!.bounds.top - 1),
			8,
			128,
			64
		);
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(
				[...fixture.contributions, outsideRow],
				fixture.blockers,
				fixture.width,
				fixture.height
			)
		).toThrow(/outside blocker|outside.*row/i);
	});

	it('derives overlapping tree requests from immutable raw input independent of row order', () => {
		const fixture = treeTopologyFixture();
		const secondBlocker = topologyBlocker(
			'synthetic-tree-wall-overlap',
			bounds(2, 20, 22, 25),
			'tree-wall',
			'woodland'
		);
		const secondContributions = fixture.contributions.map((contribution) => ({
			...contribution,
			blockerId: secondBlocker.sourceId,
			insertId: 'tree-insert-overlap'
		}));
		const contributions = [...fixture.contributions, ...secondContributions];
		const blockers = [fixture.blockers[0]!, secondBlocker];
		const contributionSnapshot = contributions.map((contribution) => ({
			...contribution,
			ownerRelativeTone: [...contribution.ownerRelativeTone]
		}));
		const blockerSnapshot = blockers.map((blocker) => ({
			...blocker,
			bounds: { ...blocker.bounds }
		}));
		const forward = shapeMeadowEntryPaintedV2SceneryContributions(
			contributions,
			blockers,
			fixture.width,
			fixture.height
		);
		const reversed = shapeMeadowEntryPaintedV2SceneryContributions(
			contributions,
			[...blockers].reverse(),
			fixture.width,
			fixture.height
		);

		expect([...forward.shapedWeights]).toEqual([...reversed.shapedWeights]);
		expect(forward.requests).toEqual(reversed.requests);
		expect(forward.requestSha256).toBe(reversed.requestSha256);
		for (const blocker of blockers)
			expect(forward.rowTopology[blocker.sourceId]!.requestSha256).toBe(
				stableHash(
					forward.requests.filter(({ blockerIds }) => blockerIds.includes(blocker.sourceId))
				)
			);
		expect(contributions).toEqual(contributionSnapshot);
		expect(blockers).toEqual(blockerSnapshot);
	});

	it('does not add a coverage request after missing-slice repair already reaches the floor', () => {
		const width = 12;
		const height = 16;
		const blockerId = 'tree-floor-no-fill';
		const blocker = topologyBlocker(blockerId, bounds(2, 4, 6, 8), 'tree-wall', 'woodland');
		const contributions: MeadowEntryPaintedV2SceneryContribution[] = [];
		for (let x = blocker.bounds.left; x < blocker.bounds.right; x += 1)
			for (let y = blocker.bounds.top; y < blocker.bounds.bottom; y += 1)
				contributions.push(
					topologyContribution(
						blockerId,
						'tree-insert',
						offset(width, x, y),
						x === blocker.bounds.left && y === blocker.bounds.top ? 64 : 8,
						y === blocker.bounds.top + ((x - blocker.bounds.left) % 4) ? 220 : 80,
						64
					)
				);
		const result = shapeMeadowEntryPaintedV2SceneryContributions(
			contributions,
			[blocker],
			width,
			height
		);
		expect(result.requests.some(({ reasons }) => reasons.includes('tree-coverage-floor'))).toBe(
			false
		);
		expect(
			result.requests.filter(({ reasons }) => reasons.includes('tree-missing-slice'))
		).toHaveLength(3);
	});

	it('rejects topology inputs that cannot satisfy the bounded language contracts', () => {
		expect(() => shapeMeadowEntryPaintedV2SceneryContributions([], [], 4, 4)).toThrow(
			/requires at least one blocker/i
		);
		const sparseBlocker = topologyBlocker('sparse', bounds(0, 0, 80, 80), 'hedge', 'hedge');
		const wideSparse: MeadowEntryPaintedV2SceneryContribution[] = [];
		for (let y = 0; y < 80; y += 1)
			for (let x = 0; x < 80; x += 1)
				wideSparse.push(
					topologyContribution(
						'sparse',
						'sparse-insert',
						offset(80, x, y),
						255,
						255,
						255,
						1,
						'hedge'
					)
				);
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(wideSparse, [sparseBlocker], 80, 80)
		).toThrow(/bounded erosion/i);

		const treeBlocker = topologyBlocker('tree', bounds(0, 0, 4, 4), 'tree-wall', 'woodland');
		const malformedLanguage = { ...treeBlocker, language: 'not-a-language' as 'tree-wall' };
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(
				[topologyContribution('tree', 'tree-insert', 0, 8, 128, 16)],
				[malformedLanguage],
				4,
				4
			)
		).toThrow(/invalid language/i);
		const incapableTree = Array.from({ length: 16 }, (_, index) =>
			topologyContribution('tree', 'tree-insert', index, 8, 128, 16)
		);
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(incapableTree, [treeBlocker], 4, 4)
		).toThrow(/too few edge-capable pixels/i);

		const uniformTree = Array.from({ length: 16 }, (_, index) =>
			topologyContribution(
				'tree',
				'tree-insert',
				index,
				Math.floor(index / 4) < 2 ? 64 : 8,
				128,
				64
			)
		);
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(uniformTree, [treeBlocker], 4, 4)
		).toThrow(/uniform contour/i);

		const overlapSparse = topologyBlocker('sparse-overlap', bounds(0, 0, 4, 4), 'hedge', 'hedge');
		const overlapTree = topologyBlocker(
			'tree-overlap',
			bounds(0, 0, 4, 4),
			'tree-wall',
			'woodland'
		);
		const overlapContributions = [
			topologyContribution('sparse-overlap', 'sparse-insert', 0, 255, 255, 255, 1, 'hedge'),
			topologyContribution('tree-overlap', 'tree-insert', 0, 64, 128, 64)
		];
		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(
				overlapContributions,
				[overlapSparse, overlapTree],
				4,
				4
			)
		).toThrow(/overlap/i);
	});

	it('rejects out-of-world blocker bounds instead of deriving substitute topology bounds', () => {
		const blocker = topologyBlocker('out-of-world', bounds(0, 0, 4, 5), 'hedge', 'hedge');
		const contributions = Array.from({ length: 16 }, (_, worldIndex) =>
			topologyContribution(
				'out-of-world',
				'out-of-world-insert',
				worldIndex,
				8,
				128,
				255,
				1,
				'hedge'
			)
		);

		expect(() =>
			shapeMeadowEntryPaintedV2SceneryContributions(contributions, [blocker], 4, 4)
		).toThrow(/bounds.*outside|outside.*bounds/i);
	});

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

		expect(() =>
			enrichMeadowEntryPaintedV2Sources(
				panels,
				inserts,
				masks,
				syntheticTopologyBlockers(width, height)
			)
		).toThrow(/q40|q80|organic|degenerate/i);
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
		const result = enrichMeadowEntryPaintedV2Sources(
			panels,
			inserts,
			masks,
			syntheticTopologyBlockers(width, height)
		);

		expect(result.rows).toHaveLength(10);
		expect(result.intersections.length).toBe(16);
		expect(result.formulas.luma).toContain('54*r');
		expect(result.formulas.organicWeight).toContain('meadowEntryDetailFeatherWeight');
		expect(result.formulas.weightedCoverageThreshold).toBe('finalWeight>=32');
		expect(result.topologyRequests.length).toBeGreaterThan(0);
		expect(result.topologyRequestSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.topologyRequestSha256).toBe(stableHash(result.topologyRequests));
		for (const intersection of result.intersections) {
			expect(intersection.sampleCount).toBeGreaterThanOrEqual(64);
			expect(intersection.q40).toBeLessThan(intersection.q80);
			expect(intersection.rawWeightSha256).toMatch(/^[a-f0-9]{64}$/);
			expect(intersection.weightSha256).toMatch(/^[a-f0-9]{64}$/);
		}
		expect(
			result.intersections.some(
				({ rawWeightSha256, weightSha256 }) => rawWeightSha256 !== weightSha256
			)
		).toBe(true);
		for (const row of result.rows) {
			expect(row.coverage, row.blockerId).toBeGreaterThanOrEqual(0.25);
			expect(row.coverage, row.blockerId).toBeLessThanOrEqual(0.7);
			expect(row.rawWeightSha256).toMatch(/^[a-f0-9]{64}$/);
			expect(row.weightSha256).toMatch(/^[a-f0-9]{64}$/);
			expect(row.topology.requestSha256).toMatch(/^[a-f0-9]{64}$/);
			expect(row.topology.requestSha256).toBe(
				stableHash(
					result.topologyRequests.filter(({ blockerIds }) => blockerIds.includes(row.blockerId))
				)
			);
			if (row.topology.kind === 'sparse-core-cap' && row.topology.demotedContributionCount > 0)
				expect(row.rawWeightSha256).not.toBe(row.weightSha256);
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
		const result = enrichMeadowEntryPaintedV2Sources(
			panels,
			inserts,
			masks,
			syntheticTopologyBlockers(width, height)
		);
		const treeRows = result.rows.filter((row) => row.language === 'tree-wall');
		expect(treeRows).toHaveLength(6);
		expect(treeRows[0]!.evaluableSliceCount).toBe(310);
		expect(treeRows.every((row) => row.evaluableSliceCount === row.weightedSliceCount)).toBe(true);
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
			expectedLivePixels: 13_928_520,
			expectedOtherPixels: 13_818_312,
			maskOtherPixels: 13_818_312,
			groundOverlap: 0,
			sceneryOverlap: 0
		});

		const publicMasks = {
			otherProtected: masks.otherProtected,
			groundAllowed: masks.groundAllowed,
			sceneryAllowed: masks.sceneryAllowed,
			hedgeAllowed: masks.hedgeAllowed,
			woodlandAllowed: masks.woodlandAllowed
		};
		const publicMaskHashes = Object.fromEntries(
			Object.entries(publicMasks).map(([name, value]) => [
				name,
				createHash('sha256').update(value).digest('hex')
			])
		);
		expect(publicMaskHashes).toEqual({
			otherProtected: '3f22afca164436a44c73954b208896b9c227986e018b81ff8cc041da6023f656',
			groundAllowed: 'c1bc20acc56b98ae586510f4332bc93657627c4c9b435620247e13181b6cc97d',
			sceneryAllowed: 'ca1c7ec5bbd4b93eb2be7591f074fd458c54aa473944ab7f327c596536d9e156',
			hedgeAllowed: 'd7b76c254bfd69e36b37b26738e0b8322918dcf602a2c02d2f3de18096af16d7',
			woodlandAllowed: '07090d49adc2aa982363208f0cd61a98d8b88863d7a3f937575c0ead5605e3e1'
		});
		const hedgeOutward = meadowEntrySceneryOutwardDistances(masks.hedgeAllowed, 6400, 6400);
		const woodlandOutward = meadowEntrySceneryOutwardDistances(masks.woodlandAllowed, 6400, 6400);
		expect(hedgeOutward).toHaveLength(6400 * 6400);
		expect(woodlandOutward).toHaveLength(6400 * 6400);
		expect(hedgeOutward.some((value) => value === 48)).toBe(true);
		expect(woodlandOutward.some((value) => value === 48)).toBe(true);
		for (const [name, before] of Object.entries(publicMasks))
			expect(createHash('sha256').update(before).digest('hex')).toBe(publicMaskHashes[name]);
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

	it('defines the deterministic organic apron policy and outward 8-neighbor distances', () => {
		expect(MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY).toEqual({
			maximumDistance: 48,
			nearRampDistance: 8,
			maximumWeight: 96,
			maximumChannelResidual: 12,
			maximumLumaShift: 16
		});

		const nine = mask(9, 9);
		paintBounds(nine, 9, bounds(3, 3, 6, 6));
		const outwardNine = meadowEntrySceneryOutwardDistances(nine, 9, 9);
		expect(outwardNine[offset(9, 3, 3)]).toBe(0);
		expect(outwardNine[offset(9, 2, 3)]).toBe(1);
		expect(outwardNine[offset(9, 1, 1)]).toBe(2);

		const seventeen = mask(17, 17);
		seventeen[offset(17, 2, 8)] = 1;
		const outwardSeventeen = meadowEntrySceneryOutwardDistances(seventeen, 17, 17, 4);
		expect(outwardSeventeen[offset(17, 2, 8)]).toBe(0);
		expect(outwardSeventeen[offset(17, 6, 8)]).toBe(4);
		expect(outwardSeventeen[offset(17, 7, 8)]).toBe(5);
	});

	it('composes a candidate apron without changing the core topology contract or masks', () => {
		const width = 160;
		const height = 160;
		const panels = affectedPanels(width, height);
		const inserts = decodedInserts(width, height);
		const masks = syntheticMasks(width, height);
		const maskSnapshot = {
			otherProtected: masks.otherProtected.slice(),
			groundAllowed: masks.groundAllowed.slice(),
			sceneryAllowed: masks.sceneryAllowed.slice(),
			hedgeAllowed: masks.hedgeAllowed.slice(),
			woodlandAllowed: masks.woodlandAllowed.slice(),
			sourceHashes: { ...masks.sourceHashes }
		};
		const blockers = syntheticTopologyBlockers(width, height);
		const legacy = enrichMeadowEntryPaintedV2Sources(panels, inserts, masks, blockers);
		const candidate = enrichMeadowEntryPaintedV2SourcesWithOrganicApron(
			panels,
			inserts,
			masks,
			blockers
		);

		expect(candidate.apron.policy).toEqual(MEADOW_ENTRY_PAINTED_V2_ORGANIC_APRON_POLICY);
		expect(candidate.apron.changedPixelCount).toBeGreaterThan(0);
		expect(candidate.apron.changedPixelCount).toBe(
			candidate.apron.classChangedPixelCounts.hedge +
				candidate.apron.classChangedPixelCounts.woodland
		);
		for (const hashes of [
			candidate.apron.candidateSha256,
			candidate.apron.allowedSha256,
			candidate.apron.distanceSha256
		])
			for (const hash of Object.values(hashes)) expect(hash).toMatch(/^[a-f0-9]{64}$/);
		expect(candidate.apron.weightSha256).toMatch(/^[a-f0-9]{64}$/);

		// The apron is candidate-only: every core pixel, row metric, topology request,
		// and topology hash remains exactly the legacy result.
		expect(candidate.rows).toEqual(legacy.rows);
		expect(candidate.intersections).toEqual(legacy.intersections);
		expect(candidate.topologyRequests).toEqual(legacy.topologyRequests);
		expect(candidate.topologyRequestSha256).toBe(legacy.topologyRequestSha256);
		const coreAllowed = Uint8Array.from(masks.sceneryAllowed, (_, index) =>
			masks.hedgeAllowed[index] === 1 || masks.woodlandAllowed[index] === 1 ? 1 : 0
		);
		for (const panelResult of candidate.panels) {
			const legacyPanel = legacy.panels.find(({ id }) => id === panelResult.id)!;
			for (let y = panelResult.bounds.top; y < panelResult.bounds.bottom; y += 1)
				for (let x = panelResult.bounds.left; x < panelResult.bounds.right; x += 1) {
					const worldIndex = offset(width, x, y);
					if (coreAllowed[worldIndex] !== 1) continue;
					const at = rgbaOffset(
						panelResult.rgba.width,
						x - panelResult.bounds.left,
						y - panelResult.bounds.top
					);
					expect(panelResult.rgba.data.subarray(at, at + 4)).toEqual(
						legacyPanel.rgba.data.subarray(at, at + 4)
					);
				}
		}
		expect(masks.otherProtected).toEqual(maskSnapshot.otherProtected);
		expect(masks.groundAllowed).toEqual(maskSnapshot.groundAllowed);
		expect(masks.sceneryAllowed).toEqual(maskSnapshot.sceneryAllowed);
		expect(masks.hedgeAllowed).toEqual(maskSnapshot.hedgeAllowed);
		expect(masks.woodlandAllowed).toEqual(maskSnapshot.woodlandAllowed);
		expect(masks.sourceHashes).toEqual(maskSnapshot.sourceHashes);

		const before = new Map(affectedPanels(width, height).map((item) => [item.id, item]));
		for (const panelResult of candidate.panels) {
			const original = before.get(panelResult.id);
			if (original === undefined) continue;
			for (let y = panelResult.bounds.top; y < panelResult.bounds.bottom; y += 1)
				for (let x = panelResult.bounds.left; x < panelResult.bounds.right; x += 1) {
					const worldIndex = offset(width, x, y);
					if (coreAllowed[worldIndex] === 1) continue;
					const at = rgbaOffset(
						panelResult.rgba.width,
						x - panelResult.bounds.left,
						y - panelResult.bounds.top
					);
					const beforePixel = original.rgba.data.subarray(at, at + 4);
					const afterPixel = panelResult.rgba.data.subarray(at, at + 4);
					for (let channel = 0; channel < 3; channel += 1)
						expect(Math.abs(afterPixel[channel]! - beforePixel[channel]!)).toBeLessThanOrEqual(12);
					expect(
						Math.abs(
							Math.floor(
								(54 * afterPixel[0]! + 183 * afterPixel[1]! + 19 * afterPixel[2]! + 128) / 256
							) -
								Math.floor(
									(54 * beforePixel[0]! + 183 * beforePixel[1]! + 19 * beforePixel[2]! + 128) / 256
								)
						)
					).toBeLessThanOrEqual(16);
				}
		}

		const reversed = enrichMeadowEntryPaintedV2SourcesWithOrganicApron(
			panels,
			[...inserts].reverse(),
			masks,
			blockers
		);
		expect(reversed.apron).toEqual(candidate.apron);
		for (const [index, panelResult] of candidate.panels.entries())
			expect(panelResult.rgba.data).toEqual(reversed.panels[index]!.rgba.data);
	});

	it('keeps forced adjacent-class apron signals off every legacy core byte', () => {
		const width = 160;
		const height = 160;
		const panels = affectedPanels(width, height);
		const inserts = forcedSignalInserts(width, height);
		const fixture = adjacentClassFixture(width, height);
		const legacy = enrichMeadowEntryPaintedV2Sources(
			panels,
			inserts,
			fixture.masks,
			fixture.blockers
		);
		const candidate = enrichMeadowEntryPaintedV2SourcesWithOrganicApron(
			panels,
			inserts,
			fixture.masks,
			fixture.blockers
		);
		const coreAllowed = Uint8Array.from(fixture.masks.sceneryAllowed, (_, index) =>
			fixture.masks.hedgeAllowed[index] === 1 || fixture.masks.woodlandAllowed[index] === 1 ? 1 : 0
		);
		for (const panelResult of candidate.panels) {
			const legacyPanel = legacy.panels.find(({ id }) => id === panelResult.id)!;
			for (let y = panelResult.bounds.top; y < panelResult.bounds.bottom; y += 1)
				for (let x = panelResult.bounds.left; x < panelResult.bounds.right; x += 1) {
					if (coreAllowed[offset(width, x, y)] !== 1) continue;
					const at = rgbaOffset(
						panelResult.rgba.width,
						x - panelResult.bounds.left,
						y - panelResult.bounds.top
					);
					expect(panelResult.rgba.data.subarray(at, at + 4)).toEqual(
						legacyPanel.rgba.data.subarray(at, at + 4)
					);
				}
		}
		expect(candidate.apron.changedPixelCount).toBeGreaterThan(0);
		expect(fixture.hedgeBounds.right).toBe(fixture.woodlandBounds.left);
	});

	it('rejects independent overlap decoration and selects one world-canonical contribution', () => {
		const width = 160;
		const height = 160;
		const panels = affectedPanels(width, height);
		const inserts = forcedSignalInserts(width, height);
		const fixture = adjacentClassFixture(width, height);
		const legacy = enrichMeadowEntryPaintedV2SourcesWithOrganicApron(
			panels,
			inserts,
			fixture.masks,
			fixture.blockers
		);
		const ownerIds = [
			'camera-underlay-sundrop-south',
			'camera-underlay-crossroads-north',
			'camera-underlay-crossroads-south',
			'crossroads'
		];
		let conflictingWorldIndex = -1;
		for (let index = 0; index < width * height && conflictingWorldIndex < 0; index += 1) {
			if (fixture.masks.sceneryAllowed[index] !== 1) continue;
			const pixels = ownerIds.map((id) => {
				const panelValue = legacy.panels.find(({ id: panelId }) => panelId === id)!;
				const before = panels.find(({ id: panelId }) => panelId === id)!;
				const at = index * 4;
				return {
					changed: !panelValue.rgba.data
						.subarray(at, at + 3)
						.equals(before.rgba.data.subarray(at, at + 3)),
					pixel: panelValue.rgba.data.subarray(at, at + 3).toString('hex')
				};
			});
			if (
				pixels.filter(({ changed }) => changed).length >= 2 &&
				new Set(pixels.map(({ pixel }) => pixel)).size > 1
			)
				conflictingWorldIndex = index;
		}
		expect(conflictingWorldIndex).toBeGreaterThanOrEqual(0);

		const canonical = enrichMeadowEntryPaintedV2WorldWithOrganicApron(
			preSceneryMaster(width, height),
			inserts,
			fixture.masks,
			fixture.blockers
		);
		expect(canonical.selectedWorldPixelCount).toBeGreaterThan(0);
		expect(canonical.master.data).toHaveLength(width * height * 4);
		expect(canonical.master.data[conflictingWorldIndex * 4 + 3]).toBe(255);
		const worldX = conflictingWorldIndex % width;
		const worldY = Math.floor(conflictingWorldIndex / width);
		const masterPixel = canonical.master.data.subarray(
			conflictingWorldIndex * 4,
			conflictingWorldIndex * 4 + 4
		);
		for (const panel of canonical.panels) {
			if (
				worldX < panel.bounds.left ||
				worldX >= panel.bounds.right ||
				worldY < panel.bounds.top ||
				worldY >= panel.bounds.bottom
			)
				continue;
			const localOffset =
				((worldY - panel.bounds.top) * panel.rgba.width + worldX - panel.bounds.left) * 4;
			expect(panel.rgba.data.subarray(localOffset, localOffset + 4)).toEqual(masterPixel);
			expect(canonical.enrichedSourceSha256[panel.id]).toBe(
				createHash('sha256').update(panel.rgba.data).digest('hex')
			);
		}

		const master = preSceneryMaster(width, height);
		const masterSnapshot = Buffer.from(master.data);
		const insertSnapshots = inserts.map(({ rgba }) => Buffer.from(rgba.data));
		const maskSnapshot = {
			otherProtected: fixture.masks.otherProtected.slice(),
			groundAllowed: fixture.masks.groundAllowed.slice(),
			sceneryAllowed: fixture.masks.sceneryAllowed.slice(),
			hedgeAllowed: fixture.masks.hedgeAllowed.slice(),
			woodlandAllowed: fixture.masks.woodlandAllowed.slice(),
			sourceHashes: { ...fixture.masks.sourceHashes }
		};
		const ordered = enrichMeadowEntryPaintedV2WorldWithOrganicApron(
			master,
			inserts,
			fixture.masks,
			fixture.blockers
		);
		const reversed = enrichMeadowEntryPaintedV2WorldWithOrganicApron(
			master,
			[...inserts].reverse(),
			fixture.masks,
			fixture.blockers
		);
		expect(master.data).toEqual(masterSnapshot);
		for (const [index, insert] of inserts.entries())
			expect(insert.rgba.data).toEqual(insertSnapshots[index]!);
		expect(fixture.masks.otherProtected).toEqual(maskSnapshot.otherProtected);
		expect(fixture.masks.groundAllowed).toEqual(maskSnapshot.groundAllowed);
		expect(fixture.masks.sceneryAllowed).toEqual(maskSnapshot.sceneryAllowed);
		expect(fixture.masks.hedgeAllowed).toEqual(maskSnapshot.hedgeAllowed);
		expect(fixture.masks.woodlandAllowed).toEqual(maskSnapshot.woodlandAllowed);
		expect(fixture.masks.sourceHashes).toEqual(maskSnapshot.sourceHashes);
		expect(reversed.master.data).toEqual(ordered.master.data);
		expect(reversed.apron).toEqual(ordered.apron);
		expect(reversed.selectedWorldPixelCount).toBe(ordered.selectedWorldPixelCount);
		expect(ordered.selectedWorldPixelCount).toBeLessThan(width * height);
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
		const result = enrichMeadowEntryPaintedV2Sources(
			panels,
			inserts,
			masks,
			syntheticTopologyBlockers(width, height)
		);

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
		const first = enrichMeadowEntryPaintedV2Sources(
			panels,
			inserts,
			masks,
			syntheticTopologyBlockers(width, height)
		);
		const second = enrichMeadowEntryPaintedV2Sources(
			panels,
			[...inserts].reverse(),
			masks,
			syntheticTopologyBlockers(width, height)
		);
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

		enrichMeadowEntryPaintedV2Sources(
			panels,
			inserts,
			masks,
			syntheticTopologyBlockers(width, height)
		);
		for (const [index, item] of panels.entries()) expect(item.rgba.data).toEqual(panelBytes[index]);
		for (const [index, item] of inserts.entries())
			expect(item.rgba.data).toEqual(insertBytes[index]);
		for (const key of maskKeys) expect(masks[key]).toEqual(maskBytes[key]);
	});

	it('preserves panel boundaries before applying scenery once in world-canonical space', async () => {
		const fixture = assemblyFixture();
		const before = clonePanels(fixture.panels);
		const enriched = enrichMeadowEntryPaintedV2Sources(
			fixture.panels,
			fixture.inserts,
			fixture.masks,
			syntheticTopologyBlockers(512, 512)
		);
		const plain = await composeAssembly(fixture, before);
		const canonicalInput = {
			data: Buffer.from(plain.data),
			width: plain.width,
			height: plain.height
		};
		const canonicalInputBefore = Buffer.from(canonicalInput.data);
		const canonical = enrichMeadowEntryPaintedV2WorldWithOrganicApron(
			canonicalInput,
			fixture.inserts,
			fixture.masks,
			syntheticTopologyBlockers(512, 512)
		);
		expect(canonicalInput.data).toEqual(canonicalInputBefore);
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
				if (plain.data.subarray(at, at + 4).equals(canonical.master.data.subarray(at, at + 4)))
					continue;
				if (
					fixture.masks.sceneryAllowed[offset(512, x, y)] === 1 ||
					fixture.masks.groundAllowed[offset(512, x, y)] === 1
				)
					insideSceneryDifferences += 1;
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
