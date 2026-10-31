import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { overworld } from '$lib/game/content/maps/overworld/world';

import { buildGridObjects, GRID_OBJECT_SHEET, GRID_OBJECT_SIZES } from './objects';

describe('grid objects', () => {
	it('stands a building on its footprint and draws its roof over actors', () => {
		const [hut] = buildGridObjects(
			['......', '......', '......'],
			[{ id: 'hut', type: 'goblin-hut', col: 1, row: 0, width: 4, height: 2 }]
		);
		expect(hut).toMatchObject({ frame: 'hut-a', x: 96, y: 74, overheadY: 0 });
		expect(hut!.width).toBe(Math.round(4 * 32 * 1.12));
	});

	it('draws a hut the raid fire covers as burning, with smoke instead of fire tiles', () => {
		const frames = buildGridObjects(
			['&&&&', '&&&&', '...&'],
			[{ id: 'hut', type: 'goblin-hut', col: 0, row: 0, width: 4, height: 2 }]
		).map((object) => object.frame);
		expect(frames).toContain('hut-burning');
		expect(frames.filter((frame) => frame.startsWith('smoke-'))).toHaveLength(1);
		// Only the fire tile outside the footprint gets flames of its own.
		expect(frames.filter((frame) => frame.startsWith('fire-'))).toHaveLength(1);
	});

	it('draws a lone tree on every tile of a clump', () => {
		const frames = buildGridObjects(['Y...', '..YY', '..YY'], []).map((object) => object.frame);
		expect(frames).toHaveLength(5);
		expect(frames).not.toContain('sacred-tree');
	});

	it('draws the sacred tree only where a chunk stamps one', () => {
		const sacred = buildGridObjects(overworld.grid.terrain, overworld.grid.buildings).filter(
			(object) => object.frame === 'sacred-tree'
		);
		expect(sacred).toHaveLength(1);
		const tree = overworld.grid.buildings.find((building) => building.type === 'sacred-tree')!;
		expect(tree.id).toMatch(/^sundrop-/);
	});

	it('runs palisade slices consecutively along a row', () => {
		const frames = buildGridObjects(['PPPP'], []).map((object) => object.frame);
		expect(frames).toEqual(['palisade-0', 'palisade-1', 'palisade-2', 'palisade-3']);
	});

	it('has art for every object on the overworld', () => {
		const frames = new Set(
			buildGridObjects(overworld.grid.terrain, overworld.grid.buildings).map(
				(object) => object.frame
			)
		);
		for (const frame of frames) {
			expect(GRID_OBJECT_SIZES[frame], frame).toBeDefined();
		}
		for (const frame of Object.keys(GRID_OBJECT_SIZES)) {
			expect(existsSync(resolve('art/overworld/objects', `${frame}.png`)), frame).toBe(true);
		}
	});

	it('packs the sheet without overlapping frames', () => {
		const frames = Object.values(GRID_OBJECT_SHEET.frames);
		for (const [index, a] of frames.entries()) {
			expect(a.x + a.w).toBeLessThanOrEqual(GRID_OBJECT_SHEET.width);
			expect(a.y + a.h).toBeLessThanOrEqual(GRID_OBJECT_SHEET.height);
			for (const b of frames.slice(index + 1)) {
				const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
				expect(apart).toBe(true);
			}
		}
	});
});
