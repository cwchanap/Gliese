# Battle Scene Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move Gliese combat into a separate real-time Phaser `BattleScene` with 1-10 real enemies, blocking victory/defeat summaries, per-unit rewards and quest progress, and village respawn on defeat.

**Architecture:** Keep `WorldScene` as the exploration and permanent-save coordinator. Add pure battle/result helpers for deterministic tests, add `BattleScene` for transient arena combat, extend the HUD bridge for battle state and summary dismissal, and apply battle results through `WorldScene` after the summary has been dismissed.

**Tech Stack:** TypeScript, Svelte 5 runes, Phaser, Vite, Vitest, vitest-browser-svelte, Bun.

---

## Scope Check

This is one implementation slice. The contracts, BattleScene runtime, WorldScene handoff, HUD summary, localization, and tests depend on the same battle result boundary and should land together. Do not split it into unrelated branches.

## File Structure

- Create `src/lib/game/core/battle.ts`: battle payload/result types, enemy count roll, unit creation, grouped drop summaries, and pure save-result application.
- Create `src/lib/game/core/battle.test.ts`: deterministic tests for count generation, unit ids, grouped drops, victory save application, defeat save application, and per-unit quest progress.
- Modify `src/lib/game/core/quests.ts`: allow defeat events to carry a unit-level source id so one world encounter can count multiple generated enemies.
- Modify `src/lib/game/core/quests.test.ts`: prove same encounter id with different unit ids increments defeat objectives more than once.
- Create `src/lib/game/phaser/scenes/BattleScene.ts`: compact arena combat scene. It owns only transient hero/enemy positions, HP, auto-attacks, consumable use, summary emission, and return handoff.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: start `BattleScene` when an uncleared field encounter engages, stop field damage resolution, and apply `BattleResult` when returning from battle.
- Modify `src/lib/game/phaser/createGame.ts` and `src/lib/game/phaser/createGame.test.ts`: register `BattleScene`.
- Modify `src/lib/game/ui-bridge/events.ts`: add battle HUD state and `dismiss-battle-summary`.
- Modify `src/lib/game/ui-bridge/store.ts`: initialize battle HUD state and add `requestDismissBattleSummary`.
- Modify `src/lib/game/GameShell.svelte`: show battle summary, disable non-battle overlays, keep quick healing available, and dismiss summary.
- Modify `src/lib/game/i18n/messages/en.ts`, `ja.ts`, and `zh-Hant.ts`: add battle summary and battle lock strings.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: add scene-level tests for WorldScene/BattleScene handoff and runtime.
- Add a Svelte component test for summary behavior in `src/lib/game/GameShell.svelte.spec.ts` or extend an existing Svelte test file if the repo already has a suitable GameShell harness by the time this task is executed.

## Task 1: Pure Battle Contracts And Result Application

**Files:**
- Create: `src/lib/game/core/battle.ts`
- Create: `src/lib/game/core/battle.test.ts`

- [ ] **Step 1: Write failing tests for battle count, units, grouped drops, victory application, and defeat application**

Add `src/lib/game/core/battle.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { enemies } from '$lib/game/content/enemies';
import { openingMapId } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { mainQuestId } from '$lib/game/content/quests';
import { acceptQuest } from '$lib/game/core/quests';
import { createNewSaveState } from '$lib/game/save/save-state';
import {
	applyBattleResultToSaveState,
	buildBattleEnemyUnits,
	buildBattleUnitSourceId,
	groupBattleDrops,
	rollBattleEnemyCount,
	type BattleResult
} from './battle';

describe('battle contracts', () => {
	it('rolls an inclusive 1 to 10 enemy count', () => {
		expect(rollBattleEnemyCount(() => 0)).toBe(1);
		expect(rollBattleEnemyCount(() => 0.999)).toBe(10);
		expect(rollBattleEnemyCount(() => 0.5)).toBe(6);
	});

	it('creates indexed enemy units from one world encounter', () => {
		const units = buildBattleEnemyUnits({
			encounterId: 'meadow-slime-west',
			enemy: enemies['slime-scout']!,
			count: 3
		});

		expect(units).toEqual([
			expect.objectContaining({
				unitId: 'meadow-slime-west:unit:0',
				unitIndex: 0,
				enemyId: 'slime-scout',
				hp: 8,
				maxHp: 8,
				defeated: false
			}),
			expect.objectContaining({ unitId: 'meadow-slime-west:unit:1', unitIndex: 1 }),
			expect.objectContaining({ unitId: 'meadow-slime-west:unit:2', unitIndex: 2 })
		]);
		expect(buildBattleUnitSourceId('meadow-slime-west', 2)).toBe(
			'encounter:meadow-slime-west:unit:2'
		);
	});

	it('groups repeated item drops for summary display', () => {
		expect(
			groupBattleDrops([
				{ itemId: 'field-potion', quantity: 1 },
				{ itemId: 'field-potion', quantity: 2 },
				{ itemId: 'greater-field-potion', quantity: 1 }
			])
		).toEqual([
			{ itemId: 'field-potion', quantity: 3 },
			{ itemId: 'greater-field-potion', quantity: 1 }
		]);
	});

	it('applies a victory result with per-unit rewards, drops, quest progress, and one cleared marker', () => {
		const accepted = acceptQuest({
			state: {
				...createNewSaveState().quests,
				completedObjectives: { [mainQuestId]: ['talk-to-guild-master'] }
			},
			questId: 'thin-village-slimes',
			worldFlags: {
				clearedEncounterIds: new Set(),
				collectedPickupIds: new Set()
			}
		});
		expect(accepted.accepted).toBe(true);

		const saveState = {
			...createNewSaveState(),
			quests: accepted.accepted ? accepted.state : createNewSaveState().quests
		};
		const result: BattleResult = {
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			completion: undefined,
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 14,
			inventory: saveState.inventory,
			defeatedUnits: [
				{
					unitId: 'meadow-slime-west:unit:0',
					unitIndex: 0,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: [{ itemId: 'field-potion', quantity: 1 }]
				},
				{
					unitId: 'meadow-slime-west:unit:1',
					unitIndex: 1,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: []
				},
				{
					unitId: 'meadow-slime-west:unit:2',
					unitIndex: 2,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: [{ itemId: 'field-potion', quantity: 1 }]
				}
			]
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.saveState.player).toMatchObject({
			hp: 18,
			level: 2,
			xp: 12,
			attack: 4,
			x: 4_928,
			y: 1_024,
			facing: 'down'
		});
		expect(application.saveState.wallet.coins).toBe(42);
		expect(application.saveState.flags.clearedEncounters).toEqual(['meadow-slime-west']);
		expect(application.saveState.flags.resolvedEncounterDrops).toEqual({
			'meadow-slime-west': [{ itemId: 'field-potion', quantity: 2 }]
		});
		expect(application.saveState.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 3 }
		]);
		expect(application.saveState.quests.entries['thin-village-slimes']).toMatchObject({
			status: 'completed',
			progress: 3,
			countedSourceIds: [
				'encounter:meadow-slime-west:unit:0',
				'encounter:meadow-slime-west:unit:1',
				'encounter:meadow-slime-west:unit:2'
			]
		});
		expect(application.summary).toMatchObject({
			outcome: 'victory',
			enemiesDefeated: 3,
			xpGained: 12,
			coinsGained: 12,
			leveledUp: true,
			drops: [{ itemId: 'field-potion', quantity: 2 }]
		});
	});

	it('applies a defeat result by sending the hero to meadow-entry at 1 HP without rewards', () => {
		const saveState = {
			...createNewSaveState(),
			mapId: 'ruins-threshold',
			player: {
				...createNewSaveState().player,
				x: 512,
				y: 3_200,
				facing: 'right' as const,
				hp: 6
			}
		};
		const result: BattleResult = {
			outcome: 'defeat',
			sourceMapId: 'ruins-threshold',
			sourceEncounterId: 'threshold-slime-west',
			sourceEnemyId: 'slime-scout',
			completion: undefined,
			returnPosition: { mapId: 'ruins-threshold', x: 512, y: 3_200, facing: 'right' },
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		};

		const application = applyBattleResultToSaveState(saveState, result);

		expect(application.saveState.mapId).toBe(openingMapId);
		expect(application.saveState.player).toMatchObject({
			hp: 1,
			x: 1_536,
			y: 5_550,
			facing: 'up'
		});
		expect(application.saveState.wallet.coins).toBe(30);
		expect(application.saveState.flags.clearedEncounters).toEqual([]);
		expect(application.saveState.flags.resolvedEncounterDrops).toEqual({});
		expect(application.summary).toMatchObject({
			outcome: 'defeat',
			enemiesDefeated: 0,
			xpGained: 0,
			coinsGained: 0,
			drops: []
		});
	});
});
```

