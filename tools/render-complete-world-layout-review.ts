import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import sharp from 'sharp';

import {
	actorAnimationAssets,
	animationPackAsset,
	environmentDressingAsset,
	getGroundFrameName,
	interiorPropAsset,
	npcPackAsset,
	terrainTilesAsset
} from '$lib/game/content/assets';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import {
	encodeCanonicalMeadowEntryPng,
	validateCanonicalPngChunks
} from '$lib/game/content/backgrounds/meadow-entry-png';
import {
	COMPLETE_WORLD_LAYOUT_DECISIONS,
	COMPLETE_WORLD_MAP_IDS,
	type CompleteWorldMapId
} from '$lib/game/content/maps/layouts/complete-world-layout-foundation';
import {
	buildVillageInteriorNavigationSource,
	type VillageInteriorMapId
} from '$lib/game/content/backgrounds/village-interior-package';
import { VILLAGE_INTERIOR_LAYOUTS } from '$lib/game/content/maps/layouts/village-interiors-v2';
import {
	MEADOW_ENTRY_V2_CROSSINGS,
	MEADOW_ENTRY_V2_RIVER_SEGMENTS
} from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { maps, openingMapId, type MapRect, type WorldMapDefinition } from '$lib/game/content/maps';
import { compileNavigationGrid, isWalkable } from '$lib/game/core/navigation';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';
import {
	collectRegisteredVillageInteriorManifests,
	validateVillageInteriorManifest
} from './validate-village-interior-art';

const TILE_SIZE = 32;
const MAX_REVIEW_EDGE = 1600;
const CROSSING_CROP = { left: 2048, top: 2048, right: 4352, bottom: 6144 } as const;
const CROSSING_MAX_REVIEW_EDGE = 1152;
const DEFAULT_OUTPUT_ROOT = 'docs/superpowers/reports/img/complete-world-layout-foundation';
const DEFAULT_INTERIOR_OUTPUT_ROOT = 'docs/superpowers/reports/img/hpa-586-interiors';

const COLORS = {
	legacyTerrain: '#25322a',
	ground: '#4ade80',
	water: '#2563eb',
	blocker: '#ef4444',
	fence: '#f97316',
	collidable: '#a855f7',
	landmark: '#64748b',
	transition: '#facc15',
	actor: '#22d3ee',
	pickup: '#bef264',
	route: '#ffffff',
	labelBackground: '#111827',
	labelText: '#ffffff'
} as const;

type Bounds = Readonly<{ x: number; y: number; width: number; height: number }>;
type Point = Readonly<{ x: number; y: number }>;
type View = Readonly<{
	left: number;
	top: number;
	width: number;
	height: number;
	outputWidth: number;
	outputHeight: number;
}>;

const ROUTE_NAVIGATION_STEP = 16;

/**
 * Exact Task 4 route-proof anchors. These are proof targets, not a second map
 * geometry source; the solver below consumes all collision geometry from the
 * active Meadow map and only uses these reviewed endpoints.
 */
const MEADOW_ROUTE_PROOF_ANCHORS = {
	heroHouse: { x: 704, y: 5920 },
	villageBridgeWest: { x: 2496, y: 4624 },
	villageBridgeEast: { x: 3744, y: 4624 },
	crossroads: { x: 3904, y: 4224 },
	mistfen: { x: 2240, y: 3648 },
	silverpine: { x: 3904, y: 2416 },
	wildwood: { x: 4992, y: 3904 },
	coast: { x: 4224, y: 5120 },
	cave: { x: 5760, y: 1868 },
	ferry: { x: 3600, y: 5500 }
} as const;

type MeadowRouteProofAnchorId = keyof typeof MEADOW_ROUTE_PROOF_ANCHORS;

const MEADOW_ROUTE_PROOF_SEGMENTS = [
	{ id: 'hero-house-to-village-bridge-west', from: 'heroHouse', to: 'villageBridgeWest' },
	{ id: 'village-bridge-west-to-east', from: 'villageBridgeWest', to: 'villageBridgeEast' },
	{ id: 'village-bridge-east-to-crossroads', from: 'villageBridgeEast', to: 'crossroads' },
	{ id: 'crossroads-to-mistfen', from: 'crossroads', to: 'mistfen' },
	{ id: 'crossroads-to-silverpine', from: 'crossroads', to: 'silverpine' },
	{ id: 'crossroads-to-wildwood', from: 'crossroads', to: 'wildwood' },
	{ id: 'wildwood-to-cave', from: 'wildwood', to: 'cave' },
	{ id: 'crossroads-to-coast', from: 'crossroads', to: 'coast' },
	{ id: 'coast-to-ferry', from: 'coast', to: 'ferry' }
] as const satisfies readonly {
	id: string;
	from: MeadowRouteProofAnchorId;
	to: MeadowRouteProofAnchorId;
}[];

export interface MeadowRouteProofPath {
	readonly id: string;
	readonly from: MeadowRouteProofAnchorId;
	readonly to: MeadowRouteProofAnchorId;
	readonly points: readonly Point[];
}

export interface CompleteWorldLayoutReviewEntry {
	readonly mapId: CompleteWorldMapId;
	readonly disposition: 'preserved' | 'changed';
	readonly reasonIds: readonly string[];
	readonly worldDimensions: { readonly width: number; readonly height: number };
	readonly reviewDimensions: { readonly width: number; readonly height: number };
	readonly imagePath: string;
	readonly imageSha256: string;
	readonly counts: Readonly<Record<string, number>>;
}

interface CompleteWorldLayoutCrossingReview {
	readonly imagePath: string;
	readonly worldDimensions: { readonly width: number; readonly height: number };
	readonly reviewDimensions: { readonly width: number; readonly height: number };
	readonly crop: typeof CROSSING_CROP;
	readonly imageSha256: string;
	readonly counts: Readonly<Record<string, number>>;
	readonly routeProofSegments: readonly {
		readonly id: string;
		readonly from: MeadowRouteProofAnchorId;
		readonly to: MeadowRouteProofAnchorId;
	}[];
}

interface CompleteWorldLayoutReviewInventory {
	readonly version: 1;
	readonly entries: readonly CompleteWorldLayoutReviewEntry[];
	readonly crossingReview: CompleteWorldLayoutCrossingReview;
}

interface RenderedArtifact {
	readonly path: string;
	readonly bytes: Buffer;
}

interface RenderedReview {
	readonly entries: readonly CompleteWorldLayoutReviewEntry[];
	readonly crossingReview: CompleteWorldLayoutCrossingReview;
	readonly inventory: CompleteWorldLayoutReviewInventory;
	readonly artifacts: readonly RenderedArtifact[];
}

export interface VillageInteriorLayoutReviewInventory {
	readonly version: 1;
	readonly mapId: VillageInteriorMapId;
	readonly artifacts: readonly {
		readonly path: string;
		readonly width: number;
		readonly height: number;
		readonly sha256: string;
	}[];
}

interface SvgContext {
	readonly view: View;
	readonly labelFontSize: number;
}

