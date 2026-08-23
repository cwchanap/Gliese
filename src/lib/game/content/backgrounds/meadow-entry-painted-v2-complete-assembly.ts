import { createHash } from 'node:crypto';

import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_HORIZONTAL_OVERLAP_PX,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_PANEL_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_VERTICAL_OVERLAP_PX,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS,
	type MeadowEntryPaintedV2CompletePanelId,
	type MeadowEntryPaintedV2CompleteSourcePanel
} from './meadow-entry-painted-v2-complete';
import {
	blendMeadowEntryContentAwareHandoff,
	MEADOW_ENTRY_PAINTED_V2_HANDOFF_MAX_HALF_WIDTH_PX
} from './meadow-entry-painted-v2-underlay-assembly';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks,
	type DecodedMeadowEntryRgba
} from './meadow-entry-png';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '../generated/meadow-entry-painted-v2-complete-art-control';

const SHA256 = /^[a-f0-9]{64}$/;
const COMPLETE_PACKAGE_ID = 'meadow-entry-painted-v2-complete';
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_SHARED_REFERENCE_ID =
	'meadow-entry-painted-v2-complete-art-direction-reference';
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_MAX_ATTEMPTS = 5;

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT =
	MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT;
export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_HANDOFF_MAX_HALF_WIDTH_PX =
	MEADOW_ENTRY_PAINTED_V2_HANDOFF_MAX_HALF_WIDTH_PX;

export interface MeadowEntryPaintedV2CompleteAssemblyInput {
	readonly controlFingerprint: string;
	readonly raw: Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>;
	readonly panels: Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>;
	readonly provenance: Readonly<Record<MeadowEntryPaintedV2CompletePanelId, Buffer>>;
}

export interface MeadowEntryPaintedV2CompleteRawProvenance {
	readonly path: string;
	readonly sha256: string;
	readonly bytes: number;
	readonly dimensions: { readonly width: number; readonly height: number };
}

interface DecodedCompletePanel {
	readonly spec: MeadowEntryPaintedV2CompleteSourcePanel;
	readonly png: Buffer;
	readonly rgba: DecodedMeadowEntryRgba;
	readonly provenanceSha256: string;
	readonly provenance: CompletePanelProvenance;
}

interface CompletePanelProvenance {
	readonly packageId: string;
	readonly panelId: string;
	readonly bounds: PixelBounds;
	readonly controlFingerprint: string;
	readonly raw: MeadowEntryPaintedV2CompleteRawProvenance;
	readonly normalized: {
		readonly path: string;
		readonly sha256: string;
		readonly bytes: number;
		readonly dimensions: { readonly width: number; readonly height: number };
	};
	readonly generation: Record<string, unknown>;
	readonly rejectionHistory: readonly Record<string, unknown>[];
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (!isPlainObject(value)) return value;
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, stableValue(value[key])])
	);
}

function stableJson(value: unknown): Buffer {
	return Buffer.from(`${JSON.stringify(stableValue(value), null, '\t')}\n`);
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

function assertExactRecordKeys(
	actual: Readonly<Record<string, unknown>>,
	label: string,
	expectedIds: readonly string[]
): void {
	const expected = [...expectedIds].sort();
	const received = Object.keys(actual).sort();
	assert(
		JSON.stringify(received) === JSON.stringify(expected),
		`Meadow Entry complete ${label} keys do not match the declared panel catalog`
	);
}

function objectProperty(value: unknown, property: string, label: string): Record<string, unknown> {
	assert(isPlainObject(value), `Meadow Entry complete ${label} must be an object`);
	const result = value[property];
	assert(isPlainObject(result), `Meadow Entry complete ${label}.${property} must be an object`);
	return result;
}

function stringProperty(value: Record<string, unknown>, property: string, label: string): string {
	const result = value[property];
	assert(typeof result === 'string', `Meadow Entry complete ${label}.${property} is required`);
	return result;
}

function integerProperty(value: Record<string, unknown>, property: string, label: string): number {
	const result = value[property];
	assert(Number.isInteger(result), `Meadow Entry complete ${label}.${property} must be an integer`);
	return result as number;
}

function arrayProperty(
	value: Record<string, unknown>,
	property: string,
	label: string
): readonly unknown[] {
	const result = value[property];
	assert(Array.isArray(result), `Meadow Entry complete ${label}.${property} must be an array`);
	return result;
}

function assertNonEmptyString(value: string, label: string): void {
	assert(value.trim().length > 0, `Meadow Entry complete ${label} must not be empty`);
}

function overlapping(first: PixelBounds, second: PixelBounds): boolean {
	return (
		Math.min(first.right, second.right) > Math.max(first.left, second.left) &&
		Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top)
	);
}

