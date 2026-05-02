# Item System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable item loop with world pickups, enemy drops, consumables, key items, five equipment slots, stat modifiers, save/load, and a paused inventory/equipment overlay.

**Architecture:** Add static item/drop/pickup content, pure inventory/equipment/stat/loot modules, then wire those modules into save state, the HUD bridge, `WorldScene`, and `GameShell.svelte`. Phaser remains responsible for world interactions; Svelte renders overlay UI; pure rules stay independent of Phaser and DOM.

**Tech Stack:** TypeScript, Svelte 5 runes, SvelteKit, Phaser 4, Vitest, vitest-browser-svelte, Bun.

---

## File Structure

- Create `src/lib/game/content/items.ts`: item definitions, equipment slots, stat modifier types, and item lookup helpers.
- Create `src/lib/game/content/items.test.ts`: validates roster counts, ids, stackability, equipment slots, and duplicate ids.
- Create `src/lib/game/core/inventory.ts`: pure functions for adding items, consuming stackable items, checking ownership, and rendering inventory summaries.
- Create `src/lib/game/core/inventory.test.ts`: stack and ownership behavior.
- Create `src/lib/game/core/equipment.ts`: pure equip/unequip slot rules.
- Create `src/lib/game/core/equipment.test.ts`: slot validation and replacement behavior.
- Create `src/lib/game/core/stats.ts`: derives effective stats from base progression and equipped definitions.
- Create `src/lib/game/core/stats.test.ts`: attack, defense, max HP, and HP clamp behavior.
- Create `src/lib/game/core/loot.ts`: pure guaranteed/chance drop resolution with injectable RNG.
- Create `src/lib/game/core/loot.test.ts`: deterministic chance and once-only result behavior.
- Modify `src/lib/game/content/enemies.ts`: add item drop tables to enemy definitions.
- Modify `src/lib/game/content/maps.ts`: add placed pickup definitions with stable ids.
- Modify `src/lib/game/content/maps.test.ts`: validate pickup ids, pickup item ids, and coordinates.
- Modify `src/lib/game/save/save-state.ts`: replace `version: 1`/`consumables.heals` with `version: 2` inventory/equipment/drop state.
- Modify `src/lib/game/save/save-state.test.ts`: assert new save shape and rejection of old saves.
- Modify `src/lib/game/save/storage.test.ts`: assert persisted item state.
- Modify `src/lib/game/ui-bridge/events.ts`: replace string command union with typed command payloads and expand `HudState`.
- Modify `src/lib/game/ui-bridge/store.ts`: add typed request helpers for item commands.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: hold inventory/equipment state, render pickups, collect pickups, award drops, use/equip/unequip items, derive effective stats, and publish expanded HUD state.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: cover pickup rendering/collection, drop awarding, typed commands, and save state integration.
- Modify `src/lib/game/GameShell.svelte`: add inventory/equipment overlay UI.

## Task 1: Item Content

**Files:**
- Create: `src/lib/game/content/items.ts`
- Create: `src/lib/game/content/items.test.ts`

- [ ] **Step 1: Write failing roster tests**

Create `src/lib/game/content/items.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import {
	equipmentSlots,
	getItem,
	items,
	itemList,
	type EquipmentDefinition
} from '$lib/game/content/items';

describe('item content', () => {
	it('defines the first-pass roster counts', () => {
		expect(itemList.filter((item) => item.type === 'consumable')).toHaveLength(5);
		expect(itemList.filter((item) => item.type === 'equipment')).toHaveLength(8);
		expect(itemList.filter((item) => item.type === 'key')).toHaveLength(3);
	});

	it('uses stable unique ids', () => {
		expect(new Set(itemList.map((item) => item.id)).size).toBe(itemList.length);
		expect(getItem('field-potion')).toBe(items['field-potion']);
	});

	it('keeps stackability tied to item type', () => {
		expect(items['field-potion']).toMatchObject({ type: 'consumable', stackable: true });
		expect(items['meadow-charm']).toMatchObject({ type: 'equipment', stackable: false });
		expect(items['warden-sigil']).toMatchObject({ type: 'key', stackable: true });
	});

	it('assigns equipment to valid slots', () => {
		const slots = new Set(equipmentSlots);
		for (const item of itemList.filter((entry): entry is EquipmentDefinition => entry.type === 'equipment')) {
			expect(slots.has(item.slot)).toBe(true);
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/content/items.test.ts --run`

Expected: FAIL with an import error for `$lib/game/content/items`.

- [ ] **Step 3: Implement item content**

Create `src/lib/game/content/items.ts`:

```ts
import type { DefinitionRegistry } from '$lib/game/core/types';

export const equipmentSlots = ['weapon', 'head', 'body', 'hands', 'accessory'] as const;

export type EquipmentSlot = (typeof equipmentSlots)[number];

export type StatModifiers = {
	attack?: number;
	defense?: number;
	maxHp?: number;
};

type BaseItemDefinition = {
	id: string;
	name: string;
	description: string;
	stackable: boolean;
};

export type ConsumableEffect = { type: 'heal'; amount: number };

export type ConsumableDefinition = BaseItemDefinition & {
	type: 'consumable';
	stackable: true;
	effect: ConsumableEffect;
};

export type EquipmentDefinition = BaseItemDefinition & {
	type: 'equipment';
	stackable: false;
	slot: EquipmentSlot;
	modifiers: StatModifiers;
};

export type KeyItemDefinition = BaseItemDefinition & {
	type: 'key';
	stackable: true;
};

export type ItemDefinition = ConsumableDefinition | EquipmentDefinition | KeyItemDefinition;

export const items = {
	'field-potion': {
		id: 'field-potion',
		name: 'Field Potion',
		description: 'Restores 8 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 8 }
	},
	'greater-field-potion': {
		id: 'greater-field-potion',
		name: 'Greater Field Potion',
		description: 'Restores 14 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 14 }
	},
	'ember-tonic': {
		id: 'ember-tonic',
		name: 'Ember Tonic',
		description: 'Restores 5 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 5 }
	},
	'ruin-draught': {
		id: 'ruin-draught',
		name: 'Ruin Draught',
		description: 'Restores 10 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 10 }
	},
	'sunleaf-salve': {
		id: 'sunleaf-salve',
		name: 'Sunleaf Salve',
		description: 'Restores 6 HP.',
		type: 'consumable',
		stackable: true,
		effect: { type: 'heal', amount: 6 }
	},
	'training-sword': {
		id: 'training-sword',
		name: 'Training Sword',
		description: 'A reliable starter blade.',
		type: 'equipment',
		stackable: false,
		slot: 'weapon',
		modifiers: { attack: 1 }
	},
	'ruin-blade': {
		id: 'ruin-blade',
		name: 'Ruin Blade',
		description: 'A chipped sword humming with old heat.',
		type: 'equipment',
		stackable: false,
		slot: 'weapon',
		modifiers: { attack: 2 }
	},
	'iron-cap': {
		id: 'iron-cap',
		name: 'Iron Cap',
		description: 'Simple protection for dangerous ruins.',
		type: 'equipment',
		stackable: false,
		slot: 'head',
		modifiers: { defense: 1 }
	},
	'warden-crown': {
		id: 'warden-crown',
		name: 'Warden Crown',
		description: 'A cracked helm from the ruins core.',
		type: 'equipment',
		stackable: false,
		slot: 'head',
		modifiers: { maxHp: 3, defense: 1 }
	},
	'traveler-vest': {
		id: 'traveler-vest',
		name: 'Traveler Vest',
		description: 'Light armor for long walks.',
		type: 'equipment',
		stackable: false,
		slot: 'body',
		modifiers: { maxHp: 4 }
	},
	'stone-mail': {
		id: 'stone-mail',
		name: 'Stone Mail',
		description: 'Heavy plates carved from ruin stone.',
		type: 'equipment',
		stackable: false,
		slot: 'body',
		modifiers: { maxHp: 6, defense: 1 }
	},
	'grip-wraps': {
		id: 'grip-wraps',
		name: 'Grip Wraps',
		description: 'Cloth wraps that steady each strike.',
		type: 'equipment',
		stackable: false,
		slot: 'hands',
		modifiers: { attack: 1 }
	},
	'meadow-charm': {
		id: 'meadow-charm',
		name: 'Meadow Charm',
		description: 'A small charm from the meadow path.',
		type: 'equipment',
		stackable: false,
		slot: 'accessory',
		modifiers: { maxHp: 2 }
	},
	'meadow-token': {
		id: 'meadow-token',
		name: 'Meadow Token',
		description: 'A keepsake from the entry meadow.',
		type: 'key',
		stackable: true
	},
	'threshold-rune': {
		id: 'threshold-rune',
		name: 'Threshold Rune',
		description: 'A carved marker from the ruin threshold.',
		type: 'key',
		stackable: true
	},
	'warden-sigil': {
		id: 'warden-sigil',
		name: 'Warden Sigil',
		description: 'Proof that the ruins warden fell.',
		type: 'key',
		stackable: true
	}
} satisfies DefinitionRegistry<ItemDefinition>;

export const itemList = Object.values(items);

export function getItem(itemId: string): ItemDefinition | undefined {
	return items[itemId];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/content/items.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/items.ts src/lib/game/content/items.test.ts
git commit -m "Add item content definitions"
```

