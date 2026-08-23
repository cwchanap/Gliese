import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-crop-manifest';
import {
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-complete';
import type { PixelBounds } from '$lib/game/content/backgrounds/meadow-entry-authoring-types';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks,
	writeAtomicMeadowEntryPng,
	type DecodedMeadowEntryRgba
} from '$lib/game/content/backgrounds/meadow-entry-png';
import { MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT } from '$lib/game/content/generated/meadow-entry-painted-v2-complete-art-control';

export const COMPLETE_MEADOW_ENTRY_MASTER_PATH =
	'artifacts/meadow-entry/painted-v2/complete/masters/meadow-entry-painted-v2-complete-base-master.png';
export const COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH =
	'artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-master.json';
export const COMPLETE_MEADOW_ENTRY_MASTER_APPROVAL_PATH =
	'artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-master-approval.json';
export const COMPLETE_MEADOW_ENTRY_CROP_MANIFEST_PATH =
	'artifacts/meadow-entry/painted-v2/complete/controls/meadow-entry-crop-manifest.json';
export const COMPLETE_MEADOW_ENTRY_EXPORT_PROVENANCE_PATH =
	'artifacts/meadow-entry/painted-v2/complete/provenance/meadow-entry-painted-v2-complete-export.json';
export const COMPLETE_MEADOW_ENTRY_RUNTIME_ROOT =
	'public/game/assets/regions/meadow-entry-painted-v2';
export const COMPLETE_MEADOW_ENTRY_PACKAGE_ID = 'meadow-entry-painted-v2-complete';

export interface CompleteRuntimeSliceSpec {
	readonly cropId: string;
	readonly bounds: PixelBounds;
	readonly width: number;
	readonly height: number;
	readonly filename: string;
	readonly textureKey: string;
	readonly drawOrder: number;
}

export interface CompleteRuntimeSlice {
	readonly cropId: string;
	readonly bounds: PixelBounds;
	readonly width: number;
	readonly height: number;
	readonly rgba: Buffer;
}

export interface CompleteRuntimeExportArtifact {
	readonly cropId: string;
	readonly plane: 'base';
	readonly textureKey: string;
	readonly drawOrder: number;
	readonly path: string;
	readonly bounds: PixelBounds;
	readonly width: number;
	readonly height: number;
	readonly bytes: number;
	readonly sha256: string;
	readonly png: Buffer;
}

export interface CompleteRuntimeExportPackage {
	readonly master: {
		readonly path: string;
		readonly sha256: string;
		readonly bytes: number;
		readonly width: number;
		readonly height: number;
	};
	readonly cropManifestSha256: string;
	readonly masterProvenanceSha256: string;
	readonly exports: readonly CompleteRuntimeExportArtifact[];
	readonly provenanceJson: Buffer;
}

export interface CompleteExportFileSystem {
	readonly readFile: typeof readFile;
	readonly mkdir: typeof mkdir;
}

export interface CompleteExportRunResult extends CompleteRuntimeExportPackage {
	readonly check: boolean;
}

function freezeBounds(bounds: PixelBounds): PixelBounds {
	return Object.freeze({ ...bounds });
}

function freezeSliceSpec(spec: CompleteRuntimeSliceSpec): CompleteRuntimeSliceSpec {
	return Object.freeze({ ...spec, bounds: freezeBounds(spec.bounds) });
}

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES: readonly CompleteRuntimeSliceSpec[] =
	Object.freeze(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.map((crop) =>
			freezeSliceSpec({
				cropId: crop.id,
				bounds: crop.bounds,
				width: crop.expectedDimensions.width,
				height: crop.expectedDimensions.height,
				filename: crop.baseFilename,
				textureKey: crop.textureKeys.base,
				drawOrder: crop.drawOrder
			})
		).sort((first, second) => first.drawOrder - second.drawOrder)
	);

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function parseObject(bytes: Buffer, label: string): Record<string, unknown> {
	let value: unknown;
	try {
		value = JSON.parse(bytes.toString('utf8')) as unknown;
	} catch (error) {
		throw new Error(`Complete Meadow Entry ${label} is not valid JSON`, { cause: error });
	}
	assert(
		typeof value === 'object' && value !== null && !Array.isArray(value),
		`Complete Meadow Entry ${label} must be a JSON object`
	);
	return value as Record<string, unknown>;
}

