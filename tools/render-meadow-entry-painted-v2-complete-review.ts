import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import sharp from 'sharp';

import { SUNDROP_VILLAGE_V2_BUILDINGS } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_REGION_ENVELOPES
} from '$lib/game/content/maps/layouts/meadow-entry-v2';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks,
	type DecodedMeadowEntryRgba
} from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import { COMPLETE_MEADOW_ENTRY_MASTER_PATH } from './finalize-meadow-entry-painted-v2-complete';

export const COMPLETE_REVIEW_OUTPUT_ROOT =
	'docs/superpowers/reports/img/hpa-586-painted-v2-complete';

export const COMPLETE_REVIEW_EVIDENCE = [
	'full-overview.png',
	'representative-native-detail.png',
	'river-crossing.png',
	'forest-boundary.png',
	'village-approach.png',
	'seam-evidence.png',
	'region-sundrop-village.png',
	'region-crossroads.png',
	'region-wildwood.png',
	'region-silverpine.png',
	'region-mistfen.png',
	'region-coast.png',
	'region-river.png',
	'route-collision-protected-live-overlay.png',
	'collision-overlay.png',
	'protected-live-overlay.png',
	'route-overlay.png',
	'source-handoff-band-01.png',
	'source-handoff-band-02.png',
	'source-handoff-band-03.png',
	'source-handoff-band-04.png',
	'source-handoff-band-05.png',
	'source-handoff-band-06.png',
	'master-edge-north.png',
	'master-edge-east.png',
	'master-edge-south.png',
	'master-edge-west.png',
	'runtime-quadrant-edge-northwest.png',
	'runtime-quadrant-edge-northeast.png',
	'runtime-quadrant-edge-southwest.png',
	'runtime-quadrant-edge-southeast.png',
	'hero-house-approach.png',
	'building-approach-villager-house-1.png',
	'building-approach-villager-house-2.png',
	'building-approach-guild-hall.png',
	'building-approach-item-shop.png',
	'building-approach-blacksmith.png',
	'building-approach-villager-house-3.png',
	'building-approach-shrine.png',
	'bridge-silverpine.png',
	'bridge-mistfen.png',
	'bridge-sundrop.png',
	'ford-ferry-approach.png',
	'native-decoration-density-01.png',
	'native-decoration-density-02.png',
	'native-decoration-density-03.png',
	'native-decoration-density-04.png',
	'native-decoration-density-05.png',
	'master-edge-inventory.json',
	'complete-review-manifest.json'
] as const;

const MASKS = {
	route: 'meadow-entry-terrain-path-mask.svg',
	collision: 'meadow-entry-collision-mask.svg',
	protectedLive: 'meadow-entry-protected-live-mask.svg'
} as const;

// Preserve the existing review PNG bytes: Sharp's PNG input path writes its
// 72-DPI default as 2834 pixels/metre, while a raw input defaults to 1000.
const SHARP_DEFAULT_DENSITY_PPM = 2834;
const PNG_CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
	let crc = value;
	for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
	return crc >>> 0;
});

interface CompleteReviewOptions {
	readonly masterPath?: string;
	readonly outputRoot?: string;
	readonly check?: boolean;
}

interface CompleteReviewResult {
	readonly manifestSha256: string;
	readonly manifestPath: string;
}

interface Bounds {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
}

