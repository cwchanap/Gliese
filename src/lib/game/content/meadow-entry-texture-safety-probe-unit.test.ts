import { describe, expect, it } from 'vitest';

import {
	EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
	classifyFailureScope,
	decideTextureSafety,
	meadowEntryTextureSafetyAssets,
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

describe('meadowEntryTextureSafetyAssets', () => {
	it('maps every approved export to a texture-safety asset with an id:plane key', () => {
		expect(meadowEntryTextureSafetyAssets).toHaveLength(EXPECTED_MEADOW_ENTRY_EXPORT_COUNT);
		for (const asset of meadowEntryTextureSafetyAssets) {
			expect(asset.id).toMatch(/^.+:(base|foreground)$/);
			expect(asset.path).toBeTruthy();
			expect(asset.width).toBeGreaterThan(0);
			expect(asset.height).toBeGreaterThan(0);
		}
	});

	it('produces unique ids across all assets', () => {
		const ids = new Set(meadowEntryTextureSafetyAssets.map(({ id }) => id));
		expect(ids.size).toBe(meadowEntryTextureSafetyAssets.length);
	});
});

describe('decideTextureSafety', () => {
	it('returns proceed when all assets uploaded and retained without context loss', () => {
		expect(
			decideTextureSafety({
				assetCount: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				successfulUploads: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				contextLost: false
			})
		).toBe('proceed');
	});

	it('returns stop when asset count does not match expected', () => {
		expect(
			decideTextureSafety({
				assetCount: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT - 1,
				successfulUploads: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				contextLost: false
			})
		).toBe('stop');
	});

	it('returns stop when not all uploads succeeded', () => {
		expect(
			decideTextureSafety({
				assetCount: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				successfulUploads: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT - 1,
				retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				contextLost: false
			})
		).toBe('stop');
	});

	it('returns stop when not all textures were retained', () => {
		expect(
			decideTextureSafety({
				assetCount: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				successfulUploads: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT - 1,
				contextLost: false
			})
		).toBe('stop');
	});

	it('returns stop when context was lost', () => {
		expect(
			decideTextureSafety({
				assetCount: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				successfulUploads: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				contextLost: true
			})
		).toBe('stop');
	});

	it('returns stop when contextLost is null (unknown)', () => {
		expect(
			decideTextureSafety({
				assetCount: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				successfulUploads: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				retainedTextures: EXPECTED_MEADOW_ENTRY_EXPORT_COUNT,
				contextLost: null
			})
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