function sha256(value: Uint8Array): string {
	return createHash('sha256').update(value).digest('hex');
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function centeredBounds(value: MapRect): Bounds {
	return {
		x: value.x - value.width / 2,
		y: value.y - value.height / 2,
		width: value.width,
		height: value.height
	};
}

function rectBounds(value: {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}): Bounds {
	return value;
}

function markerBounds(point: Point, width = 64, height = 64): Bounds {
	return { x: point.x - width / 2, y: point.y - height / 2, width, height };
}

function scaleFor(width: number, height: number, maxEdge: number): number {
	return Math.min(1, maxEdge / width, maxEdge / height);
}

function reviewDimensions(width: number, height: number, maxEdge = MAX_REVIEW_EDGE) {
	const scale = scaleFor(width, height, maxEdge);
	return { width: Math.ceil(width * scale), height: Math.ceil(height * scale) };
}

function clamp(value: number, minimum: number, maximum: number): number {
	return Math.min(Math.max(value, minimum), maximum);
}

function contextFor(view: View): SvgContext {
	return {
		view,
		labelFontSize: clamp(Math.min(view.width, view.height) / 180, 16, 32)
	};
}

function svgRect(
	value: Bounds,
	fill: string,
	options: {
		readonly opacity?: number;
		readonly stroke?: string;
		readonly strokeWidth?: number;
		readonly dash?: string;
	} = {}
): string {
	const opacity = options.opacity === undefined ? 1 : options.opacity;
	const stroke = options.stroke === undefined ? 'none' : options.stroke;
	const strokeWidth = options.strokeWidth === undefined ? 0 : options.strokeWidth;
	const dash = options.dash === undefined ? '' : ` stroke-dasharray="${options.dash}"`;
	return `<rect x="${value.x}" y="${value.y}" width="${value.width}" height="${value.height}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="${strokeWidth}"${dash}/>`;
}

function svgCircle(
	point: Point,
	radius: number,
	fill: string,
	opacity = 1,
	stroke = 'none'
): string {
	return `<circle cx="${point.x}" cy="${point.y}" r="${radius}" fill="${fill}" fill-opacity="${opacity}" stroke="${stroke}" stroke-width="8"/>`;
}

function labelSvg(label: string, point: Point, context: SvgContext): string {
	const { view, labelFontSize } = context;
	const outputScale = view.outputWidth / view.width;
	const padding = Math.max(labelFontSize * 0.75, 16 / outputScale);
	const maximumWidth = Math.max(labelFontSize * 2, view.width - padding * 2);
	const labelWidth = Math.min(
		maximumWidth,
		Math.max(labelFontSize * 2, label.length * labelFontSize * 0.55)
	);
	const left = clamp(
		point.x - labelWidth / 2,
		view.left + padding,
		view.left + view.width - padding - labelWidth
	);
	const top = clamp(
		point.y - labelFontSize * 1.35,
		view.top + padding,
		view.top + view.height - padding - labelFontSize * 1.9
	);
	const textLength = Math.max(labelFontSize, labelWidth - labelFontSize);
	return [
		`<rect x="${left}" y="${top}" width="${labelWidth}" height="${labelFontSize * 1.9}" rx="${labelFontSize * 0.25}" fill="${COLORS.labelBackground}" fill-opacity="0.86"/>`,
		`<text x="${left + labelWidth / 2}" y="${top + labelFontSize * 1.3}" fill="${COLORS.labelText}" font-family="sans-serif" font-size="${labelFontSize}" text-anchor="middle" textLength="${textLength}" lengthAdjust="spacingAndGlyphs">${escapeXml(label)}</text>`
	].join('');
}

function layerCountEntries(
	map: WorldMapDefinition,
	routeCounts: { anchors: number; segments: number } = { anchors: 0, segments: 0 }
): Readonly<Record<string, number>> {
	const groundPatches = map.groundPatches ?? [];
	const collidableDecor = (map.mapDecor ?? []).filter((decor) => decor.collision).length;
	const collidableInteriorProps = (map.interiorProps ?? []).filter((prop) => prop.collision).length;
	const counts: Record<string, number> = {
		ambientNpcs: map.ambientNpcs?.length ?? 0,
		blockers: map.blockers?.length ?? 0,
		collidableDecor,
		collidableInteriorProps,
		discoveries: map.discoveries?.length ?? 0,
		encounters: map.encounters?.length ?? 0,
		fences: map.fences?.length ?? 0,
		groundPatches: groundPatches.length,
		landmarks: map.landmarks?.length ?? 0,
		npcs: map.npcs?.length ?? 0,
		pickups: map.pickups?.length ?? 0,
		routeAnchors: routeCounts.anchors,
		routeSegments: routeCounts.segments,
		statefulClearances:
			(map.transitions?.length ?? 0) +
			(map.npcs?.length ?? 0) +
			(map.ambientNpcs?.length ?? 0) +
			(map.encounters?.length ?? 0) +
			(map.pickups?.length ?? 0) +
			(map.discoveries?.length ?? 0),
		transitions: map.transitions.length,
		waterPatches: groundPatches.filter((patch) => patch.tile === 'seaTile').length
	};
	return Object.fromEntries(
		Object.entries(counts).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
	);
}

function markerLabelSvg(id: string, point: Point, context: SvgContext): string {
	return labelSvg(id, point, context);
}

function routeGridKey(point: Point): string {
	return `${point.x},${point.y}`;
}

function routePointIsWalkable(
	map: WorldMapDefinition,
	collisionRects: ReturnType<typeof collectStrictCollisionRects>,
	point: Point
): boolean {
	const mapWidth = map.width * TILE_SIZE;
	const mapHeight = map.height * TILE_SIZE;
	return (
		point.x >= PLAYER_COLLISION_RADIUS &&
		point.y >= PLAYER_COLLISION_RADIUS &&
		point.x <= mapWidth - PLAYER_COLLISION_RADIUS &&
		point.y <= mapHeight - PLAYER_COLLISION_RADIUS &&
		!isInsideAnyCollisionRect(point.x, point.y, collisionRects, PLAYER_COLLISION_RADIUS)
	);
}

function routeSegmentIsWalkable(
	map: WorldMapDefinition,
	collisionRects: ReturnType<typeof collectStrictCollisionRects>,
	from: Point,
	to: Point
): boolean {
	const distance = Math.hypot(to.x - from.x, to.y - from.y);
	const steps = Math.max(1, Math.ceil(distance / 4));
	for (let index = 0; index <= steps; index += 1) {
		const progress = index / steps;
		const point = {
			x: from.x + (to.x - from.x) * progress,
			y: from.y + (to.y - from.y) * progress
		};
		if (!routePointIsWalkable(map, collisionRects, point)) return false;
	}
	return true;
}

function alignRoutePoint(point: Point): Point {
	return {
		x: Math.round(point.x / ROUTE_NAVIGATION_STEP) * ROUTE_NAVIGATION_STEP,
		y: Math.round(point.y / ROUTE_NAVIGATION_STEP) * ROUTE_NAVIGATION_STEP
	};
}

function nearestWalkableRouteGridPoint(
	map: WorldMapDefinition,
	collisionRects: ReturnType<typeof collectStrictCollisionRects>,
	anchor: Point
): Point {
	const aligned = alignRoutePoint(anchor);
	for (let radius = 0; radius <= 4; radius += 1) {
		for (let yOffset = -radius; yOffset <= radius; yOffset += 1) {
			for (let xOffset = -radius; xOffset <= radius; xOffset += 1) {
				if (Math.max(Math.abs(xOffset), Math.abs(yOffset)) !== radius) continue;
				const candidate = {
					x: aligned.x + xOffset * ROUTE_NAVIGATION_STEP,
					y: aligned.y + yOffset * ROUTE_NAVIGATION_STEP
				};
				if (
					routePointIsWalkable(map, collisionRects, candidate) &&
					routeSegmentIsWalkable(map, collisionRects, anchor, candidate)
				) {
					return candidate;
				}
			}
		}
	}
	throw new Error(`Route proof anchor is not reachable on the ${ROUTE_NAVIGATION_STEP}px grid`);
}

function compressRoutePoints(points: readonly Point[]): readonly Point[] {
	if (points.length <= 2) return points;
	const compressed: Point[] = [points[0]!];
	for (let index = 1; index < points.length - 1; index += 1) {
		const previous = compressed.at(-1)!;
		const current = points[index]!;
		const next = points[index + 1]!;
		const firstX = current.x - previous.x;
		const firstY = current.y - previous.y;
		const secondX = next.x - current.x;
		const secondY = next.y - current.y;
		const collinear = firstX * secondY - firstY * secondX === 0;
		const continuing = firstX * secondX + firstY * secondY >= 0;
		if (!collinear || !continuing) compressed.push(current);
	}
	compressed.push(points.at(-1)!);
	return compressed;
}

function findRouteProofPath(
	map: WorldMapDefinition,
	collisionRects: ReturnType<typeof collectStrictCollisionRects>,
	segment: (typeof MEADOW_ROUTE_PROOF_SEGMENTS)[number]
): MeadowRouteProofPath {
	const from = MEADOW_ROUTE_PROOF_ANCHORS[segment.from];
	const to = MEADOW_ROUTE_PROOF_ANCHORS[segment.to];
	if (!routePointIsWalkable(map, collisionRects, from)) {
		throw new Error(
			`Meadow route proof blocked: ${segment.id} (${segment.from} -> ${segment.to}); start anchor is colliding`
		);
	}
	if (!routePointIsWalkable(map, collisionRects, to)) {
		throw new Error(
			`Meadow route proof blocked: ${segment.id} (${segment.from} -> ${segment.to}); goal anchor is colliding`
		);
	}

	let start: Point;
	let goal: Point;
	try {
		start = nearestWalkableRouteGridPoint(map, collisionRects, from);
		goal = nearestWalkableRouteGridPoint(map, collisionRects, to);
	} catch (error) {
		throw new Error(
			`Meadow route proof blocked: ${segment.id} (${segment.from} -> ${segment.to}); no clear grid anchor`,
			{ cause: error }
		);
	}
	const queue: Point[] = [start];
	const parents = new Map<string, string | null>([[routeGridKey(start), null]]);
	let goalKey: string | null = null;
	for (let cursor = 0; cursor < queue.length; cursor += 1) {
		const current = queue[cursor]!;
		const currentKey = routeGridKey(current);
		if (currentKey === routeGridKey(goal)) {
			goalKey = currentKey;
			break;
		}
		for (const [xDelta, yDelta] of [
			[ROUTE_NAVIGATION_STEP, 0],
			[-ROUTE_NAVIGATION_STEP, 0],
			[0, ROUTE_NAVIGATION_STEP],
			[0, -ROUTE_NAVIGATION_STEP]
		]) {
			const next = { x: current.x + xDelta, y: current.y + yDelta };
			const nextKey = routeGridKey(next);
			if (
				parents.has(nextKey) ||
				!routePointIsWalkable(map, collisionRects, next) ||
				!routeSegmentIsWalkable(map, collisionRects, current, next)
			) {
				continue;
			}
			parents.set(nextKey, currentKey);
			queue.push(next);
		}
	}

	if (goalKey === null) {
		throw new Error(`Meadow route proof blocked: ${segment.id} (${segment.from} -> ${segment.to})`);
	}

	const gridPath: Point[] = [];
	let currentKey: string | null = goalKey;
	while (currentKey !== null) {
		const [x, y] = currentKey.split(',').map(Number);
		gridPath.push({ x, y });
		currentKey = parents.get(currentKey) ?? null;
	}
	gridPath.reverse();

	const points: Point[] = [from];
	for (const point of gridPath) {
		if (routeGridKey(points.at(-1)!) !== routeGridKey(point)) points.push(point);
	}
	if (routeGridKey(points.at(-1)!) !== routeGridKey(to)) points.push(to);
	return {
		id: segment.id,
		from: segment.from,
		to: segment.to,
		points: compressRoutePoints(points)
	};
}

export function deriveMeadowRouteProofPaths(
	map: WorldMapDefinition
): readonly MeadowRouteProofPath[] {
	const collisionRects = [...collectStrictCollisionRects(map), ...collectLandmarkRects(map)];
	return MEADOW_ROUTE_PROOF_SEGMENTS.map((segment) =>
		findRouteProofPath(map, collisionRects, segment)
	);
}

function renderGroundPatches(map: WorldMapDefinition): string {
	return (map.groundPatches ?? [])
		.map((patch) =>
			svgRect(centeredBounds(patch), patch.tile === 'seaTile' ? COLORS.water : COLORS.ground)
		)
		.join('');
}

function renderBlockers(map: WorldMapDefinition): string {
	return (map.blockers ?? [])
		.map((blocker) =>
			svgRect(centeredBounds(blocker), COLORS.blocker, {
				opacity: 0.62,
				stroke: COLORS.blocker,
				strokeWidth: 8
			})
		)
		.join('');
}

function renderFences(map: WorldMapDefinition): string {
	return (map.fences ?? [])
		.map((fence) =>
			svgRect(centeredBounds(fence), COLORS.fence, {
				opacity: 0.72,
				stroke: COLORS.fence,
				strokeWidth: 8
			})
		)
		.join('');
}

function renderCollidables(map: WorldMapDefinition): string {
	const decor = (map.mapDecor ?? [])
		.filter((item) => item.collision)
		.map((item) =>
			svgRect(centeredBounds(item.collision!), COLORS.collidable, {
				opacity: 0.64,
				stroke: COLORS.collidable,
				strokeWidth: 8
			})
		);
	const interiorProps = (map.interiorProps ?? [])
		.filter((item) => item.collision)
		.map((item) =>
			svgRect(centeredBounds(item.collision!), COLORS.collidable, {
				opacity: 0.64,
				stroke: COLORS.collidable,
				strokeWidth: 8
			})
		);
	return [...decor, ...interiorProps].join('');
}

function renderLandmarks(map: WorldMapDefinition, context: SvgContext): string {
	return (map.landmarks ?? [])
		.map((landmark) => {
			const point = { x: landmark.x, y: landmark.y };
			return [
				svgRect(centeredBounds(landmark), COLORS.landmark, {
					opacity: 0.58,
					stroke: COLORS.landmark,
					strokeWidth: 8
				}),
				labelSvg(landmark.id, point, context)
			].join('');
		})
		.join('');
}

function renderTransitions(map: WorldMapDefinition, context: SvgContext): string {
	return map.transitions
		.map((transition) => {
			const point = { x: transition.x, y: transition.y };
			return [
				svgRect(markerBounds(point, 64, 64), COLORS.transition, {
					opacity: 0.86,
					stroke: COLORS.labelBackground,
					strokeWidth: 8
				}),
				markerLabelSvg(transition.id, point, context)
			].join('');
		})
		.join('');
}

function renderActors(map: WorldMapDefinition, context: SvgContext): string {
	const parts: string[] = [];
	const spawn = { x: map.spawn.x, y: map.spawn.y };
	parts.push(svgCircle(spawn, 36, COLORS.actor, 0.9, COLORS.labelBackground));
	parts.push(markerLabelSvg(`${map.id}-spawn`, spawn, context));
	for (const npc of map.npcs ?? []) {
		const point = { x: npc.x, y: npc.y };
		parts.push(svgCircle(point, 32, COLORS.actor, 0.9, COLORS.labelBackground));
		parts.push(markerLabelSvg(npc.id, point, context));
	}
	for (const npc of map.ambientNpcs ?? []) {
		const point = { x: npc.x, y: npc.y };
		parts.push(svgCircle(point, 28, COLORS.actor, 0.82, COLORS.labelBackground));
		parts.push(markerLabelSvg(npc.id, point, context));
	}
	for (const encounter of map.encounters ?? []) {
		const point = { x: encounter.x, y: encounter.y };
		parts.push(svgCircle(point, 32, COLORS.actor, 0.9, COLORS.labelBackground));
		parts.push(markerLabelSvg(encounter.id, point, context));
	}
	return parts.join('');
}

function renderPickupsAndDiscoveries(map: WorldMapDefinition, context: SvgContext): string {
	const parts: string[] = [];
	for (const pickup of map.pickups ?? []) {
		const point = { x: pickup.x, y: pickup.y };
		parts.push(svgCircle(point, 24, COLORS.pickup, 0.94, COLORS.labelBackground));
		parts.push(markerLabelSvg(pickup.id, point, context));
	}
	for (const discovery of map.discoveries ?? []) {
		const point = { x: discovery.x, y: discovery.y };
		parts.push(svgCircle(point, 24, COLORS.pickup, 0.94, COLORS.labelBackground));
		parts.push(markerLabelSvg(discovery.id, point, context));
	}
	return parts.join('');
}

function renderRouteProof(paths: readonly MeadowRouteProofPath[], context: SvgContext): string {
	const parts: string[] = [];
	for (const path of paths) {
		const pointList = path.points.map(({ x, y }) => `${x},${y}`).join(' ');
		parts.push(
			`<polyline points="${pointList}" fill="none" stroke="${COLORS.route}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`
		);
		const midpoint = path.points[Math.floor(path.points.length / 2)]!;
		parts.push(labelSvg(path.id, midpoint, context));
		parts.push(svgCircle(MEADOW_ROUTE_PROOF_ANCHORS[path.from], 30, COLORS.route, 0.95));
		parts.push(svgCircle(MEADOW_ROUTE_PROOF_ANCHORS[path.to], 30, COLORS.route, 0.95));
	}
	return parts.join('');
}

function renderMeadowLandscapeLabels(context: SvgContext): string {
	const parts: string[] = [];
	for (const segment of MEADOW_ENTRY_V2_RIVER_SEGMENTS) {
		const point = {
			x: segment.rect.x + segment.rect.width / 2,
			y: segment.rect.y + segment.rect.height / 2
		};
		parts.push(labelSvg(segment.id, point, context));
	}
	for (const [id, crossing] of Object.entries(MEADOW_ENTRY_V2_CROSSINGS)) {
		const point = { x: crossing.x + crossing.width / 2, y: crossing.y + crossing.height / 2 };
		parts.push(labelSvg(id, point, context));
	}
	return parts.join('');
}

function renderMapSvg(
	map: WorldMapDefinition,
	view: View,
	routeProofPaths: readonly MeadowRouteProofPath[] = []
): string {
	const context = contextFor(view);
	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" preserveAspectRatio="none">`,
		svgRect(
			{ x: view.left, y: view.top, width: view.width, height: view.height },
			COLORS.legacyTerrain
		),
		renderGroundPatches(map),
		renderBlockers(map),
		renderFences(map),
		renderCollidables(map),
		renderLandmarks(map, context),
		renderTransitions(map, context),
		renderActors(map, context),
		renderPickupsAndDiscoveries(map, context)
	];
	if (routeProofPaths.length > 0)
		parts.push(renderRouteProof(routeProofPaths, context), renderMeadowLandscapeLabels(context));
	parts.push('</svg>');
	return parts.join('');
}