function toBounds(rect: {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}): Bounds {
	return { left: rect.x, top: rect.y, right: rect.x + rect.width, bottom: rect.y + rect.height };
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function repositoryRelativePath(repositoryRoot: string, path: string): string {
	const value = relative(repositoryRoot, path).replaceAll('\\', '/');
	assert(
		value.length > 0 && value !== '..' && !value.startsWith('../'),
		`Complete Meadow Entry review master must be inside the repository root: ${path}`
	);
	return value;
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function clampBounds(bounds: Bounds): Bounds {
	return {
		left: Math.max(0, Math.min(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, bounds.left)),
		top: Math.max(0, Math.min(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT, bounds.top)),
		right: Math.max(0, Math.min(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH, bounds.right)),
		bottom: Math.max(0, Math.min(MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT, bounds.bottom))
	};
}

function expand(bounds: Bounds, padding: number): Bounds {
	return clampBounds({
		left: bounds.left - padding,
		top: bounds.top - padding,
		right: bounds.right + padding,
		bottom: bounds.bottom + padding
	});
}

function dimensions(bounds: Bounds): { readonly width: number; readonly height: number } {
	return { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
}

async function crop(decoded: DecodedMeadowEntryRgba, requested: Bounds): Promise<Buffer> {
	const bounds = clampBounds(requested);
	const { width, height } = dimensions(bounds);
	assert(width > 0 && height > 0, 'Complete Meadow Entry review crop must be non-empty');
	const raw = Buffer.alloc(width * height * 4);
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		const sourceOffset = (y * decoded.width + bounds.left) * 4;
		const targetOffset = (y - bounds.top) * width * 4;
		decoded.data.copy(raw, targetOffset, sourceOffset, sourceOffset + width * 4);
	}
	return encodeCanonicalMeadowEntryPng(raw, width, height);
}

function pngCrc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) crc = (PNG_CRC32_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

function patchPngDensity(png: Buffer, densityPpm: number): Buffer {
	const output = Buffer.from(png);
	let offset = 8;
	while (offset < output.length) {
		const length = output.readUInt32BE(offset);
		const typeOffset = offset + 4;
		const type = output.toString('ascii', typeOffset, typeOffset + 4);
		if (type === 'pHYs' && length === 9) {
			const dataOffset = offset + 8;
			output.writeUInt32BE(densityPpm, dataOffset);
			output.writeUInt32BE(densityPpm, dataOffset + 4);
			output.writeUInt8(1, dataOffset + 8);
			output.writeUInt32BE(
				pngCrc32(output.subarray(typeOffset, dataOffset + length)),
				offset + 8 + length
			);
			return output;
		}
		offset += length + 12;
	}
	throw new Error('Complete Meadow Entry overview PNG is missing a pHYs chunk');
}

async function resizedOverview(decoded: DecodedMeadowEntryRgba): Promise<Buffer> {
	const resized = await sharp(decoded.data, {
		raw: { width: decoded.width, height: decoded.height, channels: 4 }
	})
		.resize(1600, 1600, { fit: 'fill' })
		.png()
		.toBuffer();
	return patchPngDensity(resized, SHARP_DEFAULT_DENSITY_PPM);
}

async function maskPng(repositoryRoot: string, filename: string): Promise<Buffer> {
	return sharp(
		await readFile(
			join(repositoryRoot, 'artifacts/meadow-entry/painted-v2/complete/controls', filename)
		)
	)
		.resize(1600, 1600, { fit: 'fill' })
		.png()
		.toBuffer();
}

async function overlay(decoded: DecodedMeadowEntryRgba, masks: readonly Buffer[]): Promise<Buffer> {
	const base = await resizedOverview(decoded);
	return sharp(base)
		.composite(masks.map((input) => ({ input })))
		.png()
		.toBuffer();
}

function regionBounds(): Readonly<Record<string, Bounds>> {
	return {
		sundropVillage: toBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.sundropVillage),
		crossroads: toBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.crossroads),
		wildwood: toBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.wildwood),
		silverpine: toBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.silverpine),
		mistfen: toBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.mistfen),
		coast: toBounds(MEADOW_ENTRY_V2_REGION_ENVELOPES.tidewatchCoast),
		river: { left: 2368, top: 256, right: 4096, bottom: 6144 }
	};
}

