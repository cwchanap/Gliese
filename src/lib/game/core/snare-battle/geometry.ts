/** Plain 2D helpers for the snare battle. Positions are ground points in arena px. */

export type Vec = { x: number; y: number };

export function distance(a: Vec, b: Vec): number {
	return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Unit vector from `from` toward `to`; `fallback` when the two points coincide. */
export function direction(from: Vec, to: Vec, fallback: Vec = { x: 1, y: 0 }): Vec {
	const length = distance(from, to);
	return length === 0 ? fallback : { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

export function pathLength(points: readonly Vec[]): number {
	let total = 0;
	for (let index = 1; index < points.length; index += 1) {
		total += distance(points[index - 1]!, points[index]!);
	}
	return total;
}

/** Where segment ab meets segment cd, or null. Parallel segments never meet. */
export function segmentIntersection(a: Vec, b: Vec, c: Vec, d: Vec): Vec | null {
	const rx = b.x - a.x;
	const ry = b.y - a.y;
	const sx = d.x - c.x;
	const sy = d.y - c.y;
	const denominator = rx * sy - ry * sx;

	if (denominator === 0) {
		return null;
	}

	const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator;
	const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator;

	if (t < 0 || t > 1 || u < 0 || u > 1) {
		return null;
	}

	return { x: a.x + t * rx, y: a.y + t * ry };
}

export function distanceToSegment(point: Vec, a: Vec, b: Vec): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const lengthSquared = dx * dx + dy * dy;

	if (lengthSquared === 0) {
		return distance(point, a);
	}

	const t = Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0), 1);
	return distance(point, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Even-odd ray cast; the polygon closes from its last point back to its first. */
export function pointInPolygon(point: Vec, polygon: readonly Vec[]): boolean {
	let inside = false;

	for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
		const a = polygon[index]!;
		const b = polygon[previous]!;

		if (
			a.y > point.y !== b.y > point.y &&
			point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
		) {
			inside = !inside;
		}
	}

	return inside;
}

/** True when `point` lies within `reach` of `origin` and inside the cone around `aim`. */
export function pointInArc(
	point: Vec,
	origin: Vec,
	aim: Vec,
	reach: number,
	halfAngleDeg: number
): boolean {
	const offset = distance(origin, point);

	if (offset > reach) {
		return false;
	}

	if (offset === 0) {
		return true;
	}

	const cosine = ((point.x - origin.x) * aim.x + (point.y - origin.y) * aim.y) / offset;
	return cosine >= Math.cos((halfAngleDeg * Math.PI) / 180);
}

/** How far a ray from `origin` along unit `dir` travels before leaving the box. */
export function distanceToBoxEdge(
	origin: Vec,
	dir: Vec,
	box: { minX: number; minY: number; maxX: number; maxY: number }
): number {
	const limits: number[] = [];

	if (dir.x > 0) limits.push((box.maxX - origin.x) / dir.x);
	if (dir.x < 0) limits.push((box.minX - origin.x) / dir.x);
	if (dir.y > 0) limits.push((box.maxY - origin.y) / dir.y);
	if (dir.y < 0) limits.push((box.minY - origin.y) / dir.y);

	return Math.max(0, Math.min(...limits));
}
