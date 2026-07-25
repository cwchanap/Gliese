import { createHash } from 'node:crypto';

import type { LayeredRegionSource } from '$lib/game/content/maps/layered/types';
import type { RegionFragment } from '$lib/game/content/maps/regions/types';
import type {
	MapDecor,
	MapLandmark,
	MapRect,
	MapTransition,
	WorldMapDefinition
} from '$lib/game/content/maps/types';

export const VILLAGE_ART_CONTROL_FILENAMES = [
	'village-art-control-manifest.json',
	'village-art-control.svg',
	'village-building-entrance-mask.svg',
	'village-composed-collision-mask.svg',
	'village-forbidden-tall-mask.svg',
	'village-layered-collision-mask.svg',
	'village-object-anchors.svg',
	'village-region-mask.svg',
	'village-terrain-path-mask.svg'
] as const;

export type VillageArtControlFilename = (typeof VILLAGE_ART_CONTROL_FILENAMES)[number];

type CollisionRect = Pick<MapRect, 'x' | 'y' | 'width' | 'height'> & { readonly id?: string };

export interface VillageArtControlInputs {
	readonly compiledVillage: RegionFragment;
	readonly map: WorldMapDefinition;
	readonly strictCollisionRects: readonly CollisionRect[];
	readonly landmarkCollisionRects: readonly CollisionRect[];
	readonly playerRadius: number;
	readonly doorwayClearanceWidth: number;
	readonly transitionRadius: number;
}

