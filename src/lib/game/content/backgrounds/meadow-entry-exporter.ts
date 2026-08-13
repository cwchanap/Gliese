import { createHash } from 'node:crypto';

import sharp from 'sharp';

import { intersectBounds, unionArea } from './meadow-entry-authoring-geometry';
import type { PixelBounds } from './meadow-entry-authoring-types';
import type { MeadowEntryApprovedCrop, MeadowEntryOverlap } from './meadow-entry-crop-manifest';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks,
	type DecodedMeadowEntryRgba
} from './meadow-entry-png';

export interface MeadowEntryDecodedExport {
	cropId: string;
	plane: 'base' | 'foreground';
	bounds: PixelBounds;
	width: number;
	height: number;
	rgba: Buffer;
}

export interface MeadowEntryExportVerification {
	cropCount: number;
	exportCount: number;
	baseExportCount: number;
	foregroundExportCount: number;
	overlapCount: number;
	cornerGroupCount: number;
	overlapPlanePixelsCompared: number;
	exportAreaRatio: number;
	measuredBaseBytes: number;
	measuredForegroundBytes: number;
	aggregateBaseHardBytes: number;
	aggregateForegroundHardBytes: number;
	reviewTargetExceptions: readonly string[];
}

interface ExportInventoryEntry {
	cropId: string;
	plane: 'base' | 'foreground';
	filename: string;
	textureKey: string;
	drawOrder: number;
	bounds: PixelBounds;
	width: number;
	height: number;
	bytes: number;
	sha256: string;
	reviewBytes: number;
	hardBytes: number;
	reviewTargetExceeded: boolean;
}

const SHA256 = /^[a-f0-9]{64}$/;

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function dimensions(bounds: PixelBounds): { width: number; height: number } {
	return { width: bounds.right - bounds.left, height: bounds.bottom - bounds.top };
}

function boundsEqual(first: PixelBounds, second: PixelBounds): boolean {
	return (
		first.left === second.left &&
		first.top === second.top &&
		first.right === second.right &&
		first.bottom === second.bottom
	);
}

function validateCrop(crop: MeadowEntryApprovedCrop, master: DecodedMeadowEntryRgba): void {
	const expected = dimensions(crop.bounds);
	assert(
		crop.bounds.left >= 0 &&
			crop.bounds.top >= 0 &&
			crop.bounds.right <= master.width &&
			crop.bounds.bottom <= master.height &&
			expected.width > 0 &&
			expected.height > 0,
		`Meadow Entry crop "${crop.id}" leaves the approved master bounds`
	);
	assert(
		crop.expectedDimensions.width === expected.width &&
			crop.expectedDimensions.height === expected.height,
		`Meadow Entry crop "${crop.id}" dimensions do not match bounds`
	);
	const baseStem = crop.baseFilename.replace(/\.png$/, '');
	assert(
		(baseStem === crop.id || baseStem === `${crop.id}-base`) &&
			crop.textureKeys.base === `meadow-entry-${baseStem}`,
		`Meadow Entry crop "${crop.id}" base identity has drifted`
	);
	assert(
		Number.isInteger(crop.drawOrder) && crop.drawOrder >= 0,
		`Meadow Entry crop "${crop.id}" draw order must be a non-negative integer`
	);
	const foreground = crop.alphaPolicy.foreground === 'sparse-eligible-mask';
	assert(
		crop.alphaPolicy.base === 'opaque',
		`Meadow Entry crop "${crop.id}" base plane policy drifted`
	);
	const foregroundStem = crop.foregroundFilename?.replace(/\.png$/, '');
	assert(
		foreground
			? (foregroundStem === crop.id || foregroundStem === `${crop.id}-foreground`) &&
					crop.textureKeys.foreground === `meadow-entry-${foregroundStem}` &&
					crop.sizeBudgets.foregroundReviewBytes !== null &&
					crop.sizeBudgets.foregroundHardBytes !== null
			: crop.foregroundFilename === null &&
					crop.textureKeys.foreground === null &&
					crop.sizeBudgets.foregroundReviewBytes === null &&
					crop.sizeBudgets.foregroundHardBytes === null,
		`Meadow Entry crop "${crop.id}" foreground identity has drifted`
	);
	assert(
		crop.sizeBudgets.baseReviewBytes > 0 &&
			crop.sizeBudgets.baseHardBytes >= crop.sizeBudgets.baseReviewBytes &&
			(!foreground ||
				(crop.sizeBudgets.foregroundReviewBytes! > 0 &&
					crop.sizeBudgets.foregroundHardBytes! >= crop.sizeBudgets.foregroundReviewBytes!)),
		`Meadow Entry crop "${crop.id}" has invalid size budgets`
	);
}

