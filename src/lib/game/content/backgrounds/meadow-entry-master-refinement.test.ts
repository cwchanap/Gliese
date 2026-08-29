import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { meadowEntryControlsApproval } from '$lib/game/content/approvals/meadow-entry-controls';

import type { MeadowEntryApprovedCrop } from './meadow-entry-crop-manifest';
import {
	buildMeadowEntryControlInputs,
	computeMeadowEntryCombinedControlFingerprint
} from './meadow-entry-controls';
import type { MeadowEntryNormalizationTransform } from './meadow-entry-master-provenance';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
import {
	applyMeadowEntryRefinement,
	buildMeadowEntryRefinementNonTargetRasterMask
} from './meadow-entry-master-refinement';
import {
	meadowEntryRefinementWorkPaths,
	parseRefineMeadowEntryMasterArguments,
	runRefineMeadowEntryMaster
} from '../../../../../tools/refine-meadow-entry-master';
import {
	createMeadowEntryControlRepositoryFixture,
	removeMeadowEntryControlRepositoryFixture
} from './meadow-entry-controls-test-fixture';

const fingerprint = 'a'.repeat(64);
let testRepositoryRoot = '';

beforeAll(() => {
	testRepositoryRoot = createMeadowEntryControlRepositoryFixture();
});

afterAll(() => {
	removeMeadowEntryControlRepositoryFixture(testRepositoryRoot);
});

