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
import { guildHallMap, heroHouseMap, itemShopMap } from '$lib/game/content/maps';

describe('map background registry', () => {
	it('registers approved interior navigation and painted packages', () => {
		expect(VILLAGE_INTERIOR_NAVIGATION_SOURCES).toEqual([
			expect.objectContaining({
				id: 'hero-house-navigation',
				mapId: 'hero-house',
				cellSizePx: 16,
				widthCells: 44,
				heightCells: 36,
				clearancePx: 12
			}),
			expect.objectContaining({
				id: 'guild-hall-navigation',
				mapId: 'guild-hall',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 52,
				clearancePx: 12
			}),
			expect.objectContaining({
				id: 'item-shop-navigation',
				mapId: 'item-shop',
				cellSizePx: 16,
				widthCells: 52,
				heightCells: 40,
				clearancePx: 12
			})
		]);
		expect(VILLAGE_INTERIOR_PACKAGES).toHaveLength(3);
		expect(VILLAGE_INTERIOR_PACKAGES[0]).toEqual(
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
		);
		expect(VILLAGE_INTERIOR_PACKAGES[1]).toEqual(
			expect.objectContaining({
				id: 'guild-hall-painted',
				mapId: 'guild-hall',
				coverage: 'full-map',
				assets: [
					{
						key: 'guild-hall-painted-base',
						path: '/game/assets/interiors/guild-hall/base.png'
					},
					{
						key: 'guild-hall-painted-foreground',
						path: '/game/assets/interiors/guild-hall/foreground.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'guild-hall-painted-base-image',
						textureKey: 'guild-hall-painted-base',
						width: 1024,
						height: 832,
						plane: 'base'
					}),
					expect.objectContaining({
						id: 'guild-hall-painted-foreground-image',
						textureKey: 'guild-hall-painted-foreground',
						width: 1024,
						height: 832,
						plane: 'foreground',
						drawOrder: 1
					})
				]
			})
		);
		expect(VILLAGE_INTERIOR_PACKAGES[2]).toEqual(
			expect.objectContaining({
				id: 'item-shop-painted',
				mapId: 'item-shop',
				coverage: 'full-map',
				assets: [
					{
						key: 'item-shop-painted-base',
						path: '/game/assets/interiors/item-shop/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'item-shop-painted-base-image',
						textureKey: 'item-shop-painted-base',
						width: 832,
						height: 640,
						plane: 'base'
					})
				]
			})
		);
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['hero-house']).toEqual({
			packageId: 'hero-house-painted',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['guild-hall']).toEqual({
			packageId: 'guild-hall-painted',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['item-shop']).toEqual({
			packageId: 'item-shop-painted',
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
			},
			'guild-hall': {
				packageId: 'guild-hall-painted',
				mode: 'production'
			},
			'item-shop': {
				packageId: 'item-shop-painted',
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

	it('owns every Guild Hall legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(({ id }) => id === 'guild-hall-painted');
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(guildHallMap, {
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
						cropId: 'guild-hall-full-map',
						requiredBackgroundIds: ['guild-hall-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(guildHallMap.groundPatches?.length ?? 0) +
				(guildHallMap.blockers?.length ?? 0) +
				(guildHallMap.interiorProps?.length ?? 0)
		);
	});

	it('owns every Item Shop legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(({ id }) => id === 'item-shop-painted');
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(itemShopMap, {
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
						cropId: 'item-shop-full-map',
						requiredBackgroundIds: ['item-shop-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(itemShopMap.groundPatches?.length ?? 0) +
				(itemShopMap.blockers?.length ?? 0) +
				(itemShopMap.interiorProps?.length ?? 0)
		);
	});
});
