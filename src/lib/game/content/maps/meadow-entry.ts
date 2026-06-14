import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { addEnglishMapText } from '$lib/game/content/maps/text';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { wildwoodRegion } from '$lib/game/content/maps/regions/wildwood';
import { mistfenRegion } from '$lib/game/content/maps/regions/mistfen';
import { silverpineRegion } from '$lib/game/content/maps/regions/silverpine';

export const openingMapId = 'meadow-entry';

function mergeRegions(
	fragments: RegionFragment[]
): Required<
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
> {
	// The per-key casts are needed because TS can't distribute the `RegionFragment[K]`
	// union over `flatMap` here: it widens the element type to the union of all field
	// element types, so we narrow back to the concrete `NonNullable<RegionFragment[K]>`.
	const pick = <K extends keyof RegionFragment>(key: K): NonNullable<RegionFragment[K]> =>
		fragments.flatMap((fragment) => (fragment[key] ?? []) as never[]) as NonNullable<
			RegionFragment[K]
		>;
	return {
		landmarks: pick('landmarks'),
		transitions: pick('transitions'),
		groundPatches: pick('groundPatches'),
		blockers: pick('blockers'),
		mapDecor: pick('mapDecor'),
		fences: pick('fences'),
		ambientNpcs: pick('ambientNpcs'),
		npcs: pick('npcs'),
		pickups: pick('pickups'),
		encounters: pick('encounters'),
		combatBounds: pick('combatBounds')
	};
}

const merged = mergeRegions([villageRegion, wildwoodRegion, mistfenRegion, silverpineRegion]);

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
	ambientNpcs: merged.ambientNpcs,
	pickups: merged.pickups
});
