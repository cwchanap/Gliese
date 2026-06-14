import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { addEnglishMapText } from '$lib/game/content/maps/text';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { wildwoodRegion } from '$lib/game/content/maps/regions/wildwood';
import { mistfenRegion } from '$lib/game/content/maps/regions/mistfen';
import { silverpineRegion } from '$lib/game/content/maps/regions/silverpine';
import { coastRegion } from '$lib/game/content/maps/regions/coast';
import { crossroadsRegion } from '$lib/game/content/maps/regions/crossroads';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';

export const openingMapId = 'meadow-entry';

type MergedRegions = Required<
	Pick<
		RegionFragment,
		| 'landmarks'
		| 'transitions'
		| 'groundPatches'
		| 'blockers'
		| 'mapDecor'
		| 'fences'
		| 'ambientNpcs'
		| 'npcs'
		| 'pickups'
		| 'encounters'
		| 'combatBounds'
	>
>;

// Per-key `flatMap` preserves each field's concrete element type without the
// union-widening that forced `as never` casts in the previous generic helper.
function mergeRegions(fragments: RegionFragment[]): MergedRegions {
	return {
		landmarks: fragments.flatMap((fragment) => fragment.landmarks ?? []),
		transitions: fragments.flatMap((fragment) => fragment.transitions ?? []),
		groundPatches: fragments.flatMap((fragment) => fragment.groundPatches ?? []),
		blockers: fragments.flatMap((fragment) => fragment.blockers ?? []),
		mapDecor: fragments.flatMap((fragment) => fragment.mapDecor ?? []),
		fences: fragments.flatMap((fragment) => fragment.fences ?? []),
		ambientNpcs: fragments.flatMap((fragment) => fragment.ambientNpcs ?? []),
		npcs: fragments.flatMap((fragment) => fragment.npcs ?? []),
		pickups: fragments.flatMap((fragment) => fragment.pickups ?? []),
		encounters: fragments.flatMap((fragment) => fragment.encounters ?? []),
		combatBounds: fragments.flatMap((fragment) => fragment.combatBounds ?? [])
	};
}

const merged = mergeRegions([
	villageRegion,
	wildwoodRegion,
	mistfenRegion,
	silverpineRegion,
	coastRegion,
	crossroadsRegion,
	pathsRegion
]);

export const meadowEntryMap: WorldMapDefinition = addEnglishMapText({
	id: openingMapId,
	width: 200,
	height: 200,
	spawnDirection: 'up',
	spawn: { x: 1_536, y: 5_550 },
	landmarks: merged.landmarks,
	transitions: merged.transitions,
	groundPatches: merged.groundPatches,
	blockers: merged.blockers,
	fences: merged.fences,
	mapDecor: merged.mapDecor,
	combatBounds: merged.combatBounds,
	encounters: merged.encounters,
	npcs: merged.npcs,
	ambientNpcs: merged.ambientNpcs,
	pickups: merged.pickups
});
