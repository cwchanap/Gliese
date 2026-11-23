import { describe, expect, it } from 'vitest';

import { createOpenNavigationGrid, type NavigationObstacle } from '$lib/game/core/navigation';
import type { WorldMapDefinition } from '$lib/game/content/maps/types';
import {
	buildMapNavigationObstacles,
	resolveMapNavigationGrid
} from '$lib/game/content/maps/navigation';

const transitions = [
	{ id: 'house-entry', x: 320, y: 128, toMapId: 'house' },
	{ id: 'unrelated-exit', x: 32, y: 32, toMapId: 'elsewhere' }
];

const map: WorldMapDefinition = {
	id: 'navigation-fixture',
	width: 20,
	height: 10,
	spawnDirection: 'down',
	spawn: { x: 16, y: 16 },
	transitions,
	blockers: [{ id: 'blocker', x: 64, y: 80, width: 32, height: 64, kind: 'ruin-wall' }],
	interiorProps: [
		{
			id: 'prop',
			frameName: 'bed',
			x: 288,
			y: 80,
			width: 64,
			height: 32,
			collision: { id: 'prop-collision', x: 288, y: 88, width: 48, height: 16 }
		},
		{
			id: 'prop-without-collision',
			frameName: 'table',
			x: 352,
			y: 80,
			width: 64,
			height: 32
		}
	],
	npcs: [
		{
			id: 'pack-npc',
			x: 64,
			y: 256,
			nameKey: 'content.maps.npcs.borak.name',
			name: 'Guild Master',
			dialogueId: 'borak',
			role: 'guild',
			frameName: 'guildMasterNpc'
		},
		{
			id: 'starter-npc',
			x: 128,
			y: 256,
			nameKey: 'content.maps.npcs.borak.name',
			name: 'Traveler',
			dialogueId: 'borak',
			role: 'villager',
			frameName: 'hero'
		}
	],
	ambientNpcs: [{ id: 'ambient-npc', x: 192, y: 256, frameName: 'travelerNpc' }]
};

describe('world-map navigation adapter', () => {
	it('translates current map collision content into exact shared obstacle records', () => {
		const obstacles = buildMapNavigationObstacles(map, { includeInteractableNpcs: true });

		expect(obstacles).toEqual([
			{
				id: 'blocker',
				shape: 'rect',
				bounds: { left: 48, right: 80, top: 48, bottom: 112 },
				movement: 'strict',
				invalidAtRest: true
			},
			{
				id: 'prop-collision',
				shape: 'rect',
				bounds: { left: 264, right: 312, top: 80, bottom: 96 },
				movement: 'escape-aware',
				invalidAtRest: true,
				escapeOrigin: { x: 288, y: 88 }
			},
			{
				id: 'pack-npc',
				shape: 'circle',
				center: { x: 64, y: 256 },
				radius: 17,
				movement: 'escape-aware',
				invalidAtRest: false
			},
			{
				id: 'starter-npc',
				shape: 'circle',
				center: { x: 128, y: 256 },
				radius: 11,
				movement: 'escape-aware',
				invalidAtRest: false
			}
		] satisfies readonly NavigationObstacle[]);
	});

	it('omits ambient NPCs and optional interactable NPC obstacles when not requested', () => {
		const obstacles = buildMapNavigationObstacles(map, { includeInteractableNpcs: false });

		expect(obstacles.some(({ id }) => id === 'ambient-npc')).toBe(false);
		expect(obstacles.some(({ id }) => id === 'pack-npc')).toBe(false);
		expect(obstacles.some(({ id }) => id === 'starter-npc')).toBe(false);
	});

	it('suppresses only explicitly grid-owned source families', () => {
		const obstacles = buildMapNavigationObstacles(
			{
				...map,
				navigationGrid: createOpenNavigationGrid({
					id: 'owned-grid',
					mapId: map.id,
					cellSizePx: 16,
					widthCells: map.width * 2,
					heightCells: map.height * 2
				}),
				navigationGridOwnedSources: ['blocker']
			},
			{ includeInteractableNpcs: false }
		);

		expect(obstacles.map(({ id }) => id)).toEqual(['prop-collision']);
	});

	it('keeps exact obstacles for owned interior props without a cell-centre rasterization', () => {
		const obstacles = buildMapNavigationObstacles(
			{
				...map,
				blockers: [],
				npcs: [],
				interiorProps: [
					{
						id: 'rasterizable-prop',
						frameName: 'table',
						x: 80,
						y: 80,
						width: 64,
						height: 32,
						collision: {
							id: 'rasterizable-prop-collision',
							x: 80,
							y: 80,
							width: 48,
							height: 16
						}
					},
					{
						id: 'thin-prop',
						frameName: 'table',
						x: 200,
						y: 100,
						width: 64,
						height: 16,
						collision: {
							id: 'thin-prop-collision',
							x: 200,
							y: 100,
							width: 64,
							height: 8
						}
					}
				],
				navigationGrid: createOpenNavigationGrid({
					id: 'owned-grid',
					mapId: map.id,
					cellSizePx: 16,
					widthCells: map.width * 2,
					heightCells: map.height * 2
				}),
				navigationGridOwnedSources: ['interior-prop']
			},
			{ includeInteractableNpcs: false }
		);

		expect(obstacles.map(({ id }) => id)).toEqual(['thin-prop-collision']);
	});

	it('keeps fallback obstacles when ownership metadata has no authored grid', () => {
		const obstacles = buildMapNavigationObstacles(
			{ ...map, navigationGridOwnedSources: ['blocker'] },
			{ includeInteractableNpcs: false }
		);

		expect(obstacles.map(({ id }) => id)).toEqual(['blocker', 'prop-collision']);
	});

	it('returns authored grids verbatim and caches equivalent open grids by map dimensions', () => {
		const authored = createOpenNavigationGrid({
			id: 'authored-grid',
			mapId: map.id,
			cellSizePx: 16,
			widthCells: 40,
			heightCells: 20
		});
		const authoredMap = { ...map, navigationGrid: authored };
		const fallbackMap = { ...map };
		const equivalentMap = { ...map };

		expect(resolveMapNavigationGrid(authoredMap)).toBe(authored);

		const fallback = resolveMapNavigationGrid(fallbackMap);
		expect(fallback).toMatchObject({
			mapId: map.id,
			cellSizePx: 32,
			widthCells: map.width,
			heightCells: map.height,
			widthPx: map.width * 32,
			heightPx: map.height * 32
		});
		expect(Array.from(fallback.blockedBits)).toEqual(new Array(25).fill(0));
		expect(resolveMapNavigationGrid(equivalentMap)).toBe(fallback);
		expect(resolveMapNavigationGrid({ ...map, width: 21 })).not.toBe(fallback);
	});
});
