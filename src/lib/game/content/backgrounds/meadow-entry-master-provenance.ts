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

export function validateMeadowEntryGenerationProvenance(
	value: MeadowEntryGenerationProvenance
): void {
	assertNonEmptyString(value.tool, 'tool');
	assertNonEmptyString(value.toolVersion, 'tool version');
	for (const hash of value.referenceImageSha256) {
		assertSha256(hash, 'reference image hash');
	}

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
