import { describe, expect, it } from 'vitest';
import { boarKing, enemies, forestWolf } from '$lib/game/content/enemies';
import { maps, meadowEntryMap } from '$lib/game/content/maps';
import { players, startingPlayer } from '$lib/game/content/player';

describe('game content scaffolding', () => {
	it('exposes a valid starting player registry entry', () => {
		expect(startingPlayer.id).toBe('hero');
		expect(players.hero).toBe(startingPlayer);
		expect(Object.keys(players)).toEqual(['hero']);
		expect('facing' in startingPlayer).toBe(false);
	});

	it('defines the prologue enemies in a registry', () => {
		expect(forestWolf.id).toBe('forest-wolf');
		expect(enemies['forest-wolf']).toBe(forestWolf);
		expect(enemies['boar-king']).toBe(boarKing);
	});

	it('defines the opening map in a registry', () => {
		expect(meadowEntryMap.id).toBe('meadow-entry');
		expect(maps['meadow-entry']).toBe(meadowEntryMap);
		expect(Object.keys(maps)).toContain('meadow-entry');
	});
});