## Task 2: Inventory Core

**Files:**
- Create: `src/lib/game/core/inventory.ts`
- Create: `src/lib/game/core/inventory.test.ts`

- [ ] **Step 1: Write failing inventory tests**

Create `src/lib/game/core/inventory.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { addItem, consumeStackItem, createEmptyInventory, ownsEquipment } from './inventory';

describe('inventory core', () => {
	it('stacks consumables and key items', () => {
		const inventory = addItem(addItem(createEmptyInventory(), 'field-potion', 2), 'field-potion', 1);

		expect(inventory.stacks).toEqual([{ itemId: 'field-potion', quantity: 3 }]);
	});

	it('stores equipment ownership by id once', () => {
		const inventory = addItem(addItem(createEmptyInventory(), 'training-sword', 1), 'training-sword', 1);

		expect(inventory.equipment).toEqual(['training-sword']);
		expect(ownsEquipment(inventory, 'training-sword')).toBe(true);
	});

	it('consumes stack quantities and removes empty stacks', () => {
		const inventory = addItem(createEmptyInventory(), 'field-potion', 2);

		expect(consumeStackItem(inventory, 'field-potion')).toEqual({
			consumed: true,
			inventory: { stacks: [{ itemId: 'field-potion', quantity: 1 }], equipment: [] }
		});
		expect(consumeStackItem({ stacks: [{ itemId: 'field-potion', quantity: 1 }], equipment: [] }, 'field-potion')).toEqual({
			consumed: true,
			inventory: { stacks: [], equipment: [] }
		});
	});

	it('rejects consuming missing stacks', () => {
		expect(consumeStackItem(createEmptyInventory(), 'field-potion')).toEqual({
			consumed: false,
			inventory: createEmptyInventory()
		});
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/core/inventory.test.ts --run`

Expected: FAIL with an import error for `./inventory`.

- [ ] **Step 3: Implement inventory core**

Create `src/lib/game/core/inventory.ts`:

```ts
import { getItem } from '$lib/game/content/items';

export type InventoryStack = {
	itemId: string;
	quantity: number;
};

export type InventoryState = {
	stacks: InventoryStack[];
	equipment: string[];
};

export function createEmptyInventory(): InventoryState {
	return { stacks: [], equipment: [] };
}

export function addItem(
	inventory: InventoryState,
	itemId: string,
	quantity = 1
): InventoryState {
	const item = getItem(itemId);

	if (!item || quantity < 1) {
		return inventory;
	}

	if (item.type === 'equipment') {
		return inventory.equipment.includes(itemId)
			? inventory
			: { ...inventory, equipment: [...inventory.equipment, itemId] };
	}

	const existing = inventory.stacks.find((stack) => stack.itemId === itemId);
	const stacks = existing
		? inventory.stacks.map((stack) =>
				stack.itemId === itemId ? { ...stack, quantity: stack.quantity + quantity } : stack
			)
		: [...inventory.stacks, { itemId, quantity }];

	return { ...inventory, stacks };
}

export function consumeStackItem(
	inventory: InventoryState,
	itemId: string
): { consumed: boolean; inventory: InventoryState } {
	const existing = inventory.stacks.find((stack) => stack.itemId === itemId);

	if (!existing) {
		return { consumed: false, inventory };
	}

	const stacks =
		existing.quantity > 1
			? inventory.stacks.map((stack) =>
					stack.itemId === itemId ? { ...stack, quantity: stack.quantity - 1 } : stack
				)
			: inventory.stacks.filter((stack) => stack.itemId !== itemId);

	return { consumed: true, inventory: { ...inventory, stacks } };
}

export function ownsEquipment(inventory: InventoryState, itemId: string): boolean {
	return inventory.equipment.includes(itemId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/core/inventory.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/core/inventory.ts src/lib/game/core/inventory.test.ts
git commit -m "Add inventory core"
```

## Task 3: Equipment And Effective Stats

**Files:**
- Create: `src/lib/game/core/equipment.ts`
- Create: `src/lib/game/core/equipment.test.ts`
- Create: `src/lib/game/core/stats.ts`
- Create: `src/lib/game/core/stats.test.ts`

- [ ] **Step 1: Write failing equipment tests**

