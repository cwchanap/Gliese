import { describe, expect, it } from 'vitest';
import { enemies, ruinsWarden, slimeScout } from '$lib/game/content/enemies';
import { maps, meadowEntryMap } from '$lib/game/content/maps';
import { players, startingPlayer } from '$lib/game/content/player';

describe('game content scaffolding', () => {
	it('exposes a valid starting player registry entry', () => {
		expect(startingPlayer.id).toBe('hero');
		expect(players.hero).toBe(startingPlayer);
		expect(Object.keys(players)).toEqual(['hero']);
		expect('facing' in startingPlayer).toBe(false);
	});

	it('defines the first enemy archetype in a registry', () => {
		expect(slimeScout.id).toBe('slime-scout');
		expect(enemies['slime-scout']).toBe(slimeScout);
		expect(enemies['ruins-warden']).toBe(ruinsWarden);
		expect(Object.keys(enemies)).toContain('slime-scout');
	});

	it('defines the opening map in a registry', () => {
		expect(meadowEntryMap.id).toBe('meadow-entry');
		expect(maps['meadow-entry']).toBe(meadowEntryMap);
		expect(Object.keys(maps)).toContain('meadow-entry');
	});
});
