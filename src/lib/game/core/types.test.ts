import { describe, expect, it } from 'vitest';
import { slimeScout } from '$lib/game/content/enemies';
import { meadowEntryMap } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';

describe('game content scaffolding', () => {
	it('exposes a valid starting player id', () => {
		expect(startingPlayer.id).toBe('hero');
	});

	it('defines the first enemy archetype', () => {
		expect(slimeScout.id).toBe('slime-scout');
	});

	it('defines the opening map id', () => {
		expect(meadowEntryMap.id).toBe('meadow-entry');
	});
});