- [ ] **Step 2: Run the battle helper test to verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/battle.test.ts
```

Expected: FAIL because `src/lib/game/core/battle.ts` does not exist.

- [ ] **Step 3: Implement battle contracts and pure save application**

Create `src/lib/game/core/battle.ts`:

```ts
import { enemies, type EnemyCombatDefinition } from '$lib/game/content/enemies';
import { maps, openingMapId } from '$lib/game/content/maps';
import { addItem } from '$lib/game/core/inventory';
import type { ItemDrop } from '$lib/game/core/loot';
import { applyExperienceGain, type ProgressionState } from '$lib/game/core/progression';
import { applyQuestEvent, type QuestRewardGrant } from '$lib/game/core/quests';
import type { Direction } from '$lib/game/core/types';
import type { SaveState } from '$lib/game/save/save-state';

export const battleEnemyCountRange = { min: 1, max: 10 } as const;

export type BattleOutcome = 'victory' | 'defeat';

export type BattleReturnPosition = {
	mapId: string;
	x: number;
	y: number;
	facing: Direction;
};

export type BattleEnemyUnit = {
	unitId: string;
	unitIndex: number;
	enemyId: string;
	hp: number;
	maxHp: number;
	attack: number;
	moveSpeed: number;
	xpReward: number;
	coinReward: number;
	defeated: boolean;
};

export type BattleDefeatedUnit = {
	unitId: string;
	unitIndex: number;
	enemyId: string;
	xpReward: number;
	coinReward: number;
	drops: ItemDrop[];
};

export type BattleStartPayload = {
	saveState: SaveState;
	sourceMapId: string;
	sourceEncounterId: string;
	sourceEnemyId: string;
	completion?: 'victory';
	returnPosition: BattleReturnPosition;
	enemyCount: number;
	hero: {
		hp: number;
		maxHp: number;
		attack: number;
		defense: number;
	};
};

export type BattleResult = {
	outcome: BattleOutcome;
	sourceMapId: string;
	sourceEncounterId: string;
	sourceEnemyId: string;
	completion?: 'victory';
	returnPosition: BattleReturnPosition;
	finalHeroHp: number;
	inventory: SaveState['inventory'];
	defeatedUnits: BattleDefeatedUnit[];
};

export type BattleSummary = {
	outcome: BattleOutcome;
	enemiesDefeated: number;
	xpGained: number;
	coinsGained: number;
	drops: ItemDrop[];
	leveledUp: boolean;
	completedQuestIds: string[];
	questRewards: QuestRewardGrant[];
};

export type BattleApplication = {
	saveState: SaveState;
	summary: BattleSummary;
};

export function rollBattleEnemyCount(random: () => number = Math.random): number {
	const roll = Math.min(Math.max(random(), 0), 0.999_999);
	const span = battleEnemyCountRange.max - battleEnemyCountRange.min + 1;
	return battleEnemyCountRange.min + Math.floor(roll * span);
}

export function buildBattleUnitId(encounterId: string, unitIndex: number): string {
	return `${encounterId}:unit:${unitIndex}`;
}

export function buildBattleUnitSourceId(encounterId: string, unitIndex: number): string {
	return `encounter:${encounterId}:unit:${unitIndex}`;
}

export function buildBattleEnemyUnits({
	encounterId,
	enemy,
	count
}: {
	encounterId: string;
	enemy: EnemyCombatDefinition;
	count: number;
}): BattleEnemyUnit[] {
	const safeCount = Math.min(
		Math.max(Math.trunc(count), battleEnemyCountRange.min),
		battleEnemyCountRange.max
	);

	return Array.from({ length: safeCount }, (_, unitIndex) => ({
		unitId: buildBattleUnitId(encounterId, unitIndex),
		unitIndex,
		enemyId: enemy.id,
		hp: enemy.baseHp,
		maxHp: enemy.baseHp,
		attack: enemy.baseAttack,
		moveSpeed: enemy.moveSpeed,
		xpReward: enemy.xpReward,
		coinReward: enemy.coinReward,
		defeated: false
	}));
}

export function groupBattleDrops(drops: ItemDrop[]): ItemDrop[] {
	const quantities = new Map<string, number>();

	for (const drop of drops) {
		quantities.set(drop.itemId, (quantities.get(drop.itemId) ?? 0) + drop.quantity);
	}

	return Array.from(quantities.entries()).map(([itemId, quantity]) => ({ itemId, quantity }));
}

export function applyBattleResultToSaveState(
	saveState: SaveState,
	result: BattleResult
): BattleApplication {
	if (result.outcome === 'defeat') {
		return applyBattleDefeat(saveState, result);
	}

	return applyBattleVictory(saveState, result);
}

function applyBattleVictory(saveState: SaveState, result: BattleResult): BattleApplication {
	const defeatedUnits = result.defeatedUnits;
	const xpGained = defeatedUnits.reduce((total, unit) => total + unit.xpReward, 0);
	const coinsGained = defeatedUnits.reduce((total, unit) => total + unit.coinReward, 0);
	const drops = groupBattleDrops(defeatedUnits.flatMap((unit) => unit.drops));
	const previousLevel = saveState.player.level;
	let inventory = result.inventory;

	for (const drop of drops) {
		inventory = addItem(inventory, drop.itemId, drop.quantity);
	}

	let progression = applyProgressionReward(
		{
			level: saveState.player.level,
			xp: saveState.player.xp,
			hp: result.finalHeroHp,
			attack: saveState.player.attack
		},
		xpGained
	);
	let quests = saveState.quests;
	const questRewards: QuestRewardGrant[] = [];
	const completedQuestIds: string[] = [];

	for (const unit of defeatedUnits) {
		const questResult = applyQuestEvent({
			state: quests,
			event: {
				type: 'defeat-enemy',
				mapId: result.sourceMapId,
				encounterId: result.sourceEncounterId,
				enemyId: unit.enemyId,
				completion: result.completion,
				sourceId: `unit:${unit.unitIndex}`
			}
		});
		quests = questResult.state;
		questRewards.push(...questResult.rewards);
		completedQuestIds.push(...questResult.completedQuestIds);
	}

	for (const grant of questRewards) {
		if (grant.reward.xp) {
			progression = applyProgressionReward(progression, grant.reward.xp);
		}

		for (const item of grant.reward.items ?? []) {
			inventory = addItem(inventory, item.itemId, item.quantity);
		}
	}

	const nextSaveState: SaveState = {
		...saveState,
		mapId: result.returnPosition.mapId,
		player: {
			...saveState.player,
			level: progression.level,
			xp: progression.xp,
			hp: progression.hp,
			attack: progression.attack,
			x: result.returnPosition.x,
			y: result.returnPosition.y,
			facing: result.returnPosition.facing
		},
		flags: {
			...saveState.flags,
			clearedEncounters: Array.from(
				new Set([...saveState.flags.clearedEncounters, result.sourceEncounterId])
			).sort(),
			resolvedEncounterDrops: {
				...saveState.flags.resolvedEncounterDrops,
				[result.sourceEncounterId]: drops
			}
		},
		inventory,
		wallet: {
			coins:
				saveState.wallet.coins +
				coinsGained +
				questRewards.reduce((total, grant) => total + (grant.reward.coins ?? 0), 0)
		},
		quests
	};

	return {
		saveState: nextSaveState,
		summary: {
			outcome: 'victory',
			enemiesDefeated: defeatedUnits.length,
			xpGained,
			coinsGained,
			drops,
			leveledUp: progression.level > previousLevel,
			completedQuestIds: Array.from(new Set(completedQuestIds)),
			questRewards
		}
	};
}

