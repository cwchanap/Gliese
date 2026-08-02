import { mkdtemp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import type { MeadowEntryApprovedCrop, MeadowEntryOverlap } from './meadow-entry-crop-manifest';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import {
	exportMeadowEntryRegions,
	verifyMeadowEntryOverlapPixels,
	type MeadowEntryDecodedExport
} from './meadow-entry-exporter';
import {
	publishMeadowEntryExportPackage,
	readPublishedMeadowEntryExportSnapshot,
	type MeadowEntryExportPublicationFileSystem
} from '../../../../../tools/export-meadow-entry-regions';

const FINGERPRINT = 'a'.repeat(64);

function crop(
	id: string,
	left: number,
	right: number,
	options: {
		foreground?: boolean;
		drawOrder?: number;
		baseReviewBytes?: number;
		baseHardBytes?: number;
		foregroundHardBytes?: number;
	} = {}
): MeadowEntryApprovedCrop {
	const foreground = options.foreground ?? false;
	const bounds = { left, top: 0, right, bottom: 1 };
	return {
		id,
		derivation: { mode: 'exact-bounds' },
		reviewBounds: bounds,
		coverageAttachments: [],
		preClampBounds: bounds,
		edgeClamp: null,
		bounds,
		expectedDimensions: { width: right - left, height: 1 },
		baseFilename: `${id}-base.png`,
		foregroundFilename: foreground ? `${id}-foreground.png` : null,
		textureKeys: {
			base: `meadow-entry-${id}-base`,
			foreground: foreground ? `meadow-entry-${id}-foreground` : null
		},
		drawOrder: options.drawOrder ?? left,
		sourceRegionIds: [],
		neighborIds: [],
		overlapIds: [],
		alphaPolicy: { base: 'opaque', foreground: foreground ? 'sparse-eligible-mask' : null },
		sizeBudgets: {
			baseReviewBytes: options.baseReviewBytes ?? 1_024,
			baseHardBytes: options.baseHardBytes ?? 2_048,
			foregroundReviewBytes: foreground ? 1_024 : null,
			foregroundHardBytes: foreground ? (options.foregroundHardBytes ?? 2_048) : null
		}
	};
}

function overlap(
	firstCropId: string,
	secondCropId: string,
	bounds: { left: number; top: number; right: number; bottom: number },
	options: { planePolicy?: 'base-only' | 'base-and-foreground'; cornerGroupId?: string } = {}
): MeadowEntryOverlap {
	return {
		id: `overlap-${firstCropId}--${secondCropId}`,
		firstCropId,
		secondCropId,
		bounds,
		routeMouth: { sharedAxis: 'x', bounds },
		minimumSharedPixels: 128,
		planePolicy: options.planePolicy ?? 'base-only',
		ownerCropId: secondCropId,
		...(options.cornerGroupId ? { cornerGroupId: options.cornerGroupId } : {})
	};
}

async function masters(baseRaw: Buffer, foregroundRaw = Buffer.alloc(baseRaw.length)) {
	const width = baseRaw.length / 4;
	return {
		baseMasterPng: await encodeCanonicalMeadowEntryPng(baseRaw, width, 1),
		foregroundMasterPng: await encodeCanonicalMeadowEntryPng(foregroundRaw, width, 1)
	};
}

function decoded(
	cropId: string,
	plane: 'base' | 'foreground',
	bounds: { left: number; top: number; right: number; bottom: number },
	rgba: number[]
): MeadowEntryDecodedExport {
	return {
		cropId,
		plane,
		bounds,
		width: bounds.right - bounds.left,
		height: bounds.bottom - bounds.top,
		rgba: Buffer.from(rgba)
	};
}

describe('meadow-entry regional exporter', () => {
	it('extracts exact half-open base pixels and omits foreground for a base-only crop', async () => {
		const input = await masters(Buffer.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]));
		const result = await exportMeadowEntryRegions({
			...input,
			controlFingerprint: FINGERPRINT,
			approvedControlFingerprint: FINGERPRINT,
			crops: [crop('fixture', 1, 3)],
			overlaps: []
		});

		expect(Object.keys(result.files)).toEqual(['fixture-base.png']);
		expect((await decodeMeadowEntryRgba(result.files['fixture-base.png']!)).data).toEqual(
			Buffer.from([0, 255, 0, 255, 0, 0, 255, 255])
		);
		expect(result.decoded).toMatchObject([
			{ cropId: 'fixture', plane: 'base', width: 2, height: 1 }
		]);
	});

	it('emits a canonical all-transparent foreground with zero RGB when policy requires it', async () => {
		const input = await masters(Buffer.from([12, 34, 56, 255, 78, 90, 12, 255]));
		const result = await exportMeadowEntryRegions({
			...input,
			controlFingerprint: FINGERPRINT,
			approvedControlFingerprint: FINGERPRINT,
			crops: [crop('with-foreground', 0, 2, { foreground: true })],
			overlaps: []
		});

		expect(Object.keys(result.files)).toEqual([
			'with-foreground-base.png',
			'with-foreground-foreground.png'
		]);
		expect(
			(await decodeMeadowEntryRgba(result.files['with-foreground-foreground.png']!)).data
		).toEqual(Buffer.alloc(8));
	});

	it('rejects stale controls before extracting exports', async () => {
		const input = await masters(Buffer.from([1, 2, 3, 255]));
		await expect(
			exportMeadowEntryRegions({
				...input,
				controlFingerprint: FINGERPRINT,
				approvedControlFingerprint: 'b'.repeat(64),
				crops: [crop('fixture', 0, 1)],
				overlaps: []
			})
		).rejects.toThrow(/control fingerprint is stale/i);
	});

	it('rejects non-opaque base pixels', async () => {
		const input = await masters(Buffer.from([1, 2, 3, 254]));
		await expect(
			exportMeadowEntryRegions({
				...input,
				controlFingerprint: FINGERPRINT,
				approvedControlFingerprint: FINGERPRINT,
				crops: [crop('fixture', 0, 1)],
				overlaps: []
			})
		).rejects.toThrow(/base.*opaque.*master=0,0/i);
	});

	it('enforces filenames, texture keys, dimensions, draw order, and plane policy', async () => {
		const input = await masters(Buffer.from([1, 2, 3, 255, 4, 5, 6, 255]));
		const valid = crop('fixture', 0, 1, { foreground: true });
		for (const [label, changed] of [
			['base identity', { ...valid, baseFilename: 'wrong.png' }],
			['base identity', { ...valid, textureKeys: { ...valid.textureKeys, base: 'wrong' } }],
			['dimensions', { ...valid, expectedDimensions: { width: 2, height: 1 } }],
			['draw order', { ...valid, drawOrder: -1 }],
			['foreground identity', { ...valid, foregroundFilename: null }]
		] as const) {
			await expect(
				exportMeadowEntryRegions({
					...input,
					controlFingerprint: FINGERPRINT,
					approvedControlFingerprint: FINGERPRINT,
					crops: [changed],
					overlaps: []
				})
			).rejects.toThrow(new RegExp(label, 'i'));
		}

		await expect(
			exportMeadowEntryRegions({
				...input,
				controlFingerprint: FINGERPRINT,
				approvedControlFingerprint: FINGERPRINT,
				crops: [
					crop('base-only', 0, 1),
					crop('foreground', 0, 2, { foreground: true, drawOrder: 1 })
				],
				overlaps: [
					overlap(
						'base-only',
						'foreground',
						{ left: 0, top: 0, right: 1, bottom: 1 },
						{
							planePolicy: 'base-and-foreground'
						}
					)
				]
			})
		).rejects.toThrow(/plane policy/i);

		await expect(
			exportMeadowEntryRegions({
				...input,
				controlFingerprint: FINGERPRINT,
				approvedControlFingerprint: FINGERPRINT,
				crops: [crop('first', 0, 1), crop('second', 1, 2, { drawOrder: 0 })],
				overlaps: []
			})
		).rejects.toThrow(/duplicate.*draw order/i);
	});

	it('reports per-crop and aggregate hard-budget calculations', async () => {
		const raw = Buffer.alloc(256 * 4);
		for (let index = 0; index < 256; index += 1) {
			raw[index * 4] = index;
			raw[index * 4 + 1] = (index * 17) % 256;
			raw[index * 4 + 2] = (index * 43) % 256;
			raw[index * 4 + 3] = 255;
		}
		const input = await masters(raw);
		await expect(
			exportMeadowEntryRegions({
				...input,
				controlFingerprint: FINGERPRINT,
				approvedControlFingerprint: FINGERPRINT,
				crops: [crop('tiny-budget', 0, 256, { baseReviewBytes: 50, baseHardBytes: 100 })],
				overlaps: []
			})
		).rejects.toThrow(/tiny-budget.*base.*aggregate.*exportAreaRatio/is);
	});

	it('regenerates identical files and provenance bytes', async () => {
		const input = {
			...(await masters(Buffer.from([1, 2, 3, 255, 4, 5, 6, 255]))),
			controlFingerprint: FINGERPRINT,
			approvedControlFingerprint: FINGERPRINT,
			crops: [crop('fixture', 0, 2, { foreground: true })],
			overlaps: []
		};
		const first = await exportMeadowEntryRegions(input);
		const second = await exportMeadowEntryRegions(input);
		expect(second.files).toEqual(first.files);
		expect(second.provenanceJson).toEqual(first.provenanceJson);
		expect(JSON.parse(first.provenanceJson.toString('utf8')).budgets).toMatchObject({
			overlapArea: 0,
			aggregatePackageReviewBytes: 2_048,
			aggregatePackageHardBytes: 4_096
		});
	});

	it('reports both crops plus master and local coordinates for the first mismatch', () => {
		const bounds = { left: 1, top: 0, right: 2, bottom: 1 };
		expect(() =>
			verifyMeadowEntryOverlapPixels({
				decoded: [
					decoded(
						'first',
						'base',
						{ left: 0, top: 0, right: 2, bottom: 1 },
						[0, 0, 0, 255, 10, 20, 30, 255]
					),
					decoded('second', 'base', bounds, [10, 20, 31, 255])
				],
				overlaps: [overlap('first', 'second', bounds)]
			})
		).toThrow(/first.*second.*plane=base.*master=1,0.*first-local=1,0.*second-local=0,0/i);
	});

	it('validates every pixel in a two-dimensional corner group and names all participants', () => {
		const cornerBounds = { left: 1, top: 1, right: 2, bottom: 2 };
		const full = { left: 0, top: 0, right: 2, bottom: 2 };
		const pixels = [1, 1, 1, 255, 2, 2, 2, 255, 3, 3, 3, 255, 4, 4, 4, 255];
		const changed = [...pixels];
		changed[14] = 9;
		expect(() =>
			verifyMeadowEntryOverlapPixels({
				decoded: [
					decoded('alpha', 'base', full, pixels),
					decoded('beta', 'base', full, pixels),
					decoded('gamma', 'base', full, changed)
				],
				overlaps: [
					overlap('alpha', 'beta', cornerBounds, { cornerGroupId: 'corner-network' }),
					overlap('alpha', 'gamma', cornerBounds, { cornerGroupId: 'corner-network' }),
					overlap('beta', 'gamma', cornerBounds, { cornerGroupId: 'corner-network' })
				]
			})
		).toThrow(/corner-network.*alpha.*beta.*gamma.*master=1,1/i);
	});
});

