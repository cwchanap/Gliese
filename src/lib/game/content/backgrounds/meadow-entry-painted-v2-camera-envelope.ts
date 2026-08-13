import {
	boundsArea,
	clampBoundsToWorld,
	intersectBounds,
	MEADOW_ENTRY_WORLD_BOUNDS,
	unionArea
} from './meadow-entry-authoring-geometry';
import type { PixelBounds } from './meadow-entry-authoring-types';

export interface PaintedV2CameraRoutePoint {
	readonly id: string;
	readonly x: number;
	readonly y: number;
}

export interface PaintedV2CameraViewport {
	readonly width: number;
	readonly height: number;
}

export const MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT = Object.freeze({
	width: 1_920,
	height: 1_080
}) satisfies PaintedV2CameraViewport;

export const MEADOW_ENTRY_PAINTED_V2_CAMERA_ROUTE_REACH_PX = 18;

const ROUTE_VALUES: readonly PaintedV2CameraRoutePoint[] = [
	{ id: 'hero-house', x: 704, y: 5_920 },
	{ id: 'south-lane', x: 704, y: 6_080 },
	{ id: 'west-lane-south', x: 320, y: 6_080 },
	{ id: 'west-lane-north', x: 320, y: 4_688 },
	{ id: 'pickup-lane', x: 912, y: 4_688 },
	{ id: 'market-pickup', x: 912, y: 5_072 },
	{ id: 'market-return', x: 912, y: 4_688 },
	{ id: 'villager-house-1-approach', x: 660, y: 4_688 },
	{ id: 'villager-house-1-lane', x: 672, y: 4_688 },
	{ id: 'villager-house-1', x: 672, y: 4_448 },
	{ id: 'villager-house-1-return', x: 672, y: 4_688 },
	{ id: 'crossroads-handoff', x: 3_776, y: 4_688 },
	{ id: 'waystone-east-lane', x: 4_032, y: 4_688 },
	{ id: 'waystone-south', x: 4_032, y: 4_480 },
	{ id: 'waystone-north', x: 4_032, y: 4_224 },
	{ id: 'waystone', x: 3_904, y: 4_224 },
	{ id: 'waystone-return-east', x: 4_160, y: 4_224 },
	{ id: 'waystone-return-south', x: 4_160, y: 4_480 },
	{ id: 'crossroads-return', x: 3_776, y: 4_480 },
	{ id: 'connector-return-east', x: 3_264, y: 4_480 },
	{ id: 'connector-return-lane', x: 3_264, y: 4_688 },
	{ id: 'west-lane-return', x: 320, y: 4_688 },
	{ id: 'save-lane', x: 1_152, y: 4_688 },
	{ id: 'save-point', x: 1_152, y: 4_800 }
];

export const MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE: readonly PaintedV2CameraRoutePoint[] =
	Object.freeze(ROUTE_VALUES.map((point) => Object.freeze({ ...point })));

function assertViewport(viewport: PaintedV2CameraViewport): void {
	if (
		![viewport.width, viewport.height].every(Number.isFinite) ||
		viewport.width <= 0 ||
		viewport.height <= 0
	) {
		throw new Error('Painted-v2 camera viewport dimensions must be positive finite numbers');
	}
	if (
		viewport.width > MEADOW_ENTRY_WORLD_BOUNDS.right - MEADOW_ENTRY_WORLD_BOUNDS.left ||
		viewport.height > MEADOW_ENTRY_WORLD_BOUNDS.bottom - MEADOW_ENTRY_WORLD_BOUNDS.top
	) {
		throw new Error('Painted-v2 camera viewport dimensions must fit within the meadow-entry world');
	}
}

function assertRoutePoint(point: { readonly x: number; readonly y: number }): void {
	if (![point.x, point.y].every(Number.isFinite)) {
		throw new Error('Painted-v2 camera route points must have finite coordinates');
	}
	if (
		point.x < MEADOW_ENTRY_WORLD_BOUNDS.left ||
		point.x > MEADOW_ENTRY_WORLD_BOUNDS.right ||
		point.y < MEADOW_ENTRY_WORLD_BOUNDS.top ||
		point.y > MEADOW_ENTRY_WORLD_BOUNDS.bottom
	) {
		throw new Error('Painted-v2 camera route points must be within the meadow-entry world');
	}
}

function assertRouteReach(routeReachPx: number): void {
	if (!Number.isFinite(routeReachPx) || routeReachPx < 0) {
		throw new Error('Painted-v2 camera route reach must be a non-negative finite number');
	}
}