function applyBattleDefeat(saveState: SaveState, result: BattleResult): BattleApplication {
	const meadowEntry = maps[openingMapId]!;

	return {
		saveState: {
			...saveState,
			mapId: openingMapId,
			player: {
				...saveState.player,
				hp: 1,
				x: meadowEntry.spawn.x,
				y: meadowEntry.spawn.y,
				facing: meadowEntry.spawnDirection
			},
			inventory: result.inventory
		},
		summary: {
			outcome: 'defeat',
			enemiesDefeated: 0,
			xpGained: 0,
			coinsGained: 0,
			drops: [],
			leveledUp: false,
			completedQuestIds: [],
			questRewards: []
		}
	};
}

function applyProgressionReward(state: ProgressionState, xpReward: number): ProgressionState {
	if (xpReward <= 0) {
		return state;
	}

	if (state.level === 1) {
		return applyExperienceGain(state, xpReward);
	}

	return { ...state, xp: state.xp + xpReward };
}

export function getBattleEnemyDefinition(enemyId: string): EnemyCombatDefinition {
	return enemies[enemyId] ?? enemies['slime-scout']!;
}
```

- [ ] **Step 4: Run the battle helper test to verify it passes**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/battle.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit pure battle helpers**

```sh
git add src/lib/game/core/battle.ts src/lib/game/core/battle.test.ts
git commit -m "feat: add battle result helpers"
```

## Task 2: Unit-Level Quest Source IDs

**Files:**
- Modify: `src/lib/game/core/quests.ts`
- Modify: `src/lib/game/core/quests.test.ts`
- Test: `src/lib/game/core/quests.test.ts`

- [ ] **Step 1: Add a failing quest test for multiple units from one encounter**

Add this test near the existing defeat-enemy quest tests in `src/lib/game/core/quests.test.ts`:

```ts
it('counts defeat enemy events from separate battle units in one world encounter', () => {
	const accepted = acceptQuest({
		state: {
			...createInitialQuestState(),
			completedObjectives: { [mainQuestId]: ['talk-to-guild-master'] }
		},
		questId: 'thin-village-slimes',
		worldFlags: {
			clearedEncounterIds: new Set(),
			collectedPickupIds: new Set()
		}
	});
	expect(accepted.accepted).toBe(true);

	const first = applyQuestEvent({
		state: accepted.accepted ? accepted.state : createInitialQuestState(),
		event: {
			type: 'defeat-enemy',
			mapId: 'meadow-entry',
			encounterId: 'meadow-slime-west',
			enemyId: 'slime-scout',
			sourceId: 'unit:0'
		}
	});
	const second = applyQuestEvent({
		state: first.state,
		event: {
			type: 'defeat-enemy',
			mapId: 'meadow-entry',
			encounterId: 'meadow-slime-west',
			enemyId: 'slime-scout',
			sourceId: 'unit:1'
		}
	});

	expect(second.state.entries['thin-village-slimes']).toMatchObject({
		progress: 2,
		countedSourceIds: [
			'encounter:meadow-slime-west:unit:0',
			'encounter:meadow-slime-west:unit:1'
		]
	});
	expect(second.rewards).toEqual([]);
});
```

- [ ] **Step 2: Run the quest test to verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/quests.test.ts
```

Expected: FAIL because `QuestEvent` does not accept `sourceId`.

- [ ] **Step 3: Extend defeat quest events with `sourceId`**

In `src/lib/game/core/quests.ts`, change the defeat event type to:

```ts
| {
		type: 'defeat-enemy';
		mapId: string;
		encounterId: string;
		enemyId: string;
		completion?: 'victory';
		sourceId?: string;
  }
```

Replace `getQuestEventSourceId` with:

```ts
function getQuestEventSourceId(event: QuestEvent, objective: QuestObjective): string | null {
	if (objective.kind === 'defeat-enemy' && event.type === 'defeat-enemy') {
		return event.sourceId
			? `encounter:${event.encounterId}:${event.sourceId}`
			: `encounter:${event.encounterId}`;
	}

	if (objective.kind === 'collect-item' && event.type === 'collect-item') {
		return `pickup:${event.pickupId}`;
	}

	return null;
}
```

- [ ] **Step 4: Run quest and battle tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/quests.test.ts src/lib/game/core/battle.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit quest source ids**

```sh
git add src/lib/game/core/quests.ts src/lib/game/core/quests.test.ts
git commit -m "feat: count battle units in quest progress"
```

## Task 3: Register BattleScene

**Files:**
- Create: `src/lib/game/phaser/scenes/BattleScene.ts`
- Modify: `src/lib/game/phaser/createGame.ts`
- Modify: `src/lib/game/phaser/createGame.test.ts`

- [ ] **Step 1: Add a failing createGame test that expects BattleScene registration**

In `src/lib/game/phaser/createGame.test.ts`, import `BattleScene` and update the scene assertion:

```ts
const { BattleScene } = await import('$lib/game/phaser/scenes/BattleScene');
```

Change:

```ts
scene: [BootScene, WorldScene]
```

to:

```ts
scene: [BootScene, WorldScene, BattleScene]
```

- [ ] **Step 2: Run the createGame test to verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/createGame.test.ts
```

Expected: FAIL because `BattleScene.ts` does not exist or is not registered.

- [ ] **Step 3: Add the initial BattleScene file**

Create `src/lib/game/phaser/scenes/BattleScene.ts`:

```ts
import * as Phaser from 'phaser';

import type { BattleStartPayload } from '$lib/game/core/battle';

export class BattleScene extends Phaser.Scene {
	static readonly key = 'battle';
	private payload: BattleStartPayload | null = null;

	constructor() {
		super(BattleScene.key);
	}

	create(payload: BattleStartPayload) {
		this.payload = payload;
		this.cameras.main.setBackgroundColor('#17231f');
	}

	getBattlePayloadForTest() {
		return this.payload;
	}
}
```

Modify `src/lib/game/phaser/createGame.ts`:

```ts
import { BootScene } from '$lib/game/phaser/scenes/BootScene';
import { BattleScene } from '$lib/game/phaser/scenes/BattleScene';
import { WorldScene } from '$lib/game/phaser/scenes/WorldScene';
```

and:

```ts
scene: [BootScene, WorldScene, BattleScene]
```

- [ ] **Step 4: Run the createGame test**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/createGame.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit BattleScene registration**

```sh
git add src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/createGame.ts src/lib/game/phaser/createGame.test.ts
git commit -m "feat: register battle scene"
```

## Task 4: BattleScene Runtime

**Files:**
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add failing BattleScene tests to `scenes.test.ts`**

Add imports inside the test bodies rather than at file top, matching the existing dynamic import pattern:

```ts
it('BattleScene spawns real generated enemies around the compact arena', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { BattleScene } = await import('./BattleScene');
	const scene = new BattleScene();
	const saveState = createNewSaveState();

	scene.create({
		saveState,
		sourceMapId: 'meadow-entry',
		sourceEncounterId: 'meadow-slime-west',
		sourceEnemyId: 'slime-scout',
		returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
		enemyCount: 4,
		hero: { hp: 20, maxHp: 20, attack: 4, defense: 0 }
	});

	const state = scene as unknown as {
		enemies: Array<{ unitId: string; hp: number; defeated: boolean; x: number; y: number }>;
	};

	expect(state.enemies).toHaveLength(4);
	expect(state.enemies.map((enemy) => enemy.unitId)).toEqual([
		'meadow-slime-west:unit:0',
		'meadow-slime-west:unit:1',
		'meadow-slime-west:unit:2',
		'meadow-slime-west:unit:3'
	]);
	expect(state.enemies.every((enemy) => enemy.hp === 8 && !enemy.defeated)).toBe(true);
});

it('BattleScene produces a victory result after all generated enemies are defeated', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { BattleScene } = await import('./BattleScene');
	const scene = new BattleScene();
	const saveState = createNewSaveState();

	scene.create({
		saveState,
		sourceMapId: 'meadow-entry',
		sourceEncounterId: 'meadow-slime-west',
		sourceEnemyId: 'slime-scout',
		returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
		enemyCount: 2,
		hero: { hp: 20, maxHp: 20, attack: 8, defense: 0 }
	});
	Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
	const state = scene as unknown as {
		enemies: Array<{ x: number; y: number; hp: number }>;
		pendingResult: unknown;
	};
	state.enemies[0]!.x = 330;
	state.enemies[0]!.y = 180;
	state.enemies[1]!.x = 330;
	state.enemies[1]!.y = 190;

	scene.update(0, 16);
	scene.update(500, 16);

	expect(state.pendingResult).toMatchObject({
		outcome: 'victory',
		sourceEncounterId: 'meadow-slime-west',
		defeatedUnits: [
			expect.objectContaining({ unitId: 'meadow-slime-west:unit:0' }),
			expect.objectContaining({ unitId: 'meadow-slime-west:unit:1' })
		]
	});
});

