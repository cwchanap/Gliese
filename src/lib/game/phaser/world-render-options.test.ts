import { describe, expect, it } from 'vitest';

import { parseWorldRenderOptions, resolveWorldRenderOptions } from './world-render-options';

describe('world render URL options', () => {
	it('enables regional backgrounds and disables collision debug by default', () => {
		expect(parseWorldRenderOptions('')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			meadowPaintedPilotOff: false,
			mapBackgroundReviewIds: [],
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('parses valid repeated generic review package IDs once in first-seen order', () => {
		const options = parseWorldRenderOptions(
			'?mapBackgroundReview=hero-house-review&mapBackgroundReview=ruins-core-review&mapBackgroundReview=hero-house-review'
		);
		expect(options.mapBackgroundReviewIds).toEqual(['hero-house-review', 'ruins-core-review']);
		expect(Object.isFrozen(options.mapBackgroundReviewIds)).toBe(true);
	});

	it.each(['', 'Hero-house-review', 'hero/house-review', 'hero-house-review%20'])(
		'rejects invalid generic review package ID %j',
		(value) => {
			expect(
				parseWorldRenderOptions(`?mapBackgroundReview=${value}`).mapBackgroundReviewIds
			).toEqual([]);
		}
	);

	it('disables regional backgrounds only for the exact off value', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off')).toMatchObject({
			regionalBackgrounds: false,
			mapBackgroundReviewIds: []
		});
	});

	it('enables collision debug only for the exact collision value', () => {
		expect(parseWorldRenderOptions('?mapDebug=collision')).toMatchObject({
			regionalBackgrounds: true,
			collisionDebug: true,
			mapBackgroundReviewIds: []
		});
	});

	it('combines background fallback and collision debug', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off&mapDebug=collision')).toMatchObject({
			regionalBackgrounds: false,
			collisionDebug: true,
			mapBackgroundReviewIds: []
		});
	});

	it('preserves defaults for unknown parameter values', () => {
		expect(parseWorldRenderOptions('?regionalBackground=OFF&mapDebug=collisions')).toMatchObject({
			regionalBackgrounds: true,
			collisionDebug: false,
			mapBackgroundReviewIds: []
		});
	});

	it('enables collision debug and movement diagnostics only for exact values', () => {
		expect(parseWorldRenderOptions('?mapDebug=collision&movementDiagnostics=on')).toMatchObject({
			collisionDebug: true,
			movementDiagnostics: true
		});
		expect(parseWorldRenderOptions('?mapDebug=collisions&movementDiagnostics=ON')).toMatchObject({
			collisionDebug: false,
			movementDiagnostics: false
		});
	});

	it('parses exact painted Meadow on and off overrides separately', () => {
		expect(parseWorldRenderOptions('?meadowPaintedPilot=on')).toMatchObject({
			meadowPaintedPilot: true,
			meadowPaintedPilotOff: false
		});
		expect(parseWorldRenderOptions('?meadowPaintedPilot=off')).toMatchObject({
			meadowPaintedPilot: false,
			meadowPaintedPilotOff: true
		});

		for (const value of ['', 'ON', 'OFF', 'true', '1']) {
			expect(parseWorldRenderOptions(`?meadowPaintedPilot=${value}`)).toMatchObject({
				meadowPaintedPilot: false,
				meadowPaintedPilotOff: false
			});
		}
	});

	it('preserves regional-background off priority over the legacy pilot alias', () => {
		expect(parseWorldRenderOptions('?meadowPaintedPilot=on&regionalBackground=off')).toMatchObject({
			regionalBackgrounds: false,
			meadowPaintedPilot: true
		});
	});

	it('uses the first value for repeated legacy parameters', () => {
		expect(
			parseWorldRenderOptions('?regionalBackground=on&regionalBackground=off').regionalBackgrounds
		).toBe(true);
		expect(
			parseWorldRenderOptions('?regionalBackground=off&regionalBackground=on').regionalBackgrounds
		).toBe(false);
		expect(
			parseWorldRenderOptions('?meadowPaintedPilot=on&meadowPaintedPilot=off').meadowPaintedPilot
		).toBe(true);
		expect(
			parseWorldRenderOptions('?meadowPaintedPilot=off&meadowPaintedPilot=on').meadowPaintedPilot
		).toBe(false);
		expect(
			parseWorldRenderOptions(
				'?mapBackgroundReview=hero-house-review&mapBackgroundReview=ruins-core-review'
			).mapBackgroundReviewIds
		).toEqual(['hero-house-review', 'ruins-core-review']);
	});

	it('enables movement diagnostics only for the exact on value', () => {
		expect(parseWorldRenderOptions('?movementDiagnostics=on')).toMatchObject({
			regionalBackgrounds: true,
			movementDiagnostics: true
		});
		expect(parseWorldRenderOptions('?movementDiagnostics=off')).toMatchObject({
			regionalBackgrounds: true,
			movementDiagnostics: false
		});
		expect(parseWorldRenderOptions('?movementDiagnostics=ON')).toMatchObject({
			regionalBackgrounds: true,
			movementDiagnostics: false
		});
	});

	it('resolves options through an injected search reader', () => {
		expect(
			resolveWorldRenderOptions(() => '?regionalBackground=off&mapDebug=collision')
		).toMatchObject({
			regionalBackgrounds: false,
			collisionDebug: true,
			mapBackgroundReviewIds: []
		});
	});

	it('parses a typed per-descriptor render fault and rejects malformed values', () => {
		expect(
			parseWorldRenderOptions('?regionalBackgroundFault=sundrop-village-foreground-image:render')
				.regionalBackgroundFault
		).toEqual({ backgroundId: 'sundrop-village-foreground-image', mode: 'render' });
		for (const search of [
			'?regionalBackgroundFault=',
			'?regionalBackgroundFault=:render',
			'?regionalBackgroundFault=base:render:extra',
			'?regionalBackgroundFault=background',
			'?regionalBackgroundFault=base:missing',
			'?regionalBackgroundFault=base:load'
		]) {
			expect(parseWorldRenderOptions(search).regionalBackgroundFault).toBeNull();
		}
	});
});
