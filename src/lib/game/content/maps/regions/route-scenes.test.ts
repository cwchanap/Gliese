import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { routeSceneDefinitions } from '$lib/game/content/maps/regions/route-scenes';

type Pt = { x: number; y: number };

function collectEntityKinds(map: WorldMapDefinition): Map<string, string> {
	const kinds = new Map<string, string>();
	for (const landmark of map.landmarks ?? []) kinds.set(landmark.id, 'landmark');
	for (const pickup of map.pickups ?? []) kinds.set(pickup.id, 'pickup');
	for (const npc of map.npcs ?? []) kinds.set(npc.id, 'npc');
	for (const npc of map.ambientNpcs ?? []) kinds.set(npc.id, 'ambientNpc');
	for (const encounter of map.encounters ?? []) kinds.set(encounter.id, 'encounter');
	for (const blocker of map.blockers ?? []) kinds.set(blocker.id, 'blocker');
	for (const decor of map.mapDecor ?? []) kinds.set(decor.id, 'decor');
	for (const patch of map.groundPatches ?? []) kinds.set(patch.id, 'groundPatch');
	for (const fence of map.fences ?? []) kinds.set(fence.id, 'fence');
	for (const transition of map.transitions) kinds.set(transition.id, 'transition');
	for (const discovery of map.discoveries ?? []) kinds.set(discovery.id, 'discovery');
	return kinds;
}

function pointSegmentDistance(point: Pt, a: Pt, b: Pt): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSquared = dx * dx + dy * dy;
	if (lengthSquared === 0) {
		return Math.hypot(point.x - a.x, point.y - a.y);
	}
	const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
	return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function distancePointToPolyline(point: Pt, route: Pt[]): number {
	let best = Number.POSITIVE_INFINITY;
	for (let i = 0; i < route.length - 1; i += 1) {
		best = Math.min(best, pointSegmentDistance(point, route[i], route[i + 1]));
	}
	return best;
}

function pointByEntityId(map: WorldMapDefinition, id: string): Pt | undefined {
	for (const list of [
		map.landmarks,
		map.pickups,
		map.npcs,
		map.ambientNpcs,
		map.encounters,
		map.blockers,
		map.mapDecor,
		map.groundPatches,
		map.fences,
		map.transitions,
		map.discoveries
	]) {
		const match = (list ?? []).find((item) => item.id === id);
		if (match) return { x: match.x, y: match.y };
	}
	return undefined;
}

describe('route-scene manifest', () => {
	const entityKinds = collectEntityKinds(meadowEntryMap);

	it('declares camera beats for the five entry-map routes', () => {
		expect(routeSceneDefinitions.map((route) => route.id)).toEqual([
			'spawn-to-crossroads',
			'crossroads-to-coast',
			'crossroads-to-mistfen',
			'crossroads-to-silverpine',
			'crossroads-to-wildwood'
		]);
		expect(routeSceneDefinitions.every((route) => route.beats.length >= 3)).toBe(true);
	});

	it.each(routeSceneDefinitions)(
		'$id references real visible ids and has route-scene structure',
		(route) => {
			expect(route.mainRoute.length, `${route.id}: missing main route`).toBeGreaterThanOrEqual(2);
			expect(
				route.beats.some(
					(beat) => beat.purpose === 'fork' || (beat.optionalPathIds?.length ?? 0) > 0
				),
				`${route.id}: needs a fork or optional side-pocket beat`
			).toBe(true);
			expect(
				route.beats.some((beat) => beat.purpose === 'payoff' || beat.purpose === 'gate'),
				`${route.id}: needs a payoff or gate beat`
			).toBe(true);
			expect(
				route.beats.some((beat) => beat.storyMotif),
				`${route.id}: needs at least one story motif`
			).toBe(true);

			for (const beat of route.beats) {
				expect(
					beat.expectedVisibleIds.length,
					`${route.id}:${beat.id} has no visible ids`
				).toBeGreaterThan(0);
				const visibleKinds = beat.expectedVisibleIds.map((id) => entityKinds.get(id));
				for (const id of [
					...beat.expectedVisibleIds,
					...(beat.optionalPathIds ?? []),
					...(beat.payoffIds ?? [])
				]) {
					expect(entityKinds.has(id), `${route.id}:${beat.id} references missing id ${id}`).toBe(
						true
					);
				}
				expect(
					visibleKinds.some((kind) => kind !== 'groundPatch'),
					`${route.id}:${beat.id} cannot be proved by ground patches alone`
				).toBe(true);
			}
		}
	);

	it('keeps side payoffs off the main route unless the beat is a gate or vista', () => {
		for (const route of routeSceneDefinitions) {
			for (const beat of route.beats) {
				if (beat.purpose === 'gate' || beat.storyMotif === 'gate') continue;
				for (const payoffId of beat.payoffIds ?? []) {
					const point = pointByEntityId(meadowEntryMap, payoffId);
					expect(point, `${route.id}:${beat.id} missing payoff point ${payoffId}`).toBeDefined();
					expect(
						distancePointToPolyline(point!, route.mainRoute),
						`${route.id}:${beat.id} payoff ${payoffId} sits on the main route`
					).toBeGreaterThanOrEqual(160);
				}
			}
		}
	});

	it('locks the Coast fork to actual fork geometry and side-payout composition', () => {
		const coastRoute = routeSceneDefinitions.find((route) => route.id === 'crossroads-to-coast');
		expect(coastRoute).toBeDefined();
		expect(
			coastRoute!.beats.some((beat) => beat.optionalPathIds?.includes('coast-ferry-fork'))
		).toBe(true);
		expect(
			coastRoute!.beats.some((beat) => beat.expectedVisibleIds.includes('coast-shrine-landing'))
		).toBe(true);
		expect(coastRoute!.beats.some((beat) => beat.payoffIds?.includes('coast-salve'))).toBe(true);
	});
});
