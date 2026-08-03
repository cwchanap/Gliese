import { createHash } from 'node:crypto';

import sharp from 'sharp';

import type {
	MeadowEntryGenerationProvenance,
	MeadowEntryNormalizationTransform,
	MeadowEntryRefinementProvenance
} from './meadow-entry-master-provenance';
import {
	decodeMeadowEntryRgba,
	encodeCanonicalMeadowEntryPng,
	type DecodedMeadowEntryRgba
} from './meadow-entry-png';
import {
	assertMeadowEntryRefinementChain,
	validateMeadowEntryGenerationProvenance,
	validateMeadowEntryRefinementProvenance
} from './meadow-entry-master-provenance';

const MIB = 1_024 * 1_024;
const SHA256 = /^[a-f0-9]{64}$/;

export interface MeadowEntryMasterPolicy {
	width: number;
	height: number;
	baseReviewBytes: number;
	baseHardBytes: number;
	foregroundReviewBytes: number;
	foregroundHardBytes: number;
}

export const MEADOW_ENTRY_MASTER_POLICY: MeadowEntryMasterPolicy = Object.freeze({
	width: 6_400,
	height: 6_400,
	baseReviewBytes: 128 * MIB,
	baseHardBytes: 192 * MIB,
	foregroundReviewBytes: 48 * MIB,
	foregroundHardBytes: 96 * MIB
});

export interface MeadowEntryFinalizerContext {
	policy: MeadowEntryMasterPolicy;
	controlFingerprint: string;
	approvedControlFingerprint: string;
	storageConfigurationSha256: string;
	approvedStorageConfigurationSha256: string;
	predecessor: {
		basePng: Buffer;
		foregroundPng: Buffer;
		approvedBaseSha256: string;
		approvedForegroundSha256: string;
	};
}

export interface FinalizeMeadowEntryBaseInput extends MeadowEntryFinalizerContext {
	candidatePng: Buffer;
	preRefinementCandidatePng?: Buffer;
	transform: MeadowEntryNormalizationTransform;
	generation: MeadowEntryGenerationProvenance;
	refinements: readonly MeadowEntryRefinementProvenance[];
}

export interface FinalizeMeadowEntryForegroundInput extends MeadowEntryFinalizerContext {
	candidatePng: Buffer;
	preRefinementCandidatePng?: Buffer;
	transform: MeadowEntryNormalizationTransform;
	eligibleMaskPng: Buffer;
	protectedMaskPng: Buffer;
	generation: MeadowEntryGenerationProvenance;
	refinements: readonly MeadowEntryRefinementProvenance[];
}

export interface FinalizedPlaneProvenance {
	sha256: string;
	bytes: number;
	preRefinementCandidateSha256: string | null;
	generation: MeadowEntryGenerationProvenance;
	transform: MeadowEntryNormalizationTransform;
	refinements: readonly MeadowEntryRefinementProvenance[];
}

interface MeadowEntryMastersProvenance {
	version: 1;
	policy: MeadowEntryMasterPolicy;
	controls: {
		fingerprint: string;
		storageConfigurationSha256: string;
	};
	predecessor: {
		baseSha256: string;
		foregroundSha256: string;
	};
	base: FinalizedPlaneProvenance;
	foreground: FinalizedPlaneProvenance;
}

function sha256(value: Buffer): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function assertSha256(value: string, label: string): void {
	assert(SHA256.test(value), `Meadow Entry ${label} must be a lowercase SHA-256 hash`);
}

function assertPolicy(policy: MeadowEntryMasterPolicy): void {
	for (const [label, value] of Object.entries(policy)) {
		assert(
			Number.isInteger(value) && value > 0,
			`Meadow Entry master policy ${label} must be positive`
		);
	}
	assert(
		policy.baseReviewBytes <= policy.baseHardBytes,
		'Meadow Entry base review budget exceeds hard budget'
	);
	assert(
		policy.foregroundReviewBytes <= policy.foregroundHardBytes,
		'Meadow Entry foreground review budget exceeds hard budget'
	);
}

