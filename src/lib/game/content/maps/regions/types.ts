import type {
	MapAmbientNpc,
	MapBlocker,
	MapCombatBounds,
	MapDecor,
	MapDiscovery,
	MapEncounter,
	MapFenceSegment,
	MapGroundPatch,
	MapLandmark,
	MapNpc,
	MapPickup,
	MapTransition
} from '$lib/game/content/maps/types';

/** Source landmark/npc lack the resolved English `label`/`name`; addEnglishMapText fills them. */
export type RegionLandmark = Omit<MapLandmark, 'label'>;
export type RegionNpc = Omit<MapNpc, 'name'>;

export interface RegionFragment {
	landmarks?: RegionLandmark[];
	transitions?: MapTransition[];
	groundPatches?: MapGroundPatch[];
	blockers?: MapBlocker[];
	mapDecor?: MapDecor[];
	fences?: MapFenceSegment[];
	ambientNpcs?: MapAmbientNpc[];
	npcs?: RegionNpc[];
	pickups?: MapPickup[];
	encounters?: MapEncounter[];
	combatBounds?: MapCombatBounds[];
	discoveries?: MapDiscovery[];
}