function buildTestControlInputs() {
	return buildMeadowEntryControlInputs(testRepositoryRoot);
}

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

	it('rejects a control fingerprint that is not a SHA-256 hex string', async () => {
		await expect(
			applyMeadowEntryRefinement(await input({ controlFingerprint: 'not-a-sha256' }))
		).rejects.toThrow(/control fingerprint must be SHA-256/i);
	});

	it('rejects an approved control fingerprint that is not a SHA-256 hex string', async () => {
		await expect(
			applyMeadowEntryRefinement(await input({ approvedControlFingerprint: 'not-a-sha256' }))
		).rejects.toThrow(/approved control fingerprint must be SHA-256/i);
	});

	it('rejects approved refinement masks whose dimensions do not match the master', async () => {
		await expect(
			applyMeadowEntryRefinement(
				await input({
					approvedMasks: {
						width: 3,
						height: 1,
						foregroundEligibleAlpha: Buffer.from([255, 0, 0]),
						protectedAlpha: Buffer.from([0, 0, 0]),
						nonTargetAlpha: Buffer.from([0, 0, 0])
					}
				})
			)
		).rejects.toThrow(/dimensions must match the master/i);
	});

	it('rejects approved refinement masks whose alpha length does not match the master', async () => {
		await expect(
			applyMeadowEntryRefinement(
				await input({
					approvedMasks: {
						width: 2,
						height: 1,
						foregroundEligibleAlpha: Buffer.from([255, 0, 0]),
						protectedAlpha: Buffer.from([0, 0]),
						nonTargetAlpha: Buffer.from([0, 0])
					}
				})
			)
		).rejects.toThrow(/mask length must match/i);
	});

	it('rejects a refinement that does not change the master', async () => {
		const opaqueBlack = await rgbaPng([0, 0, 0, 255, 0, 0, 0, 255]);
		await expect(
			applyMeadowEntryRefinement(
				await input({
					currentMasterPng: opaqueBlack,
					replacementPng: opaqueBlack
				})
			)
		).rejects.toThrow(/does not change the master/i);
	});

	it('rejects an edit mask whose dimensions do not match the master', async () => {
		const wrongSizedMask = await encodeCanonicalMeadowEntryPng(Buffer.from([0, 0, 0, 255]), 1, 1);
		await expect(
			applyMeadowEntryRefinement(await input({ editMaskPng: wrongSizedMask }))
		).rejects.toThrow(/edit mask dimensions must match/i);
	});

	it('rejects a protected mask whose dimensions do not match the master', async () => {
		const wrongSizedMask = await encodeCanonicalMeadowEntryPng(Buffer.from([0, 0, 0, 255]), 1, 1);
		await expect(
			applyMeadowEntryRefinement(await input({ protectedMaskPng: wrongSizedMask }))
		).rejects.toThrow(/protected mask dimensions must match/i);
	});

	it('rejects a non-target mask whose dimensions do not match the master', async () => {
		const wrongSizedMask = await encodeCanonicalMeadowEntryPng(Buffer.from([0, 0, 0, 255]), 1, 1);
		await expect(
			applyMeadowEntryRefinement(await input({ nonTargetMaskPng: wrongSizedMask }))
		).rejects.toThrow(/non-target mask dimensions must match/i);
	});

	it('rejects a refinement with no source region ids', async () => {
		await expect(applyMeadowEntryRefinement(await input({ sourceRegionIds: [] }))).rejects.toThrow(
			/requires a source region/i
		);
	});

	it('composites a foreground edit within approved eligibility', async () => {
		const transparent = await rgbaPng([0, 0, 0, 0, 0, 0, 0, 0]);
		const redReplacement = await rgbaPng([255, 0, 0, 255, 255, 0, 0, 255]);
		const firstPixelEdit = await rgbaPng([0, 0, 0, 255, 0, 0, 0, 0]);
		const result = await applyMeadowEntryRefinement(
			await input({
				plane: 'foreground',
				currentMasterPng: transparent,
				replacementPng: redReplacement,
				editMaskPng: firstPixelEdit,
				approvedMasks: approvedMasks([255, 0])
			})
		);
		const decoded = await decodeMeadowEntryRgba(result.masterPng);
		expect(pixel(decoded, 0)).toEqual([255, 0, 0, 255]);
		expect(pixel(decoded, 1)).toEqual([0, 0, 0, 0]);
	});

	it('records the transform in the provenance output', async () => {
		const transform = identityTransform(2, 1);
		const result = await applyMeadowEntryRefinement(await input({ transform }));
		expect(result.provenance.transform).toEqual(transform);
	});

	it('records sha256 hashes of the edit mask, replacement, and masters in provenance', async () => {
		const value = await input();
		const result = await applyMeadowEntryRefinement(value);
		expect(result.provenance.editMaskSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.provenance.replacementSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.provenance.beforeMasterSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.provenance.afterMasterSha256).toMatch(/^[a-f0-9]{64}$/);
		expect(result.provenance.beforeMasterSha256).not.toBe(result.provenance.afterMasterSha256);
	});

	it('records the plane in the provenance output', async () => {
		const result = await applyMeadowEntryRefinement(await input({ plane: 'foreground' }));
		expect(result.provenance.plane).toBe('foreground');
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
			runRefineMeadowEntryMaster(
				[
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
				],
				testRepositoryRoot
			)
		).rejects.toThrow(/production refinement target/i);
	});

	it('rejects an unknown refinement argument', () => {
		expect(() => parseRefineMeadowEntryMasterArguments(['--plane', 'base', '--unknown'])).toThrow(
			/Unknown meadow-entry refinement argument/i
		);
	});

	it('rejects a flag missing its value at the end of args', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments(['--plane', 'base', '--current-master'])
		).toThrow(/Missing value/i);
	});

	it('rejects a flag whose value looks like another flag', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments(['--plane', '--replacement', '/r.png'])
		).toThrow(/Missing value/i);
	});

	it('rejects a duplicate flag', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--plane',
				'foreground',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Duplicate/i);
	});

	it('rejects an invalid plane value', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'both',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/must be base or foreground/i);
	});

	it('rejects args with no --source-region', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json'
			])
		).toThrow(/Missing required --source-region/i);
	});

	it('rejects args with no --current-master', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --current-master/i);
	});

	it('skips a leading -- separator before parsing arguments', () => {
		expect(
			parseRefineMeadowEntryMasterArguments([
				'--',
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toMatchObject({ plane: 'base', currentMaster: '/c.png' });
	});

	it('produces foreground work paths for the foreground plane', () => {
		expect(meadowEntryRefinementWorkPaths('/repo', 'foreground')).toEqual({
			candidate:
				'/repo/artifacts/meadow-entry/hpa-399/work/meadow-entry-foreground-refinement-candidate.png',
			sidecar: '/repo/artifacts/meadow-entry/hpa-399/work/meadow-entry-foreground-refinement.json'
		});
	});

	it('rejects a missing --replacement argument', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --replacement/i);
	});

	it('rejects a missing --edit-mask argument', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --edit-mask/i);
	});

	it('rejects a missing --protected-mask argument', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --protected-mask/i);
	});

	it('rejects a missing --non-target-mask argument', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --non-target-mask/i);
	});

	it('rejects a missing --transform argument', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--plane',
				'base',
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --transform/i);
	});

	it('rejects a missing --plane argument', () => {
		expect(() =>
			parseRefineMeadowEntryMasterArguments([
				'--current-master',
				'/c.png',
				'--replacement',
				'/r.png',
				'--edit-mask',
				'/e.png',
				'--protected-mask',
				'/p.png',
				'--non-target-mask',
				'/n.png',
				'--transform',
				'/t.json',
				'--source-region',
				'crossroads'
			])
		).toThrow(/Missing required --plane/i);
	});

	it('accepts multiple --source-region flags', () => {
		const parsed = parseRefineMeadowEntryMasterArguments([
			'--plane',
			'base',
			'--current-master',
			'/c.png',
			'--replacement',
			'/r.png',
			'--edit-mask',
			'/e.png',
			'--protected-mask',
			'/p.png',
			'--non-target-mask',
			'/n.png',
			'--transform',
			'/t.json',
			'--source-region',
			'crossroads',
			'--source-region',
			'wildwood'
		]);
		expect(parsed.sourceRegionIds).toEqual(['crossroads', 'wildwood']);
	});
});

