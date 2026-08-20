import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { MEADOW_ENTRY_V2_RIVER_SEGMENTS } from '$lib/game/content/maps/layouts/meadow-entry-v2';
import { toMapRect } from '$lib/game/content/maps/layouts/layout-rects';
import { PLAYER_COLLISION_RADIUS } from '$lib/game/core/collision';
import {
	collectLandmarkRects,
	collectStrictCollisionRects,
	isInsideAnyCollisionRect
} from '$lib/game/save/save-state';

type Pt = { x: number; y: number };
type Rect = { id: string; x: number; y: number; width: number; height: number };

function pointInRect(point: Pt, rect: Rect): boolean {
	return (
		Math.abs(point.x - rect.x) <= rect.width / 2 && Math.abs(point.y - rect.y) <= rect.height / 2
	);
}

function segmentSamples(a: Pt, b: Pt, stepPx: number): Pt[] {
	const distance = Math.hypot(b.x - a.x, b.y - a.y);
	const steps = Math.max(1, Math.ceil(distance / stepPx));
	return Array.from({ length: steps + 1 }, (_, index) => {
		const t = index / steps;
		return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
	});
}

function collectSolidRects(map: WorldMapDefinition): Map<string, Rect> {
	const solids = new Map<string, Rect>();
	for (const blocker of map.blockers ?? []) solids.set(blocker.id, blocker);
	for (const fence of map.fences ?? []) solids.set(fence.id, fence);
	for (const landmark of map.landmarks ?? []) solids.set(landmark.id, landmark);
	for (const decor of map.mapDecor ?? []) {
		if (decor.collision) solids.set(decor.id, decor.collision);
	}
	return solids;
}

describe('shortcut closure', () => {
	const solids = [...collectSolidRects(meadowEntryMap).values()];

	// Each entry is a forbidden straight-line shortcut between two major rooms.
	// The sample line must cross at least one solid (blocker/fence/landmark/
	// colliding decor) so the player is forced onto the authored corridor
	// instead of cutting diagonally across open field — the plan's
	// "path-texture-off" requirement expressed as a geometric invariant.
	// Endpoints are room centers (the walkable room interior), NOT gate sprites:
	// pointing at gate centers put both endpoints inside the gate landmark
	// solids, which let the old assertion pass on an endpoint instead of an
	// intervening wall (silverpine-to-mistfen was sealed by silverpine-terrace-
	// boundary, which the gate-center line never crossed).
	const forbiddenShortcuts: Array<{ id: string; from: Pt; to: Pt }> = [
		{ id: 'crossroads-to-witchwood-gate', from: { x: 3_500, y: 4_000 }, to: { x: 1_200, y: 620 } },
		{
			id: 'crossroads-to-whispering-cave',
			from: { x: 3_500, y: 4_000 },
			to: { x: 5_960, y: 1_800 }
		},
		// silverpine terrace room → mistfen basin room (crosses silverpine-terrace-boundary).
		{ id: 'silverpine-to-mistfen', from: { x: 3_000, y: 760 }, to: { x: 1_250, y: 1_750 } }
	];

	it('blocks every forbidden inter-room diagonal with at least one solid', () => {
		for (const shortcut of forbiddenShortcuts) {
			// Solids the endpoints themselves sit inside must not count as the
			// blocker — otherwise a route that merely starts or ends against a
			// landmark wall passes without any intervening obstacle between the
			// two rooms, which is the diagonal this invariant is meant to seal.
			const endpointSolidIds = new Set(
				solids
					.filter((rect) => pointInRect(shortcut.from, rect) || pointInRect(shortcut.to, rect))
					.map((rect) => rect.id)
			);
			const samples = segmentSamples(shortcut.from, shortcut.to, 48);
			const blocked = samples.some((sample) =>
				solids.some((rect) => pointInRect(sample, rect) && !endpointSolidIds.has(rect.id))
			);
			expect(
				blocked,
				`${shortcut.id} diagonal is open field — no solid crosses the straight line between the rooms`
			).toBe(true);
		}
	});
});

