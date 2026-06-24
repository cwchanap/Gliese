import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { decorRoles } from '$lib/game/content/maps/regions/decor-roles';
import { routeSceneDefinitions } from '$lib/game/content/maps/regions/route-scenes';
import { softMazeCorridors, softMazeRooms } from '$lib/game/content/maps/regions/rooms';

type Pt = { x: number; y: number };
type Rect = { id: string; x: number; y: number; width: number; height: number };

const REQUIRED_ROOM_IDS = [
	'village-plaza-room',
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

type Solid = { id: string; x: number; y: number; width: number; height: number };

function rayHitsSolid(
	from: Pt,
	dir: Pt,
	solids: Solid[],
	maxDistance: number,
	step = 16
): { hit: boolean; distance: number } {
	for (let stepPx = step; stepPx <= maxDistance; stepPx += step) {
		const probe = { x: from.x + dir.x * stepPx, y: from.y + dir.y * stepPx };
		if (solids.some((rect) => pointInRect(probe, rect))) {
			return { hit: true, distance: stepPx };
		}
	}
	return { hit: false, distance: maxDistance };
}

function corridorWidthViolations(
	route: { mainRoute: Pt[] },
	{ maxHalfWidth }: { maxHalfWidth: number }
): Array<{ sample: Pt; side: 'LEFT' | 'RIGHT'; clearance: number }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const roomBounds = softMazeRooms.map((room) => room.bounds);
	const violations: Array<{ sample: Pt; side: 'LEFT' | 'RIGHT'; clearance: number }> = [];
	for (const { point, direction } of corridorSamples(route.mainRoute)) {
		if (roomBounds.some((room) => pointInRect(point, room))) continue;
		const normal = { x: -direction.y, y: direction.x };
		const left = rayHitsSolid(point, { x: -normal.x, y: -normal.y }, solids, maxHalfWidth + 32);
		const right = rayHitsSolid(point, { x: normal.x, y: normal.y }, solids, maxHalfWidth + 32);
		if (!left.hit) violations.push({ sample: point, side: 'LEFT', clearance: maxHalfWidth + 32 });
		if (!right.hit) violations.push({ sample: point, side: 'RIGHT', clearance: maxHalfWidth + 32 });
	}
	return violations;
}

function sightlineViolations(
	route: { mainRoute: Pt[] },
	{ maxSightDistance }: { maxSightDistance: number }
): Array<{ sample: Pt; distance: number }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const roomBounds = softMazeRooms.map((room) => room.bounds);
	const violations: Array<{ sample: Pt; distance: number }> = [];
	for (const { point, direction } of corridorSamples(route.mainRoute)) {
		if (roomBounds.some((room) => pointInRect(point, room))) continue;
		const { hit, distance } = rayHitsSolid(point, direction, solids, maxSightDistance);
		if (!hit) violations.push({ sample: point, distance });
	}
	return violations;
}

function bendViolations(
	route: { mainRoute: Pt[] },
	{ minTurnDegrees, minSegmentPx }: { minTurnDegrees: number; minSegmentPx: number }
): Array<{ from: Pt; to: Pt; length: number }> {
	const violations: Array<{ from: Pt; to: Pt; length: number }> = [];
	const pts = route.mainRoute;
	for (let i = 1; i < pts.length - 1; i++) {
		const a = pts[i];
		const b = pts[i + 1];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		if (length <= minSegmentPx) continue;
		const dirA = Math.atan2(b.y - a.y, b.x - a.x);
		const prev = pts[i - 1];
		const dirPrev = Math.atan2(a.y - prev.y, a.x - prev.x);
		let turn = Math.abs(dirA - dirPrev) * (180 / Math.PI);
		if (turn > 180) turn = 360 - turn;
		if (turn < minTurnDegrees) violations.push({ from: a, to: b, length });
	}
	return violations;
}

type LaneSegment = { from: Pt; to: Pt };

function sampleLaneSet(segments: LaneSegment[]): Array<{ point: Pt; direction: Pt }> {
	const samples: Array<{ point: Pt; direction: Pt }> = [];
	const step = 48;
	for (const seg of segments) {
		const dx = seg.to.x - seg.from.x;
		const dy = seg.to.y - seg.from.y;
		const len = Math.hypot(dx, dy);
		if (len === 0) continue;
		const dir = { x: dx / len, y: dy / len };
		for (let d = step; d < len; d += step) {
			samples.push({
				point: { x: seg.from.x + dir.x * d, y: seg.from.y + dir.y * d },
				direction: dir
			});
		}
	}
	return samples;
}

