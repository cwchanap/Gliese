import type { Direction } from '$lib/game/core/types';

export interface NearbyCandidate {
	readonly id: string;
	readonly x: number;
	readonly y: number;
	readonly radius: number;
}

export interface NearbySelection<TCandidate extends NearbyCandidate> {
	readonly origin: { readonly x: number; readonly y: number };
	readonly facing: Direction;
	readonly reach: number;
	readonly candidates: readonly TCandidate[];
	readonly requireFacing?: boolean;
}

function isFaced(dx: number, dy: number, facing: Direction): boolean {
	switch (facing) {
		case 'up':
			return dy < 0 && Math.abs(dy) >= Math.abs(dx);
		case 'down':
			return dy > 0 && Math.abs(dy) >= Math.abs(dx);
		case 'left':
			return dx < 0 && Math.abs(dx) >= Math.abs(dy);
		case 'right':
			return dx > 0 && Math.abs(dx) >= Math.abs(dy);
	}
}

export function selectNearbyCandidate<TCandidate extends NearbyCandidate>(
	selection: NearbySelection<TCandidate>
): TCandidate | undefined {
	const { origin, facing, reach, candidates, requireFacing } = selection;

	return candidates
		.map((candidate) => {
			const dx = candidate.x - origin.x;
			const dy = candidate.y - origin.y;
			return { candidate, faced: isFaced(dx, dy, facing), distance: Math.hypot(dx, dy) };
		})
		.filter(
			({ candidate, faced, distance }) =>
				distance <= reach + candidate.radius && (!requireFacing || faced)
		)
		.sort((left, right) => {
			if (left.faced !== right.faced) {
				return left.faced ? -1 : 1;
			}
			if (left.distance !== right.distance) {
				return left.distance - right.distance;
			}
			return left.candidate.id < right.candidate.id
				? -1
				: left.candidate.id > right.candidate.id
					? 1
					: 0;
		})[0]?.candidate;
}
