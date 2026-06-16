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
//
// Downstream, `WorldScene` keys pickup/NPC/landmark markers by `id`, so two
// composed regions sharing an id within the same field silently overwrite each
// other (one entity becomes non-interactive with no error). `assertUniqueIds`
// turns that class of authoring bug into a fail-fast at module load.
function assertUniqueIds<T extends { id: string }>(items: T[], field: string): void {
	const seen = new Set<string>();
	for (const item of items) {
		if (seen.has(item.id)) {
			throw new Error(
				`mergeRegions: duplicate id "${item.id}" in field "${field}" across composed regions`
			);
		}
		seen.add(item.id);
	}
}

export function mergeRegions(fragments: RegionFragment[]): MergedRegions {
	const merged: MergedRegions = {
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

	assertUniqueIds(merged.landmarks, 'landmarks');
	assertUniqueIds(merged.transitions, 'transitions');
	assertUniqueIds(merged.groundPatches, 'groundPatches');
	assertUniqueIds(merged.blockers, 'blockers');
	assertUniqueIds(merged.mapDecor, 'mapDecor');
	assertUniqueIds(merged.fences, 'fences');
	assertUniqueIds(merged.ambientNpcs, 'ambientNpcs');
	assertUniqueIds(merged.npcs, 'npcs');
	assertUniqueIds(merged.pickups, 'pickups');
	assertUniqueIds(merged.encounters, 'encounters');
	assertUniqueIds(merged.combatBounds, 'combatBounds');

	return merged;
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