describe('Meadow watershed route network', () => {
	const MEADOW_LAYOUT_ROUTE_ANCHORS = {
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

	const OPTIONAL_ROUTE_POINTS = {
		mistfen: { x: 2400, y: 2700 },
		silverpine: { x: 3260, y: 720 },
		wildwood: { x: 4700, y: 3650 }
	} as const;

	const navigationStep = 16;
	const meadowSize = meadowEntryMap.width * 32;
	const composedCollision = [
		...collectStrictCollisionRects(meadowEntryMap),
		...collectLandmarkRects(meadowEntryMap)
	];
	const riverBlockers = MEADOW_ENTRY_V2_RIVER_SEGMENTS.map(({ id, rect }) =>
		toMapRect(`${id}-collision`, rect)
	);

	function isWalkable(point: Pt): boolean {
		return (
			point.x >= PLAYER_COLLISION_RADIUS &&
			point.y >= PLAYER_COLLISION_RADIUS &&
			point.x <= meadowSize - PLAYER_COLLISION_RADIUS &&
			point.y <= meadowSize - PLAYER_COLLISION_RADIUS &&
			!isInsideAnyCollisionRect(point.x, point.y, composedCollision, PLAYER_COLLISION_RADIUS)
		);
	}

	function gridKey(point: Pt): string {
		return `${point.x},${point.y}`;
	}

	function nearestWalkableGridPoint(anchor: Pt): Pt | null {
		let nearestPoint: Pt | null = null;
		let nearestDistance = Number.POSITIVE_INFINITY;
		for (let radius = 0; radius <= 192; radius += navigationStep) {
			for (let dx = -radius; dx <= radius; dx += navigationStep) {
				for (let dy = -radius; dy <= radius; dy += navigationStep) {
					const point = {
						x: Math.round((anchor.x + dx) / navigationStep) * navigationStep,
						y: Math.round((anchor.y + dy) / navigationStep) * navigationStep
					};
					if (!isWalkable(point)) continue;
					const distance = Math.hypot(point.x - anchor.x, point.y - anchor.y);
					if (nearestPoint === null || distance < nearestDistance) {
						nearestPoint = point;
						nearestDistance = distance;
					}
				}
			}
			if (nearestPoint !== null) return nearestPoint;
		}
		return null;
	}

	function findRoute(from: Pt, to: Pt): Pt[] | null {
		const start = nearestWalkableGridPoint(from);
		const goal = nearestWalkableGridPoint(to);
		if (!start || !goal) return null;

		const queue: Pt[] = [start];
		const parents = new Map<string, string | null>([[gridKey(start), null]]);
		while (queue.length > 0) {
			const current = queue.shift()!;
			if (gridKey(current) === gridKey(goal)) {
				const path: Pt[] = [];
				let key: string | null = gridKey(current);
				while (key !== null) {
					const [x, y] = key.split(',').map(Number);
					path.push({ x, y });
					key = parents.get(key) ?? null;
				}
				return path.reverse();
			}

			for (const [dx, dy] of [
				[navigationStep, 0],
				[-navigationStep, 0],
				[0, navigationStep],
				[0, -navigationStep]
			]) {
				const next = { x: current.x + dx, y: current.y + dy };
				const key = gridKey(next);
				if (parents.has(key) || !isWalkable(next)) continue;
				parents.set(key, gridKey(current));
				queue.push(next);
			}
		}
		return null;
	}

	it('connects the critical route anchors through composed collision', () => {
		const routes = [
			['Hero House → village bridge west', 'heroHouse', 'villageBridgeWest'],
			['village bridge west → east', 'villageBridgeWest', 'villageBridgeEast'],
			['village bridge east → Crossroads', 'villageBridgeEast', 'crossroads'],
			['Crossroads → Mistfen', 'crossroads', 'mistfen'],
			['Crossroads → Silverpine', 'crossroads', 'silverpine'],
			['Crossroads → Wildwood', 'crossroads', 'wildwood'],
			['Wildwood → Whispering Cave', 'wildwood', 'cave'],
			['Crossroads → Coast', 'crossroads', 'coast'],
			['Coast → Ferry', 'coast', 'ferry']
		] as const;

		for (const [label, from, to] of routes) {
			const path = findRoute(MEADOW_LAYOUT_ROUTE_ANCHORS[from], MEADOW_LAYOUT_ROUTE_ANCHORS[to]);
			expect(path, `${label} has no walkable route`).not.toBeNull();
			expect(path?.length ?? 0, `${label} must contain more than its endpoint`).toBeGreaterThan(1);
		}
	});

	it('leaves and rejoins the main route through each destination loop', () => {
		const loops = [
			['Mistfen', 'mistfen', 'mistfen'],
			['Silverpine', 'silverpine', 'silverpine'],
			['Wildwood', 'wildwood', 'wildwood']
		] as const;

		for (const [label, main, rejoin] of loops) {
			const detour = OPTIONAL_ROUTE_POINTS[main];
			const outbound = findRoute(MEADOW_LAYOUT_ROUTE_ANCHORS[main], detour);
			const inbound = findRoute(detour, MEADOW_LAYOUT_ROUTE_ANCHORS[rejoin]);
			expect(outbound, `${label} optional loop cannot leave the main route`).not.toBeNull();
			expect(inbound, `${label} optional loop cannot rejoin the main route`).not.toBeNull();
			expect(outbound?.length ?? 0, `${label} loop has no detour`).toBeGreaterThan(2);
			expect(inbound?.length ?? 0, `${label} loop has no return`).toBeGreaterThan(2);
		}
	});

	it('blocks direct crossings outside each authored bridge or ferry gap', () => {
		const forbiddenCrossings = [
			{
				id: 'silverpine-outside-bridge',
				from: { x: 2800, y: 2200 },
				to: { x: 3600, y: 2200 }
			},
			{
				id: 'mistfen-outside-bridge',
				from: { x: 2400, y: 3400 },
				to: { x: 3840, y: 3400 }
			},
			{
				id: 'sundrop-outside-bridge',
				from: { x: 2400, y: 4300 },
				to: { x: 3600, y: 4300 }
			},
			{
				id: 'ferry-outside-approach',
				from: { x: 3400, y: 5200 },
				to: { x: 3400, y: 5600 }
			}
		];

		for (const crossing of forbiddenCrossings) {
			const blocked = segmentSamples(crossing.from, crossing.to, navigationStep).some((point) =>
				isInsideAnyCollisionRect(point.x, point.y, riverBlockers, PLAYER_COLLISION_RADIUS)
			);
			expect(blocked, `${crossing.id} is an unblocked direct water crossing`).toBe(true);
		}
	});
});
