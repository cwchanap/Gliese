import { describe, expect, it } from 'vitest';

import { parseWorldRenderOptions, resolveWorldRenderOptions } from './world-render-options';

describe('world render URL options', () => {
	it('enables regional backgrounds and disables collision debug by default', () => {
		expect(parseWorldRenderOptions('')).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false,
			regionalBackgroundFault: null
		});
	});

	it('disables regional backgrounds only for the exact off value', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off')).toEqual({
			regionalBackgrounds: false,
			collisionDebug: false,
			regionalBackgroundFault: null
		});
	});

	it('enables collision debug only for the exact collision value', () => {
		expect(parseWorldRenderOptions('?mapDebug=collision')).toEqual({
			regionalBackgrounds: true,
			collisionDebug: true,
			regionalBackgroundFault: null
		});
	});

	it('combines background fallback and collision debug', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off&mapDebug=collision')).toEqual({
			regionalBackgrounds: false,
			collisionDebug: true,
			regionalBackgroundFault: null
		});
	});

	it('preserves defaults for unknown parameter values', () => {
		expect(parseWorldRenderOptions('?regionalBackground=OFF&mapDebug=collisions')).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false,
			regionalBackgroundFault: null
		});
	});

	it('uses the first value for repeated parameters', () => {
		expect(
			parseWorldRenderOptions(
				'?regionalBackground=on&regionalBackground=off&mapDebug=none&mapDebug=collision'
			)
		).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false,
			regionalBackgroundFault: null
		});
		expect(
			parseWorldRenderOptions(
				'?regionalBackground=off&regionalBackground=on&mapDebug=collision&mapDebug=none'
			)
		).toEqual({
			regionalBackgrounds: false,
			collisionDebug: true,
			regionalBackgroundFault: null
		});
	});

	it('resolves options through an injected search reader', () => {
		const readSearch = () => '?regionalBackground=off&mapDebug=collision';

		expect(resolveWorldRenderOptions(readSearch)).toEqual({
			regionalBackgrounds: false,
			collisionDebug: true,
			regionalBackgroundFault: null
		});
	});

	it('parses a typed per-descriptor render fault', () => {
		expect(
			parseWorldRenderOptions('?regionalBackgroundFault=sundrop-village-foreground-image:render')
		).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false,
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
		'?regionalBackgroundFault=sundrop-village-background',
		'?regionalBackgroundFault=base:missing',
		'?regionalBackgroundFault=base:load'
	])('rejects malformed regional background render faults: %s', (search) => {
		expect(parseWorldRenderOptions(search).regionalBackgroundFault).toBeNull();
	});
});
