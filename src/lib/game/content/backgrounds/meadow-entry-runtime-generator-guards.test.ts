import { describe, expect, it, vi } from 'vitest';

const mockData = vi.hoisted(() => ({
	bakeOwnership: [] as Array<Record<string, unknown>>,
	sourceCatalog: [] as Array<Record<string, unknown>>,
	sundropObstacleOwnership: [] as Array<{ blockerId: string }>
}));

vi.mock('$lib/game/content/backgrounds/meadow-entry-bake-ownership', () => ({
	MEADOW_ENTRY_BAKE_OWNERSHIP: mockData.bakeOwnership,
	MEADOW_ENTRY_PAINTED_V2_BAKE_OWNERSHIP: []
}));

vi.mock('$lib/game/content/backgrounds/meadow-entry-source-catalog', () => ({
	collectMeadowEntrySourceCatalog: () => mockData.sourceCatalog,
	meadowEntrySourceKey: (ref: { sourceType: string; sourceId: string }) =>
		`${ref.sourceType}:${ref.sourceId}`
}));

vi.mock('$lib/game/content/backgrounds/sundrop-village-obstacle-ownership', () => ({
	SUNDROP_VILLAGE_OBSTACLE_OWNERSHIP: mockData.sundropObstacleOwnership
}));

import { collectMeadowEntryRuntimeData } from '../../../../../tools/generate-meadow-entry-runtime';
import { MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS } from './meadow-entry-painted-v2-crop-manifest';

function input(): {
	crops: typeof MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS;
	bakeOwnership: readonly never[];
	approvedExports: readonly never[];
	runtimeRoot: string;
} {
	return {
		crops: MEADOW_ENTRY_PAINTED_V2_PILOT_CROPS,
		bakeOwnership: mockData.bakeOwnership as never,
		approvedExports: [],
		runtimeRoot: 'public/game/assets/regions/meadow-entry-painted-v2'
	};
}

function makeSourceCatalogEntry(
	sourceType: string,
	sourceId: string,
	bounds: unknown
): Record<string, unknown> {
	return {
		ref: { sourceType, sourceId },
		bounds,
		coverageBounds: bounds,
		regions: [],
		ownership: []
	};
}

function makeBakeOwnershipEntry(overrides: Record<string, unknown>): Record<string, unknown> {
	return {
		ref: { sourceType: 'blocker', sourceId: 'test-entry' },
		primaryRegionId: 'test-region',
		disposition: { mode: 'base-static', margins: { left: 0, top: 0, right: 0, bottom: 0 } },
		runtimeRequirement: 'existing-blocker-fallback',
		...overrides
	};
}

describe('collectMeadowEntryRuntimeData error guards', () => {
	it('throws for an unsupported runtime ownership disposition', () => {
		mockData.bakeOwnership.length = 0;
		mockData.bakeOwnership.push(
			makeBakeOwnershipEntry({
				disposition: { mode: 'unknown-mode', margins: { left: 0, top: 0, right: 0, bottom: 0 } }
			})
		);
		mockData.sundropObstacleOwnership.length = 0;
		mockData.sourceCatalog.length = 0;
		mockData.sourceCatalog.push(
			makeSourceCatalogEntry('blocker', 'test-entry', {
				left: 0,
				top: 0,
				right: 100,
				bottom: 100
			})
		);

		expect(() => collectMeadowEntryRuntimeData(input())).toThrow(
			/Unsupported runtime ownership disposition/
		);
	});

	it('throws for an unsupported runtime ownership source type', () => {
		mockData.bakeOwnership.length = 0;
		mockData.bakeOwnership.push(
			makeBakeOwnershipEntry({
				ref: { sourceType: 'invalid-type', sourceId: 'test-entry' }
			})
		);
		mockData.sundropObstacleOwnership.length = 0;
		mockData.sourceCatalog.length = 0;

		expect(() => collectMeadowEntryRuntimeData(input())).toThrow(
			/Unsupported runtime ownership source/
		);
	});

	it('throws when a runtime owner source has null bounds', () => {
		mockData.bakeOwnership.length = 0;
		mockData.bakeOwnership.push(makeBakeOwnershipEntry({}));
		mockData.sundropObstacleOwnership.length = 0;
		mockData.sourceCatalog.length = 0;
		mockData.sourceCatalog.push(makeSourceCatalogEntry('blocker', 'test-entry', null));

		expect(() => collectMeadowEntryRuntimeData(input())).toThrow(
			/Missing bounds for Meadow Entry runtime owner/
		);
	});

	it('throws when a runtime owner source is missing from the catalog', () => {
		mockData.bakeOwnership.length = 0;
		mockData.bakeOwnership.push(makeBakeOwnershipEntry({}));
		mockData.sundropObstacleOwnership.length = 0;
		mockData.sourceCatalog.length = 0;

		expect(() => collectMeadowEntryRuntimeData(input())).toThrow(
			/Missing bounds for Meadow Entry runtime owner/
		);
	});

	it('throws when no approved crop contains the required bounds for a base-static owner', () => {
		mockData.bakeOwnership.length = 0;
		mockData.bakeOwnership.push(
			makeBakeOwnershipEntry({
				ref: { sourceType: 'blocker', sourceId: 'remote-entry' },
				disposition: {
					mode: 'base-static',
					margins: { left: 0, top: 0, right: 0, bottom: 0 }
				}
			})
		);
		mockData.sundropObstacleOwnership.length = 0;
		mockData.sourceCatalog.length = 0;
		mockData.sourceCatalog.push(
			makeSourceCatalogEntry('blocker', 'remote-entry', {
				left: 0,
				top: 0,
				right: 96,
				bottom: 128
			})
		);

		expect(() => collectMeadowEntryRuntimeData(input())).toThrow(
			/No complete Meadow Entry owner crop/
		);
	});
});