function allowedAdjacentReferenceIds(
	spec: MeadowEntryPaintedV2CompleteSourcePanel
): readonly string[] {
	return MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.filter(
		(candidate) => candidate.id !== spec.id && overlapping(candidate.bounds, spec.bounds)
	).map((candidate) => candidate.id);
}

export function validateCompleteRawProvenance(
	value: unknown,
	spec: MeadowEntryPaintedV2CompleteSourcePanel
): MeadowEntryPaintedV2CompleteRawProvenance {
	assert(isPlainObject(value), `Meadow Entry complete panel ${spec.id} raw metadata is required`);
	const path = stringProperty(value, 'path', `panel ${spec.id} raw`);
	assert(path === spec.rawPath, `Meadow Entry complete panel ${spec.id} raw path is stale`);
	const hash = stringProperty(value, 'sha256', `panel ${spec.id} raw`);
	assert(SHA256.test(hash), `Meadow Entry complete panel ${spec.id} raw hash is invalid`);
	const bytes = integerProperty(value, 'bytes', `panel ${spec.id} raw`);
	assert(bytes > 0, `Meadow Entry complete panel ${spec.id} raw byte count is invalid`);
	const dimensions = objectProperty(value, 'dimensions', `panel ${spec.id} raw`);
	const parsedDimensions = {
		width: integerProperty(dimensions, 'width', `panel ${spec.id} raw dimensions`),
		height: integerProperty(dimensions, 'height', `panel ${spec.id} raw dimensions`)
	};
	assert(
		parsedDimensions.width > 0 && parsedDimensions.height > 0,
		`Meadow Entry complete panel ${spec.id} raw dimensions are invalid`
	);
	return { path, sha256: hash, bytes, dimensions: parsedDimensions };
}

export function validateCompleteGenerationProvenance(
	value: unknown,
	spec: MeadowEntryPaintedV2CompleteSourcePanel
): Record<string, unknown> {
	assert(
		isPlainObject(value),
		`Meadow Entry complete panel ${spec.id} generation metadata is required`
	);
	const attempt = integerProperty(value, 'attempt', `panel ${spec.id} generation`);
	assert(
		attempt >= 1 && attempt <= MEADOW_ENTRY_PAINTED_V2_COMPLETE_MAX_ATTEMPTS,
		`Meadow Entry complete panel ${spec.id} generation attempt exceeds the cap`
	);
	for (const property of ['model', 'modelVersion', 'provider', 'tool', 'prompt'] as const) {
		const string = stringProperty(value, property, `panel ${spec.id} generation`);
		assertNonEmptyString(string, `panel ${spec.id} generation ${property}`);
	}
	const prompt = stringProperty(value, 'prompt', `panel ${spec.id} generation`);
	const promptSha256 = stringProperty(value, 'promptSha256', `panel ${spec.id} generation`);
	assert(
		SHA256.test(promptSha256),
		`Meadow Entry complete panel ${spec.id} prompt hash is invalid`
	);
	assert(
		promptSha256 === sha256(Buffer.from(prompt)),
		`Meadow Entry complete panel ${spec.id} prompt hash is stale`
	);
	const referenceIds = arrayProperty(value, 'referenceIds', `panel ${spec.id} generation`);
	assert(
		referenceIds.length > 0 &&
			referenceIds.every(
				(referenceId) => typeof referenceId === 'string' && referenceId.trim().length > 0
			),
		`Meadow Entry complete panel ${spec.id} generation references are invalid`
	);
	const references = referenceIds as readonly string[];
	assert(
		new Set(references).size === references.length,
		`Meadow Entry complete panel ${spec.id} generation references contain duplicates`
	);
	assert(
		references.filter(
			(referenceId) => referenceId === MEADOW_ENTRY_PAINTED_V2_COMPLETE_SHARED_REFERENCE_ID
		).length === 1,
		`Meadow Entry complete panel ${spec.id} generation must include the approved shared reference`
	);
	const allowed = new Set(allowedAdjacentReferenceIds(spec));
	for (const referenceId of references) {
		if (referenceId === MEADOW_ENTRY_PAINTED_V2_COMPLETE_SHARED_REFERENCE_ID) continue;
		assert(
			allowed.has(referenceId),
			`Meadow Entry complete panel ${spec.id} generation reference is not an adjacent accepted raster: ${referenceId}`
		);
	}
	return value;
}

