import type { PixelBounds } from './meadow-entry-authoring-types';

export interface MeadowEntryGenerationProvenance {
	mode: 'generative' | 'manual';
	provider: string | null;
	model: string | null;
	modelVersion: string | null;
	tool: string;
	toolVersion: string;
	settings: Readonly<Record<string, unknown>>;
	seed: number | string | null;
	seedUnavailable: boolean;
	prompt: string | null;
	promptSha256: string | null;
	referenceImageSha256: readonly string[];
	byteReproducibleGeneration: boolean;
}

export interface MeadowEntryNormalizationTransform {
	native: { width: number; height: number };
	crop: { left: number; top: number; width: number; height: number };
	output: { width: number; height: number };
	scale: number;
}

export interface MeadowEntryRefinementProvenance {
	plane: 'base' | 'foreground';
	sourceRegionIds: readonly string[];
	editMaskSha256: string;
	replacementSha256: string;
	beforeMasterSha256: string;
	afterMasterSha256: string;
	changedBounds: PixelBounds;
	affectedCropIds: readonly string[];
	transform: MeadowEntryNormalizationTransform;
}

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const BYTE_REPRODUCIBILITY_CAPABILITY_SETTING = 'providerSupportsByteReproducibleGeneration';

function assertNonEmptyString(value: string | null, label: string): asserts value is string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Meadow Entry generation provenance requires ${label}`);
	}
}

function assertSha256(value: string, label: string): void {
	if (!SHA256_PATTERN.test(value)) {
		throw new Error(`Meadow Entry generation provenance ${label} must be a lowercase SHA-256 hash`);
	}
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertStringOrNull(value: unknown, label: string): asserts value is string | null {
	if (value !== null && typeof value !== 'string') {
		throw new Error(`Meadow Entry generation provenance ${label} must be a string or null`);
	}
}

function assertStringArray(value: unknown, label: string): asserts value is string[] {
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(`Meadow Entry generation provenance ${label} must be an array of strings`);
	}
}

function assertInteger(value: unknown, label: string): asserts value is number {
	if (!Number.isInteger(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be an integer`);
	}
}

function assertFiniteNumber(value: unknown, label: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be a finite number`);
	}
}

function assertPixelBounds(value: unknown, label: string): void {
	if (!isPlainObject(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be an object`);
	}
	assertInteger(value.left, `${label} left`);
	assertInteger(value.top, `${label} top`);
	assertInteger(value.right, `${label} right`);
	assertInteger(value.bottom, `${label} bottom`);
}

function assertNormalizationTransformShape(value: unknown, label: string): void {
	if (!isPlainObject(value)) {
		throw new Error(`Meadow Entry refinement provenance ${label} must be an object`);
	}
	const native = value.native;
	const crop = value.crop;
	const output = value.output;
	if (!isPlainObject(native)) {
		throw new Error(`Meadow Entry refinement provenance ${label} native must be an object`);
	}
	if (!isPlainObject(crop)) {
		throw new Error(`Meadow Entry refinement provenance ${label} crop must be an object`);
	}
	if (!isPlainObject(output)) {
		throw new Error(`Meadow Entry refinement provenance ${label} output must be an object`);
	}
	assertInteger(native.width, `${label} native width`);
	assertInteger(native.height, `${label} native height`);
	assertInteger(crop.left, `${label} crop left`);
	assertInteger(crop.top, `${label} crop top`);
	assertInteger(crop.width, `${label} crop width`);
	assertInteger(crop.height, `${label} crop height`);
	assertInteger(output.width, `${label} output width`);
	assertInteger(output.height, `${label} output height`);
	assertFiniteNumber(value.scale, `${label} scale`);
}

