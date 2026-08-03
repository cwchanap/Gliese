import { describe, expect, it } from 'vitest';

import {
	assertMeadowEntryRefinementChain,
	validateMeadowEntryGenerationProvenance,
	validateMeadowEntryRefinementProvenance
} from './meadow-entry-master-provenance';
import type { MeadowEntryRefinementProvenance } from './meadow-entry-master-provenance';

describe('meadow-entry generation provenance', () => {
	it('accepts a generative record when the provider exposes no seed', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'generative',
				provider: 'approved-provider',
				model: 'approved-model',
				modelVersion: '2026-07-30',
				tool: 'image-client',
				toolVersion: '1.0.0',
				settings: { width: 2048, height: 2048 },
				seed: null,
				seedUnavailable: true,
				prompt: 'orthographic meadow-entry master',
				promptSha256: 'a'.repeat(64),
				referenceImageSha256: ['b'.repeat(64)],
				byteReproducibleGeneration: false
			})
		).not.toThrow();
	});

	it('accepts manual production with no seed semantics', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'manual',
				provider: null,
				model: null,
				modelVersion: null,
				tool: 'manual-paint',
				toolVersion: '1',
				settings: {},
				seed: null,
				seedUnavailable: false,
				prompt: null,
				promptSha256: null,
				referenceImageSha256: [],
				byteReproducibleGeneration: true
			})
		).not.toThrow();
	});

	it('rejects a false byte-reproducibility claim for a seedless model', () => {
		const invalid = {
			mode: 'generative' as const,
			provider: 'approved-provider',
			model: 'approved-model',
			modelVersion: '2026-07-30',
			tool: 'image-client',
			toolVersion: '1.0.0',
			settings: {},
			seed: null,
			seedUnavailable: true,
			prompt: 'orthographic meadow-entry master',
			promptSha256: 'a'.repeat(64),
			referenceImageSha256: [],
			byteReproducibleGeneration: true
		};
		expect(() => validateMeadowEntryGenerationProvenance(invalid)).toThrow(/byte-reproducible/i);
	});

	it('rejects a byte-reproducibility claim for a seeded provider without a capability declaration', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'generative',
				provider: 'unsupported-provider',
				model: 'seeded-model',
				modelVersion: '2026-07-30',
				tool: 'image-client',
				toolVersion: '1.0.0',
				settings: {},
				seed: 12345,
				seedUnavailable: false,
				prompt: 'orthographic meadow-entry master',
				promptSha256: 'a'.repeat(64),
				referenceImageSha256: [],
				byteReproducibleGeneration: true
			})
		).toThrow(/byte-reproducible.*capability/i);
	});

	const baseGenerative = {
		mode: 'generative' as const,
		provider: 'approved-provider',
		model: 'approved-model',
		modelVersion: '2026-07-30',
		tool: 'image-client',
		toolVersion: '1.0.0',
		settings: {} as Readonly<Record<string, unknown>>,
		seed: null as number | string | null,
		seedUnavailable: true,
		prompt: 'orthographic meadow-entry master',
		promptSha256: 'a'.repeat(64),
		referenceImageSha256: [] as readonly string[],
		byteReproducibleGeneration: false
	};

	it('rejects a generative record missing a tool', () => {
		expect(() => validateMeadowEntryGenerationProvenance({ ...baseGenerative, tool: '' })).toThrow(
			/requires tool/i
		);
	});

	it('rejects a generative record missing a tool version', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, toolVersion: '' })
		).toThrow(/requires tool version/i);
	});

	it('rejects a generative record with a malformed reference image hash', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				referenceImageSha256: ['not-a-sha256-hash']
			})
		).toThrow(/reference image hash/i);
	});

	it('rejects a manual record that includes generation fields', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'manual',
				provider: 'something',
				model: null,
				modelVersion: null,
				tool: 'manual-paint',
				toolVersion: '1',
				settings: {},
				seed: null,
				seedUnavailable: false,
				prompt: null,
				promptSha256: null,
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			})
		).toThrow(/must not include generation fields/i);
	});

	it('rejects a generative record missing a provider', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, provider: null })
		).toThrow(/requires provider/i);
	});

	it('rejects a generative record missing a model', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, model: null })
		).toThrow(/requires model/i);
	});

	it('rejects a generative record missing a prompt', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, prompt: null })
		).toThrow(/requires prompt/i);
	});

	it('rejects a generative record with a null prompt hash', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, promptSha256: null })
		).toThrow(/requires a prompt hash/i);
	});

	it('rejects a generative record with a malformed prompt hash', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				promptSha256: 'B'.repeat(64)
			})
		).toThrow(/prompt hash must be a lowercase SHA-256/i);
	});

	it('rejects a seedless generative record that does not declare seedUnavailable', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				seed: null,
				seedUnavailable: false
			})
		).toThrow(/must declare seedUnavailable/i);
	});

	it('rejects a seeded generative record that declares seedUnavailable', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				seed: 123,
				seedUnavailable: true
			})
		).toThrow(/cannot declare seedUnavailable/i);
	});

	it('accepts a byte-reproducible generative record with a seed and capability declaration', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				seed: 123,
				seedUnavailable: false,
				byteReproducibleGeneration: true,
				settings: { providerSupportsByteReproducibleGeneration: true }
			})
		).not.toThrow();
	});

	it('rejects a non-object generation provenance record', () => {
		expect(() => validateMeadowEntryGenerationProvenance(null)).toThrow(/must be an object/i);
		expect(() => validateMeadowEntryGenerationProvenance('generative')).toThrow(
			/must be an object/i
		);
	});

	it('rejects an unknown generation mode instead of treating it as generative', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, mode: 'imported' })
		).toThrow(/mode must be 'manual' or 'generative'/i);
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, mode: undefined })
		).toThrow(/mode must be 'manual' or 'generative'/i);
	});

	it('rejects a generation record with a non-string tool', () => {
		expect(() => validateMeadowEntryGenerationProvenance({ ...baseGenerative, tool: 42 })).toThrow(
			/tool must be a string/i
		);
	});

	it('rejects a generation record with non-array referenceImageSha256', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, referenceImageSha256: 'abc' })
		).toThrow(/reference image hashes must be an array of strings/i);
	});
});

