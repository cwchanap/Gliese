import type { SnareBattleSetup } from '$lib/game/core/snare-battle/battle';
import type { SnareEnemyId } from '$lib/game/core/snare-battle/tuning';

/** The fights the `?battleTest=` dev link can open. */
export const snareFightIds = ['wolves-2', 'wolves-3', 'boar-king'] as const;
export type SnareFightId = (typeof snareFightIds)[number];

export type SnareFight = {
	enemyId: SnareEnemyId;
	count: number;
	/** The preset hero: the level Grik has when he meets these enemies. */
	hero: { level: number; maxHp: number; attack: number };
	items: Array<{ itemId: string; quantity: number }>;
	/** Battle backdrop. */
	mapId: string;
};

export const snareFights: Record<SnareFightId, SnareFight> = {
	'wolves-2': {
		enemyId: 'forest-wolf',
		count: 2,
		hero: { level: 2, maxHp: 24, attack: 4 },
		items: [],
		mapId: 'overworld'
	},
	'wolves-3': {
		enemyId: 'forest-wolf',
		count: 3,
		hero: { level: 2, maxHp: 24, attack: 4 },
		items: [],
		mapId: 'overworld'
	},
	'boar-king': {
		enemyId: 'boar-king',
		count: 1,
		hero: { level: 6, maxHp: 40, attack: 8 },
		items: [{ itemId: 'field-potion', quantity: 3 }],
		mapId: 'overworld'
	}
};

export function isSnareFightId(value: unknown): value is SnareFightId {
	return typeof value === 'string' && (snareFightIds as readonly string[]).includes(value);
}

/** The fight as `createSnareBattle` takes it: Grik walks in at full HP. */
export function snareFightSetup(fightId: SnareFightId): SnareBattleSetup {
	const fight = snareFights[fightId];

	return {
		enemyId: fight.enemyId,
		count: fight.count,
		hero: { hp: fight.hero.maxHp, maxHp: fight.hero.maxHp, attack: fight.hero.attack, defense: 0 }
	};
}
