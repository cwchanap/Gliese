import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PixelBounds } from './meadow-entry-authoring-types';
import { MEADOW_ENTRY_PROTECTION_MARGINS } from './meadow-entry-bake-ownership';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint,
	renderMeadowEntryControls,
	type MeadowEntryControlInputs
} from './meadow-entry-controls';
import { MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS } from './meadow-entry-painted-v2-pilot';
import {
	blendMeadowEntryDetailChannel,
	meadowEntryDetailFeatherWeight,
	type MeadowEntryDetailDecodedPanel
} from './meadow-entry-painted-v2-underlay-assembly';
import {
	MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
	MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
	validateMeadowEntryPaintedV2SceneryContract,
	type MeadowEntryPaintedV2SceneryClass
} from './meadow-entry-painted-v2-scenery';
import { meadowEntrySourceKey, type MeadowEntrySourceRecord } from './meadow-entry-source-catalog';
import type { DecodedMeadowEntryRgba } from './meadow-entry-png';

const MASK_WIDTH = 6_400 as const;
const MASK_HEIGHT = 6_400 as const;
const MAX_SCENERY_DISTANCE = 15 as const;
const AFFECTED_SOURCE_IDS = [
	'camera-underlay-sundrop-south',
	'camera-underlay-crossroads-north',
	'camera-underlay-crossroads-south',
	'crossroads'
] as const;

export interface MeadowEntryPaintedV2SceneryMaskSet {
	readonly width: 6400;
	readonly height: 6400;
	readonly selectedBlockers: Uint8Array;
	readonly otherProtected: Uint8Array;
	readonly groundAllowed: Uint8Array;
	readonly sceneryAllowed: Uint8Array;
	readonly hedgeAllowed: Uint8Array;
	readonly woodlandAllowed: Uint8Array;
	readonly decorationAllowed: Uint8Array;
	readonly sourceHashes: Readonly<Record<string, string>>;
}

export interface DecodedMeadowEntryPaintedV2SceneryInsert {
	readonly id: string;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
	readonly owningSourceId: string;
	readonly bounds: PixelBounds;
	readonly rgba: DecodedMeadowEntryRgba;
}

export interface MeadowEntryPaintedV2SceneryBakeResult {
	readonly panels: readonly MeadowEntryDetailDecodedPanel[];
	readonly enrichedSourceSha256: Readonly<Record<string, string>>;
	readonly changedPixelCount: number;
	readonly classChangedPixelCounts: Readonly<Record<MeadowEntryPaintedV2SceneryClass, number>>;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Uint8Array | string): string {
	return createHash('sha256').update(value).digest('hex');
}

