import { createHash } from 'node:crypto';

import type { MeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';
import { validateMeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';
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
	type MeadowEntryPaintedV2SourcePanel
} from './meadow-entry-painted-v2-pilot';
import { MEADOW_ENTRY_MASTER_POLICY } from './meadow-entry-master-finalizer';
import type { PixelBounds } from './meadow-entry-authoring-types';
import {
	assembleMeadowEntryPaintedV2Underlay,
	compositeMeadowEntryDetailPanel,
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
	readonly controlFingerprint: string;
	readonly approvedControlFingerprint: string;
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

function sha256(value: Buffer): string {
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
}

function assertControlFingerprint(input: MeadowEntryPaintedV2PilotAssemblyInput): void {
	assertSha256(input.controlFingerprint, 'Meadow Entry pilot control fingerprint');
	assertSha256(input.approvedControlFingerprint, 'Meadow Entry approved control fingerprint');
	assert(
		input.controlFingerprint === input.approvedControlFingerprint,
		'Meadow Entry pilot control fingerprint is stale'
	);
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

function assemblyProvenance(
	input: MeadowEntryPaintedV2PilotAssemblyInput,
	panels: readonly DecodedPanel[],
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
					'ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather',
				detailFeatherWidthPx: 128,
				detailFeatherLastInsetIndex: 127,
				detailFeatherWeight:
					'floor((255*q^2*(3*127-2*q)+floor(127^3/2))/127^3),q=clamp(edgeDistance,0,127)',
				detailBlend: 'floor((current*(255-weight)+detail*weight+127)/255)',
				detailSourceBytes: 'immutable',
				detailCore: 'source-exact-at-edge-distance-gte-127-unless-later-priority-composites',
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
		underlayInputs: panels
			.filter((panel) => panel.spec.role === 'underlay')
			.map((panel) => ({
				id: panel.spec.id,
				bounds: panel.spec.bounds,
				sha256: panel.sha256
			})),
		assemblyOrder: panels.map((panel) => panel.spec.id),
		detailSourcePolicy:
			'ascending-priority-source-over-current-master-with-128px-inset-smoothstep-feather',
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
	const panels = await decodePanels(input, specs);
	const underlay = await assembleMeadowEntryPaintedV2Underlay(underlayInput(panels));
	for (const panel of panels.filter((value) => value.spec.role === 'detail')) {
		compositeMeadowEntryDetailPanel(underlay, {
			id: panel.spec.id,
			bounds: panel.spec.bounds,
			rgba: { data: panel.bytes, width: panel.width, height: panel.height }
		});
	}
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
		provenanceJson: assemblyProvenance(input, panels, masterPng, metrics)
	};
}
