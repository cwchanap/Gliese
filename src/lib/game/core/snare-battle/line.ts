import {
	distance,
	pathLength,
	pointInArc,
	segmentIntersection,
	type Vec
} from '$lib/game/core/snare-battle/geometry';

/** The snare line trailing Grik, oldest point first. */
export type SnareLine = { points: Vec[]; length: number };

export type LineRules = { maxLength: number; minLoopLength: number; sampleSpacing: number };

export function createLine(start?: Vec): SnareLine {
	return { points: start ? [{ ...start }] : [], length: 0 };
}

export function clearLine(line: SnareLine, start?: Vec) {
	line.points = start ? [{ ...start }] : [];
	line.length = 0;
}

/**
 * Lays the line up to `to`. When the new piece crosses an older piece and the
 * enclosed loop is at least `minLoopLength` around, the loop is returned and
 * the line is used up: a new one starts at `to`. A smaller loop does nothing.
 * The oldest crossing always makes the biggest loop, so only it is checked.
 */
export function extendLine(line: SnareLine, to: Vec, rules: LineRules): Vec[] | null {
	const points = line.points;
	const head = points.at(-1);

	if (!head) {
		points.push({ ...to });
		return null;
	}

	const step = distance(head, to);
	if (step < rules.sampleSpacing) {
		return null;
	}

	// The last piece shares `head` with the new one, so it is never a crossing.
	for (let index = 0; index + 2 < points.length; index += 1) {
		const crossing = segmentIntersection(points[index]!, points[index + 1]!, head, to);
		if (!crossing) {
			continue;
		}

		const loop = [crossing, ...points.slice(index + 1)];
		if (pathLength(loop) + distance(head, crossing) >= rules.minLoopLength) {
			clearLine(line, to);
			return loop;
		}
		break;
	}

	points.push({ ...to });
	line.length += step;
	trimLine(line, rules.maxLength);
	return null;
}

/** Fades the oldest end so the line is never longer than `maxLength`. */
function trimLine(line: SnareLine, maxLength: number) {
	while (line.length > maxLength && line.points.length >= 2) {
		const [first, second] = line.points as [Vec, Vec];
		const piece = distance(first, second);
		const excess = line.length - maxLength;

		if (piece <= excess) {
			line.points.shift();
			line.length -= piece;
			continue;
		}

		const t = excess / piece;
		line.points[0] = {
			x: first.x + (second.x - first.x) * t,
			y: first.y + (second.y - first.y) * t
		};
		line.length = maxLength;
	}
}

/** True when segment ab crosses any piece of the line. */
export function lineCrossesSegment(line: SnareLine, a: Vec, b: Vec): boolean {
	for (let index = 1; index < line.points.length; index += 1) {
		if (segmentIntersection(line.points[index - 1]!, line.points[index]!, a, b)) {
			return true;
		}
	}
	return false;
}

/** True when any laid point of the line sits inside the arc. */
export function lineTouchesArc(
	line: SnareLine,
	origin: Vec,
	aim: Vec,
	reach: number,
	halfAngleDeg: number
): boolean {
	return (
		line.points.length >= 2 &&
		line.points.some((point) => pointInArc(point, origin, aim, reach, halfAngleDeg))
	);
}