Create `src/lib/game/core/equipment.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createEmptyEquipment, equipItem, unequipSlot } from './equipment';

describe('equipment core', () => {
	it('equips owned equipment into its slot', () => {
		const result = equipItem(createEmptyEquipment(), ['training-sword'], 'training-sword');

		expect(result).toEqual({
			equipped: true,
			equipment: {
				weapon: 'training-sword',
				head: null,
				body: null,
				hands: null,
				accessory: null
			}
		});
	});

	it('rejects unowned or non-equipment items', () => {
		expect(equipItem(createEmptyEquipment(), [], 'training-sword').equipped).toBe(false);
		expect(equipItem(createEmptyEquipment(), ['field-potion'], 'field-potion').equipped).toBe(false);
	});

	it('replaces equipment in the same slot and unequips slots', () => {
		const first = equipItem(createEmptyEquipment(), ['training-sword', 'ruin-blade'], 'training-sword');
		const second = equipItem(first.equipment, ['training-sword', 'ruin-blade'], 'ruin-blade');

		expect(second.equipment.weapon).toBe('ruin-blade');
		expect(unequipSlot(second.equipment, 'weapon').weapon).toBeNull();
	});
});
```

- [ ] **Step 2: Write failing stats tests**

Create `src/lib/game/core/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { createEmptyEquipment } from './equipment';
import { clampHpToMax, deriveEffectiveStats } from './stats';

describe('effective stats', () => {
	it('adds equipped modifiers to base stats', () => {
		expect(
			deriveEffectiveStats(
				{ hp: 20, attack: 3, defense: 0 },
				{
					...createEmptyEquipment(),
					weapon: 'ruin-blade',
					body: 'stone-mail',
					accessory: 'meadow-charm'
				}
			)
		).toEqual({ maxHp: 28, attack: 5, defense: 1 });
	});

	it('clamps hp when max hp drops', () => {
		expect(clampHpToMax(30, { maxHp: 24, attack: 4, defense: 1 })).toBe(24);
		expect(clampHpToMax(12, { maxHp: 24, attack: 4, defense: 1 })).toBe(12);
	});
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `bun run test:unit -- src/lib/game/core/equipment.test.ts src/lib/game/core/stats.test.ts --run`

Expected: FAIL with import errors for `./equipment` and `./stats`.

- [ ] **Step 4: Implement equipment and stats**

Create `src/lib/game/core/equipment.ts`:

```ts
import { equipmentSlots, getItem, type EquipmentSlot } from '$lib/game/content/items';

export type EquipmentState = Record<EquipmentSlot, string | null>;

export function createEmptyEquipment(): EquipmentState {
	return {
		weapon: null,
		head: null,
		body: null,
		hands: null,
		accessory: null
	};
}

export function equipItem(
	equipment: EquipmentState,
	ownedEquipment: string[],
	itemId: string
): { equipped: boolean; equipment: EquipmentState } {
	const item = getItem(itemId);

	if (!item || item.type !== 'equipment' || !ownedEquipment.includes(itemId)) {
		return { equipped: false, equipment };
	}

	return { equipped: true, equipment: { ...equipment, [item.slot]: itemId } };
}

export function unequipSlot(equipment: EquipmentState, slot: EquipmentSlot): EquipmentState {
	return equipmentSlots.includes(slot) ? { ...equipment, [slot]: null } : equipment;
}
```

Create `src/lib/game/core/stats.ts`:

```ts
import { getItem } from '$lib/game/content/items';
import type { EquipmentState } from '$lib/game/core/equipment';

export type BaseStats = {
	hp: number;
	attack: number;
	defense: number;
};

export type EffectiveStats = {
	maxHp: number;
	attack: number;
	defense: number;
};

export function deriveEffectiveStats(base: BaseStats, equipment: EquipmentState): EffectiveStats {
	return Object.values(equipment).reduce<EffectiveStats>(
		(stats, itemId) => {
			const item = itemId ? getItem(itemId) : undefined;

			if (!item || item.type !== 'equipment') {
				return stats;
			}

			return {
				maxHp: stats.maxHp + (item.modifiers.maxHp ?? 0),
				attack: stats.attack + (item.modifiers.attack ?? 0),
				defense: stats.defense + (item.modifiers.defense ?? 0)
			};
		},
		{ maxHp: base.hp, attack: base.attack, defense: base.defense }
	);
}

