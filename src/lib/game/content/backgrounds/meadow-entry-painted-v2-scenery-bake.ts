import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { PixelBounds } from './meadow-entry-authoring-types';
import { meadowEntryNearestRank } from './meadow-entry-detail-boundary-metrics';
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
	type MeadowEntryPaintedV2SceneryClass,
	type MeadowEntryPaintedV2SceneryLanguage
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
	readonly otherProtected: Uint8Array;
	readonly groundAllowed: Uint8Array;
	readonly sceneryAllowed: Uint8Array;
	readonly hedgeAllowed: Uint8Array;
	readonly woodlandAllowed: Uint8Array;
	readonly sourceHashes: Readonly<Record<string, string>>;
}

export interface DecodedMeadowEntryPaintedV2SceneryInsert {
	readonly id: string;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
	readonly owningSourceId: string;
	readonly bounds: PixelBounds;
	readonly rgba: DecodedMeadowEntryRgba;
}

export interface MeadowEntryPaintedV2SceneryIntersectionMetric {
	readonly blockerId: string;
	readonly insertId: string;
	readonly owningSourceId: string;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
	readonly sampleCount: number;
	readonly q40: number;
	readonly q80: number;
	readonly weightSha256: string;
}

export interface MeadowEntryPaintedV2SceneryRowMetricBase {
	readonly blockerId: string;
	readonly language: MeadowEntryPaintedV2SceneryLanguage;
	readonly sceneryClass: MeadowEntryPaintedV2SceneryClass;
	readonly eligiblePixelCount: number;
	readonly weightedPixelCount: number;
	readonly coverage: number;
	readonly weightSha256: string;
}

export interface MeadowEntryPaintedV2SceneryClumpRunMetric extends MeadowEntryPaintedV2SceneryRowMetricBase {
	readonly metricKind: 'clump-runs';
	readonly language: 'hedge' | 'forest-bank';
	readonly transverseSliceCount: number;
	readonly longestRunP95Ratio: number;
	readonly longestRunMaximumRatio: number;
}

export interface MeadowEntryPaintedV2SceneryContinuousContourMetric extends MeadowEntryPaintedV2SceneryRowMetricBase {
	readonly metricKind: 'continuous-contour';
	readonly language: 'tree-wall';
	readonly evaluableSliceCount: number;
	readonly nonEvaluableSliceCount: number;
	readonly weightedSliceCount: number;
	readonly evaluableSegmentCount: number;
	readonly distinctContourPairCount: number;
	readonly longestConstantContourRunRatio: number;
	readonly contourProfileSha256: string;
}

export type MeadowEntryPaintedV2SceneryRowMetric =
	| MeadowEntryPaintedV2SceneryClumpRunMetric
	| MeadowEntryPaintedV2SceneryContinuousContourMetric;

export interface MeadowEntryPaintedV2SceneryBakeResult {
	readonly panels: readonly MeadowEntryDetailDecodedPanel[];
	readonly enrichedSourceSha256: Readonly<Record<string, string>>;
	readonly changedPixelCount: number;
	readonly classChangedPixelCounts: Readonly<Record<MeadowEntryPaintedV2SceneryClass, number>>;
	readonly intersections: readonly MeadowEntryPaintedV2SceneryIntersectionMetric[];
	readonly rows: readonly MeadowEntryPaintedV2SceneryRowMetric[];
	readonly formulas: Readonly<Record<string, string>>;
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
	for (const value of mask) assert(value === 0 || value === 1, `${label} must be binary`);
}

function assertMaskSet(
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	requireCanonicalDimensions = false
): { width: number; height: number } {
	if (requireCanonicalDimensions)
		assert(
			masks.width === MASK_WIDTH && masks.height === MASK_HEIGHT,
			'Meadow Entry scenery masks must be 6400x6400'
		);
	const { width, height } = masks;
	assertDimensionsForMaskSet(masks, width, height);
	for (let index = 0; index < width * height; index += 1) {
		assert(
			!(masks.hedgeAllowed[index] === 1 && masks.woodlandAllowed[index] === 1),
			`Meadow Entry hedge and woodland masks overlap at pixel ${index}`
		);
	}
	return { width, height };
}

