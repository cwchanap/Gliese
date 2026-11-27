import { describe, expect, it } from 'vitest';

import { eveningLight, lightingFor, raidLight } from './lighting';

describe('lightingFor', () => {
	it('keeps the proving day in plain daylight', () => {
		expect(
			lightingFor('overworld', { questId: 'prologue-trial-tracks', objectiveId: null })
		).toBeNull();
	});

	it('darkens the overworld for the evening and reddens it for the raid', () => {
		expect(
			lightingFor('overworld', { questId: 'prologue-hunters-name', objectiveId: 'go-to-sleep' })
		).toBe(eveningLight);
		expect(lightingFor('overworld', { questId: 'prologue-raid', objectiveId: null })).toBe(
			raidLight
		);
	});

	it('leaves interiors as painted', () => {
		expect(lightingFor('hero-house', { questId: 'prologue-raid', objectiveId: null })).toBe(null);
	});
});
