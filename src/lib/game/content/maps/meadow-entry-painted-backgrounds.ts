import {
	MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE,
	MEADOW_ENTRY_PAINTED_MODE_PILOT,
	type MeadowEntryPaintedSelection
} from '$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime';
import {
	applyMapBackgroundPackage,
	type MapBackgroundPackageDefinition
} from '$lib/game/content/backgrounds/map-background-package';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';

const MEADOW_ENTRY_MAP_ID = 'meadow-entry';

export interface ApplyMeadowEntryPaintedBackgroundOptions {
	readonly selection: MeadowEntryPaintedSelection;
}

function packageForSelection(
	selection: MeadowEntryPaintedSelection
): MapBackgroundPackageDefinition {
	if (selection === MEADOW_ENTRY_PAINTED_MODE_PILOT) return MEADOW_ENTRY_PAINTED_V2_LEGACY_PACKAGE;
	return {
		id:
			selection.mode === 'pilot'
				? 'meadow-entry-painted-compatibility'
				: 'meadow-entry-painted-production',
		mapId: MEADOW_ENTRY_MAP_ID,
		coverage: 'historical-partial',
		assets: selection.assets,
		backgrounds: selection.backgrounds,
		visualOwners: selection.visualOwners
	};
}

/**
 * Applies a selected painted-background package to Meadow Entry without
 * changing the authored map or any of its nested records.
 *
 * The selection owns only presentation metadata. Runtime asset availability
 * is intentionally not considered here; the renderer decides whether a
 * loaded descriptor suppresses its live fallback.
 */
export function applyMeadowEntryPaintedBackgrounds(
	map: WorldMapDefinition,
	options: ApplyMeadowEntryPaintedBackgroundOptions
): WorldMapDefinition {
	if (map.id !== MEADOW_ENTRY_MAP_ID || options.selection.mode === 'fallback') return map;

	return applyMapBackgroundPackage(map, {
		mode: options.selection.mode === 'production' ? 'production' : 'review',
		definition: packageForSelection(options.selection)
	});
}
