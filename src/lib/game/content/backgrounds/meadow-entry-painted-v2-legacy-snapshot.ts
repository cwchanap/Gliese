import legacySnapshot from './meadow-entry-painted-v2-legacy-snapshot.json';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';

import type {
	MeadowEntryAuthoringRegion,
	MeadowEntryCrossRegionCoverage,
	MeadowEntryOutlierResolution,
	MeadowEntryAuthoringRegionId
} from './meadow-entry-authoring-layout';
import type { MeadowEntryBakeOwnershipEntry } from './meadow-entry-bake-ownership';
import type { MeadowEntrySourceRecord } from './meadow-entry-source-catalog';

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_CONTROL_FINGERPRINT =
	'a9de4332a3c5537f25d80eaeb2fcf1476ee97d76636f084bd9841da8055c96c7';

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_GAMEPLAY_FINGERPRINT =
	'0e9a3a361e8013de2df298b7fe239ed2cf45457789d55df3ac6a11e86c9f61be';

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_AUTHORING_FINGERPRINT =
	'b301c6734ea41e5f6edcb0eef8c7acf087d60074304d97fe7ca38d9890cd2b48';

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_RENDERER_IMPLEMENTATION_SHA256 =
	'5c4bb89e23d14142c4169fe47c1066d426067a736ddbb63c58b3725abbb9405f';

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_FILE_HASHES = Object.freeze({
	'src/lib/game/content/maps/meadow-entry.ts':
		'7c94d3aa9d0f07d7dba71601188aa815c88d07541882537f641c6d7c5dd80d06',
	'src/lib/game/content/maps/regions/village.ts':
		'6ab333c46e091c10ef8da62cb6e889fc8963add4def39fa0f74c0dc03d06fa1b',
	'src/lib/game/content/maps/regions/wildwood.ts':
		'e12743ca3927eb96d9530298c6d0d84854175024edcd85d8f1081873be43892a',
	'src/lib/game/content/maps/regions/mistfen.ts':
		'57d5f442379df97b2f1ced4953aa93f4e44fc918d47a53450d15c190960a677c',
	'src/lib/game/content/maps/regions/silverpine.ts':
		'09c2129a0a5cfbf412f53c30bc6cd690058683a6de98cb4d91f180346c1b17cc',
	'src/lib/game/content/maps/regions/coast.ts':
		'487ec93d7a3985702d84b97f587d0fd5452ebe696d13848ad089a398bffac009',
	'src/lib/game/content/maps/regions/crossroads.ts':
		'f409235a9b1c579479080e622898c4efbea0d86010971ff6292f2d61b33c7170',
	'src/lib/game/content/maps/regions/paths.ts':
		'164ddb49941d4a5312aacf4fc5f39553015eff02678c884a474b2e6c8d598856',
	'src/lib/game/content/maps/blocker-rendering.ts':
		'd954110dc507d59656a21ee58bd5a1095304ed0d5b2c9db98fd09f4fc2e38223',
	'src/lib/game/save/save-state.ts':
		'0208c30db08f620cd92eda454af4fe04be84e5525221eb9e50144fa621caffc0',
	'src/lib/game/core/collision.ts':
		'5f487c10b01a6b10f4a1ad676d04f2a8c1c1f48e84d02d9ef270b98745a09e24'
} as const);

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_MASK_HASHES = Object.freeze({
	otherProtected: '3f22afca164436a44c73954b208896b9c227986e018b81ff8cc041da6023f656',
	groundAllowed: 'c1bc20acc56b98ae586510f4332bc93657627c4c9b435620247e13181b6cc97d',
	sceneryAllowed: 'ca1c7ec5bbd4b93eb2be7591f074fd458c54aa473944ab7f327c596536d9e156',
	hedgeAllowed: 'd7b76c254bfd69e36b37b26738e0b8322918dcf602a2c02d2f3de18096af16d7',
	woodlandAllowed: '07090d49adc2aa982363208f0cd61a98d8b88863d7a3f937575c0ead5605e3e1'
} as const);

interface LegacySnapshotShape {
	map: WorldMapDefinition;
	catalog: MeadowEntrySourceRecord[];
	ownership: { entries: MeadowEntryBakeOwnershipEntry[] };
	authoring: {
		authoringRegions: MeadowEntryAuthoringRegion[];
		crossRegionCoverage: MeadowEntryCrossRegionCoverage[];
		outlierResolutions: MeadowEntryOutlierResolution[];
		primarySourceOwners: Record<string, MeadowEntryAuthoringRegionId>;
	};
}

function deepFreeze<T>(value: T): T {
	if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
	Object.freeze(value);
	for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
	return value;
}

