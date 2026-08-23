import type { RegionalBackgroundPreloadAsset } from '$lib/game/content/assets';
import type { MapBackgroundImage, MapVisualOwnerCrop } from '$lib/game/content/maps/types';

import {
	resolveMapBackgroundPackageSelection,
	type MapBackgroundPackageDefinition,
	type ResolveMapBackgroundPackageInput
} from './map-background-package';

import {
	MEADOW_ENTRY_PAINTED_V2_APPROVED_RUNTIME_BACKGROUNDS,
	MEADOW_ENTRY_PAINTED_V2_RUNTIME_VISUAL_OWNERS,
	type GeneratedMeadowEntryBackground,
	type GeneratedMeadowEntryVisualOwner
} from './meadow-entry-painted-v2.generated';
import { MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS } from './meadow-entry-painted-v2-complete.generated';

export type MeadowEntryPaintedMode = 'fallback' | 'pilot' | 'complete' | 'production';

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
	readonly meadowPaintedPilotOff?: boolean;
	readonly mapBackgroundReviewIds?: readonly string[];
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

function buildCompleteSelection(): MeadowEntryPaintedSelection {
	const backgrounds =
		MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS.map(freezeBackground);
	const assets = MEADOW_ENTRY_PAINTED_V2_COMPLETE_APPROVED_RUNTIME_BACKGROUNDS.map(
		({ textureKey: key, path }) => Object.freeze({ key, path })
	);
	return Object.freeze({
		mode: 'complete' as const,
		assets: Object.freeze(assets),
		backgrounds: Object.freeze(backgrounds),
		visualOwners: Object.freeze([])
	});
}

export const MEADOW_ENTRY_PAINTED_MODE_FALLBACK: MeadowEntryPaintedSelection = Object.freeze({
	mode: 'fallback',
	assets: Object.freeze([]),
	backgrounds: Object.freeze([]),
	visualOwners: Object.freeze([])
});

export const MEADOW_ENTRY_PAINTED_MODE_PILOT = buildPilotSelection();

export const MEADOW_ENTRY_PAINTED_MODE_COMPLETE = buildCompleteSelection();

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID = 'meadow-entry-painted-v2-legacy' as const;

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE_ID =
	'meadow-entry-painted-v2-complete' as const;

export const MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE = Object.freeze({
	id: MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID,
	mapId: 'meadow-entry',
	coverage: 'historical-partial' as const,
	assets: MEADOW_ENTRY_PAINTED_MODE_PILOT.assets,
	backgrounds: MEADOW_ENTRY_PAINTED_MODE_PILOT.backgrounds,
	visualOwners: MEADOW_ENTRY_PAINTED_MODE_PILOT.visualOwners
}) satisfies MapBackgroundPackageDefinition;

export const MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE = Object.freeze({
	id: MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE_ID,
	mapId: 'meadow-entry',
	coverage: 'full-map' as const,
	assets: MEADOW_ENTRY_PAINTED_MODE_COMPLETE.assets,
	backgrounds: MEADOW_ENTRY_PAINTED_MODE_COMPLETE.backgrounds,
	visualOwners: MEADOW_ENTRY_PAINTED_MODE_COMPLETE.visualOwners
}) satisfies MapBackgroundPackageDefinition;

/** The generic registry is intentionally map-keyed while Meadow is its only map entry. */
export const MAP_BACKGROUND_PACKAGE_REGISTRY = Object.freeze([
	MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE,
	MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE
]);

export const MEADOW_ENTRY_PAINTED_MODE_PRODUCTION: MeadowEntryPaintedSelection = Object.freeze({
	mode: 'production',
	assets: Object.freeze([]),
	backgrounds: Object.freeze([]),
	visualOwners: Object.freeze([])
});

export function resolveMeadowEntryPaintedSelection(
	options: MeadowEntryPaintedSelectionOptions
): MeadowEntryPaintedSelection {
	const reviewPackageIds = options.meadowPaintedPilot
		? [MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID, ...(options.mapBackgroundReviewIds ?? [])]
		: (options.mapBackgroundReviewIds ?? []);
	const defaultSelection =
		MEADOW_ENTRY_DEFAULT_PAINTED_MODE === 'pilot'
			? {
					packageId: MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE_ID,
					mode: 'review' as const
				}
			: null;
	const packageSelection = resolveMapBackgroundPackageSelection(MAP_BACKGROUND_PACKAGE_REGISTRY, {
		mapId: 'meadow-entry',
		regionalBackgrounds: options.regionalBackgrounds,
		reviewPackageIds,
		defaultSelection,
		forcedFallback: options.meadowPaintedPilotOff === true
	} satisfies ResolveMapBackgroundPackageInput);

	if (!packageSelection.definition) return MEADOW_ENTRY_PAINTED_MODE_FALLBACK;
	if (packageSelection.definition.id === MEADOW_ENTRY_PAINTED_V2_COMPLETE_PACKAGE_ID) {
		return MEADOW_ENTRY_PAINTED_MODE_COMPLETE;
	}
	if (packageSelection.mode === 'production') return MEADOW_ENTRY_PAINTED_MODE_PRODUCTION;
	return MEADOW_ENTRY_PAINTED_MODE_PILOT;
}
