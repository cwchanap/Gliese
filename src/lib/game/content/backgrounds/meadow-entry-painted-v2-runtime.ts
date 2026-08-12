import type { RegionalBackgroundPreloadAsset } from '$lib/game/content/assets';
import type { MapBackgroundImage, MapVisualOwnerCrop } from '$lib/game/content/maps/types';

import {
	MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS,
	type GeneratedMeadowEntryBackground,
	type GeneratedMeadowEntryVisualOwner
} from './meadow-entry-painted-v2.generated';

export type MeadowEntryPaintedMode = 'fallback' | 'pilot' | 'production';

export interface MeadowEntryPaintedSelection {
	readonly mode: MeadowEntryPaintedMode;
	readonly assets: readonly RegionalBackgroundPreloadAsset[];
	readonly backgrounds: readonly MapBackgroundImage[];
	readonly visualOwners: readonly GeneratedMeadowEntryVisualOwner[];
}

export const MEADOW_ENTRY_DEFAULT_PAINTED_MODE: MeadowEntryPaintedMode = 'fallback';

export interface MeadowEntryPaintedSelectionOptions {
	readonly regionalBackgrounds: boolean;
	readonly meadowPaintedPilot: boolean;
}

function freezeBackground(background: GeneratedMeadowEntryBackground): MapBackgroundImage {
	return Object.freeze({
		id: background.id,
		x: background.x,
		y: background.y,
		width: background.width,
		height: background.height,
		textureKey: background.textureKey,
		plane: background.plane,
		drawOrder: background.drawOrder
	});
}

function freezeOwnerCrop(crop: MapVisualOwnerCrop): MapVisualOwnerCrop {
	return Object.freeze({
		cropId: crop.cropId,
		requiredBackgroundIds: Object.freeze([...crop.requiredBackgroundIds])
	});
}

function freezeVisualOwner(
	owner: GeneratedMeadowEntryVisualOwner
): GeneratedMeadowEntryVisualOwner {
	return Object.freeze({
		sourceType: owner.sourceType,
		sourceId: owner.sourceId,
		ownerCrops: Object.freeze(owner.ownerCrops.map(freezeOwnerCrop))
	});
}

function buildPilotSelection(): MeadowEntryPaintedSelection {
	const backgrounds = MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS.map(freezeBackground);
	const assets = MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS.map(
		({ textureKey: key, path }) => Object.freeze({ key, path })
	);
	return Object.freeze({
		mode: 'pilot' as const,
		assets: Object.freeze(assets),
		backgrounds: Object.freeze(backgrounds),
		visualOwners: Object.freeze(
			MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS.map(freezeVisualOwner)
		)
	});
}

export const MEADOW_ENTRY_PAINTED_MODE_FALLBACK: MeadowEntryPaintedSelection = Object.freeze({
	mode: 'fallback',
	assets: Object.freeze([]),
	backgrounds: Object.freeze([]),
	visualOwners: Object.freeze([])
});

export const MEADOW_ENTRY_PAINTED_MODE_PILOT = buildPilotSelection();

export const MEADOW_ENTRY_PAINTED_MODE_PRODUCTION: MeadowEntryPaintedSelection = Object.freeze({
	mode: 'production',
	assets: Object.freeze([]),
	backgrounds: Object.freeze([]),
	visualOwners: Object.freeze([])
});

function defaultPaintedSelection(): MeadowEntryPaintedSelection {
	if (MEADOW_ENTRY_DEFAULT_PAINTED_MODE === 'pilot') return MEADOW_ENTRY_PAINTED_MODE_PILOT;
	if (MEADOW_ENTRY_DEFAULT_PAINTED_MODE === 'production')
		return MEADOW_ENTRY_PAINTED_MODE_PRODUCTION;
	return MEADOW_ENTRY_PAINTED_MODE_FALLBACK;
}

export function resolveMeadowEntryPaintedSelection(
	options: MeadowEntryPaintedSelectionOptions
): MeadowEntryPaintedSelection {
	if (!options.regionalBackgrounds) return MEADOW_ENTRY_PAINTED_MODE_FALLBACK;
	if (options.meadowPaintedPilot) return MEADOW_ENTRY_PAINTED_MODE_PILOT;
	return defaultPaintedSelection();
}