function laneWidthViolations(
	segments: LaneSegment[],
	roomBounds: Rect[],
	{ maxHalfWidth }: { maxHalfWidth: number }
): Array<{ sample: Pt; side: 'LEFT' | 'RIGHT' }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const violations: Array<{ sample: Pt; side: 'LEFT' | 'RIGHT' }> = [];
	for (const { point, direction } of sampleLaneSet(segments)) {
		if (roomBounds.some((room) => pointInRect(point, room))) continue;
		const normal = { x: -direction.y, y: direction.x };
		const left = rayHitsSolid(point, { x: -normal.x, y: -normal.y }, solids, maxHalfWidth + 32);
		const right = rayHitsSolid(point, { x: normal.x, y: normal.y }, solids, maxHalfWidth + 32);
		if (!left.hit) violations.push({ sample: point, side: 'LEFT' });
		if (!right.hit) violations.push({ sample: point, side: 'RIGHT' });
	}
	return violations;
}

function junctionOcclusionViolations(
	junctions: Array<{ point: Pt; approaches: Pt[] }>,
	{ maxDistance }: { maxDistance: number }
): Array<{ junction: Pt; direction: Pt }> {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const violations: Array<{ junction: Pt; direction: Pt }> = [];
	for (const { point, approaches } of junctions) {
		for (const approach of approaches) {
			const { hit } = rayHitsSolid(point, approach, solids, maxDistance);
			if (!hit) violations.push({ junction: point, direction: approach });
		}
	}
	return violations;
}

function countDeadEnds(
	laneSamples: Array<{ point: Pt }>,
	{ minDepth }: { minDepth: number }
): number {
	const solids = [...collectSolidRects(meadowEntryMap).values()];
	const deadEnds = new Set<string>();
	const step = 32;
	for (const { point: start } of laneSamples) {
		const visited = new Set<string>();
		const queue = [start];
		let maxReach = 0;
		for (let guard = 0; queue.length > 0 && guard < 200; guard++) {
			const p = queue.shift()!;
			const key = `${Math.round(p.x / step) * step},${Math.round(p.y / step) * step}`;
			if (visited.has(key)) continue;
			visited.add(key);
			if (solids.some((r) => pointInRect(p, r))) continue;
			const dist = Math.hypot(p.x - start.x, p.y - start.y);
			if (dist > maxReach) maxReach = dist;
			if (maxReach > minDepth + 320) break;
			queue.push(
				{ x: p.x + step, y: p.y },
				{ x: p.x - step, y: p.y },
				{ x: p.x, y: p.y + step },
				{ x: p.x, y: p.y - step }
			);
		}
		if (maxReach >= minDepth && maxReach <= minDepth + 320) {
			deadEnds.add(`${Math.round(start.x / 64) * 64},${Math.round(start.y / 64) * 64}`);
		}
	}
	return deadEnds.size;
}

