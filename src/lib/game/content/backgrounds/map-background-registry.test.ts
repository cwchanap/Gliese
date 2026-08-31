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
import { isWalkable } from '$lib/game/core/navigation';
import { maps } from '$lib/game/content/maps';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import {
	blacksmithInteriorMap,
	guildHallMap,
	heroHouseMap,
	itemShopMap,
	shrineOfAuroraInteriorMap,
	villagerHouse1Map,
	villagerHouse2Map,
	villagerHouse3Map
} from '$lib/game/content/maps';

const ALL_EIGHT_INTERIOR_CONTRACTS = [
	{
		mapId: 'hero-house',
		packageId: 'hero-house-painted',
		dimensions: { width: 704, height: 576 },
		grid: { id: 'hero-house-navigation', widthCells: 44, heightCells: 36 },
		rooms: ['bedroom', 'study', 'livingKitchen'],
		corridors: ['hall'],
		npcApproaches: [],
		ambientActivity: []
	},
	{
		mapId: 'guild-hall',
		packageId: 'guild-hall-painted',
		dimensions: { width: 1024, height: 832 },
		grid: { id: 'guild-hall-navigation', widthCells: 64, heightCells: 52 },
		rooms: ['recordsHall', 'commonHall', 'guildMasterOffice', 'trainingHall', 'quartermasterRoom'],
		corridors: ['mainSpine', 'entranceLobby'],
		npcApproaches: ['guildMaster', 'quartermaster'],
		ambientActivity: ['guild-hall-member-west', 'guild-hall-member-east']
	},
	{
		mapId: 'item-shop',
		packageId: 'item-shop-painted',
		dimensions: { width: 832, height: 640 },
		grid: { id: 'item-shop-navigation', widthCells: 52, heightCells: 40 },
		rooms: ['stockroom', 'office', 'salesFloor'],
		corridors: ['serviceCorridor', 'entranceAisle'],
		npcApproaches: ['mira'],
		ambientActivity: ['item-shop-customer']
	},
	{
		mapId: 'blacksmith-interior',
		packageId: 'blacksmith-interior-painted',
		dimensions: { width: 896, height: 704 },
		grid: { id: 'blacksmith-interior-navigation', widthCells: 56, heightCells: 44 },
		rooms: ['forgeFloor', 'armoryDisplay', 'showroom'],
		corridors: ['serviceSpine', 'entranceAisle'],
		npcApproaches: ['oren'],
		ambientActivity: []
	},
	{
		mapId: 'villager-house-1',
		packageId: 'villager-house-1-painted',
		dimensions: { width: 1280, height: 832 },
		grid: { id: 'villager-house-1-navigation', widthCells: 80, heightCells: 52 },
		rooms: ['bedroom', 'storage', 'livingKitchen'],
		corridors: ['hall'],
		npcApproaches: ['lynn'],
		ambientActivity: ['villager-house-1-family']
	},
	{
		mapId: 'villager-house-2',
		packageId: 'villager-house-2-painted',
		dimensions: { width: 1280, height: 768 },
		grid: { id: 'villager-house-2-navigation', widthCells: 80, heightCells: 48 },
		rooms: ['workshop', 'bedroom', 'livingArea'],
		corridors: ['hall'],
		npcApproaches: ['toma'],
		ambientActivity: ['villager-house-2-neighbor']
	},
	{
		mapId: 'villager-house-3',
		packageId: 'villager-house-3-painted',
		dimensions: { width: 1024, height: 704 },
		grid: { id: 'villager-house-3-navigation', widthCells: 64, heightCells: 44 },
		rooms: ['archiveStudy', 'bedroomStorage', 'sittingRoom'],
		corridors: ['hall'],
		npcApproaches: ['io'],
		ambientActivity: ['villager-house-3-neighbor']
	},
	{
		mapId: 'shrine-of-aurora-interior',
		packageId: 'shrine-of-aurora-interior-painted',
		dimensions: { width: 1024, height: 896 },
		grid: { id: 'shrine-of-aurora-interior-navigation', widthCells: 64, heightCells: 56 },
		rooms: ['innerSanctum', 'westPreparation', 'eastArchive'],
		corridors: ['nave', 'entranceHall'],
		npcApproaches: [],
		ambientActivity: []
	}
] as const;

