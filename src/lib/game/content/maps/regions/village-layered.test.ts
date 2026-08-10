import { describe, expect, it } from 'vitest';

import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import { bfsPath, hasWidePath, type Cell } from '$lib/game/content/maps/layered/geometry';
import {
	SUNDROP_VILLAGE_V2_BUILDINGS,
	SUNDROP_VILLAGE_V2_PUBLIC_SPACES
} from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { meadowEntryMap } from '$lib/game/content/maps/meadow-entry';
import {
	isInsideAnyCollisionRect,
	collectLandmarkRects,
	collectStrictCollisionRects
} from '$lib/game/save/save-state';
import { sundropVillageLayered } from './village-layered';

const DIMS = { width: sundropVillageLayered.width, height: sundropVillageLayered.height };
const compiled = compileLayeredRegion(sundropVillageLayered);
const composedCollision = [
	...collectStrictCollisionRects(meadowEntryMap),
	...collectLandmarkRects(meadowEntryMap)
];

function center(cell: Cell): { x: number; y: number } {
	return {
		x: sundropVillageLayered.origin.x + cell.col * sundropVillageLayered.tileSize + 16,
		y: sundropVillageLayered.origin.y + cell.row * sundropVillageLayered.tileSize + 16
	};
}

function isPaintedRoadCell(col: number, row: number): boolean {
	const pathGlyph = sundropVillageLayered.layers.paths[row]?.[col] ?? '.';
	if (pathGlyph === '.' || sundropVillageLayered.layers.collision[row]?.[col] !== '.') return false;
	const point = center({ col, row });
	return !isInsideAnyCollisionRect(point.x, point.y, composedCollision, PLAYER_COLLISION_RADIUS);
}

function isWalkableCell(col: number, row: number): boolean {
	if (col < 0 || row < 0 || col >= DIMS.width || row >= DIMS.height) return false;
	const point = center({ col, row });
	return !isInsideAnyCollisionRect(point.x, point.y, composedCollision, PLAYER_COLLISION_RADIUS);
}

function expectRectDisjoint(
	left: { x: number; y: number; width: number; height: number },
	right: { x: number; y: number; width: number; height: number },
	label: string
): void {
	const overlaps =
		left.x - left.width / 2 < right.x + right.width / 2 &&
		left.x + left.width / 2 > right.x - right.width / 2 &&
		left.y - left.height / 2 < right.y + right.height / 2 &&
		left.y + left.height / 2 > right.y - right.height / 2;
	expect(overlaps, label).toBe(false);
}

function approachCells(
	building: (typeof SUNDROP_VILLAGE_V2_BUILDINGS)[keyof typeof SUNDROP_VILLAGE_V2_BUILDINGS]
): Cell[] {
	const cells: Cell[] = [];
	for (let row = 0; row < DIMS.height; row += 1) {
		for (let col = 0; col < DIMS.width; col += 1) {
			const point = center({ col, row });
			const inApproach =
				point.x >= building.approach.x &&
				point.x <= building.approach.x + building.approach.width &&
				point.y >= building.approach.y &&
				point.y <= building.approach.y + building.approach.height;
			if (inApproach && isPaintedRoadCell(col, row)) cells.push({ col, row });
		}
	}
	return cells.sort(
		(left, right) =>
			Math.hypot(center(left).x - building.door.x, center(left).y - building.door.y) -
			Math.hypot(center(right).x - building.door.x, center(right).y - building.door.y)
	);
}

