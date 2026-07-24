import { describe, expect, it } from 'vitest';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import {
	UNKNOWN_FILL,
	renderComposedCollisionSvg,
	renderLayeredPreviews,
	renderRegionsSvg
} from '$lib/game/content/maps/layered/preview';
import type { MapBlocker } from '$lib/game/content/maps/types';

function glyphsIn(rows: readonly string[]): string[] {
	const seen = new Set<string>();
	for (const row of rows) for (const g of row) if (g !== '.') seen.add(g);
	return [...seen].sort();
}

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

	it('lists every region glyph present in the source in the legend', () => {
		const svg = renderRegionsSvg(sundropVillageLayered);
		for (const glyph of glyphsIn(sundropVillageLayered.layers.regions)) {
			expect(svg, `glyph ${glyph} missing from legend`).toContain(`&#160;${glyph}&#160;`);
		}
	});

	it('renders an unmapped glyph in the loud placeholder colour rather than blank', () => {
		const patched = {
			...sundropVillageLayered,
			layers: {
				...sundropVillageLayered.layers,
				regions: sundropVillageLayered.layers.regions.map((row, i) =>
					i === 0 ? 'Z'.repeat(sundropVillageLayered.width) : row
				)
			}
		};
		expect(renderRegionsSvg(patched)).toContain(UNKNOWN_FILL);
	});

	it('renders the object table with one row per landmark', () => {
		const md = renderLayeredPreviews(sundropVillageLayered).get('village-objects.md')!;
		for (const landmark of sundropVillageLayered.objects.landmarks ?? []) {
			expect(md).toContain(landmark.id);
		}
	});
});

describe('composed collision view', () => {
	const overlay: MapBlocker[] = [
		// Centred on the village tile (col 10, row 10): origin 256+10*32+16 = 592.
		{ id: 'test-overlay', x: 592, y: 4_688, width: 32, height: 32, kind: 'garden-hedge' }
	];

	it('is deterministic', () => {
		expect(renderComposedCollisionSvg(sundropVillageLayered, overlay)).toBe(
			renderComposedCollisionSvg(sundropVillageLayered, overlay)
		);
	});

	it('paints the overlay tile distinctly from village collision', () => {
		const withOverlay = renderComposedCollisionSvg(sundropVillageLayered, overlay);
		const without = renderComposedCollisionSvg(sundropVillageLayered, []);
		expect(withOverlay).not.toBe(without);
		expect(withOverlay).toContain('#b91c1c');
	});
});
