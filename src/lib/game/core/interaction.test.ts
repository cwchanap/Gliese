import { describe, expect, it } from 'vitest';
import { selectNearbyCandidate } from '$lib/game/core/interaction';

function candidate(id: string, x: number, y: number, radius = 11) {
	return { id, x, y, radius };
}

describe('selectNearbyCandidate', () => {
	it('returns undefined when no candidate is in reach', () => {
		const selected = selectNearbyCandidate({
			origin: { x: 160, y: 400 },
			facing: 'up',
			reach: 48,
			candidates: [candidate('far-npc', 160, 300)]
		});

		expect(selected).toBeUndefined();
	});

	it('selects the only candidate inside its radius-extended reach', () => {
		const mott = candidate('mott-hearth', 128, 352);
		const selected = selectNearbyCandidate({
			origin: { x: 160, y: 400 },
			facing: 'down',
			reach: 48,
			candidates: [mott]
		});

		expect(selected).toBe(mott);
	});

	it('includes a candidate sitting exactly at the reach boundary', () => {
		const edge = candidate('edge-npc', 0, 59);
		const selected = selectNearbyCandidate({
			origin: { x: 0, y: 0 },
			facing: 'down',
			reach: 48,
			candidates: [edge]
		});

		expect(selected).toBe(edge);
	});

	it('extends the reach by each candidate radius independently', () => {
		const slim = candidate('slim-npc', 0, 60, 10);
		const wide = candidate('wide-npc', 0, 70, 30);
		const selected = selectNearbyCandidate({
			origin: { x: 0, y: 0 },
			facing: 'down',
			reach: 48,
			candidates: [slim, wide]
		});

		expect(selected).toBe(wide);
	});

	it('prefers the faced candidate over a closer unfaced one', () => {
		const mott = candidate('mott-hearth', 128, 352);
		const tikka = candidate('tikka-home', 192, 432);
		const selected = selectNearbyCandidate({
			origin: { x: 160, y: 400 },
			facing: 'up',
			reach: 48,
			candidates: [tikka, mott]
		});

		expect(selected).toBe(mott);
	});

	it('falls back to the nearest candidate when none is faced', () => {
		const mott = candidate('mott-hearth', 128, 352);
		const tikka = candidate('tikka-home', 192, 432);
		const selected = selectNearbyCandidate({
			origin: { x: 160, y: 400 },
			facing: 'left',
			reach: 48,
			candidates: [mott, tikka]
		});

		expect(selected).toBe(tikka);
	});

	it('does not face a candidate that sits more sideways than ahead', () => {
		const ahead = candidate('ahead-npc', 160, 352);
		const sideways = candidate('sideways-npc', 204, 396);
		const selected = selectNearbyCandidate({
			origin: { x: 160, y: 400 },
			facing: 'up',
			reach: 48,
			candidates: [sideways, ahead]
		});

		expect(selected).toBe(ahead);
	});

	it('breaks equal-distance ties by stable id regardless of input order', () => {
		const mott = candidate('mott-hearth', 128, 352);
		const tikka = candidate('tikka-home', 192, 432);
		const candidates = [mott, tikka];
		const reversed = [...candidates].reverse();

		for (const order of [candidates, reversed]) {
			const selected = selectNearbyCandidate({
				origin: { x: 160, y: 392 },
				facing: 'left',
				reach: 48,
				candidates: order
			});

			expect(selected).toBe(mott);
		}
	});
});