export function validateCompleteRejectionHistory(
	value: unknown,
	spec: MeadowEntryPaintedV2CompleteSourcePanel,
	acceptedAttempt: number
): readonly Record<string, unknown>[] {
	assert(
		Array.isArray(value),
		`Meadow Entry complete panel ${spec.id} rejection history is required`
	);
	const attempts = new Set<number>();
	return value.map((entry, index) => {
		assert(
			isPlainObject(entry),
			`Meadow Entry complete panel ${spec.id} rejection ${index} must be an object`
		);
		const keys = Object.keys(entry).sort();
		assert(
			JSON.stringify(keys) === JSON.stringify(['attempt', 'reason', 'status']),
			`Meadow Entry complete panel ${spec.id} rejection ${index} schema is invalid`
		);
		const attempt = integerProperty(entry, 'attempt', `panel ${spec.id} rejection ${index}`);
		assert(
			attempt >= 1 &&
				attempt < acceptedAttempt &&
				attempt <= MEADOW_ENTRY_PAINTED_V2_COMPLETE_MAX_ATTEMPTS,
			`Meadow Entry complete panel ${spec.id} rejection ${index} attempt is inconsistent`
		);
		assert(
			!attempts.has(attempt),
			`Meadow Entry complete panel ${spec.id} rejection attempts are duplicated`
		);
		attempts.add(attempt);
		assert(
			stringProperty(entry, 'status', `panel ${spec.id} rejection ${index}`) === 'rejected',
			`Meadow Entry complete panel ${spec.id} rejection ${index} status is invalid`
		);
		const reason = stringProperty(entry, 'reason', `panel ${spec.id} rejection ${index}`);
		assertNonEmptyString(reason, `panel ${spec.id} rejection ${index} reason`);
		return entry;
	});
}

