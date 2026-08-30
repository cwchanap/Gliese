import { describe, expect, it } from 'vitest';

import {
	collectRegisteredVillageInteriorManifests,
	validateVillageInteriorManifest
} from '../../../../tools/validate-village-interior-art';

describe('registered village interior assets', () => {
	it('requires the Shrine of Aurora opaque production base and manifest parity', async () => {
		const manifest = (await collectRegisteredVillageInteriorManifests()).find(
			({ mapId }) => mapId === 'shrine-of-aurora-interior'
		);
		expect(manifest).toBeDefined();
		if (!manifest) return;

		expect(manifest).toMatchObject({
			version: 1,
			mapId: 'shrine-of-aurora-interior',
			dimensionsPx: { width: 1024, height: 896 },
			base: {
				id: 'shrine-of-aurora-interior-painted-base-image',
				textureKey: 'shrine-of-aurora-interior-painted-base',
				path: '/game/assets/interiors/shrine-of-aurora-interior/base.png',
				sha256: '0bfbdf826d745a80b06a54a57c42089e9f80d00a43800a32d6d332a20a79b914'
			},
			navigation: {
				gridId: 'shrine-of-aurora-interior-navigation',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 56,
				clearancePx: 12,
				source: 'layout'
			}
		});
		expect(manifest.foreground).toBeUndefined();
		await expect(validateVillageInteriorManifest(manifest)).resolves.toBeUndefined();
	});

	it('requires the Villager House 3 opaque production base and manifest parity', async () => {
		const manifest = (await collectRegisteredVillageInteriorManifests()).find(
			({ mapId }) => mapId === 'villager-house-3'
		);
		expect(manifest).toBeDefined();
		if (!manifest) return;

		expect(manifest).toMatchObject({
			version: 1,
			mapId: 'villager-house-3',
			dimensionsPx: { width: 1024, height: 704 },
			base: {
				id: 'villager-house-3-painted-base-image',
				textureKey: 'villager-house-3-painted-base',
				path: '/game/assets/interiors/villager-house-3/base.png',
				sha256: '9b021c433565b0fe68c7699a2b7bd646de3273511b144efb34d9e10aba93567f'
			},
			navigation: {
				gridId: 'villager-house-3-navigation',
				cellSizePx: 16,
				widthCells: 64,
				heightCells: 44,
				clearancePx: 12,
				source: 'layout'
			}
		});
		expect(manifest.foreground).toBeUndefined();
		await expect(validateVillageInteriorManifest(manifest)).resolves.toBeUndefined();
	});

	it('validates every registered interior manifest and exact opaque base image', async () => {
		const manifests = await collectRegisteredVillageInteriorManifests();
		for (const manifest of manifests) await validateVillageInteriorManifest(manifest);

		expect(manifests).toHaveLength(7);
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
			},
			{
				version: 1,
				mapId: 'shrine-of-aurora-interior',
				dimensionsPx: { width: 1024, height: 896 },
				base: {
					id: 'shrine-of-aurora-interior-painted-base-image',
					textureKey: 'shrine-of-aurora-interior-painted-base',
					path: '/game/assets/interiors/shrine-of-aurora-interior/base.png',
					sha256: '0bfbdf826d745a80b06a54a57c42089e9f80d00a43800a32d6d332a20a79b914'
				},
				navigation: {
					gridId: 'shrine-of-aurora-interior-navigation',
					cellSizePx: 16,
					widthCells: 64,
					heightCells: 56,
					clearancePx: 12,
					source: 'layout'
				}
			},
			{
				version: 1,
				mapId: 'villager-house-1',
				dimensionsPx: { width: 1280, height: 832 },
				base: {
					id: 'villager-house-1-painted-base-image',
					textureKey: 'villager-house-1-painted-base',
					path: '/game/assets/interiors/villager-house-1/base.png',
					sha256: 'e3041189516d424cb35e3e4153712231dcfc9b3c3a6fd321cd53bc7ec1d4118a'
				},
				navigation: {
					gridId: 'villager-house-1-navigation',
					cellSizePx: 16,
					widthCells: 80,
					heightCells: 52,
					clearancePx: 12,
					source: 'layout'
				}
			},
			{
				version: 1,
				mapId: 'villager-house-2',
				dimensionsPx: { width: 1280, height: 768 },
				base: {
					id: 'villager-house-2-painted-base-image',
					textureKey: 'villager-house-2-painted-base',
					path: '/game/assets/interiors/villager-house-2/base.png',
					sha256: 'b8cc306bbb57645d93f8358b435a870ebe88f765d4a04e9a581a09b18b710ccf'
				},
				navigation: {
					gridId: 'villager-house-2-navigation',
					cellSizePx: 16,
					widthCells: 80,
					heightCells: 48,
					clearancePx: 12,
					source: 'layout'
				}
			},
			{
				version: 1,
				mapId: 'villager-house-3',
				dimensionsPx: { width: 1024, height: 704 },
				base: {
					id: 'villager-house-3-painted-base-image',
					textureKey: 'villager-house-3-painted-base',
					path: '/game/assets/interiors/villager-house-3/base.png',
					sha256: '9b021c433565b0fe68c7699a2b7bd646de3273511b144efb34d9e10aba93567f'
				},
				navigation: {
					gridId: 'villager-house-3-navigation',
					cellSizePx: 16,
					widthCells: 64,
					heightCells: 44,
					clearancePx: 12,
					source: 'layout'
				}
			}
		]);
	});
});
