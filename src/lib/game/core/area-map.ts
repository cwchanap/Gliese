import {
	maps,
	overworldMap,
	type MapDiscovery,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import type { QuestObjective } from '$lib/game/content/quests';
import { AREA_MAP_CELL_SIZE, isWorldPositionRevealed } from '$lib/game/core/map-exploration';
import {
	createInitialQuestState,
	getCurrentObjective,
	getStoryProgress,
	type QuestState
} from '$lib/game/core/quests';
import { applyStoryGates } from '$lib/game/core/story-gates';
import { getQuestText } from '$lib/game/i18n/content';
import type { Locale } from '$lib/game/i18n/locales';
import { t, type MessageKey } from '$lib/game/i18n/translate';

export type HudAreaMapMarkerKind = 'building' | 'exit' | 'quest' | 'discovery';

export type HudAreaMapMarker = {
	id: string;
	kind: HudAreaMapMarkerKind;
	x: number;
	y: number;
	label: string;
	emphasis?: boolean;
	knownQuestEntrance?: boolean;
};

export type AreaMapView = {
	x: number;
	y: number;
	width: number;
	height: number;
};

export const AREA_MAP_MARKER_LABEL_DX = 76;
export const AREA_MAP_MARKER_FONT_PX = 104;
export const AREA_MAP_MARKER_EMPHASIS_FONT_PX = 116;

const AREA_MAP_VIEW_MIN_SPAN = AREA_MAP_CELL_SIZE * 12;
const AREA_MAP_VIEW_PADDING = AREA_MAP_CELL_SIZE + AREA_MAP_CELL_SIZE / 2;

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
	locale,
	seenDiscoveries = []
}: {
	map: WorldMapDefinition;
	player: { x: number; y: number };
	revealedCells: string[];
	quests: QuestState;
	locale: Locale;
	seenDiscoveries?: string[];
}): HudAreaMapState {
	const knownEntrances = knownQuestEntranceIds(map, quests);
	const markerCandidates = [
		...buildLandmarkMarkers(map, locale),
		...buildTransitionMarkers(map, locale, knownEntrances),
		...buildMainQuestMarkers(map, quests, locale),
		...buildDiscoveryMarkers(map, seenDiscoveries, locale)
	];

	return {
		mapId: map.id,
		name: getAreaName(locale, map.id),
		worldWidth: map.width * 32,
		worldHeight: map.height * 32,
		cellSize: AREA_MAP_CELL_SIZE,
		revealedCells,
		player,
		markers: markerCandidates.filter(
			(marker) =>
				marker.knownQuestEntrance === true ||
				isWorldPositionRevealed({ revealed: revealedCells, x: marker.x, y: marker.y })
		)
	};
}

