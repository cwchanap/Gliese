import type { MapRect } from '$lib/game/content/maps/types';
import type { PixelBounds, RawPixelBounds, WorldEdge } from './meadow-entry-authoring-types';

export type {
	Insets,
	PixelBounds,
	RawPixelBounds,
	WorldEdge
} from './meadow-entry-authoring-types';

export const MEADOW_ENTRY_WORLD_BOUNDS: PixelBounds = {
	left: 0,
	top: 0,
	right: 6_400,
	bottom: 6_400
};
export const MEADOW_ENTRY_TILE_SIZE_PX = 32;
export const MEADOW_ENTRY_MIN_HANDOFF_PX = 128;

function assertFiniteBounds(bounds: RawPixelBounds, name: string): void {
	for (const [edge, value] of Object.entries(bounds)) {
		if (!Number.isFinite(value)) {
			throw new Error(`${name}.${edge} must be finite`);
		}
	}
	if (bounds.left >= bounds.right || bounds.top >= bounds.bottom) {
		throw new Error(`${name} must not be inverted`);
	}
}

function assertWorldBounds(bounds: RawPixelBounds, name: string): void {
	assertFiniteBounds(bounds, name);
	if (
		bounds.left < MEADOW_ENTRY_WORLD_BOUNDS.left ||
		bounds.top < MEADOW_ENTRY_WORLD_BOUNDS.top ||
		bounds.right > MEADOW_ENTRY_WORLD_BOUNDS.right ||
		bounds.bottom > MEADOW_ENTRY_WORLD_BOUNDS.bottom
	) {
		throw new Error(`${name} must be within the meadow-entry world`);
	}
}

function assertGridSize(gridPx: number): void {
	if (!Number.isFinite(gridPx) || gridPx <= 0) {
		throw new Error('gridPx must be a positive finite number');
	}
}

export function toRawPixelBounds(rect: MapRect): RawPixelBounds {
	if (
		![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) ||
		rect.width < 0 ||
		rect.height < 0
	) {
		throw new Error('MapRect must have finite non-negative dimensions');
	}
	const bounds = {
		left: rect.x - rect.width / 2,
		top: rect.y - rect.height / 2,
		right: rect.x + rect.width / 2,
		bottom: rect.y + rect.height / 2
	};
	assertWorldBounds(bounds, 'MapRect bounds');
	return bounds;
}

export function rasterizeCoverageBounds(raw: RawPixelBounds): PixelBounds {
	assertWorldBounds(raw, 'raw bounds');
	return {
		left: Math.floor(raw.left),
		top: Math.floor(raw.top),
		right: Math.ceil(raw.right),
		bottom: Math.ceil(raw.bottom)
	};
}

export function snapBoundsOutward(
	bounds: RawPixelBounds,
	gridPx = MEADOW_ENTRY_TILE_SIZE_PX
): PixelBounds {
	assertWorldBounds(bounds, 'bounds');
	assertGridSize(gridPx);
	const snapped = {
		left: Math.floor(bounds.left / gridPx) * gridPx,
		top: Math.floor(bounds.top / gridPx) * gridPx,
		right: Math.ceil(bounds.right / gridPx) * gridPx,
		bottom: Math.ceil(bounds.bottom / gridPx) * gridPx
	};
	assertWorldBounds(snapped, 'snapped bounds');
	return snapped;
}

export function clampBoundsToWorld(bounds: PixelBounds): {
	bounds: PixelBounds;
	clampedSides: readonly WorldEdge[];
} {
	assertFiniteBounds(bounds, 'bounds');
	const clampedSides: WorldEdge[] = [];
	if (bounds.left < MEADOW_ENTRY_WORLD_BOUNDS.left) clampedSides.push('left');
	if (bounds.right > MEADOW_ENTRY_WORLD_BOUNDS.right) clampedSides.push('right');
	if (bounds.top < MEADOW_ENTRY_WORLD_BOUNDS.top) clampedSides.push('top');
	if (bounds.bottom > MEADOW_ENTRY_WORLD_BOUNDS.bottom) clampedSides.push('bottom');
	const clampedBounds = {
		left: Math.max(bounds.left, MEADOW_ENTRY_WORLD_BOUNDS.left),
		top: Math.max(bounds.top, MEADOW_ENTRY_WORLD_BOUNDS.top),
		right: Math.min(bounds.right, MEADOW_ENTRY_WORLD_BOUNDS.right),
		bottom: Math.min(bounds.bottom, MEADOW_ENTRY_WORLD_BOUNDS.bottom)
	};
	assertFiniteBounds(clampedBounds, 'clamped bounds');
	return {
		bounds: clampedBounds,
		clampedSides
	};
}

export function intersectBounds(a: PixelBounds, b: PixelBounds): PixelBounds | null {
	assertWorldBounds(a, 'first bounds');
	assertWorldBounds(b, 'second bounds');
	const intersection = {
		left: Math.max(a.left, b.left),
		top: Math.max(a.top, b.top),
		right: Math.min(a.right, b.right),
		bottom: Math.min(a.bottom, b.bottom)
	};
	return intersection.left < intersection.right && intersection.top < intersection.bottom
		? intersection
		: null;
}

export function containsBounds(container: PixelBounds, value: PixelBounds): boolean {
	assertWorldBounds(container, 'container bounds');
	assertWorldBounds(value, 'value bounds');
	return (
		container.left <= value.left &&
		container.top <= value.top &&
		container.right >= value.right &&
		container.bottom >= value.bottom
	);
}

export function boundsArea(bounds: PixelBounds): number {
	assertWorldBounds(bounds, 'bounds');
	return (bounds.right - bounds.left) * (bounds.bottom - bounds.top);
}

/**
 * Computes the union area of the supplied bounds using a vertical sweep with
 * merged intervals. For each x-edge slab, the overlapping y-intervals are
 * merged and summed; the Number.NaN sentinel tracks when no interval is
 * currently active. Every supplied bound must lie within the world bounds.
 *
 * @param bounds - the world-space bounds whose union area is computed
 * @returns the numeric pixel area covered by at least one of the supplied bounds
 */
export function unionArea(bounds: readonly PixelBounds[]): number {
	for (const bound of bounds) assertWorldBounds(bound, 'union bounds');
	const xEdges = [...new Set(bounds.flatMap((bound) => [bound.left, bound.right]))].sort(
		(left, right) => left - right
	);
	let area = 0;
	for (let index = 0; index < xEdges.length - 1; index += 1) {
		const left = xEdges[index];
		const right = xEdges[index + 1];
		if (left === undefined || right === undefined || left === right) continue;
		const intervals = bounds
			.filter((bound) => bound.left < right && bound.right > left)
			.map((bound) => [bound.top, bound.bottom] as const)
			.sort(([firstTop], [secondTop]) => firstTop - secondTop);
		let coveredHeight = 0;
		let currentTop = Number.NaN;
		let currentBottom = Number.NaN;
		for (const [top, bottom] of intervals) {
			if (Number.isNaN(currentTop)) {
				currentTop = top;
				currentBottom = bottom;
			} else if (top > currentBottom) {
				coveredHeight += currentBottom - currentTop;
				currentTop = top;
				currentBottom = bottom;
			} else {
				currentBottom = Math.max(currentBottom, bottom);
			}
		}
		if (!Number.isNaN(currentTop)) coveredHeight += currentBottom - currentTop;
		area += (right - left) * coveredHeight;
	}
	return area;
}