function validateContract(
	crops: readonly MeadowEntryApprovedCrop[],
	overlaps: readonly MeadowEntryOverlap[],
	master: DecodedMeadowEntryRgba
): void {
	const ids = new Set<string>();
	const filenames = new Set<string>();
	const drawOrders = new Set<number>();
	for (const crop of crops) {
		assert(!ids.has(crop.id), `Duplicate Meadow Entry crop "${crop.id}"`);
		ids.add(crop.id);
		validateCrop(crop, master);
		assert(
			!drawOrders.has(crop.drawOrder),
			`Duplicate Meadow Entry crop draw order ${crop.drawOrder}`
		);
		drawOrders.add(crop.drawOrder);
		for (const filename of [crop.baseFilename, crop.foregroundFilename].filter(
			(value): value is string => value !== null
		)) {
			assert(!filenames.has(filename), `Duplicate Meadow Entry export filename "${filename}"`);
			filenames.add(filename);
		}
	}
	const byId = new Map(crops.map((crop) => [crop.id, crop]));
	for (const overlap of overlaps) {
		const first = byId.get(overlap.firstCropId);
		const second = byId.get(overlap.secondCropId);
		assert(first && second, `Meadow Entry overlap "${overlap.id}" names an unknown crop`);
		const actual = intersectBounds(first.bounds, second.bounds);
		assert(
			actual !== null && boundsEqual(actual, overlap.bounds),
			`Meadow Entry overlap "${overlap.id}" bounds do not match its crops`
		);
		const bothForeground =
			first.alphaPolicy.foreground !== null && second.alphaPolicy.foreground !== null;
		assert(
			overlap.planePolicy === (bothForeground ? 'base-and-foreground' : 'base-only'),
			`Meadow Entry overlap "${overlap.id}" plane policy has drifted`
		);
	}
}

function pixelOffset(decoded: MeadowEntryDecodedExport, masterX: number, masterY: number): number {
	return ((masterY - decoded.bounds.top) * decoded.width + (masterX - decoded.bounds.left)) * 4;
}

function decodedFor(
	decoded: readonly MeadowEntryDecodedExport[],
	cropId: string,
	plane: 'base' | 'foreground'
): MeadowEntryDecodedExport {
	const value = decoded.find((entry) => entry.cropId === cropId && entry.plane === plane);
	assert(value, `Missing Meadow Entry decoded export crop=${cropId} plane=${plane}`);
	return value;
}

function cornerParticipants(overlaps: readonly MeadowEntryOverlap[], groupId: string): string[] {
	return [
		...new Set(
			overlaps
				.filter((overlap) => overlap.cornerGroupId === groupId)
				.flatMap((overlap) => [overlap.firstCropId, overlap.secondCropId])
		)
	].sort();
}

export function verifyMeadowEntryOverlapPixels(input: {
	decoded: readonly MeadowEntryDecodedExport[];
	overlaps: readonly MeadowEntryOverlap[];
}): void {
	for (const overlap of input.overlaps) {
		const planes: readonly ('base' | 'foreground')[] =
			overlap.planePolicy === 'base-and-foreground' ? ['base', 'foreground'] : ['base'];
		for (const plane of planes) {
			const first = decodedFor(input.decoded, overlap.firstCropId, plane);
			const second = decodedFor(input.decoded, overlap.secondCropId, plane);
			for (let masterY = overlap.bounds.top; masterY < overlap.bounds.bottom; masterY += 1) {
				for (let masterX = overlap.bounds.left; masterX < overlap.bounds.right; masterX += 1) {
					const firstOffset = pixelOffset(first, masterX, masterY);
					const secondOffset = pixelOffset(second, masterX, masterY);
					for (let channel = 0; channel < 4; channel += 1) {
						if (first.rgba[firstOffset + channel] === second.rgba[secondOffset + channel]) {
							continue;
						}
						const corner = overlap.cornerGroupId
							? ` cornerGroup=${overlap.cornerGroupId} participants=${cornerParticipants(input.overlaps, overlap.cornerGroupId).join(',')}`
							: '';
						throw new Error(
							`Meadow Entry overlap mismatch crops=${overlap.firstCropId},${overlap.secondCropId} plane=${plane}${corner} master=${masterX},${masterY} first-local=${masterX - first.bounds.left},${masterY - first.bounds.top} second-local=${masterX - second.bounds.left},${masterY - second.bounds.top} channel=${channel} values=${first.rgba[firstOffset + channel]},${second.rgba[secondOffset + channel]}`
						);
					}
				}
			}
		}
	}
}