it('BattleScene produces a defeat result when hero HP reaches zero', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { BattleScene } = await import('./BattleScene');
	const scene = new BattleScene();
	const saveState = createNewSaveState();

	scene.create({
		saveState,
		sourceMapId: 'meadow-entry',
		sourceEncounterId: 'meadow-slime-west',
		sourceEnemyId: 'slime-scout',
		returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
		enemyCount: 1,
		hero: { hp: 1, maxHp: 20, attack: 1, defense: 0 }
	});
	Object.assign(phaserState.playerMarker, { x: 320, y: 180 });
	const state = scene as unknown as {
		enemies: Array<{ x: number; y: number; attackCooldownUntil: number }>;
		pendingResult: unknown;
	};
	state.enemies[0]!.x = 320;
	state.enemies[0]!.y = 180;
	state.enemies[0]!.attackCooldownUntil = 0;

	scene.update(0, 16);

	expect(state.pendingResult).toMatchObject({
		outcome: 'defeat',
		sourceEncounterId: 'meadow-slime-west',
		finalHeroHp: 0,
		defeatedUnits: []
	});
});
```

- [ ] **Step 2: Run scene tests to verify BattleScene runtime fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `BattleScene` does not yet spawn enemies or produce results.

- [ ] **Step 3: Replace BattleScene shell with compact arena runtime**

In `src/lib/game/phaser/scenes/BattleScene.ts`, keep the class name and add this state and runtime code:

```ts
import * as Phaser from 'phaser';

import {
	applyBattleResultToSaveState,
	buildBattleEnemyUnits,
	getBattleEnemyDefinition,
	type BattleDefeatedUnit,
	type BattleEnemyUnit,
	type BattleResult,
	type BattleStartPayload
} from '$lib/game/core/battle';
import { canReceiveHit, resolveHit } from '$lib/game/core/combat';
import { consumeStackItem } from '$lib/game/core/inventory';
import { resolveLootDrops } from '$lib/game/core/loot';
import { resolveMovementVector } from '$lib/game/core/input';
import { getItem } from '$lib/game/content/items';
import {
	animationPackAsset,
	getActorAnimationAsset,
	getEnemyActorId,
	type ActorAnimationKey
} from '$lib/game/content/assets';
import { emitHudState, onHudCommand, type HudCommand } from '$lib/game/ui-bridge/events';
import { t } from '$lib/game/i18n/translate';
import { getActiveLocale } from '$lib/game/i18n/store';
import { WorldScene } from './WorldScene';

