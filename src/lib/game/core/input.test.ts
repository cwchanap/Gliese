import { describe, expect, it } from 'vitest';
import { resolveMovementVector } from '$lib/game/core/input';

describe('movement input', () => {
	it('normalizes diagonal input', () => {
		const vector = resolveMovementVector({
			left: true,
			up: true,
			right: false,
			down: false
		});

		expect(vector.x).toBeLessThan(0);
		expect(vector.y).toBeLessThan(0);
		expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1, 5);
	});

	it('returns zero movement for idle input', () => {
		const vector = resolveMovementVector({
			left: false,
			right: false,
			up: false,
			down: false
		});

		expect(vector).toEqual({ x: 0, y: 0 });
	});

	it('cancels opposing horizontal directions', () => {
		const vector = resolveMovementVector({
			left: true,
			right: true,
			up: false,
			down: false
		});

		expect(vector).toEqual({ x: 0, y: 0 });
	});
});