function assertContext(context: MeadowEntryFinalizerContext): void {
	assertPolicy(context.policy);
	assertSha256(context.controlFingerprint, 'control fingerprint');
	assertSha256(context.approvedControlFingerprint, 'approved control fingerprint');
	assertSha256(context.storageConfigurationSha256, 'storage configuration hash');
	assertSha256(context.approvedStorageConfigurationSha256, 'approved storage configuration hash');
	assert(
		context.controlFingerprint === context.approvedControlFingerprint,
		'Meadow Entry control fingerprint is stale'
	);
	assert(
		context.storageConfigurationSha256 === context.approvedStorageConfigurationSha256,
		'Meadow Entry storage configuration hash is stale'
	);
	assertSha256(context.predecessor.approvedBaseSha256, 'approved predecessor base hash');
	assertSha256(
		context.predecessor.approvedForegroundSha256,
		'approved predecessor foreground hash'
	);
	assert(
		sha256(context.predecessor.basePng) === context.predecessor.approvedBaseSha256,
		'Meadow Entry predecessor base bytes have changed'
	);
	assert(
		sha256(context.predecessor.foregroundPng) === context.predecessor.approvedForegroundSha256,
		'Meadow Entry predecessor foreground bytes have changed'
	);
}

export function validateMeadowEntryNormalizationTransform(
	transform: MeadowEntryNormalizationTransform,
	candidateWidth: number,
	candidateHeight: number,
	expectedOutput?: { width: number; height: number }
): void {
	const values = [
		transform.native.width,
		transform.native.height,
		transform.crop.left,
		transform.crop.top,
		transform.crop.width,
		transform.crop.height,
		transform.output.width,
		transform.output.height,
		transform.scale
	];
	assert(
		values.every((value) => Number.isFinite(value)),
		'Meadow Entry transform must use finite values'
	);
	assert(
		[
			transform.native.width,
			transform.native.height,
			transform.crop.left,
			transform.crop.top,
			transform.crop.width,
			transform.crop.height,
			transform.output.width,
			transform.output.height
		].every((value) => Number.isInteger(value)),
		'Meadow Entry transform dimensions and crop bounds must be integers'
	);
	assert(
		transform.native.width === candidateWidth && transform.native.height === candidateHeight,
		'Meadow Entry transform native dimensions do not match the candidate PNG'
	);
	assert(
		transform.crop.left >= 0 && transform.crop.top >= 0,
		'Meadow Entry crop must begin inside native input'
	);
	assert(
		transform.crop.width > 0 && transform.crop.height > 0,
		'Meadow Entry crop dimensions must be positive'
	);
	assert(
		transform.crop.left + transform.crop.width <= transform.native.width &&
			transform.crop.top + transform.crop.height <= transform.native.height,
		'Meadow Entry crop must fit native input'
	);
	assert(
		expectedOutput === undefined ||
			(transform.output.width === expectedOutput.width &&
				transform.output.height === expectedOutput.height),
		'Meadow Entry transform output dimensions must match the required output'
	);
	const horizontalScale = transform.output.width / transform.crop.width;
	const verticalScale = transform.output.height / transform.crop.height;
	assert(
		horizontalScale === verticalScale && transform.scale === horizontalScale,
		'Meadow Entry transform must use one exact uniform scale'
	);
}

export async function normalizeMeadowEntryMasterCandidate(
	candidatePng: Buffer,
	transform: MeadowEntryNormalizationTransform,
	expectedOutput?: { width: number; height: number }
): Promise<DecodedMeadowEntryRgba> {
	const metadata = await sharp(candidatePng).metadata();
	assert(
		metadata.width !== undefined && metadata.height !== undefined,
		'Meadow Entry candidate PNG must include dimensions'
	);
	validateMeadowEntryNormalizationTransform(
		transform,
		metadata.width,
		metadata.height,
		expectedOutput
	);
	const { data, info } = await sharp(candidatePng)
		.toColourspace('srgb')
		.ensureAlpha()
		.extract(transform.crop)
		.resize(transform.output.width, transform.output.height, {
			fit: 'fill',
			kernel: sharp.kernel.lanczos3
		})
		.raw()
		.toBuffer({ resolveWithObject: true });
	assert(
		info.channels === 4,
		`Meadow Entry candidate normalized to ${info.channels} channels instead of RGBA`
	);
	return { data, width: info.width, height: info.height };
}

