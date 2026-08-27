import { describe, expect, it } from 'vitest';

import {
	collectRegisteredVillageInteriorManifests,
	validateVillageInteriorManifest
} from '../../../../tools/validate-village-interior-art';

describe('registered village interior assets', () => {
	it('validates every registered interior manifest and exact opaque base image', async () => {
		const manifests = await collectRegisteredVillageInteriorManifests();
		for (const manifest of manifests) await validateVillageInteriorManifest(manifest);

		expect(manifests).toHaveLength(3);
		expect(manifests).toEqual([
			{
				version: 1,
				mapId: 'guild-hall',
				dimensionsPx: { width: 1024, height: 832 },
				base: {
					id: 'guild-hall-painted-base-image',
					textureKey: 'guild-hall-painted-base',
					path: '/game/assets/interiors/guild-hall/base.png',
					sha256: '320a18c6e6ebd59ec25fce93d89b10ed3e469812befe316e62b068b4c690163d'
				},
				foreground: {
					id: 'guild-hall-painted-foreground-image',
					textureKey: 'guild-hall-painted-foreground',
					path: '/game/assets/interiors/guild-hall/foreground.png',
					sha256: '4ff46a839dc19bcce9a514cc2da5ec195892971a761574b0754d39ffef92e1f9'
				},
				navigation: {
					gridId: 'guild-hall-navigation',
					cellSizePx: 16,
					widthCells: 64,
					heightCells: 52,
					clearancePx: 12,
					source: 'layout'
				}
			},
			{
				version: 1,
				mapId: 'hero-house',
				dimensionsPx: { width: 704, height: 576 },
				base: {
					id: 'hero-house-painted-base-image',
					textureKey: 'hero-house-painted-base',
					path: '/game/assets/interiors/hero-house/base.png',
					sha256: 'ceba64bb3c132969c17dd3021c1d198c50bb4998e21f754ee5d68acf1656f2c0'
				},
				navigation: {
					gridId: 'hero-house-navigation',
					cellSizePx: 16,
					widthCells: 44,
					heightCells: 36,
					clearancePx: 12,
					source: 'layout'
				}
			},
			{
				version: 1,
				mapId: 'item-shop',
				dimensionsPx: { width: 832, height: 640 },
				base: {
					id: 'item-shop-painted-base-image',
					textureKey: 'item-shop-painted-base',
					path: '/game/assets/interiors/item-shop/base.png',
					sha256: 'e13e434d56c15278fe4b3b66b668572ee9a153cc4eacc2dfdd1057f9d7afc962'
				},
				navigation: {
					gridId: 'item-shop-navigation',
					cellSizePx: 16,
					widthCells: 52,
					heightCells: 40,
					clearancePx: 12,
					source: 'layout'
				}
			}
		]);
	});
});
