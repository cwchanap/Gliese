import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';
import type { MapDecor } from '$lib/game/content/maps/types';

/** Pixels per tile in generated SVGs. */
export const CELL = 12;

/** Loud magenta for a glyph with no colour mapping — never render blank. */
export const UNKNOWN_FILL = '#ff00ff';

export const REGION_FILL: Record<string, string> = {
	H: '#7fb069',
	P: '#e6b85c',
	M: '#c98b5e',
	N: '#8e9aaf',
	G: '#a487c4',
	S: '#d98ca5',
	E: '#6fb3c4',
	C: '#9aa07f'
};

const PATH_FILL: Record<string, string> = {
	p: '#cbb994',
	c: '#a8a29e',
	a: '#c98a5b',
	s: '#7bb0c9'
};

const TERRAIN_FILL: Record<string, string> = { g: '#d9c9a3', w: '#5b8fa8' };

const COLLISION_FILL = '#3f3f46';
const BACKGROUND_FILL = '#faf9f7';
const LEGEND_HEIGHT = 22;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function cell(col: number, row: number, fill: string, opacity = 1): string {
	const alpha = opacity === 1 ? '' : ` opacity="${opacity}"`;
	return `<rect x="${col * CELL}" y="${row * CELL}" width="${CELL}" height="${CELL}" fill="${fill}"${alpha}/>`;
}

function glyphsIn(rows: readonly string[]): string[] {
	const seen = new Set<string>();
	for (const row of rows) for (const g of row) if (g !== '.') seen.add(g);
	return [...seen].sort();
}

function header<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	title: string
): string[] {
	const w = source.width * CELL;
	const h = source.height * CELL + LEGEND_HEIGHT;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
		`<title>${escapeXml(title)}</title>`,
		`<rect width="${w}" height="${h}" fill="${BACKGROUND_FILL}"/>`
	];
}

/**
 * Legend entries are wrapped in non-breaking spaces so a test can assert
 * `&#160;X&#160;` and match a whole glyph rather than any incidental
 * occurrence of that letter elsewhere in the document.
 */
function footer<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	entries: readonly string[]
): string[] {
	const y = source.height * CELL + 15;
	const out: string[] = [];
	let x = 4;
	for (const entry of entries) {
		out.push(
			`<text x="${x}" y="${y}" font-family="monospace" font-size="10" fill="#27272a">&#160;${escapeXml(entry)}&#160;</text>`
		);
		x += (entry.length + 2) * 6 + 8;
	}
	out.push('</svg>');
	return out;
}

function paintLayer<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	rows: readonly string[],
	fills: Record<string, string>,
	opacity = 1
): string[] {
	const out: string[] = [];
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const glyph = rows[row][col];
			if (glyph === '.') continue;
			out.push(cell(col, row, fills[glyph] ?? UNKNOWN_FILL, opacity));
		}
	}
	return out;
}

export function renderRegionsSvg<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>
): string {
	return [
		...header(source, 'regions'),
		...paintLayer(source, source.layers.regions, REGION_FILL),
		...footer(source, glyphsIn(source.layers.regions))
	].join('\n');
}

export function renderCollisionSvg<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>
): string {
	return [
		...header(source, 'collision'),
		...paintLayer(
			source,
			source.layers.collision,
			Object.fromEntries(glyphsIn(source.layers.collision).map((g) => [g, COLLISION_FILL]))
		),
		...footer(source, glyphsIn(source.layers.collision))
	].join('\n');
}

export function renderTerrainPathsSvg<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>
): string {
	return [
		...header(source, 'terrain + paths'),
		...paintLayer(source, source.layers.terrain, TERRAIN_FILL),
		...paintLayer(source, source.layers.paths, PATH_FILL),
		...footer(source, [...glyphsIn(source.layers.terrain), ...glyphsIn(source.layers.paths)])
	].join('\n');
}

