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
import { VILLAGE_INTERIOR_NAVIGATION_SOURCES } from './village-interior-navigation-sources';
import { VILLAGE_INTERIOR_PACKAGES } from './village-interior-packages';

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
		expect(VILLAGE_INTERIOR_PACKAGES).toEqual([]);
		expect(Object.isFrozen(VILLAGE_INTERIOR_NAVIGATION_SOURCES)).toBe(true);
		expect(Object.isFrozen(VILLAGE_INTERIOR_PACKAGES)).toBe(true);
	});

	it('preserves Meadow packages and defaults while keeping IDs and maps unique', () => {
		expect(MAP_BACKGROUND_PACKAGE_REGISTRY).toEqual([
			MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE,
			MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE
		]);
		expect(MAP_BACKGROUND_DEFAULT_SELECTIONS).toEqual({
			'meadow-entry': MEADOW_ENTRY_DEFAULT_PACKAGE_SELECTION
		});
		expect(new Set(MAP_BACKGROUND_PACKAGE_REGISTRY.map(({ id }) => id)).size).toBe(
			MAP_BACKGROUND_PACKAGE_REGISTRY.length
		);
		expect(Object.isFrozen(MAP_BACKGROUND_PACKAGE_REGISTRY)).toBe(true);
		expect(Object.isFrozen(MAP_BACKGROUND_DEFAULT_SELECTIONS)).toBe(true);
		expect(MAP_BACKGROUND_PACKAGE_REGISTRY.every(({ mapId }) => mapId.length > 0)).toBe(true);
	});
});