function interiorMapView(mapId: VillageInteriorMapId): View {
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const dimensions = reviewDimensions(layout.fullFloor.width, layout.fullFloor.height);
	return {
		left: 0,
		top: 0,
		width: layout.fullFloor.width,
		height: layout.fullFloor.height,
		outputWidth: dimensions.width,
		outputHeight: dimensions.height
	};
}

function interiorCameraView(mapId: VillageInteriorMapId, width: number, height: number): View {
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const center = layout.spawn;
	const left = Math.max(0, Math.min(center.x - width / 2, layout.fullFloor.width - width));
	const top = Math.max(0, Math.min(center.y - height / 2, layout.fullFloor.height - height));
	return {
		left,
		top,
		width,
		height,
		outputWidth: width,
		outputHeight: height
	};
}

function interiorRectLabel(
	label: string,
	value: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	},
	context: SvgContext
): string {
	return labelSvg(label, { x: value.x + value.width / 2, y: value.y + value.height / 2 }, context);
}

function renderInteriorCoordinateSvg(mapId: VillageInteriorMapId, view: View): string {
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const context = contextFor(view);
	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" preserveAspectRatio="none">`,
		svgRect(
			{ x: view.left, y: view.top, width: view.width, height: view.height },
			COLORS.legacyTerrain
		),
		svgRect(layout.fullFloor, COLORS.ground, {
			opacity: 0.18,
			stroke: COLORS.ground,
			strokeWidth: 8
		}),
		...Object.entries(layout.rooms).map(([id, value]) =>
			[
				svgRect(value, '#60a5fa', { opacity: 0.22, stroke: '#60a5fa', strokeWidth: 8 }),
				interiorRectLabel(`room:${id}`, value, context)
			].join('')
		),
		...Object.entries(layout.corridors).map(([id, value]) =>
			[
				svgRect(value, '#34d399', { opacity: 0.24, stroke: '#34d399', strokeWidth: 8 }),
				interiorRectLabel(`corridor:${id}`, value, context)
			].join('')
		),
		...Object.entries(layout.doors).map(([id, value]) =>
			[
				svgRect(value, COLORS.transition, {
					opacity: 0.8,
					stroke: COLORS.labelBackground,
					strokeWidth: 6
				}),
				interiorRectLabel(`door:${id}`, value, context)
			].join('')
		),
		...layout.walls.map((wall) =>
			[
				svgRect(wall, COLORS.blocker, { opacity: 0.72, stroke: COLORS.blocker, strokeWidth: 6 }),
				interiorRectLabel(`wall:${wall.id}`, wall, context)
			].join('')
		),
		...Object.entries(layout.propZones).map(([id, value]) =>
			[
				svgRect(value, COLORS.collidable, {
					opacity: 0.3,
					stroke: COLORS.collidable,
					strokeWidth: 5,
					dash: '18 12'
				}),
				interiorRectLabel(`prop:${id}`, value, context)
			].join('')
		),
		...Object.entries(layout.propCollisions).map(([id, value]) =>
			[
				svgRect(value, COLORS.fence, { opacity: 0.76, stroke: COLORS.fence, strokeWidth: 5 }),
				interiorRectLabel(`collision:${id}`, value, context)
			].join('')
		),
		'</svg>'
	];
	return parts.join('');
}

