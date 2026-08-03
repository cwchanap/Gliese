import { createHash } from 'node:crypto';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import type {
	MeadowEntryGenerationProvenance,
	MeadowEntryNormalizationTransform,
	MeadowEntryRefinementProvenance
} from './meadow-entry-master-provenance';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import {
	finalizeMeadowEntryBase,
	finalizeMeadowEntryForeground,
	finalizeMeadowEntryMasters,
	type MeadowEntryFinalizerContext,
	type MeadowEntryMasterPolicy
} from './meadow-entry-master-finalizer';

const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');

const testPolicy: MeadowEntryMasterPolicy = {
	width: 2,
	height: 2,
	baseReviewBytes: 1_000,
	baseHardBytes: 2_000,
	foregroundReviewBytes: 1_000,
	foregroundHardBytes: 2_000
};

const manualFixture: MeadowEntryGenerationProvenance = {
	mode: 'manual',
	provider: null,
	model: null,
	modelVersion: null,
	tool: 'test-paint',
	toolVersion: '1',
	settings: {},
	seed: null,
	seedUnavailable: false,
	prompt: null,
	promptSha256: null,
	referenceImageSha256: [],
	byteReproducibleGeneration: false
};

function identityTransform(width: number, height: number): MeadowEntryNormalizationTransform {
	return {
		native: { width, height },
		crop: { left: 0, top: 0, width, height },
		output: { width, height },
		scale: 1
	};
}

function rgbaPng(raw: number[]): Promise<Buffer> {
	return sharp(Buffer.from(raw), { raw: { width: 2, height: 2, channels: 4 } })
		.png()
		.toBuffer();
}

async function context(): Promise<MeadowEntryFinalizerContext> {
	const basePng = await rgbaPng([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255]);
	const foregroundPng = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
	return {
		policy: testPolicy,
		controlFingerprint: 'a'.repeat(64),
		approvedControlFingerprint: 'a'.repeat(64),
		storageConfigurationSha256: 'b'.repeat(64),
		approvedStorageConfigurationSha256: 'b'.repeat(64),
		predecessor: {
			basePng,
			foregroundPng,
			approvedBaseSha256: sha256(basePng),
			approvedForegroundSha256: sha256(foregroundPng)
		}
	};
}

function alphaBytes(decoded: Awaited<ReturnType<typeof decodeMeadowEntryRgba>>): number[] {
	return Array.from(
		{ length: decoded.width * decoded.height },
		(_, index) => decoded.data[index * 4 + 3]!
	);
}

function pixel(
	decoded: Awaited<ReturnType<typeof decodeMeadowEntryRgba>>,
	index: number
): number[] {
	return Array.from(decoded.data.subarray(index * 4, index * 4 + 4));
}

