import {
	maps,
	type MapEncounter,
	type MapLandmark,
	type MapNpc,
	type MapTransition,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import { mainQuestId } from '$lib/game/content/quests';
import {
	AREA_MAP_CELL_SIZE,
	isWorldPositionRevealed
} from '$lib/game/core/map-exploration';
import type { QuestState } from '$lib/game/core/quests';
import { getQuestText } from '$lib/game/i18n/content';
import type { Locale } from '$lib/game/i18n/locales';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export type HudAreaMapMarkerKind = 'building' | 'exit' | 'quest';

export type HudAreaMapMarker = {
	id: string;
	kind: HudAreaMapMarkerKind;
	x: number;
	y: number;
	label: string;
	emphasis?: boolean;
};

export type HudAreaMapState = {
	mapId: string;
	name: string;
	worldWidth: number;
	worldHeight: number;
	cellSize: number;
	revealedCells: string[];
	player: { x: number; y: number };
	markers: HudAreaMapMarker[];
};

export function buildAreaMapState({
	map,
	player,
	revealedCells,
	quests,
	locale
}: {
	map: WorldMapDefinition;
	player: { x: number; y: number };
	revealedCells: string[];
	quests: QuestState;
	locale: Locale;
}): HudAreaMapState {
	const markerCandidates = [
		...buildLandmarkMarkers(map, locale),
		...buildTransitionMarkers(map, locale),
		...buildMainQuestMarkers(map, quests, locale)
	];

	return {
		mapId: map.id,
		name: getAreaName(locale, map.id),
		worldWidth: map.width * 32,
		worldHeight: map.height * 32,
		cellSize: AREA_MAP_CELL_SIZE,
		revealedCells,
		player,
		markers: markerCandidates.filter((marker) =>
			isWorldPositionRevealed({ revealed: revealedCells, x: marker.x, y: marker.y })
		)
	};
}

function buildLandmarkMarkers(map: WorldMapDefinition, locale: Locale): HudAreaMapMarker[] {
	return (map.landmarks ?? []).map((landmark) => ({
		id: landmark.id,
		kind: 'building',
		x: landmark.x,
		y: landmark.y,
		label: t(locale, landmark.labelKey)
	}));
}

function buildTransitionMarkers(map: WorldMapDefinition, locale: Locale): HudAreaMapMarker[] {
	return map.transitions
		.filter((transition) => transition.marker !== undefined || transition.showMarker !== false)
		.map((transition) => ({
			id: transition.id,
			kind: 'exit',
			x: transition.x,
			y: transition.y,
			label: getAreaName(locale, transition.toMapId)
		}));
}

function buildMainQuestMarkers(
	map: WorldMapDefinition,
	quests: QuestState,
	locale: Locale
): HudAreaMapMarker[] {
	const mainQuest = quests.entries[mainQuestId];
	if (!mainQuest || mainQuest.status !== 'active') return [];

	const target = getMainQuestObjectiveTarget(map, mainQuest.currentObjectiveId);
	if (!target) return [];

	return [
		{
			id: `${mainQuestId}:${mainQuest.currentObjectiveId}:${map.id}`,
			kind: 'quest',
			x: target.x,
			y: target.y,
			label: getQuestText(locale, mainQuestId)?.title ?? 'Quest',
			emphasis: true
		}
	];
}

function getMainQuestObjectiveTarget(
	map: WorldMapDefinition,
	objectiveId: string
): { x: number; y: number } | undefined {
	switch (objectiveId) {
		case 'talk-to-guild-master':
			return getTalkToGuildMasterTarget(map);
		case 'defeat-ruins-warden':
			return getDefeatRuinsWardenTarget(map);
		default:
			return undefined;
	}
}

function getTalkToGuildMasterTarget(map: WorldMapDefinition): MapLandmark | MapNpc | undefined {
	if (map.id === 'meadow-entry') {
		return map.landmarks?.find((landmark) => landmark.id === 'guild-hall-exterior');
	}
	if (map.id === 'guild-hall') {
		return map.npcs?.find((npc) => npc.id === 'guild-master');
	}

	return undefined;
}

function getDefeatRuinsWardenTarget(
	map: WorldMapDefinition
): MapTransition | MapEncounter | undefined {
	if (map.id === 'meadow-entry') {
		return map.transitions.find((transition) => transition.id === 'meadow-to-ruins-threshold');
	}
	if (map.id === 'ruins-threshold') {
		return map.transitions.find((transition) => transition.id === 'threshold-to-core');
	}
	if (map.id === 'ruins-core') {
		return map.encounters?.find((encounter) => encounter.id === 'ruins-warden');
	}

	return undefined;
}

const areaNameKeys = {
	'meadow-entry': 'content.maps.areas.meadow-entry',
	'hero-house': 'content.maps.areas.hero-house',
	'guild-hall': 'content.maps.areas.guild-hall',
	'item-shop': 'content.maps.areas.item-shop',
	'villager-house-1': 'content.maps.areas.villager-house-1',
	'villager-house-2': 'content.maps.areas.villager-house-2',
	'villager-house-3': 'content.maps.areas.villager-house-3',
	'ruins-threshold': 'content.maps.areas.ruins-threshold',
	'ruins-core': 'content.maps.areas.ruins-core'
} as const satisfies Record<keyof typeof maps, MessageKey>;

type AreaNameMapId = keyof typeof areaNameKeys;

function getAreaName(locale: Locale, mapId: string): string {
	const key = areaNameKeys[mapId as AreaNameMapId];
	return key ? t(locale, key) : mapId;
}