export function clampHpToMax(hp: number, stats: EffectiveStats): number {
	return Math.min(hp, stats.maxHp);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run test:unit -- src/lib/game/core/equipment.test.ts src/lib/game/core/stats.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/core/equipment.ts src/lib/game/core/equipment.test.ts src/lib/game/core/stats.ts src/lib/game/core/stats.test.ts
git commit -m "Add equipment stat rules"
```

## Task 4: Loot Tables

**Files:**
- Create: `src/lib/game/core/loot.ts`
- Create: `src/lib/game/core/loot.test.ts`
- Modify: `src/lib/game/content/enemies.ts`

- [ ] **Step 1: Write failing loot tests**

Create `src/lib/game/core/loot.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { resolveLootDrops, type LootTable } from './loot';

describe('loot resolver', () => {
	it('always awards guaranteed drops', () => {
		const table: LootTable = { guaranteed: [{ itemId: 'warden-sigil', quantity: 1 }], chance: [] };

		expect(resolveLootDrops(table, () => 0.99)).toEqual([{ itemId: 'warden-sigil', quantity: 1 }]);
	});

	it('awards chance drops when rng is below drop chance', () => {
		const table: LootTable = {
			guaranteed: [],
			chance: [{ itemId: 'field-potion', quantity: 1, chance: 0.5 }]
		};

		expect(resolveLootDrops(table, () => 0.49)).toEqual([{ itemId: 'field-potion', quantity: 1 }]);
		expect(resolveLootDrops(table, () => 0.5)).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/core/loot.test.ts --run`

Expected: FAIL with an import error for `./loot`.

- [ ] **Step 3: Implement loot resolver**

Create `src/lib/game/core/loot.ts`:

```ts
export type ItemDrop = {
	itemId: string;
	quantity: number;
};

export type ChanceDrop = ItemDrop & {
	chance: number;
};

export type LootTable = {
	guaranteed: ItemDrop[];
	chance: ChanceDrop[];
};

export function resolveLootDrops(
	loot: LootTable | undefined,
	random: () => number = Math.random
): ItemDrop[] {
	if (!loot) {
		return [];
	}

	return [
		...loot.guaranteed,
		...loot.chance
			.filter((drop) => random() < drop.chance)
			.map(({ chance: _chance, ...drop }) => drop)
	];
}
```

- [ ] **Step 4: Add enemy drop tables**

Modify `src/lib/game/content/enemies.ts`:

```ts
import type { DefinitionRegistry, EnemyDefinition } from '$lib/game/core/types';
import type { LootTable } from '$lib/game/core/loot';

export interface EnemyCombatDefinition extends EnemyDefinition {
	xpReward: number;
	loot?: LootTable;
	boss?: {
		phaseTwoColor: number;
	};
}

export const slimeScout: EnemyCombatDefinition = {
	id: 'slime-scout',
	baseHp: 3,
	baseAttack: 2,
	moveSpeed: 90,
	xpReward: 5,
	loot: {
		guaranteed: [],
		chance: [{ itemId: 'field-potion', quantity: 1, chance: 0.6 }]
	}
};

export const ruinsWarden: EnemyCombatDefinition = {
	id: 'ruins-warden',
	baseHp: 9,
	baseAttack: 4,
	moveSpeed: 75,
	xpReward: 12,
	loot: {
		guaranteed: [
			{ itemId: 'warden-sigil', quantity: 1 },
			{ itemId: 'warden-crown', quantity: 1 }
		],
		chance: [{ itemId: 'ruin-blade', quantity: 1, chance: 0.5 }]
	},
	boss: {
		phaseTwoColor: 0xff8a3d
	}
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/core/loot.test.ts --run`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/game/core/loot.ts src/lib/game/core/loot.test.ts src/lib/game/content/enemies.ts
git commit -m "Add item loot tables"
```

## Task 5: Save Schema V2

**Files:**
- Modify: `src/lib/game/save/save-state.ts`
- Modify: `src/lib/game/save/save-state.test.ts`
- Modify: `src/lib/game/save/storage.test.ts`

- [ ] **Step 1: Update failing save tests**

Modify the starting save expectation in `src/lib/game/save/save-state.test.ts`:

```ts
expect(createNewSaveState()).toEqual({
	version: 2,
	mapId: meadowEntryMap.id,
	player: {
		level: 1,
		xp: getXpForLevel(1),
		hp: startingPlayer.baseHp,
		attack: startingPlayer.baseAttack,
		x: meadowEntryMap.spawn.x,
		y: meadowEntryMap.spawn.y,
		facing: meadowEntryMap.spawnDirection
	},
	flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
	inventory: {
		stacks: [{ itemId: 'field-potion', quantity: 1 }],
		equipment: ['training-sword']
	},
	equipment: {
		weapon: 'training-sword',
		head: null,
		body: null,
		hands: null,
		accessory: null
	}
});
```

Replace the legacy consumables migration test with:

```ts
it('rejects old version 1 save payloads', () => {
	expect(
		parseSaveState(
			JSON.stringify({
				...createNewSaveState(),
				version: 1,
				consumables: { heals: 1 }
			})
		)
	).toBeNull();
});
```

Replace invalid consumable count test with:

```ts
it('rejects invalid inventory quantities', () => {
	expect(
		parseSaveState(
			JSON.stringify({
				...createNewSaveState(),
				inventory: {
					...createNewSaveState().inventory,
					stacks: [{ itemId: 'field-potion', quantity: '1' }]
				}
			})
		)
	).toBeNull();
});
```

Modify the storage test save override in `src/lib/game/save/storage.test.ts`:

```ts
const save = {
	...createNewSaveState(),
	inventory: { stacks: [], equipment: ['training-sword'] }
};
```

Assert:

```ts
expect(loadStoredSaveState(storage)?.inventory.stacks).toEqual([]);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun run test:unit -- src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts --run`

Expected: FAIL because `SaveState` is still version 1 and still uses `consumables`.

- [ ] **Step 3: Implement save state v2**

Modify `src/lib/game/save/save-state.ts`:

```ts
import { maps, meadowEntryMap, type WorldMapDefinition } from '$lib/game/content/maps';
import { startingPlayer } from '$lib/game/content/player';
import { getXpForLevel } from '$lib/game/core/progression';
import { createEmptyEquipment, type EquipmentState } from '$lib/game/core/equipment';
import type { InventoryState } from '$lib/game/core/inventory';
import type { ItemDrop } from '$lib/game/core/loot';
import type { Direction } from '$lib/game/core/types';

export type SaveState = {
	version: 2;
	mapId: string;
	player: {
		level: number;
		xp: number;
		hp: number;
		attack: number;
		x: number;
		y: number;
		facing: Direction;
	};
	flags: {
		clearedEncounters: string[];
		collectedPickups: string[];
		resolvedEncounterDrops: Record<string, ItemDrop[]>;
	};
	inventory: InventoryState;
	equipment: EquipmentState;
};
```

Update `createNewSaveState()`:

```ts
export function createNewSaveState(): SaveState {
	return {
		version: 2,
		mapId: meadowEntryMap.id,
		player: {
			level: 1,
			xp: getXpForLevel(1),
			hp: startingPlayer.baseHp,
			attack: startingPlayer.baseAttack,
			x: meadowEntryMap.spawn.x,
			y: meadowEntryMap.spawn.y,
			facing: meadowEntryMap.spawnDirection
		},
		flags: { clearedEncounters: [], collectedPickups: [], resolvedEncounterDrops: {} },
		inventory: {
			stacks: [{ itemId: 'field-potion', quantity: 1 }],
			equipment: ['training-sword']
		},
		equipment: { ...createEmptyEquipment(), weapon: 'training-sword' }
	};
}
```

Update `isSaveState` to require `version === 2`, `inventory`, `equipment`, `flags.collectedPickups`, and `flags.resolvedEncounterDrops`. Add helpers:

```ts
function isInventoryState(value: unknown): value is InventoryState {
	if (!isRecord(value) || !Array.isArray(value.stacks) || !Array.isArray(value.equipment)) {
		return false;
	}

	return (
		value.stacks.every(
			(stack) =>
				isRecord(stack) &&
				typeof stack.itemId === 'string' &&
				isNumber(stack.quantity) &&
				stack.quantity >= 1
		) && value.equipment.every((itemId) => typeof itemId === 'string')
	);
}

function isEquipmentState(value: unknown): value is EquipmentState {
	if (!isRecord(value)) {
		return false;
	}

	return ['weapon', 'head', 'body', 'hands', 'accessory'].every(
		(slot) => value[slot] === null || typeof value[slot] === 'string'
	);
}

function isResolvedDrops(value: unknown): value is Record<string, ItemDrop[]> {
	if (!isRecord(value)) {
		return false;
	}

	return Object.values(value).every(
		(drops) =>
			Array.isArray(drops) &&
			drops.every(
				(drop) =>
					isRecord(drop) &&
					typeof drop.itemId === 'string' &&
					isNumber(drop.quantity) &&
					drop.quantity >= 1
			)
	);
}
```

Remove `DEFAULT_HEAL_CHARGES`, `normalizeSaveState` consumable migration, and any `consumables` validation.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run test:unit -- src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/save/save-state.ts src/lib/game/save/save-state.test.ts src/lib/game/save/storage.test.ts
git commit -m "Upgrade saves for item state"
```

## Task 6: Map Pickups

**Files:**
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/content/maps.test.ts`

- [ ] **Step 1: Write failing pickup content tests**

Add to `src/lib/game/content/maps.test.ts`:

```ts
import { items } from '$lib/game/content/items';

it('defines valid placed pickups with stable ids and item ids', () => {
	const pickups = Object.values(maps).flatMap((map) => map.pickups ?? []);

	expect(pickups.length).toBeGreaterThan(0);
	expect(new Set(pickups.map((pickup) => pickup.id)).size).toBe(pickups.length);

	for (const pickup of pickups) {
		const map = Object.values(maps).find((entry) => entry.pickups?.some((candidate) => candidate.id === pickup.id));
		expect(items[pickup.itemId]).toBeDefined();
		expect(pickup.quantity).toBeGreaterThan(0);
		expect(pickup.x).toBeGreaterThanOrEqual(0);
		expect(pickup.y).toBeGreaterThanOrEqual(0);
		expect(pickup.x).toBeLessThanOrEqual((map?.width ?? 0) * 32);
		expect(pickup.y).toBeLessThanOrEqual((map?.height ?? 0) * 32);
	}
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/content/maps.test.ts --run`

Expected: FAIL because `WorldMapDefinition` does not expose `pickups`.

- [ ] **Step 3: Add pickup definitions**

Modify `src/lib/game/content/maps.ts`:

```ts
export interface MapPickup {
	id: string;
	x: number;
	y: number;
	itemId: string;
	quantity: number;
	label?: string;
}

export interface WorldMapDefinition extends MapDefinition {
	spawn: {
		x: number;
		y: number;
	};
	transitions: MapTransition[];
	pickups?: MapPickup[];
	encounter?: MapEncounter;
}
```

Add pickups:

```ts
pickups: [
	{ id: 'meadow-entry-potion', x: 512, y: 1_184, itemId: 'field-potion', quantity: 2 },
	{ id: 'meadow-entry-charm', x: 896, y: 1_408, itemId: 'meadow-charm', quantity: 1 },
	{ id: 'meadow-entry-token', x: 1_024, y: 1_152, itemId: 'meadow-token', quantity: 1 }
]
```

```ts
pickups: [
	{ id: 'ruins-threshold-cap', x: 416, y: 352, itemId: 'iron-cap', quantity: 1 },
	{ id: 'ruins-threshold-rune', x: 576, y: 608, itemId: 'threshold-rune', quantity: 1 },
	{ id: 'ruins-threshold-salve', x: 320, y: 640, itemId: 'sunleaf-salve', quantity: 2 }
]
```

```ts
pickups: [
	{ id: 'ruins-core-mail', x: 448, y: 608, itemId: 'stone-mail', quantity: 1 },
	{ id: 'ruins-core-draught', x: 544, y: 352, itemId: 'ruin-draught', quantity: 1 }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test:unit -- src/lib/game/content/maps.test.ts --run`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts
git commit -m "Add placed item pickups"
```

## Task 7: Typed HUD Bridge

**Files:**
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/ui-bridge/store.ts`

- [ ] **Step 1: Update bridge types**

Modify `src/lib/game/ui-bridge/events.ts` so `HudCommand` becomes:

```ts
import type { EquipmentSlot } from '$lib/game/content/items';

export type HudInventoryStack = {
	itemId: string;
	name: string;
	description: string;
	quantity: number;
};

export type HudEquipmentItem = {
	itemId: string;
	name: string;
	description: string;
	slot: EquipmentSlot;
	equipped: boolean;
	modifiers: {
		attack?: number;
		defense?: number;
		maxHp?: number;
	};
};

export type HudKeyItem = {
	itemId: string;
	name: string;
	description: string;
	quantity: number;
};

export type HudState = {
	ready: boolean;
	mapId: string;
	hp: number;
	maxHp: number;
	level: number;
	xp: number;
	attack: number;
	defense: number;
	heals: number;
	canResume: boolean;
	status: string;
	inventory: {
		consumables: HudInventoryStack[];
		equipment: HudEquipmentItem[];
		keyItems: HudKeyItem[];
		equipped: Record<EquipmentSlot, string | null>;
	};
};

export type HudCommand =
	| { type: 'heal' }
	| { type: 'resume-save' }
	| { type: 'save' }
	| { type: 'pause-game' }
	| { type: 'resume-game' }
	| { type: 'use-item'; itemId: string }
	| { type: 'equip-item'; itemId: string }
	| { type: 'unequip-slot'; slot: EquipmentSlot };
```

- [ ] **Step 2: Update store helpers**

Modify `src/lib/game/ui-bridge/store.ts`:

```ts
import type { EquipmentSlot } from '$lib/game/content/items';
```

Set `initialHudState.inventory` to empty arrays and all slots null.

Update helpers:

```ts
export function requestSave() {
	emitHudCommand({ type: 'save' });
}

export function requestResume() {
	emitHudCommand({ type: 'resume-save' });
}

export function requestHeal() {
	emitHudCommand({ type: 'heal' });
}

export function requestPauseGame() {
	emitHudCommand({ type: 'pause-game' });
}

export function requestResumeGame() {
	emitHudCommand({ type: 'resume-game' });
}

export function requestUseItem(itemId: string) {
	emitHudCommand({ type: 'use-item', itemId });
}

export function requestEquipItem(itemId: string) {
	emitHudCommand({ type: 'equip-item', itemId });
}

export function requestUnequipSlot(slot: EquipmentSlot) {
	emitHudCommand({ type: 'unequip-slot', slot });
}
```

- [ ] **Step 3: Run type check to verify integration failures**

Run: `bun run check`

Expected: FAIL in `WorldScene.ts` because it still compares commands as strings and emits old HUD shape.

- [ ] **Step 4: Commit bridge change after Task 8 fixes type errors**

Do not commit this task until Task 8 passes `bun run check`; the bridge and scene changes must land together to keep the tree type-safe.

## Task 8: WorldScene Item State And Commands

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Continue: `src/lib/game/ui-bridge/events.ts`
- Continue: `src/lib/game/ui-bridge/store.ts`

- [ ] **Step 1: Update scene command tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update direct command calls from string form to object form:

```ts
const sceneState = scene as unknown as {
	handleHudCommand: (command: { type: 'pause-game' } | { type: 'resume-game' }) => void;
};

sceneState.handleHudCommand({ type: 'pause-game' });
sceneState.handleHudCommand({ type: 'resume-game' });
```

Add a new test:

```ts
it('uses item commands to consume potions and publish inventory state', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		playerProgress: { hp: number };
		handleHudCommand: (command: { type: 'use-item'; itemId: string }) => void;
	};

	scene.create({ mapId: 'meadow-entry' });
	sceneState.playerProgress.hp = 10;
	sceneState.handleHudCommand({ type: 'use-item', itemId: 'field-potion' });

	expect(sceneState.playerProgress.hp).toBe(18);
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(
		expect.objectContaining({
			status: 'Used Field Potion',
			inventory: expect.objectContaining({
				consumables: []
			})
		})
	);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because `WorldScene` has not implemented typed item commands.

- [ ] **Step 3: Add item state fields and initialization**

Modify imports in `WorldScene.ts`:

```ts
import { getItem, itemList, type EquipmentSlot } from '$lib/game/content/items';
import { createEmptyEquipment, equipItem, unequipSlot, type EquipmentState } from '$lib/game/core/equipment';
import { addItem, consumeStackItem, type InventoryState } from '$lib/game/core/inventory';
import { resolveLootDrops, type ItemDrop } from '$lib/game/core/loot';
import { clampHpToMax, deriveEffectiveStats } from '$lib/game/core/stats';
```

Add fields:

```ts
private collectedPickupIds = new Set<string>();
private equipment: EquipmentState = createEmptyEquipment();
private inventory: InventoryState = { stacks: [], equipment: [] };
private resolvedEncounterDrops: Record<string, ItemDrop[]> = {};
```

Initialize in `create()`:

```ts
this.collectedPickupIds = new Set(activeSave?.flags.collectedPickups ?? []);
this.resolvedEncounterDrops = activeSave?.flags.resolvedEncounterDrops ?? {};
this.inventory = activeSave?.inventory ?? createNewSaveState().inventory;
this.equipment = activeSave?.equipment ?? createNewSaveState().equipment;
```

- [ ] **Step 4: Replace command handling**

Update `handleHudCommand`:

```ts
private handleHudCommand(command: HudCommand) {
	if (command.type === 'pause-game') {
		this.simulationPaused = true;
		return;
	}

	if (command.type === 'resume-game') {
		this.simulationPaused = false;
		return;
	}

	if (command.type === 'heal') {
		this.consumeFirstHealingItem();
		return;
	}

	if (command.type === 'use-item') {
		this.useItem(command.itemId);
		return;
	}

	if (command.type === 'equip-item') {
		this.equipInventoryItem(command.itemId);
		return;
	}

	if (command.type === 'unequip-slot') {
		this.unequipInventorySlot(command.slot);
		return;
	}

	if (command.type === 'resume-save') {
		this.resumeStoredSave();
		return;
	}

	this.saveCurrentState();
}
```

Add helpers:

```ts
private consumeFirstHealingItem() {
	const healingItem = this.inventory.stacks
		.map((stack) => getItem(stack.itemId))
		.find((item) => item?.type === 'consumable' && item.effect.type === 'heal');

	if (!healingItem) {
		this.publishHudState('No healing items left');
		return;
	}

	this.useItem(healingItem.id);
}

private useItem(itemId: string) {
	const item = getItem(itemId);
	const maxHp = this.getMaxHp();

	if (!item || item.type !== 'consumable') {
		this.publishHudState('Item cannot be used');
		return;
	}

	if (this.playerProgress.hp >= maxHp) {
		this.publishHudState('HP already full');
		return;
	}

	const result = consumeStackItem(this.inventory, itemId);

	if (!result.consumed) {
		this.publishHudState('Item not found');
		return;
	}

	this.inventory = result.inventory;
	this.playerProgress = {
		...this.playerProgress,
		hp: Math.min(maxHp, this.playerProgress.hp + item.effect.amount)
	};
	this.publishHudState(`Used ${item.name}`);
}

private equipInventoryItem(itemId: string) {
	const result = equipItem(this.equipment, this.inventory.equipment, itemId);

	if (!result.equipped) {
		this.publishHudState('Equipment not found');
		return;
	}

	this.equipment = result.equipment;
	this.playerProgress = {
		...this.playerProgress,
		hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
	};
	this.publishHudState(`Equipped ${getItem(itemId)?.name ?? 'item'}`);
}

private unequipInventorySlot(slot: EquipmentSlot) {
	this.equipment = unequipSlot(this.equipment, slot);
	this.playerProgress = {
		...this.playerProgress,
		hp: clampHpToMax(this.playerProgress.hp, this.getEffectiveStats())
	};
	this.publishHudState('Equipment removed');
}
```

- [ ] **Step 5: Derive effective stats and HUD state**

Replace `getMaxHp()`:

```ts
private getBaseMaxHp() {
	return this.playerProgress.level > 1 ? startingPlayer.baseHp + 4 : startingPlayer.baseHp;
}

private getEffectiveStats() {
	return deriveEffectiveStats(
		{
			hp: this.getBaseMaxHp(),
			attack: this.playerProgress.attack,
			defense: 0
		},
		this.equipment
	);
}

private getMaxHp() {
	return this.getEffectiveStats().maxHp;
}
```

Use `this.getEffectiveStats().attack` for player damage and `this.getEffectiveStats().defense` when resolving enemy hits:

```ts
{ power: this.getEffectiveStats().attack }
```

```ts
{ hp: this.playerProgress.hp, defense: this.getEffectiveStats().defense }
```

Update `publishHudState`:

```ts
const effectiveStats = this.getEffectiveStats();

emitHudState({
	ready: true,
	mapId: this.mapId,
	hp: this.playerProgress.hp,
	maxHp: effectiveStats.maxHp,
	level: this.playerProgress.level,
	xp: this.playerProgress.xp,
	attack: effectiveStats.attack,
	defense: effectiveStats.defense,
	heals: this.inventory.stacks
		.filter((stack) => getItem(stack.itemId)?.type === 'consumable')
		.reduce((total, stack) => total + stack.quantity, 0),
	canResume: saveResult.status === 'loaded',
	status,
	inventory: this.buildHudInventory()
});
```

Add:

```ts
private buildHudInventory(): HudState['inventory'] {
	return {
		consumables: this.inventory.stacks
			.map((stack) => ({ stack, item: getItem(stack.itemId) }))
			.filter((entry) => entry.item?.type === 'consumable')
			.map(({ stack, item }) => ({
				itemId: stack.itemId,
				name: item!.name,
				description: item!.description,
				quantity: stack.quantity
			})),
		equipment: this.inventory.equipment
			.map((itemId) => getItem(itemId))
			.filter((item) => item?.type === 'equipment')
			.map((item) => ({
				itemId: item.id,
				name: item.name,
				description: item.description,
				slot: item.slot,
				equipped: this.equipment[item.slot] === item.id,
				modifiers: item.modifiers
			})),
		keyItems: this.inventory.stacks
			.map((stack) => ({ stack, item: getItem(stack.itemId) }))
			.filter((entry) => entry.item?.type === 'key')
			.map(({ stack, item }) => ({
				itemId: stack.itemId,
				name: item!.name,
				description: item!.description,
				quantity: stack.quantity
			})),
		equipped: this.equipment
	};
}
```

- [ ] **Step 6: Update save building**

Modify `buildSaveState()`:

```ts
flags: {
	clearedEncounters: [...this.clearedEncounterIds].sort(),
	collectedPickups: [...this.collectedPickupIds].sort(),
	resolvedEncounterDrops: this.resolvedEncounterDrops
},
inventory: this.inventory,
equipment: this.equipment
```

- [ ] **Step 7: Run scene tests and type check**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

Run: `bun run check`

Expected: PASS.

- [ ] **Step 8: Commit bridge and scene state**

```bash
git add src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Wire item state into game scene"
```

## Task 9: Pickup Collection And Encounter Drops

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write failing pickup and drop tests**

Add to `src/lib/game/phaser/scenes/scenes.test.ts`:

```ts
it('renders and collects uncollected map pickups', async () => {
	const events = await import('$lib/game/ui-bridge/events');
	const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		inventory: { stacks: { itemId: string; quantity: number }[] };
	};

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 512, y: 1_184 });
	scene.update(0, 16);

	expect(sceneState.inventory.stacks).toContainEqual({ itemId: 'field-potion', quantity: 3 });
	expect(emitHudStateSpy).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'Found Field Potion' }));
});

