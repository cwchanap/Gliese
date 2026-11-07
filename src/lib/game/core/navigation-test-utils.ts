import { PLAYER_COLLISION_RADIUS } from './collision';
import {
	resolveMovementSegment,
	type MovementOptions,
	type NavigationGrid,
	type NavigationObstacle,
	type NavigationPoint
} from './navigation';

/**
 * Holds one direction for `frames` frames, resolving each frame like `WorldScene.update`
 * does (240px/s at 60fps is 4px a frame), and returns where the player ends up.
 */
export function walk(
	grid: NavigationGrid,
	obstacles: readonly NavigationObstacle[],
	from: NavigationPoint,
	direction: NavigationPoint,
	frames: number,
	options?: MovementOptions,
	stepPx = 4
): NavigationPoint {
	let position = from;
	for (let frame = 0; frame < frames; frame += 1) {
		position = resolveMovementSegment(
			grid,
			obstacles,
			position,
			{ x: position.x + direction.x * stepPx, y: position.y + direction.y * stepPx },
			PLAYER_COLLISION_RADIUS,
			options
		);
	}
	return position;
}
