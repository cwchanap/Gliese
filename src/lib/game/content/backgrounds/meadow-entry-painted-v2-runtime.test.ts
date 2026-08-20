import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_DEFAULT_PAINTED_MODE,
	MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE,
	MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID,
	MEADOW_ENTRY_PAINTED_MODE_PRODUCTION,
	MEADOW_ENTRY_PAINTED_MODE_PILOT,
	MEADOW_ENTRY_PAINTED_MODE_FALLBACK,
	MAP_BACKGROUND_PACKAGE_REGISTRY,
	resolveMeadowEntryPaintedSelection
} from './meadow-entry-painted-v2-runtime';
import { resolveMapBackgroundPackageSelection } from './map-background-package';

describe('painted-v2 runtime selection', () => {
	it('defaults to the fallback selection without an explicit review request', () => {
		expect(MEADOW_ENTRY_DEFAULT_PAINTED_MODE).toBe('fallback');
		const selection = resolveMeadowEntryPaintedSelection({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			meadowPaintedPilotOff: false
		});
		expect(selection).toEqual(MEADOW_ENTRY_PAINTED_MODE_FALLBACK);
	});

	it('allows the generic background review id to select the immutable package', () => {
		const selection = resolveMeadowEntryPaintedSelection({
			regionalBackgrounds: true,
			meadowPaintedPilot: false,
			mapBackgroundReviewIds: [MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID]
		});
		expect(selection.mode).toBe('pilot');
		expect(selection.assets).toHaveLength(2);
		expect(selection.backgrounds).toHaveLength(2);
		expect(selection.visualOwners).toHaveLength(13);
	});

	it('keeps generic and legacy resolution byte-equivalent for the historical package', () => {
		const legacySelection = resolveMeadowEntryPaintedSelection({
			regionalBackgrounds: true,
			meadowPaintedPilot: true,
			meadowPaintedPilotOff: false
		});
		const genericSelection = resolveMapBackgroundPackageSelection(MAP_BACKGROUND_PACKAGE_REGISTRY, {
			mapId: 'meadow-entry',
			regionalBackgrounds: true,
			reviewPackageIds: [MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID],
			defaultSelection: null,
			forcedFallback: false
		});

		expect(genericSelection).toEqual({
			mode: 'review',
			definition: MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE
		});
		expect(genericSelection.definition?.assets).toEqual(legacySelection.assets);
		expect(genericSelection.definition?.backgrounds).toEqual(legacySelection.backgrounds);
		expect(genericSelection.definition?.visualOwners).toEqual(legacySelection.visualOwners);
	});

	it('gives the explicit pilot-off switch priority over the painted default', () => {
		expect(
			resolveMeadowEntryPaintedSelection({
				regionalBackgrounds: true,
				meadowPaintedPilot: false,
				meadowPaintedPilotOff: true
			})
		).toEqual({ mode: 'fallback', assets: [], backgrounds: [], visualOwners: [] });
	});

	it('selects exactly the two camera-safe pilot assets when the pilot flag is enabled', () => {
		const selection = resolveMeadowEntryPaintedSelection({
			regionalBackgrounds: true,
			meadowPaintedPilot: true
		});
		expect(selection.mode).toBe('pilot');
		expect(selection.assets).toEqual([
			{
				key: 'meadow-entry-painted-v2-sundrop-camera-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-sundrop-camera-base.png'
			},
			{
				key: 'meadow-entry-painted-v2-crossroads-camera-base',
				path: '/game/assets/regions/meadow-entry-painted-v2/painted-v2-crossroads-camera-base.png'
			}
		]);
		expect(selection.backgrounds).toEqual([
			{
				id: 'meadow-entry-painted-v2-sundrop-camera-base-image',
				x: 1_600,
				y: 4_800,
				width: 3_200,
				height: 3_200,
				textureKey: 'meadow-entry-painted-v2-sundrop-camera-base',
				plane: 'base',
				drawOrder: 0
			},
			{
				id: 'meadow-entry-painted-v2-crossroads-camera-base-image',
				x: 3_968,
				y: 3_840,
				width: 3_200,
				height: 3_200,
				textureKey: 'meadow-entry-painted-v2-crossroads-camera-base',
				plane: 'base',
				drawOrder: 10
			}
		]);
		expect(selection.backgrounds).toHaveLength(2);
		expect(selection.visualOwners).toHaveLength(13);
		expect(
			selection.visualOwners.map(({ sourceType, sourceId }) => `${sourceType}:${sourceId}`)
		).toEqual([
			'blocker:coast-crossroads-mouth-bank',
			'blocker:mistfen-entry-bank-east',
			'blocker:silverpine-wall-A-east',
			'blocker:silverpine-wall-A-west',
			'blocker:silverpine-wall-B-north',
			'blocker:silverpine-wall-B-south',
			'blocker:silverpine-wall-C-east',
			'blocker:silverpine-wall-C-west',
			'blocker:wildwood-forest-lane-west-bank',
			'decor:village-decor-22-77',
			'decor:village-decor-28-25',
			'decor:village-decor-28-53',
			'decor:village-decor-53-22'
		]);
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
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE)).toBe(true);
		expect(Object.isFrozen(MAP_BACKGROUND_PACKAGE_REGISTRY)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.assets)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds[0])).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners[0])).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners[0]?.ownerCrops)).toBe(true);
		expect(Object.isFrozen(MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners[0]?.ownerCrops[0])).toBe(
			true
		);
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
