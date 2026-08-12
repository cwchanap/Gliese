import type { MeadowEntryPaintedSelection } from '$lib/game/content/backgrounds/meadow-entry-painted-v2-runtime';
import {
	applyVisualOwnership,
	type VisualOwnershipAssignment,
	validateMapBackgroundOwnership
} from '$lib/game/content/maps/background-ownership';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';

const MEADOW_ENTRY_MAP_ID = 'meadow-entry';

export interface ApplyMeadowEntryPaintedBackgroundOptions {
	readonly selection: MeadowEntryPaintedSelection;
}

function assignmentsFor(
	selection: MeadowEntryPaintedSelection,
	sourceType: 'blocker' | 'decor' | 'fence'
): VisualOwnershipAssignment[] {
	return selection.visualOwners
		.filter((owner) => owner.sourceType === sourceType)
		.map(({ sourceId, ownerCrops }) => ({
			sourceId,
			visual: {
				mode: 'fallback-only' as const,
				ownerCrops
			}
		}));
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

	const blockerAssignments = assignmentsFor(options.selection, 'blocker');
	const decorAssignments = assignmentsFor(options.selection, 'decor');
	const fenceAssignments = assignmentsFor(options.selection, 'fence');

	const blockers = applyVisualOwnership(map.blockers ?? [], blockerAssignments, {
		rejectExisting: true
	});
	const mapDecor = applyVisualOwnership(map.mapDecor ?? [], decorAssignments, {
		rejectExisting: true
	});
	const fences = applyVisualOwnership(map.fences ?? [], fenceAssignments, {
		rejectExisting: true
	});

	const transformed: WorldMapDefinition = {
		...map,
		backgroundImages: [...options.selection.backgrounds]
	};
	if (map.blockers !== undefined) transformed.blockers = blockers;
	if (map.mapDecor !== undefined) transformed.mapDecor = mapDecor;
	if (map.fences !== undefined) transformed.fences = fences;

	validateMapBackgroundOwnership(transformed);
	return transformed;
}
