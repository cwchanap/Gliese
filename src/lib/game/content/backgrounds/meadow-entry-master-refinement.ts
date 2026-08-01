import { createHash } from 'node:crypto';

import type { MeadowEntryControlInputs, MeadowEntryRasterMask } from './meadow-entry-controls';
import type { MeadowEntryApprovedCrop } from './meadow-entry-crop-manifest';
import type { MeadowEntryAuthoringRegionId } from './meadow-entry-authoring-layout';
import { intersectBounds } from './meadow-entry-authoring-geometry';
import { normalizeMeadowEntryMasterCandidate } from './meadow-entry-master-finalizer';
import type {
	MeadowEntryNormalizationTransform,
	MeadowEntryRefinementProvenance
} from './meadow-entry-master-provenance';
import {
	decodeMeadowEntryAlpha,
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng
} from './meadow-entry-png';
import type { PixelBounds } from './meadow-entry-authoring-types';

export interface MeadowEntryRefinementInput {
	plane: 'base' | 'foreground';
	currentMasterPng: Buffer;
	replacementPng: Buffer;
	editMaskPng: Buffer;
	protectedMaskPng: Buffer;
	nonTargetMaskPng: Buffer;
	transform: MeadowEntryNormalizationTransform;
	sourceRegionIds: readonly string[];
	controlFingerprint: string;
	approvedControlFingerprint: string;
	approvedCrops: readonly MeadowEntryApprovedCrop[];
	approvedMasks: MeadowEntryApprovedRefinementMasks;
}

export interface MeadowEntryApprovedRefinementMasks {
	width: number;
	height: number;
	foregroundEligibleAlpha: Buffer;
	protectedAlpha: Buffer;
	nonTargetAlpha: Buffer;
}

const SHA256 = /^[a-f0-9]{64}$/;

function fillMaskBounds(alpha: Buffer, width: number, bounds: PixelBounds, value: number): void {
	const row = Buffer.alloc(bounds.right - bounds.left, value);
	for (let y = bounds.top; y < bounds.bottom; y += 1) {
		row.copy(alpha, y * width + bounds.left);
	}
}