interface LocalRect {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

interface CanvasBounds {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

interface VillageArtControlData {
	readonly width: number;
	readonly height: number;
	readonly strictCollisionRects: readonly LocalRect[];
	readonly landmarkCollisionRects: readonly LocalRect[];
	readonly composedCollisionRects: readonly LocalRect[];
	readonly isWorldPointExcluded: (x: number, y: number) => boolean;
	readonly isLocalPointExcluded: (x: number, y: number) => boolean;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

const REGION_FILL: Record<string, string> = {
	C: '#8a8f7a',
	E: '#7aa9a4',
	G: '#9a87a9',
	H: '#7da06b',
	M: '#b78362',
	N: '#8390a1',
	P: '#d4ad62',
	S: '#c5859a'
};

const TERRAIN_FILL: Record<string, string> = {
	g: '#d9c9a3',
	w: '#5b8fa8'
};

const PATH_FILL: Record<string, string> = {
	a: '#c98a5b',
	c: '#a8a29e',
	p: '#cbb994',
	s: '#7bb0c9'
};

function sortById<T extends { readonly id: string }>(items: readonly T[]): T[] {
	return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function stableRectId(rect: CollisionRect, prefix: string, index: number): string {
	return (
		rect.id ??
		`${prefix}-${rect.x}-${rect.y}-${rect.width}-${rect.height}-${index.toString().padStart(4, '0')}`
	);
}

function canvasBounds<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>
): CanvasBounds {
	return {
		x: source.origin.x,
		y: source.origin.y,
		width: source.width * source.tileSize,
		height: source.height * source.tileSize
	};
}

export function padClipWorldRectToLocal(
	rect: CollisionRect,
	canvas: CanvasBounds,
	padding: number
): LocalRect | null {
	const left = Math.max(canvas.x, rect.x - rect.width / 2 - padding);
	const right = Math.min(canvas.x + canvas.width, rect.x + rect.width / 2 + padding);
	const top = Math.max(canvas.y, rect.y - rect.height / 2 - padding);
	const bottom = Math.min(canvas.y + canvas.height, rect.y + rect.height / 2 + padding);

	if (right <= left || bottom <= top) return null;

	return {
		id: rect.id ?? 'rect',
		x: (left + right) / 2 - canvas.x,
		y: (top + bottom) / 2 - canvas.y,
		width: right - left,
		height: bottom - top
	};
}

function localRects(
	rects: readonly CollisionRect[],
	canvas: CanvasBounds,
	padding: number,
	prefix: string
): LocalRect[] {
	return rects.flatMap((rect, index) => {
		const local = padClipWorldRectToLocal(
			{ ...rect, id: stableRectId(rect, prefix, index) },
			canvas,
			padding
		);
		return local ? [local] : [];
	});
}

function pointInsideRect(x: number, y: number, rect: LocalRect): boolean {
	return (
		x >= rect.x - rect.width / 2 &&
		x <= rect.x + rect.width / 2 &&
		y >= rect.y - rect.height / 2 &&
		y <= rect.y + rect.height / 2
	);
}

export function collectVillageArtControlData<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: VillageArtControlInputs
): VillageArtControlData {
	const canvas = canvasBounds(source);
	const strictCollisionRects = localRects(
		input.strictCollisionRects,
		canvas,
		input.playerRadius,
		'strict'
	);
	const landmarkCollisionRects = localRects(
		input.landmarkCollisionRects,
		canvas,
		input.playerRadius,
		'landmark'
	);
	const composedCollisionRects = [...strictCollisionRects, ...landmarkCollisionRects];
	const isLocalPointExcluded = (x: number, y: number): boolean =>
		composedCollisionRects.some((rect) => pointInsideRect(x, y, rect));

	return {
		width: canvas.width,
		height: canvas.height,
		strictCollisionRects,
		landmarkCollisionRects,
		composedCollisionRects,
		isWorldPointExcluded: (x, y) => isLocalPointExcluded(x - canvas.x, y - canvas.y),
		isLocalPointExcluded
	};
}

function matchingDoorway(
	landmark: MapLandmark,
	transitions: readonly MapTransition[]
): MapTransition | undefined {
	const left = landmark.x - landmark.width / 2;
	const right = landmark.x + landmark.width / 2;
	const top = landmark.y - landmark.height / 2;
	const bottom = landmark.y + landmark.height / 2;
	return transitions.find(
		(transition) =>
			transition.x >= left &&
			transition.x <= right &&
			transition.y >= top &&
			transition.y <= bottom &&
			transition.id.includes(landmark.id.replace('-exterior', ''))
	);
}

function structuralRect(rect: CollisionRect, id: string): Record<string, string | number> {
	return {
		id,
		x: rect.x,
		y: rect.y,
		width: rect.width,
		height: rect.height
	};
}

function inCanvas(rect: CollisionRect, canvas: CanvasBounds): boolean {
	return (
		rect.x + rect.width / 2 >= canvas.x &&
		rect.x - rect.width / 2 <= canvas.x + canvas.width &&
		rect.y + rect.height / 2 >= canvas.y &&
		rect.y - rect.height / 2 <= canvas.y + canvas.height
	);
}

function anchorInCanvas(anchor: { readonly x: number; readonly y: number }, canvas: CanvasBounds) {
	return (
		anchor.x >= canvas.x &&
		anchor.x <= canvas.x + canvas.width &&
		anchor.y >= canvas.y &&
		anchor.y <= canvas.y + canvas.height
	);
}

function structuralAnchors(input: VillageArtControlInputs, canvas: CanvasBounds) {
	const map = input.map;
	const landmarks = (map.landmarks ?? []).filter((item) => inCanvas(item, canvas));
	const transitions = map.transitions.filter((item) => anchorInCanvas(item, canvas));
	const pickups = (map.pickups ?? []).filter((item) => anchorInCanvas(item, canvas));
	const ambientNpcs = (map.ambientNpcs ?? []).filter((item) => anchorInCanvas(item, canvas));
	const discoveries = (map.discoveries ?? []).filter((item) => anchorInCanvas(item, canvas));
	const decor = (map.mapDecor ?? []).filter((item) => anchorInCanvas(item, canvas));
	const liveFootprints = (input.compiledVillage.landmarks ?? []).filter((item) =>
		inCanvas(item, canvas)
	);

	return {
		spawns: [{ id: `${map.id}-spawn`, ...map.spawn }],
		pickups: sortById(pickups).map(({ id, x, y }) => ({ id, x, y })),
		ambientNpcs: sortById(ambientNpcs).map(({ id, x, y, frameName, width, height }) => ({
			id,
			x,
			y,
			frameName,
			...(width === undefined ? {} : { width }),
			...(height === undefined ? {} : { height })
		})),
		transitions: sortById(transitions).map(({ id, x, y }) => ({ id, x, y })),
		discoveries: sortById(discoveries).map(({ id, x, y, radius }) => ({
			id,
			x,
			y,
			...(radius === undefined ? {} : { radius })
		})),
		decor: sortById(decor).map(({ id, x, y, width, height, collision }) => ({
			id,
			x,
			y,
			width,
			height,
			...(collision === undefined ? {} : { collision: structuralRect(collision, collision.id) })
		})),
		landmarks: sortById(landmarks).map(({ id, x, y, width, height }) => {
			const doorway = matchingDoorway({ id, x, y, width, height } as MapLandmark, map.transitions);
			return {
				id,
				x,
				y,
				width,
				height,
				...(doorway
					? {
							doorway: {
								id: doorway.id,
								x: doorway.x,
								y: doorway.y
							}
						}
					: {})
			};
		}),
		liveFootprints: sortById(liveFootprints).map(({ id, x, y, width, height }) => ({
			id,
			x,
			y,
			width,
			height
		}))
	};
}

export function canonicalizeVillageArtControlInputs<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: VillageArtControlInputs
): string {
	const canvas = canvasBounds(source);
	const semanticObjects = {
		landmarks: sortById(source.objects.landmarks ?? []).map(({ id, col, row, width, height }) => ({
			id,
			col,
			row,
			width,
			height
		})),
		transitions: sortById(source.objects.transitions ?? []).map(({ id, col, row }) => ({
			id,
			col,
			row
		})),
		pickups: sortById(source.objects.pickups ?? []).map(({ id, col, row }) => ({
			id,
			col,
			row
		})),
		ambientNpcs: sortById(source.objects.ambientNpcs ?? []).map(({ id, col, row, frameName }) => ({
			id,
			col,
			row,
			frameName
		})),
		discoveries: sortById(source.objects.discoveries ?? []).map(({ id, col, row }) => ({
			id,
			col,
			row
		}))
	};
	const sortedStrictInput = [...input.strictCollisionRects].sort(
		(a, b) =>
			String(a.id ?? '').localeCompare(String(b.id ?? '')) ||
			a.x - b.x ||
			a.y - b.y ||
			a.width - b.width ||
			a.height - b.height
	);
	const sortedLandmarkInput = [...input.landmarkCollisionRects].sort(
		(a, b) => a.x - b.x || a.y - b.y || a.width - b.width || a.height - b.height
	);
	const strictCollisionRects = localRects(sortedStrictInput, canvas, input.playerRadius, 'strict')
		.map((rect) => structuralRect(rect, rect.id))
		.sort((a, b) => String(a.id).localeCompare(String(b.id)));
	const landmarkCollisionRects = localRects(
		sortedLandmarkInput,
		canvas,
		input.playerRadius,
		'landmark'
	)
		.map((rect) => structuralRect(rect, rect.id))
		.sort((a, b) => String(a.id).localeCompare(String(b.id)));
	const decorGlyphs = Object.keys(source.decorGlyphTable)
		.sort()
		.map((glyph) => {
			const spec = source.decorGlyphTable[glyph];
			return {
				glyph,
				renderWidth: spec.renderWidth,
				renderHeight: spec.renderHeight,
				...(spec.collision === undefined ? {} : { collision: spec.collision })
			};
		});

	return JSON.stringify({
		version: 1,
		source: {
			idPrefix: source.idPrefix,
			origin: source.origin,
			width: source.width,
			height: source.height,
			tileSize: source.tileSize,
			layers: {
				terrain: source.layers.terrain,
				paths: source.layers.paths,
				collision: source.layers.collision,
				decor: source.layers.decor,
				regions: source.layers.regions
			},
			decorGlyphs,
			objects: semanticObjects
		},
		collision: {
			normalization: {
				playerRadius: input.playerRadius,
				doorwayClearanceWidth: input.doorwayClearanceWidth,
				transitionRadius: input.transitionRadius
			},
			strict: strictCollisionRects,
			landmarks: landmarkCollisionRects
		},
		anchors: structuralAnchors(input, canvas)
	});
}

export function computeVillageArtControlFingerprint<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: VillageArtControlInputs
): string {
	return createHash('sha256')
		.update(canonicalizeVillageArtControlInputs(source, input), 'utf8')
		.digest('hex');
}

