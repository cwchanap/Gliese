import { t } from '$lib/game/i18n/translate';
import type { MapNpc, WorldMapDefinition } from '$lib/game/content/maps/types';

/** Source NPCs lack the resolved English `name`; addEnglishMapText fills it. */
export type MapNpcSource = Omit<MapNpc, 'name'>;
export type WorldMapDefinitionSource = Omit<WorldMapDefinition, 'npcs'> & {
	npcs?: MapNpcSource[];
};

export function addEnglishMapText(map: WorldMapDefinitionSource): WorldMapDefinition {
	return {
		...map,
		npcs: map.npcs?.map((npc) => ({
			...npc,
			name: t('en', npc.nameKey)
		}))
	};
}