function renderInteriorNavigationSvg(
	mapId: VillageInteriorMapId,
	view: View,
	mode: 'raw' | 'player-centre' | 'both' = 'both',
	includeBackground = true
): string {
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const source = buildVillageInteriorNavigationSource({ mapId, layout });
	const grid = compileNavigationGrid(source);
	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" preserveAspectRatio="none">`,
		...(includeBackground
			? [
					svgRect(
						{ x: view.left, y: view.top, width: view.width, height: view.height },
						COLORS.legacyTerrain
					)
				]
			: []),
		svgRect(layout.fullFloor, COLORS.ground, {
			opacity: 0.12,
			stroke: COLORS.ground,
			strokeWidth: 8
		})
	];
	for (let row = 0; row < source.heightCells; row += 1) {
		for (let column = 0; column < source.widthCells; column += 1) {
			const cell = {
				x: column * source.cellSizePx,
				y: row * source.cellSizePx,
				width: source.cellSizePx,
				height: source.cellSizePx
			};
			if (mode !== 'player-centre' && source.rows[row]![column] === '#') {
				parts.push(
					svgRect(cell, COLORS.blocker, { opacity: 0.7, stroke: COLORS.blocker, strokeWidth: 1 })
				);
			}
			const center = {
				x: cell.x + source.cellSizePx / 2,
				y: cell.y + source.cellSizePx / 2
			};
			if (mode !== 'raw' && !isWalkable(grid, center.x, center.y)) {
				parts.push(svgRect(cell, '#fbbf24', { opacity: 0.32, stroke: '#fbbf24', strokeWidth: 1 }));
			}
		}
	}
	parts.push('</svg>');
	return parts.join('');
}