type DirectionKey = { isDown: boolean };
type ActorMarker = {
	x: number;
	y: number;
	clearTint: () => unknown;
	setDisplaySize: (width: number, height: number) => unknown;
	setTint: (color: number) => unknown;
	setVisible: (visible: boolean) => unknown;
	play: (key: string, ignoreIfPlaying?: boolean) => unknown;
	once: (event: string, callback: () => void) => unknown;
};
type OverlayMarker = {
	setPosition: (x: number, y: number) => unknown;
	setScale: (x: number, y?: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};
type BattleEnemyInstance = BattleEnemyUnit & {
	attackCooldownUntil: number;
	healthBarBg: OverlayMarker;
	healthBarFill: OverlayMarker;
	invulnerableUntil: number;
	marker: ActorMarker;
	x: number;
	y: number;
};

export class BattleScene extends Phaser.Scene {
	static readonly key = 'battle';
	private static readonly arena = { width: 640, height: 360, padding: 34 };
	private static readonly playerRadius = 12;
	private static readonly enemyRadius = 10;
	private static readonly attackReach = 40;
	private static readonly autoAttackCooldownMs = 450;
	private static readonly enemyInvulnerabilityMs = 250;
	private static readonly enemyAttackReach = 40;
	private static readonly maxMovementDeltaMs = 250;
	private static readonly enemyHealthBarOffsetY = 34;
	private cursorKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;
	private defeatedUnits: BattleDefeatedUnit[] = [];
	private enemies: BattleEnemyInstance[] = [];
	private hero = { hp: 1, maxHp: 1, attack: 1, defense: 0 };
	private heroAttackCooldownUntil = 0;
	private heroInvulnerableUntil = 0;
	private inventory: BattleStartPayload['saveState']['inventory'] | null = null;
	private payload: BattleStartPayload | null = null;
	private pendingResult: BattleResult | null = null;
	private player?: ActorMarker;
	private removeHudCommandListener = () => {};
	private wasdKeys?: Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>>;

	constructor() {
		super(BattleScene.key);
	}

	create(payload: BattleStartPayload) {
		this.payload = payload;
		this.inventory = {
			stacks: payload.saveState.inventory.stacks.map((stack) => ({ ...stack })),
			equipment: [...payload.saveState.inventory.equipment]
		};
		this.hero = { ...payload.hero };
		this.pendingResult = null;
		this.defeatedUnits = [];
		this.enemies = [];
		this.cameras.main.setBackgroundColor('#17231f');
		this.add.rectangle(320, 180, 584, 304, 0x203d31, 1);
		this.add.rectangle(320, 180, 552, 272, 0x2f6b48, 0.45);
		this.createHero();
		this.createEnemies(payload);
		this.cursorKeys = this.input?.keyboard?.createCursorKeys?.();
		this.wasdKeys = this.input?.keyboard?.addKeys?.({
			left: Phaser.Input.Keyboard.KeyCodes.A,
			right: Phaser.Input.Keyboard.KeyCodes.D,
			up: Phaser.Input.Keyboard.KeyCodes.W,
			down: Phaser.Input.Keyboard.KeyCodes.S
		}) as Partial<Record<'left' | 'right' | 'up' | 'down', DirectionKey>> | undefined;
		this.removeHudCommandListener();
		this.removeHudCommandListener = onHudCommand((command) => this.handleHudCommand(command));
		this.events?.once?.('shutdown', () => this.removeHudCommandListener());
		this.publishHudState(t(getActiveLocale(), 'status.battleStarted'));
	}

	update(time: number, delta: number) {
		if (!this.player || !this.payload || this.pendingResult) return;
		this.updateHeroMovement(delta);
		this.tryHeroAttack(time);
		this.updateEnemyBehavior(time, delta);
	}

	private createHero() {
		const heroAnimation = getActorAnimationAsset('hero');
		this.player = this.add.sprite(
			320,
			180,
			animationPackAsset.key,
			heroAnimation.clips.idle.frames[0]
		) as ActorMarker;
		this.player.setDisplaySize(heroAnimation.displaySize.width, heroAnimation.displaySize.height);
		this.player.play(heroAnimation.clips.idle.key, true);
	}

	private createEnemies(payload: BattleStartPayload) {
		const definition = getBattleEnemyDefinition(payload.sourceEnemyId);
		const units = buildBattleEnemyUnits({
			encounterId: payload.sourceEncounterId,
			enemy: definition,
			count: payload.enemyCount
		});
		const positions = this.getEnemySpawnPositions(units.length);

		this.enemies = units.map((unit, index) => {
			const position = positions[index]!;
			const actorAnimation = getActorAnimationAsset(getEnemyActorId(unit.enemyId));
			const marker = this.add.sprite(
				position.x,
				position.y,
				animationPackAsset.key,
				actorAnimation.clips.idle.frames[0]
			) as ActorMarker;
			const healthBarBg = this.add.rectangle(
				position.x,
				position.y - BattleScene.enemyHealthBarOffsetY,
				34,
				4,
				0x0f172a,
				0.92
			) as OverlayMarker;
			const healthBarFill = this.add.rectangle(
				position.x,
				position.y - BattleScene.enemyHealthBarOffsetY,
				30,
				2,
				0xff5d8f,
				1
			) as OverlayMarker;
			marker.setDisplaySize(actorAnimation.displaySize.width, actorAnimation.displaySize.height);
			marker.play(actorAnimation.clips.idle.key, true);
			return {
				...unit,
				attackCooldownUntil: 0,
				healthBarBg,
				healthBarFill,
				invulnerableUntil: 0,
				marker,
				x: position.x,
				y: position.y
			};
		});
	}

	private getEnemySpawnPositions(count: number): Array<{ x: number; y: number }> {
		const centerX = BattleScene.arena.width / 2;
		const centerY = BattleScene.arena.height / 2;
		const radiusX = 230;
		const radiusY = 122;
		return Array.from({ length: count }, (_, index) => {
			const angle = (Math.PI * 2 * index) / Math.max(count, 1) - Math.PI / 2;
			return {
				x: centerX + Math.cos(angle) * radiusX,
				y: centerY + Math.sin(angle) * radiusY
			};
		});
	}

	private updateHeroMovement(delta: number) {
		if (!this.player) return;
		const direction = resolveMovementVector({
			left: Boolean(this.cursorKeys?.left?.isDown || this.wasdKeys?.left?.isDown),
			right: Boolean(this.cursorKeys?.right?.isDown || this.wasdKeys?.right?.isDown),
			up: Boolean(this.cursorKeys?.up?.isDown || this.wasdKeys?.up?.isDown),
			down: Boolean(this.cursorKeys?.down?.isDown || this.wasdKeys?.down?.isDown)
		});
		const step = 140 * (Math.min(delta, BattleScene.maxMovementDeltaMs) / 1000);
		this.player.x = Phaser.Math.Clamp(
			this.player.x + direction.x * step,
			BattleScene.arena.padding,
			BattleScene.arena.width - BattleScene.arena.padding
		);
		this.player.y = Phaser.Math.Clamp(
			this.player.y + direction.y * step,
			BattleScene.arena.padding,
			BattleScene.arena.height - BattleScene.arena.padding
		);
	}

	private tryHeroAttack(time: number) {
		if (!this.player || time < this.heroAttackCooldownUntil) return;
		const target = this.enemies
			.filter((enemy) => !enemy.defeated && canReceiveHit(enemy, time))
			.map((enemy) => ({
				enemy,
				distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, enemy.x, enemy.y)
			}))
			.filter(
				({ distance }) =>
					distance <= BattleScene.playerRadius + BattleScene.enemyRadius + BattleScene.attackReach
			)
			.sort((left, right) => left.distance - right.distance)[0]?.enemy;

		if (!target) return;
		this.heroAttackCooldownUntil = time + BattleScene.autoAttackCooldownMs;
		this.player.play(getActorAnimationAsset('hero').clips.attack.key, false);
		target.hp = resolveHit({ hp: target.hp, defense: 0 }, { power: this.hero.attack }).hp;
		target.invulnerableUntil = time + BattleScene.enemyInvulnerabilityMs;
		this.updateEnemyHealthBar(target);

		if (target.hp === 0) {
			this.finishEnemy(target);
		} else {
			target.marker.setTint(0xfff0a8);
		}
	}

	private finishEnemy(enemy: BattleEnemyInstance) {
		if (enemy.defeated || !this.payload) return;
		enemy.defeated = true;
		enemy.marker.play(
			getActorAnimationAsset(getEnemyActorId(enemy.enemyId)).clips.dead.key,
			false
		);
		enemy.marker.setVisible(false);
		enemy.healthBarBg.setVisible(false);
		enemy.healthBarFill.setVisible(false);
		this.defeatedUnits.push({
			unitId: enemy.unitId,
			unitIndex: enemy.unitIndex,
			enemyId: enemy.enemyId,
			xpReward: enemy.xpReward,
			coinReward: enemy.coinReward,
			drops: resolveLootDrops(getBattleEnemyDefinition(enemy.enemyId).loot)
		});

		if (this.enemies.every((candidate) => candidate.defeated)) {
			this.finishBattle('victory');
		}
	}

	private updateEnemyBehavior(time: number, delta: number) {
		if (!this.player) return;
		for (const enemy of this.enemies) {
			if (enemy.defeated) continue;
			const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
			const chaseStep = enemy.moveSpeed * (Math.min(delta, BattleScene.maxMovementDeltaMs) / 1000);
			if (distance > BattleScene.enemyAttackReach) {
				enemy.x += ((this.player.x - enemy.x) / distance) * Math.min(chaseStep, distance);
				enemy.y += ((this.player.y - enemy.y) / distance) * Math.min(chaseStep, distance);
				enemy.marker.x = enemy.x;
				enemy.marker.y = enemy.y;
				this.updateEnemyHealthBar(enemy);
			}
			if (
				distance <= BattleScene.enemyAttackReach &&
				time >= enemy.attackCooldownUntil &&
				time >= this.heroInvulnerableUntil
			) {
				this.hero.hp = resolveHit(
					{ hp: this.hero.hp, defense: this.hero.defense },
					{ power: enemy.attack }
				).hp;
				enemy.attackCooldownUntil = time + 700;
				this.heroInvulnerableUntil = time + 500;
				enemy.marker.play(
					getActorAnimationAsset(getEnemyActorId(enemy.enemyId)).clips.attack.key,
					false
				);
				if (this.hero.hp === 0) {
					this.finishBattle('defeat');
					return;
				}
				this.publishHudState(t(getActiveLocale(), 'status.enemyStruckFirst'));
			}
		}
	}

	private finishBattle(outcome: 'victory' | 'defeat') {
		if (!this.payload || !this.inventory || this.pendingResult) return;
		this.pendingResult = {
			outcome,
			sourceMapId: this.payload.sourceMapId,
			sourceEncounterId: this.payload.sourceEncounterId,
			sourceEnemyId: this.payload.sourceEnemyId,
			completion: this.payload.completion,
			returnPosition: this.payload.returnPosition,
			finalHeroHp: this.hero.hp,
			inventory: this.inventory,
			defeatedUnits: outcome === 'victory' ? this.defeatedUnits : []
		};
		const application = applyBattleResultToSaveState(this.payload.saveState, this.pendingResult);
		this.publishHudState(
			outcome === 'victory'
				? t(getActiveLocale(), 'status.battleVictory')
				: t(getActiveLocale(), 'status.battleDefeat'),
			application.summary
		);
	}

	private handleHudCommand(command: HudCommand) {
		if (command.type === 'heal') {
			this.consumeFirstHealingItem();
			return;
		}

		if (command.type === 'use-item') {
			this.useItem(command.itemId);
			return;
		}

		if (command.type === 'dismiss-battle-summary' && this.pendingResult && this.payload) {
			this.scene.start(WorldScene.key, {
				saveState: this.payload.saveState,
				battleResult: this.pendingResult,
				reason: 'battle-result'
			});
		}
	}

	private consumeFirstHealingItem() {
		const healingItem = this.inventory?.stacks.find((stack) => {
			const item = getItem(stack.itemId);
			return item?.type === 'consumable' && item.effect.type === 'heal';
		});
		if (healingItem) this.useItem(healingItem.itemId);
	}

	private useItem(itemId: string) {
		if (!this.inventory) return;
		const item = getItem(itemId);
		if (item?.type !== 'consumable' || item.effect.type !== 'heal' || this.hero.hp >= this.hero.maxHp) {
			return;
		}
		const result = consumeStackItem(this.inventory, itemId);
		if (!result.consumed) return;
		this.inventory = result.inventory;
		this.hero = { ...this.hero, hp: Math.min(this.hero.maxHp, this.hero.hp + item.effect.amount) };
		this.publishHudState(t(getActiveLocale(), 'status.recoveredHp'));
	}

	private publishHudState(status: string, summary = null) {
		if (!this.payload || !this.inventory) return;
		emitHudState({
			ready: true,
			mapId: this.payload.sourceMapId,
			areaMap: { mapId: this.payload.sourceMapId, name: 'Battlefield', worldWidth: 640, worldHeight: 360, cellSize: 32, revealedCells: [], markers: [], player: { x: 320, y: 180 } },
			hp: this.hero.hp,
			maxHp: this.hero.maxHp,
			level: this.payload.saveState.player.level,
			xp: this.payload.saveState.player.xp,
			attack: this.hero.attack,
			defense: this.hero.defense,
			heals: this.inventory.stacks.reduce((total, stack) => {
				const item = getItem(stack.itemId);
				return item?.type === 'consumable' && item.effect.type === 'heal'
					? total + stack.quantity
					: total;
			}, 0),
			canResume: false,
			status,
			wallet: this.payload.saveState.wallet,
			nearbyShop: null,
			shop: null,
			dialogue: null,
			quests: { main: null, side: [], completed: [], guildOffer: null },
			inventory: { consumables: [], equipment: [], keyItems: [], equipped: this.payload.saveState.equipment },
			battle: {
				phase: summary ? 'summary' : 'active',
				summary
			}
		});
	}

	private updateEnemyHealthBar(enemy: BattleEnemyInstance) {
		const hpRatio = Math.max(0, enemy.hp / Math.max(enemy.maxHp, 1));
		const y = enemy.y - BattleScene.enemyHealthBarOffsetY;
		enemy.healthBarBg.setPosition(enemy.x, y);
		enemy.healthBarFill.setPosition(enemy.x - 15 + (30 * hpRatio) / 2, y);
		enemy.healthBarFill.setScale(hpRatio, 1);
		enemy.healthBarBg.setVisible(!enemy.defeated);
		enemy.healthBarFill.setVisible(!enemy.defeated);
	}
}
```

- [ ] **Step 4: Run BattleScene scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS for the new BattleScene tests. Existing WorldScene tests may now expose field-combat expectations that are updated in Task 5.

- [ ] **Step 5: Commit BattleScene runtime**

```sh
git add src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: add real-time battle scene runtime"
```

## Task 5: WorldScene Battle Handoff And Result Application

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add failing WorldScene handoff tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update the existing field-combat defeat test so it expects `scene.start(BattleScene.key, payload)` instead of immediate XP gain. Add this focused test near the existing combat tests:

```ts
it('starts BattleScene when the hero engages an uncleared field encounter', async () => {
	const { BattleScene } = await import('./BattleScene');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		enemies: Array<{ hp: number; x: number; y: number }>;
	};

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 4_960, y: 960 });
	sceneState.enemies[0]!.hp = 8;

	scene.update(0, 16);

	expect(scene.scene.start).toHaveBeenCalledWith(
		BattleScene.key,
		expect.objectContaining({
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			enemyCount: expect.any(Number),
			returnPosition: expect.objectContaining({ mapId: 'meadow-entry' }),
			saveState: expect.objectContaining({
				mapId: 'meadow-entry',
				flags: expect.objectContaining({ clearedEncounters: [] })
			})
		})
	);
});