export function renderDesignerSvg<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	options: { readonly mutePaths: boolean }
): string {
	const out = [
		...header(source, options.mutePaths ? 'designer (paths muted)' : 'designer'),
		...paintLayer(source, source.layers.regions, REGION_FILL, 0.45),
		...paintLayer(source, source.layers.paths, PATH_FILL, options.mutePaths ? 0.12 : 0.75),
		...paintLayer(
			source,
			source.layers.collision,
			Object.fromEntries(glyphsIn(source.layers.collision).map((g) => [g, COLLISION_FILL]))
		)
	];
	for (const landmark of source.objects.landmarks ?? []) {
		const w = landmark.width / source.tileSize;
		const h = landmark.height / source.tileSize;
		out.push(
			`<rect x="${(landmark.col - w / 2 + 0.5) * CELL}" y="${(landmark.row - h / 2 + 0.5) * CELL}" width="${w * CELL}" height="${h * CELL}" fill="none" stroke="#1c1917" stroke-width="1.5"/>`
		);
	}
	const marks: Array<[readonly { col: number; row: number }[], string]> = [
		[source.objects.transitions ?? [], '#dc2626'],
		[source.objects.pickups ?? [], '#16a34a'],
		[source.objects.ambientNpcs ?? [], '#2563eb']
	];
	for (const [items, colour] of marks) {
		for (const item of items) {
			out.push(
				`<circle cx="${(item.col + 0.5) * CELL}" cy="${(item.row + 0.5) * CELL}" r="${CELL * 0.35}" fill="${colour}"/>`
			);
		}
	}
	for (let row = 0; row < source.height; row++) {
		for (let col = 0; col < source.width; col++) {
			const glyph = source.layers.decor[row][col];
			if (glyph === '.') continue;
			out.push(
				`<text x="${col * CELL + 2}" y="${row * CELL + CELL - 2}" font-family="monospace" font-size="${CELL - 2}" fill="#0c0a09">${escapeXml(glyph)}</text>`
			);
		}
	}
	return [...out, ...footer(source, glyphsIn(source.layers.regions))].join('\n');
}

export function renderObjectsMarkdown<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>
): string {
	const lines = [
		'# Layered objects',
		'',
		'| Kind | ID | Col | Row | Region | Detail |',
		'| --- | --- | --- | --- | --- | --- |'
	];
	const at = (col: number, row: number) => source.layers.regions[row][col];
	for (const l of source.objects.landmarks ?? []) {
		lines.push(
			`| landmark | \`${l.id}\` | ${l.col} | ${l.row} | ${at(l.col, l.row)} | ${l.width}×${l.height}px |`
		);
	}
	for (const t of source.objects.transitions ?? []) {
		lines.push(
			`| transition | \`${t.id}\` | ${t.col} | ${t.row} | ${at(t.col, t.row)} | → ${t.toMapId} |`
		);
	}
	for (const p of source.objects.pickups ?? []) {
		lines.push(
			`| pickup | \`${p.id}\` | ${p.col} | ${p.row} | ${at(p.col, p.row)} | ${p.itemId} ×${p.quantity} |`
		);
	}
	for (const n of source.objects.ambientNpcs ?? []) {
		lines.push(
			`| npc | \`${n.id}\` | ${n.col} | ${n.row} | ${at(n.col, n.row)} | ${n.frameName} |`
		);
	}
	return lines.join('\n') + '\n';
}

export function renderLayeredPreviews<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>
): Map<string, string> {
	return new Map([
		['village-regions.svg', renderRegionsSvg(source)],
		['village-collision.svg', renderCollisionSvg(source)],
		['village-terrain-paths.svg', renderTerrainPathsSvg(source)],
		['village-designer.svg', renderDesignerSvg(source, { mutePaths: false })],
		['village-designer-muted.svg', renderDesignerSvg(source, { mutePaths: true })],
		['village-objects.md', renderObjectsMarkdown(source)]
	]);
}