export function cameraBoundsAtMeadowEntryPoint(
	point: { readonly x: number; readonly y: number },
	viewport: PaintedV2CameraViewport = MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT
): PixelBounds {
	assertViewport(viewport);
	assertRoutePoint(point);
	const maxLeft = MEADOW_ENTRY_WORLD_BOUNDS.right - viewport.width;
	const maxTop = MEADOW_ENTRY_WORLD_BOUNDS.bottom - viewport.height;
	const left = Math.min(
		Math.max(point.x - viewport.width / 2, MEADOW_ENTRY_WORLD_BOUNDS.left),
		maxLeft
	);
	const top = Math.min(
		Math.max(point.y - viewport.height / 2, MEADOW_ENTRY_WORLD_BOUNDS.top),
		maxTop
	);
	return {
		left,
		top,
		right: left + viewport.width,
		bottom: top + viewport.height
	};
}

function assertAxisAligned(
	first: PaintedV2CameraRoutePoint,
	second: PaintedV2CameraRoutePoint
): void {
	if (first.x !== second.x && first.y !== second.y) {
		throw new Error(
			`Painted-v2 camera route segment ${first.id}/${second.id} must be axis-aligned`
		);
	}
}

function cameraEnvelopeForSegment(
	first: PaintedV2CameraRoutePoint,
	second: PaintedV2CameraRoutePoint,
	viewport: PaintedV2CameraViewport,
	routeReachPx: number
): PixelBounds {
	assertRoutePoint(first);
	assertRoutePoint(second);
	assertAxisAligned(first, second);
	const firstBounds = cameraBoundsAtMeadowEntryPoint(first, viewport);
	const secondBounds = cameraBoundsAtMeadowEntryPoint(second, viewport);
	const envelope = {
		left: Math.min(firstBounds.left, secondBounds.left),
		top: Math.min(firstBounds.top, secondBounds.top),
		right: Math.max(firstBounds.right, secondBounds.right),
		bottom: Math.max(firstBounds.bottom, secondBounds.bottom)
	};
	return clampBoundsToWorld({
		left:
			envelope.left === MEADOW_ENTRY_WORLD_BOUNDS.left
				? envelope.left
				: envelope.left - routeReachPx,
		top:
			envelope.top === MEADOW_ENTRY_WORLD_BOUNDS.top ? envelope.top : envelope.top - routeReachPx,
		right:
			envelope.right === MEADOW_ENTRY_WORLD_BOUNDS.right
				? envelope.right
				: envelope.right + routeReachPx,
		bottom:
			envelope.bottom === MEADOW_ENTRY_WORLD_BOUNDS.bottom
				? envelope.bottom
				: envelope.bottom + routeReachPx
	}).bounds;
}

export function collectMeadowEntryPaintedV2CameraEnvelopes(
	route: readonly PaintedV2CameraRoutePoint[] = MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE,
	viewport: PaintedV2CameraViewport = MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT,
	routeReachPx = MEADOW_ENTRY_PAINTED_V2_CAMERA_ROUTE_REACH_PX
): readonly PixelBounds[] {
	assertViewport(viewport);
	assertRouteReach(routeReachPx);
	return Object.freeze(
		route.slice(0, -1).map((first, index) => {
			const second = route[index + 1];
			if (second === undefined) throw new Error('Painted-v2 camera route has a missing endpoint');
			return Object.freeze(cameraEnvelopeForSegment(first, second, viewport, routeReachPx));
		})
	);
}

export function assertMeadowEntryPaintedV2CameraBoundsCovered(
	crops: readonly PixelBounds[],
	bounds: PixelBounds,
	label = 'camera bounds'
): void {
	const covered = crops
		.map((crop) => intersectBounds(crop, bounds))
		.filter((value): value is PixelBounds => value !== null);
	if (unionArea(covered) !== boundsArea(bounds)) {
		throw new Error(`Painted-v2 ${label} is not fully covered by the approved crop union`);
	}
}

export function assertMeadowEntryPaintedV2CameraEnvelopeCovered(
	crops: readonly PixelBounds[],
	route: readonly PaintedV2CameraRoutePoint[] = MEADOW_ENTRY_PAINTED_V2_CAMERA_SAFE_ROUTE,
	viewport: PaintedV2CameraViewport = MEADOW_ENTRY_PAINTED_V2_CAMERA_VIEWPORT,
	routeReachPx = MEADOW_ENTRY_PAINTED_V2_CAMERA_ROUTE_REACH_PX
): void {
	const envelopes = collectMeadowEntryPaintedV2CameraEnvelopes(route, viewport, routeReachPx);
	for (const [index, bounds] of envelopes.entries()) {
		assertMeadowEntryPaintedV2CameraBoundsCovered(
			crops,
			bounds,
			`camera envelope segment ${index}`
		);
	}
}
