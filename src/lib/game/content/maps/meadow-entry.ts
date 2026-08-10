import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { addEnglishMapText } from '$lib/game/content/maps/text';
import {
	applyVisualOwnership,
	validateMapBackgroundOwnership
} from '$lib/game/content/maps/background-ownership';
import {
	activeMeadowEntryRuntimeVisualOwners,
	meadowEntryRuntimeBackgroundImages
} from '$lib/game/content/backgrounds/meadow-entry-runtime';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { wildwoodRegion } from '$lib/game/content/maps/regions/wildwood';
import { mistfenRegion } from '$lib/game/content/maps/regions/mistfen';
import { silverpineRegion } from '$lib/game/content/maps/regions/silverpine';
import { coastRegion } from '$lib/game/content/maps/regions/coast';
import { crossroadsRegion } from '$lib/game/content/maps/regions/crossroads';
import { pathsRegion } from '$lib/game/content/maps/regions/paths';

export const openingMapId = 'meadow-entry';

export const meadowBoundsRegion: RegionFragment = {
	blockers: [
		{ id: 'meadow-north-boundary', x: 3_200, y: 32, width: 6_400, height: 64, kind: 'town-hedge' },
		{
			id: 'meadow-south-boundary',
			x: 3_200,
			y: 6_368,
			width: 6_400,
			height: 64,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-west-boundary',
			x: 32,
			y: 3_200,
			width: 64,
			height: 6_400,
			kind: 'town-hedge'
		},
		{
			id: 'meadow-east-boundary',
			x: 6_368,
			y: 3_200,
			width: 64,
			height: 6_400,
			kind: 'town-hedge'
		},
		{ id: 'sundrop-southwest-ocean', x: 114, y: 6_311, width: 100, height: 50, kind: 'ocean' }
	],
	groundPatches: [
		{
			id: 'sundrop-southwest-ocean-patch',
			x: 114,
			y: 6_311,
			width: 100,
			height: 50,
			tile: 'seaTile'
		}
	]
};

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
		| 'discoveries'
		| 'backgroundImages'
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
		combatBounds: fragments.flatMap((fragment) => fragment.combatBounds ?? []),
		discoveries: fragments.flatMap((fragment) => fragment.discoveries ?? []),
		backgroundImages: fragments.flatMap((fragment) => fragment.backgroundImages ?? [])
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
	assertUniqueIds(merged.discoveries, 'discoveries');
	assertUniqueIds(merged.backgroundImages, 'backgroundImages');

	return merged;
}

const merged = mergeRegions([
	villageRegion,
	wildwoodRegion,
	mistfenRegion,
	silverpineRegion,
	coastRegion,
	crossroadsRegion,
	pathsRegion,
	meadowBoundsRegion
]);

const backgroundImages = [...merged.backgroundImages, ...meadowEntryRuntimeBackgroundImages];
const runtimeBlockerVisualOwners = activeMeadowEntryRuntimeVisualOwners.filter(
	(owner) => owner.sourceType === 'blocker'
);
const runtimeDecorVisualOwners = activeMeadowEntryRuntimeVisualOwners.filter(
	(owner) => owner.sourceType === 'decor'
);
const runtimeFenceVisualOwners = activeMeadowEntryRuntimeVisualOwners.filter(
	(owner) => owner.sourceType === 'fence'
);
const ownedBlockers = applyVisualOwnership(merged.blockers, runtimeBlockerVisualOwners, {
	rejectExisting: true
});
const ownedMapDecor = applyVisualOwnership(merged.mapDecor, runtimeDecorVisualOwners);
const ownedFences = applyVisualOwnership(merged.fences, runtimeFenceVisualOwners);
const ownershipSource = {
	blockers: ownedBlockers,
	mapDecor: ownedMapDecor,
	fences: ownedFences,
	backgroundImages
};

validateMapBackgroundOwnership(ownershipSource);

export const meadowEntryMap: WorldMapDefinition = addEnglishMapText({
	id: openingMapId,
	width: 200,
	height: 200,
	spawnDirection: 'up',
	// Two tiles south of the V2 hero-house door (704, 5856), facing up at it.
	spawn: { x: 704, y: 5_920 },
	landmarks: merged.landmarks,
	transitions: merged.transitions,
	groundPatches: merged.groundPatches,
	blockers: ownedBlockers,
	fences: ownedFences,
	mapDecor: ownedMapDecor,
	combatBounds: merged.combatBounds,
	encounters: merged.encounters,
	npcs: merged.npcs,
	ambientNpcs: merged.ambientNpcs,
	pickups: merged.pickups,
	discoveries: merged.discoveries,
	backgroundImages
});
