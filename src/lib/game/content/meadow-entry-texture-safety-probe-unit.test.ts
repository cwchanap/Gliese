import { describe, expect, it } from 'vitest';

import {
	classifyFailureScope,
	decideTextureSafety,
	message
} from '../../../../tools/probe-meadow-entry-texture-safety';
import type {
	TextureSafetyAssetResult,
	TextureSafetyProbeReport
} from '../../../../tools/probe-meadow-entry-texture-safety';

function assetResult(overrides: Partial<TextureSafetyAssetResult> = {}): TextureSafetyAssetResult {
	return {
		id: 'test:base',
		path: 'game/assets/regions/meadow-entry/test.png',
		width: 256,
		height: 256,
		durationMs: 10,
		success: true,
		failure: null,
		...overrides
	};
}

function report(
	overrides: Partial<Pick<TextureSafetyProbeReport, 'assets' | 'contextLost' | 'probeFailure'>> = {}
): Pick<TextureSafetyProbeReport, 'assets' | 'contextLost' | 'probeFailure'> {
	return {
		assets: [],
		contextLost: false,
		probeFailure: null,
		...overrides
	};
}

const cleanBaseline = {
	label: 'painted-v2-clean-baseline',
	assets: [],
	expectedRetainedTextures: 0
} as const;

const candidateAssets = [
	{
		id: 'painted-v2-crossroads:base',
		path: 'game/assets/regions/meadow-entry-painted-v2/crossroads-base.png',
		width: 3200,
		height: 3200
	},
	{
		id: 'painted-v2-sundrop-village:base',
		path: 'game/assets/regions/meadow-entry-painted-v2/sundrop-village-base.png',
		width: 3200,
		height: 3200
	}
];

describe('texture safety probe inputs', () => {
	it('accepts an injected zero-asset baseline', () => {
		expect(cleanBaseline.assets).toHaveLength(0);
		expect(cleanBaseline.label).toBe('painted-v2-clean-baseline');
		expect(cleanBaseline.expectedRetainedTextures).toBe(0);
	});

	it('keeps injected candidate asset ids unique', () => {
		const ids = new Set(candidateAssets.map(({ id }) => id));
		expect(ids.size).toBe(candidateAssets.length);
	});
});

