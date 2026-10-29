import { describe, expect, it } from 'vitest';

import {
	blacksmithInteriorMap,
	maps,
	overworldMap,
	shrineOfAuroraInteriorMap
} from '$lib/game/content/maps';
import { overworldAnchors } from '$lib/game/content/maps/overworld/world';
import {
	buildAreaMapState,
	buildInitialAreaMapState,
	type HudAreaMapState
} from '$lib/game/core/area-map';
import { revealCellsAroundPoint } from '$lib/game/core/map-exploration';
import {
	applyQuestEvent,
	createInitialQuestState,
	getStoryProgress,
	type QuestState
} from '$lib/game/core/quests';
import { questStateAt } from '$lib/game/core/quests.fixtures';
import { applyStoryGates } from '$lib/game/core/story-gates';

const revealAround = ({ x, y }: { x: number; y: number }) =>
	revealCellsAroundPoint({
		x,
		y,
		mapWidth: overworldMap.width * 32,
		mapHeight: overworldMap.height * 32
	});

const grikDoor = overworldAnchors['sundrop-grik-home-door']!;
const lodgeDoor = overworldAnchors['sundrop-lodge-door']!;

describe('area map payload', () => {
	it('builds the initial area map from the overworld', () => {
		const areaMap = buildInitialAreaMapState('ja');

		expect(areaMap).toMatchObject<Partial<HudAreaMapState>>({
			mapId: overworldMap.id,
			name: '荒野',
			worldWidth: overworldMap.width * 32,
			worldHeight: overworldMap.height * 32,
			player: overworldMap.spawn,
			revealedCells: []
		});
	});

	it('includes current map dimensions, player position, and revealed cells', () => {
		const areaMap = buildAreaMapState({
			map: overworldMap,
			player: { x: 4_464, y: 7_024 },
			revealedCells: ['34,54'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap).toMatchObject<Partial<HudAreaMapState>>({
			mapId: 'overworld',
			name: 'The Wilds',
			worldWidth: overworldMap.width * 32,
			worldHeight: overworldMap.height * 32,
			player: { x: 4_464, y: 7_024 },
			revealedCells: ['34,54']
		});
	});

	it('localizes the Shrine of Aurora interior area name', () => {
		const areaMap = buildAreaMapState({
			map: shrineOfAuroraInteriorMap,
			player: shrineOfAuroraInteriorMap.spawn,
			revealedCells: [],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.name).toBe('Shrine of Aurora');
	});

	it('localizes the Blacksmith interior area name', () => {
		const areaMap = buildAreaMapState({
			map: blacksmithInteriorMap,
			player: blacksmithInteriorMap.spawn,
			revealedCells: [],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.name).toBe('Sundrop Forge');
	});

	it('adds only revealed door markers, named after the interior', () => {
		const areaMap = buildAreaMapState({
			map: overworldMap,
			player: overworldMap.spawn,
			revealedCells: revealAround(grikDoor),
			quests: createInitialQuestState(),
			locale: 'ja'
		});

		expect(areaMap.markers).toContainEqual(
			expect.objectContaining({ kind: 'exit', id: 'overworld-to-hero-house', label: 'グリクの家' })
		);
		expect(areaMap.markers.map((marker) => marker.id)).not.toContain('overworld-to-guild-hall');

		const lodge = buildAreaMapState({
			map: overworldMap,
			player: overworldMap.spawn,
			revealedCells: revealAround(lodgeDoor),
			quests: createInitialQuestState(),
			locale: 'ja'
		});
		expect(lodge.markers).toContainEqual(
			expect.objectContaining({
				kind: 'exit',
				id: 'overworld-to-guild-hall',
				label: '狩人の集会所'
			})
		);
	});

	it('pins current-objective targets on this map once their cell is revealed', () => {
		const quests = questStateAt('meet-lirra-forest');
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		const lirra = overworldAnchors['wildwood-lirra-forest']!;
		const build = (revealedCells: string[]) =>
			buildAreaMapState({ map, player: overworldMap.spawn, revealedCells, quests, locale: 'en' })
				.markers;

		expect(build(revealAround(lirra))).toContainEqual(
			expect.objectContaining({
				kind: 'quest',
				id: 'prologue-trial-tracks:meet-lirra-forest:lirra-forest',
				x: lirra.x,
				y: lirra.y
			})
		);
		expect(build([]).some((marker) => marker.kind === 'quest')).toBe(false);

		const elsewhere = buildAreaMapState({
			map: maps['guild-hall']!,
			player: { x: 512, y: 512 },
			revealedCells: Array.from({ length: 16 }, (_, column) =>
				Array.from({ length: 16 }, (_, row) => `${column},${row}`)
			).flat(),
			quests,
			locale: 'en'
		});
		expect(elsewhere.markers.some((marker) => marker.kind === 'quest')).toBe(false);
	});

	it('drops targets that already counted toward the objective', () => {
		const quests = questStateAt('read-boar-signs');
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		const after = applyQuestEvent({
			state: quests,
			event: { type: 'inspect', discoveryId: 'boar-sign-hoofprints' }
		}).state;
		const revealedCells = map.discoveries!.flatMap(revealAround);
		const questTargets = (state: QuestState) =>
			buildAreaMapState({ map, player: { x: 0, y: 0 }, revealedCells, quests: state, locale: 'en' })
				.markers.filter((marker) => marker.kind === 'quest')
				.map((marker) => marker.id.split(':').at(-1));

		expect(questTargets(quests).sort()).toEqual([
			'boar-sign-hoofprints',
			'boar-sign-sapling',
			'boar-sign-tusk-scrape'
		]);
		expect(questTargets(after).sort()).toEqual(['boar-sign-sapling', 'boar-sign-tusk-scrape']);
	});

	it('returns no quest marker once the prologue is complete', () => {
		const areaMap = buildAreaMapState({
			map: overworldMap,
			player: overworldMap.spawn,
			revealedCells: revealAround(overworldAnchors['wildwood-lirra-forest']!),
			quests: questStateAt(null),
			locale: 'en'
		});

		expect(areaMap.markers.some((marker) => marker.kind === 'quest')).toBe(false);
	});
});

describe('discovery markers', () => {
	const seen = 'wildwood-cave-danger';
	const revealedCells = revealAround(overworldAnchors[seen]!);

	it('shows a revealMarker discovery only after it is seen', () => {
		const hidden = buildAreaMapState({
			map: overworldMap,
			player: overworldMap.spawn,
			revealedCells,
			quests: createInitialQuestState(),
			locale: 'en',
			seenDiscoveries: []
		});
		expect(hidden.markers.some((m) => m.id === seen)).toBe(false);

		const shown = buildAreaMapState({
			map: overworldMap,
			player: overworldMap.spawn,
			revealedCells,
			quests: createInitialQuestState(),
			locale: 'en',
			seenDiscoveries: [seen]
		});
		expect(shown.markers.some((m) => m.id === seen && m.kind === 'discovery')).toBe(true);
	});
});
