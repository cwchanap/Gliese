import { describe, expect, it } from 'vitest';

import { parseWorldRenderOptions, resolveWorldRenderOptions } from './world-render-options';

describe('world render URL options', () => {
	it('enables regional backgrounds and disables collision debug by default', () => {
		expect(parseWorldRenderOptions('')).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false
		});
	});

	it('disables regional backgrounds only for the exact off value', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off')).toEqual({
			regionalBackgrounds: false,
			collisionDebug: false
		});
	});

	it('enables collision debug only for the exact collision value', () => {
		expect(parseWorldRenderOptions('?mapDebug=collision')).toEqual({
			regionalBackgrounds: true,
			collisionDebug: true
		});
	});

	it('combines background fallback and collision debug', () => {
		expect(parseWorldRenderOptions('?regionalBackground=off&mapDebug=collision')).toEqual({
			regionalBackgrounds: false,
			collisionDebug: true
		});
	});

	it('preserves defaults for unknown parameter values', () => {
		expect(parseWorldRenderOptions('?regionalBackground=OFF&mapDebug=collisions')).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false
		});
	});

	it('uses the first value for repeated parameters', () => {
		expect(
			parseWorldRenderOptions(
				'?regionalBackground=on&regionalBackground=off&mapDebug=none&mapDebug=collision'
			)
		).toEqual({
			regionalBackgrounds: true,
			collisionDebug: false
		});
		expect(
			parseWorldRenderOptions(
				'?regionalBackground=off&regionalBackground=on&mapDebug=collision&mapDebug=none'
			)
		).toEqual({
			regionalBackgrounds: false,
			collisionDebug: true
		});
	});

	it('resolves options through an injected search reader', () => {
		const readSearch = () => '?regionalBackground=off&mapDebug=collision';

		expect(resolveWorldRenderOptions(readSearch)).toEqual({
			regionalBackgrounds: false,
			collisionDebug: true
		});
	});
});