function objectProperty(
	value: Record<string, unknown>,
	key: string,
	label: string
): Record<string, unknown> {
	const property = value[key];
	assert(
		typeof property === 'object' && property !== null && !Array.isArray(property),
		`Complete Meadow Entry ${label}.${key} must be an object`
	);
	return property as Record<string, unknown>;
}

function stringProperty(value: Record<string, unknown>, key: string, label: string): string {
	const property = value[key];
	assert(typeof property === 'string', `Complete Meadow Entry ${label}.${key} is required`);
	return property;
}

function integerProperty(value: Record<string, unknown>, key: string, label: string): number {
	const property = value[key];
	assert(Number.isInteger(property), `Complete Meadow Entry ${label}.${key} must be an integer`);
	return property as number;
}

function validateCompleteSliceCatalog(): void {
	assert(
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.length === 4,
		'Complete Meadow Entry runtime export catalog must contain four slices'
	);
	const seenIds = new Set<string>();
	const seenOrders = new Set<number>();
	for (const slice of MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES) {
		assert(
			!seenIds.has(slice.cropId),
			`Duplicate complete Meadow Entry runtime crop ${slice.cropId}`
		);
		seenIds.add(slice.cropId);
		assert(
			!seenOrders.has(slice.drawOrder),
			`Duplicate complete Meadow Entry draw order ${slice.drawOrder}`
		);
		seenOrders.add(slice.drawOrder);
		assert(
			slice.width === 3200 && slice.height === 3200,
			`Complete Meadow Entry runtime crop ${slice.cropId} must be 3200x3200`
		);
		assert(
			slice.bounds.right - slice.bounds.left === slice.width &&
				slice.bounds.bottom - slice.bounds.top === slice.height,
			`Complete Meadow Entry runtime crop ${slice.cropId} dimensions do not match bounds`
		);
	}
}

function intersects(first: PixelBounds, second: PixelBounds): boolean {
	return (
		Math.min(first.right, second.right) > Math.max(first.left, second.left) &&
		Math.min(first.bottom, second.bottom) > Math.max(first.top, second.top)
	);
}

export function sliceCompleteMasterRgba(
	decoded: DecodedMeadowEntryRgba
): readonly CompleteRuntimeSlice[] {
	validateCompleteSliceCatalog();
	assert(
		decoded.width === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH &&
			decoded.height === MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		`Complete Meadow Entry master dimensions must be ${MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH}x${MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT}`
	);
	assert(
		decoded.data.byteLength === decoded.width * decoded.height * 4,
		'Complete Meadow Entry master must contain RGBA bytes'
	);

	for (
		let firstIndex = 0;
		firstIndex < MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.length;
		firstIndex += 1
	) {
		const first = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES[firstIndex]!;
		assert(
			first.bounds.left >= 0 &&
				first.bounds.top >= 0 &&
				first.bounds.right <= decoded.width &&
				first.bounds.bottom <= decoded.height,
			`Complete Meadow Entry runtime crop ${first.cropId} leaves the master bounds`
		);
		for (
			let secondIndex = firstIndex + 1;
			secondIndex < MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.length;
			secondIndex += 1
		) {
			const second = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES[secondIndex]!;
			assert(
				!intersects(first.bounds, second.bounds),
				`Complete Meadow Entry runtime crops overlap: ${first.cropId},${second.cropId}`
			);
		}
	}

	const slices = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.map((spec) => {
		const rgba = Buffer.alloc(spec.width * spec.height * 4);
		for (let localY = 0; localY < spec.height; localY += 1) {
			const sourceOffset = ((spec.bounds.top + localY) * decoded.width + spec.bounds.left) * 4;
			const targetOffset = localY * spec.width * 4;
			decoded.data.copy(rgba, targetOffset, sourceOffset, sourceOffset + spec.width * 4);
		}
		return {
			cropId: spec.cropId,
			bounds: spec.bounds,
			width: spec.width,
			height: spec.height,
			rgba
		};
	});

	const coveredArea = slices.reduce((total, slice) => total + slice.width * slice.height, 0);
	assert(
		coveredArea === decoded.width * decoded.height,
		'Complete Meadow Entry runtime coverage is incomplete'
	);
	return Object.freeze(slices);
}

