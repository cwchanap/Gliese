import { describe, expect, it } from 'vitest';

import { players, startingPlayer } from '$lib/game/content/player';

describe('player content', () => {
	it('exports the hero starting definition', () => {
		expect(startingPlayer).toEqual({
			id: 'hero',
			baseHp: 20,
			baseAttack: 3,
			moveSpeed: 240
		});
	});

	it('registers the starting player in the content registry', () => {
		expect(players['hero']).toBe(startingPlayer);
		expect(Object.keys(players)).toEqual(['hero']);
	});
});