it('applies a returned battle victory before rendering the source encounter', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const saveState = createNewSaveState();
	const scene = new WorldScene();

	scene.create({
		saveState,
		reason: 'battle-result',
		battleResult: {
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 16,
			inventory: saveState.inventory,
			defeatedUnits: [
				{
					unitId: 'meadow-slime-west:unit:0',
					unitIndex: 0,
					enemyId: 'slime-scout',
					xpReward: 4,
					coinReward: 4,
					drops: []
				}
			]
		}
	});

	const builtSave = (scene as unknown as { buildSaveState: () => ReturnType<typeof createNewSaveState> }).buildSaveState();
	expect(builtSave.flags.clearedEncounters).toEqual(['meadow-slime-west']);
	expect(builtSave.player).toMatchObject({ x: 4_928, y: 1_024, facing: 'down', hp: 16 });
	expect(phaserState.enemyMarker.setVisible).toHaveBeenCalledWith(false);
});

it('applies a returned battle defeat at the village spawn without clearing the encounter', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const saveState = { ...createNewSaveState(), mapId: 'ruins-threshold' };
	const scene = new WorldScene();

	scene.create({
		saveState,
		reason: 'battle-result',
		battleResult: {
			outcome: 'defeat',
			sourceMapId: 'ruins-threshold',
			sourceEncounterId: 'threshold-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'ruins-threshold', x: 512, y: 3_200, facing: 'right' },
			finalHeroHp: 0,
			inventory: saveState.inventory,
			defeatedUnits: []
		}
	});

	const builtSave = (scene as unknown as { buildSaveState: () => ReturnType<typeof createNewSaveState> }).buildSaveState();
	expect(builtSave.mapId).toBe('meadow-entry');
	expect(builtSave.player).toMatchObject({ hp: 1, x: 1_536, y: 5_550, facing: 'up' });
	expect(builtSave.flags.clearedEncounters).toEqual([]);
});
```

- [ ] **Step 2: Run scene tests to verify WorldScene handoff fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `WorldSceneData` does not accept `battleResult`, and field combat still resolves in `WorldScene`.

- [ ] **Step 3: Modify WorldScene imports and data contract**

In `src/lib/game/phaser/scenes/WorldScene.ts`, add imports:

```ts
import {
	applyBattleResultToSaveState,
	rollBattleEnemyCount,
	type BattleResult
} from '$lib/game/core/battle';
import { BattleScene } from './BattleScene';
```

Extend `WorldSceneData`:

```ts
interface WorldSceneData {
	battleResult?: BattleResult;
	mapId?: string;
	persistExplorationChanges?: boolean;
	reason?: 'battle-result' | 'invalid-save' | 'new' | 'resume' | 'transition';
	saveState?: SaveState | null;
}
```

- [ ] **Step 4: Apply returned battle results before normal scene initialization**

At the top of `create(data: WorldSceneData = {})`, replace:

```ts
const activeSave = data.saveState;
```

with:

```ts
const battleApplication =
	data.battleResult && data.saveState
		? applyBattleResultToSaveState(data.saveState, data.battleResult)
		: null;
const activeSave = battleApplication?.saveState ?? data.saveState;
if (battleApplication) {
	saveGameState(battleApplication.saveState);
}
```

In `resolveInitialStatus`, add:

```ts
if (reason === 'battle-result') return this.status('status.battleReturned');
```

- [ ] **Step 5: Replace field hit resolution with BattleScene launch**

In `update`, replace the block that starts with:

```ts
const attackTarget =
	time >= this.playerAttackCooldownUntil ? this.findHeroAttackTarget(time) : undefined;
```

and ends before:

```ts
if (!this.hasLivingEnemies()) {
	return;
}
```

with:

```ts
const battleTarget =
	time >= this.playerAttackCooldownUntil ? this.findHeroAttackTarget(time) : undefined;

if (battleTarget) {
	this.startBattle(battleTarget);
	return;
}

if (!this.hasLivingEnemies()) {
	return;
}
```

Add this method near `finishEncounter`:

```ts
private startBattle(enemy: EnemyInstance) {
	if (!this.player) return;
	const saveState = this.buildSaveState();
	this.scene.start(BattleScene.key, {
		saveState,
		sourceMapId: this.mapId,
		sourceEncounterId: enemy.id,
		sourceEnemyId: enemy.definition.id,
		completion: enemy.completion,
		returnPosition: {
			mapId: this.mapId,
			x: enemy.homeX,
			y: enemy.homeY + 64,
			facing: this.facing
		},
		enemyCount: rollBattleEnemyCount(),
		hero: {
			hp: this.playerProgress.hp,
			...this.getEffectiveStats()
		}
	});
}
```

Keep `finishEncounter` in place until all tests are migrated. It may remain unused by world combat after this change, but boss victory and old tests will reveal any cleanup needed.

- [ ] **Step 6: Run WorldScene scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS after updating older field-combat assertions to assert BattleScene launch or result application.

- [ ] **Step 7: Commit WorldScene handoff**

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: route world encounters into battle scene"
```

## Task 6: HUD Battle State And Summary Commands

**Files:**
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`
- Test: existing TypeScript checks through `bun run check`

- [ ] **Step 1: Extend HUD event types**

In `src/lib/game/ui-bridge/events.ts`, add after `HudDialogueState`:

```ts
export type HudBattleSummaryDrop = {
	itemId: string;
	name: string;
	quantity: number;
};

export type HudBattleSummary = {
	outcome: 'victory' | 'defeat';
	enemiesDefeated: number;
	xpGained: number;
	coinsGained: number;
	drops: HudBattleSummaryDrop[];
	leveledUp: boolean;
	completedQuestTitles: string[];
};

