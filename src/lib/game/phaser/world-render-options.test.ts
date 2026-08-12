import { describe, expect, it } from 'vitest';

import { parseWorldRenderOptions, resolveWorldRenderOptions } from './world-render-options';

describe('world render URL options', () => {
	it('enables regional backgrounds and disables collision debug by default', () => {
		expect(parseWorldRenderOptions('')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('disables regional backgrounds only for the exact off value', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off')).toEqual({
			regionalBackgrounds: false,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('enables collision debug only for the exact collision value', () => {
		expect(parseWorldRenderOptions('?mapDebug=collision')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: true,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('combines background fallback and collision debug', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off&mapDebug=collision')).toEqual({
			regionalBackgrounds: false,
			meadowPaintedPilot: false,
			collisionDebug: true,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('preserves defaults for unknown parameter values', () => {
		expect(parseWorldRenderOptions('?regionalBackground=OFF&mapDebug=collisions')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('enables the painted Meadow pilot only for the exact on value', () => {
		expect(parseWorldRenderOptions('?meadowPaintedPilot=on')).toMatchObject({
			meadowPaintedPilot: true
		});

		for (const value of ['', 'off', 'ON', 'true', '1']) {
			expect(parseWorldRenderOptions(`?meadowPaintedPilot=${value}`).meadowPaintedPilot).toBe(
				false
			);
		}
	});

	it('preserves the pilot flag while regional-background off remains a resolver priority', () => {
		expect(parseWorldRenderOptions('?meadowPaintedPilot=on&regionalBackground=off')).toMatchObject({
			regionalBackgrounds: false,
			meadowPaintedPilot: true
		});
	});

	it('uses the first value for repeated parameters', () => {
		expect(
			parseWorldRenderOptions(
				'?regionalBackground=on&regionalBackground=off&mapDebug=none&mapDebug=collision'
			)
		).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
		expect(
			parseWorldRenderOptions(
				'?regionalBackground=off&regionalBackground=on&mapDebug=collision&mapDebug=none'
			)
		).toEqual({
			regionalBackgrounds: false,
			meadowPaintedPilot: false,
			collisionDebug: true,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
		expect(
			parseWorldRenderOptions('?meadowPaintedPilot=on&meadowPaintedPilot=off').meadowPaintedPilot
		).toBe(true);
		expect(
			parseWorldRenderOptions('?meadowPaintedPilot=off&meadowPaintedPilot=on').meadowPaintedPilot
		).toBe(false);
	});

	it('enables movement diagnostics only for the exact on value', () => {
		expect(parseWorldRenderOptions('?movementDiagnostics=on')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: true,
			regionalBackgroundFault: null
		});
		expect(parseWorldRenderOptions('?movementDiagnostics=off')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
		expect(parseWorldRenderOptions('?movementDiagnostics=ON')).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('resolves options through an injected search reader', () => {
		const readSearch = () => '?regionalBackground=off&mapDebug=collision';

		expect(resolveWorldRenderOptions(readSearch)).toEqual({
			regionalBackgrounds: false,
			meadowPaintedPilot: false,
			collisionDebug: true,
			movementDiagnostics: false,
			regionalBackgroundFault: null
		});
	});

	it('parses a typed per-descriptor render fault', () => {
		expect(
			parseWorldRenderOptions('?regionalBackgroundFault=sundrop-village-foreground-image:render')
		).toEqual({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			collisionDebug: false,
			movementDiagnostics: false,
			regionalBackgroundFault: {
				backgroundId: 'sundrop-village-foreground-image',
				mode: 'render'
			}
		});
	});

	it.each([
		'?regionalBackgroundFault=',
		'?regionalBackgroundFault=:render',
		'?regionalBackgroundFault=base:render:extra',
		'?regionalBackgroundFault=background',
		'?regionalBackgroundFault=base:missing',
		'?regionalBackgroundFault=base:load'
	])('rejects malformed regional background render faults: %s', (search) => {
		expect(parseWorldRenderOptions(search).regionalBackgroundFault).toBeNull();
	});
});
