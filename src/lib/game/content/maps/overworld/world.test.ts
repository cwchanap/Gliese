import { describe, expect, it } from 'vitest';

import { parseGridRows } from '$lib/game/content/maps/grid/compile';
import {
	applyTileOverlays,
	buildGridNavigationGrid,
	findUnreachablePoints
} from '$lib/game/content/maps/grid/layers';
import { isWalkable } from '$lib/game/core/navigation';
import { walk } from '$lib/game/core/navigation-test-utils';
import { MAP_TRANSITION_TRIGGER_RADIUS } from '$lib/game/core/collision';

import { sundropChunk } from './chunks/sundrop';
import { overworldMap } from './map';
import { overworld, overworldAnchors } from './world';

/**
 * The raid's fire seals the terrace east of the chest: the lodge and the north gate road. The
 * shrine side stays open, because a lost fight wakes Grik in the shrine.
 */
const EAST_TERRACE_ANCHORS = ['sundrop-lodge-door', 'sundrop-drogg-north-gate'] as const;

const sundrop = overworld.chunks.find((chunk) => chunk.id === 'sundrop')!;
const inSundrop = (tile: { col: number; row: number }) =>
	tile.col >= sundrop.col &&
	tile.col < sundrop.col + sundrop.width &&
	tile.row >= sundrop.row &&
	tile.row < sundrop.row + sundrop.height;

function unreachableFrom(
	from: { x: number; y: number },
	overlays: typeof overworld.overlays
): string[] {
	const terrain = applyTileOverlays(overworld.grid.terrain, overlays);
	const navigation = buildGridNavigationGrid(overworld.id, terrain, overworld.grid.buildings);
	return findUnreachablePoints(navigation, from, Object.values(overworldAnchors));
}

const unreachableFromSpawn = (overlays: typeof overworld.overlays) =>
	unreachableFrom(overworldMap.spawn, overlays);

describe('overworld', () => {
	it('is a 384×384 continent with every region chunk placed', () => {
		expect(overworld.width).toBe(384);
		expect(overworld.height).toBe(384);
		expect(overworld.chunks.map((chunk) => chunk.id)).toEqual([
			'elven-wood',
			'demon-highlands',
			'orc-highlands',
			'mistfen',
			'silverpine',
			'wildwood-north',
			'sundrop',
			'wildwood-east',
			'east-mountains',
			'west-coast',
			'southern-frontier',
			'east-coast',
			'valcrest'
		]);
	});

	it('spawns on walkable ground one tile out from Grik’s door', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const door = overworldAnchors['sundrop-grik-home-door']!;
		expect(isWalkable(navigation, overworldMap.spawn.x, overworldMap.spawn.y)).toBe(true);
		expect(overworldMap.spawn).toEqual({ x: door.x, y: door.y + 32 });
	});

	it('puts every anchor on a tile the player can stand on', () => {
		// Reachability accepts a walkable cell near the anchor, so a blocked centre would pass it.
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const blocked = Object.values(overworldAnchors)
			.filter((anchor) => !isWalkable(navigation, anchor.x, anchor.y))
			.map((anchor) => anchor.name);
		expect(blocked).toEqual([]);
	});

	it('reaches every anchor from spawn by day, including the end of each gate corridor', () => {
		expect(unreachableFromSpawn([])).toEqual([]);
	});

	it('keeps the raid route open while fire seals the village exits and the east terrace', () => {
		const sealed = unreachableFromSpawn(overworld.overlays);
		const outside = Object.values(overworldAnchors)
			.filter((anchor) => !inSundrop(anchor))
			.map((anchor) => anchor.name);
		expect(sealed.sort()).toEqual([...outside, ...EAST_TERRACE_ANCHORS].sort());
	});

	it('walks from the Whispering Cave to the ridge during the escape', () => {
		const cave = overworldAnchors['wildwood-cave-arrival']!;
		const unreachable = unreachableFrom(cave, overworld.overlays);
		expect(unreachable).not.toContain('wildwood-whispering-cave');
		expect(unreachable).not.toContain('wildwood-ridge-overlook');
	});

	it('keeps the player inside the built regions and the corridor to the sealed south gate', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const open = ['sundrop', 'wildwood-north', 'wildwood-east', 'silverpine'].map(
			(id) => overworld.chunks.find((chunk) => chunk.id === id)!
		);
		const outside = [];
		for (let row = 0; row < overworld.height; row += 1) {
			for (let col = 0; col < overworld.width; col += 1) {
				const inOpenRegion = open.some(
					(chunk) =>
						col >= chunk.col &&
						col < chunk.col + chunk.width &&
						row >= chunk.row &&
						row < chunk.row + chunk.height
				);
				const x = col * 32 + 16;
				const y = row * 32 + 16;
				if (!inOpenRegion && isWalkable(navigation, x, y)) {
					outside.push({ name: `${col},${row}`, col, row, x, y });
				}
			}
		}
		const unreachable = new Set(findUnreachablePoints(navigation, overworldMap.spawn, outside));
		const reachable = outside.filter((tile) => !unreachable.has(tile.name));

		// Built areas inside outline chunks: the Mistfen basin with its reed ring, and the
		// corridor that still ends at a sealed gate.
		const builtBoxes = [
			{ name: 'mistfen-basin', cols: [52, 127], rows: [156, 237] },
			{ name: 'south-road', cols: [158, 170], rows: [240, 273] }
		];
		const strays = reachable.filter(
			(tile) =>
				!builtBoxes.some(
					(box) =>
						tile.col >= box.cols[0]! &&
						tile.col <= box.cols[1]! &&
						tile.row >= box.rows[0]! &&
						tile.row <= box.rows[1]!
				)
		);
		expect(strays.map((tile) => tile.name)).toEqual([]);
		expect(reachable.length).toBeGreaterThan(50);
	});
});