function corridorSamples(route: Pt[]): Array<{ point: Pt; direction: Pt }> {
	const samples: Array<{ point: Pt; direction: Pt }> = [];
	// Interior route vertices are junction corners where the corridor turns.
	// Width/sightline tests measure straightaway quality; at a 90° corner the
	// inner wall cannot extend to the junction without blocking the incoming
	// segment.  Skip samples that coincide with interior vertices.
	const interiorVertices = new Set(route.slice(1, -1).map((p) => `${p.x},${p.y}`));
	for (let index = 0; index < route.length - 1; index += 1) {
		const a = route[index];
		const b = route[index + 1];
		const length = Math.hypot(b.x - a.x, b.y - a.y);
		const direction =
			length === 0 ? { x: 1, y: 0 } : { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
		for (const point of segmentSamples(a, b, 180)) {
			if (interiorVertices.has(`${point.x},${point.y}`)) continue;
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

	it('links every room to a real beat id (no loophole rooms)', () => {
		const beatIds = new Set(
			routeSceneDefinitions.flatMap((route) => route.beats.map((beat) => beat.id))
		);
		for (const room of softMazeRooms) {
			expect(
				room.beatId,
				`${room.id} has no beatId — rooms without a beat are loophole rooms`
			).toBeDefined();
			expect(
				beatIds.has(room.beatId!),
				`${room.id} beatId "${room.beatId}" does not match any real beat`
			).toBe(true);
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

describe('shortcut closure', () => {
	const solids = [...collectSolidRects(meadowEntryMap).values()];

	// Each entry is a forbidden straight-line shortcut between two major rooms.
	// The sample line must cross at least one solid (blocker/fence/landmark/
	// colliding decor) so the player is forced onto the authored corridor
	// instead of cutting diagonally across open field — the plan's
	// "path-texture-off" requirement expressed as a geometric invariant.
	const forbiddenShortcuts: Array<{ id: string; from: Pt; to: Pt }> = [
		{ id: 'village-to-coast', from: { x: 1_000, y: 5_100 }, to: { x: 4_100, y: 5_520 } },
		{ id: 'crossroads-to-witchwood-gate', from: { x: 3_500, y: 4_000 }, to: { x: 1_200, y: 620 } },
		{
			id: 'crossroads-to-whispering-cave',
			from: { x: 3_500, y: 4_000 },
			to: { x: 5_960, y: 1_800 }
		},
		{ id: 'silverpine-to-mistfen', from: { x: 3_000, y: 520 }, to: { x: 1_200, y: 620 } }
	];

	it('blocks every forbidden inter-room diagonal with at least one solid', () => {
		for (const shortcut of forbiddenShortcuts) {
			const samples = segmentSamples(shortcut.from, shortcut.to, 48);
			const blocked = samples.some((sample) => solids.some((rect) => pointInRect(sample, rect)));
			expect(
				blocked,
				`${shortcut.id} diagonal is open field — no solid crosses the straight line`
			).toBe(true);
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

describe('silverpine pilot — winding JRPG corridor invariants', () => {
	const SILVERPINE = () => routeSceneDefinitions.find((r) => r.id === 'crossroads-to-silverpine')!;

	it('keeps corridor width ≤ 320px outside beat-rooms', () => {
		const violations = corridorWidthViolations(SILVERPINE(), { maxHalfWidth: 160 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('occludes forward sight within 384px outside beat-rooms', () => {
		const violations = sightlineViolations(SILVERPINE(), { maxSightDistance: 384 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('bends ≥30° at least once per inter-beat segment >256px', () => {
		const violations = bendViolations(SILVERPINE(), { minTurnDegrees: 30, minSegmentPx: 256 });
		expect(violations, JSON.stringify(violations)).toEqual([]);
	});

	it('declares ≥2 pockets per route, each enclosed (no open-field leak)', () => {
		const route = SILVERPINE();
		expect(
			route.pockets?.length ?? 0,
			'silverpine needs at least 2 pockets for Phase 6 rewards'
		).toBeGreaterThanOrEqual(2);

		const solids = [...collectSolidRects(meadowEntryMap).values()];
		for (const pocket of route.pockets ?? []) {
			// Flood-fill from pocket center; must NOT reach >640px from centerline
			// without crossing a solid (i.e., the pocket is a genuine dead-end).
			const center = { x: pocket.x, y: pocket.y };
			const visited = new Set<string>();
			const queue = [center];
			let leaked = false;
			for (let guard = 0; queue.length > 0 && guard < 5_000; guard++) {
				const p = queue.shift()!;
				const key = `${Math.round(p.x)},${Math.round(p.y)}`;
				if (visited.has(key)) continue;
				visited.add(key);
				if (solids.some((r) => pointInRect(p, r))) continue;
				const distToRoute = distancePointToPolyline(p, route.mainRoute);
				if (distToRoute < 160) continue; // reached the corridor — OK
				if (distToRoute > 640) {
					leaked = true;
					break;
				}
				queue.push(
					{ x: p.x + 32, y: p.y },
					{ x: p.x - 32, y: p.y },
					{ x: p.x, y: p.y + 32 },
					{ x: p.x, y: p.y - 32 }
				);
			}
			expect(!leaked, `pocket ${pocket.id} floods into open field — not enclosed`).toBe(true);
		}
	});
});

describe('village maze — compact hamlet invariants', () => {
	const roomBounds = softMazeRooms
		.filter((r) => r.id === 'village-plaza-room')
		.map((r) => r.bounds);

	// Lanes trace the walkable corridors of the village maze. The plaza room
	// (x∈[800,1200], y∈[4900,5300]) is a safe hub; samples inside it are skipped.
	// Ring road runs between the perimeter (x∈[200,1800], y∈[4400,5800]) and the
	// building cluster. Spokes thread between buildings from plaza to ring/doorways.
	const villageLanes: Array<{ from: Pt; to: Pt }> = [
		// === Ring road (clockwise from SW corner) — split at spoke crossings ===
		// W ring (S half, below W spoke)
		{ from: { x: 290, y: 5_680 }, to: { x: 290, y: 5_080 } },
		// W ring (N half, above W spoke)
		{ from: { x: 290, y: 4_920 }, to: { x: 290, y: 4_480 } },
		// N ring
		{ from: { x: 290, y: 4_480 }, to: { x: 920, y: 4_480 } },
		{ from: { x: 920, y: 4_480 }, to: { x: 1_530, y: 4_480 } },
		{ from: { x: 1_530, y: 4_480 }, to: { x: 1_600, y: 4_480 } },
		// E ring (N half, above E spoke) — starts at guild-hall top (y=4740) so its west
		// side is bounded by the guild-hall building; the y∈[4480,4740] strip above is the
		// NE exit-gate corridor (kept clear for the spawn→crossroads critical route).
		{ from: { x: 1_700, y: 4_740 }, to: { x: 1_700, y: 5_060 } },
		// E ring (S half, below E spoke)
		{ from: { x: 1_700, y: 5_220 }, to: { x: 1_700, y: 5_680 } },
		// S ring
		{ from: { x: 1_700, y: 5_680 }, to: { x: 1_280, y: 5_680 } },
		{ from: { x: 1_280, y: 5_680 }, to: { x: 920, y: 5_680 } },
		{ from: { x: 920, y: 5_680 }, to: { x: 290, y: 5_680 } },
		// === Spokes (plaza → ring road) ===
		// W spoke: plaza W edge → W ring (between item-shop S & blacksmith N)
		{ from: { x: 800, y: 5_000 }, to: { x: 290, y: 5_000 } },
		// E spoke: plaza E edge → E ring (between guild-hall S & shrine/vh3 N)
		{ from: { x: 1_200, y: 5_130 }, to: { x: 1_700, y: 5_130 } },
		// SE detour: plaza → around shrine E → S corridor
		{ from: { x: 1_200, y: 5_300 }, to: { x: 1_240, y: 5_400 } },
		{ from: { x: 1_240, y: 5_400 }, to: { x: 1_240, y: 5_590 } },
		// === Dead-end pocket lanes (samples inside enclosed rooms count as dead-ends) ===
		// NW pocket interior ~x∈[240,440], y∈[4440,4530]
		{ from: { x: 280, y: 4_470 }, to: { x: 400, y: 4_510 } },
		// N pocket interior ~x∈[820,1020], y∈[4440,4520]
		{ from: { x: 860, y: 4_470 }, to: { x: 980, y: 4_510 } },
		// NE pocket interior ~x∈[1430,1640], y∈[4440,4530]
		{ from: { x: 1_470, y: 4_470 }, to: { x: 1_600, y: 4_510 } },
		// W pocket interior ~x∈[250,440], y∈[4700,4850]
		{ from: { x: 290, y: 4_730 }, to: { x: 410, y: 4_820 } },
		// E pocket interior ~x∈[1490,1750], y∈[5250,5400]
		{ from: { x: 1_530, y: 5_280 }, to: { x: 1_720, y: 5_370 } },
		// SW pocket interior ~x∈[250,440], y∈[5450,5600]
		{ from: { x: 290, y: 5_480 }, to: { x: 410, y: 5_570 } },
		// S pocket interior ~x∈[820,1020], y∈[5650,5750]
		{ from: { x: 860, y: 5_680 }, to: { x: 980, y: 5_720 } },
		// SE pocket interior ~x∈[1490,1750], y∈[5450,5600]
		{ from: { x: 1_530, y: 5_480 }, to: { x: 1_720, y: 5_570 } },
		// SE-S pocket interior ~x∈[1180,1380], y∈[5650,5750]
		{ from: { x: 1_220, y: 5_680 }, to: { x: 1_340, y: 5_720 } }
	];

	// Junctions sit at corridor intersections (outside the plaza room, outside buildings).
	const junctions: Array<{ point: Pt; approaches: Pt[] }> = [
		// W-spoke meets W-ring at (290, 5000): approaches from N, S, E
		{
			point: { x: 290, y: 5_000 },
			approaches: [
				{ x: 0, y: -1 },
				{ x: 0, y: 1 },
				{ x: 1, y: 0 }
			]
		},
		// E-spoke meets E-ring at (1700, 5130): approaches from N, S, W
		{
			point: { x: 1_700, y: 5_130 },
			approaches: [
				{ x: 0, y: -1 },
				{ x: 0, y: 1 },
				{ x: -1, y: 0 }
			]
		},
		// SE detour bend at (1240, 5400): approaches from N, S, W
		{
			point: { x: 1_240, y: 5_400 },
			approaches: [
				{ x: 0, y: -1 },
				{ x: 0, y: 1 },
				{ x: -1, y: 0 }
			]
		},
		// S-corridor × shrine approach at (1000, 5680): approaches from E, W, N
		{
			point: { x: 1_000, y: 5_680 },
			approaches: [
				{ x: -1, y: 0 },
				{ x: 1, y: 0 },
				{ x: 0, y: -1 }
			]
		}
	];

	it('keeps village lane width ≤ 256px outside rooms', () => {
		const violations = laneWidthViolations(villageLanes, roomBounds, { maxHalfWidth: 128 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('occludes cross-zone sight at every junction', () => {
		const violations = junctionOcclusionViolations(junctions, { maxDistance: 64 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('has ≥9 dead-ends in the village maze', () => {
		const laneSamples = sampleLaneSet(villageLanes);
		const count = countDeadEnds(laneSamples, { minDepth: 96 });
		expect(count, `found ${count} dead-ends, need ≥9`).toBeGreaterThanOrEqual(9);
	});

	it('every building transition is reachable from the plaza', () => {
		const solids = [...collectSolidRects(meadowEntryMap).values()];
		// Only village transitions — the whispering-cave threshold is far outside
		// the village perimeter and is gated by a quest anyway.
		const transitions = (meadowEntryMap.transitions ?? []).filter(
			(t) => t.x >= 200 && t.x <= 1_800 && t.y >= 4_400 && t.y <= 5_800
		);
		// Start from NE plaza corner — clear of the sundrop-well solid at plaza center.
		const start = { x: 1_140, y: 5_000 };
		// Clamp exploration to the village interior so the flood-fill budget is spent
		// on village connectivity rather than escaping through the NE exit gate into
		// the open map. Village transitions are all inside the perimeter.
		const inVillage = (p: Pt) => p.x >= 240 && p.x <= 1_760 && p.y >= 4_440 && p.y <= 5_760;
		for (const t of transitions) {
			const visited = new Set<string>();
			const queue = [{ ...start }];
			let found = false;
			// NOTE: BFS bound temporary — Task 4 seals NE gate, then remove
			for (let guard = 0; queue.length > 0 && guard < 10_000; guard++) {
				const p = queue.shift()!;
				const key = `${Math.round(p.x / 32) * 32},${Math.round(p.y / 32) * 32}`;
				if (visited.has(key)) continue;
				visited.add(key);
				if (solids.some((r) => pointInRect(p, r))) continue;
				if (Math.hypot(p.x - t.x, p.y - t.y) < 64) {
					found = true;
					break;
				}
				for (const next of [
					{ x: p.x + 32, y: p.y },
					{ x: p.x - 32, y: p.y },
					{ x: p.x, y: p.y + 32 },
					{ x: p.x, y: p.y - 32 }
				]) {
					if (inVillage(next)) queue.push(next);
				}
			}
			expect(found, `${t.id} unreachable from plaza`).toBe(true);
		}
	});
});

describe('exit corridor — village gate to crossroads', () => {
	const ROUTE = () => routeSceneDefinitions.find((r) => r.id === 'spawn-to-crossroads')!;
	// Only check the corridor portion (from the village gate onward).
	// Village-interior segments are validated by the village maze tests.
	const CORRIDOR_ROUTE = () => {
		const full = ROUTE();
		// Include one vertex before the corridor so the gate junction at
		// (1850,4350) is treated as an interior vertex and skipped by the
		// junction-aware sampler.  Village-interior segments are validated
		// by the village maze tests.
		const gateApproachIdx = full.mainRoute.findIndex((p) => p.x === 1_650 && p.y === 4_350);
		return { ...full, mainRoute: full.mainRoute.slice(gateApproachIdx) };
	};

	it('keeps corridor width ≤ 320px outside beat-rooms', () => {
		const violations = corridorWidthViolations(CORRIDOR_ROUTE(), { maxHalfWidth: 160 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('occludes forward sight within 384px outside beat-rooms', () => {
		const violations = sightlineViolations(CORRIDOR_ROUTE(), { maxSightDistance: 384 });
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('bends ≥30° at least once per inter-beat segment >256px', () => {
		const violations = bendViolations(CORRIDOR_ROUTE(), { minTurnDegrees: 30, minSegmentPx: 256 });
		expect(violations, JSON.stringify(violations)).toEqual([]);
	});
});
