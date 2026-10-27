import { describe, expect, it } from 'vitest';

import {
	applyTileOverlays,
	buildGridNavigationGrid,
	findUnreachablePoints
} from '$lib/game/content/maps/grid/layers';
import { isWalkable } from '$lib/game/core/navigation';

import { overworld, overworldAnchors, overworldMap } from './world';

/** Where the sealed gates stop each Sundrop corridor, until the region behind it is authored. */
const GATE_ANCHORS = [
	'gate-silverpine',
	'gate-mistfen',
	'gate-hunting-grounds',
	'gate-south-road'
] as const;
/** Day-only story points on the terrace; the raid seals the terrace off. */
const TERRACE_ANCHORS = [
	'sundrop-shrine-door',
	'sundrop-lodge-door',
	'sundrop-hidden-chest',
	'sundrop-drogg-north-gate'
] as const;

function unreachableFromSpawn(overlays: typeof overworld.overlays): string[] {
	const terrain = applyTileOverlays(overworld.grid.terrain, overlays);
	const navigation = buildGridNavigationGrid(overworld.id, terrain, overworld.grid.buildings);
	return findUnreachablePoints(navigation, overworldMap.spawn, Object.values(overworldAnchors));
}

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

	it('keeps the raid route open while fire seals the gates and the terrace', () => {
		const sealed = unreachableFromSpawn(overworld.overlays);
		expect(sealed.sort()).toEqual([...GATE_ANCHORS, ...TERRACE_ANCHORS].sort());
	});

	it('lets the player leave Sundrop only along the four gate corridors', () => {
		const navigation = buildGridNavigationGrid(
			overworld.id,
			overworld.grid.terrain,
			overworld.grid.buildings
		);
		const sundrop = overworld.chunks.find((chunk) => chunk.id === 'sundrop')!;
		const outside = [];
		for (let row = 0; row < overworld.height; row += 1) {
			for (let col = 0; col < overworld.width; col += 1) {
				const insideSundrop =
					col >= sundrop.col &&
					col < sundrop.col + sundrop.width &&
					row >= sundrop.row &&
					row < sundrop.row + sundrop.height;
				const x = col * 32 + 16;
				const y = row * 32 + 16;
				if (!insideSundrop && isWalkable(navigation, x, y)) {
					outside.push({ name: `${col},${row}`, col, row, x, y });
				}
			}
		}
		const unreachable = new Set(findUnreachablePoints(navigation, overworldMap.spawn, outside));
		const reachable = outside.filter((tile) => !unreachable.has(tile.name));

		// Tile boxes around each corridor; an outline region must stay out of reach behind its gate.
		const corridors = [
			{ name: 'north', cols: [148, 162], rows: [136, 183] },
			{ name: 'west', cols: [98, 127], rows: [201, 214] },
			{ name: 'east', cols: [192, 241], rows: [205, 217] },
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
		expect(reachable.length).toBeGreaterThan(100);
	});
});
