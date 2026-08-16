import { createHash } from 'node:crypto';

import type { MeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';
import {
	validateMeadowEntryGenerationProvenance,
	validateMeadowEntryPaintedV2SceneryInsertGenerationProvenance
} from './meadow-entry-master-provenance';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
} from './meadow-entry-png';
import {
	MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
	MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS
} from './meadow-entry-painted-v2-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS,
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS,
	MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
	type MeadowEntryPaintedV2SourcePanel
} from './meadow-entry-painted-v2-pilot';
import {
	MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS,
	validateMeadowEntryPaintedV2SceneryContract,
	type MeadowEntryPaintedV2SceneryInsert
} from './meadow-entry-painted-v2-scenery';
import {
	enrichMeadowEntryPaintedV2Sources,
	type DecodedMeadowEntryPaintedV2SceneryInsert,
	type MeadowEntryPaintedV2SceneryBakeResult,
	type MeadowEntryPaintedV2SceneryMaskSet
} from './meadow-entry-painted-v2-scenery-bake';
import { MEADOW_ENTRY_MASTER_POLICY } from './meadow-entry-master-finalizer';
import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	assembleMeadowEntryPaintedV2Underlay,
	compositeMeadowEntryDetailPanels,
	type MeadowEntryUnderlayDecodedPanel
} from './meadow-entry-painted-v2-underlay-assembly';

const SHA256 = /^[a-f0-9]{64}$/;

interface MeadowEntryPaintedV2PilotPanelSpec {
	readonly id: string;
	readonly role: MeadowEntryPaintedV2SourcePanel['role'];
	readonly bounds: PixelBounds;
	readonly expectedDimensions: { readonly width: number; readonly height: number };
	readonly assemblyPriority: number;
}

export interface MeadowEntryPaintedV2PilotAssemblyInput {
	readonly panels: Readonly<Record<string, Buffer>>;
	readonly panelProvenance: Readonly<Record<string, MeadowEntryGenerationProvenance>>;
	readonly blockedScenery: MeadowEntryPaintedV2BlockedSceneryAssemblyInput;
	readonly controlFingerprint: string;
	readonly approvedControlFingerprint: string;
}

export interface MeadowEntryPaintedV2BlockedSceneryAssemblyInput {
	readonly inserts: Readonly<Record<string, Buffer>>;
	readonly insertProvenance: Readonly<Record<string, MeadowEntryGenerationProvenance>>;
	readonly masks: MeadowEntryPaintedV2SceneryMaskSet;
}

export interface MeadowEntryPaintedV2PilotAssemblyResult {
	readonly masterPng: Buffer;
	readonly provenanceJson: Buffer;
}

interface DecodedPanel {
	spec: MeadowEntryPaintedV2PilotPanelSpec;
	provenance: MeadowEntryGenerationProvenance;
	bytes: Buffer;
	normalizedBytes: number;
	width: number;
	height: number;
	sha256: string;
}