it('awards encounter drops once when an enemy is defeated', async () => {
	const { WorldScene } = await import('./WorldScene');
	const scene = new WorldScene();
	const sceneState = scene as unknown as {
		inventory: { stacks: { itemId: string; quantity: number }[] };
		resolvedEncounterDrops: Record<string, { itemId: string; quantity: number }[]>;
	};

	scene.create({ mapId: 'meadow-entry' });
	Object.assign(phaserState.playerMarker, { x: 1_280, y: 1_280 });
	scene.update(0, 16);

	expect(sceneState.resolvedEncounterDrops['slime-scout']).toBeDefined();
	expect(sceneState.inventory.stacks.some((stack) => stack.itemId === 'field-potion')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: FAIL because pickups and drops are not integrated.

- [ ] **Step 3: Render pickups**

Add marker type:

```ts
type PickupMarker = {
	setDisplaySize: (width: number, height: number) => unknown;
	setVisible: (visible: boolean) => unknown;
};
```

Add field:

```ts
private pickupMarkers = new Map<string, PickupMarker>();
```

In `create()` after `renderTransitions(map)`:

```ts
this.renderPickups(map);
```

Add:

```ts
private renderPickups(map: WorldMapDefinition) {
	this.pickupMarkers.clear();

	for (const pickup of map.pickups ?? []) {
		if (this.collectedPickupIds.has(pickup.id)) {
			continue;
		}

		const marker = this.add.image(pickup.x, pickup.y, starterPackAsset.key, 'healFlask') as PickupMarker;
		marker.setDisplaySize(28, 32);
		this.pickupMarkers.set(pickup.id, marker);
	}
}
```

- [ ] **Step 4: Collect pickups during update**

In `update()` after transition check and before combat:

```ts
this.tryCollectPickup();
```

Add:

```ts
private tryCollectPickup() {
	if (!this.player) {
		return;
	}

	const map = this.resolveMap(this.mapId);

	for (const pickup of map.pickups ?? []) {
		if (this.collectedPickupIds.has(pickup.id)) {
			continue;
		}

		const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);

		if (distance > WorldScene.playerRadius + 18) {
			continue;
		}

		this.inventory = addItem(this.inventory, pickup.itemId, pickup.quantity);
		this.collectedPickupIds.add(pickup.id);
		this.pickupMarkers.get(pickup.id)?.setVisible(false);
		this.publishHudState(`Found ${getItem(pickup.itemId)?.name ?? 'item'}`);
		return;
	}
}
```

- [ ] **Step 5: Award encounter drops on finish**

In `finishEncounter()` after adding cleared encounter id:

```ts
this.awardEncounterDrops(this.enemy.definition.id);
```

Add:

```ts
private awardEncounterDrops(encounterId: string) {
	if (!this.enemy) {
		return;
	}

	const drops =
		this.resolvedEncounterDrops[encounterId] ?? resolveLootDrops(this.enemy.definition.loot);

	this.resolvedEncounterDrops = {
		...this.resolvedEncounterDrops,
		[encounterId]: drops
	};

	for (const drop of drops) {
		this.inventory = addItem(this.inventory, drop.itemId, drop.quantity);
	}
}
```

- [ ] **Step 6: Make scene tests deterministic**

In the drop test, force a drop by temporarily stubbing `Math.random`:

```ts
const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
// run scene defeat
randomSpy.mockRestore();
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Add pickup collection and encounter drops"
```

## Task 10: Inventory Overlay UI

**Files:**
- Modify: `src/lib/game/GameShell.svelte`

- [ ] **Step 1: Discover Svelte docs for overlay work**

Use the Svelte MCP `list-sections` first, then fetch relevant Svelte 5 documentation for event handlers, runes, and conditional rendering. If the MCP tool is unavailable in the current session, continue with existing project patterns in `GameShell.svelte`.

- [ ] **Step 2: Add overlay state and helpers**

Modify `src/lib/game/GameShell.svelte` imports:

```svelte
import {
	hudState,
	requestEquipItem,
	requestHeal,
	requestPauseGame,
	requestResume,
	requestResumeGame,
	requestSave,
	requestUnequipSlot,
	requestUseItem
} from '$lib/game/ui-bridge/store';
import type { EquipmentSlot } from '$lib/game/content/items';
```

Add state:

```svelte
let inventoryOpen = $state(false);
let activeInventoryTab = $state<'consumables' | 'equipment' | 'keyItems'>('consumables');
const equipmentSlots: { slot: EquipmentSlot; label: string }[] = [
	{ slot: 'weapon', label: 'Weapon' },
	{ slot: 'head', label: 'Head' },
	{ slot: 'body', label: 'Body' },
	{ slot: 'hands', label: 'Hands' },
	{ slot: 'accessory', label: 'Accessory' }
];

function openInventory() {
	if (inventoryOpen) return;
	inventoryOpen = true;
	settingsOpen = false;
	requestPauseGame();
}

function closeInventory() {
	if (!inventoryOpen) return;
	inventoryOpen = false;
	requestResumeGame();
}

function closeAllMenus() {
	if (inventoryOpen) {
		closeInventory();
		return;
	}
	closeSettings();
}
```

- [ ] **Step 3: Add menu entry button**

Inside the settings menu action grid, add:

```svelte
<button
	type="button"
	class="hud-action rounded-[1.1rem] border border-emerald-200/20 bg-[linear-gradient(135deg,rgba(24,92,68,0.95),rgba(12,42,36,0.92))] px-4 py-3 text-sm font-black uppercase tracking-[0.24em] text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:shadow-[0_15px_30px_rgba(74,255,172,0.2)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
	onclick={openInventory}
	disabled={!$hudState.ready}
>
	Inventory
</button>
```

- [ ] **Step 4: Add overlay markup**

After settings `<aside>`, add:

```svelte
{#if inventoryOpen}
	<div
		class="absolute inset-0 z-50 bg-black/42 backdrop-blur-[3px]"
		role="presentation"
		onclick={closeInventory}
	></div>
	<section
		class="pointer-events-auto absolute left-1/2 top-1/2 z-[60] grid w-[min(58rem,calc(100vw-2rem))] max-h-[min(42rem,calc(100vh-2rem))] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-[1.8rem] border border-white/14 bg-[linear-gradient(145deg,rgba(9,15,36,0.98),rgba(20,18,52,0.96))] p-4 text-slate-50 shadow-[0_34px_100px_rgba(0,0,0,0.58)] backdrop-blur-md md:grid-cols-[1fr_18rem]"
		aria-label="Inventory and equipment"
	>
		<div class="grid min-h-0 gap-4">
			<div class="flex items-start justify-between gap-3">
				<div>
					<p class="text-[0.62rem] font-black uppercase tracking-[0.34em] text-emerald-100/68">
						Field Pack
					</p>
					<h2 class="mt-1 text-2xl font-black uppercase tracking-[0.1em] text-white">
						Inventory
					</h2>
				</div>
				<button
					type="button"
					class="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.24em] text-slate-100 transition hover:border-white/30"
					onclick={closeInventory}
				>
					Close
				</button>
			</div>

			<div class="flex flex-wrap gap-2">
				{#each ['consumables', 'equipment', 'keyItems'] as tab}
					<button
						type="button"
						class={`rounded-full border px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.2em] transition ${
							activeInventoryTab === tab
								? 'border-emerald-200/50 bg-emerald-200/16 text-emerald-50'
								: 'border-white/10 bg-white/6 text-slate-200/78 hover:border-white/24'
						}`}
						onclick={() => (activeInventoryTab = tab as typeof activeInventoryTab)}
					>
						{tab === 'keyItems' ? 'Key Items' : tab}
					</button>
				{/each}
			</div>

			<div class="min-h-0 overflow-y-auto pr-1">
				{#if activeInventoryTab === 'consumables'}
					<div class="grid gap-2">
						{#each $hudState.inventory.consumables as item}
							<div class="rounded-2xl border border-white/10 bg-white/6 p-3">
								<div class="flex items-start justify-between gap-3">
									<div>
										<h3 class="font-black uppercase tracking-[0.08em]">{item.name} x{item.quantity}</h3>
										<p class="mt-1 text-sm text-slate-200/72">{item.description}</p>
									</div>
									<button
										type="button"
										class="rounded-full border border-amber-200/30 bg-amber-300/12 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-amber-50 disabled:cursor-not-allowed disabled:opacity-45"
										onclick={() => requestUseItem(item.itemId)}
										disabled={$hudState.hp >= $hudState.maxHp}
									>
										Use
									</button>
								</div>
							</div>
						{:else}
							<p class="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-200/72">
								No consumables.
							</p>
						{/each}
					</div>
				{:else if activeInventoryTab === 'equipment'}
					<div class="grid gap-2">
						{#each $hudState.inventory.equipment as item}
							<div class="rounded-2xl border border-white/10 bg-white/6 p-3">
								<div class="flex items-start justify-between gap-3">
									<div>
										<h3 class="font-black uppercase tracking-[0.08em]">{item.name}</h3>
										<p class="mt-1 text-sm text-slate-200/72">{item.description}</p>
										<p class="mt-2 text-[0.62rem] font-black uppercase tracking-[0.22em] text-cyan-100/70">
											{item.slot}
										</p>
									</div>
									<button
										type="button"
										class="rounded-full border border-cyan-200/30 bg-cyan-300/12 px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.2em] text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
										onclick={() => requestEquipItem(item.itemId)}
										disabled={item.equipped}
									>
										{item.equipped ? 'Equipped' : 'Equip'}
									</button>
								</div>
							</div>
						{:else}
							<p class="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-200/72">
								No equipment.
							</p>
						{/each}
					</div>
				{:else}
					<div class="grid gap-2">
						{#each $hudState.inventory.keyItems as item}
							<div class="rounded-2xl border border-white/10 bg-white/6 p-3">
								<h3 class="font-black uppercase tracking-[0.08em]">{item.name}</h3>
								<p class="mt-1 text-sm text-slate-200/72">{item.description}</p>
							</div>
						{:else}
							<p class="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-slate-200/72">
								No key items.
							</p>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<aside class="grid content-start gap-3 rounded-[1.4rem] border border-white/10 bg-white/6 p-3">
			<h3 class="text-sm font-black uppercase tracking-[0.24em] text-slate-100">Equipment</h3>
			{#each equipmentSlots as entry}
				<div class="rounded-2xl border border-white/8 bg-black/12 p-3">
					<div class="flex items-center justify-between gap-2">
						<p class="text-[0.62rem] font-black uppercase tracking-[0.22em] text-slate-300/72">
							{entry.label}
						</p>
						{#if $hudState.inventory.equipped[entry.slot]}
							<button
								type="button"
								class="text-[0.58rem] font-black uppercase tracking-[0.18em] text-rose-100/82"
								onclick={() => requestUnequipSlot(entry.slot)}
							>
								Remove
							</button>
						{/if}
					</div>
					<p class="mt-1 text-sm font-bold text-white">
						{$hudState.inventory.equipment.find((item) => item.itemId === $hudState.inventory.equipped[entry.slot])?.name ?? 'Empty'}
					</p>
				</div>
			{/each}
			<div class="rounded-2xl border border-emerald-200/14 bg-emerald-200/8 p-3 text-sm text-emerald-50/82">
				<p>ATK {$hudState.attack}</p>
				<p>DEF {$hudState.defense}</p>
				<p>HP {$hudState.hp} / {$hudState.maxHp}</p>
			</div>
		</aside>
	</section>
{/if}
```

- [ ] **Step 5: Run Svelte autofixer**

Call the Svelte MCP `svelte-autofixer` on the modified `GameShell.svelte`. Keep calling it until it reports no issues. If the MCP tool is unavailable, run `bun run check` and fix reported Svelte diagnostics manually.

- [ ] **Step 6: Run checks**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/game/GameShell.svelte
git commit -m "Add inventory equipment overlay"
```

## Task 11: End-To-End Verification

**Files:**
- Modify: `src/routes/game/page.svelte.e2e.ts`

- [ ] **Step 1: Add e2e coverage**

Modify `src/routes/game/page.svelte.e2e.ts` to include:

```ts
test('inventory overlay opens from the menu', async ({ page }) => {
	await page.goto('/game');
	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Inventory' }).click();

	await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
	await expect(page.getByText(/Equipment/i)).toBeVisible();
	await expect(page.getByText(/Field Potion/i)).toBeVisible();
});
```

- [ ] **Step 2: Run targeted unit suite**

Run:

```bash
bun run test:unit -- src/lib/game/content/items.test.ts src/lib/game/core/inventory.test.ts src/lib/game/core/equipment.test.ts src/lib/game/core/stats.test.ts src/lib/game/core/loot.test.ts src/lib/game/save/save-state.test.ts src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS.

- [ ] **Step 3: Run type check**

Run: `bun run check`

Expected: PASS.

- [ ] **Step 4: Run e2e test**

Run: `bun run test:e2e -- --grep "inventory overlay opens from the menu"`

Expected: PASS.

- [ ] **Step 5: Run full test suite**

Run: `bun run test`

Expected: PASS.

- [ ] **Step 6: Commit verification**

```bash
git add src/routes/game/page.svelte.e2e.ts
git commit -m "Cover inventory overlay e2e"
```

## Self-Review

- Spec coverage: Tasks cover content definitions, inventory rules, equipment slots, stat modifiers, loot resolution, map pickups, save version 2, typed bridge commands, Phaser pickup/drop/use/equip integration, Svelte overlay, and verification.
- Placeholder scan: The plan contains no `TBD`, `TODO`, or unspecified implementation steps. The only conditional instruction is the Svelte MCP fallback, which is an environment contingency with concrete fallback behavior.
- Type consistency: `EquipmentSlot`, `InventoryState`, `EquipmentState`, `ItemDrop`, `LootTable`, `HudCommand`, and `HudState['inventory']` are introduced before use in later tasks.