function renderInteriorAnchorsSvg(
	mapId: VillageInteriorMapId,
	view: View,
	includeBackground = true
): string {
	const map = maps[mapId];
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	assert(map !== undefined, `Interior map is not registered: ${mapId}`);
	const context = contextFor(view);
	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" preserveAspectRatio="none">`,
		...(includeBackground
			? [
					svgRect(
						{ x: view.left, y: view.top, width: view.width, height: view.height },
						COLORS.legacyTerrain
					)
				]
			: []),
		svgCircle(map.spawn, 28, COLORS.actor, 0.9, COLORS.labelBackground),
		labelSvg('spawn', map.spawn, context),
		svgCircle(layout.exit, 28, COLORS.transition, 0.9, COLORS.labelBackground),
		labelSvg('exit', layout.exit, context)
	];
	for (const transition of map.transitions) {
		const point = { x: transition.x, y: transition.y };
		parts.push(
			svgCircle(point, 24, COLORS.transition, 0.86, COLORS.labelBackground),
			labelSvg(transition.id, point, context)
		);
	}
	for (const npc of map.npcs ?? []) {
		const point = { x: npc.x, y: npc.y };
		parts.push(
			svgCircle(point, 24, COLORS.actor, 0.9, COLORS.labelBackground),
			labelSvg(npc.id, point, context)
		);
	}
	for (const npc of map.ambientNpcs ?? []) {
		const point = { x: npc.x, y: npc.y };
		parts.push(
			svgCircle(point, 20, COLORS.actor, 0.7, COLORS.labelBackground),
			labelSvg(npc.id, point, context)
		);
	}
	for (const [id, value] of Object.entries(layout.npcApproaches)) {
		parts.push(
			svgCircle(value.approach, 18, COLORS.route, 0.9, COLORS.labelBackground),
			labelSvg(`${id}: approach`, value.approach, context),
			svgCircle(value.npc, 14, COLORS.actor, 0.8, COLORS.labelBackground)
		);
	}
	parts.push('</svg>');
	return parts.join('');
}

function renderInteriorRouteWidthSvg(mapId: VillageInteriorMapId, view: View): string {
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const context = contextFor(view);
	const parts = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" preserveAspectRatio="none">`,
		svgRect(
			{ x: view.left, y: view.top, width: view.width, height: view.height },
			COLORS.legacyTerrain
		)
	];
	for (const [id, value] of [
		...Object.entries(layout.corridors),
		...Object.entries(layout.doors)
	]) {
		parts.push(
			svgRect(value, 'none', { stroke: COLORS.route, strokeWidth: 10, dash: '24 12' }),
			interiorRectLabel(`${id}: ${value.width}x${value.height}px`, value, context)
		);
	}
	parts.push('</svg>');
	return parts.join('');
}

async function composeSvgOverPng(base: Buffer, svg: string): Promise<Buffer> {
	return sharp(base)
		.composite([{ input: Buffer.from(svg), blend: 'over' }])
		.png()
		.toBuffer();
}

function interiorImagePath(path: string, repositoryRoot: string): string {
	const normalized = path.replaceAll('\\', '/');
	if (normalized.startsWith('/game/'))
		return resolve(repositoryRoot, 'public', normalized.slice(1));
	if (normalized.startsWith('public/')) return resolve(repositoryRoot, normalized);
	return resolve(repositoryRoot, normalized);
}

async function renderLegacyInteriorPng(
	mapId: VillageInteriorMapId,
	repositoryRoot: string
): Promise<Buffer> {
	const map = maps[mapId];
	assert(map !== undefined, `Interior map is not registered: ${mapId}`);
	const width = map.width * TILE_SIZE;
	const height = map.height * TILE_SIZE;
	const terrainSource = await readFile(interiorImagePath(terrainTilesAsset.path, repositoryRoot));
	const terrainTileCache = new Map<string, Buffer>();
	const readTerrainTile = async (frameName: keyof typeof terrainTilesAsset.frames) => {
		const cached = terrainTileCache.get(frameName);
		if (cached) return cached;
		const frame = terrainTilesAsset.frames[frameName];
		const tile = await sharp(terrainSource)
			.extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h })
			.resize({ width: TILE_SIZE, height: TILE_SIZE })
			.png()
			.toBuffer();
		terrainTileCache.set(frameName, tile);
		return tile;
	};
	const groundInputs: { input: Buffer; left: number; top: number }[] = [];
	for (let row = 0; row < map.height; row += 1) {
		for (let column = 0; column < map.width; column += 1) {
			const center = {
				x: column * TILE_SIZE + TILE_SIZE / 2,
				y: row * TILE_SIZE + TILE_SIZE / 2
			};
			let frameName: keyof typeof terrainTilesAsset.frames | undefined;
			for (let index = (map.groundPatches?.length ?? 0) - 1; index >= 0; index -= 1) {
				const patch = map.groundPatches![index]!;
				const bounds = centeredBounds(patch);
				if (
					center.x >= bounds.x &&
					center.x <= bounds.x + bounds.width &&
					center.y >= bounds.y &&
					center.y <= bounds.y + bounds.height
				) {
					frameName = patch.tile;
					break;
				}
			}
			if (
				frameName === undefined &&
				map.id !== openingMapId &&
				(row === 0 || column === 0 || row === map.height - 1 || column === map.width - 1)
			) {
				frameName = 'stoneWallTile';
			}
			frameName ??= getGroundFrameName(map.id);
			groundInputs.push({
				input: await readTerrainTile(frameName),
				left: column * TILE_SIZE,
				top: row * TILE_SIZE
			});
		}
	}

	const inputs = [...groundInputs];
	const blockers = map.blockers ?? [];
	if (blockers.length > 0) {
		const environmentSource = await readFile(
			interiorImagePath(environmentDressingAsset.path, repositoryRoot)
		);
		const ruinWallFrame = environmentDressingAsset.frames.ruinWall;
		const ruinWall = await sharp(environmentSource)
			.extract({
				left: ruinWallFrame.x,
				top: ruinWallFrame.y,
				width: ruinWallFrame.w,
				height: ruinWallFrame.h
			})
			.png()
			.toBuffer();
		const blockerInputs: { input: Buffer; left: number; top: number }[] = [];
		for (const blocker of blockers) {
			assert(
				blocker.kind === 'ruin-wall',
				`${mapId} fallback blocker kind is not supported by the legacy interior renderer: ${blocker.kind}`
			);
			const bounds = centeredBounds(blocker);
			for (let top = bounds.y; top < bounds.y + bounds.height; top += ruinWallFrame.h) {
				for (let left = bounds.x; left < bounds.x + bounds.width; left += ruinWallFrame.w) {
					const tileWidth = Math.min(ruinWallFrame.w, bounds.x + bounds.width - left);
					const tileHeight = Math.min(ruinWallFrame.h, bounds.y + bounds.height - top);
					const tile =
						tileWidth === ruinWallFrame.w && tileHeight === ruinWallFrame.h
							? ruinWall
							: await sharp(ruinWall)
									.extract({ left: 0, top: 0, width: tileWidth, height: tileHeight })
									.png()
									.toBuffer();
					blockerInputs.push({ input: tile, left, top });
				}
			}
		}
		inputs.push(...blockerInputs);
	}

	const props = map.interiorProps ?? [];
	if (props.length > 0) {
		const propSource = await readFile(interiorImagePath(interiorPropAsset.path, repositoryRoot));
		const propCache = new Map<string, Buffer>();
		const propInputs: { input: Buffer; left: number; top: number }[] = [];
		for (const prop of props) {
			const cacheKey = `${prop.frameName}:${prop.width}x${prop.height}`;
			let image = propCache.get(cacheKey);
			if (!image) {
				const frame = interiorPropAsset.frames[prop.frameName];
				image = await sharp(propSource)
					.extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h })
					.resize({ width: prop.width, height: prop.height })
					.png()
					.toBuffer();
				propCache.set(cacheKey, image);
			}
			propInputs.push({
				input: image,
				left: prop.x - prop.width / 2,
				top: prop.y - prop.height / 2
			});
		}
		inputs.push(...propInputs);
	}
	return sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 26, g: 31, b: 43, alpha: 1 }
		}
	})
		.composite(inputs)
		.png()
		.toBuffer();
}