function svgHeader(width: number, height: number): string {
	return `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${width} ${height}">`;
}

function rectElement(rect: LocalRect, fill: string, opacity?: number): string {
	const alpha = opacity === undefined ? '' : ` opacity="${opacity}"`;
	return `<rect x="${rect.x - rect.width / 2}" y="${rect.y - rect.height / 2}" width="${rect.width}" height="${rect.height}" fill="${fill}"${alpha}/>`;
}

function circleElement(x: number, y: number, radius: number, fill: string): string {
	return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>`;
}

function svgDocument(width: number, height: number, geometry: readonly string[]): string {
	return [svgHeader(width, height), ...geometry, '</svg>', ''].join('\n');
}

function tileRects<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	rows: readonly string[],
	fills: Record<string, string>
): string[] {
	const output: string[] = [];
	for (let row = 0; row < source.height; row += 1) {
		for (let col = 0; col < source.width; col += 1) {
			const glyph = rows[row][col];
			if (glyph === '.') continue;
			output.push(
				`<rect x="${col * source.tileSize}" y="${row * source.tileSize}" width="${source.tileSize}" height="${source.tileSize}" fill="${fills[glyph] ?? '#ff00ff'}"/>`
			);
		}
	}
	return output;
}

function localPoint(
	point: { readonly x: number; readonly y: number },
	canvas: CanvasBounds
): { x: number; y: number } {
	return { x: point.x - canvas.x, y: point.y - canvas.y };
}

function renderObjectAnchors<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: VillageArtControlInputs
): string[] {
	const canvas = canvasBounds(source);
	const anchors = structuralAnchors(input, canvas);
	const geometry: string[] = [];
	for (const landmark of anchors.landmarks) {
		const point = localPoint(landmark, canvas);
		geometry.push(circleElement(point.x, point.y, 12, '#7c3aed'));
	}
	for (const transition of anchors.transitions) {
		const point = localPoint(transition, canvas);
		geometry.push(
			`<rect x="${point.x - 8}" y="${point.y - 8}" width="16" height="16" fill="#dc2626"/>`
		);
	}
	for (const pickup of anchors.pickups) {
		const point = localPoint(pickup, canvas);
		geometry.push(circleElement(point.x, point.y, 8, '#16a34a'));
	}
	for (const npc of anchors.ambientNpcs) {
		const point = localPoint(npc, canvas);
		geometry.push(circleElement(point.x, point.y, 10, '#2563eb'));
	}
	for (const discovery of anchors.discoveries) {
		const point = localPoint(discovery, canvas);
		geometry.push(circleElement(point.x, point.y, 9, '#eab308'));
	}
	for (const decor of anchors.decor) {
		const point = localPoint(decor, canvas);
		geometry.push(circleElement(point.x, point.y, 5, '#ea580c'));
	}
	for (const spawn of anchors.spawns) {
		const point = localPoint(spawn, canvas);
		if (anchorInCanvas(spawn, canvas))
			geometry.push(circleElement(point.x, point.y, 10, '#ffffff'));
	}
	return geometry;
}

function renderBuildingEntrances<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: VillageArtControlInputs
): string[] {
	const canvas = canvasBounds(source);
	const geometry: string[] = [];
	for (const footprint of input.compiledVillage.landmarks ?? []) {
		const local = padClipWorldRectToLocal(footprint, canvas, 0);
		if (local) geometry.push(rectElement(local, '#6d28d9', 0.55));
	}
	for (const transition of input.map.transitions) {
		if (!anchorInCanvas(transition, canvas)) continue;
		const point = localPoint(transition, canvas);
		geometry.push(circleElement(point.x, point.y, 30, '#f97316'));
	}
	return geometry;
}

function renderForbiddenTall<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	data: VillageArtControlData,
	input: VillageArtControlInputs
): string[] {
	const geometry: string[] = [];
	for (let row = 0; row < source.height; row += 1) {
		for (let col = 0; col < source.width; col += 1) {
			const x = col * source.tileSize + source.tileSize / 2;
			const y = row * source.tileSize + source.tileSize / 2;
			if (!data.isLocalPointExcluded(x, y)) {
				geometry.push(
					`<rect x="${col * source.tileSize}" y="${row * source.tileSize}" width="${source.tileSize}" height="${source.tileSize}" fill="#ffffff"/>`
				);
			}
		}
	}
	geometry.push(...renderObjectAnchors(source, input));
	return geometry;
}

export function renderVillageArtControlArtifacts<K extends MapDecor['textureKey']>(
	source: LayeredRegionSource<K>,
	input: VillageArtControlInputs
): Map<VillageArtControlFilename, string> {
	const data = collectVillageArtControlData(source, input);
	const canvas = canvasBounds(source);
	const regionGeometry = tileRects(source, source.layers.regions, REGION_FILL);
	const layeredCollisionGeometry = tileRects(
		source,
		source.layers.collision,
		Object.fromEntries(
			[...new Set(source.layers.collision.join('').replaceAll('.', ''))].map((glyph) => [
				glyph,
				'#111827'
			])
		)
	);
	const terrainPathGeometry = [
		...tileRects(source, source.layers.terrain, TERRAIN_FILL),
		...tileRects(source, source.layers.paths, PATH_FILL)
	];
	const composedGeometry = data.composedCollisionRects.map((rect) => rectElement(rect, '#111827'));
	const buildingGeometry = renderBuildingEntrances(source, input);
	const anchorGeometry = renderObjectAnchors(source, input);
	const forbiddenGeometry = renderForbiddenTall(source, data, input);
	const combinedGeometry = [
		...regionGeometry.map((element) => element.replace('/>', ' opacity="0.5"/>')),
		...terrainPathGeometry.map((element) => element.replace('/>', ' opacity="0.45"/>')),
		...composedGeometry,
		...buildingGeometry,
		...anchorGeometry
	];
	const fingerprint = computeVillageArtControlFingerprint(source, input);
	const canonical = JSON.parse(canonicalizeVillageArtControlInputs(source, input)) as object;
	const manifest = `${JSON.stringify(
		{
			version: 1,
			viewBox: { x: 0, y: 0, width: canvas.width, height: canvas.height },
			worldBounds: canvas,
			computedControlFingerprint: fingerprint,
			artifacts: [...VILLAGE_ART_CONTROL_FILENAMES],
			structuralInputs: canonical
		},
		null,
		2
	)}\n`;

	return new Map<VillageArtControlFilename, string>([
		['village-art-control-manifest.json', manifest],
		['village-art-control.svg', svgDocument(data.width, data.height, combinedGeometry)],
		['village-building-entrance-mask.svg', svgDocument(data.width, data.height, buildingGeometry)],
		['village-composed-collision-mask.svg', svgDocument(data.width, data.height, composedGeometry)],
		['village-forbidden-tall-mask.svg', svgDocument(data.width, data.height, forbiddenGeometry)],
		[
			'village-layered-collision-mask.svg',
			svgDocument(data.width, data.height, layeredCollisionGeometry)
		],
		['village-object-anchors.svg', svgDocument(data.width, data.height, anchorGeometry)],
		['village-region-mask.svg', svgDocument(data.width, data.height, regionGeometry)],
		['village-terrain-path-mask.svg', svgDocument(data.width, data.height, terrainPathGeometry)]
	]);
}