interface DecodedInsert {
	spec: MeadowEntryPaintedV2SceneryInsert;
	provenance: MeadowEntryGenerationProvenance;
	bytes: Buffer;
	normalizedBytes: number;
	width: number;
	height: number;
	sha256: string;
	rgba: DecodedMeadowEntryPaintedV2SceneryInsert['rgba'];
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function dimensions(bounds: PixelBounds): { width: number; height: number } {
	return { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
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

function assertSha256(value: unknown, label: string): asserts value is string {
	assert(
		typeof value === 'string' && SHA256.test(value),
		`${label} must be a lowercase SHA-256 hash`
	);
}

function panelContractMetadata(
	provenance: MeadowEntryGenerationProvenance,
	id: string
): {
	sha256: string;
	bytes: number;
	dimensions: { width: number; height: number };
} {
	const settings = provenance.settings;
	const normalizedSha256 = settings['normalizedSha256'] ?? settings['sourcePanelSha256'];
	const normalizedBytes = settings['normalizedBytes'] ?? settings['sourcePanelBytes'];
	const normalizedDimensions =
		settings['normalizedDimensions'] ?? settings['sourcePanelDimensions'];
	assertSha256(normalizedSha256, `Meadow Entry panel ${id} normalized hash`);
	assert(
		Number.isInteger(normalizedBytes) && (normalizedBytes as number) > 0,
		`Meadow Entry panel ${id} normalized byte count is invalid`
	);
	assert(
		isPlainObject(normalizedDimensions) &&
			Number.isInteger(normalizedDimensions.width) &&
			Number.isInteger(normalizedDimensions.height) &&
			(normalizedDimensions.width as number) > 0 &&
			(normalizedDimensions.height as number) > 0,
		`Meadow Entry panel ${id} normalized dimensions are invalid`
	);
	return {
		sha256: normalizedSha256,
		bytes: normalizedBytes as number,
		dimensions: {
			width: normalizedDimensions.width as number,
			height: normalizedDimensions.height as number
		}
	};
}

function insertContractMetadata(
	provenance: MeadowEntryGenerationProvenance,
	id: string
): {
	sha256: string;
	bytes: number;
	dimensions: { width: number; height: number };
} {
	const settings = provenance.settings;
	const normalizedSha256 = settings.normalizedSha256;
	const normalizedBytes = settings.normalizedBytes;
	const normalizedDimensions = settings.normalizedDimensions;
	assertSha256(normalizedSha256, `Meadow Entry scenery insert ${id} normalized hash`);
	assert(
		Number.isInteger(normalizedBytes) && (normalizedBytes as number) > 0,
		`Meadow Entry scenery insert ${id} normalized byte count is invalid`
	);
	assert(
		isPlainObject(normalizedDimensions) &&
			Number.isInteger(normalizedDimensions.width) &&
			Number.isInteger(normalizedDimensions.height) &&
			(normalizedDimensions.width as number) > 0 &&
			(normalizedDimensions.height as number) > 0,
		`Meadow Entry scenery insert ${id} normalized dimensions are invalid`
	);
	return {
		sha256: normalizedSha256,
		bytes: normalizedBytes as number,
		dimensions: {
			width: normalizedDimensions.width as number,
			height: normalizedDimensions.height as number
		}
	};
}

function validatePanelSpecs(specs: readonly MeadowEntryPaintedV2PilotPanelSpec[]): void {
	const ids = new Set<string>();
	const priorities = new Set<number>();
	for (const spec of specs) {
		assert(!ids.has(spec.id), `Duplicate Meadow Entry pilot panel id: ${spec.id}`);
		ids.add(spec.id);
		assert(
			Number.isInteger(spec.assemblyPriority) && spec.assemblyPriority >= 0,
			`Meadow Entry pilot panel ${spec.id} priority must be a non-negative integer`
		);
		assert(
			!priorities.has(spec.assemblyPriority),
			`Duplicate Meadow Entry pilot panel priority: ${spec.assemblyPriority}`
		);
		priorities.add(spec.assemblyPriority);
		const expected = dimensions(spec.bounds);
		assert(
			spec.bounds.left >= 0 &&
				spec.bounds.top >= 0 &&
				spec.bounds.right <= MEADOW_ENTRY_MASTER_POLICY.width &&
				spec.bounds.bottom <= MEADOW_ENTRY_MASTER_POLICY.height &&
				expected.width > 0 &&
				expected.height > 0,
			`Meadow Entry pilot panel ${spec.id} bounds leave the 6400x6400 master`
		);
		assert(
			spec.expectedDimensions.width === expected.width &&
				spec.expectedDimensions.height === expected.height,
			`Meadow Entry pilot panel ${spec.id} dimensions do not match bounds`
		);
		if (spec.role === 'detail') {
			assert(
				expected.width >= 255 && expected.height >= 255,
				`Meadow Entry detail panel ${spec.id} must be at least 255px on each axis`
			);
		}
	}
}

function assertInputKeys(
	input: MeadowEntryPaintedV2PilotAssemblyInput,
	specs: readonly MeadowEntryPaintedV2PilotPanelSpec[]
): void {
	const expected = specs.map(({ id }) => id).sort();
	const panelKeys = Object.keys(input.panels).sort();
	const provenanceKeys = Object.keys(input.panelProvenance).sort();
	assert(
		JSON.stringify(panelKeys) === JSON.stringify(expected),
		`Meadow Entry pilot panel inputs differ: expected=${expected.join(',')} actual=${panelKeys.join(',')}`
	);
	assert(
		JSON.stringify(provenanceKeys) === JSON.stringify(expected),
		`Meadow Entry pilot panel provenance differs: expected=${expected.join(',')} actual=${provenanceKeys.join(',')}`
	);
	assert(
		input.blockedScenery !== undefined,
		'Meadow Entry pilot blocked scenery assembly input is missing'
	);
	const expectedInserts = MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map(({ id }) => id).sort();
	const insertKeys = Object.keys(input.blockedScenery.inserts).sort();
	const insertProvenanceKeys = Object.keys(input.blockedScenery.insertProvenance).sort();
	assert(
		JSON.stringify(insertKeys) === JSON.stringify(expectedInserts),
		`Meadow Entry blocked scenery inserts differ: expected=${expectedInserts.join(',')} actual=${insertKeys.join(',')}`
	);
	assert(
		JSON.stringify(insertProvenanceKeys) === JSON.stringify(expectedInserts),
		`Meadow Entry blocked scenery provenance differs: expected=${expectedInserts.join(',')} actual=${insertProvenanceKeys.join(',')}`
	);
}

function assertControlFingerprint(input: MeadowEntryPaintedV2PilotAssemblyInput): void {
	assertSha256(input.controlFingerprint, 'Meadow Entry pilot control fingerprint');
	assertSha256(input.approvedControlFingerprint, 'Meadow Entry approved control fingerprint');
	assert(
		input.controlFingerprint === input.approvedControlFingerprint,
		'Meadow Entry pilot control fingerprint is stale'
	);
}

function assertSceneryMasks(
	input: MeadowEntryPaintedV2PilotAssemblyInput
): asserts input is MeadowEntryPaintedV2PilotAssemblyInput & {
	blockedScenery: MeadowEntryPaintedV2BlockedSceneryAssemblyInput;
} {
	const masks = input.blockedScenery.masks;
	assert(
		masks.width === MEADOW_ENTRY_MASTER_POLICY.width &&
			masks.height === MEADOW_ENTRY_MASTER_POLICY.height,
		'Meadow Entry blocked scenery masks must be 6400x6400'
	);
	for (const [name, mask] of Object.entries({
		otherProtected: masks.otherProtected,
		groundAllowed: masks.groundAllowed,
		sceneryAllowed: masks.sceneryAllowed,
		hedgeAllowed: masks.hedgeAllowed,
		woodlandAllowed: masks.woodlandAllowed
	})) {
		assert(
			mask.byteLength === masks.width * masks.height,
			`Meadow Entry ${name} mask dimensions drifted`
		);
		for (const value of mask)
			assert(value === 0 || value === 1, `Meadow Entry ${name} mask must be binary`);
	}
	for (let index = 0; index < masks.sceneryAllowed.length; index += 1) {
		assert(
			!(masks.hedgeAllowed[index] === 1 && masks.woodlandAllowed[index] === 1),
			`Meadow Entry blocked scenery masks overlap at pixel ${index}`
		);
	}
	const fingerprint = masks.sourceHashes['derivation:control-fingerprint'];
	assertSha256(fingerprint, 'Meadow Entry blocked scenery source-catalog fingerprint');
	assert(
		fingerprint === input.controlFingerprint,
		'Meadow Entry blocked scenery source-catalog fingerprint is stale'
	);
	const sceneryContract = masks.sourceHashes['derivation:scenery-contract'];
	assertSha256(sceneryContract, 'Meadow Entry blocked scenery contract hash');
	for (const [key, hash] of Object.entries(masks.sourceHashes))
		assertSha256(hash, `Meadow Entry blocked scenery source hash ${key}`);
}

function validateSceneryProvenance(input: MeadowEntryPaintedV2PilotAssemblyInput): void {
	for (const expected of MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS) {
		const provenance = input.blockedScenery.insertProvenance[expected.id];
		assert(
			provenance !== undefined,
			`Missing Meadow Entry scenery insert provenance: ${expected.id}`
		);
		validateMeadowEntryPaintedV2SceneryInsertGenerationProvenance(provenance, expected);
		const metadata = insertContractMetadata(provenance, expected.id);
		const expectedDimensions = dimensions(expected.bounds);
		assert(
			metadata.dimensions.width === expectedDimensions.width &&
				metadata.dimensions.height === expectedDimensions.height,
			`Meadow Entry scenery insert ${expected.id} normalized dimensions do not match its bounds`
		);
	}
}

async function decodePanels(
	input: MeadowEntryPaintedV2PilotAssemblyInput,
	specs: readonly MeadowEntryPaintedV2PilotPanelSpec[]
): Promise<DecodedPanel[]> {
	const decoded: DecodedPanel[] = [];
	for (const spec of [...specs].sort(
		(first, second) =>
			first.assemblyPriority - second.assemblyPriority || first.id.localeCompare(second.id)
	)) {
		const png = input.panels[spec.id]!;
		const provenance = input.panelProvenance[spec.id]!;
		validateMeadowEntryGenerationProvenance(provenance);
		const metadata = panelContractMetadata(provenance, spec.id);
		assert(
			metadata.bytes === png.byteLength,
			`Meadow Entry panel ${spec.id} byte count drifted: ${png.byteLength}/${metadata.bytes}`
		);
		assert(
			sha256(png) === metadata.sha256,
			`Meadow Entry panel ${spec.id} normalized hash drifted`
		);
		validateCanonicalPngChunks(png);
		const value = await decodeMeadowEntryRgba(png);
		assert(
			value.width === spec.expectedDimensions.width &&
				value.height === spec.expectedDimensions.height,
			`Meadow Entry panel ${spec.id} dimensions drifted: ${value.width}x${value.height}`
		);
		assert(
			value.width === metadata.dimensions.width && value.height === metadata.dimensions.height,
			`Meadow Entry panel ${spec.id} normalized dimensions drifted`
		);
		for (let offset = 3; offset < value.data.length; offset += 4) {
			assert(value.data[offset] === 255, `Meadow Entry panel ${spec.id} is not fully opaque`);
		}
		decoded.push({
			spec,
			provenance,
			bytes: value.data,
			normalizedBytes: metadata.bytes,
			width: value.width,
			height: value.height,
			sha256: metadata.sha256
		});
	}
	return decoded;
}

async function decodeSceneryInserts(
	input: MeadowEntryPaintedV2PilotAssemblyInput
): Promise<DecodedInsert[]> {
	const decoded: DecodedInsert[] = [];
	for (const spec of MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS) {
		const png = input.blockedScenery.inserts[spec.id]!;
		const provenance = input.blockedScenery.insertProvenance[spec.id]!;
		const metadata = insertContractMetadata(provenance, spec.id);
		assert(
			metadata.bytes === png.byteLength,
			`Meadow Entry scenery insert ${spec.id} byte count drifted`
		);
		assert(
			sha256(png) === metadata.sha256,
			`Meadow Entry scenery insert ${spec.id} normalized hash drifted`
		);
		const rgba = await decodeMeadowEntryRgba(png);
		const expected = dimensions(spec.bounds);
		assert(
			rgba.width === expected.width && rgba.height === expected.height,
			`Meadow Entry scenery insert ${spec.id} dimensions drifted: ${rgba.width}x${rgba.height}`
		);
		assert(
			rgba.width === metadata.dimensions.width && rgba.height === metadata.dimensions.height,
			`Meadow Entry scenery insert ${spec.id} normalized dimensions drifted`
		);
		for (let offset = 3; offset < rgba.data.length; offset += 4)
			assert(
				rgba.data[offset] === 255,
				`Meadow Entry scenery insert ${spec.id} is not fully opaque`
			);
		decoded.push({
			spec,
			provenance,
			bytes: png,
			normalizedBytes: metadata.bytes,
			width: rgba.width,
			height: rgba.height,
			sha256: metadata.sha256,
			rgba: {
				data: rgba.data,
				width: rgba.width,
				height: rgba.height
			}
		});
	}
	return decoded;
}

function assertSceneryEnrichmentBounds(
	before: readonly DecodedPanel[],
	after: MeadowEntryPaintedV2SceneryBakeResult['panels'],
	masks: MeadowEntryPaintedV2SceneryMaskSet
): void {
	const beforeById = new Map(before.map((panel) => [panel.spec.id, panel]));
	for (const panel of after) {
		const original = beforeById.get(panel.id);
		if (original === undefined) continue;
		assert(
			original.bytes.length === panel.rgba.data.length,
			`Meadow Entry enriched panel dimensions drifted: ${panel.id}`
		);
		for (let localY = 0; localY < panel.rgba.height; localY += 1) {
			for (let localX = 0; localX < panel.rgba.width; localX += 1) {
				const offset = (localY * panel.rgba.width + localX) * 4;
				let changed = false;
				for (let channel = 0; channel < 3; channel += 1) {
					if (original.bytes[offset + channel] !== panel.rgba.data[offset + channel]) {
						changed = true;
					}
				}
				assert(
					panel.rgba.data[offset + 3] === original.bytes[offset + 3],
					`Meadow Entry enrichment changed alpha for ${panel.id}`
				);
				if (!changed) continue;
				const worldX = panel.bounds.left + localX;
				const worldY = panel.bounds.top + localY;
				const maskOffset = worldY * masks.width + worldX;
				assert(
					masks.sceneryAllowed[maskOffset] === 1 && masks.otherProtected[maskOffset] === 0,
					`Meadow Entry enrichment changed a protected/non-scenery pixel at ${worldX},${worldY}`
				);
			}
		}
	}
}

function underlayInput(decoded: readonly DecodedPanel[]) {
	const underlays = decoded.filter((panel) => panel.spec.role === 'underlay');
	const byId = new Map(underlays.map((panel) => [panel.spec.id, panel]));
	const requiredIds = [
		'camera-underlay-sundrop-north',
		'camera-underlay-sundrop-south',
		'camera-underlay-crossroads-north',
		'camera-underlay-crossroads-south'
	] as const;
	assert(underlays.length === requiredIds.length, 'Meadow Entry underlay registry is not sealed');
	for (const id of requiredIds)
		assert(byId.has(id), `Meadow Entry underlay panel is missing: ${id}`);
	const asPanel = (id: (typeof requiredIds)[number]): MeadowEntryUnderlayDecodedPanel => {
		const panel = byId.get(id)!;
		return {
			id,
			bounds: panel.spec.bounds,
			rgba: { data: panel.bytes, width: panel.width, height: panel.height }
		};
	};
	return {
		width: MEADOW_ENTRY_MASTER_POLICY.width,
		height: MEADOW_ENTRY_MASTER_POLICY.height,
		panels: requiredIds.map(asPanel),
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
			crossroadsPanelIds: ['camera-underlay-crossroads-north', 'camera-underlay-crossroads-south'],
			bounds: { left: 2368, top: 3200, right: 3200, bottom: 5440 }
		}
	} as const;
}

function assertRuntimeCropOpacity(master: Buffer): void {
	for (const crop of MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS) {
		for (let y = crop.bounds.top; y < crop.bounds.bottom; y += 1) {
			let offset = (y * MEADOW_ENTRY_MASTER_POLICY.width + crop.bounds.left) * 4 + 3;
			for (let x = crop.bounds.left; x < crop.bounds.right; x += 1) {
				assert(
					master[offset] === 255,
					`Meadow Entry runtime crop ${crop.id} is transparent at master=${x},${y}`
				);
				offset += 4;
			}
		}
	}
}

function alphaMetrics(master: Buffer): { transparentPixels: number; opaquePixels: number } {
	let transparentPixels = 0;
	let opaquePixels = 0;
	for (let offset = 3; offset < master.length; offset += 4) {
		if (master[offset] === 0) transparentPixels += 1;
		else if (master[offset] === 255) opaquePixels += 1;
		else throw new Error(`Meadow Entry pilot master contains partial alpha at byte=${offset}`);
	}
	return { transparentPixels, opaquePixels };
}

function assertOutsidePilotTransparent(master: Buffer): void {
	for (let y = 0; y < MEADOW_ENTRY_MASTER_POLICY.height; y += 1) {
		for (let x = 0; x < MEADOW_ENTRY_MASTER_POLICY.width; x += 1) {
			const inside = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.some(
				({ bounds }) => x >= bounds.left && x < bounds.right && y >= bounds.top && y < bounds.bottom
			);
			if (!inside) {
				const offset = (y * MEADOW_ENTRY_MASTER_POLICY.width + x) * 4;
				assert(
					master[offset + 3] === 0,
					`Meadow Entry pilot master paints outside source panels at master=${x},${y}`
				);
			}
		}
	}
}

function runtimeUnionPixelCount(): number {
	const [first, second] = MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS;
	const overlap = MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS[0]!.bounds;
	const area = (bounds: PixelBounds) => (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
	return area(first!.bounds) + area(second!.bounds) - area(overlap);
}

function sceneryInsertProvenanceRows(inserts: readonly DecodedInsert[]) {
	const byId = new Map(inserts.map((insert) => [insert.spec.id, insert]));
	return MEADOW_ENTRY_PAINTED_V2_SCENERY_INSERTS.map((spec) => {
		const insert = byId.get(spec.id)!;
		const settings = insert.provenance.settings;
		return {
			version: 1,
			id: spec.id,
			sceneryClass: spec.sceneryClass,
			bounds: spec.bounds,
			owningSourceId: spec.owningSourceId,
			owningSourcePriority: spec.owningSourcePriority,
			rawPath: spec.rawPath,
			normalizedPath: spec.normalizedPath,
			provenancePath: spec.provenancePath,
			raw: {
				sha256: settings.rawSha256,
				bytes: settings.rawBytes,
				dimensions: settings.rawDimensions
			},
			normalized: {
				sha256: insert.sha256,
				bytes: insert.normalizedBytes,
				dimensions: settings.normalizedDimensions
			},
			provenance: { sha256: settings.provenanceSha256 },
			attempt: settings.attempt,
			attemptHistory: settings.attemptHistory,
			approval: settings.approval,
			generation: insert.provenance
		};
	});
}

function sceneryMaskProvenance(masks: MeadowEntryPaintedV2SceneryMaskSet) {
	const maskEntries = Object.fromEntries(
		Object.entries({
			otherProtected: masks.otherProtected,
			groundAllowed: masks.groundAllowed,
			sceneryAllowed: masks.sceneryAllowed,
			hedgeAllowed: masks.hedgeAllowed,
			woodlandAllowed: masks.woodlandAllowed
		}).map(([name, mask]) => [
			name,
			{
				sha256: sha256(mask),
				bytes: mask.byteLength,
				width: masks.width,
				height: masks.height
			}
		])
	);
	return {
		width: masks.width,
		height: masks.height,
		sourceHashes: masks.sourceHashes,
		maskHashes: maskEntries
	};
}

function sceneryBakeProvenance(
	input: MeadowEntryPaintedV2PilotAssemblyInput,
	masks: MeadowEntryPaintedV2SceneryMaskSet,
	baked: MeadowEntryPaintedV2SceneryBakeResult
) {
	return {
		version: 1,
		sourceCatalogSha256: input.controlFingerprint,
		masks: sceneryMaskProvenance(masks),
		intermediateHashes: {
			topologyRequestSha256: baked.topologyRequestSha256,
			intersectionRawWeightSha256: Object.fromEntries(
				baked.intersections.map((metric) => [metric.blockerId, metric.rawWeightSha256])
			),
			intersectionWeightSha256: Object.fromEntries(
				baked.intersections.map((metric) => [metric.blockerId, metric.weightSha256])
			),
			rowRawWeightSha256: Object.fromEntries(
				baked.rows.map((metric) => [metric.blockerId, metric.rawWeightSha256])
			),
			rowWeightSha256: Object.fromEntries(
				baked.rows.map((metric) => [metric.blockerId, metric.weightSha256])
			)
		},
		helperIds: [
			'enrichMeadowEntryPaintedV2Sources',
			'meadowEntryNearestRank',
			'meadowEntryDetailFeatherWeight',
			'blendMeadowEntryDetailChannel'
		],
		localMeanRadii: { insert: 31, near: 15, far: 63 },
		detailCaps: { hedge: 32, woodland: 48 },
		edgeEnvelopeCap: 15,
		intersections: baked.intersections,
		rows: baked.rows,
		topologyRequests: baked.topologyRequests,
		topologyRequestSha256: baked.topologyRequestSha256,
		formulas: baked.formulas,
		changedPixelCount: baked.changedPixelCount,
		classChangedPixelCounts: baked.classChangedPixelCounts,
		enrichedSourceSha256: baked.enrichedSourceSha256,
		enrichedOwnerDecodedRgbaSha256: baked.enrichedSourceSha256
	};
}

function assemblyProvenance(
	input: MeadowEntryPaintedV2PilotAssemblyInput,
	panels: readonly DecodedPanel[],
	inserts: readonly DecodedInsert[],
	baked: MeadowEntryPaintedV2SceneryBakeResult,
	masterPng: Buffer,
	metrics: { transparentPixels: number; opaquePixels: number }
): Buffer {
	const masterSha256 = sha256(masterPng);
	return stableJson({
		version: 1,
		kind: 'meadow-entry-painted-v2-pilot-assembly',
		controls: { fingerprint: input.controlFingerprint },
		policy: {
			width: MEADOW_ENTRY_MASTER_POLICY.width,
			height: MEADOW_ENTRY_MASTER_POLICY.height,
			alpha: 'opaque-inside-camera-safe-crop-union',
			assembly:
				'underlay-families-then-ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather',
			underlayAssembly: {
				northSouthLastIndex: 127,
				familyHandoffLastIndex: 831,
				rounding: 'floor-half-up-positive-integers',
				detailPolicy:
					'ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather-and-immediate-pair-corrections',
				detailFeatherWidthPx: 128,
				detailFeatherLastInsetIndex: 127,
				detailFeatherWeight:
					'floor((255*q^2*(3*127-2*q)+floor(127^3/2))/127^3),q=clamp(edgeDistance,0,127)',
				detailBlend: 'floor((current*(255-weight)+detail*weight+127)/255)',
				detailSourceBytes: 'immutable',
				detailCore:
					'source-exact-at-edge-distance-gte-127-unless-later-priority-or-pair-correction-composites',
				detailPairCorrections: {
					stage: 'immediately-after-second-member',
					formulas: MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
					pairs: MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS
				},
				blendBounds: {
					sundropNorthSouth: { left: 0, top: 4736, right: 3200, bottom: 4864 },
					crossroadsNorthSouth: { left: 2368, top: 3776, right: 5568, bottom: 3904 },
					familyHandoff: { left: 2368, top: 3200, right: 3200, bottom: 5440 }
				}
			},
			pngEncoding: 'canonical'
		},
		base: {
			path: 'artifacts/meadow-entry/painted-v2/masters/meadow-entry-painted-v2-pilot-base-master.png',
			sha256: masterSha256,
			bytes: masterPng.byteLength,
			width: MEADOW_ENTRY_MASTER_POLICY.width,
			height: MEADOW_ENTRY_MASTER_POLICY.height,
			alpha: metrics
		},
		panels: panels.map((panel) => ({
			id: panel.spec.id,
			bounds: panel.spec.bounds,
			expectedDimensions: panel.spec.expectedDimensions,
			assemblyPriority: panel.spec.assemblyPriority,
			sha256: panel.sha256,
			bytes: panel.normalizedBytes,
			decodedRgbaBytes: panel.bytes.byteLength,
			generation: panel.provenance
		})),
		blockedSceneryInserts: sceneryInsertProvenanceRows(inserts),
		blockedSceneryBake: sceneryBakeProvenance(input, input.blockedScenery.masks, baked),
		underlayInputs: panels
			.filter((panel) => panel.spec.role === 'underlay')
			.map((panel) => ({
				id: panel.spec.id,
				bounds: panel.spec.bounds,
				sha256: panel.sha256
			})),
		assemblyOrder: panels.map((panel) => panel.spec.id),
		detailSourcePolicy:
			'ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather-and-immediate-pair-corrections',
		detailPairCorrections: {
			stage: 'immediately-after-second-member',
			formulas: MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIR_FORMULAS,
			pairs: MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS
		},
		runtimeCrops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS.map((crop) => ({
			id: crop.id,
			bounds: crop.bounds,
			dimensions: crop.expectedDimensions,
			alphaPolicy: crop.alphaPolicy.base
		})),
		overlaps: MEADOW_ENTRY_PAINTED_V2_PILOT_OVERLAPS.map((overlap) => ({
			id: overlap.id,
			firstCropId: overlap.firstCropId,
			secondCropId: overlap.secondCropId,
			bounds: overlap.bounds,
			ownerCropId: overlap.ownerCropId,
			planePolicy: overlap.planePolicy
		}))
	});
}

export async function assembleMeadowEntryPaintedV2Pilot(
	input: MeadowEntryPaintedV2PilotAssemblyInput
): Promise<MeadowEntryPaintedV2PilotAssemblyResult> {
	assertControlFingerprint(input);
	const specs = MEADOW_ENTRY_PAINTED_V2_SOURCE_PANELS;
	validatePanelSpecs(specs);
	assertInputKeys(input, specs);
	validateMeadowEntryPaintedV2SceneryContract();
	assertSceneryMasks(input);
	validateSceneryProvenance(input);
	const panels = await decodePanels(input, specs);
	const inserts = await decodeSceneryInserts(input);
	const beforeEnrichment = panels.map((panel) => ({ ...panel, bytes: Buffer.from(panel.bytes) }));
	const enriched = enrichMeadowEntryPaintedV2Sources(
		panels.map((panel) => ({
			id: panel.spec.id,
			bounds: panel.spec.bounds,
			rgba: { data: panel.bytes, width: panel.width, height: panel.height },
			assemblyPriority: panel.spec.assemblyPriority
		})),
		inserts.map(({ spec, rgba }) => ({
			id: spec.id,
			sceneryClass: spec.sceneryClass,
			owningSourceId: spec.owningSourceId,
			bounds: spec.bounds,
			rgba
		})),
		input.blockedScenery.masks
	);
	assertSceneryEnrichmentBounds(beforeEnrichment, enriched.panels, input.blockedScenery.masks);
	const enrichedById = new Map(enriched.panels.map((panel) => [panel.id, panel]));
	const enrichedDecodedPanels = panels.map((panel) => {
		const enrichedPanel = enrichedById.get(panel.spec.id)!;
		return {
			...panel,
			bytes: enrichedPanel.rgba.data,
			width: enrichedPanel.rgba.width,
			height: enrichedPanel.rgba.height
		};
	});
	const underlay = await assembleMeadowEntryPaintedV2Underlay(underlayInput(enrichedDecodedPanels));
	const detailPanels = enrichedDecodedPanels
		.filter((value) => value.spec.role === 'detail')
		.map((panel) => ({
			id: panel.spec.id,
			bounds: panel.spec.bounds,
			rgba: { data: panel.bytes, width: panel.width, height: panel.height },
			assemblyPriority: panel.spec.assemblyPriority
		}));
	compositeMeadowEntryDetailPanels(underlay, detailPanels, MEADOW_ENTRY_PAINTED_V2_DETAIL_PAIRS);
	const master = underlay.data;
	assertRuntimeCropOpacity(master);
	assertOutsidePilotTransparent(master);
	const metrics = alphaMetrics(master);
	assert(
		metrics.opaquePixels === runtimeUnionPixelCount(),
		`Meadow Entry pilot master opaque pixel count drifted: ${metrics.opaquePixels}`
	);
	const masterPng = await encodeCanonicalMeadowEntryPng(
		master,
		MEADOW_ENTRY_MASTER_POLICY.width,
		MEADOW_ENTRY_MASTER_POLICY.height
	);
	validateCanonicalPngChunks(masterPng);
	return {
		masterPng,
		provenanceJson: assemblyProvenance(input, panels, inserts, enriched, masterPng, metrics)
	};
}
