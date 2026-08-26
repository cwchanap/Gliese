import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_DEFAULT_PACKAGE_SELECTION,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE,
	MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE
} from './meadow-entry-painted-v2-runtime';
import {
	MAP_BACKGROUND_DEFAULT_SELECTIONS,
	MAP_BACKGROUND_PACKAGE_REGISTRY
} from './map-background-registry';
import { applyMapBackgroundPackage } from './map-background-package';
import { VILLAGE_INTERIOR_NAVIGATION_SOURCES } from './village-interior-navigation-sources';
import { VILLAGE_INTERIOR_PACKAGES } from './village-interior-packages';
import { heroHouseMap } from '$lib/game/content/maps';

describe('map background registry', () => {
	it('registers Hero House navigation before painted package approval', () => {
		expect(VILLAGE_INTERIOR_NAVIGATION_SOURCES).toEqual([
			expect.objectContaining({
				id: 'hero-house-navigation',
				mapId: 'hero-house',
				cellSizePx: 16,
				widthCells: 44,
				heightCells: 36,
				clearancePx: 12
			})
		]);
		expect(VILLAGE_INTERIOR_PACKAGES).toEqual([
			expect.objectContaining({
				id: 'hero-house-painted',
				mapId: 'hero-house',
				coverage: 'full-map',
				assets: [
					{
						key: 'hero-house-painted-base',
						path: '/game/assets/interiors/hero-house/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'hero-house-painted-base-image',
						textureKey: 'hero-house-painted-base',
						width: 704,
						height: 576,
						plane: 'base'
					})
				]
			})
		]);
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['hero-house']).toEqual({
			packageId: 'hero-house-painted',
			mode: 'production'
		});
		expect(Object.isFrozen(VILLAGE_INTERIOR_NAVIGATION_SOURCES)).toBe(true);
		expect(Object.isFrozen(VILLAGE_INTERIOR_PACKAGES)).toBe(true);
	});

	it('preserves Meadow packages and defaults while keeping IDs and maps unique', () => {
		expect(MAP_BACKGROUND_PACKAGE_REGISTRY).toEqual([
			MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE,
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE,
			...VILLAGE_INTERIOR_PACKAGES
		]);
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS).toEqual({
			'meadow-entry': MEADOW_ENTRY_DEFAULT_PACKAGE_SELECTION,
			'hero-house': {
				packageId: 'hero-house-painted',
				mode: 'production'
			}
		});
		expect(new Set(MAP_BACKGROUND_PACKAGE_REGISTRY.map(({ id }) => id)).size).toBe(
			MAP_BACKGROUND_PACKAGE_REGISTRY.length
		);
		expect(Object.isFrozen(MAP_BACKGROUND_PACKAGE_REGISTRY)).toBe(true);
		expect(Object.isFrozen(MAP_BACKGROUND_DEFAULT_SELECTIONS)).toBe(true);
		expect(MAP_BACKGROUND_PACKAGE_REGISTRY.every(({ mapId }) => mapId.length > 0)).toBe(true);
	});

	it('owns every Hero House legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(({ id }) => id === 'hero-house-painted');
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(heroHouseMap, {
			mode: 'production',
			definition
		});
		expect(transformed.backgroundImages).toEqual(definition.backgrounds);

		for (const source of [
			...(transformed.groundPatches ?? []),
			...(transformed.blockers ?? []),
			...(transformed.interiorProps ?? [])
		]) {
			expect(source.visual).toEqual({
				mode: 'fallback-only',
				ownerCrops: [
					{
						cropId: 'hero-house-full-map',
						requiredBackgroundIds: ['hero-house-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(heroHouseMap.groundPatches?.length ?? 0) +
				(heroHouseMap.blockers?.length ?? 0) +
				(heroHouseMap.interiorProps?.length ?? 0)
		);
	});
});
