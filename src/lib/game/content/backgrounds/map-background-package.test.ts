import { describe, expect, it } from 'vitest';

import type { RegionalBackgroundPreloadAsset } from '$lib/game/content/assets';
import type {
	MapBackgroundImage,
	MapVisualOwnerCrop,
	WorldMapDefinition
} from '$lib/game/content/maps/types';
import {
	applyMapBackgroundPackage,
	resolveMapBackgroundPackageSelection,
	selectedMapBackgroundPackagesForPreload,
	type MapBackgroundPackageDefinition,
	type ResolveMapBackgroundPackageInput
} from './map-background-package';

const background = (id: string, textureKey = `${id}-texture`): MapBackgroundImage => ({
	id,
	x: 64,
	y: 64,
	width: 128,
	height: 128,
	textureKey,
	plane: 'base',
	drawOrder: 0
});

const assetsFor = (
	items: readonly MapBackgroundImage[]
): readonly RegionalBackgroundPreloadAsset[] =>
	items.map(({ textureKey }) => ({ key: textureKey, path: `/game/assets/${textureKey}.png` }));

function packageDefinition(id: string, mapId: string): MapBackgroundPackageDefinition {
	const backgrounds = [background(`${id}-base`)];
	return Object.freeze({
		id,
		mapId,
		coverage: 'full-map' as const,
		assets: assetsFor(backgrounds),
		backgrounds,
		visualOwners: []
	});
}

const reviewPackage = packageDefinition('hero-house-review', 'hero-house');
const otherPackage = packageDefinition('ruins-threshold-review', 'ruins-threshold');
const registry = Object.freeze([otherPackage, reviewPackage]);

const heroHouseInput: ResolveMapBackgroundPackageInput = {
	mapId: 'hero-house',
	regionalBackgrounds: true,
	reviewPackageIds: ['hero-house-review'],
	defaultSelection: null,
	forcedFallback: false
};

describe('map background package registry', () => {
	it('selects one explicit review package for its map', () => {
		expect(resolveMapBackgroundPackageSelection(registry, heroHouseInput)).toEqual({
			mode: 'review',
			definition: reviewPackage
		});
	});

	it('falls back when regional backgrounds are disabled even if a review is requested', () => {
		expect(
			resolveMapBackgroundPackageSelection(registry, {
				...heroHouseInput,
				regionalBackgrounds: false
			})
		).toEqual({ mode: 'fallback', definition: null });
	});

	it('gives forced fallback priority over every package request', () => {
		expect(
			resolveMapBackgroundPackageSelection(registry, {
				...heroHouseInput,
				forcedFallback: true
			})
		).toEqual({ mode: 'fallback', definition: null });
	});

	it('uses the default selection after an absent explicit review request', () => {
		expect(
			resolveMapBackgroundPackageSelection(registry, {
				...heroHouseInput,
				reviewPackageIds: [],
				defaultSelection: { packageId: 'hero-house-review', mode: 'production' }
			})
		).toEqual({ mode: 'production', definition: reviewPackage });
	});

	it('preloads only selected packages, deduplicated by package ID', () => {
		expect(
			selectedMapBackgroundPackagesForPreload(registry, [
				heroHouseInput,
				{
					...heroHouseInput,
					mapId: 'ruins-threshold',
					reviewPackageIds: [],
					defaultSelection: null
				},
				{ ...heroHouseInput }
			])
		).toEqual([reviewPackage]);
	});

	it.each([
		['duplicate package IDs', [reviewPackage, reviewPackage], heroHouseInput],
		[
			'two requested packages for one map',
			[reviewPackage, packageDefinition('hero-house-review-2', 'hero-house')],
			{ ...heroHouseInput, reviewPackageIds: ['hero-house-review', 'hero-house-review-2'] }
		],
		[
			'unknown default package ID',
			registry,
			{
				...heroHouseInput,
				reviewPackageIds: [],
				defaultSelection: { packageId: 'unknown', mode: 'review' }
			}
		],
		[
			'default package belonging to another map',
			registry,
			{
				...heroHouseInput,
				reviewPackageIds: [],
				defaultSelection: { packageId: otherPackage.id, mode: 'review' }
			}
		],
		[
			'package with duplicate descriptor IDs',
			[
				{
					...reviewPackage,
					backgrounds: [background('duplicate'), background('duplicate')]
				}
			],
			{ ...heroHouseInput, reviewPackageIds: ['hero-house-review'] }
		],
		[
			'package definition map mismatch',
			[{ ...reviewPackage, mapId: 'ruins-threshold' }],
			heroHouseInput
		]
	] as const)('fails closed for %s', (_label, definitions, input) => {
		expect(resolveMapBackgroundPackageSelection(definitions, input)).toEqual({
			mode: 'fallback',
			definition: null
		});
	});

	it('rejects an empty full-map package instead of selecting a blank presentation', () => {
		const emptyPackage = {
			...reviewPackage,
			assets: [],
			backgrounds: []
		};

		expect(
			resolveMapBackgroundPackageSelection([emptyPackage], {
				...heroHouseInput,
				reviewPackageIds: [emptyPackage.id]
			})
		).toEqual({ mode: 'fallback', definition: null });
	});
});

