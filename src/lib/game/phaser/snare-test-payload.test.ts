import { describe, expect, it } from 'vitest';

import { snareSetupFromPayload } from '$lib/game/core/snare-battle/encounter';
import { snareFightIds, snareFights, snareFightSetup } from '$lib/game/core/snare-battle/fights';
import { createSnareTestPayload } from '$lib/game/phaser/snare-test-payload';

describe('createSnareTestPayload', () => {
	it.each(snareFightIds)('%s: starts the same fight the simulator plays', (fightId) => {
		const payload = createSnareTestPayload(fightId);

		expect(snareSetupFromPayload(payload)).toMatchObject(snareFightSetup(fightId));
		expect(payload.sourceEncounterId).toBe(`battle-test:${fightId}`);
	});

	it.each(snareFightIds)('%s: carries the preset hero and items in a fresh save', (fightId) => {
		const fight = snareFights[fightId];
		const { saveState, hero } = createSnareTestPayload(fightId);

		expect(saveState.mapId).toBe(fight.mapId);
		expect(saveState.player).toMatchObject({ level: fight.hero.level, hp: fight.hero.maxHp });
		expect(saveState.inventory.stacks).toEqual(fight.items);
		expect(hero).toMatchObject({ hp: fight.hero.maxHp, maxHp: fight.hero.maxHp });
		expect(saveState.flags.clearedEncounters).toEqual([]);
	});
});