function stable(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? '';
	if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
		.join(',')}}`;
}

function boundsEqual(first: PixelBounds, second: PixelBounds): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function boundsWidth(bounds: PixelBounds): number {
	return bounds.right - bounds.left;
}

function boundsHeight(bounds: PixelBounds): number {
	return bounds.bottom - bounds.top;
}

function assertBounds(bounds: PixelBounds, width: number, height: number, label: string): void {
	assert(
		Number.isInteger(bounds.left) &&
			Number.isInteger(bounds.top) &&
			Number.isInteger(bounds.right) &&
			Number.isInteger(bounds.bottom) &&
			bounds.left >= 0 &&
			bounds.top >= 0 &&
			bounds.right <= width &&
			bounds.bottom <= height &&
			bounds.right > bounds.left &&
			bounds.bottom > bounds.top,
		`${label} bounds are invalid`
	);
}

function assertMaskDimensions(
	mask: Uint8Array,
	width: number,
	height: number,
	label: string
): void {
	assert(mask.byteLength === width * height, `${label} dimensions are invalid`);
	for (const value of mask) {
		assert(value === 0 || value === 1, `${label} must be binary`);
	}
}

function assertMaskSet(
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	requireCanonicalDimensions = false
): {
	width: number;
	height: number;
} {
	if (requireCanonicalDimensions) {
		assert(
			masks.width === MASK_WIDTH && masks.height === MASK_HEIGHT,
			'Meadow Entry scenery masks must be 6400x6400'
		);
	}
	const width = masks.width;
	const height = masks.height;
	assertMaskDimensions(masks.selectedBlockers, width, height, 'selected blockers mask');
	assertMaskDimensions(masks.otherProtected, width, height, 'other protected mask');
	assertMaskDimensions(masks.groundAllowed, width, height, 'ground allowed mask');
	assertMaskDimensions(masks.sceneryAllowed, width, height, 'scenery allowed mask');
	assertMaskDimensions(masks.hedgeAllowed, width, height, 'hedge allowed mask');
	assertMaskDimensions(masks.woodlandAllowed, width, height, 'woodland allowed mask');
	assertMaskDimensions(masks.decorationAllowed, width, height, 'decoration allowed mask');
	for (let index = 0; index < width * height; index += 1) {
		assert(
			!(masks.hedgeAllowed[index] === 1 && masks.woodlandAllowed[index] === 1),
			`Meadow Entry hedge and woodland masks overlap at pixel ${index}`
		);
		const union = masks.groundAllowed[index] === 1 || masks.sceneryAllowed[index] === 1 ? 1 : 0;
		assert(
			masks.decorationAllowed[index] === union,
			`Meadow Entry decoration mask is not the ground/scenery union at pixel ${index}`
		);
	}
	return { width, height };
}

function fillBounds(mask: Uint8Array, width: number, bounds: PixelBounds): void {
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		let index = y * width + bounds.left;
		for (let x = bounds.left; x < bounds.right; x += 1) {
			mask[index] = 1;
			index += 1;
		}
	}
}

function fillMaskFromBounds(
	mask: Uint8Array,
	width: number,
	height: number,
	bounds: readonly PixelBounds[]
): void {
	for (const item of bounds) {
		assertBounds(item, width, height, 'Meadow Entry scenery source');
		fillBounds(mask, width, item);
	}
}

function insetBounds(bounds: PixelBounds): PixelBounds | null {
	const result = {
		left: bounds.left + MEADOW_ENTRY_PROTECTION_MARGINS.left,
		top: bounds.top + MEADOW_ENTRY_PROTECTION_MARGINS.top,
		right: bounds.right - MEADOW_ENTRY_PROTECTION_MARGINS.right,
		bottom: bounds.bottom - MEADOW_ENTRY_PROTECTION_MARGINS.bottom
	};
	return result.left < result.right && result.top < result.bottom ? result : null;
}

function sourceBounds(
	input: MeadowEntryControlInputs,
	record: MeadowEntrySourceRecord
): PixelBounds | null {
	if (record.bounds !== null) {
		return {
			left: Math.floor(record.bounds.left),
			top: Math.floor(record.bounds.top),
			right: Math.ceil(record.bounds.right),
			bottom: Math.ceil(record.bounds.bottom)
		};
	}
	const key = meadowEntrySourceKey(record.ref);
	return input.controlClearanceRects.find(({ id }) => id === key)?.bounds ?? null;
}

function sourceBoundsByKey(input: MeadowEntryControlInputs): ReadonlyMap<string, PixelBounds> {
	return new Map(
		input.sourceCatalog.flatMap((record) => {
			const bounds = sourceBounds(input, record);
			return bounds ? [[meadowEntrySourceKey(record.ref), bounds] as const] : [];
		})
	);
}

function fillOwnedSourceMask(
	mask: Uint8Array,
	input: MeadowEntryControlInputs,
	types: readonly string[],
	sourceBoundsBySourceKey: ReadonlyMap<string, PixelBounds>
): void {
	const allowed = new Set(types);
	for (const record of input.sourceCatalog) {
		if (!allowed.has(record.ref.sourceType)) continue;
		const bounds = sourceBoundsBySourceKey.get(meadowEntrySourceKey(record.ref));
		if (bounds) {
			fillBounds(mask, input.worldBounds.right - input.worldBounds.left, bounds);
		}
	}
}

function buildGroundAndSceneryMasks(
	input: MeadowEntryControlInputs
): Omit<MeadowEntryPaintedV2SceneryMaskSet, 'sourceHashes'> {
	const width = input.worldBounds.right - input.worldBounds.left;
	const height = input.worldBounds.bottom - input.worldBounds.top;
	assert(
		width === MASK_WIDTH && height === MASK_HEIGHT,
		'Meadow Entry world bounds must be 6400x6400'
	);
	const pixels = width * height;
	const cropUnion = new Uint8Array(pixels);
	const selectedBlockers = new Uint8Array(pixels);
	const protectedLive = new Uint8Array(pixels);
	const otherProtected = new Uint8Array(pixels);
	const building = new Uint8Array(pixels);
	const transition = new Uint8Array(pixels);
	const rewardDiscovery = new Uint8Array(pixels);
	const semanticAnchor = new Uint8Array(pixels);
	const routeCore = new Uint8Array(pixels);
	const groundAllowed = new Uint8Array(pixels);
	const sceneryAllowed = new Uint8Array(pixels);
	const hedgeAllowed = new Uint8Array(pixels);
	const woodlandAllowed = new Uint8Array(pixels);
	const decorationAllowed = new Uint8Array(pixels);

	fillMaskFromBounds(
		cropUnion,
		width,
		height,
		input.crops.map(({ bounds }) => bounds)
	);
	const sourceBoundsMap = sourceBoundsByKey(input);
	const selectedBlockerIds = new Set(
		MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map(({ sourceId }) => sourceId)
	);
	for (const blocker of MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS)
		fillBounds(selectedBlockers, width, blocker.bounds);

	const protectedEntries = input.bakeOwnership.filter(
		(entry) => entry.disposition.mode === 'protected-live'
	);
	assert(
		input.protectedRects.length === protectedEntries.length,
		'Meadow Entry protected control rectangles are out of sync with protected ownership'
	);
	for (const [index, bounds] of input.protectedRects.entries()) {
		assertBounds(bounds, width, height, 'Meadow Entry protected control');
		fillBounds(protectedLive, width, bounds);
		const entry = protectedEntries[index]!;
		if (!selectedBlockerIds.has(entry.ref.sourceId)) fillBounds(otherProtected, width, bounds);
	}

	fillOwnedSourceMask(building, input, ['landmark'], sourceBoundsMap);
	fillOwnedSourceMask(transition, input, ['landmark', 'transition'], sourceBoundsMap);
	fillOwnedSourceMask(rewardDiscovery, input, ['pickup', 'discovery'], sourceBoundsMap);
	fillOwnedSourceMask(semanticAnchor, input, ['decor', 'landmark'], sourceBoundsMap);
	fillMaskFromBounds(
		semanticAnchor,
		width,
		height,
		input.controlClearanceRects.map(({ bounds }) => bounds)
	);
	for (const record of input.sourceCatalog) {
		if (record.ref.sourceType !== 'ground-patch') continue;
		const bounds = sourceBoundsMap.get(meadowEntrySourceKey(record.ref));
		const inset = bounds ? insetBounds(bounds) : null;
		if (inset) fillBounds(routeCore, width, inset);
	}

	for (let index = 0; index < pixels; index += 1) {
		const controlsClear =
			protectedLive[index] === 0 &&
			building[index] === 0 &&
			transition[index] === 0 &&
			rewardDiscovery[index] === 0 &&
			semanticAnchor[index] === 0 &&
			routeCore[index] === 0;
		groundAllowed[index] = cropUnion[index] === 1 && controlsClear ? 1 : 0;
		const sceneryClear =
			otherProtected[index] === 0 &&
			building[index] === 0 &&
			transition[index] === 0 &&
			rewardDiscovery[index] === 0 &&
			semanticAnchor[index] === 0 &&
			routeCore[index] === 0;
		sceneryAllowed[index] =
			cropUnion[index] === 1 && selectedBlockers[index] === 1 && sceneryClear ? 1 : 0;
		decorationAllowed[index] = groundAllowed[index] === 1 || sceneryAllowed[index] === 1 ? 1 : 0;
	}
	for (const blocker of MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS) {
		const target = blocker.sceneryClass === 'hedge' ? hedgeAllowed : woodlandAllowed;
		for (let y = blocker.bounds.top; y < blocker.bounds.bottom; y += 1) {
			let index = y * width + blocker.bounds.left;
			for (let x = blocker.bounds.left; x < blocker.bounds.right; x += 1) {
				if (sceneryAllowed[index] === 1) target[index] = 1;
				index += 1;
			}
		}
	}

	return {
		width: MASK_WIDTH,
		height: MASK_HEIGHT,
		selectedBlockers,
		otherProtected,
		groundAllowed,
		sceneryAllowed,
		hedgeAllowed,
		woodlandAllowed,
		decorationAllowed
	};
}

function assertSourceHash(value: string, label: string): void {
	assert(/^[a-f0-9]{64}$/.test(value), `${label} must be a lowercase SHA-256 hash`);
}

function sourceHashes(
	repositoryRoot: string,
	input: MeadowEntryControlInputs
): Readonly<Record<string, string>> {
	const hashes: Record<string, string> = {};
	for (const [path, hash] of Object.entries(input.sourceFileHashes))
		hashes[`source:${path}`] = hash;
	const renderedControls = renderMeadowEntryControls(input);
	for (const [filename, content] of Object.entries(renderedControls)) {
		hashes[`control:${filename}`] = sha256(content);
	}
	for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
		for (const path of [panel.rawPath, panel.normalizedPath, panel.provenancePath]) {
			hashes[`raster:${path}`] = sha256(readFileSync(join(repositoryRoot, path)));
		}
	}
	hashes['derivation:control-fingerprint'] = computeMeadowEntryCombinedControlFingerprint(input);
	hashes['derivation:crop-union'] = sha256(stable(input.crops));
	hashes['derivation:scenery-contract'] = sha256(
		stable({
			blockers: MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
			inserts: MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS
		})
	);
	hashes['derivation:protection-margins'] = sha256(stable(MEADOW_ENTRY_PROTECTION_MARGINS));
	for (const [key, value] of Object.entries(hashes)) assertSourceHash(value, key);
	return Object.freeze(hashes);
}

export function buildMeadowEntryPaintedV2SceneryMaskSet(
	repositoryRoot = process.cwd()
): MeadowEntryPaintedV2SceneryMaskSet {
	const input = buildMeadowEntryControlInputs(repositoryRoot);
	const masks = buildGroundAndSceneryMasks(input);
	const result = {
		...masks,
		sourceHashes: sourceHashes(repositoryRoot, input)
	} as MeadowEntryPaintedV2SceneryMaskSet;
	assertMaskSet(result, true);
	return result;
}

export const buildMeadowEntryPaintedV2SceneryMasks = buildMeadowEntryPaintedV2SceneryMaskSet;

export function erodeMeadowEntryMask8(
	source: Uint8Array,
	width: number,
	height: number
): Uint8Array {
	assert(Number.isInteger(width) && width > 0, 'Meadow Entry erosion width is invalid');
	assert(Number.isInteger(height) && height > 0, 'Meadow Entry erosion height is invalid');
	assert(
		source.byteLength === width * height,
		'Meadow Entry erosion source dimensions are invalid'
	);
	for (const value of source)
		assert(value === 0 || value === 1, 'Meadow Entry erosion source must be binary');
	const result = new Uint8Array(source.byteLength);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			if (source[index] !== 1) continue;
			let allNeighbors = true;
			for (let dy = -1; dy <= 1 && allNeighbors; dy += 1) {
				for (let dx = -1; dx <= 1; dx += 1) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || nx >= width || ny < 0 || ny >= height || source[ny * width + nx] !== 1) {
						allNeighbors = false;
						break;
					}
				}
			}
			if (allNeighbors) result[index] = 1;
		}
	}
	return result;
}

export function meadowEntrySceneryInsetDistances(
	classAllowed: Uint8Array,
	width: number,
	height: number,
	maximumDistance = MAX_SCENERY_DISTANCE
): Uint8Array {
	assert(
		Number.isInteger(maximumDistance) && maximumDistance >= 0,
		'Meadow Entry scenery distance cap is invalid'
	);
	assert(Number.isInteger(width) && width > 0, 'Meadow Entry scenery distance width is invalid');
	assert(Number.isInteger(height) && height > 0, 'Meadow Entry scenery distance height is invalid');
	assert(
		classAllowed.byteLength === width * height,
		'Meadow Entry scenery distance dimensions are invalid'
	);
	for (const value of classAllowed)
		assert(value === 0 || value === 1, 'Meadow Entry scenery mask must be binary');

	// An 8-neighbor erosion depth is the Chebyshev distance to the nearest zero
	// pixel (or the outside of the image), minus one. Two raster passes compute
	// that exact distance without allocating every E(k) intermediate.
	const distanceToZero = new Uint16Array(width * height);
	distanceToZero.fill(0xffff);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			if (classAllowed[index] === 0) {
				distanceToZero[index] = 0;
				continue;
			}
			let best = x === 0 || y === 0 ? 1 : 0xffff;
			if (x > 0) best = Math.min(best, distanceToZero[index - 1]! + 1);
			if (y > 0) {
				best = Math.min(best, distanceToZero[index - width]! + 1);
				if (x > 0) best = Math.min(best, distanceToZero[index - width - 1]! + 1);
				if (x + 1 < width) best = Math.min(best, distanceToZero[index - width + 1]! + 1);
			}
			distanceToZero[index] = best;
		}
	}
	for (let y = height - 1; y >= 0; y -= 1) {
		for (let x = width - 1; x >= 0; x -= 1) {
			const index = y * width + x;
			if (classAllowed[index] === 0) continue;
			let best = x + 1 === width || y + 1 === height ? 1 : distanceToZero[index]!;
			if (x + 1 < width) best = Math.min(best, distanceToZero[index + 1]! + 1);
			if (y + 1 < height) {
				best = Math.min(best, distanceToZero[index + width]! + 1);
				if (x > 0) best = Math.min(best, distanceToZero[index + width - 1]! + 1);
				if (x + 1 < width) best = Math.min(best, distanceToZero[index + width + 1]! + 1);
			}
			distanceToZero[index] = best;
		}
	}
	const result = new Uint8Array(width * height);
	for (let index = 0; index < result.length; index += 1) {
		if (classAllowed[index] === 0) continue;
		result[index] = Math.min(maximumDistance, Math.max(0, distanceToZero[index]! - 1));
	}
	return result;
}

function validateDecodedCoverage(
	panels: readonly MeadowEntryDetailDecodedPanel[],
	inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[],
	width: number,
	height: number
): ReadonlyMap<string, MeadowEntryDetailDecodedPanel> {
	const intersections = validateMeadowEntryPaintedV2SceneryContract();
	assert(
		intersections.length === 16,
		`Meadow Entry scenery coverage matrix must contain exactly 16 intersections; received ${intersections.length}`
	);
	const canonicalPanelById = new Map(
		MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS.map((panel) => [panel.id, panel])
	);
	const panelById = new Map<string, MeadowEntryDetailDecodedPanel>();
	for (const panel of panels) {
		assert(!panelById.has(panel.id), `Duplicate Meadow Entry scenery panel: ${panel.id}`);
		assertBounds(
			panel.bounds,
			Number.MAX_SAFE_INTEGER,
			Number.MAX_SAFE_INTEGER,
			`Panel ${panel.id}`
		);
		const canonicalPanel = canonicalPanelById.get(panel.id);
		if (width === MASK_WIDTH && height === MASK_HEIGHT && canonicalPanel !== undefined) {
			assert(
				boundsEqual(panel.bounds, canonicalPanel.bounds),
				`Panel ${panel.id} bounds do not match the sealed source-panel registry`
			);
		}
		assert(
			panel.rgba.width === boundsWidth(panel.bounds) &&
				panel.rgba.height === boundsHeight(panel.bounds) &&
				panel.rgba.data.byteLength === panel.rgba.width * panel.rgba.height * 4,
			`Panel ${panel.id} decoded dimensions do not match bounds`
		);
		panelById.set(panel.id, panel);
	}
	const expectedById = new Map(
		MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((insert) => [insert.id, insert])
	);
	assert(
		inserts.length === expectedById.size,
		`Meadow Entry scenery bake requires exactly ${expectedById.size} insert rows`
	);
	const seen = new Set<string>();
	for (const insert of inserts) {
		assert(!seen.has(insert.id), `Duplicate Meadow Entry scenery bake insert: ${insert.id}`);
		seen.add(insert.id);
		const expected = expectedById.get(insert.id);
		assert(expected !== undefined, `Unexpected Meadow Entry scenery bake insert: ${insert.id}`);
		assert(
			insert.sceneryClass === expected.sceneryClass,
			`Scenery insert class drifted: ${insert.id}`
		);
		assert(
			insert.owningSourceId === expected.owningSourceId,
			`Scenery insert owner drifted: ${insert.id}`
		);
		assertBounds(insert.bounds, width, height, `Scenery insert ${insert.id}`);
		const owner = panelById.get(insert.owningSourceId);
		assert(owner !== undefined, `Scenery insert owner panel is missing: ${insert.id}`);
		assert(
			boundsEqual(insert.bounds, owner.bounds),
			`Scenery insert bounds do not match owner: ${insert.id}`
		);
		assert(
			insert.rgba.width === boundsWidth(insert.bounds) &&
				insert.rgba.height === boundsHeight(insert.bounds) &&
				insert.rgba.data.byteLength === insert.rgba.width * insert.rgba.height * 4,
			`Scenery insert decoded dimensions do not match bounds: ${insert.id}`
		);
	}
	for (const expected of MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS) {
		assert(seen.has(expected.id), `Missing Meadow Entry scenery bake insert: ${expected.id}`);
	}
	for (const sourceId of AFFECTED_SOURCE_IDS) {
		assert(panelById.has(sourceId), `Missing affected Meadow Entry scenery panel: ${sourceId}`);
	}
	return panelById;
}

function clonePanel(panel: MeadowEntryDetailDecodedPanel): MeadowEntryDetailDecodedPanel {
	return { ...panel, rgba: { ...panel.rgba, data: Buffer.from(panel.rgba.data) } };
}

function classMask(
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	sceneryClass: MeadowEntryPaintedV2SceneryClass
): Uint8Array {
	return sceneryClass === 'hedge' ? masks.hedgeAllowed : masks.woodlandAllowed;
}

export function enrichMeadowEntryPaintedV2Sources(
	panels: readonly MeadowEntryDetailDecodedPanel[],
	inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[],
	masks: MeadowEntryPaintedV2SceneryMaskSet
): MeadowEntryPaintedV2SceneryBakeResult {
	const { width, height } = assertMaskSet(masks);
	const panelById = validateDecodedCoverage(panels, inserts, width, height);
	const distances = {
		hedge: meadowEntrySceneryInsetDistances(masks.hedgeAllowed, width, height),
		woodland: meadowEntrySceneryInsetDistances(masks.woodlandAllowed, width, height)
	} satisfies Record<MeadowEntryPaintedV2SceneryClass, Uint8Array>;
	const mutable = new Map<string, MeadowEntryDetailDecodedPanel>();
	for (const sourceId of AFFECTED_SOURCE_IDS)
		mutable.set(sourceId, clonePanel(panelById.get(sourceId)!));
	let changedPixelCount = 0;
	const classChangedPixelCounts: Record<MeadowEntryPaintedV2SceneryClass, number> = {
		hedge: 0,
		woodland: 0
	};
	for (const insert of inserts) {
		const owner = panelById.get(insert.owningSourceId)!;
		const enriched = mutable.get(insert.owningSourceId)!;
		const allowed = classMask(masks, insert.sceneryClass);
		const insetDistances = distances[insert.sceneryClass];
		for (let y = insert.bounds.top; y < insert.bounds.bottom; y += 1) {
			for (let x = insert.bounds.left; x < insert.bounds.right; x += 1) {
				const maskOffset = y * width + x;
				if (
					masks.sceneryAllowed[maskOffset] !== 1 ||
					masks.otherProtected[maskOffset] !== 0 ||
					allowed[maskOffset] !== 1
				)
					continue;
				const ownerOffset =
					((y - owner.bounds.top) * owner.rgba.width + (x - owner.bounds.left)) * 4;
				const insertOffset =
					((y - insert.bounds.top) * insert.rgba.width + (x - insert.bounds.left)) * 4;
				const weight = meadowEntryDetailFeatherWeight(
					Math.min(insetDistances[maskOffset] ?? 0, MAX_SCENERY_DISTANCE),
					MAX_SCENERY_DISTANCE
				);
				let pixelChanged = false;
				for (let channel = 0; channel < 3; channel += 1) {
					const blended = blendMeadowEntryDetailChannel(
						enriched.rgba.data[ownerOffset + channel]!,
						insert.rgba.data[insertOffset + channel]!,
						weight
					);
					if (blended !== enriched.rgba.data[ownerOffset + channel]) pixelChanged = true;
					enriched.rgba.data[ownerOffset + channel] = blended;
				}
				if (pixelChanged) {
					changedPixelCount += 1;
					classChangedPixelCounts[insert.sceneryClass] += 1;
				}
			}
		}
	}
	const outputPanels = panels.map((panel) => mutable.get(panel.id) ?? panel);
	const enrichedSourceSha256 = Object.fromEntries(
		AFFECTED_SOURCE_IDS.map((sourceId) => [sourceId, sha256(mutable.get(sourceId)!.rgba.data)])
	);
	return {
		panels: outputPanels,
		enrichedSourceSha256: Object.freeze(enrichedSourceSha256),
		changedPixelCount,
		classChangedPixelCounts: Object.freeze(classChangedPixelCounts)
	};
}