const snapshot = legacySnapshot as unknown as LegacySnapshotShape;

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_MAP = deepFreeze(snapshot.map);
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_CATALOG = deepFreeze(snapshot.catalog);
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP = deepFreeze(snapshot.ownership.entries);
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS = deepFreeze(
	snapshot.authoring.authoringRegions
);
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_CROSS_REGION_COVERAGE = deepFreeze(
	snapshot.authoring.crossRegionCoverage
);
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_OUTLIER_RESOLUTIONS = deepFreeze(
	snapshot.authoring.outlierResolutions
);
export const MEADOW_ENTRY_PAINTED_V2_LEGACY_PRIMARY_SOURCE_OWNERS = deepFreeze(
	snapshot.authoring.primarySourceOwners
);

const LEGACY_RIVER_SOURCE_IDS = new Set([
	'silverpine-headwater-water',
	'silverpine-falls-water',
	'north-river-water',
	'central-river-water',
	'lower-river-water',
	'river-delta-water',
	'estuary-west-water',
	'estuary-east-water',
	'silverpineBridge-path',
	'mistfenBridge-path',
	'sundropBridge-path',
	'ferryApproach-path',
	'silverpine-headwater-collision',
	'silverpine-falls-collision',
	'north-river-collision',
	'central-river-collision',
	'lower-river-collision',
	'river-delta-collision',
	'estuary-west-collision',
	'estuary-east-collision'
]);

const SHA256 = /^[0-9a-f]{64}$/;
const LEGACY_WORLD_BOUNDS = { left: 0, top: 0, right: 6_400, bottom: 6_400 } as const;

function assertHash(value: string, label: string): void {
	if (!SHA256.test(value)) throw new Error(`Legacy Meadow Entry ${label} is not a SHA-256 hash`);
}

function assertBounds(
	value: { left: number; top: number; right: number; bottom: number },
	label: string
): void {
	if (
		!Number.isInteger(value.left) ||
		!Number.isInteger(value.top) ||
		!Number.isInteger(value.right) ||
		!Number.isInteger(value.bottom) ||
		value.left < LEGACY_WORLD_BOUNDS.left ||
		value.top < LEGACY_WORLD_BOUNDS.top ||
		value.right > LEGACY_WORLD_BOUNDS.right ||
		value.bottom > LEGACY_WORLD_BOUNDS.bottom ||
		value.left >= value.right ||
		value.top >= value.bottom
	) {
		throw new Error(`Legacy Meadow Entry ${label} bounds drifted`);
	}
}

function sourceKey(record: MeadowEntrySourceRecord): string {
	return `${record.ref.sourceType}:${record.ref.sourceId}`;
}

