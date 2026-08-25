import { describe, expect, it } from 'vitest';

import {
	collectRegisteredVillageInteriorManifests,
	validateVillageInteriorManifest
} from '../../../../tools/validate-village-interior-art';

describe('registered village interior assets', () => {
	it('validates every currently registered manifest and image, including the empty registry', async () => {
		const manifests = await collectRegisteredVillageInteriorManifests();
		for (const manifest of manifests) await validateVillageInteriorManifest(manifest);
		expect(manifests).toEqual([]);
	});
});
