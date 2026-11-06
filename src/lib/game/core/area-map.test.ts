import { describe, expect, it } from 'vitest';

import {
	blacksmithInteriorMap,
	heroHouseMap,
	maps,
	overworldMap,
	shrineOfAuroraInteriorMap
} from '$lib/game/content/maps';
import { overworldAnchors } from '$lib/game/content/maps/overworld/world';
import {
	AREA_MAP_MARKER_EMPHASIS_FONT_PX,
	AREA_MAP_MARKER_FONT_PX,
	AREA_MAP_MARKER_LABEL_DX,
	areaMapLocalView,
	buildAreaMapState,
	buildInitialAreaMapState,
	clampedLocalMapView,
	type HudAreaMapState
} from '$lib/game/core/area-map';
import {
	AREA_MAP_CELL_SIZE,
	isWorldPositionRevealed,
	revealCellsAroundPoint
} from '$lib/game/core/map-exploration';
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

describe('known quest entrance hints', () => {
	const homeExit = { x: grikDoor.x, y: grikDoor.y + 32 };
	const forgeDoor = overworldAnchors['sundrop-forge-door']!;

	const markersAt = (quests: QuestState) => {
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		return buildAreaMapState({
			map,
			player: homeExit,
			revealedCells: revealAround(homeExit),
			quests,
			locale: 'en'
		}).markers;
	};

	it('shows the forge door through fog while Oren is the current talk target', () => {
		const quests = questStateAt('collect-practice-spear');
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		const revealedCells = revealAround(homeExit);
		expect(
			isWorldPositionRevealed({ revealed: revealedCells, x: forgeDoor.x, y: forgeDoor.y })
		).toBe(false);

		const markers = buildAreaMapState({
			map,
			player: homeExit,
			revealedCells,
			quests,
			locale: 'en'
		}).markers;
		expect(markers.filter((marker) => marker.knownQuestEntrance === true)).toEqual([
			expect.objectContaining({
				id: 'overworld-to-blacksmith-interior',
				kind: 'exit',
				x: forgeDoor.x,
				y: forgeDoor.y,
				label: 'Sundrop Forge'
			})
		]);
		expect(markers.some((marker) => marker.kind === 'quest')).toBe(false);
		expect(markers.some((marker) => marker.id === 'overworld-to-item-shop')).toBe(false);
		for (const marker of markers) {
			expect(
				marker.knownQuestEntrance === true ||
					isWorldPositionRevealed({ revealed: revealedCells, x: marker.x, y: marker.y })
			).toBe(true);
		}
	});

	it('moves the flag with the current objective', () => {
		expect(
			markersAt(questStateAt('collect-herb-pouch'))
				.filter((marker) => marker.knownQuestEntrance === true)
				.map((marker) => marker.id)
		).toEqual(['overworld-to-item-shop']);
		expect(
			markersAt(questStateAt('talk-to-mott'))
				.filter((marker) => marker.knownQuestEntrance === true)
				.map((marker) => marker.id)
		).toEqual(['overworld-to-hero-house']);
	});

	it('flags only the interior whose story-gated NPCs survive the raid', () => {
		const markers = markersAt(questStateAt('heed-mott'));
		expect(
			markers.filter((marker) => marker.knownQuestEntrance === true).map((marker) => marker.id)
		).toEqual(['overworld-to-hero-house']);
	});

	it('never flags entrances for overworld, non-talk, or finished objectives', () => {
		for (const objectiveId of ['meet-lirra-forest', 'repel-the-soldiers', 'go-to-sleep']) {
			expect(
				markersAt(questStateAt(objectiveId)).some((marker) => marker.knownQuestEntrance === true),
				objectiveId
			).toBe(false);
		}
		expect(markersAt(questStateAt(null)).some((marker) => marker.knownQuestEntrance === true)).toBe(
			false
		);
	});
});

describe('local area map view', () => {
	const homeExit = { x: grikDoor.x, y: grikDoor.y + 32 };
	const forgeDoor = overworldAnchors['sundrop-forge-door']!;

	it('frames the player and the flagged entrance with room for its label', () => {
		const quests = questStateAt('collect-practice-spear');
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		const state = buildAreaMapState({
			map,
			player: homeExit,
			revealedCells: revealAround(homeExit),
			quests,
			locale: 'en'
		});
		const view = areaMapLocalView(state);

		expect(view.width).toBeLessThan(state.worldWidth);
		expect(view.height).toBeLessThan(state.worldHeight);
		for (const point of [homeExit, forgeDoor]) {
			expect(point.x).toBeGreaterThanOrEqual(view.x);
			expect(point.x).toBeLessThanOrEqual(view.x + view.width);
			expect(point.y).toBeGreaterThanOrEqual(view.y);
			expect(point.y).toBeLessThanOrEqual(view.y + view.height);
		}
		const hint = state.markers.find((marker) => marker.knownQuestEntrance === true)!;
		const fontPx = hint.emphasis ? AREA_MAP_MARKER_EMPHASIS_FONT_PX : AREA_MAP_MARKER_FONT_PX;
		expect(view.x + view.width).toBeGreaterThanOrEqual(
			hint.x + AREA_MAP_MARKER_LABEL_DX + hint.label.length * fontPx
		);
	});

	it('keeps a player-local window when no entrance is flagged', () => {
		const state = buildAreaMapState({
			map: overworldMap,
			player: { x: 6_000, y: 6_000 },
			revealedCells: [],
			quests: questStateAt(null),
			locale: 'en'
		});
		const span = state.cellSize * 12;
		expect(areaMapLocalView(state)).toEqual({
			x: 6_000 - span / 2,
			y: 6_000 - span / 2,
			width: span,
			height: span
		});
	});

	it('clamps the shared window to world edges like the minimap', () => {
		const span = AREA_MAP_CELL_SIZE * 6;
		expect(
			clampedLocalMapView({
				centerX: 100,
				centerY: 100,
				width: span,
				height: span,
				worldWidth: 12_288,
				worldHeight: 12_288
			})
		).toEqual({ x: 0, y: 0, width: span, height: span });
		expect(
			clampedLocalMapView({
				centerX: 12_000,
				centerY: 6_000,
				width: span,
				height: span,
				worldWidth: 12_288,
				worldHeight: 12_288
			})
		).toEqual({ x: 12_288 - span, y: 6_000 - span / 2, width: span, height: span });
	});

	it('covers a whole small map when the local window exceeds it', () => {
		const state = buildAreaMapState({
			map: heroHouseMap,
			player: heroHouseMap.spawn,
			revealedCells: [],
			quests: createInitialQuestState(),
			locale: 'en'
		});
		const span = Math.max(state.worldWidth, state.worldHeight);
		expect(areaMapLocalView(state)).toEqual({ x: 0, y: 0, width: span, height: span });
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
