import type { DefinitionRegistry, EnemyDefinition } from '$lib/game/core/types';
import type { LootTable } from '$lib/game/core/loot';

export interface EnemyCombatDefinition extends EnemyDefinition {
	xpReward: number;
	coinReward: number;
	loot?: LootTable;
	boss?: {
		phaseTwoColor: number;
	};
	/** A scripted loss: hero hits never take it below 1 HP, so the fight ends in defeat. */
	unbeatable?: true;
}

// Prologue enemies, tuned so the hero ends the trials near level 6 and the
// raid near level 7 (see the level curve in core/progression.ts).

export const forestWolf: EnemyCombatDefinition = {
	id: 'forest-wolf',
	baseHp: 10,
	baseAttack: 3,
	moveSpeed: 110,
	xpReward: 2,
	coinReward: 3,
	loot: { guaranteed: [], chance: [{ itemId: 'field-potion', quantity: 1, chance: 0.25 }] }
};

export const thornbackBoar: EnemyCombatDefinition = {
	id: 'thornback-boar',
	baseHp: 30,
	baseAttack: 4,
	moveSpeed: 95,
	xpReward: 6,
	coinReward: 8,
	loot: { guaranteed: [{ itemId: 'field-potion', quantity: 1 }], chance: [] }
};

export const mistToad: EnemyCombatDefinition = {
	id: 'mist-toad',
	baseHp: 14,
	baseAttack: 4,
	moveSpeed: 80,
	xpReward: 2,
	coinReward: 3,
	loot: { guaranteed: [], chance: [{ itemId: 'sunleaf-salve', quantity: 1, chance: 0.25 }] }
};

export const boarKing: EnemyCombatDefinition = {
	id: 'boar-king',
	baseHp: 80,
	baseAttack: 7,
	moveSpeed: 90,
	xpReward: 20,
	coinReward: 30,
	loot: { guaranteed: [{ itemId: 'greater-field-potion', quantity: 1 }], chance: [] },
	boss: { phaseTwoColor: 0xff8a3d }
};

export const humanSoldier: EnemyCombatDefinition = {
	id: 'human-soldier',
	baseHp: 24,
	baseAttack: 6,
	moveSpeed: 100,
	xpReward: 5,
	coinReward: 6,
	loot: { guaranteed: [], chance: [{ itemId: 'field-potion', quantity: 1, chance: 0.4 }] }
};

/** The raid's scripted loss: built to be unbeatable. */
export const sunCrestCaptain: EnemyCombatDefinition = {
	id: 'sun-crest-captain',
	baseHp: 999,
	baseAttack: 30,
	moveSpeed: 120,
	xpReward: 0,
	coinReward: 0,
	boss: { phaseTwoColor: 0xffd24d },
	unbeatable: true
};

export const tunnelCrawler: EnemyCombatDefinition = {
	id: 'tunnel-crawler',
	baseHp: 18,
	baseAttack: 5,
	moveSpeed: 85,
	xpReward: 3,
	coinReward: 2,
	loot: { guaranteed: [], chance: [{ itemId: 'sunleaf-salve', quantity: 1, chance: 0.3 }] }
};

export const enemyList: EnemyCombatDefinition[] = [
	forestWolf,
	thornbackBoar,
	mistToad,
	boarKing,
	humanSoldier,
	sunCrestCaptain,
	tunnelCrawler
];

export const enemies: DefinitionRegistry<EnemyCombatDefinition> = Object.fromEntries(
	enemyList.map((enemy) => [enemy.id, enemy])
);
