import { t } from '$lib/game/i18n/translate';
import type { MapLandmark, MapNpc, WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import { villageRegion } from '$lib/game/content/maps/regions/village';
import { wildwoodRegion } from '$lib/game/content/maps/regions/wildwood';

export type MapNpcSource = Omit<MapNpc, 'name'>;
export type MapLandmarkSource = Omit<MapLandmark, 'label'>;
export type WorldMapDefinitionSource = Omit<WorldMapDefinition, 'npcs' | 'landmarks'> & {
	npcs?: MapNpcSource[];
	landmarks?: MapLandmarkSource[];
};

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
	} as never;
}

export function addEnglishMapText(map: WorldMapDefinitionSource): WorldMapDefinition {
	return {
		...map,
		landmarks: map.landmarks?.map((landmark) => ({
			...landmark,
			label: t('en', landmark.labelKey)
		})),
		npcs: map.npcs?.map((npc) => ({
			...npc,
			name: t('en', npc.nameKey)
		}))
	};
}

const merged = mergeRegions([villageRegion, wildwoodRegion]);

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
	encounters: merged.encounters
});