export type HudBattleState = {
	phase: 'none' | 'active' | 'summary';
	summary: HudBattleSummary | null;
};
```

Add to `HudState`:

```ts
battle: HudBattleState;
```

Add to `HudStatePayload` behavior by keeping `HudStatePayload = Omit<HudState, 'dialogue'> & ...`; battle remains required in emitted payloads. Add to `HudCommand`:

```ts
| { type: 'dismiss-battle-summary' }
```

- [ ] **Step 2: Initialize battle state and command helper**

In `src/lib/game/ui-bridge/store.ts`, add to `initialHudState`:

```ts
battle: {
	phase: 'none',
	summary: null
}
```

Add:

```ts
export function requestDismissBattleSummary() {
	emitHudCommand({ type: 'dismiss-battle-summary' });
}
```

- [ ] **Step 3: Update all `emitHudState` call sites**

In `WorldScene.publishHudState`, add:

```ts
battle: {
	phase: 'none',
	summary: null
},
```

In `BattleScene.publishHudState`, map `BattleSummary` into `HudBattleSummary` before emitting:

```ts
const hudSummary = summary
	? {
			outcome: summary.outcome,
			enemiesDefeated: summary.enemiesDefeated,
			xpGained: summary.xpGained,
			coinsGained: summary.coinsGained,
			drops: summary.drops.map((drop) => ({
				itemId: drop.itemId,
				name: getItem(drop.itemId)?.name ?? drop.itemId,
				quantity: drop.quantity
			})),
			leveledUp: summary.leveledUp,
			completedQuestTitles: summary.completedQuestIds
		}
	: null;
```

and emit:

```ts
battle: {
	phase: hudSummary ? 'summary' : 'active',
	summary: hudSummary
}
```

- [ ] **Step 4: Run type checks**

Run:

```sh
bun run check
```

Expected: PASS after all HUD state payloads include `battle`.

- [ ] **Step 5: Commit HUD bridge state**

```sh
git add src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/BattleScene.ts
git commit -m "feat: expose battle state to hud"
```

## Task 7: Blocking Battle Summary UI

**Files:**
- Modify: `src/lib/game/GameShell.svelte`
- Create: `src/lib/game/GameShell.svelte.spec.ts`
- Modify: `src/lib/game/i18n/messages/en.ts`
- Modify: `src/lib/game/i18n/messages/ja.ts`
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts`

- [ ] **Step 1: Add Svelte tests for summary rendering and command disabling**

Create `src/lib/game/GameShell.svelte.spec.ts` with a local HUD-state emitter:

```ts
import { render, screen } from 'vitest-browser-svelte';
import { describe, expect, it, vi } from 'vitest';

import GameShell from './GameShell.svelte';
import { HUD_COMMAND_EVENT, HUD_STATE_EVENT, type HudState } from '$lib/game/ui-bridge/events';

vi.mock('$lib/game/phaser/createGame', () => ({
	createGame: vi.fn(async () => ({ destroy: vi.fn() }))
}));

function emitHudState(state: HudState) {
	window.dispatchEvent(new CustomEvent(HUD_STATE_EVENT, { detail: state }));
}

function baseHudState(): HudState {
	return {
		ready: true,
		mapId: 'meadow-entry',
		areaMap: {
			mapId: 'meadow-entry',
			name: 'Sundrop Meadow',
			worldWidth: 640,
			worldHeight: 640,
			cellSize: 32,
			revealedCells: [],
			markers: [],
			player: { x: 0, y: 0 }
		},
		hp: 12,
		maxHp: 20,
		level: 1,
		xp: 0,
		attack: 4,
		defense: 0,
		heals: 1,
		canResume: false,
		status: 'Battle victory',
		wallet: { coins: 30 },
		nearbyShop: null,
		shop: null,
		dialogue: null,
		quests: { main: null, side: [], completed: [], guildOffer: null },
		inventory: { consumables: [], equipment: [], keyItems: [], equipped: { weapon: null, head: null, body: null, hands: null, accessory: null } },
		battle: { phase: 'none', summary: null }
	};
}

describe('GameShell battle summary', () => {
	it('renders a blocking victory summary and dismisses it through the HUD bridge', async () => {
		const commands: unknown[] = [];
		window.addEventListener(HUD_COMMAND_EVENT, (event) =>
			commands.push((event as CustomEvent).detail)
		);
		render(GameShell);

		emitHudState({
			...baseHudState(),
			battle: {
				phase: 'summary',
				summary: {
					outcome: 'victory',
					enemiesDefeated: 3,
					xpGained: 12,
					coinsGained: 12,
					drops: [{ itemId: 'field-potion', name: 'Field Potion', quantity: 2 }],
					leveledUp: true,
					completedQuestTitles: ['Thin the Village Slimes']
				}
			}
		});

		await expect.element(screen.getByRole('dialog', { name: /battle summary/i })).toBeVisible();
		await expect.element(screen.getByText(/Enemies defeated: 3/i)).toBeVisible();
		await expect.element(screen.getByText(/Field Potion x2/i)).toBeVisible();
		await screen.getByRole('button', { name: /continue/i }).click();

		expect(commands.at(-1)).toEqual({ type: 'dismiss-battle-summary' });
	});

	it('disables map, quest, shop, and save commands while battle is active but keeps quick heal available', async () => {
		render(GameShell);
		emitHudState({ ...baseHudState(), battle: { phase: 'active', summary: null } });

		await screen.getByRole('button', { name: /menu/i }).click();

		await expect.element(screen.getByRole('button', { name: /map/i })).toBeDisabled();
		await expect.element(screen.getByRole('button', { name: /quests/i })).toBeDisabled();
		await expect.element(screen.getByRole('button', { name: /shop/i })).toBeDisabled();
		await expect.element(screen.getByRole('button', { name: /save game/i })).toBeDisabled();
		await expect.element(screen.getByRole('button', { name: /use heal/i })).toBeEnabled();
	});
});
```

