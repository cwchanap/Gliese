import { describe, expect, it } from 'vitest';

import {
	buildRegionalBackgroundRendererDiagnostic,
	emitRegionalBackgroundRendererDiagnostic,
	REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT,
	type RegionalBackgroundRendererDiagnostic
} from './renderer-diagnostics';

describe('regional background renderer diagnostics', () => {
	it('measures a finite non-negative regional preload-window duration', () => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'webgl',
				maxTextureSize: 4096,
				loadStartedAtMs: 120.25,
				loadCompletedAtMs: 145.75,
				regionalBackgroundLoadCompletions: 1
			}).regionalBackgroundLoadMs
		).toBe(25.5);

		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'webgl',
				maxTextureSize: 4096,
				loadStartedAtMs: 145.75,
				loadCompletedAtMs: 120.25,
				regionalBackgroundLoadCompletions: 1
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
				maxTextureSize: 4096,
				...timestamps,
				regionalBackgroundLoadCompletions: 1
			}).regionalBackgroundLoadMs
		).toBeNull();
	});

	it('never reports a texture limit for the Canvas renderer', () => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'canvas',
				maxTextureSize: 8192,
				loadStartedAtMs: 1,
				loadCompletedAtMs: 2,
				regionalBackgroundLoadCompletions: 1
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
				maxTextureSize: input,
				loadStartedAtMs: 1,
				loadCompletedAtMs: 2,
				regionalBackgroundLoadCompletions: 1
			}).maxTextureSize
		).toBe(expected);
	});

	it.each([
		{ input: 3.9, expected: 3 },
		{ input: -4, expected: 0 },
		{ input: Number.NaN, expected: 0 },
		{ input: Number.POSITIVE_INFINITY, expected: 0 }
	])('normalizes the completion count to a non-negative integer', ({ input, expected }) => {
		expect(
			buildRegionalBackgroundRendererDiagnostic({
				renderer: 'canvas',
				maxTextureSize: null,
				loadStartedAtMs: 1,
				loadCompletedAtMs: 2,
				regionalBackgroundLoadCompletions: input
			}).regionalBackgroundLoadCompletions
		).toBe(expected);
	});

	it('dispatches the exact typed event name with the diagnostic as detail', () => {
		const target = new EventTarget();
		const detail: RegionalBackgroundRendererDiagnostic = {
			renderer: 'webgl',
			maxTextureSize: 4096,
			regionalBackgroundLoadMs: 12.5,
			regionalBackgroundLoadCompletions: 1
		};
		let received: RegionalBackgroundRendererDiagnostic | undefined;

		target.addEventListener(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT, (event) => {
			received = (event as CustomEvent<RegionalBackgroundRendererDiagnostic>).detail;
		});

		emitRegionalBackgroundRendererDiagnostic(detail, target as Window);

		expect(REGIONAL_BACKGROUND_RENDERER_DIAGNOSTIC_EVENT).toBe(
			'gliese:regional-background-renderer-diagnostic'
		);
		expect(received).toBe(detail);
	});

	it('is an SSR-safe no-op when no browser target exists', () => {
		const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
		Reflect.deleteProperty(globalThis, 'window');

		try {
			expect(() =>
				emitRegionalBackgroundRendererDiagnostic({
					renderer: 'canvas',
					maxTextureSize: null,
					regionalBackgroundLoadMs: null,
					regionalBackgroundLoadCompletions: 0
				})
			).not.toThrow();
		} finally {
			if (previousWindow) {
				Object.defineProperty(globalThis, 'window', previousWindow);
			}
		}
	});
});