async function extractPlane(
	masterPng: Buffer,
	master: DecodedMeadowEntryRgba,
	crop: MeadowEntryApprovedCrop,
	plane: 'base' | 'foreground'
): Promise<{ png: Buffer; decoded: MeadowEntryDecodedExport }> {
	const expected = dimensions(crop.bounds);
	const { data, info } = await sharp(masterPng)
		.extract({
			left: crop.bounds.left,
			top: crop.bounds.top,
			width: expected.width,
			height: expected.height
		})
		.toColourspace('srgb')
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	assert(
		info.width === expected.width && info.height === expected.height && info.channels === 4,
		`Meadow Entry crop "${crop.id}" ${plane} decoded dimensions or channels drifted`
	);
	if (plane === 'base') {
		for (let offset = 3; offset < data.length; offset += 4) {
			if (data[offset] !== 255) {
				throw new Error(
					`Meadow Entry crop "${crop.id}" base is not opaque at master=${crop.bounds.left + (((offset - 3) / 4) % expected.width)},${crop.bounds.top + Math.floor((offset - 3) / 4 / expected.width)}`
				);
			}
		}
	}
	if (plane === 'foreground') {
		for (let offset = 0; offset < data.length; offset += 4) {
			if (
				data[offset + 3] === 0 &&
				(data[offset] !== 0 || data[offset + 1] !== 0 || data[offset + 2] !== 0)
			) {
				throw new Error(
					`Meadow Entry crop "${crop.id}" foreground has hidden RGB at local=${(offset / 4) % expected.width},${Math.floor(offset / 4 / expected.width)}`
				);
			}
		}
	}
	const png = await encodeCanonicalMeadowEntryPng(data, expected.width, expected.height);
	validateCanonicalPngChunks(png);
	const roundTrip = await decodeMeadowEntryRgba(png);
	for (let localY = 0; localY < expected.height; localY += 1) {
		for (let localX = 0; localX < expected.width; localX += 1) {
			const exportOffset = (localY * expected.width + localX) * 4;
			const masterX = crop.bounds.left + localX;
			const masterY = crop.bounds.top + localY;
			const masterOffset = (masterY * master.width + masterX) * 4;
			for (let channel = 0; channel < 4; channel += 1) {
				if (roundTrip.data[exportOffset + channel] !== master.data[masterOffset + channel]) {
					throw new Error(
						`Meadow Entry master/export mismatch crop=${crop.id} plane=${plane} master=${masterX},${masterY} local=${localX},${localY} channel=${channel}`
					);
				}
			}
		}
	}
	return {
		png,
		decoded: {
			cropId: crop.id,
			plane,
			bounds: { ...crop.bounds },
			width: expected.width,
			height: expected.height,
			rgba: roundTrip.data
		}
	};
}