const STATIC_SOURCE_FIELDS = [
	'groundPatches',
	'blockers',
	'mapDecor',
	'fences',
	'interiorProps'
] as const;
const LIVE_SOURCE_FIELDS = [
	'transitions',
	'pickups',
	'encounters',
	'npcs',
	'landmarks',
	'ambientNpcs',
	'discoveries',
	'combatBounds'
] as const;

// Ambient actors are rendered live and do not own player collision. VH3's
// neighbor is intentionally anchored on the sitting-rug edge; the authored
// player route approaches it from the open east lane instead of requiring the
// actor's sprite anchor to be a walkable player cell.
const AMBIENT_REACHABLE_APPROACHES = {
	'villager-house-3': {
		'villager-house-3-neighbor': {
			offset: { x: 96, y: 0 },
			stagingOffset: { x: 96, y: 32 },
			ownerProp: 'sitting'
		}
	}
} as const;

describe('map background registry', () => {
	it('proves the complete eight-interior package, grid, ownership, and live-content matrix', () => {
		expect(ALL_EIGHT_INTERIOR_CONTRACTS).toHaveLength(8);
		expect(new Set(ALL_EIGHT_INTERIOR_CONTRACTS.map(({ mapId }) => mapId)).size).toBe(8);

		for (const contract of ALL_EIGHT_INTERIOR_CONTRACTS) {
			const map = maps[contract.mapId];
			const layout = VILLAGE_INTERIOR_LAYOUTS[contract.mapId];
			const source = VILLAGE_INTERIOR_NAVIGATION_SOURCES.find(
				({ mapId }) => mapId === contract.mapId
			);
			const definition = VILLAGE_INTERIOR_PACKAGES.find(({ mapId }) => mapId === contract.mapId);

			expect(map, `${contract.mapId}:map`).toBeDefined();
			expect(layout, `${contract.mapId}:layout`).toBeDefined();
			expect(source, `${contract.mapId}:navigation source`).toBeDefined();
			expect(definition, `${contract.mapId}:package`).toBeDefined();
			if (!map || !layout || !source || !definition) continue;

			expect({ width: map.width * 32, height: map.height * 32 }).toEqual(contract.dimensions);
			expect(layout.fullFloor).toMatchObject({ x: 0, y: 0, ...contract.dimensions });
			expect(Object.keys(layout.rooms)).toEqual(contract.rooms);
			expect(Object.keys(layout.corridors)).toEqual(contract.corridors);
			expect(Object.keys(layout.npcApproaches)).toEqual(contract.npcApproaches);
			const ambientActivity = (
				'ambientActivity' in layout ? layout.ambientActivity : {}
			) as Readonly<Record<string, { readonly x: number; readonly y: number }>>;
			expect(Object.keys(ambientActivity)).toEqual(contract.ambientActivity);
			for (const [ambientId, anchor] of Object.entries(ambientActivity)) {
				const ambientNpc = (map.ambientNpcs ?? []).find(({ id }) => id === ambientId);
				expect(ambientNpc, `${contract.mapId}:ambient:${ambientId}`).toMatchObject(anchor);
			}
			for (const zone of Object.values(layout.propZones)) {
				expect(zone.width).toBeGreaterThan(0);
				expect(zone.height).toBeGreaterThan(0);
				expect(zone.x + zone.width).toBeLessThanOrEqual(contract.dimensions.width);
				expect(zone.y + zone.height).toBeLessThanOrEqual(contract.dimensions.height);
			}

			expect(source).toMatchObject({
				id: contract.grid.id,
				mapId: contract.mapId,
				cellSizePx: 16,
				widthCells: contract.grid.widthCells,
				heightCells: contract.grid.heightCells,
				clearancePx: 12
			});
			expect(source.rows).toHaveLength(contract.grid.heightCells);
			expect(source.rows.every((row) => row.length === contract.grid.widthCells)).toBe(true);
			expect(map.navigationGrid).toMatchObject({
				id: contract.grid.id,
				mapId: contract.mapId,
				cellSizePx: 16,
				widthCells: contract.grid.widthCells,
				heightCells: contract.grid.heightCells,
				widthPx: contract.dimensions.width,
				heightPx: contract.dimensions.height
			});

			const ambientApproaches =
				AMBIENT_REACHABLE_APPROACHES[contract.mapId as keyof typeof AMBIENT_REACHABLE_APPROACHES] ??
				{};
			for (const [ambientId, approach] of Object.entries(ambientApproaches)) {
				const anchor = ambientActivity[ambientId];
				const owner = (
					layout.propCollisions as Readonly<
						Record<
							string,
							{
								readonly x: number;
								readonly y: number;
								readonly width: number;
								readonly height: number;
							}
						>
					>
				)[approach.ownerProp];
				expect(anchor, `${contract.mapId}:ambient:${ambientId}:anchor`).toBeDefined();
				expect(owner, `${contract.mapId}:ambient:${ambientId}:owner`).toBeDefined();
				if (!anchor || !owner || !map.navigationGrid) continue;
				const reachableApproach = {
					x: anchor.x + approach.offset.x,
					y: anchor.y + approach.offset.y
				};
				const stagingPoint = {
					x: anchor.x + approach.stagingOffset.x,
					y: anchor.y + approach.stagingOffset.y
				};
				expect(
					isWalkable(map.navigationGrid, reachableApproach.x, reachableApproach.y),
					`${contract.mapId}:ambient:${ambientId}:approach`
				).toBe(true);
				expect(
					isWalkable(map.navigationGrid, stagingPoint.x, stagingPoint.y),
					`${contract.mapId}:ambient:${ambientId}:staging`
				).toBe(true);
				expect(reachableApproach.x).toBe(owner.x + owner.width + 64);
				expect(reachableApproach.y).toBe(anchor.y);
				expect(Math.hypot(approach.offset.x, approach.offset.y)).toBeLessThanOrEqual(128);
			}

			expect(MAP_BACKGROUND_DEFAULT_SELECTIONS[contract.mapId]).toEqual({
				packageId: contract.packageId,
				mode: 'production'
			});
			expect(definition.id).toBe(contract.packageId);
			expect(definition.mapId).toBe(contract.mapId);
			expect(definition.coverage).toBe('full-map');
			expect(definition.backgrounds).toHaveLength(contract.mapId === 'guild-hall' ? 2 : 1);
			expect(definition.assets).toHaveLength(definition.backgrounds.length);
			expect(definition.backgrounds).toEqual(
				definition.assets.map((asset) =>
					expect.objectContaining({
						textureKey: asset.key,
						width: contract.dimensions.width,
						height: contract.dimensions.height
					})
				)
			);

			const painted = applyMapBackgroundPackage(map, {
				mode: 'production',
				definition
			});
			const fallback = applyMapBackgroundPackage(map, { mode: 'fallback', definition: null });
			expect(fallback).toEqual(map);
			expect(painted.backgroundImages).toEqual(definition.backgrounds);
			for (const field of LIVE_SOURCE_FIELDS) {
				expect(painted[field], `${contract.mapId}:${field}`).toEqual(map[field]);
			}
			for (const field of STATIC_SOURCE_FIELDS) {
				const original = map[field] ?? [];
				const transformed = painted[field] ?? [];
				expect(transformed).toHaveLength(original.length);
				expect(
					transformed.every((source) => source.visual?.mode === 'fallback-only'),
					`${contract.mapId}:${field} fallback ownership`
				).toBe(true);
			}
			expect(definition.visualOwners).toHaveLength(
				(STATIC_SOURCE_FIELDS as readonly string[]).reduce((total, field) => {
					const source = map[field as keyof typeof map];
					return total + (Array.isArray(source) ? source.length : 0);
				}, 0)
			);
		}
	});

	it('registers approved interior navigation and painted packages', () => {
		expect(VILLAGE_INTERIOR_NAVIGATION_SOURCES).toHaveLength(8);
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
			}),
			expect.objectContaining({
				id: 'blacksmith-interior-navigation',
				mapId: 'blacksmith-interior',
				cellSizePx: 16,
				widthCells: 56,
				heightCells: 44,
				clearancePx: 12
			}),
			expect.objectContaining({
				id: 'villager-house-1-navigation',
				mapId: 'villager-house-1',
				cellSizePx: 16,
				widthCells: 80,
				heightCells: 52,
				clearancePx: 12
			}),
			expect.objectContaining({
				id: 'villager-house-2-navigation',
				mapId: 'villager-house-2',
				cellSizePx: 16,
				widthCells: 80,
				heightCells: 48,
				clearancePx: 12
			}),
			expect.objectContaining({
				id: 'villager-house-3-navigation',
				mapId: 'villager-house-3',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 44,
				clearancePx: 12
			}),
			expect.objectContaining({
				id: 'shrine-of-aurora-interior-navigation',
				mapId: 'shrine-of-aurora-interior',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 56,
				clearancePx: 12
			})
		]);
		expect(VILLAGE_INTERIOR_PACKAGES).toHaveLength(8);
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
		expect(VILLAGE_INTERIOR_PACKAGES[3]).toEqual(
			expect.objectContaining({
				id: 'blacksmith-interior-painted',
				mapId: 'blacksmith-interior',
				coverage: 'full-map',
				assets: [
					{
						key: 'blacksmith-interior-painted-base',
						path: '/game/assets/interiors/blacksmith-interior/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'blacksmith-interior-painted-base-image',
						textureKey: 'blacksmith-interior-painted-base',
						width: 896,
						height: 704,
						plane: 'base'
					})
				]
			})
		);
		expect(VILLAGE_INTERIOR_PACKAGES[4]).toEqual(
			expect.objectContaining({
				id: 'villager-house-1-painted',
				mapId: 'villager-house-1',
				coverage: 'full-map',
				assets: [
					{
						key: 'villager-house-1-painted-base',
						path: '/game/assets/interiors/villager-house-1/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'villager-house-1-painted-base-image',
						textureKey: 'villager-house-1-painted-base',
						width: 1280,
						height: 832,
						plane: 'base'
					})
				]
			})
		);
		expect(VILLAGE_INTERIOR_PACKAGES[5]).toEqual(
			expect.objectContaining({
				id: 'villager-house-2-painted',
				mapId: 'villager-house-2',
				coverage: 'full-map',
				assets: [
					{
						key: 'villager-house-2-painted-base',
						path: '/game/assets/interiors/villager-house-2/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'villager-house-2-painted-base-image',
						textureKey: 'villager-house-2-painted-base',
						width: 1280,
						height: 768,
						plane: 'base'
					})
				]
			})
		);
		expect(VILLAGE_INTERIOR_PACKAGES[6]).toEqual(
			expect.objectContaining({
				id: 'villager-house-3-painted',
				mapId: 'villager-house-3',
				coverage: 'full-map',
				assets: [
					{
						key: 'villager-house-3-painted-base',
						path: '/game/assets/interiors/villager-house-3/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'villager-house-3-painted-base-image',
						textureKey: 'villager-house-3-painted-base',
						width: 1024,
						height: 704,
						plane: 'base'
					})
				]
			})
		);
		expect(VILLAGE_INTERIOR_PACKAGES[7]).toEqual(
			expect.objectContaining({
				id: 'shrine-of-aurora-interior-painted',
				mapId: 'shrine-of-aurora-interior',
				coverage: 'full-map',
				assets: [
					{
						key: 'shrine-of-aurora-interior-painted-base',
						path: '/game/assets/interiors/shrine-of-aurora-interior/base.png'
					}
				],
				backgrounds: [
					expect.objectContaining({
						id: 'shrine-of-aurora-interior-painted-base-image',
						textureKey: 'shrine-of-aurora-interior-painted-base',
						width: 1024,
						height: 896,
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
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['blacksmith-interior']).toEqual({
			packageId: 'blacksmith-interior-painted',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['villager-house-1']).toEqual({
			packageId: 'villager-house-1-painted',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['villager-house-2']).toEqual({
			packageId: 'villager-house-2-painted',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['villager-house-3']).toEqual({
			packageId: 'villager-house-3-painted',
			mode: 'production'
		});
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS['shrine-of-aurora-interior']).toEqual({
			packageId: 'shrine-of-aurora-interior-painted',
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
			},
			'blacksmith-interior': {
				packageId: 'blacksmith-interior-painted',
				mode: 'production'
			},
			'villager-house-1': {
				packageId: 'villager-house-1-painted',
				mode: 'production'
			},
			'villager-house-2': {
				packageId: 'villager-house-2-painted',
				mode: 'production'
			},
			'villager-house-3': {
				packageId: 'villager-house-3-painted',
				mode: 'production'
			},
			'shrine-of-aurora-interior': {
				packageId: 'shrine-of-aurora-interior-painted',
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

	it('owns every Blacksmith legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'blacksmith-interior-painted'
		);
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(blacksmithInteriorMap, {
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
						cropId: 'blacksmith-interior-full-map',
						requiredBackgroundIds: ['blacksmith-interior-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(blacksmithInteriorMap.groundPatches?.length ?? 0) +
				(blacksmithInteriorMap.blockers?.length ?? 0) +
				(blacksmithInteriorMap.interiorProps?.length ?? 0)
		);
	});

	it('owns every Villager House 1 legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-1-painted'
		);
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(villagerHouse1Map, {
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
						cropId: 'villager-house-1-full-map',
						requiredBackgroundIds: ['villager-house-1-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(villagerHouse1Map.groundPatches?.length ?? 0) +
				(villagerHouse1Map.blockers?.length ?? 0) +
				(villagerHouse1Map.interiorProps?.length ?? 0)
		);
	});

	it('owns every Villager House 2 legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-2-painted'
		);
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(villagerHouse2Map, {
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
						cropId: 'villager-house-2-full-map',
						requiredBackgroundIds: ['villager-house-2-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(villagerHouse2Map.groundPatches?.length ?? 0) +
				(villagerHouse2Map.blockers?.length ?? 0) +
				(villagerHouse2Map.interiorProps?.length ?? 0)
		);
	});

	it('owns every Villager House 3 legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'villager-house-3-painted'
		);
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(villagerHouse3Map, {
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
						cropId: 'villager-house-3-full-map',
						requiredBackgroundIds: ['villager-house-3-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(villagerHouse3Map.groundPatches?.length ?? 0) +
				(villagerHouse3Map.blockers?.length ?? 0) +
				(villagerHouse3Map.interiorProps?.length ?? 0)
		);
	});

	it('owns every Shrine of Aurora legacy static source as one painted package', () => {
		const definition = VILLAGE_INTERIOR_PACKAGES.find(
			({ id }) => id === 'shrine-of-aurora-interior-painted'
		);
		expect(definition).toBeDefined();
		if (!definition) return;

		const transformed = applyMapBackgroundPackage(shrineOfAuroraInteriorMap, {
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
						cropId: 'shrine-of-aurora-interior-full-map',
						requiredBackgroundIds: ['shrine-of-aurora-interior-painted-base-image']
					}
				]
			});
		}
		expect(definition.visualOwners).toHaveLength(
			(shrineOfAuroraInteriorMap.groundPatches?.length ?? 0) +
				(shrineOfAuroraInteriorMap.blockers?.length ?? 0) +
				(shrineOfAuroraInteriorMap.interiorProps?.length ?? 0)
		);
	});
});
