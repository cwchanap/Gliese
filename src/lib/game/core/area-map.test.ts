import { describe, expect, it } from 'vitest';

import { meadowEntryMap, maps, shrineOfAuroraInteriorMap } from '$lib/game/content/maps';
import { mainQuestId } from '$lib/game/content/quests';
import {
	buildAreaMapState,
	buildInitialAreaMapState,
	type HudAreaMapState
} from '$lib/game/core/area-map';
import { createInitialQuestState } from '$lib/game/core/quests';

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
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['4,45'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap).toMatchObject<Partial<HudAreaMapState>>({
			mapId: 'meadow-entry',
			name: 'Sundrop Meadows',
			worldWidth: meadowEntryMap.width * 32,
			worldHeight: meadowEntryMap.height * 32,
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['4,45']
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

	it('adds only revealed landmark and exit markers', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['4,45', '16,45', '46,14'],
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
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['4,45'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.player).toEqual({ x: 1_536, y: 5_550 });
		expect(areaMap.markers.map((marker) => marker.id)).toContain('hero-house-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).not.toContain('guild-hall-exterior');
	});

	it('localizes revealed building marker labels', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['16,45'],
			quests: createInitialQuestState(),
			locale: 'ja'
		});

		expect(areaMap.markers).toContainEqual(
			expect.objectContaining({
				kind: 'building',
				id: 'guild-hall-exterior',
				label: 'ギルド'
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

	it('adds active quest markers only when the destination is on this map and revealed', () => {
		const quests = createInitialQuestState();
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['16,45'],
			quests,
			locale: 'en'
		});

		expect(areaMap.markers).toContainEqual(
			expect.objectContaining({
				kind: 'quest',
				id: `${mainQuestId}:talk-to-guild-master:meadow-entry`
			})
		);

		const hiddenAreaMap = buildAreaMapState({
			map: maps['ruins-core']!,
			player: { x: 512, y: 3_200 },
			revealedCells: [],
			quests,
			locale: 'en'
		});
		expect(hiddenAreaMap.markers.some((marker) => marker.kind === 'quest')).toBe(false);
	});

	it('marks the top-right cave exit for the defeat objective once that area is revealed', () => {
		const quests = createInitialQuestState();
		quests.entries[mainQuestId] = {
			...quests.entries[mainQuestId]!,
			currentObjectiveId: 'defeat-ruins-warden'
		};

		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 1_536, y: 5_550 },
			revealedCells: ['46,14'],
			quests,
			locale: 'en'
		});

		expect(areaMap.markers).toContainEqual(
			expect.objectContaining({
				kind: 'quest',
				id: `${mainQuestId}:defeat-ruins-warden:meadow-entry`,
				x: 5_960,
				y: 1_868
			})
		);
	});
});
