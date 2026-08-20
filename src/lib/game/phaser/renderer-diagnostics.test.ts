import { describe, expect, it } from 'vitest';

import {
	buildRegionalBackgroundRendererDiagnostic,
	emitRegionalBackgroundRendererDiagnostic,
	REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT,
	type RegionalBackgroundRendererDiagnostic
} from './renderer-diagnostics';

const rendererInput = {
	packageIds: ['ruins-review', 'hero-house-review', 'ruins-review'],
	requiredAssetKeys: ['ruins-base', 'hero-house-base', 'ruins-base'],
	completedAssetKeys: ['hero-house-base']
} as const;

describe('regional background renderer diagnostics', () => {
	it('sorts and deduplicates package and asset inventories', () => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'webgl',
				...rendererInput,
				maxTextureSize: 4096,
				loadStartedAtMs: 10,
				loadCompletedAtMs: 25
			})
		).toEqual({
			renderer: 'webgl',
			packageIds: ['hero-house-review', 'ruins-review'],
			requiredAssetKeys: ['hero-house-base', 'ruins-base'],
			completedAssetKeys: ['hero-house-base'],
			maxTextureSize: 4096,
			regionalBackgroundLoadMs: 15
		});
	});

	it('clamps a reversed finite preload window to zero', () => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'webgl',
				...rendererInput,
				maxTextureSize: 4096,
				loadStartedAtMs: 25,
				loadCompletedAtMs: 10
			}).regionalBackgroundLoadMs
		).toBe(0);
	});

	it.each([
		{ loadStartedAtMs: null, loadCompletedAtMs: 10 },
		{ loadStartedAtMs: 10, loadCompletedAtMs: null },
		{ loadStartedAtMs: Number.NaN, loadCompletedAtMs: 10 },
		{ loadStartedAtMs: 10, loadCompletedAtMs: Number.POSITIVE_INFINITY }
	])('reports no duration for missing or non-finite timestamps', (timestamps) => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'webgl',
				...rendererInput,
				maxTextureSize: 4096,
				...timestamps
			}).regionalBackgroundLoadMs
		).toBeNull();
	});

	it('never reports a texture limit for Canvas', () => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'canvas',
				...rendererInput,
				maxTextureSize: 8192,
				loadStartedAtMs: 1,
				loadCompletedAtMs: 2
			}).maxTextureSize
		).toBeNull();
	});

	it.each([
		{ input: 4096, expected: 4096 },
		{ input: 0, expected: null },
		{ input: -1, expected: null },
		{ input: Number.NaN, expected: null },
		{ input: Number.POSITIVE_INFINITY, expected: null },
		{ input: null, expected: null }
	])('reports only finite positive WebGL texture limits', ({ input, expected }) => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'webgl',
				...rendererInput,
				maxTextureSize: input,
				loadStartedAtMs: 1,
				loadCompletedAtMs: 2
			}).maxTextureSize
		).toBe(expected);
	});

	it('dispatches the typed event with the normalized diagnostic', () => {
		const target = new EventTarget();
		const detail: RegionalBackgroundRendererDiagnostic = {
			renderer: 'webgl',
			packageIds: ['hero-house-review'],
			requiredAssetKeys: ['hero-house-base'],
			completedAssetKeys: ['hero-house-base'],
			maxTextureSize: 4096,
			regionalBackgroundLoadMs: 12.5
		};
		let received: RegionalBackgroundRendererDiagnostic | undefined;

		target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			received = (event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail;
		});

		emitRegionalBackgroundRendererDiagnostic(detail, target as Window);

		expect(received).toBe(detail);
		expect(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT).toBe(
			'gliese:regional-background-renderer-diagnostic'
		);
	});

	it('is an SSR-safe no-op when no browser target exists', () => {
		const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
		Reflect.deleteProperty(globalThis, 'window');

		try {
			expect(() =>
				emitRegionalBackgroundRendererDiagnostic({
					renderer: 'canvas',
					packageIds: [],
					requiredAssetKeys: [],
					completedAssetKeys: [],
					maxTextureSize: null,
					regionalBackgroundLoadMs: null
				})
			).not.toThrow();
		} finally {
			if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
		}
	});
});
