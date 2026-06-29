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

describe('village maze — compact hamlet invariants', () => {
	// Open rooms where lane-width samples are skipped (the village is a set of
	// rooms connected by bent lanes, not a hedge-grid).
	const villageRoomBounds: Rect[] = [
		{ id: 'village-plaza-room', x: 1_000, y: 5_160, width: 500, height: 420 },
		{ id: 'village-home-yard', x: 700, y: 5_585, width: 420, height: 180 },
		{ id: 'village-blacksmith-yard', x: 400, y: 5_280, width: 360, height: 300 },
		{ id: 'village-north-courtyard', x: 1_120, y: 4_690, width: 620, height: 200 },
		{ id: 'village-guild-forecourt', x: 1_460, y: 5_040, width: 360, height: 180 },
		{ id: 'village-shrine-garden', x: 1_200, y: 5_660, width: 520, height: 320 },
		{ id: 'village-hidden-pocket', x: 1_520, y: 5_620, width: 300, height: 260 },
		{ id: 'village-gate-road', x: 1_760, y: 4_440, width: 520, height: 120 }
	];

	// Lanes trace the walkable corridors between rooms. Width checks only apply
	// to samples OUTSIDE the room bounds above (the narrow connecting lanes).
	const villageLanes: Array<{ from: Pt; to: Pt }> = [
		// South lane: home yard → plaza (narrow vertical corridor)
		{ from: { x: 780, y: 5_490 }, to: { x: 800, y: 5_390 } },
		// Market lane: plaza → blacksmith yard (bounded by market walls)
		{ from: { x: 930, y: 5_045 }, to: { x: 650, y: 5_045 } },
		// Shrine path: plaza → shrine garden (narrow vertical corridor)
		{ from: { x: 1_100, y: 5_370 }, to: { x: 1_100, y: 5_500 } }
	];

	// Lane-cap history (recorded here because the realization-notes spec that
	// originally documented it was removed with the rest of the branch planning
	// docs in adf9456):
	//   - Original spec cap: 256px (maxHalfWidth 128).
	//   - Raised to 288px (maxHalfWidth 144) when village buildings were shrunk
	//     to 80% — a user-approved decision (less-crowded village ⟹ wider lanes).
	//   - Raised to 360px (maxHalfWidth 180) by the compact-cluster
	//     repositioning (108c560), which moved buildings closer together and
	//     widened the remaining inter-building lanes. This is wider than the
	//     non-village corridor cap (320px) on purpose: the village is a hamlet
	//     of rooms connected by short bent lanes, not a winding corridor.
	it('keeps village corridor width ≤ 360px outside rooms', () => {
		const violations = laneWidthViolations(villageLanes, villageRoomBounds, {
			maxHalfWidth: 180
		});
		expect(violations, JSON.stringify(violations.slice(0, 3))).toEqual([]);
	});

	it('every building transition is reachable from the plaza', () => {
		const solids = [...collectSolidRects(meadowEntryMap).values()];
		const transitions = (meadowEntryMap.transitions ?? []).filter(
			(t) => t.x >= 200 && t.x <= 1_800 && t.y >= 4_400 && t.y <= 5_800
		);
		// Start from NE plaza corner — clear of the sundrop-well solid at plaza center.
		const start = { x: 1_140, y: 5_000 };
		const inVillage = (p: Pt) => p.x >= 240 && p.x <= 1_880 && p.y >= 4_400 && p.y <= 5_860;
		for (const t of transitions) {
			const visited = new Set<string>();
			const queue = [{ ...start }];
			let found = false;
			for (let guard = 0; queue.length > 0 && guard < 12_000; guard++) {
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
