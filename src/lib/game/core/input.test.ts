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
});