describe('meadow-entry export publication', () => {
	it('atomically replaces the fixed inventory, removes stale files, and exposes one complete snapshot', async () => {
		const root = await mkdtemp(join(tmpdir(), 'gliese-export-test-'));
		await mkdir(join(root, 'exports'), { recursive: true });
		await writeFile(join(root, 'exports/stale.png'), 'stale');
		const packageBytes = {
			files: { 'fixture-base.png': Buffer.from('png') },
			provenanceJson: Buffer.from('{"version":1}\n'),
			cropManifestJson: Buffer.from('{"version":1}\n')
		};

		await publishMeadowEntryExportPackage(root, packageBytes);
		expect(await readdir(join(root, 'exports'))).toEqual(['fixture-base.png']);
		expect(await readPublishedMeadowEntryExportSnapshot(root)).toEqual(packageBytes);
		expect(await readFile(join(root, 'exports/fixture-base.png'))).toEqual(Buffer.from('png'));
	});

	it('restores the previous complete snapshot when installation is interrupted', async () => {
		const root = await mkdtemp(join(tmpdir(), 'gliese-export-failure-test-'));
		const oldPackage = {
			files: { 'old-base.png': Buffer.from('old-png') },
			provenanceJson: Buffer.from('{"generation":"old"}\n'),
			cropManifestJson: Buffer.from('{"crops":"old"}\n')
		};
		await publishMeadowEntryExportPackage(root, oldPackage);
		let injected = false;
		const fileSystem: MeadowEntryExportPublicationFileSystem = {
			mkdir,
			writeFile,
			rm,
			rename: async (source, destination) => {
				if (!injected && String(destination).endsWith('meadow-entry-export-provenance.json')) {
					injected = true;
					throw new Error('injected publication interruption');
				}
				return rename(source, destination);
			}
		};

		await expect(
			publishMeadowEntryExportPackage(
				root,
				{
					files: { 'new-base.png': Buffer.from('new-png') },
					provenanceJson: Buffer.from('{"generation":"new"}\n'),
					cropManifestJson: Buffer.from('{"crops":"new"}\n')
				},
				fileSystem
			)
		).rejects.toThrow(/injected publication interruption/i);
		expect(await readPublishedMeadowEntryExportSnapshot(root)).toEqual(oldPackage);
	});
});
