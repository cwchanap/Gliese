import { describe, expect, it } from 'vitest';

import {
	assertMeadowEntryRefinementChain,
	assertMeadowEntryRefinementChainTerminal,
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

	it('rejects a non-string tool version', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, toolVersion: 42 })
		).toThrow(/tool version must be a string/i);
	});

	it('rejects a non-object settings record', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, settings: null })
		).toThrow(/settings must be an object/i);
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, settings: [] })
		).toThrow(/settings must be an object/i);
	});

	it('rejects a seed that is not a number, string, or null', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				seed: true as unknown as number
			})
		).toThrow(/seed must be a number, string, or null/i);
	});

	it('rejects a non-boolean seedUnavailable', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				seedUnavailable: 'yes' as unknown as boolean
			})
		).toThrow(/seedUnavailable must be a boolean/i);
	});

	it('rejects a non-boolean byteReproducibleGeneration', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				byteReproducibleGeneration: 1 as unknown as boolean
			})
		).toThrow(/byteReproducibleGeneration must be a boolean/i);
	});

	it('rejects a non-string provider', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				provider: 42 as unknown as string
			})
		).toThrow(/provider must be a string or null/i);
	});

	it('rejects a non-string model', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({ ...baseGenerative, model: 42 as unknown as string })
		).toThrow(/model must be a string or null/i);
	});

	it('rejects a non-string model version', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				modelVersion: 42 as unknown as string
			})
		).toThrow(/model version must be a string or null/i);
	});

	it('rejects a non-string prompt', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				prompt: 42 as unknown as string
			})
		).toThrow(/prompt must be a string or null/i);
	});

	it('rejects a non-string prompt hash', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				promptSha256: 42 as unknown as string
			})
		).toThrow(/prompt hash must be a string or null/i);
	});

	it('rejects a manual record that includes a seed', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'manual',
				provider: null,
				model: null,
				modelVersion: null,
				tool: 'manual-paint',
				toolVersion: '1',
				settings: {},
				seed: 123,
				seedUnavailable: false,
				prompt: null,
				promptSha256: null,
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			})
		).toThrow(/must not include generation fields/i);
	});

	it('rejects a manual record that declares seedUnavailable', () => {
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
				seedUnavailable: true,
				prompt: null,
				promptSha256: null,
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			})
		).toThrow(/must not include generation fields/i);
	});

	it('rejects a manual record that includes a prompt hash', () => {
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
				promptSha256: 'a'.repeat(64),
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			})
		).toThrow(/must not include generation fields/i);
	});

	it('rejects a manual record that includes a model', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'manual',
				provider: null,
				model: 'something',
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

	it('rejects a manual record that includes a model version', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				mode: 'manual',
				provider: null,
				model: null,
				modelVersion: '1.0',
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

	it('rejects a manual record that includes a prompt', () => {
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
				prompt: 'text',
				promptSha256: null,
				referenceImageSha256: [],
				byteReproducibleGeneration: false
			})
		).toThrow(/must not include generation fields/i);
	});

	it('accepts a generative record with a string seed', () => {
		expect(() =>
			validateMeadowEntryGenerationProvenance({
				...baseGenerative,
				seed: 'abc123',
				seedUnavailable: false
			})
		).not.toThrow();
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

	it('rejects a transform missing the crop object', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: { ...validRefinement.transform, crop: null }
			})
		).toThrow(/transform crop must be an object/i);
	});

	it('rejects a transform missing the output object', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: { ...validRefinement.transform, output: null }
			})
		).toThrow(/transform output must be an object/i);
	});

	it('rejects a transform that is not an object', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, transform: null })
		).toThrow(/transform must be an object/i);
	});

	it('rejects changed bounds that is not an object', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, changedBounds: null })
		).toThrow(/changed bounds must be an object/i);
	});

	it('rejects non-integer changed bounds top', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				changedBounds: { left: 0, top: 0.5, right: 64, bottom: 64 }
			})
		).toThrow(/changed bounds top must be an integer/i);
	});

	it('rejects non-integer changed bounds right', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				changedBounds: { left: 0, top: 0, right: 64.5, bottom: 64 }
			})
		).toThrow(/changed bounds right must be an integer/i);
	});

	it('rejects non-integer changed bounds bottom', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				changedBounds: { left: 0, top: 0, right: 64, bottom: 64.5 }
			})
		).toThrow(/changed bounds bottom must be an integer/i);
	});

	it('rejects non-integer native width', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					native: { width: 1.5, height: 6400 }
				}
			})
		).toThrow(/native width must be an integer/i);
	});

	it('rejects non-integer native height', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					native: { width: 6400, height: 1.5 }
				}
			})
		).toThrow(/native height must be an integer/i);
	});

	it('rejects non-integer crop left', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					crop: { left: 0.5, top: 0, width: 6400, height: 6400 }
				}
			})
		).toThrow(/crop left must be an integer/i);
	});

	it('rejects non-integer crop top', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					crop: { left: 0, top: 0.5, width: 6400, height: 6400 }
				}
			})
		).toThrow(/crop top must be an integer/i);
	});

	it('rejects non-integer crop width', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					crop: { left: 0, top: 0, width: 1.5, height: 6400 }
				}
			})
		).toThrow(/crop width must be an integer/i);
	});

	it('rejects non-integer crop height', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					crop: { left: 0, top: 0, width: 6400, height: 1.5 }
				}
			})
		).toThrow(/crop height must be an integer/i);
	});

	it('rejects non-integer output width', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					output: { width: 1.5, height: 6400 }
				}
			})
		).toThrow(/output width must be an integer/i);
	});

	it('rejects non-integer output height', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: {
					...validRefinement.transform,
					output: { width: 6400, height: 1.5 }
				}
			})
		).toThrow(/output height must be an integer/i);
	});

	it('rejects a non-number scale', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				transform: { ...validRefinement.transform, scale: '1' as unknown as number }
			})
		).toThrow(/transform scale must be a finite number/i);
	});

	it('rejects a non-string editMaskSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, editMaskSha256: 42 })
		).toThrow(/editMaskSha256 must be a string/i);
	});

	it('rejects a non-string replacementSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, replacementSha256: 42 })
		).toThrow(/replacementSha256 must be a string/i);
	});

	it('rejects a non-string beforeMasterSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, beforeMasterSha256: 42 })
		).toThrow(/beforeMasterSha256 must be a string/i);
	});

	it('rejects a non-string afterMasterSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, afterMasterSha256: 42 })
		).toThrow(/afterMasterSha256 must be a string/i);
	});

	it('rejects a malformed editMaskSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, editMaskSha256: 'not-a-hash' })
		).toThrow(/edit mask hash must be a lowercase SHA-256/i);
	});

	it('rejects a malformed replacementSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				replacementSha256: 'not-a-hash'
			})
		).toThrow(/replacement hash must be a lowercase SHA-256/i);
	});

	it('rejects a malformed beforeMasterSha256', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				beforeMasterSha256: 'not-a-hash'
			})
		).toThrow(/before master hash must be a lowercase SHA-256/i);
	});

	it('rejects non-array affected crop ids', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({ ...validRefinement, affectedCropIds: 'crop-1' })
		).toThrow(/affected crop ids must be an array of strings/i);
	});

	it('rejects non-string entries in source region ids', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				sourceRegionIds: ['crossroads', 42 as unknown as string]
			})
		).toThrow(/source region ids must be an array of strings/i);
	});

	it('rejects non-string entries in affected crop ids', () => {
		expect(() =>
			validateMeadowEntryRefinementProvenance({
				...validRefinement,
				affectedCropIds: ['crop-1', 42 as unknown as string]
			})
		).toThrow(/affected crop ids must be an array of strings/i);
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

describe('meadow-entry refinement chain terminal binding', () => {
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

	it('accepts an empty refinement list without checking the master hash', () => {
		expect(() =>
			assertMeadowEntryRefinementChainTerminal([], 'base', '0'.repeat(64))
		).not.toThrow();
	});

	it('accepts a single refinement whose afterMasterSha256 matches the approved master', () => {
		const masterSha256 = 'd'.repeat(64);
		expect(() =>
			assertMeadowEntryRefinementChainTerminal(
				[refinement('base', 'c'.repeat(64), masterSha256)],
				'base',
				masterSha256
			)
		).not.toThrow();
	});

	it('accepts a multi-record chain whose final afterMasterSha256 matches the approved master', () => {
		const masterSha256 = 'f'.repeat(64);
		const records = [
			refinement('base', 'c'.repeat(64), 'd'.repeat(64)),
			refinement('base', 'd'.repeat(64), 'e'.repeat(64)),
			refinement('base', 'e'.repeat(64), masterSha256)
		];
		expect(() =>
			assertMeadowEntryRefinementChainTerminal(records, 'base', masterSha256)
		).not.toThrow();
	});

	it('rejects a detached final hash that does not match the approved master', () => {
		const masterSha256 = 'f'.repeat(64);
		const detachedAfter = 'e'.repeat(64);
		const records = [
			refinement('base', 'c'.repeat(64), 'd'.repeat(64)),
			refinement('base', 'd'.repeat(64), detachedAfter)
		];
		expect(() => assertMeadowEntryRefinementChainTerminal(records, 'base', masterSha256)).toThrow(
			/base final refinement does not match the approved master/i
		);
	});

	it('rejects a single refinement whose afterMasterSha256 does not match the approved master', () => {
		expect(() =>
			assertMeadowEntryRefinementChainTerminal(
				[refinement('base', 'c'.repeat(64), 'd'.repeat(64))],
				'base',
				'e'.repeat(64)
			)
		).toThrow(/base final refinement does not match the approved master/i);
	});

	it('includes the foreground plane label in the error message', () => {
		expect(() =>
			assertMeadowEntryRefinementChainTerminal(
				[refinement('foreground', 'c'.repeat(64), 'd'.repeat(64))],
				'foreground',
				'e'.repeat(64)
			)
		).toThrow(/foreground final refinement does not match the approved master/i);
	});
});
