import {
	MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS,
	MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
} from '$lib/game/content/generated/meadow-entry-runtime';

export const MEADOW_ENTRY_ACTIVE_CROP_IDS = [
	'sundrop-village-underlay',
	'village-crossroads-connector',
	'crossroads-coast-connector',
	'crossroads-mistfen-connector',
	'crossroads-silverpine-connector',
	'crossroads-wildwood-connector',
	'crossroads',
	'wildwood',
	'outer-boundary-east-forest-lane'
] as const;

const activeCropIds = new Set<string>(MEADOW_ENTRY_ACTIVE_CROP_IDS);

export const meadowEntryRuntimeBackgrounds = MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS.filter(
	(background) => activeCropIds.has(background.cropId)
);

export const meadowEntryRuntimeBackgroundImages = meadowEntryRuntimeBackgrounds.map(
	({ cropId: _cropId, path: _path, ...background }) => background
);

export const meadowEntryRuntimeBackgroundAssets = meadowEntryRuntimeBackgrounds.map(
	({ textureKey, path }) => ({ key: textureKey, path })
);

const activeBackgroundIds = new Set(meadowEntryRuntimeBackgrounds.map(({ id }) => id));

export const activeMeadowEntryRuntimeVisualOwners = MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS.flatMap(
	(row) => {
		const ownerCrops = row.ownerCrops.filter((crop) =>
			crop.requiredBackgroundIds.every((id) => activeBackgroundIds.has(id))
		);
		if (ownerCrops.length === 0) return [];

		return [
			{
				sourceType: row.sourceType,
				sourceId: row.sourceId,
				visual: { mode: 'fallback-only' as const, ownerCrops }
			}
		];
	}
);