export function buildMeadowEntryRefinementNonTargetRasterMask(
	input: MeadowEntryControlInputs,
	regionIds: readonly string[]
): MeadowEntryRasterMask {
	const requested = new Set(regionIds);
	const known = new Set(input.authoringRegions.map((region) => region.id));
	const productionTargets = new Set(
		input.bakeOwnership
			.filter(
				(entry) =>
					entry.disposition.mode === 'base-underlay' ||
					entry.disposition.mode === 'base-static' ||
					entry.disposition.mode === 'base-and-foreground'
			)
			.map((entry) => entry.primaryRegionId)
	);
	for (const regionId of requested) {
		if (!known.has(regionId as MeadowEntryAuthoringRegionId)) {
			throw new Error(`Unknown Meadow Entry source region "${regionId}"`);
		}
		if (!productionTargets.has(regionId as MeadowEntryAuthoringRegionId)) {
			throw new Error(
				`Meadow Entry source region "${regionId}" is not an approved production refinement target`
			);
		}
	}
	const { width, height } = input.rendererMaskMaterialContract.maskDimensionsPx;
	const alpha = Buffer.alloc(width * height, 255);
	for (const region of input.authoringRegions) {
		if (requested.has(region.id)) fillMaskBounds(alpha, width, region.reviewBounds, 0);
	}
	return { width, height, alpha };
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function assertControlFingerprint(input: MeadowEntryRefinementInput): void {
	assert(SHA256.test(input.controlFingerprint), 'Meadow Entry control fingerprint must be SHA-256');
	assert(
		SHA256.test(input.approvedControlFingerprint),
		'Meadow Entry approved control fingerprint must be SHA-256'
	);
	assert(
		input.controlFingerprint === input.approvedControlFingerprint,
		'Meadow Entry control fingerprint is stale'
	);
}

async function decodeMask(
	png: Buffer,
	width: number,
	height: number,
	label: 'edit' | 'protected' | 'non-target'
) {
	const decoded = await decodeMeadowEntryAlpha(png);
	assert(
		decoded.width === width && decoded.height === height,
		`Meadow Entry ${label} mask dimensions must match the master`
	);
	return decoded;
}

function assertApprovedMask(
	mask: MeadowEntryApprovedRefinementMasks,
	width: number,
	height: number
): void {
	assert(
		mask.width === width && mask.height === height,
		'Meadow Entry approved refinement mask dimensions must match the master'
	);
	const expectedLength = width * height;
	for (const [label, alpha] of Object.entries({
		foregroundEligibility: mask.foregroundEligibleAlpha,
		protected: mask.protectedAlpha,
		nonTarget: mask.nonTargetAlpha
	})) {
		assert(
			alpha.byteLength === expectedLength,
			`Meadow Entry approved ${label} mask length must match the master`
		);
	}
}

function assertMaskMatchesApproved(
	claimed: Buffer,
	approved: Buffer,
	label: 'protected' | 'non-target'
): void {
	for (let index = 0; index < approved.length; index += 1) {
		assert(
			claimed[index] === approved[index],
			`Meadow Entry ${label} mask does not match approved controls at pixel ${index}`
		);
	}
}

function changedBounds(before: Buffer, after: Buffer, width: number, height: number): PixelBounds {
	let left = width;
	let top = height;
	let right = 0;
	let bottom = 0;
	for (let index = 0; index < before.length; index += 4) {
		if (before.subarray(index, index + 4).equals(after.subarray(index, index + 4))) continue;
		const x = (index / 4) % width;
		const y = Math.floor(index / 4 / width);
		left = Math.min(left, x);
		top = Math.min(top, y);
		right = Math.max(right, x + 1);
		bottom = Math.max(bottom, y + 1);
	}
	assert(right > left && bottom > top, 'Meadow Entry refinement does not change the master');
	return { left, top, right, bottom };
}

function affectedCropIds(
	bounds: PixelBounds,
	crops: readonly MeadowEntryApprovedCrop[]
): readonly string[] {
	return crops
		.filter((crop) => intersectBounds(bounds, crop.bounds) !== null)
		.map((crop) => crop.id);
}

function assertMaskSafety(
	plane: MeadowEntryRefinementInput['plane'],
	editAlpha: number,
	foregroundEligibleAlpha: number,
	protectedAlpha: number,
	nonTargetAlpha: number
): void {
	if (editAlpha === 0) return;
	assert(
		plane !== 'foreground' || foregroundEligibleAlpha !== 0,
		'Meadow Entry foreground refinement edit is outside approved eligibility'
	);
	assert(protectedAlpha === 0, 'Meadow Entry refinement edit intersects a protected mask');
	assert(nonTargetAlpha === 0, 'Meadow Entry refinement edit intersects a non-target mask');
}

export async function applyMeadowEntryRefinement(
	input: MeadowEntryRefinementInput
): Promise<{ masterPng: Buffer; provenance: MeadowEntryRefinementProvenance }> {
	assertControlFingerprint(input);
	assert(input.sourceRegionIds.length > 0, 'Meadow Entry refinement requires a source region');
	const current = await decodeMeadowEntryRgba(input.currentMasterPng);
	assertApprovedMask(input.approvedMasks, current.width, current.height);
	const [replacement, editMask, protectedMask, nonTargetMask] = await Promise.all([
		normalizeMeadowEntryMasterCandidate(input.replacementPng, input.transform, {
			width: current.width,
			height: current.height
		}),
		decodeMask(input.editMaskPng, current.width, current.height, 'edit'),
		decodeMask(input.protectedMaskPng, current.width, current.height, 'protected'),
		decodeMask(input.nonTargetMaskPng, current.width, current.height, 'non-target')
	]);
	assertMaskMatchesApproved(protectedMask.alpha, input.approvedMasks.protectedAlpha, 'protected');
	assertMaskMatchesApproved(nonTargetMask.alpha, input.approvedMasks.nonTargetAlpha, 'non-target');
	const output = Buffer.from(current.data);
	for (let index = 0; index < output.length; index += 4) {
		const pixelIndex = index / 4;
		assertMaskSafety(
			input.plane,
			editMask.alpha[pixelIndex] ?? 0,
			input.approvedMasks.foregroundEligibleAlpha[pixelIndex] ?? 0,
			input.approvedMasks.protectedAlpha[pixelIndex] ?? 0,
			input.approvedMasks.nonTargetAlpha[pixelIndex] ?? 0
		);
		if ((editMask.alpha[pixelIndex] ?? 0) !== 0) {
			replacement.data.copy(output, index, index, index + 4);
		}
		if (input.plane === 'foreground' && output[index + 3] === 0) {
			output.fill(0, index, index + 3);
		}
	}
	const bounds = changedBounds(current.data, output, current.width, current.height);
	const masterPng = await encodeCanonicalMeadowEntryPng(output, current.width, current.height);
	return {
		masterPng,
		provenance: {
			plane: input.plane,
			sourceRegionIds: [...input.sourceRegionIds],
			editMaskSha256: sha256(input.editMaskPng),
			replacementSha256: sha256(input.replacementPng),
			beforeMasterSha256: sha256(input.currentMasterPng),
			afterMasterSha256: sha256(masterPng),
			changedBounds: bounds,
			affectedCropIds: affectedCropIds(bounds, input.approvedCrops),
			transform: input.transform
		}
	};
}