export async function exportMeadowEntryRegions(input: {
	baseMasterPng: Buffer;
	foregroundMasterPng?: Buffer;
	controlFingerprint: string;
	approvedControlFingerprint: string;
	crops: readonly MeadowEntryApprovedCrop[];
	overlaps: readonly MeadowEntryOverlap[];
}): Promise<{
	files: Readonly<Record<string, Buffer>>;
	decoded: readonly MeadowEntryDecodedExport[];
	provenanceJson: Buffer;
	verification: MeadowEntryExportVerification;
}> {
	assert(SHA256.test(input.controlFingerprint), 'Meadow Entry control fingerprint is invalid');
	assert(
		SHA256.test(input.approvedControlFingerprint),
		'Meadow Entry approved control fingerprint is invalid'
	);
	assert(
		input.controlFingerprint === input.approvedControlFingerprint,
		'Meadow Entry control fingerprint is stale'
	);
	const baseMaster = await decodeMeadowEntryRgba(input.baseMasterPng);
	const hasForeground = input.crops.some((crop) => crop.alphaPolicy.foreground !== null);
	assert(
		!hasForeground || input.foregroundMasterPng !== undefined,
		'Meadow Entry foreground master is required when a crop declares a foreground plane'
	);
	const foregroundMaster = input.foregroundMasterPng
		? await decodeMeadowEntryRgba(input.foregroundMasterPng)
		: undefined;
	if (foregroundMaster !== undefined) {
		assert(
			baseMaster.width === foregroundMaster.width && baseMaster.height === foregroundMaster.height,
			'Meadow Entry master plane dimensions differ'
		);
	}
	validateContract(input.crops, input.overlaps, baseMaster);

	const files: Record<string, Buffer> = {};
	const decoded: MeadowEntryDecodedExport[] = [];
	const inventory: ExportInventoryEntry[] = [];
	const orderedCrops = [...input.crops].sort(
		(first, second) => first.drawOrder - second.drawOrder || first.id.localeCompare(second.id)
	);
	for (const crop of orderedCrops) {
		const planes: readonly ('base' | 'foreground')[] =
			crop.alphaPolicy.foreground === null ? ['base'] : ['base', 'foreground'];
		for (const plane of planes) {
			const filename = plane === 'base' ? crop.baseFilename : crop.foregroundFilename!;
			const textureKey = plane === 'base' ? crop.textureKeys.base : crop.textureKeys.foreground!;
			const reviewBytes =
				plane === 'base'
					? crop.sizeBudgets.baseReviewBytes
					: crop.sizeBudgets.foregroundReviewBytes!;
			const hardBytes =
				plane === 'base' ? crop.sizeBudgets.baseHardBytes : crop.sizeBudgets.foregroundHardBytes!;
			const result = await extractPlane(
				plane === 'base' ? input.baseMasterPng : input.foregroundMasterPng!,
				plane === 'base' ? baseMaster : foregroundMaster!,
				crop,
				plane
			);
			files[filename] = result.png;
			decoded.push(result.decoded);
			inventory.push({
				cropId: crop.id,
				plane,
				filename,
				textureKey,
				drawOrder: crop.drawOrder,
				bounds: { ...crop.bounds },
				width: result.decoded.width,
				height: result.decoded.height,
				bytes: result.png.byteLength,
				sha256: sha256(result.png),
				reviewBytes,
				hardBytes,
				reviewTargetExceeded: result.png.byteLength > reviewBytes
			});
		}
	}

	const masterArea = baseMaster.width * baseMaster.height;
	const cropArea = input.crops.reduce(
		(sum, crop) => sum + crop.expectedDimensions.width * crop.expectedDimensions.height,
		0
	);
	const budgets = {
		exportAreaRatio: cropArea / masterArea,
		overlapArea: cropArea - unionArea(input.crops.map((crop) => crop.bounds)),
		aggregateBaseReviewBytes: input.crops.reduce(
			(sum, crop) => sum + crop.sizeBudgets.baseReviewBytes,
			0
		),
		aggregateBaseHardBytes: input.crops.reduce(
			(sum, crop) => sum + crop.sizeBudgets.baseHardBytes,
			0
		),
		aggregateForegroundReviewBytes: input.crops.reduce(
			(sum, crop) => sum + (crop.sizeBudgets.foregroundReviewBytes ?? 0),
			0
		),
		aggregateForegroundHardBytes: input.crops.reduce(
			(sum, crop) => sum + (crop.sizeBudgets.foregroundHardBytes ?? 0),
			0
		),
		measuredBaseBytes: inventory
			.filter((entry) => entry.plane === 'base')
			.reduce((sum, entry) => sum + entry.bytes, 0),
		measuredForegroundBytes: inventory
			.filter((entry) => entry.plane === 'foreground')
			.reduce((sum, entry) => sum + entry.bytes, 0),
		aggregatePackageReviewBytes: input.crops.reduce(
			(sum, crop) =>
				sum + crop.sizeBudgets.baseReviewBytes + (crop.sizeBudgets.foregroundReviewBytes ?? 0),
			0
		),
		aggregatePackageHardBytes: input.crops.reduce(
			(sum, crop) =>
				sum + crop.sizeBudgets.baseHardBytes + (crop.sizeBudgets.foregroundHardBytes ?? 0),
			0
		)
	};
	const overHardBudget = inventory.find((entry) => entry.bytes > entry.hardBytes);
	assert(
		!overHardBudget &&
			budgets.measuredBaseBytes <= budgets.aggregateBaseHardBytes &&
			budgets.measuredForegroundBytes <= budgets.aggregateForegroundHardBytes,
		`Meadow Entry export budget failure crop=${overHardBudget?.cropId ?? '<aggregate>'} plane=${overHardBudget?.plane ?? '<package>'} bytes=${overHardBudget?.bytes ?? budgets.measuredBaseBytes + budgets.measuredForegroundBytes} hard=${overHardBudget?.hardBytes ?? budgets.aggregateBaseHardBytes + budgets.aggregateForegroundHardBytes}; aggregate base=${budgets.measuredBaseBytes}/${budgets.aggregateBaseHardBytes} foreground=${budgets.measuredForegroundBytes}/${budgets.aggregateForegroundHardBytes} exportAreaRatio=${budgets.exportAreaRatio}`
	);

	verifyMeadowEntryOverlapPixels({ decoded, overlaps: input.overlaps });
	const overlapPlanePixelsCompared = input.overlaps.reduce(
		(sum, overlap) =>
			sum +
			(overlap.bounds.right - overlap.bounds.left) *
				(overlap.bounds.bottom - overlap.bounds.top) *
				(overlap.planePolicy === 'base-and-foreground' ? 2 : 1),
		0
	);
	const cornerGroups = [...new Set(input.overlaps.flatMap((item) => item.cornerGroupId ?? []))]
		.sort()
		.map((id) => ({ id, cropIds: cornerParticipants(input.overlaps, id), result: 'identical' }));
	const provenance = {
		version: 1,
		controls: { fingerprint: input.controlFingerprint },
		masters: {
			base: {
				sha256: sha256(input.baseMasterPng),
				width: baseMaster.width,
				height: baseMaster.height
			},
			foreground:
				input.foregroundMasterPng === undefined || foregroundMaster === undefined
					? null
					: {
							sha256: sha256(input.foregroundMasterPng),
							width: foregroundMaster.width,
							height: foregroundMaster.height
						}
		},
		policy: {
			extraction: 'direct-half-open-sharp-extract',
			pixelTransform: 'none',
			foregroundTransparentRgb: 'zero',
			pngEncoding: 'canonical'
		},
		budgets,
		inventory,
		overlaps: input.overlaps.map((item) => ({
			id: item.id,
			firstCropId: item.firstCropId,
			secondCropId: item.secondCropId,
			bounds: item.bounds,
			planePolicy: item.planePolicy,
			result: 'identical'
		})),
		cornerGroups
	};
	return {
		files: Object.freeze(files),
		decoded: Object.freeze(decoded),
		provenanceJson: Buffer.from(`${JSON.stringify(provenance, null, 2)}\n`),
		verification: {
			cropCount: input.crops.length,
			exportCount: inventory.length,
			baseExportCount: inventory.filter((entry) => entry.plane === 'base').length,
			foregroundExportCount: inventory.filter((entry) => entry.plane === 'foreground').length,
			overlapCount: input.overlaps.length,
			cornerGroupCount: new Set(input.overlaps.flatMap((overlap) => overlap.cornerGroupId ?? []))
				.size,
			overlapPlanePixelsCompared,
			exportAreaRatio: cropArea / masterArea,
			measuredBaseBytes: budgets.measuredBaseBytes,
			measuredForegroundBytes: budgets.measuredForegroundBytes,
			aggregateBaseHardBytes: budgets.aggregateBaseHardBytes,
			aggregateForegroundHardBytes: budgets.aggregateForegroundHardBytes,
			reviewTargetExceptions: inventory
				.filter((entry) => entry.reviewTargetExceeded)
				.map((entry) => `${entry.cropId}:${entry.plane}`)
		}
	};
}