describe('decideTextureSafety', () => {
	it('returns proceed for the cleaned zero-texture baseline', () => {
		expect(
			decideTextureSafety(cleanBaseline, {
				assetCount: 0,
				successfulUploads: 0,
				retainedTextures: 0,
				contextLost: false
			})
		).toBe('proceed');
	});

	it('returns proceed for an injected candidate with exact expected retention', () => {
		const input = {
			label: 'painted-v2-candidate',
			assets: candidateAssets,
			expectedRetainedTextures: candidateAssets.length
		};
		expect(
			decideTextureSafety(input, {
				assetCount: candidateAssets.length,
				successfulUploads: candidateAssets.length,
				retainedTextures: candidateAssets.length,
				contextLost: false
			})
		).toBe('proceed');
	});

	it('returns stop when retention does not match the injected expectation', () => {
		expect(
			decideTextureSafety(
				{
					...cleanBaseline,
					label: 'painted-v2-candidate',
					assets: candidateAssets,
					expectedRetainedTextures: 1
				},
				{
					assetCount: candidateAssets.length,
					successfulUploads: candidateAssets.length,
					retainedTextures: candidateAssets.length,
					contextLost: false
				}
			)
		).toBe('stop');
	});

	it('returns stop when zero assets use a non-baseline label', () => {
		expect(
			decideTextureSafety(
				{ ...cleanBaseline, label: 'painted-v2-candidate' },
				{
					assetCount: 0,
					successfulUploads: 0,
					retainedTextures: 0,
					contextLost: false
				}
			)
		).toBe('stop');
	});

	it('returns stop when asset count does not match injected assets', () => {
		expect(
			decideTextureSafety(
				{
					...cleanBaseline,
					label: 'painted-v2-candidate',
					assets: candidateAssets,
					expectedRetainedTextures: 2
				},
				{
					assetCount: candidateAssets.length - 1,
					successfulUploads: candidateAssets.length,
					retainedTextures: candidateAssets.length,
					contextLost: false
				}
			)
		).toBe('stop');
	});

	it('returns stop when not all uploads succeeded', () => {
		expect(
			decideTextureSafety(
				{
					...cleanBaseline,
					label: 'painted-v2-candidate',
					assets: candidateAssets,
					expectedRetainedTextures: 2
				},
				{
					assetCount: candidateAssets.length,
					successfulUploads: candidateAssets.length - 1,
					retainedTextures: candidateAssets.length,
					contextLost: false
				}
			)
		).toBe('stop');
	});

	it('returns stop when not all textures were retained', () => {
		expect(
			decideTextureSafety(
				{
					...cleanBaseline,
					label: 'painted-v2-candidate',
					assets: candidateAssets,
					expectedRetainedTextures: 2
				},
				{
					assetCount: candidateAssets.length,
					successfulUploads: candidateAssets.length,
					retainedTextures: candidateAssets.length - 1,
					contextLost: false
				}
			)
		).toBe('stop');
	});

	it('returns stop when context was lost', () => {
		expect(
			decideTextureSafety(
				{
					...cleanBaseline,
					label: 'painted-v2-candidate',
					assets: candidateAssets,
					expectedRetainedTextures: 2
				},
				{
					assetCount: candidateAssets.length,
					successfulUploads: candidateAssets.length,
					retainedTextures: candidateAssets.length,
					contextLost: true
				}
			)
		).toBe('stop');
	});

	it('returns stop when contextLost is null (unknown)', () => {
		expect(
			decideTextureSafety(
				{
					...cleanBaseline,
					label: 'painted-v2-candidate',
					assets: candidateAssets,
					expectedRetainedTextures: 2
				},
				{
					assetCount: candidateAssets.length,
					successfulUploads: candidateAssets.length,
					retainedTextures: candidateAssets.length,
					contextLost: null
				}
			)
		).toBe('stop');
	});
});

describe('classifyFailureScope', () => {
	it('returns probe-setup when probeFailure is set', () => {
		expect(classifyFailureScope(report({ probeFailure: 'server crashed' }))).toBe('probe-setup');
	});

	it('returns individual-asset when any asset failed', () => {
		expect(
			classifyFailureScope(
				report({
					assets: [assetResult({ success: true }), assetResult({ success: false, failure: 'boom' })]
				})
			)
		).toBe('individual-asset');
	});

	it('returns aggregate-only when contextLost is true and no individual asset failed', () => {
		expect(classifyFailureScope(report({ contextLost: true }))).toBe('aggregate-only');
	});

	it('returns aggregate-only when contextLost is null and no individual asset failed', () => {
		expect(classifyFailureScope(report({ contextLost: null }))).toBe('aggregate-only');
	});

	it('returns null when everything is healthy', () => {
		expect(
			classifyFailureScope(
				report({
					assets: [assetResult({ success: true })],
					contextLost: false
				})
			)
		).toBeNull();
	});

	it('prioritises probe-setup over individual-asset failures', () => {
		expect(
			classifyFailureScope(
				report({
					probeFailure: 'setup failed',
					assets: [assetResult({ success: false, failure: 'boom' })]
				})
			)
		).toBe('probe-setup');
	});

	it('prioritises individual-asset over aggregate-only', () => {
		expect(
			classifyFailureScope(
				report({
					assets: [assetResult({ success: false, failure: 'boom' })],
					contextLost: true
				})
			)
		).toBe('individual-asset');
	});
});

describe('message', () => {
	it('extracts the message from an Error instance', () => {
		expect(message(new Error('something broke'))).toBe('something broke');
	});

	it('stringifies non-Error values', () => {
		expect(message('plain string')).toBe('plain string');
		expect(message(42)).toBe('42');
		expect(message({ key: 'value' })).toBe('[object Object]');
		expect(message(null)).toBe('null');
		expect(message(undefined)).toBe('undefined');
	});
});
