import { describe, expect, it } from 'vitest';

import {
	blacksmithInteriorMap,
	heroHouseMap,
	itemShopMap,
	maps,
	overworldMap,
	shrineOfAuroraInteriorMap,
	type WorldMapDefinition
} from '$lib/game/content/maps';
import { overworldAnchors } from '$lib/game/content/maps/overworld/world';
import { storyWindows } from '$lib/game/content/quests';
import {
	AREA_MAP_MARKER_EMPHASIS_FONT_PX,
	AREA_MAP_MARKER_LABEL_DX,
	areaMapLocalView,
	areaMapMarkerFocusCoords,
	areaMapMarkersInView,
	buildAreaMapState,
	buildInitialAreaMapState,
	clampedLocalMapView,
	markerLabelExtent,
	type HudAreaMapState
} from '$lib/game/core/area-map';
import { resolveMenuFocusTarget } from '$lib/game/core/menu-focus';
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

	it('drops the hint when story gates remove the talk target from the destination', () => {
		const quests = questStateAt('collect-herb-pouch');
		const progress = getStoryProgress(quests);
		const gatedOutItemShop: WorldMapDefinition = {
			...itemShopMap,
			npcs: (itemShopMap.npcs ?? []).map((npc) =>
				npc.dialogueId === 'mira' ? { ...npc, activeDuring: storyWindows.afterRaid } : npc
			)
		};
		expect(gatedOutItemShop.npcs?.some((npc) => npc.dialogueId === 'mira')).toBe(true);
		expect(
			applyStoryGates(gatedOutItemShop, progress).npcs?.some((npc) => npc.dialogueId === 'mira')
		).toBe(false);

		maps['item-shop'] = gatedOutItemShop;
		try {
			const markers = markersAt(quests);
			expect(markers.some((marker) => marker.knownQuestEntrance === true)).toBe(false);
			expect(markers.some((marker) => marker.id === 'overworld-to-item-shop')).toBe(false);
		} finally {
			maps['item-shop'] = itemShopMap;
		}
	});

	it.each([
		{ locale: 'en' as const, label: 'Sundrop Forge' },
		{ locale: 'ja' as const, label: 'サンドロップ鍛冶場' },
		{ locale: 'zh-Hant' as const, label: '晴滴鍛造坊' }
	])(
		'localizes the flagged entrance label and frames its extent ($locale)',
		({ locale, label }) => {
			const quests = questStateAt('collect-practice-spear');
			const map = applyStoryGates(overworldMap, getStoryProgress(quests));
			const state = buildAreaMapState({
				map,
				player: homeExit,
				revealedCells: revealAround(homeExit),
				quests,
				locale
			});
			const hint = state.markers.find((marker) => marker.knownQuestEntrance === true);
			expect(hint?.label).toBe(label);
			const view = areaMapLocalView(state);
			expect(view.x + view.width).toBeGreaterThanOrEqual(hint!.x + markerLabelExtent(hint!));
		}
	);

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
		expect(view.x + view.width).toBeGreaterThanOrEqual(hint.x + markerLabelExtent(hint));
	});

	it('drops markers outside the local view from the rendered set', () => {
		const quests = questStateAt('meet-lirra-forest');
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		const revealedCells = [...revealAround(homeExit), ...revealAround(forgeDoor)];
		const state = buildAreaMapState({
			map,
			player: homeExit,
			revealedCells,
			quests,
			locale: 'en'
		});
		expect(state.markers.some((marker) => marker.id === 'overworld-to-blacksmith-interior')).toBe(
			true
		);

		const view = areaMapLocalView(state);
		expect(forgeDoor.x).toBeGreaterThan(view.x + view.width);

		const visible = areaMapMarkersInView(state.markers, view);
		expect(visible.some((marker) => marker.id === 'overworld-to-blacksmith-interior')).toBe(false);
		expect(visible.some((marker) => marker.id === 'overworld-to-hero-house')).toBe(true);
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
		expect(areaMapLocalView(state)).toEqual({
			x: 0,
			y: 0,
			width: state.worldWidth,
			height: state.worldHeight
		});
	});

	it('estimates Latin labels at roughly 0.55em and CJK labels at 1.0em', () => {
		const latinMarker = {
			id: 'forge',
			kind: 'exit' as const,
			x: 0,
			y: 0,
			label: 'Sundrop Forge',
			emphasis: true
		};
		expect(markerLabelExtent(latinMarker)).toBe(
			AREA_MAP_MARKER_LABEL_DX + Math.ceil(13 * 0.55 * AREA_MAP_MARKER_EMPHASIS_FONT_PX)
		);

		const cjkMarker = {
			id: 'forge-ja',
			kind: 'exit' as const,
			x: 0,
			y: 0,
			label: 'サンドロップの鍛冶屋',
			emphasis: true
		};
		expect(markerLabelExtent(cjkMarker)).toBe(
			AREA_MAP_MARKER_LABEL_DX + 10 * AREA_MAP_MARKER_EMPHASIS_FONT_PX
		);
	});

	it('never flags interior to overworld exits as known quest entrances', () => {
		const quests = questStateAt('talk-to-mott');
		const state = buildAreaMapState({
			map: heroHouseMap,
			player: heroHouseMap.spawn,
			revealedCells: [],
			quests,
			locale: 'en'
		});
		expect(state.markers.some((marker) => marker.knownQuestEntrance === true)).toBe(false);
	});

	it('centers clampedLocalMapView when view width or height exceeds world dimensions', () => {
		const centered = clampedLocalMapView({
			centerX: 500,
			centerY: 400,
			width: 1000,
			height: 800,
			worldWidth: 800,
			worldHeight: 600
		});
		expect(centered).toEqual({
			x: -100,
			y: -100,
			width: 1000,
			height: 800
		});
	});

	it('frames revealed quest pins, discoveries, and landmarks even when distant from player', () => {
		const quests = questStateAt('meet-lirra-forest');
		const map = applyStoryGates(overworldMap, getStoryProgress(quests));
		const lirra = overworldAnchors['wildwood-lirra-forest']!;
		const state = buildAreaMapState({
			map,
			player: homeExit,
			revealedCells: [...revealAround(homeExit), ...revealAround(lirra)],
			quests,
			locale: 'en'
		});
		const view = areaMapLocalView(state);
		const questPin = state.markers.find((m) => m.kind === 'quest');
		expect(questPin).toBeDefined();
		expect(view.x).toBeLessThanOrEqual(questPin!.x);
		expect(view.x + view.width).toBeGreaterThanOrEqual(questPin!.x);
		expect(view.y).toBeLessThanOrEqual(questPin!.y);
		expect(view.y + view.height).toBeGreaterThanOrEqual(questPin!.y);
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

describe('areaMapMarkerFocusCoords', () => {
	it('returns an empty record when given no markers', () => {
		const coords = areaMapMarkerFocusCoords([], { x: 0, y: 0, width: 1000, height: 1000 });
		expect(coords).toEqual({});
	});

	it('assigns separate focus rows to doors at different heights and supports arrow navigation', () => {
		// Mock Sundrop doors at their real world coordinates:
		// lodge: (5552, 6256), shrine: (4496, 6288) — upper village
		// herb-hut: (4432, 6704) — mid-north
		// neighbor-1: (4720, 7024) — mid village
		// forge: (5648, 7184), neighbor-2: (5392, 7216) — east street
		// grik-home: (4464, 7280) — south-west
		// neighbor-3: (4848, 7472) — south lane
		const sundropMarkers = [
			{ id: 'shrine', x: 4_496, y: 6_288, label: 'Shrine', kind: 'building' as const },
			{ id: 'lodge', x: 5_552, y: 6_256, label: 'Lodge', kind: 'building' as const },
			{ id: 'herb-hut', x: 4_432, y: 6_704, label: 'Herb Hut', kind: 'building' as const },
			{ id: 'neighbor-1', x: 4_720, y: 7_024, label: 'Neighbor 1', kind: 'building' as const },
			{ id: 'forge', x: 5_648, y: 7_184, label: 'Forge', kind: 'building' as const },
			{ id: 'neighbor-2', x: 5_392, y: 7_216, label: 'Neighbor 2', kind: 'building' as const },
			{ id: 'grik-home', x: 4_464, y: 7_280, label: 'Grik Home', kind: 'building' as const },
			{ id: 'neighbor-3', x: 4_848, y: 7_472, label: 'Neighbor 3', kind: 'building' as const }
		];

		const view = { x: 4_272, y: 6_166, width: 2_164, height: 2_164 };
		const coords = areaMapMarkerFocusCoords(sundropMarkers, view);

		// Doors at distinct heights should receive separate rows, not chained into a single row
		expect(coords['shrine'].row).toBeLessThan(coords['herb-hut'].row);
		expect(coords['herb-hut'].row).toBeLessThan(coords['neighbor-1'].row);
		expect(coords['neighbor-1'].row).toBeLessThan(coords['grik-home'].row);
		expect(coords['grik-home'].row).toBeLessThan(coords['neighbor-3'].row);

		// Doors roughly at the same height share a row and have distinct columns
		expect(coords['shrine'].row).toBe(coords['lodge'].row);
		expect(coords['shrine'].column).toBe(0);
		expect(coords['lodge'].column).toBe(1);

		expect(coords['neighbor-2'].row).toBe(coords['forge'].row);
		expect(coords['neighbor-2'].column).toBe(0);
		expect(coords['forge'].column).toBe(1);

		// Build MenuFocusNode lattice and verify directional arrow moves
		const nodes = sundropMarkers.map((m) => ({
			id: m.id,
			row: coords[m.id].row,
			column: coords[m.id].column
		}));

		// Vertical movement down from top to bottom
		expect(resolveMenuFocusTarget(nodes, 'shrine', 'down')).toBe('herb-hut');
		expect(resolveMenuFocusTarget(nodes, 'herb-hut', 'down')).toBe('neighbor-1');
		expect(resolveMenuFocusTarget(nodes, 'neighbor-1', 'down')).toBe('neighbor-2');
		expect(resolveMenuFocusTarget(nodes, 'grik-home', 'down')).toBe('neighbor-3');

		// Vertical movement up from bottom to top
		expect(resolveMenuFocusTarget(nodes, 'neighbor-3', 'up')).toBe('grik-home');
		expect(resolveMenuFocusTarget(nodes, 'grik-home', 'up')).toBe('neighbor-2');
		expect(resolveMenuFocusTarget(nodes, 'forge', 'up')).toBe('lodge');
		expect(resolveMenuFocusTarget(nodes, 'herb-hut', 'up')).toBe('shrine');

		// Horizontal movement between side-by-side buildings
		expect(resolveMenuFocusTarget(nodes, 'shrine', 'right')).toBe('lodge');
		expect(resolveMenuFocusTarget(nodes, 'lodge', 'left')).toBe('shrine');
		expect(resolveMenuFocusTarget(nodes, 'neighbor-2', 'right')).toBe('forge');
		expect(resolveMenuFocusTarget(nodes, 'forge', 'left')).toBe('neighbor-2');
	});
});