async function renderLiveCharacterComposition(
	mapId: VillageInteriorMapId,
	base: Buffer,
	repositoryRoot: string,
	foreground?: Buffer
): Promise<Buffer> {
	const atlasPath = interiorImagePath(animationPackAsset.path, repositoryRoot);
	let atlas: Buffer;
	try {
		atlas = await readFile(atlasPath);
	} catch (error) {
		throw new Error(
			`${mapId} live-character composition requires animation atlas: ${animationPackAsset.path}`,
			{ cause: error }
		);
	}
	const heroAnimation = actorAnimationAssets.hero;
	const heroIdleFrameName = heroAnimation.clips.idle.frames[0]!;
	const heroIdleFrame = animationPackAsset.frames[heroIdleFrameName];
	const atlasMetadata = await sharp(atlas).metadata();
	assert(
		atlasMetadata.width !== undefined &&
			atlasMetadata.height !== undefined &&
			heroIdleFrame.x + heroIdleFrame.w <= atlasMetadata.width &&
			heroIdleFrame.y + heroIdleFrame.h <= atlasMetadata.height,
		`${mapId} hero idle frame is outside animation atlas: ${heroIdleFrameName}`
	);
	const hero = await sharp(atlas)
		.extract({
			left: heroIdleFrame.x,
			top: heroIdleFrame.y,
			width: heroIdleFrame.w,
			height: heroIdleFrame.h
		})
		.resize(heroAnimation.displaySize)
		.png()
		.toBuffer();
	const map = maps[mapId];
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	assert(map !== undefined, `Interior map is not registered: ${mapId}`);
	const source = buildVillageInteriorNavigationSource({ mapId, layout });
	const grid = map.navigationGrid ?? compileNavigationGrid(source);
	assert(isWalkable(grid, map.spawn.x, map.spawn.y), `${mapId} spawn is not walkable`);
	const points: Point[] = [{ x: map.spawn.x, y: map.spawn.y }];
	const interiorDoorCenters = Object.entries(layout.doors)
		.filter(([id]) => id !== 'exterior')
		.map(([, door]) => ({ x: door.x + door.width / 2, y: door.y + door.height / 2 }));
	assert(interiorDoorCenters.length > 0, `${mapId} has no interior door proof anchors`);
	const distanceToInteriorDoor = (point: Point) =>
		Math.min(...interiorDoorCenters.map((door) => Math.hypot(point.x - door.x, point.y - door.y)));
	for (const [roomId, room] of Object.entries(layout.rooms)) {
		const candidates: Point[] = [];
		for (let y = room.y + source.cellSizePx / 2; y < room.y + room.height; y += source.cellSizePx) {
			for (
				let x = room.x + source.cellSizePx / 2;
				x < room.x + room.width;
				x += source.cellSizePx
			) {
				if (isWalkable(grid, x, y)) candidates.push({ x, y });
			}
		}
		candidates.sort(
			(left, right) =>
				distanceToInteriorDoor(left) - distanceToInteriorDoor(right) ||
				left.y - right.y ||
				left.x - right.x
		);
		const point = candidates[0];
		assert(point !== undefined, `${mapId} room has no walkable proof point: ${roomId}`);
		points.push(point);
	}
	const heroPoints = mapId === 'guild-hall' || mapId === 'item-shop' ? [points[0]!] : points;

	const baseMetadata = await sharp(base).metadata();
	assert(
		baseMetadata.width !== undefined && baseMetadata.height !== undefined,
		`${mapId} painted base dimensions are unavailable`
	);
	const npcComposites: { input: Buffer; left: number; top: number }[] = [];
	if (
		mapId === 'guild-hall' ||
		mapId === 'item-shop' ||
		mapId === 'villager-house-1' ||
		mapId === 'villager-house-2'
	) {
		const npcPackPath = interiorImagePath(npcPackAsset.path, repositoryRoot);
		let npcAtlas: Buffer;
		try {
			npcAtlas = await readFile(npcPackPath);
		} catch (error) {
			throw new Error(
				`${mapId} live-character composition requires NPC atlas: ${npcPackAsset.path}`,
				{ cause: error }
			);
		}
		const npcAtlasMetadata = await sharp(npcAtlas).metadata();
		const npcDisplaySize = { width: 96, height: 87 } as const;
		for (const npc of [...(map.npcs ?? []), ...(map.ambientNpcs ?? [])]) {
			assert(
				npc.frameName in npcPackAsset.frames,
				`${mapId} live-character composition requires NPC-pack frame: ${npc.frameName}`
			);
			const frame = npcPackAsset.frames[npc.frameName as keyof typeof npcPackAsset.frames];
			assert(
				npcAtlasMetadata.width !== undefined &&
					npcAtlasMetadata.height !== undefined &&
					frame.x + frame.w <= npcAtlasMetadata.width &&
					frame.y + frame.h <= npcAtlasMetadata.height,
				`${mapId} NPC frame is outside NPC atlas: ${npc.frameName}`
			);
			const sprite = await sharp(npcAtlas)
				.extract({ left: frame.x, top: frame.y, width: frame.w, height: frame.h })
				.resize(npcDisplaySize)
				.png()
				.toBuffer();
			npcComposites.push({
				input: sprite,
				left: Math.round(npc.x - npcDisplaySize.width / 2),
				top: Math.round(npc.y - npcDisplaySize.height / 2)
			});
		}
	}
	return sharp(base)
		.composite([
			...heroPoints.map((point) => ({
				input: hero,
				left: Math.round(point.x - heroAnimation.displaySize.width / 2),
				top: Math.round(point.y - heroAnimation.displaySize.height / 2)
			})),
			...npcComposites,
			...(foreground ? [{ input: foreground, left: 0, top: 0 }] : [])
		])
		.png()
		.toBuffer();
}

