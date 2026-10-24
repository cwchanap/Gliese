import { describe, expect, it } from 'vitest';

import {
	blacksmithInteriorMap,
	meadowEntryMap,
	maps,
	shrineOfAuroraInteriorMap
} from '$lib/game/content/maps';
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

describe('area map payload', () => {
	it('builds the initial area map from meadow entry content', () => {
		const areaMap = buildInitialAreaMapState('ja');

		expect(areaMap).toMatchObject<Partial<HudAreaMapState>>({
			mapId: meadowEntryMap.id,
			name: 'サンドロップ草原',
			worldWidth: meadowEntryMap.width * 32,
			worldHeight: meadowEntryMap.height * 32,
			player: meadowEntryMap.spawn,
			revealedCells: []
		});
	});

	it('includes current map dimensions, player position, and revealed cells', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 700, y: 5_600 },
			revealedCells: ['5,42'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap).toMatchObject<Partial<HudAreaMapState>>({
			mapId: 'meadow-entry',
			name: 'Sundrop Meadows',
			worldWidth: meadowEntryMap.width * 32,
			worldHeight: meadowEntryMap.height * 32,
			player: { x: 700, y: 5_600 },
			revealedCells: ['5,42']
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

	it('adds only revealed landmark and exit markers', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 700, y: 5_600 },
			revealedCells: ['5,44', '17,33', '46,14'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.markers.map((marker) => marker.id)).toContain('hero-house-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).toContain('guild-hall-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).toContain(
			'meadow-to-whispering-cave-ruins-threshold'
		);
		expect(areaMap.markers.map((marker) => marker.id)).not.toContain('item-shop-exterior');
	});

	it('uses current revealed cells to include the player but omit hidden markers', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 700, y: 5_600 },
			revealedCells: ['5,44'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.player).toEqual({ x: 700, y: 5_600 });
		expect(areaMap.markers.map((marker) => marker.id)).toContain('hero-house-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).not.toContain('guild-hall-exterior');
	});

	it('localizes revealed building marker labels', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 700, y: 5_600 },
			revealedCells: ['17,33'],
			quests: createInitialQuestState(),
			locale: 'ja'
		});

		expect(areaMap.markers).toContainEqual(
			expect.objectContaining({
				kind: 'building',
				id: 'guild-hall-exterior',
				label: '狩人の集会所'
			})
		);
		expect(areaMap.markers).not.toContainEqual(
			expect.objectContaining({
				kind: 'building',
				id: 'guild-hall-exterior',
				label: 'Guild'
			})
		);
	});

	it('pins current-objective targets on this map once their cell is revealed', () => {
		const quests = questStateAt('meet-lirra-forest');
		const map = applyStoryGates(meadowEntryMap, getStoryProgress(quests));
		const build = (revealedCells: string[]) =>
			buildAreaMapState({ map, player: { x: 700, y: 5_600 }, revealedCells, quests, locale: 'en' })
				.markers;

		expect(build(['38,31'])).toContainEqual(
			expect.objectContaining({
				kind: 'quest',
				id: 'prologue-trial-tracks:meet-lirra-forest:lirra-forest',
				x: 4_950,
				y: 4_000
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
		const map = applyStoryGates(meadowEntryMap, getStoryProgress(quests));
		const after = applyQuestEvent({
			state: quests,
			event: { type: 'inspect', discoveryId: 'boar-sign-hoofprints' }
		}).state;
		const revealedCells = map.discoveries!.flatMap((discovery) =>
			revealCellsAroundPoint({
				x: discovery.x,
				y: discovery.y,
				mapWidth: map.width * 32,
				mapHeight: map.height * 32
			})
		);
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
			map: meadowEntryMap,
			player: { x: 700, y: 5_600 },
			revealedCells: ['38,31'],
			quests: questStateAt(null),
			locale: 'en'
		});

		expect(areaMap.markers.some((marker) => marker.kind === 'quest')).toBe(false);
	});
});

describe('discovery markers', () => {
	const seen = 'crossroads-waystone-sign';
	const discovery = (meadowEntryMap.discoveries ?? []).find((d) => d.id === seen);
	const revealedCells = discovery
		? revealCellsAroundPoint({
				x: discovery.x,
				y: discovery.y,
				mapWidth: meadowEntryMap.width * 32,
				mapHeight: meadowEntryMap.height * 32
			})
		: [];

	it('shows a revealMarker discovery only after it is seen', () => {
		const hidden = buildAreaMapState({
			map: meadowEntryMap,
			player: meadowEntryMap.spawn,
			revealedCells,
			quests: createInitialQuestState(),
			locale: 'en',
			seenDiscoveries: []
		});
		expect(hidden.markers.some((m) => m.id === seen)).toBe(false);

		const shown = buildAreaMapState({
			map: meadowEntryMap,
			player: meadowEntryMap.spawn,
			revealedCells,
			quests: createInitialQuestState(),
			locale: 'en',
			seenDiscoveries: [seen]
		});
		expect(shown.markers.some((m) => m.id === seen && m.kind === 'discovery')).toBe(true);
	});
});