function parsePanelProvenance(
	bytes: Buffer,
	spec: MeadowEntryPaintedV2CompleteSourcePanel
): CompletePanelProvenance {
	let parsed: unknown;
	try {
		parsed = JSON.parse(bytes.toString('utf8')) as unknown;
	} catch {
		throw new Error(`Meadow Entry complete panel ${spec.id} provenance is not valid JSON`);
	}
	assert(isPlainObject(parsed), `Meadow Entry complete panel ${spec.id} provenance is invalid`);
	const record = parsed;
	assert(
		stringProperty(record, 'packageId', `panel ${spec.id}`) === COMPLETE_PACKAGE_ID,
		`Meadow Entry complete panel ${spec.id} provenance package is stale`
	);
	const panelId = stringProperty(record, 'panelId', `panel ${spec.id}`);
	assert(panelId === spec.id, `Meadow Entry complete panel ${spec.id} provenance id is stale`);
	const bounds = objectProperty(record, 'bounds', `panel ${spec.id}`);
	const parsedBounds = {
		left: integerProperty(bounds, 'left', `panel ${spec.id} bounds`),
		top: integerProperty(bounds, 'top', `panel ${spec.id} bounds`),
		right: integerProperty(bounds, 'right', `panel ${spec.id} bounds`),
		bottom: integerProperty(bounds, 'bottom', `panel ${spec.id} bounds`)
	};
	assert(
		boundsEqual(parsedBounds, spec.bounds),
		`Meadow Entry complete panel ${spec.id} provenance bounds are stale`
	);
	const controlFingerprint = stringProperty(record, 'controlFingerprint', `panel ${spec.id}`);
	assert(
		controlFingerprint === MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		`Meadow Entry complete panel ${spec.id} control fingerprint is stale`
	);
	const normalized = objectProperty(record, 'normalized', `panel ${spec.id}`);
	const normalizedPath = stringProperty(normalized, 'path', `panel ${spec.id} normalized`);
	assert(
		normalizedPath === spec.normalizedPath,
		`Meadow Entry complete panel ${spec.id} normalized path is stale`
	);
	const normalizedSha256 = stringProperty(normalized, 'sha256', `panel ${spec.id} normalized`);
	assert(
		SHA256.test(normalizedSha256),
		`Meadow Entry complete panel ${spec.id} normalized hash is invalid`
	);
	const dimensions = objectProperty(normalized, 'dimensions', `panel ${spec.id} normalized`);
	const normalizedDimensions = {
		width: integerProperty(dimensions, 'width', `panel ${spec.id} normalized dimensions`),
		height: integerProperty(dimensions, 'height', `panel ${spec.id} normalized dimensions`)
	};
	assert(
		normalizedDimensions.width === spec.expectedDimensions.width &&
			normalizedDimensions.height === spec.expectedDimensions.height,
		`Meadow Entry complete panel ${spec.id} normalized dimensions are stale`
	);
	const normalizedBytes = integerProperty(normalized, 'bytes', `panel ${spec.id} normalized`);
	assert(
		normalizedBytes > 0,
		`Meadow Entry complete panel ${spec.id} normalized byte count is invalid`
	);
	const raw = validateCompleteRawProvenance(record.raw, spec);
	const generation = validateCompleteGenerationProvenance(record.generation, spec);
	const acceptedAttempt = integerProperty(generation, 'attempt', `panel ${spec.id} generation`);
	const rejectionHistory = validateCompleteRejectionHistory(
		record.rejectionHistory,
		spec,
		acceptedAttempt
	);
	return {
		packageId: COMPLETE_PACKAGE_ID,
		panelId,
		bounds: parsedBounds,
		controlFingerprint,
		raw,
		normalized: {
			path: normalizedPath,
			sha256: normalizedSha256,
			bytes: normalizedBytes,
			dimensions: normalizedDimensions
		},
		generation,
		rejectionHistory
	};
}

function assertOpaque(decoded: DecodedMeadowEntryRgba, label: string): void {
	assert(
		decoded.data.byteLength === decoded.width * decoded.height * 4,
		`Meadow Entry complete ${label} RGBA dimensions are invalid`
	);
	for (let offset = 3; offset < decoded.data.length; offset += 4) {
		assert(decoded.data[offset] === 255, `Meadow Entry complete ${label} is not opaque`);
	}
}

function extractRegion(
	decoded: DecodedMeadowEntryRgba,
	bounds: PixelBounds,
	origin: { readonly left: number; readonly top: number }
): DecodedMeadowEntryRgba {
	const width = boundsWidth(bounds);
	const height = boundsHeight(bounds);
	const data = Buffer.alloc(width * height * 4);
	for (let y = 0; y < height; y += 1) {
		const sourceStart =
			((bounds.top - origin.top + y) * decoded.width + bounds.left - origin.left) * 4;
		data.set(decoded.data.subarray(sourceStart, sourceStart + width * 4), y * width * 4);
	}
	return { data, width, height };
}

function copyRegion(
	target: Buffer,
	targetWidth: number,
	source: DecodedMeadowEntryRgba,
	left: number,
	top: number
): void {
	for (let y = 0; y < source.height; y += 1) {
		const targetStart = ((top + y) * targetWidth + left) * 4;
		const sourceStart = y * source.width * 4;
		target.set(source.data.subarray(sourceStart, sourceStart + source.width * 4), targetStart);
	}
}