function edgeBounds(edge: 'north' | 'east' | 'south' | 'west'): Bounds {
	const width = MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH;
	const height = MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT;
	const band = 96;
	if (edge === 'north') return { left: 0, top: 0, right: width, bottom: band };
	if (edge === 'east') return { left: width - band, top: 0, right: width, bottom: height };
	if (edge === 'south') return { left: 0, top: height - band, right: width, bottom: height };
	return { left: 0, top: 0, right: band, bottom: height };
}

function quadrantEdgeBounds(index: number): Bounds {
	const left = index % 2 === 0 ? 0 : 3200;
	const top = index < 2 ? 0 : 3200;
	const edge = 96;
	return {
		left: left === 0 ? left : left - edge,
		top: top === 0 ? top : top - edge,
		right: left === 0 ? left + 3200 + edge : left + 3200,
		bottom: top === 0 ? top + 3200 + edge : top + 3200
	};
}

function handoffBounds(): readonly Bounds[] {
	return [
		{ left: 1888, top: 0, right: 2528, bottom: 1792 },
		{ left: 3872, top: 0, right: 4512, bottom: 1792 },
		{ left: 1888, top: 1536, right: 2528, bottom: 3328 },
		{ left: 3872, top: 1536, right: 4512, bottom: 3328 },
		{ left: 0, top: 1408, right: 2432, bottom: 1664 },
		{ left: 0, top: 2944, right: 2432, bottom: 3200 }
	];
}

function bridgeBounds(): readonly [string, Bounds][] {
	return [
		['silverpine', toBounds(MEADOW_ENTRY_V2_CROSSINGS.silverpineBridge)],
		['mistfen', toBounds(MEADOW_ENTRY_V2_CROSSINGS.mistfenBridge)],
		['sundrop', toBounds(MEADOW_ENTRY_V2_CROSSINGS.sundropBridge)],
		['ferry-approach', toBounds(MEADOW_ENTRY_V2_CROSSINGS.ferryApproach)]
	];
}

function densityBounds(): readonly Bounds[] {
	return [
		{ left: 480, top: 4160, right: 992, bottom: 4672 },
		{ left: 4480, top: 960, right: 4992, bottom: 1472 },
		{ left: 2688, top: 960, right: 3200, bottom: 1472 },
		{ left: 1024, top: 1920, right: 1536, bottom: 2432 },
		{ left: 5120, top: 5440, right: 5632, bottom: 5952 }
	];
}

