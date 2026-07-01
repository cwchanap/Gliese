import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { villageDecorRoles } from './decor-roles';
import { villageCorridors, villageMainRoute, villageRooms } from './rooms';
import { spawnToCrossroadsRouteScene } from './route-scenes';

type Pt = { x: number; y: number };
type Rect = { id: string; x: number; y: number; width: number; height: number };

/**
 * Deterministic village-layout tests — validate the authored Sundrop Village
 * blueprint (see docs/superpowers/plans/2026-06-12-entry-map-enrichment.md).
 *
 * The village is a compact JRPG settlement, not a hedge-grid. These tests
 * enforce named rooms, off-route side rewards, path-texture-off navigation,
 * and no random decor.
 */

/**
 * Shortest distance from `point` to the finite line segment `a`→`b`.
 *
 * @param point - The point to measure from.
 * @param a - Segment start.
 * @param b - Segment end (if equal to `a`, falls back to distance from `point` to `a`).
 * @returns The minimum Euclidean distance from `point` to any spot on the segment.
 */
function pointSegmentDistance(point: Pt, a: Pt, b: Pt): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSquared = dx * dx + dy * dy;
	if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
	const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
	return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

/**
 * Shortest distance from `point` to a polyline (an ordered series of vertices
 * connected by segments). Returns `Infinity` for an empty/single-vertex route.
 *
 * @param point - The point to measure from.
 * @param route - Polyline vertices walked in order.
 * @returns The minimum distance from `point` to any segment of the route.
 */
function distancePointToPolyline(point: Pt, route: readonly Pt[]): number {
	return route
		.slice(0, -1)
		.reduce(
			(best, routePoint, index) =>
				Math.min(best, pointSegmentDistance(point, routePoint, route[index + 1])),
			Number.POSITIVE_INFINITY
		);
}

/**
 * Shortest distance from `point` to the boundary of an axis-aligned rect
 * (centered at `rect.x`/`rect.y`). Returns 0 when the point is inside the rect.
 *
 * @param point - The point to measure from.
 * @param rect - Axis-aligned rect described by its center and full width/height.
 * @returns The minimum distance from `point` to the rect edge (0 if inside).
 */
function distanceToRect(point: Pt, rect: Rect): number {
	const dx = Math.max(Math.abs(point.x - rect.x) - rect.width / 2, 0);
	const dy = Math.max(Math.abs(point.y - rect.y) - rect.height / 2, 0);
	return Math.hypot(dx, dy);
}

const expectedVillageRoomIds = [
	'village-home-yard-room',
	'village-well-plaza-room',
	'village-market-yard-room',
	'village-north-residences-room',
	'village-shrine-garden-room',
	'village-east-gate-room'
];

const expectedVillageCorridorIds = [
	'village-home-to-plaza',
	'village-plaza-to-market',
	'village-plaza-to-north-residences',
	'village-plaza-to-shrine',
	'village-plaza-to-east-gate',
	'village-east-gate-to-crossroads-road'
];

const expectedSpawnToCrossroadsBeatIds = [
	'home-yard-origin',
	'well-plaza-choice',
	'east-gate-threshold',
	'crossroads-road-breadcrumb'
];

const expectedVillageDecorRoles = [
	'anchor',
	'crossroads-breadcrumb',
	'dead-end-frame',
	'exit-threshold',
	'field-background',
	'guild-threshold',
	'hide-reward',
	'market-identity',
	'market-threshold',
	'north-threshold',
	'plaza-frame',
	'shrine-symbol'
];

const removedVillageManifestIds = new Set([
	'village-lane-west-ring',
	'village-lane-north-ring',
	'village-lane-east-ring',
	'village-lane-south-ring',
	'village-lane-w-spoke',
	'village-lane-e-spoke',
	'village-lane-s-spoke'
]);

function collectVillageManifestIds(): string[] {
	return [
		...villageRooms.map((room) => room.id),
		...villageCorridors.flatMap((corridor) => [
			corridor.id,
			corridor.fromRoomId,
			corridor.toRoomId
		]),
		spawnToCrossroadsRouteScene.id,
		...spawnToCrossroadsRouteScene.beats.flatMap((beat) => [
			beat.id,
			beat.roomId || '',
			...(beat.boundaryIds || [])
		]),
		...Object.keys(villageDecorRoles)
	].filter((id) => id.length > 0);
}

