import { describe, expect, it } from 'vitest';

import { pathLength, type Vec } from '$lib/game/core/snare-battle/geometry';
import {
	createLine,
	extendLine,
	lineCrossesSegment,
	type SnareLine
} from '$lib/game/core/snare-battle/line';
import { snareTuning } from '$lib/game/core/snare-battle/tuning';

const rules = snareTuning.line;

/** Lays the line along `waypoints` one sample at a time; returns the first loop it closes. */
function lay(line: SnareLine, waypoints: Vec[]): Vec[] | null {
	let at = line.points.at(-1)!;

	for (const waypoint of waypoints) {
		while (Math.hypot(waypoint.x - at.x, waypoint.y - at.y) > 0.001) {
			const gap = Math.hypot(waypoint.x - at.x, waypoint.y - at.y);
			const step = Math.min(rules.sampleSpacing, gap);
			at = {
				x: at.x + ((waypoint.x - at.x) / gap) * step,
				y: at.y + ((waypoint.y - at.y) / gap) * step
			};
			const loop = extendLine(line, at, rules);
			if (loop) return loop;
		}
	}

	return null;
}

describe('snare line', () => {
	it('closes a loop when the line crosses itself, and the loop uses the line up', () => {
		const line = createLine({ x: 100, y: 100 });
		const loop = lay(line, [
			{ x: 200, y: 100 },
			{ x: 200, y: 200 },
			{ x: 100, y: 200 },
			{ x: 100, y: 90 }
		]);

		// Points are laid every 8 px, so each corner is cut by a few px.
		expect(loop).not.toBeNull();
		expect(pathLength([...loop!, loop![0]!])).toBeGreaterThan(380);
		// A new line starts at once, where Grik is.
		expect(line.points).toHaveLength(1);
		expect(line.points[0]!.x).toBeCloseTo(100);
		expect(line.length).toBe(0);
	});

	it('closes a loop of 180 px around', () => {
		const line = createLine({ x: 100, y: 100 });
		// A 50 px square: 150 px of line, then 50 px more to the crossing.
		const loop = lay(line, [
			{ x: 150, y: 100 },
			{ x: 150, y: 150 },
			{ x: 100, y: 150 },
			{ x: 100, y: 60 }
		]);

		expect(rules.minLoopLength).toBe(180);
		expect(loop).not.toBeNull();
		expect(pathLength([...loop!, loop![0]!])).toBeGreaterThanOrEqual(rules.minLoopLength);
	});

	it('ignores a loop under 180 px around, and the line keeps going', () => {
		const line = createLine({ x: 100, y: 100 });
		// A 40 px square is 160 px around.
		const loop = lay(line, [
			{ x: 140, y: 100 },
			{ x: 140, y: 140 },
			{ x: 100, y: 140 },
			{ x: 100, y: 60 }
		]);

		expect(loop).toBeNull();
		expect(line.points[0]).toEqual({ x: 100, y: 100 });
		expect(line.points.at(-1)!.y).toBeLessThan(70);
	});

	it('keeps only the newest stretch of the line', () => {
		const line = createLine({ x: 0, y: 0 });
		lay(line, [{ x: 1_000, y: 0 }]);

		expect(line.length).toBeCloseTo(rules.maxLength);
		expect(line.points[0]!.x).toBeCloseTo(1_000 - rules.maxLength);
	});

	it('tells whether a segment crosses the line', () => {
		const line = createLine({ x: 0, y: 0 });
		lay(line, [{ x: 0, y: 100 }]);

		expect(lineCrossesSegment(line, { x: -20, y: 50 }, { x: 20, y: 50 })).toBe(true);
		expect(lineCrossesSegment(line, { x: 10, y: 50 }, { x: 40, y: 50 })).toBe(false);
	});

	it('a short last step still closes a loop', () => {
		const line = createLine({ x: 100, y: 100 });
		lay(line, [
			{ x: 200, y: 100 },
			{ x: 200, y: 200 },
			{ x: 100, y: 200 },
			{ x: 100, y: 104 }
		]);

		// 6 px is under the sample spacing, but it crosses the first piece.
		expect(extendLine(line, { x: 100, y: 98 }, rules)).not.toBeNull();
	});

	it('a segment lying along the line counts as crossing it', () => {
		const line = createLine({ x: 0, y: 0 });
		lay(line, [{ x: 0, y: 100 }]);

		expect(lineCrossesSegment(line, { x: 0, y: 20 }, { x: 0, y: 60 })).toBe(true);
	});
});