export function validateMeadowEntryPaintedV2LegacySnapshot(): void {
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_MAP.id !== 'meadow-entry')
		throw new Error('Legacy Meadow Entry snapshot map id drifted');
	if (
		MEADOW_ENTRY_PAINTED_V2_LEGACY_MAP.width !== 200 ||
		MEADOW_ENTRY_PAINTED_V2_LEGACY_MAP.height !== 200
	)
		throw new Error('Legacy Meadow Entry snapshot map dimensions drifted');
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_MAP.groundPatches?.length !== 190)
		throw new Error('Legacy Meadow Entry ground-patch inventory length drifted');
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_CATALOG.length !== 374)
		throw new Error('Legacy Meadow Entry source catalog length drifted');
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP.length !== 374)
		throw new Error('Legacy Meadow Entry bake ownership length drifted');
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS.length !== 12)
		throw new Error('Legacy Meadow Entry authoring-region inventory length drifted');
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_CROSS_REGION_COVERAGE.length !== 15)
		throw new Error('Legacy Meadow Entry cross-region inventory length drifted');
	if (MEADOW_ENTRY_PAINTED_V2_LEGACY_OUTLIER_RESOLUTIONS.length !== 41)
		throw new Error('Legacy Meadow Entry outlier inventory length drifted');
	if (Object.keys(MEADOW_ENTRY_PAINTED_V2_LEGACY_PRIMARY_SOURCE_OWNERS).length !== 374)
		throw new Error('Legacy Meadow Entry primary-owner inventory length drifted');

	for (const [label, hash] of [
		['control fingerprint', MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_CONTROL_FINGERPRINT],
		['gameplay fingerprint', MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_GAMEPLAY_FINGERPRINT],
		['authoring fingerprint', MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_AUTHORING_FINGERPRINT],
		['renderer implementation hash', MEADOW_ENTRY_PAINTED_V2_LEGACY_RENDERER_IMPLEMENTATION_SHA256]
	] as const) {
		assertHash(hash, label);
	}
	for (const [path, hash] of Object.entries(MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_FILE_HASHES)) {
		assertHash(hash, `source-file hash for ${path}`);
	}
	for (const [name, hash] of Object.entries(MEADOW_ENTRY_PAINTED_V2_LEGACY_APPROVED_MASK_HASHES)) {
		assertHash(hash, `mask hash for ${name}`);
	}

	const catalogKeys = new Set(MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_CATALOG.map(sourceKey));
	if (catalogKeys.size !== MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_CATALOG.length)
		throw new Error('Legacy Meadow Entry source catalog contains duplicate IDs');
	for (const record of MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_CATALOG) {
		if (LEGACY_RIVER_SOURCE_IDS.has(record.ref.sourceId))
			throw new Error(
				`Legacy Meadow Entry source catalog contains Package 1 river source ${sourceKey(record)}`
			);
	}
	const ownershipKeys = MEADOW_ENTRY_PAINTED_V2_LEGACY_BAKE_OWNERSHIP.map(
		(entry) => `${entry.ref.sourceType}:${entry.ref.sourceId}`
	);
	if (new Set(ownershipKeys).size !== ownershipKeys.length)
		throw new Error('Legacy Meadow Entry bake ownership contains duplicate IDs');
	for (const key of ownershipKeys) {
		if (!catalogKeys.has(key))
			throw new Error(`Legacy Meadow Entry ownership has unknown source ${key}`);
	}
	const regionIds = new Set(MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS.map(({ id }) => id));
	if (regionIds.size !== MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS.length)
		throw new Error('Legacy Meadow Entry authoring regions contain duplicate IDs');
	for (const region of MEADOW_ENTRY_PAINTED_V2_LEGACY_AUTHORING_REGIONS) {
		assertBounds(region.reviewBounds, `authoring region ${region.id}`);
		for (const neighbor of region.neighbors) {
			if (!regionIds.has(neighbor))
				throw new Error(`Legacy Meadow Entry authoring region has unknown neighbor ${neighbor}`);
		}
	}
	for (const coverage of MEADOW_ENTRY_PAINTED_V2_LEGACY_CROSS_REGION_COVERAGE) {
		if (!catalogKeys.has(coverage.sourceKey))
			throw new Error(
				`Legacy Meadow Entry cross-region coverage has unknown source ${coverage.sourceKey}`
			);
		for (const bounds of coverage.bounds)
			assertBounds(bounds, `cross-region ${coverage.sourceKey}`);
		for (const region of coverage.secondaryRegions) {
			if (!regionIds.has(region))
				throw new Error(`Legacy Meadow Entry cross-region coverage has unknown region ${region}`);
		}
	}
	for (const resolution of MEADOW_ENTRY_PAINTED_V2_LEGACY_OUTLIER_RESOLUTIONS) {
		if (!catalogKeys.has(resolution.sourceKey))
			throw new Error(`Legacy Meadow Entry outlier has unknown source ${resolution.sourceKey}`);
		if (resolution.mode === 'cross-region') {
			if (
				!Number.isInteger(resolution.coverageIndex) ||
				resolution.coverageIndex < 0 ||
				resolution.coverageIndex >= MEADOW_ENTRY_PAINTED_V2_LEGACY_CROSS_REGION_COVERAGE.length
			)
				throw new Error(
					`Legacy Meadow Entry outlier coverage index drifted for ${resolution.sourceKey}`
				);
		} else if (resolution.mode === 'split') {
			for (const bounds of resolution.bounds)
				assertBounds(bounds, `outlier split ${resolution.sourceKey}`);
		} else if (resolution.mode === 're-owned') {
			if (!regionIds.has(resolution.owner))
				throw new Error(`Legacy Meadow Entry outlier owner drifted for ${resolution.sourceKey}`);
		} else if (resolution.mode === 'deferred-to-disposition' && resolution.reason.length === 0) {
			throw new Error(
				`Legacy Meadow Entry outlier disposition reason is empty for ${resolution.sourceKey}`
			);
		}
	}
	for (const [key, owner] of Object.entries(MEADOW_ENTRY_PAINTED_V2_LEGACY_PRIMARY_SOURCE_OWNERS)) {
		if (!catalogKeys.has(key) || !regionIds.has(owner))
			throw new Error(`Legacy Meadow Entry primary owner drifted for ${key}`);
	}
	const oldWildwoodBank = MEADOW_ENTRY_PAINTED_V2_LEGACY_SOURCE_CATALOG.find(
		(record) => record.ref.sourceId === 'wildwood-forest-lane-west-bank'
	);
	if (
		oldWildwoodBank?.bounds?.left !== 4968 ||
		oldWildwoodBank.bounds.top !== 3200 ||
		oldWildwoodBank.bounds.right !== 5032 ||
		oldWildwoodBank.bounds.bottom !== 5300
	)
		throw new Error('Legacy Meadow Entry Wildwood blocker bounds drifted');
}

validateMeadowEntryPaintedV2LegacySnapshot();
