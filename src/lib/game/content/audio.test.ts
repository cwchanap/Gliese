import { describe, expect, it } from 'vitest';
import { ambienceFor } from '$lib/game/content/audio';

describe('ambienceFor', () => {
	it('plays the calm village by day, silence at night, the fire after the raid, and the tunnel underground', () => {
		const morning = { questId: 'prologue-proving-morning', objectiveId: null } as const;
		const evening = { questId: 'prologue-hunters-name', objectiveId: 'hear-motts-tale' } as const;
		const raid = { questId: 'prologue-raid', objectiveId: null } as const;

		expect(ambienceFor('overworld', morning)).toBe('amb-village');
		expect(ambienceFor('hero-house', morning)).toBeNull();
		expect(ambienceFor('overworld', evening)).toBeNull();
		expect(ambienceFor('overworld', raid)).toBe('amb-raid');
		expect(ambienceFor('ruins-threshold', raid)).toBe('amb-tunnel');
	});
});