describe('Meadow Entry master finalizers', () => {
	it('normalizes base opacity and foreground eligibility deterministically', async () => {
		const shared = await context();
		const rgbaPngWithNonOpaqueAlpha = await rgbaPng([
			10, 20, 30, 0, 40, 50, 60, 127, 70, 80, 90, 254, 100, 110, 120, 1
		]);
		const fullyPaintedForeground = await rgbaPng([
			200, 1, 2, 255, 3, 4, 5, 255, 99, 98, 97, 0, 9, 10, 11, 255
		]);
		const eligiblePixelsZeroAndThree = await rgbaPng([
			0, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 255, 0, 0, 0, 255
		]);
		const protectedPixelThree = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255]);

		const base = await finalizeMeadowEntryBase({
			...shared,
			candidatePng: rgbaPngWithNonOpaqueAlpha,
			transform: identityTransform(2, 2),
			generation: manualFixture,
			refinements: []
		});
		expect(alphaBytes(await decodeMeadowEntryRgba(base.png))).toEqual([255, 255, 255, 255]);

		const foreground = await finalizeMeadowEntryForeground({
			...shared,
			candidatePng: fullyPaintedForeground,
			transform: identityTransform(2, 2),
			eligibleMaskPng: eligiblePixelsZeroAndThree,
			protectedMaskPng: protectedPixelThree,
			generation: manualFixture,
			refinements: []
		});
		const foregroundPixels = await decodeMeadowEntryRgba(foreground.png);
		expect(pixel(foregroundPixels, 0)).toEqual([200, 1, 2, 255]);
		expect(pixel(foregroundPixels, 1)).toEqual([0, 0, 0, 0]);
		expect(pixel(foregroundPixels, 2)).toEqual([0, 0, 0, 0]);
		expect(pixel(foregroundPixels, 3)).toEqual([0, 0, 0, 0]);
	});

	it('rejects a normalization transform with non-uniform scale', async () => {
		const shared = await context();
		await expect(
			finalizeMeadowEntryBase({
				...shared,
				candidatePng: await rgbaPng(new Array(16).fill(255)),
				transform: {
					...identityTransform(2, 2),
					crop: { left: 0, top: 0, width: 1, height: 2 },
					scale: 2
				},
				generation: manualFixture,
				refinements: []
			})
		).rejects.toThrow(/uniform|scale/i);
	});

	it('rejects stale controls, storage configuration, and predecessor bytes', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng(new Array(16).fill(255));
		const baseInput = {
			...shared,
			candidatePng,
			transform: identityTransform(2, 2),
			generation: manualFixture,
			refinements: []
		};
		await expect(
			finalizeMeadowEntryBase({ ...baseInput, controlFingerprint: 'c'.repeat(64) })
		).rejects.toThrow(/control/i);
		await expect(
			finalizeMeadowEntryBase({ ...baseInput, storageConfigurationSha256: 'c'.repeat(64) })
		).rejects.toThrow(/storage/i);
		await expect(
			finalizeMeadowEntryBase({
				...baseInput,
				predecessor: { ...shared.predecessor, approvedBaseSha256: 'd'.repeat(64) }
			})
		).rejects.toThrow(/predecessor.*base/i);
	});

	it('rejects hard-budget excess and masks that do not match the output dimensions', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng(new Array(16).fill(255));
		await expect(
			finalizeMeadowEntryBase({
				...shared,
				policy: { ...testPolicy, baseHardBytes: 1 },
				candidatePng,
				transform: identityTransform(2, 2),
				generation: manualFixture,
				refinements: []
			})
		).rejects.toThrow(/hard.*budget/i);

		const onePixelMask = await sharp({
			create: { width: 1, height: 1, channels: 4, background: '#00000000' }
		})
			.png()
			.toBuffer();
		await expect(
			finalizeMeadowEntryForeground({
				...shared,
				candidatePng,
				transform: identityTransform(2, 2),
				eligibleMaskPng: onePixelMask,
				protectedMaskPng: onePixelMask,
				generation: manualFixture,
				refinements: []
			})
		).rejects.toThrow(/mask.*dimension/i);
	});

	it('emits byte-identical base, foreground, and combined provenance on repeat', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const transparent = await encodeCanonicalMeadowEntryPng(Buffer.alloc(16), 2, 2);
		const base = {
			...shared,
			candidatePng,
			transform: identityTransform(2, 2),
			generation: manualFixture,
			refinements: []
		};
		const foreground = {
			...shared,
			candidatePng,
			transform: identityTransform(2, 2),
			eligibleMaskPng: transparent,
			protectedMaskPng: transparent,
			generation: manualFixture,
			refinements: []
		};
		const first = await finalizeMeadowEntryMasters({ base, foreground });
		const second = await finalizeMeadowEntryMasters({ base, foreground });
		expect(second).toEqual(first);
	});

	it('rejects a mixed predecessor snapshot after each plane validates independently', async () => {
		const baseContext = await context();
		const foregroundContext = await context();
		const alternateBasePng = await rgbaPng([
			1, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255
		]);
		const alternateForegroundPng = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]);
		foregroundContext.predecessor = {
			basePng: alternateBasePng,
			foregroundPng: alternateForegroundPng,
			approvedBaseSha256: sha256(alternateBasePng),
			approvedForegroundSha256: sha256(alternateForegroundPng)
		};
		const candidatePng = await rgbaPng(new Array(16).fill(255));
		const transparent = await encodeCanonicalMeadowEntryPng(Buffer.alloc(16), 2, 2);
		const base = {
			...baseContext,
			candidatePng,
			transform: identityTransform(2, 2),
			generation: manualFixture,
			refinements: []
		};
		const foreground = {
			...foregroundContext,
			candidatePng,
			transform: identityTransform(2, 2),
			eligibleMaskPng: transparent,
			protectedMaskPng: transparent,
			generation: manualFixture,
			refinements: []
		};

		await expect(finalizeMeadowEntryBase(base)).resolves.toBeDefined();
		await expect(finalizeMeadowEntryForeground(foreground)).resolves.toBeDefined();
		await expect(finalizeMeadowEntryMasters({ base, foreground })).rejects.toThrow(
			/predecessor.*context.*match/i
		);
	});

	it('rejects a refinement chain whose final afterMasterSha256 does not match the candidate', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const preRefinementCandidatePng = await rgbaPng([
			20, 21, 22, 255, 23, 24, 25, 255, 26, 27, 28, 255, 29, 30, 31, 255
		]);
		const detachedAfter = 'e'.repeat(64);
		const refinements: MeadowEntryRefinementProvenance[] = [
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: sha256(preRefinementCandidatePng),
				afterMasterSha256: detachedAfter,
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			}
		];
		await expect(
			finalizeMeadowEntryBase({
				...shared,
				candidatePng,
				preRefinementCandidatePng,
				transform: identityTransform(2, 2),
				generation: manualFixture,
				refinements
			})
		).rejects.toThrow(/candidate does not match the final refinement afterMasterSha256/i);
	});

	it('rejects a refinement chain that does not start from the pre-refinement candidate', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const candidateSha = sha256(candidatePng);
		const preRefinementCandidatePng = await rgbaPng([
			20, 21, 22, 255, 23, 24, 25, 255, 26, 27, 28, 255, 29, 30, 31, 255
		]);
		const refinements: MeadowEntryRefinementProvenance[] = [
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: 'c'.repeat(64),
				afterMasterSha256: candidateSha,
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			}
		];
		await expect(
			finalizeMeadowEntryBase({
				...shared,
				candidatePng,
				preRefinementCandidatePng,
				transform: identityTransform(2, 2),
				generation: manualFixture,
				refinements
			})
		).rejects.toThrow(/first refinement does not start from the pre-refinement candidate/i);
	});

	it('rejects refinements without a pre-refinement candidate PNG', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const candidateSha = sha256(candidatePng);
		const refinements: MeadowEntryRefinementProvenance[] = [
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: 'c'.repeat(64),
				afterMasterSha256: candidateSha,
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			}
		];
		await expect(
			finalizeMeadowEntryBase({
				...shared,
				candidatePng,
				transform: identityTransform(2, 2),
				generation: manualFixture,
				refinements
			})
		).rejects.toThrow(/refinements require a pre-refinement candidate PNG/i);
	});

	it('rejects a refinement chain with a broken middle link', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const candidateSha = sha256(candidatePng);
		const preRefinementCandidatePng = await rgbaPng([
			20, 21, 22, 255, 23, 24, 25, 255, 26, 27, 28, 255, 29, 30, 31, 255
		]);
		const refinements: MeadowEntryRefinementProvenance[] = [
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: sha256(preRefinementCandidatePng),
				afterMasterSha256: 'd'.repeat(64),
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			},
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: '0'.repeat(64),
				afterMasterSha256: candidateSha,
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			}
		];
		await expect(
			finalizeMeadowEntryBase({
				...shared,
				candidatePng,
				preRefinementCandidatePng,
				transform: identityTransform(2, 2),
				generation: manualFixture,
				refinements
			})
		).rejects.toThrow(
			/refinement 1 beforeMasterSha256 does not match refinement 0 afterMasterSha256/i
		);
	});

	it('accepts a properly chained refinement list whose final afterMasterSha256 matches the candidate', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const candidateSha = sha256(candidatePng);
		const preRefinementCandidatePng = await rgbaPng([
			20, 21, 22, 255, 23, 24, 25, 255, 26, 27, 28, 255, 29, 30, 31, 255
		]);
		const refinements: MeadowEntryRefinementProvenance[] = [
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: sha256(preRefinementCandidatePng),
				afterMasterSha256: 'd'.repeat(64),
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			},
			{
				plane: 'base',
				sourceRegionIds: ['crossroads'],
				editMaskSha256: 'a'.repeat(64),
				replacementSha256: 'b'.repeat(64),
				beforeMasterSha256: 'd'.repeat(64),
				afterMasterSha256: candidateSha,
				changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
				affectedCropIds: ['crop-1'],
				transform: identityTransform(2, 2)
			}
		];
		const result = await finalizeMeadowEntryBase({
			...shared,
			candidatePng,
			preRefinementCandidatePng,
			transform: identityTransform(2, 2),
			generation: manualFixture,
			refinements
		});
		expect(result.provenance.preRefinementCandidateSha256).toBe(sha256(preRefinementCandidatePng));
	});

	it('records null preRefinementCandidateSha256 when there are no refinements', async () => {
		const shared = await context();
		const candidatePng = await rgbaPng([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
		const result = await finalizeMeadowEntryBase({
			...shared,
			candidatePng,
			transform: identityTransform(2, 2),
			generation: manualFixture,
			refinements: []
		});
		expect(result.provenance.preRefinementCandidateSha256).toBeNull();
	});
});
