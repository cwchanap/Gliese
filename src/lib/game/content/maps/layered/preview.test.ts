import { describe, expect, it } from 'vitest';
import { sundropVillageLayered } from '$lib/game/content/maps/regions/village-layered';
import {
	UNKNOWN_FILL,
	renderCollisionSvg,
	renderComposedCollisionSvg,
	renderLayeredPreviews,
	renderRegionsSvg,
	renderTerrainPathsSvg
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

	// Each renderer's legend must list every glyph its layer(s) contain, so a
	// newly introduced glyph can never render as silent whitespace. The design
	// acceptance test says "every layer glyph" — parameterize across regions,
	// collision, and the combined terrain+paths view.
	const LEGEND_CASES: Array<{
		readonly name: string;
		readonly render: (src: typeof sundropVillageLayered) => string;
		readonly layers: ReadonlyArray<keyof typeof sundropVillageLayered.layers>;
	}> = [
		{ name: 'regions', render: renderRegionsSvg, layers: ['regions'] },
		{ name: 'collision', render: renderCollisionSvg, layers: ['collision'] },
		{ name: 'terrain+paths', render: renderTerrainPathsSvg, layers: ['terrain', 'paths'] }
	];

	it.each(LEGEND_CASES)(
		'lists every $name glyph present in the source in the legend',
		({ render, layers }) => {
			const svg = render(sundropVillageLayered);
			for (const layer of layers)
				for (const glyph of glyphsIn(sundropVillageLayered.layers[layer])) {
					expect(svg, `glyph ${glyph} missing from ${layer} legend`).toContain(
						`&#160;${glyph}&#160;`
					);
				}
		}
	);

	// The unknown-glyph fallback only applies to renderers with static fill
	// tables (REGION_FILL, TERRAIN_FILL, PATH_FILL). The collision renderer
	// dynamically maps every present glyph to COLLISION_FILL, so there is no
	// "unmapped" case to test there.
	const STATIC_FILL_CASES: Array<{
		readonly name: string;
		readonly render: (src: typeof sundropVillageLayered) => string;
		readonly layers: ReadonlyArray<keyof typeof sundropVillageLayered.layers>;
	}> = [
		{ name: 'regions', render: renderRegionsSvg, layers: ['regions'] },
		{ name: 'terrain+paths', render: renderTerrainPathsSvg, layers: ['terrain', 'paths'] }
	];

	it.each(STATIC_FILL_CASES)(
		'renders an unmapped $name glyph in the loud placeholder colour rather than blank',
		({ render, layers }) => {
			for (const layer of layers) {
				const rows = sundropVillageLayered.layers[layer];
				const patched = {
					...sundropVillageLayered,
					layers: {
						...sundropVillageLayered.layers,
						[layer]: rows.map((row, i) => (i === 0 ? 'Z'.repeat(sundropVillageLayered.width) : row))
					}
				};
				expect(render(patched), `unknown glyph in ${layer} did not use placeholder`).toContain(
					UNKNOWN_FILL
				);
			}
		}
	);

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
