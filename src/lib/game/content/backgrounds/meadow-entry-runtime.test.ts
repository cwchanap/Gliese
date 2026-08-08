import { describe, expect, it } from 'vitest';

import {
	MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS,
	MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS
} from '$lib/game/content/generated/meadow-entry-runtime';

import {
	MEADOW_ENTRY_ACTIVE_CROP_IDS,
	activeMeadowEntryRuntimeVisualOwners,
	meadowEntryRuntimeBackgroundAssets,
	meadowEntryRuntimeBackgroundImages,
	meadowEntryRuntimeBackgrounds
} from './meadow-entry-runtime';

const EXPECTED_ACTIVE_CROP_IDS = [
	'sundrop-village-underlay',
	'village-crossroads-connector',
	'crossroads-coast-connector',
	'crossroads-mistfen-connector',
	'crossroads-silverpine-connector',
	'crossroads-wildwood-connector',
	'crossroads',
	'wildwood',
	'outer-boundary-east-forest-lane',
	'tidewatch-coast',
	'mistfen',
	'silverpine'
];

const EXPECTED_ACTIVE_BACKGROUND_IDS = [
	'meadow-entry-sundrop-village-underlay-base-image',
	'meadow-entry-outer-boundary-east-forest-lane-base-image',
	'meadow-entry-village-crossroads-connector-base-image',
	'meadow-entry-village-crossroads-connector-foreground-image',
	'meadow-entry-crossroads-coast-connector-base-image',
	'meadow-entry-crossroads-coast-connector-foreground-image',
	'meadow-entry-crossroads-mistfen-connector-base-image',
	'meadow-entry-crossroads-mistfen-connector-foreground-image',
	'meadow-entry-crossroads-silverpine-connector-base-image',
	'meadow-entry-crossroads-silverpine-connector-foreground-image',
	'meadow-entry-crossroads-wildwood-connector-base-image',
	'meadow-entry-crossroads-wildwood-connector-foreground-image',
	'meadow-entry-crossroads-base-image',
	'meadow-entry-crossroads-foreground-image',
	'meadow-entry-tidewatch-coast-base-image',
	'meadow-entry-tidewatch-coast-foreground-image',
	'meadow-entry-mistfen-base-image',
	'meadow-entry-mistfen-foreground-image',
	'meadow-entry-silverpine-base-image',
	'meadow-entry-silverpine-foreground-image',
	'meadow-entry-wildwood-base-image',
	'meadow-entry-wildwood-foreground-image'
];

describe('Meadow Entry PR-1 runtime projection', () => {
	it('activates exactly the approved Crossroads, connector, Wildwood, and east-boundary crops', () => {
		expect(MEADOW_ENTRY_ACTIVE_CROP_IDS).toEqual(EXPECTED_ACTIVE_CROP_IDS);
		expect(meadowEntryRuntimeBackgrounds).toHaveLength(22);
		expect(meadowEntryRuntimeBackgrounds.map(({ id }) => id)).toEqual(
			EXPECTED_ACTIVE_BACKGROUND_IDS
		);
		expect(meadowEntryRuntimeBackgrounds).toEqual(
			MEADOW_ENTRY_APPROVED_RUNTIME_BACKGROUNDS.filter(({ cropId }) =>
				EXPECTED_ACTIVE_CROP_IDS.includes(cropId)
			)
		);
	});

	it('projects browser-safe background images and structural preload assets', () => {
		expect(meadowEntryRuntimeBackgroundImages).toEqual(
			meadowEntryRuntimeBackgrounds.map(
				({ cropId: _cropId, path: _path, ...background }) => background
			)
		);
		for (const background of meadowEntryRuntimeBackgroundImages) {
			expect(background).not.toHaveProperty('cropId');
			expect(background).not.toHaveProperty('path');
		}
		expect(meadowEntryRuntimeBackgroundAssets).toEqual(
			meadowEntryRuntimeBackgrounds.map(({ textureKey, path }) => ({ key: textureKey, path }))
		);
	});

	it('assigns fallback ownership only to rows with a complete active crop group', () => {
		const activeBackgroundIds = new Set(meadowEntryRuntimeBackgrounds.map(({ id }) => id));

		expect(activeMeadowEntryRuntimeVisualOwners).toHaveLength(126);
		expect(
			Object.fromEntries(
				['blocker', 'decor', 'fence'].map((sourceType) => [
					sourceType,
					activeMeadowEntryRuntimeVisualOwners.filter((row) => row.sourceType === sourceType).length
				])
			)
		).toEqual({ blocker: 51, decor: 69, fence: 6 });
		for (const row of activeMeadowEntryRuntimeVisualOwners) {
			expect(row.visual).toMatchObject({ mode: 'fallback-only' });
			expect(row.visual.ownerCrops).not.toHaveLength(0);
			for (const crop of row.visual.ownerCrops) {
				expect(crop.requiredBackgroundIds.every((id) => activeBackgroundIds.has(id))).toBe(true);
			}
		}

		for (const generatedOwner of MEADOW_ENTRY_RUNTIME_VISUAL_OWNERS) {
			const completeOwnerCrops = generatedOwner.ownerCrops.filter((crop) =>
				crop.requiredBackgroundIds.every((id) => activeBackgroundIds.has(id))
			);
			const activeOwner = activeMeadowEntryRuntimeVisualOwners.find(
				({ sourceType, sourceId }) =>
					sourceType === generatedOwner.sourceType && sourceId === generatedOwner.sourceId
			);

			if (completeOwnerCrops.length === 0) {
				expect(
					activeOwner,
					`${generatedOwner.sourceType}:${generatedOwner.sourceId}`
				).toBeUndefined();
			} else {
				expect(activeOwner, `${generatedOwner.sourceType}:${generatedOwner.sourceId}`).toEqual({
					sourceType: generatedOwner.sourceType,
					sourceId: generatedOwner.sourceId,
					visual: { mode: 'fallback-only', ownerCrops: completeOwnerCrops }
				});
			}
		}

		expect(
			activeMeadowEntryRuntimeVisualOwners.find(
				({ sourceType, sourceId }) =>
					sourceType === 'blocker' && sourceId === 'coast-approach-west-bank'
			)
		).toEqual({
			sourceType: 'blocker',
			sourceId: 'coast-approach-west-bank',
			visual: {
				mode: 'fallback-only',
				ownerCrops: [
					{
						cropId: 'tidewatch-coast',
						requiredBackgroundIds: ['meadow-entry-tidewatch-coast-base-image']
					}
				]
			}
		});
	});

	it('retains both active alternatives for the Wildwood north-climb east bank', () => {
		expect(
			activeMeadowEntryRuntimeVisualOwners.find(
				({ sourceType, sourceId }) =>
					sourceType === 'blocker' && sourceId === 'wildwood-north-climb-east-bank'
			)
		).toEqual({
			sourceType: 'blocker',
			sourceId: 'wildwood-north-climb-east-bank',
			visual: {
				mode: 'fallback-only',
				ownerCrops: [
					{
						cropId: 'outer-boundary-east-forest-lane',
						requiredBackgroundIds: ['meadow-entry-outer-boundary-east-forest-lane-base-image']
					},
					{
						cropId: 'wildwood',
						requiredBackgroundIds: ['meadow-entry-wildwood-base-image']
					}
				]
			}
		});
	});
});
