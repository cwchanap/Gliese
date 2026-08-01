import { describe, expect, it } from 'vitest';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';

import type { MeadowEntryApprovedCrop } from './meadow-entry-crop-manifest';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from './meadow-entry-controls';
import type { MeadowEntryNormalizationTransform } from './meadow-entry-master-provenance';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import { applyMeadowEntryRefinement } from './meadow-entry-master-refinement';
import {
	meadowEntryRefinementWorkPaths,
	parseRefineMeadowEntryMasterArguments,
	runRefineMeadowEntryMaster
} from '../../../../../tools/refine-meadow-entry-master';

const fingerprint = 'a'.repeat(64);

function identityTransform(width: number, height: number): MeadowEntryNormalizationTransform {
	return {
		native: { width, height },
		crop: { left: 0, top: 0, width, height },
		output: { width, height },
		scale: 1
	};
}

function crop(id: string, left: number, right: number): MeadowEntryApprovedCrop {
	return {
		id,
		derivation: { mode: 'exact-bounds' },
		reviewBounds: { left, top: 0, right, bottom: 1 },
		coverageAttachments: [],
		preClampBounds: { left, top: 0, right, bottom: 1 },
		edgeClamp: null,
		bounds: { left, top: 0, right, bottom: 1 },
		expectedDimensions: { width: right - left, height: 1 },
		baseFilename: `${id}.png`,
		foregroundFilename: `${id}-foreground.png`,
		textureKeys: { base: `${id}-base`, foreground: `${id}-foreground` },
		drawOrder: 0,
		sourceRegionIds: ['crossroads'],
		neighborIds: [],
		overlapIds: [],
		alphaPolicy: { base: 'opaque', foreground: 'sparse-eligible-mask' },
		sizeBudgets: {
			baseReviewBytes: 1_000,
			baseHardBytes: 2_000,
			foregroundReviewBytes: 1_000,
			foregroundHardBytes: 2_000
		}
	};
}

async function rgbaPng(raw: number[]): Promise<Buffer> {
	return encodeCanonicalMeadowEntryPng(Buffer.from(raw), 2, 1);
}

function approvedMasks(eligible = [255, 0], protectedPixels = [0, 0], nonTargetPixels = [0, 0]) {
	return {
		width: 2,
		height: 1,
		foregroundEligibleAlpha: Buffer.from(eligible),
		protectedAlpha: Buffer.from(protectedPixels),
		nonTargetAlpha: Buffer.from(nonTargetPixels)
	};
}

async function input(overrides: Partial<Parameters<typeof applyMeadowEntryRefinement>[0]> = {}) {
	const opaqueBlack = await rgbaPng([0, 0, 0, 255, 0, 0, 0, 255]);
	const opaqueRed = await rgbaPng([255, 0, 0, 255, 255, 0, 0, 255]);
	const firstPixel = await rgbaPng([0, 0, 0, 255, 0, 0, 0, 0]);
	const empty = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0]);
	return {
		plane: 'base' as const,
		currentMasterPng: opaqueBlack,
		replacementPng: opaqueRed,
		editMaskPng: firstPixel,
		protectedMaskPng: empty,
		nonTargetMaskPng: empty,
		transform: identityTransform(2, 1),
		sourceRegionIds: ['crossroads'],
		controlFingerprint: fingerprint,
		approvedControlFingerprint: fingerprint,
		approvedCrops: [crop('first-pixel', 0, 1), crop('spanning', 0, 2), crop('second-pixel', 1, 2)],
		approvedMasks: approvedMasks(),
		...overrides
	};
}

function pixel(
	decoded: Awaited<ReturnType<typeof decodeMeadowEntryRgba>>,
	index: number
): number[] {
	return Array.from(decoded.data.subarray(index * 4, index * 4 + 4));
}

