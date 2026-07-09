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
		expect(patch.x).toBe(256 + 0 * 32 + 16);
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
			x: 272,
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

describe('compileLayeredRegion — mapDecor', () => {
	it('emits a decor object per decor glyph using the glyph table', () => {
		const decor = ['l...', '....', '....'];
		const decorGlyphTable = {
			l: {
				frame: 'poleLantern',
				textureKey: 'village-dressing',
				renderWidth: 100,
				renderHeight: 200,
				collision: { width: 50, height: 60 }
			}
		};
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				decor,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: Array.from({ length: 3 }, () => dot(4)),
				collision: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			},
			decorGlyphTable
		});
		const out = compileLayeredRegion(src);
		expect(out.mapDecor).toHaveLength(1);
		const d = out.mapDecor![0];
		expect(d).toMatchObject({
			textureKey: 'village-dressing',
			frameName: 'poleLantern',
			mode: 'image',
			width: 100,
			height: 200
		});
		expect(d.x).toBe(256);
		expect(d.y).toBe(4376);
		expect(d.collision).toMatchObject({ width: 50, height: 60 });
	});

	it('throws on an unknown decor glyph', () => {
		const decor = ['z...', '....', '....'];
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				decor,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: Array.from({ length: 3 }, () => dot(4)),
				collision: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			},
			decorGlyphTable: {}
		});
		expect(() => compileLayeredRegion(src)).toThrow(/unknown decor glyph/);
	});

	it('emits depth when the glyph table specifies it', () => {
		const decor = ['h...', '....', '....'];
		const decorGlyphTable = {
			h: {
				frame: 'hangingLantern',
				textureKey: 'village-dressing',
				renderWidth: 110,
				renderHeight: 130,
				depth: 'foreground' as const
			}
		};
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				decor,
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: Array.from({ length: 3 }, () => dot(4)),
				collision: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			},
			decorGlyphTable
		});
		const out = compileLayeredRegion(src);
		expect(out.mapDecor![0].depth).toBe('foreground');
		expect(out.mapDecor![0].collision).toBeUndefined();
	});
});

describe('compileLayeredRegion — objects', () => {
	it('maps landmarks, transitions, pickups, and ambient npcs to world coords', () => {
		const src = makeSource({
			width: 4,
			height: 3,
			origin: { x: 240, y: 4360 },
			objects: {
				landmarks: [
					{
						id: 'lm-1',
						col: 1,
						row: 1,
						width: 235,
						height: 246,
						labelKey: 'content.maps.landmarks.hero-house-exterior.label'
					}
				],
				transitions: [
					{
						id: 't-1',
						col: 2,
						row: 0,
						toMapId: 'hero-house',
						arrival: { x: 256, y: 224, facing: 'up' }
					}
				],
				pickups: [{ id: 'p-1', col: 0, row: 0, itemId: 'field-potion', quantity: 1 }],
				ambientNpcs: [{ id: 'a-1', col: 3, row: 2, frameName: 'travelerNpc' }]
			}
		});
		const out = compileLayeredRegion(src);
		expect(out.landmarks![0]).toMatchObject({
			id: 'lm-1',
			x: 256 + 32,
			y: 4376 + 32,
			width: 235,
			height: 246
		});
		expect(out.transitions![0]).toMatchObject({
			id: 't-1',
			x: 256 + 64,
			y: 4376,
			toMapId: 'hero-house'
		});
		expect(out.pickups![0]).toMatchObject({
			id: 'p-1',
			x: 256,
			y: 4376,
			itemId: 'field-potion',
			quantity: 1
		});
		expect(out.ambientNpcs![0]).toMatchObject({
			id: 'a-1',
			x: 256 + 96,
			y: 4376 + 64,
			frameName: 'travelerNpc'
		});
	});

	it('is deterministic across repeated calls', () => {
		const src = makeSource({
			width: 4,
			height: 3,
			layers: {
				terrain: Array.from({ length: 3 }, () => dot(4)),
				paths: ['pp..', 'cc..', '....'],
				collision: ['##..', '..##', '....'],
				decor: Array.from({ length: 3 }, () => dot(4)),
				regions: Array.from({ length: 3 }, () => dot(4))
			}
		});
		const a = JSON.stringify(compileLayeredRegion(src));
		const b = JSON.stringify(compileLayeredRegion(src));
		expect(a).toBe(b);
	});
});