const FORGE_CORRIDOR: readonly { col: number; row: number }[] = [
	{ col: 33, row: 40 },
	{ col: 33, row: 43 },
	{ col: 36, row: 43 },
	{ col: 39, row: 43 },
	{ col: 42, row: 43 },
	{ col: 42, row: 42 },
	{ col: 45, row: 42 },
	{ col: 48, row: 42 },
	{ col: 48, row: 41 }
];

const FORGE_TRANSITION = 'overworld-to-blacksmith-interior';
const DOOR_TRIGGER_PX = MAP_TRANSITION_TRIGGER_RADIUS;
const DOOR_CLEARANCE_PX = 48;

describe('Sundrop forge connector', () => {
	it('paints dirt south of neighbour hut 2 and removes the straight-line connector', () => {
		const terrain = parseGridRows(sundropChunk.terrain);
		for (const { col, row } of FORGE_CORRIDOR) {
			expect(terrain[row]![col], `terrain[${row}][${col}]`).toBe(',');
		}
		for (const col of [41, 42, 43, 44, 45, 46, 47]) {
			expect(terrain[41]![col], `terrain[41][${col}]`).not.toBe(',');
		}
	});

	it('keeps the painted walk-line traversable and clear of every other door', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const waypoints = [
			{ x: 4560, y: 7280 },
			{ x: 4656, y: 7280 },
			{ x: 4656, y: 7184 },
			{ x: 5168, y: 7184 },
			{ x: 5168, y: 7280 },
			{ x: 5448, y: 7280 },
			{ x: 5448, y: 7240 },
			{ x: 5648, y: 7240 },
			{ x: 5648, y: 7184 }
		] as const;
		const samples: { x: number; y: number }[] = [];
		for (let i = 0; i + 1 < waypoints.length; i += 1) {
			const from = waypoints[i]!;
			const to = waypoints[i + 1]!;
			const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
			for (let step = samples.length > 0 ? 1 : 0; step <= steps; step += 1) {
				samples.push({
					x: from.x + ((to.x - from.x) * step) / steps,
					y: from.y + ((to.y - from.y) * step) / steps
				});
			}
		}
		for (const point of samples) {
			expect(isWalkable(navigation, point.x, point.y), `walkable at ${point.x},${point.y}`).toBe(
				true
			);
		}
		for (const transition of overworldMap.transitions) {
			if (transition.id === FORGE_TRANSITION) continue;
			const nearest = Math.min(
				...samples.map((point) => Math.hypot(point.x - transition.x, point.y - transition.y))
			);
			expect(nearest, `clearance to ${transition.id}`).toBeGreaterThanOrEqual(DOOR_CLEARANCE_PX);
		}
		const forge = overworldMap.transitions.find(
			(transition) => transition.id === FORGE_TRANSITION
		)!;
		const last = samples.at(-1)!;
		expect(Math.hypot(last.x - forge.x, last.y - forge.y)).toBeLessThan(DOOR_TRIGGER_PX);
	});

	it('slides off the stair-stepped corner in front of the forge instead of wedging', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const forge = overworldMap.transitions.find(
			(transition) => transition.id === FORGE_TRANSITION
		)!;
		// North is closed here; one pixel west, north is open for two 16px cells (one tile). East is open.
		const wedge = { x: 5712, y: 7216 };
		expect(Math.hypot(wedge.x - forge.x, wedge.y - forge.y)).toBeLessThan(100);
		expect(isWalkable(navigation, wedge.x, wedge.y)).toBe(true);

		const end = walk(navigation, [], wedge, { x: 0, y: -1 }, 12);

		expect(end.y).toBeLessThanOrEqual(7192);
		expect(isWalkable(navigation, end.x, end.y)).toBe(true);
	});
});