async function decodeMask(
	png: Buffer,
	policy: MeadowEntryMasterPolicy,
	label: 'eligible' | 'protected'
): Promise<DecodedMeadowEntryRgba> {
	const decoded = await decodeMeadowEntryRgba(png);
	assert(
		decoded.width === policy.width && decoded.height === policy.height,
		`Meadow Entry ${label} mask dimensions must match the master policy`
	);
	return decoded;
}

function assertRefinements(
	refinements: readonly MeadowEntryRefinementProvenance[],
	plane: 'base' | 'foreground',
	candidatePng: Buffer,
	preRefinementCandidatePng: Buffer | undefined
): void {
	for (const refinement of refinements) {
		validateMeadowEntryRefinementProvenance(refinement);
		assert(
			refinement.plane === plane,
			`Meadow Entry ${plane} finalizer received a ${refinement.plane} refinement`
		);
	}
	if (refinements.length > 0) {
		assert(
			preRefinementCandidatePng !== undefined,
			`Meadow Entry ${plane} refinements require a pre-refinement candidate PNG`
		);
		assert(
			refinements[0]!.beforeMasterSha256 === sha256(preRefinementCandidatePng),
			`Meadow Entry ${plane} first refinement does not start from the pre-refinement candidate`
		);
	}
	assertMeadowEntryRefinementChain(refinements, plane);
	if (refinements.length > 0) {
		const candidateSha256 = sha256(candidatePng);
		const lastRefinement = refinements.at(-1)!;
		assert(
			lastRefinement.afterMasterSha256 === candidateSha256,
			`Meadow Entry ${plane} candidate does not match the final refinement afterMasterSha256`
		);
	}
}

function assertHardBudget(png: Buffer, hardBytes: number, plane: 'base' | 'foreground'): void {
	assert(
		png.byteLength <= hardBytes,
		`Meadow Entry ${plane} master exceeds hard budget: ${png.byteLength} > ${hardBytes}`
	);
}

function planeProvenance(
	png: Buffer,
	generation: MeadowEntryGenerationProvenance,
	transform: MeadowEntryNormalizationTransform,
	refinements: readonly MeadowEntryRefinementProvenance[],
	preRefinementCandidatePng: Buffer | undefined
): FinalizedPlaneProvenance {
	return {
		sha256: sha256(png),
		bytes: png.byteLength,
		preRefinementCandidateSha256:
			preRefinementCandidatePng !== undefined ? sha256(preRefinementCandidatePng) : null,
		generation,
		transform,
		refinements
	};
}

export async function finalizeMeadowEntryBase(
	input: FinalizeMeadowEntryBaseInput
): Promise<{ png: Buffer; provenance: FinalizedPlaneProvenance }> {
	assertContext(input);
	validateMeadowEntryGenerationProvenance(input.generation);
	assertRefinements(input.refinements, 'base', input.candidatePng, input.preRefinementCandidatePng);
	const normalized = await normalizeMeadowEntryMasterCandidate(
		input.candidatePng,
		input.transform,
		input.policy
	);
	for (let index = 3; index < normalized.data.length; index += 4) normalized.data[index] = 255;
	const png = await encodeCanonicalMeadowEntryPng(
		normalized.data,
		input.policy.width,
		input.policy.height
	);
	assertHardBudget(png, input.policy.baseHardBytes, 'base');
	return {
		png,
		provenance: planeProvenance(
			png,
			input.generation,
			input.transform,
			input.refinements,
			input.preRefinementCandidatePng
		)
	};
}