function assertDimensionsForMaskSet(
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	width: number,
	height: number
): void {
	assertMaskDimensions(masks.otherProtected, width, height, 'other protected mask');
	assertMaskDimensions(masks.groundAllowed, width, height, 'ground allowed mask');
	assertMaskDimensions(masks.sceneryAllowed, width, height, 'scenery allowed mask');
	assertMaskDimensions(masks.hedgeAllowed, width, height, 'hedge allowed mask');
	assertMaskDimensions(masks.woodlandAllowed, width, height, 'woodland allowed mask');
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

function fillMaskFromBounds(mask: Uint8Array, width: number, bounds: readonly PixelBounds[]): void {
	for (const item of bounds) {
		assertBounds(item, width, mask.length / width, 'Meadow Entry scenery source');
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
	if (record.bounds !== null) return { ...record.bounds };
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
	byKey: ReadonlyMap<string, PixelBounds>,
	width: number
): void {
	const allowed = new Set(types);
	for (const record of input.sourceCatalog) {
		if (!allowed.has(record.ref.sourceType)) continue;
		const bounds = byKey.get(meadowEntrySourceKey(record.ref));
		if (bounds) fillBounds(mask, width, bounds);
	}
}

function addScratchTo(
	target: Uint8Array,
	scratch: Uint8Array,
	clearGround: boolean,
	clearScenery: boolean
): void {
	for (let index = 0; index < target.length; index += 1) {
		if (scratch[index] !== 1) continue;
		if (clearGround) target[index] = 0;
		if (clearScenery) target[index] = 0;
	}
}

function hashScratch(hashes: Record<string, string>, name: string, scratch: Uint8Array): void {
	hashes[`derivation:${name}`] = sha256(scratch);
}

function buildGroundAndSceneryMasks(
	input: MeadowEntryControlInputs,
	providedHashes: Readonly<Record<string, string>>
): MeadowEntryPaintedV2SceneryMaskSet {
	const width = input.worldBounds.right - input.worldBounds.left;
	const height = input.worldBounds.bottom - input.worldBounds.top;
	assert(
		width === MASK_WIDTH && height === MASK_HEIGHT,
		'Meadow Entry world bounds must be 6400x6400'
	);
	const pixels = width * height;
	const scratch = new Uint8Array(pixels);
	const groundAllowed = new Uint8Array(pixels);
	const sceneryAllowed = new Uint8Array(pixels);
	const otherProtected = new Uint8Array(pixels);
	const hedgeAllowed = new Uint8Array(pixels);
	const woodlandAllowed = new Uint8Array(pixels);
	const hashes: Record<string, string> = { ...providedHashes };
	const byKey = sourceBoundsByKey(input);

	// The scratch raster is deliberately reused for every builder-local intermediate.
	scratch.fill(0);
	fillMaskFromBounds(
		scratch,
		width,
		input.crops.map(({ bounds }) => bounds)
	);
	groundAllowed.set(scratch);
	hashScratch(hashes, 'inside-crop-union', scratch);

	const selectedIds = new Set(
		MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map(({ sourceId }) => sourceId)
	);
	scratch.fill(0);
	for (const blocker of MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS)
		fillBounds(scratch, width, blocker.bounds);
	hashScratch(hashes, 'selected-blockers', scratch);
	for (let index = 0; index < pixels; index += 1)
		sceneryAllowed[index] = groundAllowed[index] === 1 && scratch[index] === 1 ? 1 : 0;

	scratch.fill(0);
	for (const bounds of input.protectedRects) fillBounds(scratch, width, bounds);
	hashScratch(hashes, 'protected-live', scratch);
	addScratchTo(groundAllowed, scratch, true, false);

	scratch.fill(0);
	const protectedEntries = input.bakeOwnership.filter(
		(entry) => entry.disposition.mode === 'protected-live'
	);
	assert(
		input.protectedRects.length === protectedEntries.length,
		'Meadow Entry protected control rectangles are out of sync with protected ownership'
	);
	for (const [index, bounds] of input.protectedRects.entries()) {
		if (!selectedIds.has(protectedEntries[index]!.ref.sourceId)) fillBounds(scratch, width, bounds);
	}
	otherProtected.set(scratch);
	hashScratch(hashes, 'other-protected', scratch);
	addScratchTo(groundAllowed, scratch, true, false);
	addScratchTo(sceneryAllowed, scratch, false, true);

	const forbiddenForBoth: readonly [string, readonly string[]][] = [
		['building-footprint', ['landmark']],
		['entrance-transition', ['landmark', 'transition']],
		['reward-discovery', ['pickup', 'discovery']],
		['semantic-anchor', ['decor', 'landmark']]
	];
	for (const [name, types] of forbiddenForBoth) {
		scratch.fill(0);
		fillOwnedSourceMask(scratch, input, types, byKey, width);
		if (name === 'semantic-anchor')
			fillMaskFromBounds(
				scratch,
				width,
				input.controlClearanceRects.map(({ bounds }) => bounds)
			);
		hashScratch(hashes, name, scratch);
		addScratchTo(groundAllowed, scratch, true, false);
		addScratchTo(sceneryAllowed, scratch, false, true);
	}

	scratch.fill(0);
	for (const record of input.sourceCatalog) {
		if (record.ref.sourceType !== 'ground-patch') continue;
		const bounds = byKey.get(meadowEntrySourceKey(record.ref));
		const inset = bounds ? insetBounds(bounds) : null;
		if (inset) fillBounds(scratch, width, inset);
	}
	hashScratch(hashes, 'route-core', scratch);
	addScratchTo(groundAllowed, scratch, true, false);
	addScratchTo(sceneryAllowed, scratch, false, true);

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
	hashes['derivation:mask-authority'] = sha256(
		stable({
			retained: [
				'otherProtected',
				'groundAllowed',
				'sceneryAllowed',
				'hedgeAllowed',
				'woodlandAllowed'
			]
		})
	);
	for (const [key, value] of Object.entries(hashes))
		assert(/^[a-f0-9]{64}$/.test(value), `${key} must be a lowercase SHA-256 hash`);
	const result = {
		width: MASK_WIDTH,
		height: MASK_HEIGHT,
		otherProtected,
		groundAllowed,
		sceneryAllowed,
		hedgeAllowed,
		woodlandAllowed,
		sourceHashes: Object.freeze(hashes)
	} as MeadowEntryPaintedV2SceneryMaskSet;
	assertMaskSet(result, true);
	return result;
}

function sourceHashes(
	repositoryRoot: string,
	input: MeadowEntryControlInputs
): Readonly<Record<string, string>> {
	const hashes: Record<string, string> = {};
	for (const [path, hash] of Object.entries(input.sourceFileHashes))
		hashes[`source:${path}`] = hash;
	const renderedControls = renderMeadowEntryControls(input);
	for (const [filename, content] of Object.entries(renderedControls))
		hashes[`control:${filename}`] = sha256(content);
	for (const panel of MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS) {
		for (const path of [panel.rawPath, panel.normalizedPath, panel.provenancePath])
			hashes[`raster:${path}`] = sha256(readFileSync(join(repositoryRoot, path)));
	}
	hashes['derivation:control-fingerprint'] = computeMeadowEntryCombinedControlFingerprint(input);
	hashes['derivation:crop-contract'] = sha256(stable(input.crops));
	hashes['derivation:scenery-contract'] = sha256(
		stable({
			blockers: MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS,
			inserts: MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS
		})
	);
	hashes['derivation:protection-margins'] = sha256(stable(MEADOW_ENTRY_PROTECTION_MARGINS));
	return Object.freeze(hashes);
}

export function buildMeadowEntryPaintedV2SceneryMaskSetFromControls(
	input: MeadowEntryControlInputs,
	sourceHashes: Readonly<Record<string, string>>
): MeadowEntryPaintedV2SceneryMaskSet {
	return buildGroundAndSceneryMasks(input, sourceHashes);
}

export function buildMeadowEntryPaintedV2SceneryMaskSet(
	repositoryRoot = process.cwd()
): MeadowEntryPaintedV2SceneryMaskSet {
	const input = buildMeadowEntryControlInputs(repositoryRoot);
	return buildMeadowEntryPaintedV2SceneryMaskSetFromControls(
		input,
		sourceHashes(repositoryRoot, input)
	);
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
			let valid = true;
			for (let dy = -1; dy <= 1 && valid; dy += 1)
				for (let dx = -1; dx <= 1; dx += 1) {
					const nx = x + dx;
					const ny = y + dy;
					if (nx < 0 || nx >= width || ny < 0 || ny >= height || source[ny * width + nx] !== 1) {
						valid = false;
						break;
					}
				}
			if (valid) result[index] = 1;
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
	for (let index = 0; index < result.length; index += 1)
		if (classAllowed[index] === 1)
			result[index] = Math.min(maximumDistance, Math.max(0, distanceToZero[index]! - 1));
	return result;
}

function clonePanel(panel: MeadowEntryDetailDecodedPanel): MeadowEntryDetailDecodedPanel {
	return { ...panel, rgba: { ...panel.rgba, data: Buffer.from(panel.rgba.data) } };
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
		const canonical = canonicalPanelById.get(panel.id);
		if (width === MASK_WIDTH && height === MASK_HEIGHT && canonical !== undefined)
			assert(
				boundsEqual(panel.bounds, canonical.bounds),
				`Panel ${panel.id} bounds do not match the sealed source-panel registry`
			);
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
		if (width === MASK_WIDTH && height === MASK_HEIGHT)
			assert(
				boundsEqual(insert.bounds, expected.bounds) && boundsEqual(insert.bounds, owner.bounds),
				`Scenery insert bounds do not match owner: ${insert.id}`
			);
		assert(
			insert.rgba.width === boundsWidth(insert.bounds) &&
				insert.rgba.height === boundsHeight(insert.bounds) &&
				insert.rgba.data.byteLength === insert.rgba.width * insert.rgba.height * 4,
			`Scenery insert decoded dimensions do not match bounds: ${insert.id}`
		);
	}
	for (const expected of MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS)
		assert(seen.has(expected.id), `Missing Meadow Entry scenery bake insert: ${expected.id}`);
	for (const sourceId of AFFECTED_SOURCE_IDS)
		assert(panelById.has(sourceId), `Missing affected Meadow Entry scenery panel: ${sourceId}`);
	return panelById;
}

function luma(red: number, green: number, blue: number): number {
	return Math.floor((54 * red + 183 * green + 19 * blue + 128) / 256);
}

function halfUp(numerator: number, denominator: number): number {
	return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

function clippedBoxMean(
	prefix: Uint32Array,
	stride: number,
	width: number,
	height: number,
	x: number,
	y: number,
	radius: number
): number {
	const left = Math.max(0, x - radius);
	const top = Math.max(0, y - radius);
	const right = Math.min(width - 1, x + radius);
	const bottom = Math.min(height - 1, y + radius);
	const a = prefix[top * stride + left]!;
	const b = prefix[top * stride + right + 1]!;
	const c = prefix[(bottom + 1) * stride + left]!;
	const d = prefix[(bottom + 1) * stride + right + 1]!;
	return halfUp(d - b - c + a, (right - left + 1) * (bottom - top + 1));
}

interface IntegralCache {
	readonly width: number;
	readonly height: number;
	readonly red: Uint32Array;
	readonly green: Uint32Array;
	readonly blue: Uint32Array;
	readonly luminance: Uint32Array;
}

function integralCache(rgba: DecodedMeadowEntryRgba): IntegralCache {
	const stride = rgba.width + 1;
	const size = stride * (rgba.height + 1);
	const red = new Uint32Array(size);
	const green = new Uint32Array(size);
	const blue = new Uint32Array(size);
	const luminance = new Uint32Array(size);
	for (let y = 0; y < rgba.height; y += 1) {
		let rowRed = 0;
		let rowGreen = 0;
		let rowBlue = 0;
		let rowLuma = 0;
		for (let x = 0; x < rgba.width; x += 1) {
			const source = (y * rgba.width + x) * 4;
			rowRed += rgba.data[source]!;
			rowGreen += rgba.data[source + 1]!;
			rowBlue += rgba.data[source + 2]!;
			rowLuma += luma(rgba.data[source]!, rgba.data[source + 1]!, rgba.data[source + 2]!);
			const index = (y + 1) * stride + x + 1;
			red[index] = red[y * stride + x + 1]! + rowRed;
			green[index] = green[y * stride + x + 1]! + rowGreen;
			blue[index] = blue[y * stride + x + 1]! + rowBlue;
			luminance[index] = luminance[y * stride + x + 1]! + rowLuma;
		}
	}
	return { width: rgba.width, height: rgba.height, red, green, blue, luminance };
}

function intersectionBounds(
	contractBounds: PixelBounds,
	insert: DecodedMeadowEntryPaintedV2SceneryInsert,
	width: number,
	height: number
): PixelBounds {
	const left = Math.max(contractBounds.left, insert.bounds.left, 0);
	const top = Math.max(contractBounds.top, insert.bounds.top, 0);
	const right = Math.min(contractBounds.right, insert.bounds.right, width);
	const bottom = Math.min(contractBounds.bottom, insert.bounds.bottom, height);
	return left < right && top < bottom
		? { left, top, right, bottom }
		: {
				left: insert.bounds.left,
				top: insert.bounds.top,
				right: insert.bounds.right,
				bottom: insert.bounds.bottom
			};
}

interface Sample {
	readonly x: number;
	readonly y: number;
	readonly localX: number;
	readonly localY: number;
	readonly weight: number;
}

interface InsertPlan {
	readonly insert: DecodedMeadowEntryPaintedV2SceneryInsert;
	readonly weights: ReadonlyMap<number, number>;
	readonly tones: ReadonlyMap<number, readonly [number, number, number]>;
}

function classMask(
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	sceneryClass: MeadowEntryPaintedV2SceneryClass
): Uint8Array {
	return sceneryClass === 'hedge' ? masks.hedgeAllowed : masks.woodlandAllowed;
}

function hashNumberMap(values: ReadonlyMap<number, number>): string {
	const ordered = [...values.entries()].sort(([left], [right]) => left - right);
	const bytes = new Uint8Array(ordered.length * 5);
	ordered.forEach(([index, value], position) => {
		const at = position * 5;
		bytes[at] = index & 0xff;
		bytes[at + 1] = (index >>> 8) & 0xff;
		bytes[at + 2] = (index >>> 16) & 0xff;
		bytes[at + 3] = (index >>> 24) & 0xff;
		bytes[at + 4] = value;
	});
	return sha256(bytes);
}

function rowWeightHash(weights: ReadonlyMap<number, number>): string {
	return hashNumberMap(weights);
}

function rangeRunRatio(values: readonly number[], predicate: (value: number) => boolean): number {
	if (values.length === 0) return 0;
	let current = 0;
	let longest = 0;
	for (const value of values) {
		if (predicate(value)) {
			current += 1;
			longest = Math.max(longest, current);
		} else current = 0;
	}
	return longest / values.length;
}

function metricBounds(
	blocker: (typeof MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS)[number],
	eligible: ReadonlySet<number>,
	width: number,
	height: number
): PixelBounds {
	if (
		blocker.bounds.left >= 0 &&
		blocker.bounds.top >= 0 &&
		blocker.bounds.right <= width &&
		blocker.bounds.bottom <= height
	)
		return blocker.bounds;
	let left = width;
	let top = height;
	let right = 0;
	let bottom = 0;
	for (const index of eligible) {
		const x = index % width;
		const y = Math.floor(index / width);
		left = Math.min(left, x);
		top = Math.min(top, y);
		right = Math.max(right, x + 1);
		bottom = Math.max(bottom, y + 1);
	}
	return left < right && top < bottom
		? { left, top, right, bottom }
		: {
				left: Math.max(0, Math.min(width, blocker.bounds.left)),
				top: Math.max(0, Math.min(height, blocker.bounds.top)),
				right: Math.max(0, Math.min(width, blocker.bounds.right)),
				bottom: Math.max(0, Math.min(height, blocker.bounds.bottom))
			};
}

function buildRowMetric(
	blocker: (typeof MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS)[number],
	weights: ReadonlyMap<number, number>,
	eligible: ReadonlySet<number>,
	weightAt: (index: number) => number,
	edgeAt: (index: number) => number,
	width: number,
	height: number
): MeadowEntryPaintedV2SceneryRowMetric {
	const bounds = metricBounds(blocker, eligible, width, height);
	const eligiblePixelCount = eligible.size;
	const weightedPixelCount = [...weights.values()].filter((value) => value >= 32).length;
	const coverage = eligiblePixelCount === 0 ? 0 : weightedPixelCount / eligiblePixelCount;
	if (blocker.language === 'hedge' || blocker.language === 'forest-bank') {
		const longAxisX = bounds.right - bounds.left >= bounds.bottom - bounds.top;
		const sliceCount = longAxisX ? bounds.right - bounds.left : bounds.bottom - bounds.top;
		const ratios: number[] = [];
		for (let slice = 0; slice < sliceCount; slice += 1) {
			const values: number[] = [];
			if (longAxisX) {
				const x = bounds.left + slice;
				for (let y = bounds.top; y < bounds.bottom; y += 1) values.push(weightAt(y * width + x));
			} else {
				const y = bounds.top + slice;
				for (let x = bounds.left; x < bounds.right; x += 1) values.push(weightAt(y * width + x));
			}
			ratios.push(rangeRunRatio(values, (value) => value >= 254));
		}
		return {
			blockerId: blocker.sourceId,
			language: blocker.language,
			sceneryClass: blocker.sceneryClass,
			eligiblePixelCount,
			weightedPixelCount,
			coverage,
			weightSha256: rowWeightHash(weights),
			metricKind: 'clump-runs',
			transverseSliceCount: sliceCount,
			longestRunP95Ratio: meadowEntryNearestRank(ratios, 0.95),
			longestRunMaximumRatio: Math.max(...ratios, 0)
		};
	}
	const longAxisX = bounds.right - bounds.left >= bounds.bottom - bounds.top;
	const sliceCount = longAxisX ? bounds.right - bounds.left : bounds.bottom - bounds.top;
	const profiles: (readonly [number, number] | null)[] = [];
	let weightedSliceCount = 0;
	let evaluableSliceCount = 0;
	let evaluableSegmentCount = 0;
	let inSegment = false;
	const contourPairs = new Set<string>();
	let longestConstant = 0;
	let currentConstant = 0;
	let previousPair: string | null = null;
	for (let slice = 0; slice < sliceCount; slice += 1) {
		const values: number[] = [];
		const edgeValues: number[] = [];
		if (longAxisX) {
			const x = bounds.left + slice;
			for (let y = bounds.top; y < bounds.bottom; y += 1) {
				const index = y * width + x;
				values.push(weightAt(index));
				edgeValues.push(edgeAt(index));
			}
		} else {
			const y = bounds.top + slice;
			for (let x = bounds.left; x < bounds.right; x += 1) {
				const index = y * width + x;
				values.push(weightAt(index));
				edgeValues.push(edgeAt(index));
			}
		}
		const edgeEnvelope = Math.max(...edgeValues, 0);
		if (edgeEnvelope < 32) {
			profiles.push(null);
			previousPair = null;
			currentConstant = 0;
			inSegment = false;
			continue;
		}
		evaluableSliceCount += 1;
		if (!inSegment) {
			evaluableSegmentCount += 1;
			inSegment = true;
		}
		const weighted = values.filter((value) => value >= 32);
		if (weighted.length > 0) weightedSliceCount += 1;
		const near = values.findIndex((value) => value >= 32);
		let far = -1;
		for (let index = values.length - 1; index >= 0; index -= 1)
			if (values[index]! >= 32) {
				far = index;
				break;
			}
		if (near < 0 || far < 0) {
			profiles.push(null);
			previousPair = null;
			currentConstant = 0;
			continue;
		}
		const pair: readonly [number, number] = [near, far];
		profiles.push(pair);
		const pairKey = `${near}:${far}`;
		contourPairs.add(pairKey);
		if (pairKey === previousPair) currentConstant += 1;
		else currentConstant = 1;
		previousPair = pairKey;
		longestConstant = Math.max(longestConstant, currentConstant);
	}
	return {
		blockerId: blocker.sourceId,
		language: 'tree-wall',
		sceneryClass: blocker.sceneryClass,
		eligiblePixelCount,
		weightedPixelCount,
		coverage,
		weightSha256: rowWeightHash(weights),
		metricKind: 'continuous-contour',
		evaluableSliceCount,
		nonEvaluableSliceCount: sliceCount - evaluableSliceCount,
		weightedSliceCount,
		evaluableSegmentCount,
		distinctContourPairCount: contourPairs.size,
		longestConstantContourRunRatio:
			evaluableSliceCount === 0 ? 0 : longestConstant / evaluableSliceCount,
		contourProfileSha256: sha256(stable(profiles))
	};
}

export function enrichMeadowEntryPaintedV2Sources(
	panels: readonly MeadowEntryDetailDecodedPanel[],
	inserts: readonly DecodedMeadowEntryPaintedV2SceneryInsert[],
	masks: MeadowEntryPaintedV2SceneryMaskSet
): MeadowEntryPaintedV2SceneryBakeResult {
	const { width, height } = assertMaskSet(masks);
	const panelById = validateDecodedCoverage(panels, inserts, width, height);
	const contractIntersections = validateMeadowEntryPaintedV2SceneryContract();
	const distances = {
		hedge: meadowEntrySceneryInsetDistances(masks.hedgeAllowed, width, height),
		woodland: meadowEntrySceneryInsetDistances(masks.woodlandAllowed, width, height)
	} satisfies Record<MeadowEntryPaintedV2SceneryClass, Uint8Array>;
	const intersectionMetrics: MeadowEntryPaintedV2SceneryIntersectionMetric[] = [];
	const plans: InsertPlan[] = [];
	const rowWeights = new Map<string, Map<number, number>>();
	const rowEligible = new Map<string, Set<number>>();

	for (const insert of inserts) {
		const owner = panelById.get(insert.owningSourceId)!;
		const cache = integralCache(insert.rgba);
		const allowed = classMask(masks, insert.sceneryClass);
		const weights = new Map<number, number>();
		const tones = new Map<number, readonly [number, number, number]>();
		for (const intersection of contractIntersections.filter(
			({ insertId }) => insertId === insert.id
		)) {
			const bounds = intersectionBounds(intersection.bounds, insert, width, height);
			const samples: Sample[] = [];
			for (let y = bounds.top; y < bounds.bottom; y += 1) {
				for (let x = bounds.left; x < bounds.right; x += 1) {
					const index = y * width + x;
					if (
						masks.sceneryAllowed[index] !== 1 ||
						masks.otherProtected[index] !== 0 ||
						allowed[index] !== 1
					)
						continue;
					const localX = x - insert.bounds.left;
					const localY = y - insert.bounds.top;
					if (
						localX < 0 ||
						localY < 0 ||
						localX >= insert.rgba.width ||
						localY >= insert.rgba.height
					)
						continue;
					const near = clippedBoxMean(
						cache.luminance,
						cache.width + 1,
						cache.width,
						cache.height,
						localX,
						localY,
						15
					);
					const far = clippedBoxMean(
						cache.luminance,
						cache.width + 1,
						cache.width,
						cache.height,
						localX,
						localY,
						63
					);
					samples.push({ x, y, localX, localY, weight: Math.abs(near - far) });
				}
			}
			assert(
				samples.length >= 64,
				`Meadow Entry scenery intersection ${intersection.blockerId}/${insert.id} has fewer than 64 samples`
			);
			const signals = samples.map(({ weight }) => weight);
			const q40 = meadowEntryNearestRank(signals, 0.4);
			const q80 = meadowEntryNearestRank(signals, 0.8);
			assert(
				q40 !== q80,
				`Meadow Entry scenery intersection ${intersection.blockerId}/${insert.id} has degenerate q40/q80 organic signals`
			);
			const sampleWeights = new Uint8Array(samples.length);
			const classLimit = insert.sceneryClass === 'hedge' ? 32 : 48;
			const classDistance = distances[insert.sceneryClass];
			const rowWeight = rowWeights.get(intersection.blockerId) ?? new Map<number, number>();
			const eligibleSet = rowEligible.get(intersection.blockerId) ?? new Set<number>();
			for (const [sampleIndex, sample] of samples.entries()) {
				const index = sample.y * width + sample.x;
				eligibleSet.add(index);
				const t = Math.max(0, Math.min(255, halfUp(255 * (sample.weight - q40), q80 - q40)));
				const organicWeight = meadowEntryDetailFeatherWeight(t, 255);
				const edgeWeight = meadowEntryDetailFeatherWeight(
					Math.min(classDistance[index] ?? 0, MAX_SCENERY_DISTANCE),
					MAX_SCENERY_DISTANCE
				);
				const finalWeight = halfUp(edgeWeight * organicWeight, 255);
				sampleWeights[sampleIndex] = finalWeight;
				if ((weights.get(index) ?? 0) < finalWeight) weights.set(index, finalWeight);
				if (finalWeight > 0) rowWeight.set(index, Math.max(rowWeight.get(index) ?? 0, finalWeight));
				const sourceOffset =
					((sample.y - owner.bounds.top) * owner.rgba.width + sample.x - owner.bounds.left) * 4;
				const detail = [
					[cache.red, insert.rgba.data[sample.localY * insert.rgba.width * 4 + sample.localX * 4]!],
					[
						cache.green,
						insert.rgba.data[sample.localY * insert.rgba.width * 4 + sample.localX * 4 + 1]!
					],
					[
						cache.blue,
						insert.rgba.data[sample.localY * insert.rgba.width * 4 + sample.localX * 4 + 2]!
					]
				].map(([prefix, value], channel) => {
					const mean = clippedBoxMean(
						prefix as Uint32Array,
						cache.width + 1,
						cache.width,
						cache.height,
						sample.localX,
						sample.localY,
						31
					);
					const delta = Math.max(-classLimit, Math.min(classLimit, (value as number) - mean));
					const source = owner.rgba.data[sourceOffset + channel]!;
					return Math.max(0, Math.min(255, source + delta));
				});
				if (!tones.has(index) || finalWeight >= (weights.get(index) ?? 0))
					tones.set(index, detail as [number, number, number]);
			}
			rowWeights.set(intersection.blockerId, rowWeight);
			rowEligible.set(intersection.blockerId, eligibleSet);
			intersectionMetrics.push({
				blockerId: intersection.blockerId,
				insertId: intersection.insertId,
				owningSourceId: intersection.owningSourceId,
				sceneryClass: intersection.sceneryClass,
				sampleCount: samples.length,
				q40,
				q80,
				weightSha256: sha256(sampleWeights)
			});
		}
		plans.push({ insert, weights, tones });
	}

	const mutable = new Map<string, MeadowEntryDetailDecodedPanel>();
	for (const sourceId of AFFECTED_SOURCE_IDS)
		mutable.set(sourceId, clonePanel(panelById.get(sourceId)!));
	let changedPixelCount = 0;
	const classChangedPixelCounts: Record<MeadowEntryPaintedV2SceneryClass, number> = {
		hedge: 0,
		woodland: 0
	};
	const byOwner = new Map<
		string,
		Map<
			number,
			{
				weight: number;
				tone: readonly [number, number, number];
				sceneryClass: MeadowEntryPaintedV2SceneryClass;
				insertId: string;
			}
		>
	>();
	for (const plan of plans) {
		const output = byOwner.get(plan.insert.owningSourceId) ?? new Map();
		for (const [index, weight] of plan.weights.entries()) {
			const tone = plan.tones.get(index);
			if (tone === undefined) continue;
			const previous = output.get(index);
			if (
				previous === undefined ||
				weight > previous.weight ||
				(weight === previous.weight && plan.insert.id < previous.insertId)
			)
				output.set(index, {
					weight,
					tone,
					sceneryClass: plan.insert.sceneryClass,
					insertId: plan.insert.id
				});
		}
		byOwner.set(plan.insert.owningSourceId, output);
	}
	for (const [ownerId, pixels] of byOwner) {
		const output = mutable.get(ownerId);
		const owner = panelById.get(ownerId);
		assert(output !== undefined && owner !== undefined, `Missing mutable scenery owner ${ownerId}`);
		for (const [worldIndex, value] of pixels) {
			const worldX = worldIndex % width;
			const worldY = Math.floor(worldIndex / width);
			const offset =
				((worldY - owner.bounds.top) * owner.rgba.width + worldX - owner.bounds.left) * 4;
			let pixelChanged = false;
			for (let channel = 0; channel < 3; channel += 1) {
				const blended = blendMeadowEntryDetailChannel(
					output.rgba.data[offset + channel]!,
					value.tone[channel]!,
					value.weight
				);
				if (blended !== output.rgba.data[offset + channel]) pixelChanged = true;
				output.rgba.data[offset + channel] = blended;
			}
			if (pixelChanged) {
				changedPixelCount += 1;
				classChangedPixelCounts[value.sceneryClass] += 1;
			}
		}
	}
	const weightByBlocker = (blockerId: string): Map<number, number> =>
		rowWeights.get(blockerId) ?? new Map();
	const rows = MEADOW_ENTRY_PAINTED_V2_SCENERY_BLOCKERS.map((blocker) => {
		const weights = weightByBlocker(blocker.sourceId);
		const eligible = rowEligible.get(blocker.sourceId) ?? new Set<number>();
		const distance = distances[blocker.sceneryClass];
		return buildRowMetric(
			blocker,
			weights,
			eligible,
			(index) => weights.get(index) ?? 0,
			(index) =>
				eligible.has(index)
					? meadowEntryDetailFeatherWeight(
							Math.min(distance[index] ?? 0, MAX_SCENERY_DISTANCE),
							MAX_SCENERY_DISTANCE
						)
					: 0,
			width,
			height
		);
	});
	const outputPanels = panels.map((panel) => mutable.get(panel.id) ?? panel);
	const enrichedSourceSha256 = Object.fromEntries(
		AFFECTED_SOURCE_IDS.map((sourceId) => [sourceId, sha256(mutable.get(sourceId)!.rgba.data)])
	);
	return {
		panels: outputPanels,
		enrichedSourceSha256: Object.freeze(enrichedSourceSha256),
		changedPixelCount,
		classChangedPixelCounts: Object.freeze(classChangedPixelCounts),
		intersections: Object.freeze(intersectionMetrics),
		rows: Object.freeze(rows),
		formulas: Object.freeze({
			luma: 'floor((54*r+183*g+19*b+128)/256)',
			insertMean: 'clippedHalfUpBoxMean(radius=31)',
			nearMean: 'clippedHalfUpBoxMean(radius=15)',
			farMean: 'clippedHalfUpBoxMean(radius=63)',
			organicSignal: 'abs(nearLuma-farLuma)',
			organicWeight: 'meadowEntryDetailFeatherWeight(t,255)',
			edgeWeight: 'meadowEntryDetailFeatherWeight(min(distance,15),15)',
			sceneryWeight: 'halfUp(edgeWeight*organicWeight/255)',
			weightedCoverageThreshold: 'finalWeight>=32',
			clumpRunThreshold: 'finalWeight>=254',
			contourThreshold: 'finalWeight>=32',
			blend: 'blendMeadowEntryDetailChannel'
		})
	};
}
