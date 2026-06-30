import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';

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

const villageRooms: Array<{ id: string; center: Pt; radius: number }> = [
	{ id: 'home-yard', center: { x: 700, y: 5_585 }, radius: 260 },
	{ id: 'well-plaza', center: { x: 1_000, y: 5_160 }, radius: 320 },
	{ id: 'market-lane', center: { x: 650, y: 5_045 }, radius: 320 },
	{ id: 'north-residences', center: { x: 1_050, y: 4_860 }, radius: 420 },
	{ id: 'shrine-garden', center: { x: 1_200, y: 5_660 }, radius: 340 },
	{ id: 'east-gate', center: { x: 1_660, y: 4_430 }, radius: 260 }
];

const villageMainRoute: Pt[] = [
	{ x: 700, y: 5_600 },
	{ x: 780, y: 5_390 },
	{ x: 1_000, y: 5_160 },
	{ x: 1_460, y: 4_900 },
	{ x: 1_660, y: 4_430 },
	{ x: 2_120, y: 4_440 }
];

const villageDecorRoles: Record<string, string> = {
	'village-plaza-fountain': 'anchor',
	'village-hanging-lantern': 'plaza-frame',
	'village-plaza-flowers-west': 'plaza-frame',
	'village-plaza-flowers-east': 'plaza-frame',
	'village-market-stall': 'market-identity',
	'village-market-banner': 'market-threshold',
	'village-field-scarecrow': 'field-background',
	'village-blacksmith-topiary': 'dead-end-frame',
	'village-north-lantern-west': 'north-threshold',
	'village-north-lantern-east': 'guild-threshold',
	'village-shrine-offering': 'shrine-symbol',
	'village-stone-lantern': 'shrine-symbol',
	'village-shrine-maple': 'hide-reward',
	'village-gate-arch': 'exit-threshold',
	'village-gate-lantern-a': 'exit-threshold',
	'village-gate-lantern-b': 'exit-threshold',
	'village-corridor-waymarker': 'crossroads-breadcrumb'
};

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
function distancePointToPolyline(point: Pt, route: Pt[]): number {
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

describe('village deterministic layout', () => {
	const map: WorldMapDefinition = meadowEntryMap;

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
