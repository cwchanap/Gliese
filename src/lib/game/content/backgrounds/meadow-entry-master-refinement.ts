import { createHash } from 'node:crypto';

import type { MeadowEntryApprovedCrop } from './meadow-entry-crop-manifest';
import { intersectBounds } from './meadow-entry-authoring-geometry';
import { normalizeMeadowEntryMasterCandidate } from './meadow-entry-master-finalizer';
import type {
	MeadowEntryNormalizationTransform,
	MeadowEntryRefinementProvenance
} from './meadow-entry-master-provenance';
import { decodeMeadowEntryRgba, encodeCanonicalMeadowEntryPng } from './meadow-entry-png';
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
}

const SHA256 = /^[a-f0-9]{64}$/;

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
	const decoded = await decodeMeadowEntryRgba(png);
	assert(
		decoded.width === width && decoded.height === height,
		`Meadow Entry ${label} mask dimensions must match the master`
	);
	return decoded;
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

function assertMaskSafety(editAlpha: number, protectedAlpha: number, nonTargetAlpha: number): void {
	if (editAlpha === 0) return;
	assert(protectedAlpha === 0, 'Meadow Entry refinement edit intersects a protected mask');
	assert(nonTargetAlpha === 0, 'Meadow Entry refinement edit intersects a non-target mask');
}

export async function applyMeadowEntryRefinement(
	input: MeadowEntryRefinementInput
): Promise<{ masterPng: Buffer; provenance: MeadowEntryRefinementProvenance }> {
	assertControlFingerprint(input);
	assert(input.sourceRegionIds.length > 0, 'Meadow Entry refinement requires a source region');
	const current = await decodeMeadowEntryRgba(input.currentMasterPng);
	const [replacement, editMask, protectedMask, nonTargetMask] = await Promise.all([
		normalizeMeadowEntryMasterCandidate(input.replacementPng, input.transform, {
			width: current.width,
			height: current.height
		}),
		decodeMask(input.editMaskPng, current.width, current.height, 'edit'),
		decodeMask(input.protectedMaskPng, current.width, current.height, 'protected'),
		decodeMask(input.nonTargetMaskPng, current.width, current.height, 'non-target')
	]);
	const output = Buffer.from(current.data);
	for (let index = 0; index < output.length; index += 4) {
		assertMaskSafety(
			editMask.data[index + 3] ?? 0,
			protectedMask.data[index + 3] ?? 0,
			nonTargetMask.data[index + 3] ?? 0
		);
		if ((editMask.data[index + 3] ?? 0) !== 0) {
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