async function renderInteriorPaintedArtifacts(
	mapId: VillageInteriorMapId,
	repositoryRoot = process.cwd()
): Promise<readonly RenderedArtifact[]> {
	const manifest = (await collectRegisteredVillageInteriorManifests(repositoryRoot)).find(
		(value) => value.mapId === mapId
	);
	if (!manifest) return [];
	await validateVillageInteriorManifest(manifest, repositoryRoot);
	const layoutView = interiorMapView(mapId);
	const base = await readFile(interiorImagePath(manifest.base.path, repositoryRoot));
	const foreground = manifest.foreground
		? await readFile(interiorImagePath(manifest.foreground.path, repositoryRoot))
		: undefined;
	const artifacts: RenderedArtifact[] = [
		{ path: `${mapId}/painted-base.png`, bytes: await sharp(base).png().toBuffer() },
		{
			path: `${mapId}/live-character-composition.png`,
			bytes: await renderLiveCharacterComposition(mapId, base, repositoryRoot, foreground)
		},
		{
			path: `${mapId}/collision-overlay.png`,
			bytes: await composeSvgOverPng(
				base,
				renderInteriorNavigationSvg(mapId, layoutView, 'both', false)
			)
		},
		{
			path: `${mapId}/live-actor-overlay.png`,
			bytes: await composeSvgOverPng(base, renderInteriorAnchorsSvg(mapId, layoutView, false))
		}
	];
	if (foreground) {
		artifacts.push({
			path: `${mapId}/foreground-alpha.png`,
			bytes: await sharp(foreground).ensureAlpha().extractChannel(3).png().toBuffer()
		});
	}
	const fallback = await renderLegacyInteriorPng(mapId, repositoryRoot);
	const metadata = await sharp(base).metadata();
	assert(
		metadata.width !== undefined && metadata.height !== undefined,
		`${mapId} base dimensions are unavailable`
	);
	const comparison = await sharp({
		create: {
			width: metadata.width * 2,
			height: metadata.height,
			channels: 4,
			background: { r: 20, g: 30, b: 32, alpha: 1 }
		}
	})
		.composite([
			{ input: base, left: 0, top: 0 },
			{ input: fallback, left: metadata.width, top: 0 }
		])
		.png()
		.toBuffer();
	artifacts.push({ path: `${mapId}/fallback-comparison.png`, bytes: comparison });
	return artifacts;
}

async function renderVillageInteriorLayoutReview(
	mapId: VillageInteriorMapId,
	repositoryRoot: string
): Promise<{
	readonly entry: CompleteWorldLayoutReviewEntry;
	readonly artifacts: readonly RenderedArtifact[];
}> {
	const map = maps[mapId];
	assert(map !== undefined, `Interior map is not registered: ${mapId}`);
	const layoutView = interiorMapView(mapId);
	const layout = VILLAGE_INTERIOR_LAYOUTS[mapId];
	const artifacts: RenderedArtifact[] = [];
	const core = [
		['coordinate-graybox.png', renderInteriorCoordinateSvg(mapId, layoutView)],
		['raw-collision-overlay.png', renderInteriorNavigationSvg(mapId, layoutView, 'raw')],
		[
			'player-centre-navigation-overlay.png',
			renderInteriorNavigationSvg(mapId, layoutView, 'player-centre')
		],
		['anchors.png', renderInteriorAnchorsSvg(mapId, layoutView)],
		['route-widths.png', renderInteriorRouteWidthSvg(mapId, layoutView)],
		['camera-640x360.png', renderInteriorCoordinateSvg(mapId, interiorCameraView(mapId, 640, 360))],
		[
			'camera-1280x720.png',
			renderInteriorCoordinateSvg(mapId, interiorCameraView(mapId, 1280, 720))
		]
	] as const;
	for (const [name, svg] of core)
		artifacts.push({ path: `${mapId}/${name}`, bytes: await encodeSvg(svg) });
	artifacts.push(...(await renderInteriorPaintedArtifacts(mapId, repositoryRoot)));
	const artifactInventory = [];
	for (const artifact of artifacts) {
		const metadata = await sharp(artifact.bytes).metadata();
		assert(
			metadata.width !== undefined && metadata.height !== undefined,
			`${artifact.path} dimensions are unavailable`
		);
		artifactInventory.push({
			path: artifact.path,
			width: metadata.width,
			height: metadata.height,
			sha256: sha256(artifact.bytes)
		});
	}
	const inventory: VillageInteriorLayoutReviewInventory = {
		version: 1,
		mapId,
		artifacts: artifactInventory
	};
	artifacts.push({
		path: `${mapId}/inventory.json`,
		bytes: Buffer.from(`${JSON.stringify(inventory, null, '\t')}\n`)
	});
	const imagePath = `${mapId}/coordinate-graybox.png`;
	const image = artifacts.find((artifact) => artifact.path === imagePath)!;
	return {
		entry: {
			mapId,
			disposition:
				COMPLETE_WORLD_LAYOUT_DECISIONS[mapId].action === 'preserve' ? 'preserved' : 'changed',
			reasonIds: [...COMPLETE_WORLD_LAYOUT_DECISIONS[mapId].reasonIds],
			worldDimensions: { width: layout.fullFloor.width, height: layout.fullFloor.height },
			reviewDimensions: { width: layoutView.outputWidth, height: layoutView.outputHeight },
			imagePath,
			imageSha256: sha256(image.bytes),
			counts: layerCountEntries(map)
		},
		artifacts
	};
}

