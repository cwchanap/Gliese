import { t } from '$lib/game/i18n/translate';
import type { MapLandmark, MapNpc, WorldMapDefinition } from '$lib/game/content/maps/types';

/** Source landmarks and NPCs lack the resolved English `label`/`name`; addEnglishMapText fills them. */
export type MapNpcSource = Omit<MapNpc, 'name'>;
export type MapLandmarkSource = Omit<MapLandmark, 'label'>;
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
