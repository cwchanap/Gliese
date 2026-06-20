import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { decorRoles } from '$lib/game/content/maps/regions/decor-roles';
import { routeSceneDefinitions } from '$lib/game/content/maps/regions/route-scenes';
import { softMazeCorridors, softMazeRooms } from '$lib/game/content/maps/regions/rooms';

type Pt = { x: number; y: number };
type Rect = { id: string; x: number; y: number; width: number; height: number };

const REQUIRED_ROOM_IDS = [
	'village-plaza-room',
	'village-road-reststop-room',
	'crossroads-hub-room',
	'coast-fork-room',
	'coast-ferry-shrine-room',
	'coast-tidepool-room',
	'coast-jetty-vista-room',
	'mistfen-entry-room',
	'mistfen-east-pool-room',
	'mistfen-gate-room',
	'silverpine-lower-room',
	'silverpine-offering-grove-room',
	'silverpine-terrace-room',
	'wildwood-threshold-room',
	'wildwood-side-clearing-room',
	'wildwood-combat-room',
	'wildwood-cave-room'
] as const;

function pointInRect(point: Pt, rect: Rect): boolean {
	return (
		Math.abs(point.x - rect.x) <= rect.width / 2 && Math.abs(point.y - rect.y) <= rect.height / 2
	);
}

function distanceToRect(point: Pt, rect: Rect): number {
	const dx = Math.max(Math.abs(point.x - rect.x) - rect.width / 2, 0);
	const dy = Math.max(Math.abs(point.y - rect.y) - rect.height / 2, 0);
	return Math.hypot(dx, dy);
}

function segmentSamples(a: Pt, b: Pt, stepPx: number): Pt[] {
	const distance = Math.hypot(b.x - a.x, b.y - a.y);
	const steps = Math.max(1, Math.ceil(distance / stepPx));
	return Array.from({ length: steps + 1 }, (_, index) => {
		const t = index / steps;
		return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
	});
}

function pointSegmentDistance(point: Pt, a: Pt, b: Pt): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSquared = dx * dx + dy * dy;
	if (lengthSquared === 0) return Math.hypot(point.x - a.x, point.y - a.y);
	const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
	return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function distancePointToPolyline(point: Pt, route: Pt[]): number {
	return route
		.slice(0, -1)
		.reduce(
			(best, routePoint, index) =>
				Math.min(best, pointSegmentDistance(point, routePoint, route[index + 1])),
			Number.POSITIVE_INFINITY
		);
}

