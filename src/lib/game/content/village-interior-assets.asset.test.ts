import { describe, expect, it } from 'vitest';

import {
	collectRegisteredVillageInteriorManifests,
	validateVillageInteriorManifest
} from '../../../../tools/validate-village-interior-art';

describe('registered village interior assets', () => {
	it('validates the registered Hero House manifest and exact opaque base image', async () => {
		const manifests = await collectRegisteredVillageInteriorManifests();
		for (const manifest of manifests) await validateVillageInteriorManifest(manifest);

		expect(manifests).toHaveLength(1);
		expect(manifests[0]).toEqual({
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
		});
	});
});