describe('Sundrop Village V2 layered graybox', () => {
	it('uses the approved 80 × 68 V2 bounds', () => {
		expect(sundropVillageLayered.origin).toEqual({ x: 256, y: 3968 });
		expect(sundropVillageLayered.width).toBe(80);
		expect(sundropVillageLayered.height).toBe(68);
	});

	it('keeps every layer dimensionally complete', () => {
		for (const [name, rows] of Object.entries(sundropVillageLayered.layers)) {
			expect(rows, name).toHaveLength(68);
			for (const [row, value] of rows.entries()) {
				expect(value.length, `${name}:${row}`).toBe(80);
			}
		}
	});

	it('uses no district glyph contract during the V2 graybox', () => {
		expect(sundropVillageLayered.layers.regions).toEqual(
			Array.from({ length: 68 }, () => '.'.repeat(80))
		);
	});

	it('keeps pixel-positioned objects out of the tile-centre compiler contract', () => {
		expect(sundropVillageLayered.objects).toEqual({});
	});

	it('paints the approved main street, lanes, and destination spurs', () => {
		const path = sundropVillageLayered.layers.paths;
		for (let row = 20; row <= 24; row += 1) expect(path[row]).toBe('p'.repeat(80));
		for (let row = 25; row <= 63; row += 1) {
			expect(path[row]!.slice(0, 4)).toBe('p'.repeat(4));
			expect(path[row]!.slice(76)).toBe('p'.repeat(4));
		}
		for (let row = 44; row <= 47; row += 1) expect(path[row]).toBe('p'.repeat(80));
		for (let row = 64; row <= 67; row += 1) expect(path[row]).toBe('p'.repeat(80));
		for (const [start, end, col] of [
			[13, 19, 11],
			[13, 19, 33],
			[14, 19, 61],
			[38, 43, 12],
			[38, 43, 61],
			[59, 63, 12],
			[59, 63, 36],
			[59, 63, 61]
		] as const) {
			for (let row = start; row <= end; row += 1) expect(path[row]![col]).toBe('p');
		}
		for (const [row, start, end] of [
			[26, 28, 49],
			[27, 28, 49],
			[28, 28, 49],
			[29, 28, 49],
			[30, 28, 49],
			[31, 28, 49],
			[32, 28, 49],
			[33, 28, 49],
			[34, 28, 49],
			[35, 28, 49],
			[36, 28, 49],
			[37, 28, 49],
			[38, 28, 49],
			[39, 28, 49],
			[40, 28, 49],
			[41, 28, 49]
		] as const) {
			for (let col = start; col <= end; col += 1) expect(path[row]![col]).toBe('c');
		}
		for (let col = 34; col <= 43; col += 1) {
			expect(path[25]![col]).toBe('c');
			expect(path[42]![col]).toBe('c');
			expect(path[43]![col]).toBe('c');
		}
	});

	it('keeps the painted main street and side lanes at the required widths', () => {
		expect(hasWidePath({ col: 0, row: 22 }, { col: 79, row: 22 }, isPaintedRoadCell, DIMS, 5)).toBe(
			true
		);
		for (const col of [1, 2, 77, 78]) {
			expect(hasWidePath({ col, row: 22 }, { col, row: 65 }, isPaintedRoadCell, DIMS, 3)).toBe(
				true
			);
		}
	});

	it('reaches every building approach from the hero-house frontage', () => {
		const hero = approachCells(SUNDROP_VILLAGE_V2_BUILDINGS.heroHouse)[0];
		expect(hero).toBeDefined();
		for (const [name, building] of Object.entries(SUNDROP_VILLAGE_V2_BUILDINGS)) {
			const goal = approachCells(building)[0];
			expect(goal, `${name} has no painted approach cell`).toBeDefined();
			const path = bfsPath(hero!, goal!, isWalkableCell, DIMS);
			expect(path, `${name} approach is unreachable`).not.toBeNull();
			const approach = center(goal!);
			expect(
				isInsideAnyCollisionRect(
					approach.x,
					approach.y,
					composedCollision,
					PLAYER_COLLISION_RADIUS
				),
				`${name} approach is inside composed collision`
			).toBe(false);
		}
	});

	it('keeps the four decor anchors outside building footprints and off routes', () => {
		const villageDecor = compiled.mapDecor ?? [];
		expect(villageDecor).toHaveLength(4);
		expect(villageDecor.map((decor) => decor.frameName)).toEqual([
			'gateArch',
			'poleLantern',
			'poleLantern',
			'flowerBed'
		]);
		const buildingRects = Object.values(SUNDROP_VILLAGE_V2_BUILDINGS).map((building) => ({
			x: building.footprint.x + building.footprint.width / 2,
			y: building.footprint.y + building.footprint.height / 2,
			width: building.footprint.width,
			height: building.footprint.height
		}));
		for (const decor of villageDecor) {
			for (const building of buildingRects) {
				expectRectDisjoint(decor, building, `${decor.id} overlaps a building`);
				if (decor.collision)
					expectRectDisjoint(
						decor.collision,
						building,
						`${decor.id} collision overlaps a building`
					);
			}
		}
		const lanterns = villageDecor.filter((decor) => decor.frameName === 'poleLantern');
		expect(lanterns).toHaveLength(2);
		expect(lanterns.every((decor) => decor.collision)).toBe(true);
		expectRectDisjoint(lanterns[0]!, lanterns[1]!, 'pole-lantern sprites overlap');
		const villageGreen = SUNDROP_VILLAGE_V2_PUBLIC_SPACES.villageGreen;
		const villageGreenCenter = {
			x: villageGreen.x + villageGreen.width / 2,
			y: villageGreen.y + villageGreen.height / 2,
			width: villageGreen.width,
			height: villageGreen.height
		};
		expectRectDisjoint(
			lanterns[0]!.collision!,
			villageGreenCenter,
			'west pole lantern blocks the green'
		);
		expectRectDisjoint(
			lanterns[1]!.collision!,
			villageGreenCenter,
			'east pole lantern blocks the green'
		);
		const gate = villageDecor.find((decor) => decor.frameName === 'gateArch');
		const flower = villageDecor.find((decor) => decor.frameName === 'flowerBed');
		expect(gate?.collision).toBeUndefined();
		expect(flower?.x).toBe(976);
		expect(flower?.y).toBe(5680);
	});
});
