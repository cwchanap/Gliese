import { describe, expect, it } from 'vitest';
import { meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';

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