describe('Meadow Entry refinement control boundary', () => {
	it('does not treat the retired V1 approval fingerprint as current after refinement logic loads', () => {
		expect(computeMeadowEntryCombinedControlFingerprint(buildTestControlInputs())).not.toBe(
			meadowEntryControlsApproval.combinedControlFingerprint
		);
	});
});

describe('Meadow Entry refinement non-target raster mask', () => {
	it('rejects an unknown source region id', () => {
		const controls = buildTestControlInputs();
		expect(() => buildMeadowEntryRefinementNonTargetRasterMask(controls, ['nonexistent'])).toThrow(
			/Unknown Meadow Entry source region/i
		);
	});

	it('rejects a known source region that is not an approved production target', () => {
		const controls = buildTestControlInputs();
		expect(() =>
			buildMeadowEntryRefinementNonTargetRasterMask(controls, ['outer-boundary'])
		).toThrow(/not an approved production refinement target/i);
	});

	it('produces a raster mask that carves out the requested region and leaves the rest opaque', () => {
		const controls = buildTestControlInputs();
		const regionId = controls.authoringRegions.find((region) =>
			controls.bakeOwnership.some(
				(entry) =>
					entry.primaryRegionId === region.id &&
					(entry.disposition.mode === 'base-underlay' ||
						entry.disposition.mode === 'base-static' ||
						entry.disposition.mode === 'base-and-foreground')
			)
		)?.id;
		expect(regionId).toBeDefined();
		const mask = buildMeadowEntryRefinementNonTargetRasterMask(controls, [regionId!]);
		expect(mask.width).toBe(controls.rendererMaskMaterialContract.maskDimensionsPx.width);
		expect(mask.height).toBe(controls.rendererMaskMaterialContract.maskDimensionsPx.height);
		expect(mask.alpha.length).toBe(mask.width * mask.height);
		const transparentCount = [...mask.alpha].filter((v) => v === 0).length;
		const opaqueCount = [...mask.alpha].filter((v) => v === 255).length;
		expect(transparentCount).toBeGreaterThan(0);
		expect(opaqueCount).toBeGreaterThan(0);
		expect(transparentCount + opaqueCount).toBe(mask.alpha.length);
	});

	it('produces a fully opaque mask when no regions are requested', () => {
		const controls = buildTestControlInputs();
		const mask = buildMeadowEntryRefinementNonTargetRasterMask(controls, []);
		expect([...mask.alpha].every((v) => v === 255)).toBe(true);
	});
});
