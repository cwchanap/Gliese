import { describe, expect, it } from 'vitest';
import { compileLayeredRegion } from '$lib/game/content/maps/layered/compile-layered-region';
import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';

const dot = (width: number): string => '.'.repeat(width);

function makeSource(
	overrides: Partial<LayeredRegionSource> & { width?: number; height?: number } = {}
): LayeredRegionSource {
	const width = overrides.width ?? 4;
	const height = overrides.height ?? 3;
	const blank = {
		terrain: Array.from({ length: height }, () => dot(width)),
		paths: Array.from({ length: height }, () => dot(width)),
		collision: Array.from({ length: height }, () => dot(width)),
		decor: Array.from({ length: height }, () => dot(width)),
		regions: Array.from({ length: height }, () => dot(width))
	};
	return {
		tileSize: 32,
		origin: { x: 240, y: 4_360 },
		width,
		height,
		decorGlyphTable: {},
		objects: {},
		...overrides,
		layers: { ...blank, ...(overrides.layers ?? {}) }
	} as LayeredRegionSource;
}

describe('compileLayeredRegion — dimensions and ground patches', () => {
	it('throws when any layer row count != height', () => {
		const src = makeSource({
			height: 3,
			layers: {
				terrain: ['....', '....'],
				paths: Array.from({ length: 3 }, () => '....'),
				collision: Array.from({ length: 3 }, () => '....'),
				decor: Array.from({ length: 3 }, () => '....'),
				regions: Array.from({ length: 3 }, () => '....')
			}
		});
		expect(() => compileLayeredRegion(src)).toThrow(/terrain.*height/);
	});

	it('throws when any layer row width != width', () => {
		const src = makeSource({
			width: 4,
			layers: {
				terrain: ['...', '....', '....'],
				paths: Array.from({ length: 3 }, () => '....'),
				collision: Array.from({ length: 3 }, () => '....'),
				decor: Array.from({ length: 3 }, () => '....'),
				regions: Array.from({ length: 3 }, () => '....')
			}
		});
		expect(() => compileLayeredRegion(src)).toThrow(/width/);
	});

	it('maps a single path glyph to one ground patch at the correct world center', () => {
		const paths = ['pp..', '....', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				paths,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				collision: Array.from({ length: 3 }, () => dot(4)),
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			},
			origin: { x: 240, y: 4360 }
		});
		const out = compileLayeredRegion(src);
		expect(out.groundPatches).toHaveLength(1);
		const patch = out.groundPatches![0];
		expect(patch.tile).toBe('pathTile');
		expect(patch.x).toBe(256 + 0 * 32);
		expect(patch.y).toBe(4376 + 0 * 32);
		expect(patch.width).toBe(64);
		expect(patch.height).toBe(32);
	});

	it('merges contiguous same-tile runs but splits on tile change', () => {
		const paths = ['pca.', '....', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				paths,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				collision: Array.from({ length: 3 }, () => dot(4)),
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const out = compileLayeredRegion(src);
		expect(out.groundPatches).toHaveLength(3);
		expect(out.groundPatches!.map((p) => p.tile)).toEqual([
			'pathTile',
			'plazaStoneTile',
			'autumnLeafTile'
		]);
	});

	it('terrain grass produces no patch; terrain water produces a seaTile patch', () => {
		const terrain = ['.w..', '....', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				terrain,
				paths: Array.from({ length: 3 }, () => dot(4)),
				collision: Array.from({ length: 3 }, () => dot(4)),
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const out = compileLayeredRegion(src);
		expect(out.groundPatches).toEqual([
			{ id: expect.any(String), x: 256 + 1 * 32, y: 4376, width: 32, height: 32, tile: 'seaTile' }
		]);
	});
});

describe('compileLayeredRegion — blockers', () => {
	it('emits a garden-hedge blocker for a # run', () => {
		const collision = ['##..', '....', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				collision,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: Array.from({ length: 3 }, () => dot(4)),
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const out = compileLayeredRegion(src);
		expect(out.blockers).toHaveLength(1);
		expect(out.blockers![0]).toMatchObject({
			kind: 'garden-hedge',
			x: 256,
			y: 4376,
			width: 64,
			height: 32
		});
	});

	it('maps B and T to garden-hedge, W to ocean, G to future-gate', () => {
		const collision = ['B.T.', 'W.G.', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				collision,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: Array.from({ length: 3 }, () => dot(4)),
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const out = compileLayeredRegion(src);
		const byKind = new Map(out.blockers!.map((b) => [b.kind, b]));
		expect(byKind.has('garden-hedge')).toBe(true);
		expect(byKind.has('ocean')).toBe(true);
		expect(byKind.has('future-gate')).toBe(true);
	});

	it('merges adjacent same-kind runs horizontally', () => {
		const collision = ['##B#', '....', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				collision,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: Array.from({ length: 3 }, () => dot(4)),
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const out = compileLayeredRegion(src);
		expect(out.blockers!.filter((b) => b.kind === 'garden-hedge')).toHaveLength(3);
	});
});