async function makeArtifacts(
	repositoryRoot: string,
	decoded: DecodedMeadowEntryRgba
): Promise<Readonly<Record<string, Buffer>>> {
	const artifacts: Record<string, Buffer> = {};
	artifacts['full-overview.png'] = await resizedOverview(decoded);
	artifacts['representative-native-detail.png'] = await crop(decoded, {
		left: 1152,
		top: 4800,
		right: 1856,
		bottom: 5312
	});
	artifacts['river-crossing.png'] = await crop(
		decoded,
		expand(toBounds(MEADOW_ENTRY_V2_CROSSINGS.sundropBridge), 256)
	);
	artifacts['forest-boundary.png'] = await crop(decoded, {
		left: 4096,
		top: 1664,
		right: 6016,
		bottom: 3200
	});
	artifacts['village-approach.png'] = await crop(decoded, {
		left: 256,
		top: 4480,
		right: 2816,
		bottom: 4864
	});
	artifacts['seam-evidence.png'] = await crop(decoded, {
		left: 1792,
		top: 1408,
		right: 4608,
		bottom: 3328
	});

	for (const [name, bounds] of Object.entries(regionBounds())) {
		artifacts[`region-${name.replace('sundropVillage', 'sundrop-village')}.png`] = await crop(
			decoded,
			bounds
		);
	}

	const routeMask = await maskPng(repositoryRoot, MASKS.route);
	const collisionMask = await maskPng(repositoryRoot, MASKS.collision);
	const protectedMask = await maskPng(repositoryRoot, MASKS.protectedLive);
	artifacts['route-collision-protected-live-overlay.png'] = await overlay(decoded, [
		routeMask,
		collisionMask,
		protectedMask
	]);
	artifacts['collision-overlay.png'] = await overlay(decoded, [collisionMask]);
	artifacts['protected-live-overlay.png'] = await overlay(decoded, [protectedMask]);
	artifacts['route-overlay.png'] = await overlay(decoded, [routeMask]);

	for (const [index, bounds] of handoffBounds().entries()) {
		artifacts[`source-handoff-band-${(index + 1).toString().padStart(2, '0')}.png`] = await crop(
			decoded,
			bounds
		);
	}
	for (const edge of ['north', 'east', 'south', 'west'] as const) {
		artifacts[`master-edge-${edge}.png`] = await crop(decoded, edgeBounds(edge));
	}
	for (const [index, name] of ['northwest', 'northeast', 'southwest', 'southeast'].entries()) {
		artifacts[`runtime-quadrant-edge-${name}.png`] = await crop(decoded, quadrantEdgeBounds(index));
	}

	const buildingNames: Readonly<Record<string, string>> = {
		villagerHouse1: 'villager-house-1',
		villagerHouse2: 'villager-house-2',
		guildHall: 'guild-hall',
		itemShop: 'item-shop',
		blacksmith: 'blacksmith',
		heroHouse: 'hero-house',
		villagerHouse3: 'villager-house-3',
		shrine: 'shrine'
	};
	for (const [key, building] of Object.entries(SUNDROP_VILLAGE_V2_BUILDINGS)) {
		const id = buildingNames[key] ?? key;
		const bytes = await crop(decoded, expand(toBounds(building.approach), 192));
		artifacts[id === 'hero-house' ? 'hero-house-approach.png' : `building-approach-${id}.png`] =
			bytes;
	}
	for (const [name, bounds] of bridgeBounds()) {
		artifacts[name === 'ferry-approach' ? 'ford-ferry-approach.png' : `bridge-${name}.png`] =
			await crop(decoded, expand(bounds, 256));
	}
	for (const [index, bounds] of densityBounds().entries()) {
		artifacts[`native-decoration-density-${(index + 1).toString().padStart(2, '0')}.png`] =
			await crop(decoded, bounds);
	}
	return artifacts;
}

export async function renderMeadowEntryPaintedV2CompleteReviewArtifactsFromDecoded(
	repositoryRoot: string,
	decoded: DecodedMeadowEntryRgba
): Promise<Readonly<Record<string, Buffer>>> {
	assert(
		decoded.width === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH &&
			decoded.height === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		'Complete Meadow Entry review decoded source dimensions are stale'
	);
	return makeArtifacts(resolve(repositoryRoot), decoded);
}

function stableJson(value: unknown): Buffer {
	const stable = (input: unknown): unknown => {
		if (Array.isArray(input)) return input.map(stable);
		if (typeof input !== 'object' || input === null) return input;
		return Object.fromEntries(
			Object.keys(input as Record<string, unknown>)
				.sort()
				.map((key) => [key, stable((input as Record<string, unknown>)[key])])
		);
	};
	return Buffer.from(`${JSON.stringify(stable(value), null, '\t')}\n`);
}

