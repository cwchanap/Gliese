import { describe, expect, it } from 'vitest';

import type { MapBackgroundVisualOwner } from './map-background-package';
import {
	buildVillageInteriorNavigationSource,
	buildVillageInteriorPackage,
	VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES,
	type VillageInteriorLayout,
	type VillageInteriorPackageManifest
} from './village-interior-package';

const layout: VillageInteriorLayout = {
	widthTiles: 10,
	heightTiles: 8,
	fullFloor: { x: 0, y: 0, width: 320, height: 256 },
	rooms: {},
	corridors: {},
	doors: {},
	walls: [],
	spawn: { x: 160, y: 224 },
	exit: { x: 160, y: 240 },
	npcApproaches: {},
	propZones: {},
	propCollisions: {}
};

const navigationSource = buildVillageInteriorNavigationSource({
	mapId: 'hero-house',
	layout
});

const manifest: VillageInteriorPackageManifest = {
	version: 1,
	mapId: 'hero-house',
	dimensionsPx: { width: 320, height: 256 },
	base: {
		id: 'hero-house-base-image',
		textureKey: 'hero-house-base',
		path: '/game/assets/interiors/hero-house/base.png',
		sha256: 'a'.repeat(64)
	},
	foreground: {
		id: 'hero-house-foreground-image',
		textureKey: 'hero-house-foreground',
		path: '/game/assets/interiors/hero-house/foreground.png',
		sha256: 'b'.repeat(64)
	},
	navigation: {
		gridId: navigationSource.id,
		cellSizePx: 16,
		widthCells: 20,
		heightCells: 16,
		clearancePx: 12,
		source: 'layout'
	}
};

const ownerCrops = [{ cropId: 'full-map', requiredBackgroundIds: [manifest.base.id] }];
const visualOwners: readonly MapBackgroundVisualOwner[] = [
	{ sourceType: 'blocker', sourceId: 'wall', ownerCrops },
	{ sourceType: 'decor', sourceId: 'rug', ownerCrops },
	{ sourceType: 'fence', sourceId: 'fence', ownerCrops },
	{ sourceType: 'ground-patch', sourceId: 'floor', ownerCrops },
	{ sourceType: 'interior-prop', sourceId: 'table', ownerCrops }
];

describe('village interior package builder', () => {
	it('creates an exact full-map package with optional foreground and all static owners', () => {
		const built = buildVillageInteriorPackage({
			mapId: 'hero-house',
			layout,
			manifest,
			visualOwners,
			navigationSource
		});

		expect(built.definition).toEqual({
			id: 'hero-house-painted',
			mapId: 'hero-house',
			coverage: 'full-map',
			assets: [
				{ key: 'hero-house-base', path: '/game/assets/interiors/hero-house/base.png' },
				{ key: 'hero-house-foreground', path: '/game/assets/interiors/hero-house/foreground.png' }
			],
			backgrounds: [
				{
					id: 'hero-house-base-image',
					x: 160,
					y: 128,
					width: 320,
					height: 256,
					textureKey: 'hero-house-base',
					plane: 'base',
					drawOrder: 0
				},
				{
					id: 'hero-house-foreground-image',
					x: 160,
					y: 128,
					width: 320,
					height: 256,
					textureKey: 'hero-house-foreground',
					plane: 'foreground',
					drawOrder: 1
				}
			],
			visualOwners
		});
		expect(built.navigationSource).toEqual(navigationSource);
	});

	it('derives an independent 16px open navigation source from layout pixels', () => {
		expect(navigationSource).toEqual({
			id: 'hero-house-navigation',
			mapId: 'hero-house',
			cellSizePx: 16,
			widthCells: 20,
			heightCells: 16,
			clearancePx: 12,
			rows: Array.from({ length: 16 }, () => '.'.repeat(20))
		});
	});

	it('rejects dimensions, grid metadata, and duplicate owner mismatches', () => {
		expect(() =>
			buildVillageInteriorPackage({
				mapId: 'hero-house',
				layout,
				manifest: { ...manifest, dimensionsPx: { width: 304, height: 256 } },
				visualOwners,
				navigationSource
			})
		).toThrow();
		expect(() =>
			buildVillageInteriorPackage({
				mapId: 'hero-house',
				layout,
				manifest: {
					...manifest,
					navigation: { ...manifest.navigation, widthCells: 19 }
				},
				visualOwners,
				navigationSource
			})
		).toThrow();
		expect(() =>
			buildVillageInteriorPackage({
				mapId: 'hero-house',
				layout,
				manifest,
				visualOwners: [...visualOwners, visualOwners[0]!],
				navigationSource
			})
		).toThrow();
	});

	it('rejects invalid override dimensions and preserves the exact owned sources', () => {
		expect(VILLAGE_INTERIOR_NAVIGATION_OWNED_SOURCES).toEqual(['blocker', 'interior-prop']);
		expect(() =>
			buildVillageInteriorNavigationSource({
				mapId: 'hero-house',
				layout,
				navigationOverride: { ...navigationSource, widthCells: 19 }
			})
		).toThrow();
	});

	it('freezes the package and navigation result graph', () => {
		const built = buildVillageInteriorPackage({
			mapId: 'hero-house',
			layout,
			manifest,
			visualOwners,
			navigationSource
		});

		expect(Object.isFrozen(built)).toBe(true);
		expect(Object.isFrozen(built.definition)).toBe(true);
		expect(Object.isFrozen(built.definition.assets)).toBe(true);
		expect(Object.isFrozen(built.definition.backgrounds)).toBe(true);
		expect(Object.isFrozen(built.definition.visualOwners)).toBe(true);
		expect(Object.isFrozen(built.navigationSource)).toBe(true);
		expect(Object.isFrozen(built.navigationSource.rows)).toBe(true);
	});
});