export function validateMeadowEntryGenerationProvenance(value: unknown): void {
	if (!isPlainObject(value)) {
		throw new Error('Meadow Entry generation provenance must be an object');
	}
	if (value.mode !== 'manual' && value.mode !== 'generative') {
		throw new Error("Meadow Entry generation provenance mode must be 'manual' or 'generative'");
	}
	if (typeof value.tool !== 'string') {
		throw new Error('Meadow Entry generation provenance tool must be a string');
	}
	if (typeof value.toolVersion !== 'string') {
		throw new Error('Meadow Entry generation provenance tool version must be a string');
	}
	if (!isPlainObject(value.settings)) {
		throw new Error('Meadow Entry generation provenance settings must be an object');
	}
	assertStringOrNull(value.provider, 'provider');
	assertStringOrNull(value.model, 'model');
	assertStringOrNull(value.modelVersion, 'model version');
	assertStringOrNull(value.prompt, 'prompt');
	assertStringOrNull(value.promptSha256, 'prompt hash');
	if (value.seed !== null && typeof value.seed !== 'number' && typeof value.seed !== 'string') {
		throw new Error('Meadow Entry generation provenance seed must be a number, string, or null');
	}
	if (typeof value.seedUnavailable !== 'boolean') {
		throw new Error('Meadow Entry generation provenance seedUnavailable must be a boolean');
	}
	if (typeof value.byteReproducibleGeneration !== 'boolean') {
		throw new Error(
			'Meadow Entry generation provenance byteReproducibleGeneration must be a boolean'
		);
	}
	assertStringArray(value.referenceImageSha256, 'reference image hashes');
	for (const hash of value.referenceImageSha256) {
		assertSha256(hash, 'reference image hash');
	}

	assertNonEmptyString(value.tool, 'tool');
	assertNonEmptyString(value.toolVersion, 'tool version');

	if (value.mode === 'manual') {
		if (
			value.provider !== null ||
			value.model !== null ||
			value.modelVersion !== null ||
			value.seed !== null ||
			value.prompt !== null ||
			value.promptSha256 !== null ||
			value.seedUnavailable
		) {
			throw new Error(
				'Manual Meadow Entry generation provenance must not include generation fields'
			);
		}
		return;
	}

	assertNonEmptyString(value.provider, 'provider');
	assertNonEmptyString(value.model, 'model');
	assertNonEmptyString(value.modelVersion, 'model version');
	assertNonEmptyString(value.prompt, 'prompt');
	if (value.promptSha256 === null) {
		throw new Error('Meadow Entry generation provenance requires a prompt hash');
	}
	assertSha256(value.promptSha256, 'prompt hash');

	if (value.seed === null && !value.seedUnavailable) {
		throw new Error('Seedless Meadow Entry generation provenance must declare seedUnavailable');
	}
	if (value.seed !== null && value.seedUnavailable) {
		throw new Error('Seeded Meadow Entry generation provenance cannot declare seedUnavailable');
	}
	if (value.byteReproducibleGeneration) {
		if (value.seed === null || value.seedUnavailable) {
			throw new Error('Seedless Meadow Entry generation cannot claim byte-reproducible output');
		}
		if (value.settings[BYTE_REPRODUCIBILITY_CAPABILITY_SETTING] !== true) {
			throw new Error(
				'Meadow Entry generation cannot claim byte-reproducible output without a provider capability declaration'
			);
		}
	}
}

export function validateMeadowEntryRefinementProvenance(value: unknown): void {
	if (!isPlainObject(value)) {
		throw new Error('Meadow Entry refinement provenance must be an object');
	}
	if (value.plane !== 'base' && value.plane !== 'foreground') {
		throw new Error("Meadow Entry refinement provenance plane must be 'base' or 'foreground'");
	}
	assertStringArray(value.sourceRegionIds, 'source region ids');
	assertStringArray(value.affectedCropIds, 'affected crop ids');
	if (typeof value.editMaskSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance editMaskSha256 must be a string');
	}
	if (typeof value.replacementSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance replacementSha256 must be a string');
	}
	if (typeof value.beforeMasterSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance beforeMasterSha256 must be a string');
	}
	if (typeof value.afterMasterSha256 !== 'string') {
		throw new Error('Meadow Entry refinement provenance afterMasterSha256 must be a string');
	}
	assertSha256(value.editMaskSha256, 'edit mask hash');
	assertSha256(value.replacementSha256, 'replacement hash');
	assertSha256(value.beforeMasterSha256, 'before master hash');
	assertSha256(value.afterMasterSha256, 'after master hash');
	assertPixelBounds(value.changedBounds, 'changed bounds');
	assertNormalizationTransformShape(value.transform, 'transform');
}

export function assertMeadowEntryRefinementChain(
	refinements: readonly MeadowEntryRefinementProvenance[],
	plane: 'base' | 'foreground'
): void {
	for (let index = 0; index < refinements.length - 1; index += 1) {
		const current = refinements[index]!;
		const next = refinements[index + 1]!;
		if (current.afterMasterSha256 !== next.beforeMasterSha256) {
			throw new Error(
				`Meadow Entry ${plane} refinement ${index + 1} beforeMasterSha256 does not match refinement ${index} afterMasterSha256`
			);
		}
	}
}
