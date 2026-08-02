import { describe, expect, it } from 'vitest';

import { validateMeadowEntryGenerationProvenance } from './meadow-entry-master-provenance';

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
});