export async function renderMeadowEntryPaintedV2CompleteReview(
	repositoryRoot = process.cwd(),
	options: CompleteReviewOptions = {}
): Promise<CompleteReviewResult> {
	const root = resolve(repositoryRoot);
	const masterPath = resolve(root, options.masterPath ?? COMPLETE_MEADOW_ENTRY_MASTER_PATH);
	const outputRoot = resolve(root, options.outputRoot ?? COMPLETE_REVIEW_OUTPUT_ROOT);
	const masterPng = await readFile(masterPath);
	validateCanonicalPngChunks(masterPng);
	const decoded = await decodeMeadowEntryRgba(masterPng);
	assert(
		decoded.width === 6400 && decoded.height === 6400,
		'Complete Meadow Entry review master dimensions are stale'
	);
	for (let offset = 3; offset < decoded.data.length; offset += 4)
		assert(decoded.data[offset] === 255, 'Complete Meadow Entry review master is not opaque');
	const artifacts = await makeArtifacts(root, decoded);
	const descriptors: Record<
		string,
		{
			readonly sha256: string;
			readonly bytes: number;
			readonly width: number;
			readonly height: number;
		}
	> = {};
	for (const name of COMPLETE_REVIEW_EVIDENCE) {
		if (name.endsWith('.json')) continue;
		const bytes = artifacts[name];
		assert(bytes !== undefined, `Complete Meadow Entry review artifact is missing: ${name}`);
		const info = await sharp(bytes).metadata();
		descriptors[name] = {
			sha256: sha256(bytes),
			bytes: bytes.byteLength,
			width: info.width ?? 0,
			height: info.height ?? 0
		};
	}
	const manifest = stableJson({
		version: 1,
		packageId: 'meadow-entry-painted-v2-complete',
		master: {
			path: repositoryRelativePath(root, masterPath),
			sha256: sha256(masterPng),
			bytes: masterPng.byteLength,
			width: decoded.width,
			height: decoded.height
		},
		evidence: descriptors,
		inventory: COMPLETE_REVIEW_EVIDENCE.filter((name) => !name.endsWith('.json'))
	});
	const manifestPath = join(outputRoot, 'complete-review-manifest.json');
	const edgeInventory = stableJson({
		master: ['north', 'east', 'south', 'west'].map((edge) => `master-edge-${edge}.png`),
		runtimeQuadrants: ['northwest', 'northeast', 'southwest', 'southeast'].map(
			(name) => `runtime-quadrant-edge-${name}.png`
		),
		sourceHandoffBands: Array.from(
			{ length: 6 },
			(_, index) => `source-handoff-band-${(index + 1).toString().padStart(2, '0')}.png`
		)
	});
	if (options.check) {
		const existingManifest = await readFile(manifestPath);
		assert(existingManifest.equals(manifest), 'Complete Meadow Entry review manifest is stale');
		const existingEdges = await readFile(join(outputRoot, 'master-edge-inventory.json'));
		assert(existingEdges.equals(edgeInventory), 'Complete Meadow Entry edge inventory is stale');
		for (const name of Object.keys(artifacts))
			assert(
				(await readFile(join(outputRoot, name))).equals(artifacts[name]!),
				`Complete Meadow Entry review artifact is stale: ${name}`
			);
	} else {
		await mkdir(outputRoot, { recursive: true });
		for (const [name, bytes] of Object.entries(artifacts))
			await writeFile(join(outputRoot, name), bytes);
		await writeFile(manifestPath, manifest);
		await writeFile(join(outputRoot, 'master-edge-inventory.json'), edgeInventory);
	}
	return { manifestSha256: sha256(manifest), manifestPath };
}

export function parseRenderMeadowEntryPaintedV2CompleteArguments(
	args: readonly string[]
): CompleteReviewOptions {
	let check = false;
	for (let index = args[0] === '--' ? 1 : 0; index < args.length; index += 1) {
		const flag = args[index];
		if (flag === '--check') {
			if (check) throw new Error('Duplicate complete Meadow Entry review argument: --check');
			check = true;
			continue;
		}
		throw new Error(`Unknown complete Meadow Entry review argument: ${flag ?? '<missing>'}`);
	}
	return { check };
}

if (import.meta.main) {
	const args = parseRenderMeadowEntryPaintedV2CompleteArguments(process.argv.slice(2));
	const result = await renderMeadowEntryPaintedV2CompleteReview(process.cwd(), args);
	process.stdout.write(
		`${JSON.stringify({ check: args.check, manifestPath: result.manifestPath, manifestSha256: result.manifestSha256 })}\n`
	);
}
