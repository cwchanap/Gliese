import { describe, expect, it } from 'vitest';

import {
	applyTileOverlays,
	buildGridNavigationGrid,
	findUnreachablePoints
} from '$lib/game/content/maps/grid/layers';
import { isWalkable } from '$lib/game/core/navigation';

import { overworld, overworldAnchors, overworldMap } from './world';

/** Day-only story points on the terrace; the raid seals the terrace off. */
const TERRACE_ANCHORS = [
	'sundrop-shrine-door',
	'sundrop-lodge-door',
	'sundrop-hidden-chest',
	'sundrop-drogg-north-gate'
] as const;

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

	it('spawns on walkable ground at Grik’s door', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		expect(isWalkable(navigation, overworldMap.spawn.x, overworldMap.spawn.y)).toBe(true);
		expect(overworldMap.spawn).toEqual({
			x: overworldAnchors['sundrop-grik-home-door']!.x,
			y: overworldAnchors['sundrop-grik-home-door']!.y
		});
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

	it('keeps the raid route open while fire seals the village exits and the terrace', () => {
		const sealed = unreachableFromSpawn(overworld.overlays);
		const outside = Object.values(overworldAnchors)
			.filter((anchor) => !inSundrop(anchor))
			.map((anchor) => anchor.name);
		expect(sealed.sort()).toEqual([...outside, ...TERRACE_ANCHORS].sort());
	});

	it('walks from the Whispering Cave to the ridge during the escape', () => {
		const cave = overworldAnchors['wildwood-cave-arrival']!;
		const unreachable = unreachableFrom(cave, overworld.overlays);
		expect(unreachable).not.toContain('wildwood-whispering-cave');
		expect(unreachable).not.toContain('wildwood-ridge-overlook');
	});

	it('keeps the player inside Sundrop, the Wildwood, and the corridors to the sealed gates', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const open = ['sundrop', 'wildwood-north', 'wildwood-east'].map(
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

		// Tile boxes around the corridors that still end at a sealed gate in an outline region.
		const corridors = [
			{ name: 'west', cols: [98, 127], rows: [201, 214] },
			{ name: 'south', cols: [158, 170], rows: [240, 273] }
		];
		const strays = reachable.filter(
			(tile) =>
				!corridors.some(
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