function validateMasterApproval(
	master: Buffer,
	masterProvenanceBytes: Buffer,
	masterApprovalBytes: Buffer
): { readonly masterSha256: string; readonly masterProvenanceSha256: string } {
	const masterHash = sha256(master);
	const provenance = parseObject(masterProvenanceBytes, 'master provenance');
	assert(
		stringProperty(provenance, 'packageId', 'master provenance') ===
			COMPLETE_MEADOW_ENTRY_PACKAGE_ID,
		'Complete Meadow Entry master provenance package is stale'
	);
	assert(
		stringProperty(provenance, 'controlFingerprint', 'master provenance') ===
			MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		'Complete Meadow Entry master provenance control fingerprint is stale'
	);
	const dimensions = objectProperty(provenance, 'dimensions', 'master provenance');
	assert(
		integerProperty(dimensions, 'width', 'master dimensions') ===
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH &&
			integerProperty(dimensions, 'height', 'master dimensions') ===
				MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT,
		'Complete Meadow Entry master provenance dimensions are stale'
	);
	const masterRecord = objectProperty(provenance, 'master', 'master provenance');
	assert(
		stringProperty(masterRecord, 'sha256', 'master provenance master') === masterHash,
		'Complete Meadow Entry master hash is stale'
	);
	const approval = parseObject(masterApprovalBytes, 'master approval');
	assert(
		stringProperty(approval, 'packageId', 'master approval') === COMPLETE_MEADOW_ENTRY_PACKAGE_ID &&
			stringProperty(approval, 'decision', 'master approval') === 'approved',
		'Complete Meadow Entry master approval is not approved'
	);
	assert(
		stringProperty(approval, 'masterSha256', 'master approval') === masterHash,
		'Complete Meadow Entry master approval hash is stale'
	);
	const runtimeExportPermission = approval.runtimeExportPermission;
	assert(
		runtimeExportPermission === false || runtimeExportPermission === 'false',
		'Complete Meadow Entry master approval runtime permission is malformed'
	);
	return { masterSha256: masterHash, masterProvenanceSha256: sha256(masterProvenanceBytes) };
}

function validateCropManifest(cropManifestBytes: Buffer): string {
	const manifest = parseObject(cropManifestBytes, 'complete crop manifest');
	assert(Array.isArray(manifest.crops), 'Complete Meadow Entry crop manifest is missing crops');
	assert(
		JSON.stringify(manifest.crops) ===
			JSON.stringify(
				MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES.map((slice) => {
					const crop = MEADOW_ENTRY_PAINTED_V2_COMPLETE_CROPS.find(({ id }) => id === slice.cropId);
					return crop;
				})
			),
		'Complete Meadow Entry crop manifest is stale'
	);
	return sha256(cropManifestBytes);
}

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.sort(([first], [second]) => first.localeCompare(second))
			.map(([key, nested]) => [key, stableValue(nested)])
	);
}

function stableJson(value: unknown): Buffer {
	return Buffer.from(`${JSON.stringify(stableValue(value), null, '\t')}\n`);
}

export function parseCompleteExportArguments(args: readonly string[]): { readonly check: boolean } {
	if (args.length === 0) return { check: false };
	if (args.length === 1 && args[0] === '--check') return { check: true };
	throw new Error('Usage: bun tools/export-meadow-entry-painted-v2-complete.ts [--check]');
}