describe('village deterministic layout', () => {
	const map: WorldMapDefinition = meadowEntryMap;

	describe('authoring manifests', () => {
		it('exports the deterministic HPA-112 room ids', () => {
			expect(villageRooms.map((room) => room.id)).toEqual(expectedVillageRoomIds);
		});

		it('exports the deterministic HPA-112 corridor ids', () => {
			expect(villageCorridors.map((corridor) => corridor.id)).toEqual(expectedVillageCorridorIds);
		});

		it('exports the spawn-to-crossroads route-scene beats', () => {
			expect(spawnToCrossroadsRouteScene.id).toBe('spawn-to-crossroads');
			expect(spawnToCrossroadsRouteScene.beats.map((beat) => beat.id)).toEqual(
				expectedSpawnToCrossroadsBeatIds
			);
		});

		it('keeps decor roles inside the HPA-112 role set', () => {
			expect([...new Set(Object.values(villageDecorRoles))].sort()).toEqual(
				expectedVillageDecorRoles
			);
		});

		it('does not reference removed micro-hedges or ring-spoke ids', () => {
			const manifestIds = collectVillageManifestIds();
			expect(manifestIds.filter((id) => /^(vp|vn|vw|ve|vs)-/.test(id))).toEqual([]);
			expect(manifestIds.filter((id) => removedVillageManifestIds.has(id))).toEqual([]);
		});
	});

	describe('named rooms exist', () => {
		const groundPatches = map.groundPatches ?? [];
		const landmarks = map.landmarks ?? [];
		const pickups = map.pickups ?? [];
		const decor = map.mapDecor ?? [];
		const ambientNpcs = map.ambientNpcs ?? [];

		it.each(villageRooms)('$id has a ground patch, visual cue, and landmark or payoff', (room) => {
			const visualCues = [...landmarks, ...decor, ...ambientNpcs];
			const payoffs = [...pickups, ...(map.transitions ?? [])];
			// Anchor decor (gate arch, fountain) are spatial anchors equivalent to landmarks
			const anchorDecor = decor.filter((d) => d.id in villageDecorRoles);

			// Ground patch within radius
			const hasGround = groundPatches.some(
				(patch) => Math.hypot(patch.x - room.center.x, patch.y - room.center.y) <= room.radius
			);
			expect(hasGround, `${room.id}: no ground patch within ${room.radius}px`).toBe(true);

			// Visual cue within radius
			const hasCue = visualCues.some(
				(cue) => Math.hypot(cue.x - room.center.x, cue.y - room.center.y) <= room.radius
			);
			expect(hasCue, `${room.id}: no visual cue within ${room.radius}px`).toBe(true);

			// Landmark, payoff, exit, or anchor decor within radius
			const hasAnchor =
				landmarks.some(
					(lm) => Math.hypot(lm.x - room.center.x, lm.y - room.center.y) <= room.radius
				) ||
				payoffs.some((p) => Math.hypot(p.x - room.center.x, p.y - room.center.y) <= room.radius) ||
				anchorDecor.some(
					(d) => Math.hypot(d.x - room.center.x, d.y - room.center.y) <= room.radius
				);
			expect(
				hasAnchor,
				`${room.id}: no landmark, payoff, exit, or anchor within ${room.radius}px`
			).toBe(true);
		});
	});

	describe('side rewards are off the main route', () => {
		const villageCaches = (map.pickups ?? []).filter((p) => p.id.startsWith('village-'));

		it.each(villageCaches)('$id is at least 160px from the main route', (cache) => {
			expect(
				distancePointToPolyline({ x: cache.x, y: cache.y }, villageMainRoute)
			).toBeGreaterThanOrEqual(160);
		});
	});

	describe('path-texture-off navigation', () => {
		// Ignore ground patches; use only solids (blockers, landmarks, fences,
		// colliding decor) to assert the main route has visible boundaries.
		const solids: Rect[] = [
			...(map.blockers ?? []),
			...(map.fences ?? []),
			...(map.landmarks ?? []),
			...(map.mapDecor ?? []).filter((d) => d.collision).map((d) => ({ ...d.collision!, id: d.id }))
		];

		it('has a visible boundary within 320px at each main-route sample', () => {
			const maxGap = 320;
			const samples: Pt[] = [];
			for (let i = 0; i < villageMainRoute.length - 1; i++) {
				const a = villageMainRoute[i];
				const b = villageMainRoute[i + 1];
				const dist = Math.hypot(b.x - a.x, b.y - a.y);
				const steps = Math.max(1, Math.ceil(dist / 160));
				for (let s = 0; s <= steps; s++) {
					samples.push({
						x: a.x + ((b.x - a.x) * s) / steps,
						y: a.y + ((b.y - a.y) * s) / steps
					});
				}
			}

			for (const sample of samples) {
				const hasBoundary = solids.some((rect) => distanceToRect(sample, rect) <= maxGap);
				expect(
					hasBoundary,
					`no boundary within ${maxGap}px of route sample (${Math.round(sample.x)},${Math.round(sample.y)})`
				).toBe(true);
			}
		});
	});

	describe('no random decor', () => {
		it('every village decor object has an assigned role', () => {
			const villageDecor = (map.mapDecor ?? []).filter((d) => d.id.startsWith('village-'));
			for (const decor of villageDecor) {
				expect(
					decor.id in villageDecorRoles,
					`${decor.id} has no assigned village decor role`
				).toBe(true);
			}
		});
	});
});