describe('Meadow Entry master refinement', () => {
	it('composites only the edit mask and records changed bounds with every affected crop', async () => {
		const result = await applyMeadowEntryRefinement(await input());
		const decoded = await decodeMeadowEntryRgba(result.masterPng);

		expect(pixel(decoded, 0)).toEqual([255, 0, 0, 255]);
		expect(pixel(decoded, 1)).toEqual([0, 0, 0, 255]);
		expect(result.provenance.changedBounds).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
		expect(result.provenance.affectedCropIds).toEqual(['first-pixel', 'spanning']);
	});

	it('rejects edits that intersect a protected mask', async () => {
		const value = await input();
		await expect(
			applyMeadowEntryRefinement({
				...value,
				protectedMaskPng: value.editMaskPng,
				approvedMasks: approvedMasks([255, 0], [255, 0])
			})
		).rejects.toThrow(/protected/i);
	});

	it('rejects edits that intersect a non-target mask', async () => {
		const value = await input();
		await expect(
			applyMeadowEntryRefinement({
				...value,
				nonTargetMaskPng: value.editMaskPng,
				approvedMasks: approvedMasks([255, 0], [0, 0], [255, 0])
			})
		).rejects.toThrow(/non-target/i);
	});

	it('rejects a stale control fingerprint', async () => {
		await expect(
			applyMeadowEntryRefinement(await input({ controlFingerprint: 'b'.repeat(64) }))
		).rejects.toThrow(/fingerprint/i);
	});

	it('clears invisible foreground RGB after a refinement', async () => {
		const transparentRgb = await rgbaPng([7, 8, 9, 0, 1, 2, 3, 0]);
		const result = await applyMeadowEntryRefinement(
			await input({
				plane: 'foreground',
				currentMasterPng: transparentRgb,
				replacementPng: transparentRgb
			})
		);
		const decoded = await decodeMeadowEntryRgba(result.masterPng);
		expect(pixel(decoded, 0)).toEqual([0, 0, 0, 0]);
		expect(pixel(decoded, 1)).toEqual([0, 0, 0, 0]);
	});

	it('rejects a foreground edit outside approved eligibility despite blank caller masks', async () => {
		const empty = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0]);
		await expect(
			applyMeadowEntryRefinement(
				await input({
					plane: 'foreground',
					protectedMaskPng: empty,
					nonTargetMaskPng: empty,
					approvedMasks: approvedMasks([0, 0])
				})
			)
		).rejects.toThrow(/eligib/i);
	});

	it('rejects a blank caller protected mask that contradicts approved protected-live controls', async () => {
		const empty = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0]);
		await expect(
			applyMeadowEntryRefinement(
				await input({
					plane: 'foreground',
					protectedMaskPng: empty,
					nonTargetMaskPng: empty,
					approvedMasks: approvedMasks([255, 0], [255, 0])
				})
			)
		).rejects.toThrow(/protected.*approved/i);
	});

	it('rejects a blank caller non-target mask that contradicts declared source-region controls', async () => {
		const empty = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0]);
		await expect(
			applyMeadowEntryRefinement(
				await input({
					plane: 'foreground',
					protectedMaskPng: empty,
					nonTargetMaskPng: empty,
					approvedMasks: approvedMasks([255, 0], [0, 0], [255, 0])
				})
			)
		).rejects.toThrow(/non-target.*approved/i);
	});
});

describe('Meadow Entry refinement CLI', () => {
	it('accepts refinement inputs and confines candidates to ignored work paths', () => {
		expect(
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/inputs/current.png',
				'--replacement',
				'/inputs/replacement.png',
				'--edit-mask',
				'/inputs/edit.png',
				'--protected-mask',
				'/inputs/protected.png',
				'--non-target-mask',
				'/inputs/non-target.png',
				'--transform',
				'/inputs/transform.json',
				'--source-region',
				'crossroads',
				'--source-region',
				'wildwood'
			])
		).toMatchObject({ plane: 'base', sourceRegionIds: ['crossroads', 'wildwood'] });
		expect(meadowEntryRefinementWorkPaths('/repo', 'base')).toEqual({
			candidate:
				'/repo/artifacts/meadow-entry/hpa-399/work/meadow-entry-base-refinement-candidate.png',
			sidecar: '/repo/artifacts/meadow-entry/hpa-399/work/meadow-entry-base-refinement.json'
		});
	});

	it('rejects outer-boundary before reading inputs or writing a candidate', async () => {
		await expect(
			runRefineMeadowEntryMaster([
				'--plane',
				'foreground',
				'--current-master',
				'/nonexistent/current.png',
				'--replacement',
				'/nonexistent/replacement.png',
				'--edit-mask',
				'/nonexistent/edit.png',
				'--protected-mask',
				'/nonexistent/protected.png',
				'--non-target-mask',
				'/nonexistent/non-target.png',
				'--transform',
				'/nonexistent/transform.json',
				'--source-region',
				'outer-boundary'
			])
		).rejects.toThrow(/production refinement target/i);
	});
});

describe('Meadow Entry refinement control boundary', () => {
	it('leaves the frozen approved combined control fingerprint current after refinement logic loads', () => {
		expect(computeMeadowEntryCombinedControlFingerprint(buildMeadowEntryControlInputs())).toBe(
			meadowEntryControlsApproval.combinedControlFingerprint
		);
	});
});