export async function buildCompleteRuntimeExportPackage(
	repositoryRoot = process.cwd(),
	masterPng?: Buffer
): Promise<CompleteRuntimeExportPackage> {
	const root = resolve(repositoryRoot);
	const [masterBytes, masterProvenanceBytes, masterApprovalBytes, cropManifestBytes] =
		await Promise.all([
			masterPng ?? readFile(join(root, COMPLETE_MEADOW_ENTRY_MASTER_PATH)),
			readFile(join(root, COMPLETE_MEADOW_ENTRY_MASTER_PROVENANCE_PATH)),
			readFile(join(root, COMPLETE_MEADOW_ENTRY_MASTER_APPROVAL_PATH)),
			readFile(join(root, COMPLETE_MEADOW_ENTRY_CROP_MANIFEST_PATH))
		]);
	const masterIdentity = validateMasterApproval(
		masterBytes,
		masterProvenanceBytes,
		masterApprovalBytes
	);
	const cropManifestSha256 = validateCropManifest(cropManifestBytes);
	const decoded = await decodeMeadowEntryRgba(masterBytes);
	for (let offset = 3; offset < decoded.data.length; offset += 4) {
		assert(decoded.data[offset] === 255, 'Complete Meadow Entry master must be fully opaque');
	}
	const slices = sliceCompleteMasterRgba(decoded);
	const exports: CompleteRuntimeExportArtifact[] = [];
	for (const [index, slice] of slices.entries()) {
		const spec = MEADOW_ENTRY_PAINTED_V2_COMPLETE_RUNTIME_SLICES[index]!;
		const png = await encodeCanonicalMeadowEntryPng(slice.rgba, slice.width, slice.height);
		validateCanonicalPngChunks(png);
		exports.push({
			cropId: spec.cropId,
			plane: 'base',
			textureKey: spec.textureKey,
			drawOrder: spec.drawOrder,
			path: `${COMPLETE_MEADOW_ENTRY_RUNTIME_ROOT}/${spec.filename}`,
			bounds: spec.bounds,
			width: slice.width,
			height: slice.height,
			bytes: png.byteLength,
			sha256: sha256(png),
			png
		});
	}

	const provenanceJson = stableJson({
		version: 1,
		packageId: COMPLETE_MEADOW_ENTRY_PACKAGE_ID,
		coverage: 'full-map',
		controlFingerprint: MEADOW_ENTRY_COMBINED_CONTROL_FINGERPRINT,
		cropManifestSha256,
		masterProvenanceSha256: masterIdentity.masterProvenanceSha256,
		master: {
			path: COMPLETE_MEADOW_ENTRY_MASTER_PATH,
			sha256: masterIdentity.masterSha256,
			bytes: masterBytes.byteLength,
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		},
		encoding: {
			decode: 'single-rgba',
			operation: 'exact-rectangle-copy',
			canonicalPngChunks: ['IHDR', 'IDAT', 'IEND']
		},
		exports: exports.map(({ png: _png, ...artifact }) => ({
			...artifact,
			sourceRect: artifact.bounds,
			masterPath: COMPLETE_MEADOW_ENTRY_MASTER_PATH
		}))
	});
	return {
		master: {
			path: COMPLETE_MEADOW_ENTRY_MASTER_PATH,
			sha256: masterIdentity.masterSha256,
			bytes: masterBytes.byteLength,
			width: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_WIDTH,
			height: MEADOW_ENTRY_PAINTED_V2_COMPLETE_MASTER_HEIGHT
		},
		cropManifestSha256,
		masterProvenanceSha256: masterIdentity.masterProvenanceSha256,
		exports: Object.freeze(exports),
		provenanceJson
	};
}

function assertCurrentBytes(actual: Buffer | undefined, expected: Buffer, path: string): void {
	assert(actual !== undefined, `Complete Meadow Entry export is missing: ${path}`);
	assert(actual.equals(expected), `Complete Meadow Entry export is stale: ${path}`);
}

export async function runMeadowEntryPaintedV2CompleteExporter(
	args: readonly string[],
	repositoryRoot = process.cwd()
): Promise<CompleteExportRunResult> {
	const { check } = parseCompleteExportArguments(args);
	const root = resolve(repositoryRoot);
	const built = await buildCompleteRuntimeExportPackage(root);
	if (check) {
		for (const artifact of built.exports) {
			assertCurrentBytes(
				await readFile(join(root, artifact.path)).catch(() => undefined),
				artifact.png,
				artifact.path
			);
		}
		assertCurrentBytes(
			await readFile(join(root, COMPLETE_MEADOW_ENTRY_EXPORT_PROVENANCE_PATH)).catch(
				() => undefined
			),
			built.provenanceJson,
			COMPLETE_MEADOW_ENTRY_EXPORT_PROVENANCE_PATH
		);
		process.stdout.write('complete Meadow Entry runtime exports are current\n');
		return { ...built, check };
	}

	await mkdir(join(root, COMPLETE_MEADOW_ENTRY_RUNTIME_ROOT), { recursive: true });
	await mkdir(join(root, 'artifacts/meadow-entry/painted-v2/complete/provenance'), {
		recursive: true
	});
	for (const artifact of built.exports) {
		await writeAtomicMeadowEntryPng(join(root, artifact.path), artifact.png);
	}
	await formatAndWriteJson(
		join(root, COMPLETE_MEADOW_ENTRY_EXPORT_PROVENANCE_PATH),
		built.provenanceJson
	);
	process.stdout.write('wrote complete Meadow Entry runtime exports\n');
	return { ...built, check };
}

async function formatAndWriteJson(path: string, bytes: Buffer): Promise<void> {
	const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporary, bytes, { encoding: 'utf8', flag: 'wx' });
		await rename(temporary, path);
	} finally {
		await rm(temporary, { force: true }).catch(() => undefined);
	}
}

if (import.meta.main) {
	await runMeadowEntryPaintedV2CompleteExporter(process.argv.slice(2));
}