describe('map background package application', () => {
	const ownerCrops: readonly MapVisualOwnerCrop[] = [
		{ cropId: 'full-map', requiredBackgroundIds: ['hero-house-base'] }
	];

	it('attaches one generic ownership table across all five static source collections', () => {
		const map = {
			id: 'hero-house',
			width: 8,
			height: 8,
			spawnDirection: 'down',
			spawn: { x: 64, y: 64 },
			transitions: [],
			groundPatches: [{ id: 'path', x: 64, y: 64, width: 32, height: 32, tile: 'pathTile' }],
			blockers: [{ id: 'wall', x: 96, y: 64, width: 32, height: 32, kind: 'city-wall' }],
			mapDecor: [{ id: 'rug', x: 128, y: 64, width: 32, height: 32 }],
			fences: [{ id: 'fence', x: 160, y: 64, width: 32, height: 32 }],
			interiorProps: [{ id: 'table', x: 192, y: 64, width: 32, height: 32, frameName: 'table' }]
		} as unknown as WorldMapDefinition;
		const definition: MapBackgroundPackageDefinition = {
			...packageDefinition('hero-house-review', 'hero-house'),
			backgrounds: [background('hero-house-base')],
			assets: assetsFor([background('hero-house-base')]),
			visualOwners: [
				{ sourceType: 'ground-patch', sourceId: 'path', ownerCrops },
				{ sourceType: 'blocker', sourceId: 'wall', ownerCrops },
				{ sourceType: 'decor', sourceId: 'rug', ownerCrops },
				{ sourceType: 'fence', sourceId: 'fence', ownerCrops },
				{ sourceType: 'interior-prop', sourceId: 'table', ownerCrops }
			]
		};

		const transformed = applyMapBackgroundPackage(map, {
			mode: 'review',
			definition
		});

		expect(transformed).not.toBe(map);
		expect(transformed.backgroundImages).toEqual(definition.backgrounds);
		for (const source of [
			transformed.groundPatches?.[0],
			transformed.blockers?.[0],
			transformed.mapDecor?.[0],
			transformed.fences?.[0],
			transformed.interiorProps?.[0]
		]) {
			expect(source?.visual).toEqual({ mode: 'fallback-only', ownerCrops });
		}
		expect(map.groundPatches?.[0]?.visual).toBeUndefined();
		expect(map.interiorProps?.[0]?.visual).toBeUndefined();
	});

	it('returns the authored map by identity for fallback selection', () => {
		const map = packageDefinition(
			'hero-house-review',
			'hero-house'
		) as unknown as WorldMapDefinition;
		expect(applyMapBackgroundPackage(map, { mode: 'fallback', definition: null })).toBe(map);
	});
});