function buildRow(panels: readonly DecodedCompletePanel[]): DecodedMeadowEntryRgba {
	assert(panels.length === 3, 'Meadow Entry complete rows must contain three panels');
	const top = panels[0]!.spec.bounds.top;
	const bottom = panels[0]!.spec.bounds.bottom;
	const rowHeight = bottom - top;
	const data = Buffer.alloc(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH * rowHeight * 4);
	const first = panels[0]!;
	copyRegion(
		data,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		first.rgba,
		first.spec.bounds.left,
		0
	);
	for (let index = 1; index < panels.length; index += 1) {
		const current = panels[index]!;
		const previous = panels[index - 1]!;
		const overlap: PixelBounds = {
			left: current.spec.bounds.left,
			top,
			right: previous.spec.bounds.right,
			bottom
		};
		const firstOverlap = extractRegion(
			{ data, width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, height: rowHeight },
			overlap,
			{ left: 0, top }
		);
		const secondOverlap = extractRegion(current.rgba, overlap, {
			left: current.spec.bounds.left,
			top: current.spec.bounds.top
		});
		copyRegion(
			data,
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			current.rgba,
			current.spec.bounds.left,
			0
		);
		const handoff = blendMeadowEntryContentAwareHandoff(firstOverlap, secondOverlap, 'x').rgba;
		copyRegion(
			data,
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			handoff,
			overlap.left,
			overlap.top - top
		);
	}
	return {
		data,
		width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		height: rowHeight
	};
}

function buildMaster(rows: readonly DecodedMeadowEntryRgba[]): DecodedMeadowEntryRgba {
	assert(rows.length === 4, 'Meadow Entry complete assembly must contain four rows');
	const data = Buffer.alloc(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH *
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT *
			4
	);
	const first = rows[0]!;
	copyRegion(data, MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, first, 0, 0);
	let previousTop = 0;
	for (let index = 1; index < rows.length; index += 1) {
		const current = rows[index]!;
		const top =
			index *
			(MEADOW_ENTRY_PAINTED_V2_COMPLETE_PANEL_HEIGHT -
				MEADOW_ENTRY_PAINTED_V2_COMPLETE_VERTICAL_OVERLAP_PX);
		const overlap: PixelBounds = {
			left: 0,
			top,
			right: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			bottom: previousTop + current.height
		};
		const masterDecoded = {
			data,
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		};
		const firstOverlap = extractRegion(masterDecoded, overlap, { left: 0, top: 0 });
		const secondOverlap = extractRegion(
			current,
			{
				left: 0,
				top: 0,
				right: current.width,
				bottom: MEADOW_ENTRY_PAINTED_V2_COMPLETE_VERTICAL_OVERLAP_PX
			},
			{ left: 0, top: 0 }
		);
		copyRegion(data, MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, current, 0, top);
		const handoff = blendMeadowEntryContentAwareHandoff(firstOverlap, secondOverlap, 'y').rgba;
		copyRegion(data, MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, handoff, 0, top);
		previousTop = top;
	}
	return {
		data,
		width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
	};
}

