import { describe, expect, it } from 'vitest';

import { meadowEntryMap, maps } from '$lib/game/content/maps';
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
			name: '草原の入り口',
			worldWidth: meadowEntryMap.width * 32,
			worldHeight: meadowEntryMap.height * 32,
			player: meadowEntryMap.spawn,
			revealedCells: []
		});
	});

	it('includes current map dimensions, player position, and revealed cells', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 640, y: 5_200 },
			revealedCells: ['5,39'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap).toMatchObject<Partial<HudAreaMapState>>({
			mapId: 'meadow-entry',
			name: 'Meadow Entry',
			worldWidth: meadowEntryMap.width * 32,
			worldHeight: meadowEntryMap.height * 32,
			player: { x: 640, y: 5_200 },
			revealedCells: ['5,39']
		});
	});

	it('adds only revealed landmark and exit markers', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 640, y: 5_200 },
			revealedCells: ['5,39', '12,33', '45,7'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.markers.map((marker) => marker.id)).toContain('hero-house-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).toContain('guild-hall-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).toContain('meadow-to-ruins-threshold');
		expect(areaMap.markers.map((marker) => marker.id)).not.toContain('item-shop-exterior');
	});

	it('uses current revealed cells to include the player but omit hidden markers', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 640, y: 5_200 },
			revealedCells: ['5,39'],
			quests: createInitialQuestState(),
			locale: 'en'
		});

		expect(areaMap.player).toEqual({ x: 640, y: 5_200 });
		expect(areaMap.markers.map((marker) => marker.id)).toContain('hero-house-exterior');
		expect(areaMap.markers.map((marker) => marker.id)).not.toContain('guild-hall-exterior');
	});

	it('localizes revealed building marker labels', () => {
		const areaMap = buildAreaMapState({
			map: meadowEntryMap,
			player: { x: 640, y: 5_200 },
			revealedCells: ['12,33'],
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
			player: { x: 640, y: 5_200 },
			revealedCells: ['12,33'],
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
});