export function buildInitialAreaMapState(locale: Locale): HudAreaMapState {
	return buildAreaMapState({
		map: overworldMap,
		player: overworldMap.spawn,
		revealedCells: [],
		quests: createInitialQuestState(),
		locale
	});
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

function buildDiscoveryMarkers(
	map: WorldMapDefinition,
	seenDiscoveries: string[],
	locale: Locale
): HudAreaMapMarker[] {
	const seen = new Set(seenDiscoveries);
	return (map.discoveries ?? [])
		.filter(
			(discovery): discovery is MapDiscovery =>
				discovery.revealMarker === true && seen.has(discovery.id)
		)
		.map((discovery) => ({
			id: discovery.id,
			kind: 'discovery' as const,
			x: discovery.x,
			y: discovery.y,
			label: t(locale, discovery.labelKey)
		}));
}

function buildTransitionMarkers(
	map: WorldMapDefinition,
	locale: Locale,
	knownEntrances: ReadonlySet<string>
): HudAreaMapMarker[] {
	return map.transitions
		.filter((transition) => transition.marker !== undefined || transition.showMarker !== false)
		.map((transition) => ({
			id: transition.id,
			kind: 'exit',
			x: transition.x,
			y: transition.y,
			label: getAreaName(locale, transition.toMapId),
			...(knownEntrances.has(transition.id) ? { knownQuestEntrance: true, emphasis: true } : {})
		}));
}

function knownQuestEntranceIds(map: WorldMapDefinition, quests: QuestState): ReadonlySet<string> {
	const objective = getCurrentObjective(quests);
	if (!objective || objective.kind !== 'talk-to-npc') return new Set();
	const progress = getStoryProgress(quests);
	const counted = new Set(quests.entries[progress.questId]?.countedSourceIds ?? []);
	const npcIds = objective.npcIds.filter((npcId) => !counted.has(`npc:${npcId}`));
	if (npcIds.length === 0) return new Set();
	return new Set(
		map.transitions
			.filter((transition) => {
				const destination = maps[transition.toMapId];
				if (!destination) return false;
				return (
					applyStoryGates(destination, progress).npcs?.some((npc) =>
						npcIds.includes(npc.dialogueId)
					) ?? false
				);
			})
			.map((transition) => transition.id)
	);
}

/**
 * Pins the current main objective's targets on this map: the NPCs still to talk
 * to, the discoveries still to examine, the pickups still to gather, and the
 * encounters still to fight. Targets on other maps are left to the journal.
 */
function buildMainQuestMarkers(
	map: WorldMapDefinition,
	quests: QuestState,
	locale: Locale
): HudAreaMapMarker[] {
	const objective = getCurrentObjective(quests);
	if (!objective) return [];

	const { questId } = getStoryProgress(quests);
	const counted = new Set(quests.entries[questId]?.countedSourceIds ?? []);
	const label = getQuestText(locale, questId)?.title ?? t(locale, 'ui.quests');

	return getObjectiveTargets(map, objective, counted).map((target) => ({
		id: `${questId}:${objective.id}:${target.id}`,
		kind: 'quest',
		x: target.x,
		y: target.y,
		label,
		emphasis: true
	}));
}

function getObjectiveTargets(
	map: WorldMapDefinition,
	objective: QuestObjective,
	counted: ReadonlySet<string>
): Array<{ id: string; x: number; y: number }> {
	switch (objective.kind) {
		case 'talk-to-npc':
			return (map.npcs ?? []).filter(
				(npc) => objective.npcIds.includes(npc.dialogueId) && !counted.has(`npc:${npc.dialogueId}`)
			);
		case 'inspect':
			return (map.discoveries ?? []).filter(
				(discovery) =>
					objective.discoveryIds.includes(discovery.id) && !counted.has(`discovery:${discovery.id}`)
			);
		case 'collect-item':
			return (map.pickups ?? []).filter(
				(pickup) =>
					objective.sources.some(
						(source) => source.mapId === map.id && source.pickupId === pickup.id
					) && !counted.has(`pickup:${pickup.id}`)
			);
		case 'defeat-enemy':
		case 'lose-battle':
			return (map.encounters ?? []).filter(
				(encounter) =>
					encounter.enemyId === objective.enemyId &&
					![...counted].some((sourceId) => sourceId.startsWith(`encounter:${encounter.id}:`))
			);
	}
}

const areaNameKeys = {
	'hero-house': 'content.maps.areas.hero-house',
	'guild-hall': 'content.maps.areas.guild-hall',
	'item-shop': 'content.maps.areas.item-shop',
	'blacksmith-interior': 'content.maps.areas.blacksmith-interior',
	'villager-house-1': 'content.maps.areas.villager-house-1',
	'villager-house-2': 'content.maps.areas.villager-house-2',
	'villager-house-3': 'content.maps.areas.villager-house-3',
	'shrine-of-aurora-interior': 'content.maps.areas.shrine-of-aurora-interior',
	'ruins-threshold': 'content.maps.areas.ruins-threshold',
	'ruins-core': 'content.maps.areas.ruins-core',
	overworld: 'content.maps.areas.overworld'
} as const satisfies Record<keyof typeof maps, MessageKey>;

type AreaNameMapId = keyof typeof areaNameKeys;

export function getAreaName(locale: Locale, mapId: string): string {
	const key = areaNameKeys[mapId as AreaNameMapId];
	return key ? t(locale, key) : mapId;
}

export function clampedLocalMapView({
	centerX,
	centerY,
	width,
	height,
	worldWidth,
	worldHeight
}: {
	centerX: number;
	centerY: number;
	width: number;
	height: number;
	worldWidth: number;
	worldHeight: number;
}): AreaMapView {
	return {
		x: Math.min(Math.max(centerX - width / 2, 0), Math.max(0, worldWidth - width)),
		y: Math.min(Math.max(centerY - height / 2, 0), Math.max(0, worldHeight - height)),
		width,
		height
	};
}

export function areaMapLocalView(areaMap: HudAreaMapState): AreaMapView {
	const focusPoints = [
		{ x: areaMap.player.x, y: areaMap.player.y },
		...areaMap.markers
			.filter((marker) => marker.knownQuestEntrance === true)
			.flatMap((marker) => [
				{ x: marker.x, y: marker.y },
				{ x: marker.x + markerLabelExtent(marker), y: marker.y }
			])
	];
	const minX = Math.min(...focusPoints.map((point) => point.x)) - AREA_MAP_VIEW_PADDING;
	const maxX = Math.max(...focusPoints.map((point) => point.x)) + AREA_MAP_VIEW_PADDING;
	const minY = Math.min(...focusPoints.map((point) => point.y)) - AREA_MAP_VIEW_PADDING;
	const maxY = Math.max(...focusPoints.map((point) => point.y)) + AREA_MAP_VIEW_PADDING;
	const span = Math.min(
		Math.max(AREA_MAP_VIEW_MIN_SPAN, maxX - minX, maxY - minY),
		Math.max(areaMap.worldWidth, areaMap.worldHeight)
	);
	return clampedLocalMapView({
		centerX: (minX + maxX) / 2,
		centerY: (minY + maxY) / 2,
		width: span,
		height: span,
		worldWidth: areaMap.worldWidth,
		worldHeight: areaMap.worldHeight
	});
}

export function areaMapMarkersInView(
	markers: readonly HudAreaMapMarker[],
	view: AreaMapView
): HudAreaMapMarker[] {
	return markers.filter(
		(marker) =>
			marker.x >= view.x &&
			marker.x <= view.x + view.width &&
			marker.y >= view.y &&
			marker.y <= view.y + view.height
	);
}

function markerLabelExtent(marker: HudAreaMapMarker): number {
	const fontPx = marker.emphasis ? AREA_MAP_MARKER_EMPHASIS_FONT_PX : AREA_MAP_MARKER_FONT_PX;
	return AREA_MAP_MARKER_LABEL_DX + marker.label.length * fontPx;
}
