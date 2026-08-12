import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_DEFAULT_PAINTED_MODE,
	MEADOW_ENTRY_PAINTED_MODE_PRODUCTION,
	MEADOW_ENTRY_PAINTED_MODE_PILOT,
	MEADOW_ENTRY_PAINTED_MODE_FALLBACK,
	resolveMeadowEntryPaintedSelection
} from './meadow-entry-painted-v2-runtime';

describe('painted-v2 runtime selection', () => {
	it('defaults to an empty fallback selection', () => {
		expect(MEADOW_ENTRY_DEFAULT_PAINTED_MODE).toBe('fallback');
		expect(
			resolveMeadowEntryPaintedSelection({ regionalBackgrounds: true, meadowPaintedPilot: false })
		).toEqual({
			mode: 'fallback',
			assets: [],
			backgrounds: [],
			visualOwners: []
		});
	});

	it('selects exactly the three pilot assets when the pilot flag is enabled', () => {
		const selection = resolveMeadowEntryPaintedSelection({
			regionalBackgrounds: true,
			meadowPaintedPilot: true
		});
		expect(selection.mode).toBe('pilot');
		expect(selection.assets).toEqual([
			{
				key: 'meadow-entry-painted-v2-sundrop-village-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-sundrop-village-base.png'
			},
			{
				key: 'meadow-entry-painted-v2-village-crossroads-connector-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-village-crossroads-connector-base.png'
			},
			{
				key: 'meadow-entry-painted-v2-crossroads-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-base.png'
			}
		]);
		expect(selection.backgrounds).toHaveLength(3);
		expect(selection.visualOwners).toHaveLength(5);
	});

	it('gives regional-backgrounds off priority over the pilot flag', () => {
		const selection = resolveMeadowEntryPaintedSelection({
			regionalBackgrounds: false,
			meadowPaintedPilot: true
		});
		expect(selection).toEqual({ mode: 'fallback', assets: [], backgrounds: [], visualOwners: [] });
	});

	it('exposes fail-closed immutable pilot and production records', () => {
		expect(MEADOW_ENTRY_PAINTED_MODE_FALLBACK).toEqual({
			mode: 'fallback',
			assets: [],
			backgrounds: [],
			visualOwners: []
		});
		expect(MEADOW_ENTRY_PAINTED_MODE_PRODUCTION).toEqual({
			mode: 'production',
			assets: [],
			backgrounds: [],
			visualOwners: []
		});
		expect(MEADOW_ENTRY_PAINTED_MODE_PILOT.mode).toBe('pilot');
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.assets)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners)).toBe(true);
		expect(() => {
			(MEADOW_ENTRY_PAINTED_MODE_PILOT.assets as unknown as Array<unknown>).push({});
		}).toThrow();
		expect(() => {
			(
				MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners[0]!.ownerCrops as unknown as Array<unknown>
			).push({});
		}).toThrow();
	});

	it('does not import the historical generated runtime module', () => {
		const source = readFileSync(
			new URL('./meadow-entry-painted-v2-runtime.ts', import.meta.url),
			'utf8'
		);
		expect(source).not.toContain('generated/meadow-entry-runtime');
	});
});
