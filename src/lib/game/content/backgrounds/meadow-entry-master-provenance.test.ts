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
});