- [ ] **Step 2: Run the Svelte summary test to verify it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts
```

Expected: FAIL because `GameShell` has no battle summary UI and non-battle command buttons are not battle-aware.

- [ ] **Step 3: Add battle summary state and command helper to GameShell**

In the `<script>` imports from `$lib/game/ui-bridge/store`, add:

```ts
requestDismissBattleSummary,
```

Add derived state:

```ts
const battlePhase = $derived($hudState.battle.phase);
const battleLocked = $derived(battlePhase === 'active' || battlePhase === 'summary');
const battleSummary = $derived($hudState.battle.summary);
```

Add:

```ts
function dismissBattleSummary() {
	requestDismissBattleSummary();
}
```

In command buttons, disable non-battle overlays with `battleLocked`:

```svelte
disabled={!$hudState.ready || battleLocked}
```

Use that expression for quests, map, inventory, shop, resume, and save. Keep quick heal as:

```svelte
disabled={!$hudState.ready || $hudState.heals < 1 || battlePhase === 'summary'}
```

- [ ] **Step 4: Add the blocking summary markup**

Place this block before inventory/shop/quest/area-map modals:

```svelte
{#if battleSummary}
	<div class="jrpg-modal-backdrop" role="presentation">
		<div
			class="jrpg-window jrpg-window-narrow"
			aria-label={t($locale, 'ui.battleSummary')}
			aria-modal="true"
			role="dialog"
			tabindex="-1"
		>
			<div class="jrpg-window-header">
				<div>
					<p class="jrpg-label">
						{battleSummary.outcome === 'victory'
							? t($locale, 'ui.battleVictory')
							: t($locale, 'ui.battleDefeat')}
					</p>
					<h2 class="jrpg-window-title">{t($locale, 'ui.battleSummary')}</h2>
				</div>
			</div>
			<div class="jrpg-window-body">
				<div class="grid gap-3 text-sm text-slate-100/88">
					<p>
						{t($locale, 'ui.enemiesDefeated', {
							count: battleSummary.enemiesDefeated
						})}
					</p>
					<p>{t($locale, 'ui.xpGained', { xp: battleSummary.xpGained })}</p>
					<p>{t($locale, 'ui.coinsGained', { coins: battleSummary.coinsGained })}</p>
					{#if battleSummary.leveledUp}
						<p>{t($locale, 'ui.levelUp')}</p>
					{/if}
					{#if battleSummary.drops.length > 0}
						<ul class="grid gap-1">
							{#each battleSummary.drops as drop (drop.itemId)}
								<li>{drop.name} x{drop.quantity}</li>
							{/each}
						</ul>
					{:else}
						<p>{t($locale, 'ui.noDrops')}</p>
					{/if}
					{#if battleSummary.completedQuestTitles.length > 0}
						<ul class="grid gap-1">
							{#each battleSummary.completedQuestTitles as questTitle (questTitle)}
								<li>{t($locale, 'ui.questComplete', { questTitle })}</li>
							{/each}
						</ul>
					{/if}
					{#if battleSummary.outcome === 'defeat'}
						<p>{t($locale, 'ui.defeatReturnedToVillage')}</p>
					{/if}
				</div>
				<button type="button" class="jrpg-command-action mt-5" onclick={dismissBattleSummary}>
					{t($locale, 'ui.continue')}
				</button>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 5: Add localized strings**

Add these keys to the `ui` object in `en.ts`, `ja.ts`, and `zh-Hant.ts`. Use these exact English values in `en.ts`:

```ts
battleSummary: 'Battle Summary',
battleVictory: 'Victory',
battleDefeat: 'Defeat',
enemiesDefeated: 'Enemies defeated: {{count}}',
xpGained: 'XP gained: {{xp}}',
coinsGained: 'Coins gained: {{coins}}',
levelUp: 'Level up',
noDrops: 'No item drops',
continue: 'Continue',
defeatReturnedToVillage: 'No rewards gained. Returned to the village.'
```

Add these `status` values in all three locale files:

```ts
battleStarted: 'Battle started',
battleVictory: 'Battle victory',
battleDefeat: 'Battle defeat',
battleReturned: 'Returned from battle',
battleLocked: 'Cannot do that during battle'
```

- [ ] **Step 6: Run the Svelte autofixer**

Use the Svelte MCP `svelte-autofixer` on `src/lib/game/GameShell.svelte` until it reports no issues. If the Svelte MCP tools are unavailable in the session, run:

```sh
bun run check
```

Expected: PASS after Svelte syntax and type issues are fixed.

- [ ] **Step 7: Run the summary test**

Run:

```sh
bun run test:unit -- --run src/lib/game/GameShell.svelte.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit summary UI**

```sh
git add src/lib/game/GameShell.svelte src/lib/game/GameShell.svelte.spec.ts src/lib/game/i18n/messages/en.ts src/lib/game/i18n/messages/ja.ts src/lib/game/i18n/messages/zh-Hant.ts
git commit -m "feat: add battle summary hud"
```

## Task 8: Battle-Locked Commands And Inventory Use In BattleScene

**Files:**
- Modify: `src/lib/game/phaser/scenes/BattleScene.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Add failing tests for battle command handling**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add:

```ts
it('BattleScene accepts healing commands and returns the consumed inventory', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { BattleScene } = await import('./BattleScene');
	const scene = new BattleScene();
	const saveState = createNewSaveState();

	scene.create({
		saveState,
		sourceMapId: 'meadow-entry',
		sourceEncounterId: 'meadow-slime-west',
		sourceEnemyId: 'slime-scout',
		returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
		enemyCount: 1,
		hero: { hp: 4, maxHp: 20, attack: 8, defense: 0 }
	});

	window.dispatchEvent(new CustomEvent('gliese:hud-command', { detail: { type: 'heal' } }));

	const state = scene as unknown as {
		hero: { hp: number };
		inventory: { stacks: Array<{ itemId: string; quantity: number }> };
	};
	expect(state.hero.hp).toBe(12);
	expect(state.inventory.stacks).toEqual([]);
});

it('WorldScene ignores save and overlay commands while a battle result is being applied', async () => {
	const { createNewSaveState } = await import('$lib/game/save/save-state');
	const { WorldScene } = await import('./WorldScene');
	const saveState = createNewSaveState();
	const scene = new WorldScene();

	scene.create({
		saveState,
		reason: 'battle-result',
		battleResult: {
			outcome: 'victory',
			sourceMapId: 'meadow-entry',
			sourceEncounterId: 'meadow-slime-west',
			sourceEnemyId: 'slime-scout',
			returnPosition: { mapId: 'meadow-entry', x: 4_928, y: 1_024, facing: 'down' },
			finalHeroHp: 16,
			inventory: saveState.inventory,
			defeatedUnits: []
		}
	});

	(scene as unknown as { handleHudCommand: (command: unknown) => void }).handleHudCommand({
		type: 'open-shop',
		shopId: 'miras-item-shop'
	});

	expect(scene.scene.restart).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL until command handling is tightened.

- [ ] **Step 3: Tighten command handling**

In `BattleScene.handleHudCommand`, keep only these command types active:

```ts
if (command.type === 'heal') {
	this.consumeFirstHealingItem();
	return;
}

if (command.type === 'use-item') {
	this.useItem(command.itemId);
	return;
}

if (command.type === 'dismiss-battle-summary' && this.pendingResult && this.payload) {
	this.scene.start(WorldScene.key, {
		saveState: this.payload.saveState,
		battleResult: this.pendingResult,
		reason: 'battle-result'
	});
	return;
}

this.publishHudState(t(getActiveLocale(), 'status.battleLocked'));
```

In `WorldScene.handleHudCommand`, add this as the first switch case branch:

```ts
case 'dismiss-battle-summary':
	this.publishHudState(this.status('status.battleLocked'));
	return;
```

- [ ] **Step 4: Run scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit battle command locking**

```sh
git add src/lib/game/phaser/scenes/BattleScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: lock non-battle commands during combat"
```

## Task 9: End-To-End Regression Coverage

**Files:**
- Modify: `tests/e2e/game.e2e.ts` or the current e2e file under `tests/e2e/`

- [ ] **Step 1: Locate the existing game e2e file**

Run:

```sh
rg -n "game route boots|meadow|slime|save|quest" tests/e2e
```

Expected: Identify the existing Playwright e2e file that boots the game.

- [ ] **Step 2: Add a battle summary smoke test**

Add a test that starts a new run, moves the hero to the nearest meadow slime, waits for the battle summary, and dismisses it. Use existing helper patterns from the file. The test name must be:

```ts
test('encounter opens battle scene and returns through battle summary', async ({ page }) => {
	// Use existing movement helpers from this e2e file.
	await page.goto('/');
	await page.getByRole('button', { name: /menu/i }).waitFor();
	await page.keyboard.down('ArrowUp');
	await page.waitForTimeout(1_500);
	await page.keyboard.up('ArrowUp');
	await page.keyboard.down('ArrowRight');
	await page.waitForTimeout(4_500);
	await page.keyboard.up('ArrowRight');
	await expect(page.getByRole('dialog', { name: /battle summary/i })).toBeVisible({
		timeout: 30_000
	});
	await page.getByRole('button', { name: /continue/i }).click();
	await expect(page.getByRole('dialog', { name: /battle summary/i })).not.toBeVisible();
});
```

Use the keyboard timings shown in the test. After the test passes once, tune only the wait durations when local movement speed requires it.

- [ ] **Step 3: Run the e2e battle smoke test**

Run:

```sh
bun run test:e2e -- --grep "encounter opens battle scene"
```

Expected: PASS.

- [ ] **Step 4: Commit e2e coverage**

```sh
git add tests/e2e
git commit -m "test: cover battle scene summary flow"
```

## Task 10: Full Verification And Cleanup

**Files:**
- All files changed by previous tasks

- [ ] **Step 1: Run focused unit tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/core/battle.test.ts src/lib/game/core/quests.test.ts src/lib/game/phaser/createGame.test.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/GameShell.svelte.spec.ts
```

Expected: PASS.

- [ ] **Step 2: Run Svelte check**

Run:

```sh
bun run check
```

Expected: PASS.

- [ ] **Step 3: Run full test suite**

Run:

```sh
bun run test
```

Expected: PASS.

- [ ] **Step 4: Run build**

Run:

```sh
bun run build
```

Expected: PASS and `dist/` updates locally.

- [ ] **Step 5: Review git status**

Run:

```sh
git status --short
```

Expected: only intentional source, test, and docs changes are present.

- [ ] **Step 6: Commit final fixes if verification required any edits**

If Step 5 shows unstaged implementation or test fixes, commit them with:

```sh
git add src tests
git commit -m "fix: stabilize battle scene flow"
```

Expected: either no commit is needed, or the commit contains only fixes made during verification.

## Self-Review Checklist

- Spec coverage: this plan covers separate `BattleScene`, real-time compact arena combat, 1-10 real enemies, per-unit rewards and quest progress, single source marker clearing, blocking victory/defeat summaries, village respawn at 1 HP, battle healing, disabled non-battle overlays, localization, and verification.
- Placeholder scan: no incomplete test names or open-ended implementation steps remain.
- Type consistency: `BattleStartPayload`, `BattleResult`, `BattleSummary`, `HudBattleState`, `dismiss-battle-summary`, and `sourceId` are defined before later tasks use them.