function renderCrossingSvg(
	map: WorldMapDefinition,
	view: View,
	routeProofPaths: readonly MeadowRouteProofPath[]
): string {
	const context = contextFor(view);
	const parts = [
		renderMapSvg(map, view)
			.replace(/^<svg[^>]*>/, '')
			.replace(/<\/svg>$/, ''),
		renderRouteProof(routeProofPaths, context)
	];
	for (const segment of MEADOW_ENTRY_V2_RIVER_SEGMENTS) {
		const bounds = rectBounds(segment.rect);
		parts.push(
			svgRect(bounds, 'none', {
				stroke: COLORS.water,
				strokeWidth: 14
			}),
			labelSvg(
				segment.id,
				{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
				context
			)
		);
	}
	for (const [id, crossing] of Object.entries(MEADOW_ENTRY_V2_CROSSINGS)) {
		const bounds = rectBounds(crossing);
		const point = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
		parts.push(
			svgRect(bounds, 'none', {
				stroke: COLORS.route,
				strokeWidth: 18
			}),
			labelSvg(`${id} crossing`, point, context)
		);
	}
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${view.outputWidth}" height="${view.outputHeight}" viewBox="${view.left} ${view.top} ${view.width} ${view.height}" preserveAspectRatio="none">${parts.join('')}</svg>`;
}

async function encodeSvg(svg: string): Promise<Buffer> {
	assert(
		(svg.match(/<svg/g) ?? []).length === 1,
		`Expected one SVG root, found ${(svg.match(/<svg/g) ?? []).length}`
	);
	assert(
		(svg.match(/<\/svg>/g) ?? []).length === 1,
		`Expected one SVG close, found ${(svg.match(/<\/svg>/g) ?? []).length}`
	);
	const { data, info } = await sharp(Buffer.from(svg))
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	const png = await encodeCanonicalMeadowEntryPng(data, info.width, info.height);
	validateCanonicalPngChunks(png);
	return png;
}

function mapView(map: WorldMapDefinition): View {
	const width = map.width * TILE_SIZE;
	const height = map.height * TILE_SIZE;
	const dimensions = reviewDimensions(width, height);
	return {
		left: 0,
		top: 0,
		width,
		height,
		outputWidth: dimensions.width,
		outputHeight: dimensions.height
	};
}

function crossingView(): View {
	const width = CROSSING_CROP.right - CROSSING_CROP.left;
	const height = CROSSING_CROP.bottom - CROSSING_CROP.top;
	const dimensions = reviewDimensions(width, height, CROSSING_MAX_REVIEW_EDGE);
	return {
		left: CROSSING_CROP.left,
		top: CROSSING_CROP.top,
		width,
		height,
		outputWidth: dimensions.width,
		outputHeight: dimensions.height
	};
}

function crossingCounts(
	map: WorldMapDefinition,
	routeProofPaths: readonly MeadowRouteProofPath[]
): Readonly<Record<string, number>> {
	return layerCountEntries(map, {
		anchors: Object.keys(MEADOW_ROUTE_PROOF_ANCHORS).length,
		segments: routeProofPaths.length
	});
}

async function renderReview(): Promise<RenderedReview> {
	const artifacts: RenderedArtifact[] = [];
	const entries: CompleteWorldLayoutReviewEntry[] = [];
	const meadow = maps['meadow-entry'];
	const routeProofPaths = deriveMeadowRouteProofPaths(meadow);
	for (const mapId of COMPLETE_WORLD_MAP_IDS) {
		const map = maps[mapId];
		assert(map !== undefined, `Complete-world map is not registered: ${mapId}`);
		const view = mapView(map);
		const png = await encodeSvg(
			renderMapSvg(map, view, mapId === 'meadow-entry' ? routeProofPaths : undefined)
		);
		const imagePath = `${mapId}.png`;
		artifacts.push({ path: imagePath, bytes: png });
		const worldDimensions = { width: view.width, height: view.height };
		entries.push({
			mapId,
			disposition:
				COMPLETE_WORLD_LAYOUT_DECISIONS[mapId].action === 'preserve' ? 'preserved' : 'changed',
			reasonIds: [...COMPLETE_WORLD_LAYOUT_DECISIONS[mapId].reasonIds],
			worldDimensions,
			reviewDimensions: { width: view.outputWidth, height: view.outputHeight },
			imagePath,
			imageSha256: sha256(png),
			counts: layerCountEntries(
				map,
				mapId === 'meadow-entry'
					? {
							anchors: Object.keys(MEADOW_ROUTE_PROOF_ANCHORS).length,
							segments: routeProofPaths.length
						}
					: undefined
			)
		});
	}

	const view = crossingView();
	const crossingPng = await encodeSvg(renderCrossingSvg(meadow, view, routeProofPaths));
	const crossingReview: CompleteWorldLayoutCrossingReview = {
		imagePath: 'meadow-river-crossings.png',
		worldDimensions: { width: view.width, height: view.height },
		reviewDimensions: { width: view.outputWidth, height: view.outputHeight },
		crop: CROSSING_CROP,
		imageSha256: sha256(crossingPng),
		counts: crossingCounts(meadow, routeProofPaths),
		routeProofSegments: routeProofPaths.map(({ id, from, to }) => ({ id, from, to }))
	};
	artifacts.push({ path: crossingReview.imagePath, bytes: crossingPng });
	const inventory: CompleteWorldLayoutReviewInventory = {
		version: 1,
		entries,
		crossingReview
	};
	const inventoryBytes = Buffer.from(`${JSON.stringify(inventory, null, '\t')}\n`);
	artifacts.push({ path: 'inventory.json', bytes: inventoryBytes });
	return { entries, crossingReview, inventory, artifacts };
}

async function writeAtomic(path: string, bytes: Buffer): Promise<void> {
	const output = resolve(path);
	const temporary = `${output}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await mkdir(dirname(output), { recursive: true });
		await writeFile(temporary, bytes);
		await rename(temporary, output);
	} finally {
		await rm(temporary, { force: true });
	}
}

async function checkArtifacts(
	outputRoot: string,
	artifacts: readonly RenderedArtifact[],
	scopePrefix?: string
): Promise<void> {
	async function listFiles(root: string, prefix = ''): Promise<string[]> {
		const entries = await readdir(join(root, prefix), { withFileTypes: true });
		const files: string[] = [];
		for (const entry of entries) {
			const path = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) files.push(...(await listFiles(root, path)));
			else files.push(path);
		}
		return files;
	}

	let names: string[];
	try {
		names = (await listFiles(outputRoot, scopePrefix)).sort();
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			throw new Error(`Complete-world layout review output root is missing: ${outputRoot}`, {
				cause: error
			});
		}
		throw error;
	}
	const expectedNames = artifacts.map((artifact) => artifact.path).sort();
	assert(
		JSON.stringify(names) === JSON.stringify(expectedNames),
		`Complete-world layout review inventory files differ: expected=${expectedNames.join(',')} actual=${names.join(',')}`
	);
	for (const artifact of artifacts) {
		let existing: Buffer;
		try {
			existing = await readFile(join(outputRoot, artifact.path));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				throw new Error(`Complete-world layout review artifact is missing: ${artifact.path}`, {
					cause: error
				});
			}
			throw error;
		}
		assert(
			existing.equals(artifact.bytes),
			`Complete-world layout review artifact is stale: ${artifact.path}`
		);
	}
}

export async function renderCompleteWorldLayoutReview(input: {
	readonly outputRoot: string;
	readonly check: boolean;
	readonly map?: VillageInteriorMapId;
	readonly repositoryRoot?: string;
}): Promise<readonly CompleteWorldLayoutReviewEntry[]> {
	if (input.map) {
		const rendered = await renderVillageInteriorLayoutReview(
			input.map,
			input.repositoryRoot ?? process.cwd()
		);
		if (input.check) {
			await checkArtifacts(input.outputRoot, rendered.artifacts, input.map);
			return [rendered.entry];
		}
		for (const artifact of rendered.artifacts) {
			await writeAtomic(join(input.outputRoot, artifact.path), artifact.bytes);
		}
		return [rendered.entry];
	}
	const rendered = await renderReview();
	if (input.check) {
		await checkArtifacts(input.outputRoot, rendered.artifacts);
		return rendered.entries;
	}
	for (const artifact of rendered.artifacts) {
		await writeAtomic(join(input.outputRoot, artifact.path), artifact.bytes);
	}
	return rendered.entries;
}

export function parseCompleteWorldLayoutReviewArguments(args: readonly string[]): {
	readonly check: boolean;
	readonly outputRoot: string;
	readonly map?: VillageInteriorMapId;
} {
	let check = false;
	let outputRoot = DEFAULT_OUTPUT_ROOT;
	let map: VillageInteriorMapId | undefined;
	let outputRootProvided = false;
	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		if (argument === '--check') {
			assert(!check, 'Duplicate complete-world layout review argument: --check');
			check = true;
			continue;
		}
		if (argument === '--output-root') {
			const value = args[index + 1];
			assert(value !== undefined && !value.startsWith('--'), '--output-root requires a path');
			outputRoot = value;
			outputRootProvided = true;
			index += 1;
			continue;
		}
		if (argument === '--map') {
			assert(map === undefined, 'Duplicate complete-world layout review argument: --map');
			const value = args[index + 1];
			assert(
				value !== undefined &&
					Object.prototype.hasOwnProperty.call(VILLAGE_INTERIOR_LAYOUTS, value),
				'--map requires a VillageInteriorMapId'
			);
			map = value as VillageInteriorMapId;
			index += 1;
			continue;
		}
		throw new Error(`Unknown complete-world layout review argument: ${argument}`);
	}
	return map
		? { check, outputRoot: outputRootProvided ? outputRoot : DEFAULT_INTERIOR_OUTPUT_ROOT, map }
		: { check, outputRoot };
}

async function main(): Promise<void> {
	const parsed = parseCompleteWorldLayoutReviewArguments(process.argv.slice(2));
	const entries = await renderCompleteWorldLayoutReview(parsed);
	const inventoryBytes = await readFile(
		join(parsed.outputRoot, parsed.map ? parsed.map : '', 'inventory.json')
	);
	console.log(
		`${parsed.check ? 'Checked' : 'Rendered'} ${entries.length} ${parsed.map ? `${parsed.map} interior` : 'complete-world maps and meadow-river-crossings.png'}; inventorySha256=${sha256(inventoryBytes)}`
	);
}

if (import.meta.main) {
	await main().catch((error: unknown) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}