async function decodeAndValidatePanels(
	input: MeadowEntryPaintedV2CompleteAssemblyInput
): Promise<DecodedCompletePanel[]> {
	const expectedIds = MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS.map(({ id }) => id);
	assertExactRecordKeys(input.raw, 'raw source panel', expectedIds);
	assertExactRecordKeys(input.panels, 'source panel', expectedIds);
	assertExactRecordKeys(input.provenance, 'source provenance', expectedIds);
	assert(
		input.controlFingerprint === MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		'Meadow Entry complete control fingerprint is stale'
	);
	const decoded: DecodedCompletePanel[] = [];
	for (const spec of MEADOW_ENTRY_PAINTED_V2_COMPLETE_SOURCE_PANELS) {
		const raw = input.raw[spec.id];
		const png = input.panels[spec.id];
		const provenanceBytes = input.provenance[spec.id];
		assert(Buffer.isBuffer(raw), `Meadow Entry complete panel ${spec.id} raw bytes are missing`);
		assert(Buffer.isBuffer(png), `Meadow Entry complete panel ${spec.id} bytes are missing`);
		assert(
			Buffer.isBuffer(provenanceBytes),
			`Meadow Entry complete panel ${spec.id} provenance bytes are missing`
		);
		const provenance = parsePanelProvenance(provenanceBytes, spec);
		assert(
			raw.byteLength === provenance.raw.bytes,
			`Meadow Entry complete panel ${spec.id} raw byte count is stale`
		);
		assert(
			sha256(raw) === provenance.raw.sha256,
			`Meadow Entry complete panel ${spec.id} raw source hash is stale`
		);
		const rawDecoded = await decodeMeadowEntryRgba(raw);
		assert(
			rawDecoded.width === provenance.raw.dimensions.width &&
				rawDecoded.height === provenance.raw.dimensions.height,
			`Meadow Entry complete panel ${spec.id} raw dimensions are stale`
		);
		validateCanonicalPngChunks(png);
		const rgba = await decodeMeadowEntryRgba(png);
		assert(
			rgba.width === spec.expectedDimensions.width &&
				rgba.height === spec.expectedDimensions.height,
			`Meadow Entry complete panel ${spec.id} dimensions do not match the panel contract`
		);
		assertOpaque(rgba, `panel ${spec.id}`);
		assert(
			png.byteLength === provenance.normalized.bytes,
			`Meadow Entry complete panel ${spec.id} normalized byte count is stale`
		);
		assert(
			sha256(png) === provenance.normalized.sha256,
			`Meadow Entry complete panel ${spec.id} normalized source hash is stale`
		);
		decoded.push({ spec, png, rgba, provenanceSha256: sha256(provenanceBytes), provenance });
	}
	return decoded;
}

export async function assembleMeadowEntryPaintedV2CompleteMaster(
	input: MeadowEntryPaintedV2CompleteAssemblyInput
): Promise<{ readonly masterPng: Buffer; readonly provenanceJson: Buffer }> {
	const panels = await decodeAndValidatePanels(input);
	const rows: DecodedCompletePanel[][] = [];
	for (let row = 0; row < 4; row += 1) rows.push(panels.slice(row * 3, row * 3 + 3));
	const rowMasters = rows.map(buildRow);
	const master = buildMaster(rowMasters);
	assertOpaque(master, 'master');
	const masterPng = await encodeCanonicalMeadowEntryPng(
		master.data,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
	);
	validateCanonicalPngChunks(masterPng);
	const rejectionHistory = panels.flatMap(({ spec, provenance }) =>
		provenance.rejectionHistory.map((entry) =>
			isPlainObject(entry) ? { panelId: spec.id, ...entry } : { panelId: spec.id, entry }
		)
	);
	const provenanceJson = stableJson({
		packageId: COMPLETE_PACKAGE_ID,
		controlFingerprint: MEADOW_ENTRY_PAINTED_V2_COMPLETE_CONTROL_FINGERPRINT,
		dimensions: {
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		},
		assembly: {
			order: 'row-major',
			horizontalOverlapPx: MEADOW_ENTRY_PAINTED_V2_COMPLETE_HORIZONTAL_OVERLAP_PX,
			verticalOverlapPx: MEADOW_ENTRY_PAINTED_V2_COMPLETE_VERTICAL_OVERLAP_PX,
			handoffMaxHalfWidthPx: MEADOW_ENTRY_PAINTED_V2_COMPLETE_HANDOFF_MAX_HALF_WIDTH_PX,
			canonicalPngChunks: ['IHDR', 'IDAT', 'IEND']
		},
		master: {
			sha256: sha256(masterPng),
			bytes: masterPng.byteLength
		},
		panels: panels.map(({ spec, provenance, provenanceSha256 }) => ({
			id: spec.id,
			bounds: spec.bounds,
			assemblyPriority: spec.assemblyPriority,
			provenancePath: spec.provenancePath,
			provenanceSha256,
			raw: provenance.raw,
			generation: provenance.generation,
			rejectionHistory: provenance.rejectionHistory,
			normalized: provenance.normalized
		})),
		rejectionHistory
	});
	return { masterPng, provenanceJson };
}
