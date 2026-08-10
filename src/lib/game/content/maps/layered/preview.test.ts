import { describe, expect, it } from 'vitest';

import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';
import type { MapBlocker } from '$lib/game/content/maps/types';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import {
	UNKNOWN_FILL,
	renderComposedCollisionSvg,
	renderLayeredPreviews,
	renderRegionsSvg,
	renderTerrainPathsSvg
} from './preview';

type Fixture = LayeredRegionSource<'village-dressing'>;

const legacyFixture: Fixture = {
	idPrefix: 'fixture',
	tileSize: 32,
	origin: { x: 0, y: 0 },
	width: 4,
	height: 3,
	layers: {
		terrain: ['g...', '....', '....'],
		paths: ['p...', '.p..', '....'],
		collision: ['....', '..#.', '....'],
		decor: ['....', '....', '....'],
		regions: ['HN..', '....', '....']
	},
	decorGlyphTable: {},
	objects: {}
};

describe('layered region preview renderer', () => {
	it('renders byte-identical output for the same source twice', () => {
		const a = renderLayeredPreviews(sundropVillageLayered);
		const b = renderLayeredPreviews(sundropVillageLayered);
		expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
		for (const [name, content] of a) {
			expect(content, `${name} is not deterministic`).toBe(b.get(name));
		}
	});

	it('produces every promised preview file', () => {
		const files = [...renderLayeredPreviews(sundropVillageLayered).keys()].sort();
		expect(files).toEqual([
			'village-collision.svg',
			'village-designer-muted.svg',
			'village-designer.svg',
			'village-objects.md',
			'village-regions.svg',
			'village-terrain-paths.svg'
		]);
	});

	it('keeps legacy region and path colours covered by a local fixture', () => {
		expect(renderRegionsSvg(legacyFixture)).toContain('#7fb069');
		expect(renderRegionsSvg(legacyFixture)).toContain('#8e9aaf');
		expect(renderTerrainPathsSvg(legacyFixture)).toContain('#d9c9a3');
		expect(renderTerrainPathsSvg(legacyFixture)).toContain('#cbb994');
	});

	it('renders unknown static-fill glyphs in the loud placeholder colour', () => {
		const regions = {
			...legacyFixture,
			layers: { ...legacyFixture.layers, regions: ['Z...', '....', '....'] }
		};
		const terrain = {
			...legacyFixture,
			layers: { ...legacyFixture.layers, terrain: ['Z...', '....', '....'] }
		};
		expect(renderRegionsSvg(regions)).toContain(UNKNOWN_FILL);
		expect(renderTerrainPathsSvg(terrain)).toContain(UNKNOWN_FILL);
	});
});

describe('composed collision view', () => {
	const overlay: MapBlocker[] = [
		{ id: 'test-overlay', x: 16, y: 16, width: 32, height: 32, kind: 'garden-hedge' }
	];

	it('is deterministic', () => {
		expect(renderComposedCollisionSvg(legacyFixture, overlay)).toBe(
			renderComposedCollisionSvg(legacyFixture, overlay)
		);
	});

	it('paints the overlay tile distinctly from layered collision', () => {
		const withOverlay = renderComposedCollisionSvg(legacyFixture, overlay);
		const without = renderComposedCollisionSvg(legacyFixture, []);
		expect(withOverlay).not.toBe(without);
		expect(withOverlay).toContain('#b91c1c');
	});
});