export async function finalizeMeadowEntryForeground(
	input: FinalizeMeadowEntryForegroundInput
): Promise<{ png: Buffer; provenance: FinalizedPlaneProvenance }> {
	assertContext(input);
	validateMeadowEntryGenerationProvenance(input.generation);
	assertRefinements(
		input.refinements,
		'foreground',
		input.candidatePng,
		input.preRefinementCandidatePng
	);
	const [normalized, eligible, protectedMask] = await Promise.all([
		normalizeMeadowEntryMasterCandidate(input.candidatePng, input.transform, input.policy),
		decodeMask(input.eligibleMaskPng, input.policy, 'eligible'),
		decodeMask(input.protectedMaskPng, input.policy, 'protected')
	]);
	for (let index = 0; index < normalized.data.length; index += 4) {
		const eligiblePixel = eligible.data[index + 3] !== 0;
		const protectedPixel = protectedMask.data[index + 3] !== 0;
		if (!eligiblePixel || protectedPixel || normalized.data[index + 3] === 0) {
			normalized.data.fill(0, index, index + 4);
		}
	}
	const png = await encodeCanonicalMeadowEntryPng(
		normalized.data,
		input.policy.width,
		input.policy.height
	);
	assertHardBudget(png, input.policy.foregroundHardBytes, 'foreground');
	return {
		png,
		provenance: planeProvenance(
			png,
			input.generation,
			input.transform,
			input.refinements,
			input.preRefinementCandidatePng
		)
	};
}

function assertCombinedContext(
	base: FinalizeMeadowEntryBaseInput,
	foreground: FinalizeMeadowEntryForegroundInput
): void {
	assert(
		base.policy.width === foreground.policy.width &&
			base.policy.height === foreground.policy.height &&
			base.policy.baseReviewBytes === foreground.policy.baseReviewBytes &&
			base.policy.baseHardBytes === foreground.policy.baseHardBytes &&
			base.policy.foregroundReviewBytes === foreground.policy.foregroundReviewBytes &&
			base.policy.foregroundHardBytes === foreground.policy.foregroundHardBytes,
		'Meadow Entry base and foreground policies must match'
	);
	assert(
		base.controlFingerprint === foreground.controlFingerprint &&
			base.approvedControlFingerprint === foreground.approvedControlFingerprint &&
			base.storageConfigurationSha256 === foreground.storageConfigurationSha256 &&
			base.approvedStorageConfigurationSha256 === foreground.approvedStorageConfigurationSha256,
		'Meadow Entry base and foreground finalization contexts must match'
	);
	assert(
		base.predecessor.approvedBaseSha256 === foreground.predecessor.approvedBaseSha256 &&
			base.predecessor.approvedForegroundSha256 ===
				foreground.predecessor.approvedForegroundSha256 &&
			base.predecessor.basePng.equals(foreground.predecessor.basePng) &&
			base.predecessor.foregroundPng.equals(foreground.predecessor.foregroundPng),
		'Meadow Entry base and foreground predecessor contexts must match'
	);
}

export async function finalizeMeadowEntryMasters(input: {
	base: FinalizeMeadowEntryBaseInput;
	foreground: FinalizeMeadowEntryForegroundInput;
}): Promise<{ basePng: Buffer; foregroundPng: Buffer; provenanceJson: Buffer }> {
	assertCombinedContext(input.base, input.foreground);
	const [base, foreground] = await Promise.all([
		finalizeMeadowEntryBase(input.base),
		finalizeMeadowEntryForeground(input.foreground)
	]);
	const provenance: MeadowEntryMastersProvenance = {
		version: 1,
		policy: input.base.policy,
		controls: {
			fingerprint: input.base.controlFingerprint,
			storageConfigurationSha256: input.base.storageConfigurationSha256
		},
		predecessor: {
			baseSha256: input.base.predecessor.approvedBaseSha256,
			foregroundSha256: input.base.predecessor.approvedForegroundSha256
		},
		base: base.provenance,
		foreground: foreground.provenance
	};
	return {
		basePng: base.png,
		foregroundPng: foreground.png,
		provenanceJson: Buffer.from(`${JSON.stringify(provenance, null, '\t')}\n`)
	};
}
