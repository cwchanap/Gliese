import { maps } from '$lib/game/content/maps';
import type { BattleStartPayload } from '$lib/game/core/battle';
import { getXpForLevel } from '$lib/game/core/progression';
import {
	snareFights,
	snareFightSetup,
	type SnareFightId
} from '$lib/game/core/snare-battle/fights';
import { createNewSaveState } from '$lib/game/save/save-state';

/**
 * The payload the world would send for a `?battleTest=<fight>` dev fight: a fresh
 * save with the fight's preset hero. It is never written to a save slot.
 */
export function createSnareTestPayload(fightId: SnareFightId): BattleStartPayload {
	const fight = snareFights[fightId];
	const { hero } = snareFightSetup(fightId);
	const map = maps[fight.mapId]!;
	const base = createNewSaveState();

	return {
		saveState: {
			...base,
			mapId: map.id,
			player: {
				...base.player,
				level: fight.hero.level,
				xp: getXpForLevel(fight.hero.level),
				hp: hero.hp,
				attack: hero.attack,
				x: map.spawn.x,
				y: map.spawn.y
			},
			inventory: { stacks: fight.items.map((item) => ({ ...item })), equipment: [] }
		},
		sourceMapId: map.id,
		sourceEncounterId: `battle-test:${fightId}`,
		sourceEnemyId: fight.enemyId,
		enemyCount: fight.count,
		hero
	};
}