function collectEntityPoints(map: WorldMapDefinition): Map<string, Pt> {
	const points = new Map<string, Pt>();
	for (const item of [
		...(map.blockers ?? []),
		...(map.fences ?? []),
		...(map.landmarks ?? []),
		...(map.groundPatches ?? []),
		...(map.mapDecor ?? []),
		...(map.pickups ?? []),
		...(map.discoveries ?? []),
		...(map.ambientNpcs ?? []),
		...(map.encounters ?? [])
	]) {
		points.set(item.id, { x: item.x, y: item.y });
	}
	return points;
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

function corridorSamples(route: Pt[]): Array<{ point: Pt; direction: Pt }> {
	const samples: Array<{ point: Pt; direction: Pt }> = [];
	for (let index = 0; index < route.length - 1; index += 1) {
		const a = route[index];
		const b = route[index + 1];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		const direction =
			length === 0 ? { x: 1, y: 0 } : { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
		for (const point of segmentSamples(a, b, 180)) {
			samples.push({ point, direction });
		}
	}
	return samples;
}

function signedDistanceFromCenter(point: Pt, rect: Rect, direction: Pt): number {
	const normal = { x: -direction.y, y: direction.x };
	return (rect.x - point.x) * normal.x + (rect.y - point.y) * normal.y;
}

describe('soft-maze room and corridor manifest', () => {
	const entityPoints = collectEntityPoints(meadowEntryMap);
	const roomIds = new Set(softMazeRooms.map((room) => room.id));

	it('declares the required rooms without making any non-crossroads room the large hub', () => {
		expect(softMazeRooms.map((room) => room.id)).toEqual(
			expect.arrayContaining([...REQUIRED_ROOM_IDS])
		);
		expect(softMazeRooms.filter((room) => room.kind === 'hub').map((room) => room.id)).toEqual([
			'crossroads-hub-room'
		]);
		for (const room of softMazeRooms) {
			expect(room.routeIds.length, `${room.id} has no route ids`).toBeGreaterThan(0);
			for (const visibleId of room.requiredVisibleIds) {
				expect(
					entityPoints.has(visibleId),
					`${room.id} references missing visible id ${visibleId}`
				).toBe(true);
			}
			if (room.bounds.width >= 700 && room.bounds.height >= 700) {
				expect(room.id, `${room.id} is a large open room; Crossroads must be the only hub`).toBe(
					'crossroads-hub-room'
				);
			}
		}
	});

	it('connects known rooms with bounded corridor samples outside named rooms', () => {
		const solidRects = collectSolidRects(meadowEntryMap);

		for (const corridor of softMazeCorridors) {
			expect(roomIds.has(corridor.fromRoomId), `${corridor.id} has unknown from room`).toBe(true);
			expect(roomIds.has(corridor.toRoomId), `${corridor.id} has unknown to room`).toBe(true);
			expect(
				corridor.expectedBoundaryIds.length,
				`${corridor.id} has no boundary ids`
			).toBeGreaterThanOrEqual(2);

			const boundaryRects = corridor.expectedBoundaryIds.map((id) => {
				const rect = solidRects.get(id);
				expect(
					rect,
					`${corridor.id} boundary ${id} is missing or not collision-supported`
				).toBeDefined();
				return rect!;
			});

			for (const { point, direction } of corridorSamples(corridor.route)) {
				if (softMazeRooms.some((room) => pointInRect(point, room.bounds))) continue;

				const nearby = boundaryRects.filter(
					(rect) => distanceToRect(point, rect) <= (corridor.maxWalkableWidth ?? 640)
				);
				const left = nearby
					.map((rect) => signedDistanceFromCenter(point, rect, direction))
					.filter((distance) => distance < 0)
					.map(Math.abs);
				const right = nearby
					.map((rect) => signedDistanceFromCenter(point, rect, direction))
					.filter((distance) => distance > 0);
				expect(
					left.length,
					`${corridor.id} lacks left boundary near (${Math.round(point.x)},${Math.round(point.y)})`
				).toBeGreaterThan(0);
				expect(
					right.length,
					`${corridor.id} lacks right boundary near (${Math.round(point.x)},${Math.round(point.y)})`
				).toBeGreaterThan(0);
				expect(
					Math.min(...left) + Math.min(...right),
					`${corridor.id} is too wide near (${Math.round(point.x)},${Math.round(point.y)})`
				).toBeLessThanOrEqual(corridor.maxWalkableWidth ?? 640);
			}
		}
	});

	it('puts side-pocket payoffs inside side rooms and off the route centerline', () => {
		for (const room of softMazeRooms.filter((candidate) => candidate.kind === 'side-pocket')) {
			expect(room.payoffIds?.length ?? 0, `${room.id} needs a payoff`).toBeGreaterThan(0);
			for (const payoffId of room.payoffIds ?? []) {
				const payoff = entityPoints.get(payoffId);
				expect(payoff, `${room.id} missing payoff ${payoffId}`).toBeDefined();
				expect(pointInRect(payoff!, room.bounds), `${payoffId} is not inside ${room.id}`).toBe(
					true
				);

				const route = routeSceneDefinitions.find((definition) =>
					room.routeIds.includes(definition.id)
				);
				expect(route, `${room.id} missing route-scene definition`).toBeDefined();
				expect(
					distancePointToPolyline(payoff!, route!.mainRoute),
					`${payoffId} sits on ${route!.id}'s main route`
				).toBeGreaterThanOrEqual(160);
			}
		}
	});

	it('keeps gate rooms visibly story-motivated before interaction', () => {
		for (const room of softMazeRooms.filter((candidate) => candidate.kind === 'gate')) {
			expect(room.storyMotif, `${room.id} has no story motif`).toBeDefined();
			expect(
				room.requiredVisibleIds.length,
				`${room.id} needs visible gate cues`
			).toBeGreaterThanOrEqual(2);
			for (const visibleId of room.requiredVisibleIds) {
				const point = entityPoints.get(visibleId);
				expect(point, `${room.id} references missing gate cue ${visibleId}`).toBeDefined();
				expect(
					pointInRect(point!, room.bounds),
					`${room.id} gate cue ${visibleId} is outside the gate room`
				).toBe(true);
			}
		}
	});
});

describe('soft-maze route-scene contract', () => {
	it('gives every route a threshold beat and collision-supported boundary ids', () => {
		const solidRects = collectSolidRects(meadowEntryMap);
		for (const route of routeSceneDefinitions) {
			expect(
				route.beats.some((beat) => beat.purpose === 'threshold'),
				`${route.id} needs a threshold beat`
			).toBe(true);
			for (const beat of route.beats) {
				expect(
					beat.boundaryIds?.length ?? 0,
					`${route.id}:${beat.id} needs boundary ids`
				).toBeGreaterThan(0);
				for (const boundaryId of beat.boundaryIds ?? []) {
					expect(
						solidRects.has(boundaryId),
						`${route.id}:${beat.id} boundary ${boundaryId} is missing or not collision-supported`
					).toBe(true);
				}
			}
		}
	});
});

describe('decor role manifest', () => {
	const decorById = new Map((meadowEntryMap.mapDecor ?? []).map((decor) => [decor.id, decor]));
	const roleById = new Map(decorRoles.map((entry) => [entry.id, entry]));
	const routeById = new Map(routeSceneDefinitions.map((route) => [route.id, route]));
	const solidRects = collectSolidRects(meadowEntryMap);
	const entityPoints = collectEntityPoints(meadowEntryMap);
	const rewardIds = new Set(
		[...(meadowEntryMap.pickups ?? []), ...(meadowEntryMap.discoveries ?? [])].map(
			(item) => item.id
		)
	);

	it('assigns a role to every outdoor decor object', () => {
		for (const decor of meadowEntryMap.mapDecor ?? []) {
			expect(roleById.has(decor.id), `${decor.id} has no decor role`).toBe(true);
		}
		for (const role of decorRoles) {
			expect(decorById.has(role.id), `role ${role.id} points at missing decor`).toBe(true);
		}
	});

	it('keeps role semantics tied to real route, reward, collision, and motif support', () => {
		for (const entry of decorRoles) {
			const decor = decorById.get(entry.id);
			expect(decor, `${entry.id} missing decor`).toBeDefined();
			const route = entry.routeId ? routeById.get(entry.routeId) : undefined;
			if (entry.routeId) {
				expect(route, `${entry.id} references unknown route ${entry.routeId}`).toBeDefined();
			}

			if (entry.role === 'wall' || entry.role === 'block-shortcut') {
				const nearbySolid = [...solidRects.values()].some(
					(rect) => rect.id !== entry.id && distanceToRect(decor!, rect) <= 180
				);
				expect(
					Boolean(decor!.collision) || nearbySolid,
					`${entry.id} must have collision or nearby solid support`
				).toBe(true);
			}

			if (entry.role === 'threshold' && route) {
				const routeEnds = [route.mainRoute[0], route.mainRoute.at(-1)!];
				const thresholdPoints = route.beats
					.filter((beat) => beat.purpose === 'threshold')
					.map((beat) => beat.cameraPoint);
				expect(
					[...routeEnds, ...thresholdPoints].some(
						(point) => Math.hypot(point.x - decor!.x, point.y - decor!.y) <= 900
					),
					`${entry.id} threshold is not near a route entry`
				).toBe(true);
			}

			if (entry.role === 'breadcrumb' && route) {
				expect(
					distancePointToPolyline(decor!, route.mainRoute),
					`${entry.id} breadcrumb is not visible from its route`
				).toBeLessThanOrEqual(700);
			}

			if (entry.role === 'hide-reward') {
				const nearbyRewards = [...rewardIds].filter((id) => {
					const point = entityPoints.get(id);
					return point && Math.hypot(point.x - decor!.x, point.y - decor!.y) <= 420;
				});
				expect(nearbyRewards.length, `${entry.id} hides no nearby reward`).toBeGreaterThan(0);
			}

			if (entry.role === 'story-symbol') {
				expect(entry.storyMotif, `${entry.id} story-symbol role needs a motif`).toBeDefined();
			}
		}
	});
});
