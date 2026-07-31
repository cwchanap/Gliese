import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import type { VillageArtControlInputs } from '$lib/game/content/maps/layered/village-art-controls';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
	NORMALIZE_TRANSITION_RADIUS
} from '$lib/game/save/save-state';

export function buildVillageArtControlInputs(
	source: typeof sundropVillageLayered = sundropVillageLayered,
	map: WorldMapDefinition = meadowEntryMap
): VillageArtControlInputs {
	return {
		compiledVillage: compileLayeredRegion(source),
		map,
		strictCollisionRects: collectStrictCollisionRects(map),
		landmarkCollisionRects: collectLandmarkRects(map),
		playerRadius: PLAYER_COLLISION_RADIUS,
		doorwayClearanceWidth: NORMALIZE_DOORWAY_CLEARANCE_WIDTH,
		transitionRadius: NORMALIZE_TRANSITION_RADIUS
	};
}
