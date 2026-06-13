import { t } from '$lib/game/i18n/translate';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import type { RegionLandmark, RegionNpc } from '$lib/game/content/maps/regions/types';

// `RegionLandmark`/`RegionNpc` are the single source of truth for source shapes
// (defined in regions/types.ts). Re-export under the *Source names for readability.
export type MapNpcSource = RegionNpc;
export type MapLandmarkSource = RegionLandmark;
export type WorldMapDefinitionSource = Omit<WorldMapDefinition, 'npcs' | 'landmarks'> & {
	npcs?: MapNpcSource[];
	landmarks?: MapLandmarkSource[];
};

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