describe('meadow-entry refinement provenance', () => {
	const validRefinement = {
		plane: 'base',
		sourceRegionIds: ['crossroads'],
		editMaskSha256: 'a'.repeat(64),
		replacementSha256: 'b'.repeat(64),
		beforeMasterSha256: 'c'.repeat(64),
		afterMasterSha256: 'd'.repeat(64),
		changedBounds: { left: 0, top: 0, right: 64, bottom: 64 },
		affectedCropIds: ['crop-1'],
		transform: {
			native: { width: 6400, height: 6400 },
			crop: { left: 0, top: 0, width: 6400, height: 6400 },
			output: { width: 6400, height: 6400 },
			scale: 1
		}
	};

	it('accepts a well-formed refinement record', () => {
		expect(() => validateMeadowEntryRefinementProvenance(validRefinement)).not.toThrow();
	});

	it('rejects a non-object refinement record', () => {
		expect(() => validateMeadowEntryRefinementProvenance(null)).toThrow(/must be an object/i);
		expect(() => validateMeadowEntryRefinementProvenance([])).toThrow(/must be an object/i);
	});

	it('rejects an unknown plane', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, plane: 'middle' })
		).toThrow(/plane must be 'base' or 'foreground'/i);
	});

	it('rejects a malformed sha256 hash', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				afterMasterSha256: 'not-a-hash'
			})
		).toThrow(/after master hash must be a lowercase SHA-256/i);
	});

	it('rejects non-array source region ids', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, sourceRegionIds: 'crossroads' })
		).toThrow(/source region ids must be an array of strings/i);
	});

	it('rejects non-integer changed bounds', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				changedBounds: { left: 0.5, top: 0, right: 64, bottom: 64 }
			})
		).toThrow(/changed bounds left must be an integer/i);
	});

	it('rejects a transform with a non-finite scale', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: { ...validRefinement.transform, scale: Number.POSITIVE_INFINITY }
			})
		).toThrow(/transform scale must be a finite number/i);
	});

	it('rejects a transform missing the native dimensions object', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: { ...validRefinement.transform, native: null }
			})
		).toThrow(/transform native must be an object/i);
	});
});

describe('meadow-entry refinement chain', () => {
	const chainTransform = {
		native: { width: 2, height: 2 },
		crop: { left: 0, top: 0, width: 2, height: 2 },
		output: { width: 2, height: 2 },
		scale: 1
	};

	function refinement(
		plane: 'base' | 'foreground',
		before: string,
		after: string
	): MeadowEntryRefinementProvenance {
		return {
			plane,
			sourceRegionIds: ['crossroads'],
			editMaskSha256: 'a'.repeat(64),
			replacementSha256: 'b'.repeat(64),
			beforeMasterSha256: before,
			afterMasterSha256: after,
			changedBounds: { left: 0, top: 0, right: 1, bottom: 1 },
			affectedCropIds: ['crop-1'],
			transform: chainTransform
		};
	}

	it('accepts an empty refinement list', () => {
		expect(() => assertMeadowEntryRefinementChain([], 'base')).not.toThrow();
	});

	it('accepts a single refinement record', () => {
		expect(() =>
			assertMeadowEntryRefinementChain([refinement('base', 'c'.repeat(64), 'd'.repeat(64))], 'base')
		).not.toThrow();
	});

	it('accepts a properly linked multi-record chain', () => {
		const records = [
			refinement('base', 'c'.repeat(64), 'd'.repeat(64)),
			refinement('base', 'd'.repeat(64), 'e'.repeat(64)),
			refinement('base', 'e'.repeat(64), 'f'.repeat(64))
		];
		expect(() => assertMeadowEntryRefinementChain(records, 'base')).not.toThrow();
	});

	it('rejects a broken middle link', () => {
		const records = [
			refinement('base', 'c'.repeat(64), 'd'.repeat(64)),
			refinement('base', 'x'.repeat(64), 'e'.repeat(64)),
			refinement('base', 'e'.repeat(64), 'f'.repeat(64))
		];
		expect(() => assertMeadowEntryRefinementChain(records, 'base')).toThrow(
			/refinement 1 beforeMasterSha256 does not match refinement 0 afterMasterSha256/i
		);
	});

	it('rejects reordered records', () => {
		const records = [
			refinement('base', 'e'.repeat(64), 'f'.repeat(64)),
			refinement('base', 'c'.repeat(64), 'd'.repeat(64)),
			refinement('base', 'd'.repeat(64), 'e'.repeat(64))
		];
		expect(() => assertMeadowEntryRefinementChain(records, 'base')).toThrow(
			/refinement 1 beforeMasterSha256 does not match refinement 0 afterMasterSha256/i
		);
	});

	it('includes the plane label in the error message', () => {
		const records = [
			refinement('foreground', 'c'.repeat(64), 'd'.repeat(64)),
			refinement('foreground', 'x'.repeat(64), 'e'.repeat(64))
		];
		expect(() => assertMeadowEntryRefinementChain(records, 'foreground')).toThrow(/foreground/i);
	});
});
