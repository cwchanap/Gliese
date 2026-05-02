# Item System Design

## Summary

Add a data-driven item system to the Phaser JRPG vertical slice. The first pass includes placed world pickups, enemy drops, consumables, key items, and full equipment slots.

The implementation should keep item rules out of the Phaser scene. Static content lives in `content`, pure item and stat rules live in `core`, save validation lives in `save`, and Svelte owns the dedicated inventory/equipment overlay through the existing HUD event bridge.

## Goals

- Let the player collect placed pickups from maps.
- Let encounters award guaranteed and chance-based item drops.
- Add a dedicated inventory/equipment overlay that pauses gameplay while open.
- Support consumables, equipment, and key items.
- Support equipment slots for `weapon`, `head`, `body`, `hands`, and `accessory`.
- Apply equipment as stat modifiers only in the first pass.
- Save and load inventory, equipment, collected pickups, and resolved encounter drops.
- Replace the current heal-charge-only model with a generalized item model.

## Non-Goals

- No legacy save migration. Old or invalid saves reset to a new run.
- No shops, vendors, or crafting.
- No item gates, locked doors, or quest unlocks.
- No weapon behavior changes such as altered attack range or cooldown.
- No status effects or timed buffs.
- No duplicate equipment instances unless a concrete implementation need appears.

## Architecture

The item system should be split into focused units:

- `src/lib/game/content/items.ts` defines static item records.
- `src/lib/game/core/inventory.ts` owns pure inventory operations.
- `src/lib/game/core/equipment.ts` owns equipment slot rules.
- `src/lib/game/core/stats.ts` derives effective player stats from base progression plus equipped items.
- `src/lib/game/core/loot.ts` resolves encounter drops.
- `src/lib/game/content/maps.ts` gains placed pickup definitions.
- `src/lib/game/save/save-state.ts` persists and validates item state.
- `src/lib/game/phaser/scenes/WorldScene.ts` renders pickups, detects collection, awards encounter drops, and publishes item state.
- `src/lib/game/ui-bridge/events.ts` carries typed inventory/equipment commands and HUD state.
- `src/lib/game/GameShell.svelte` renders the inventory/equipment overlay.

This preserves the existing boundary: Phaser owns world interaction, Svelte owns overlay UI, and gameplay rules remain testable without Phaser or DOM.

## Item Model

Items use stable ids and a discriminated type.

### Consumables

Consumables are stackable and usable from the inventory overlay. The first implementation should include five consumables. Effects should be immediate and simple, such as healing or direct stat recovery, because timed buffs and status systems are out of scope.

### Equipment

Equipment is owned by item id and can be equipped into exactly one slot:

- `weapon`
- `head`
- `body`
- `hands`
- `accessory`

Equipment modifies stats only. Valid modifiers for the first pass are attack, defense, and max HP.

The starter roster should include eight equipment items across the five slots.

### Key Items

Key items are collectible and displayed in inventory. They do not unlock transitions, doors, quests, or map behavior in this pass.

The starter roster should include three key items.

## Save Model

The save schema should become `version: 2`. The parser should reject old `version: 1` payloads instead of migrating them.

Persisted item state should include:

- `inventory.stacks`: stackable item id plus quantity for consumables and key items.
- `inventory.equipment`: owned equipment item ids.
- `equipment`: each equipment slot mapped to an equipped item id or empty value.
- `flags.collectedPickups`: stable map pickup ids already collected.
- `flags.resolvedEncounterDrops`: encounter id mapped to the item drops already rolled and awarded.

Chance-based drops must roll only when an encounter is defeated. The resolved result is saved so cleared encounters never reroll after save/load.

## Gameplay Behavior

Placed pickups are defined by map content with:

- stable pickup id
- item id
- quantity
- world coordinates
- optional label

`WorldScene` renders uncollected pickups. The hero collects a pickup by entering a small radius. Collection adds the item to inventory, hides the pickup, records the pickup id, and publishes a short HUD status such as `Found Iron Cap`.

Enemy drops resolve when an encounter is defeated. Important encounters and bosses can award guaranteed drops. Normal encounters can use chance-based drops. The loot resolver should accept a deterministic RNG function in tests so chance behavior can be verified without flaky tests.

Opening the inventory/equipment overlay pauses gameplay. From the overlay, the player can:

- inspect item names, descriptions, quantities, and categories
- use consumables
- equip equipment
- unequip equipment slots
- view key items
- view effective stat summary

Equipment stat changes apply immediately. If unequipping gear lowers max HP below current HP, current HP clamps to the new max HP.

## UI And Bridge

The existing menu should become an entry point to the dedicated inventory/equipment overlay. The overlay should use sections or tabs for:

- Consumables
- Equipment
- Key Items

It should also include an equipment panel showing:

- Weapon
- Head
- Body
- Hands
- Accessory

The HUD bridge should move from string-only commands to typed command payloads because inventory actions require item ids and slot ids. Expected command shapes:

- `{ type: 'pause-game' }`
- `{ type: 'resume-game' }`
- `{ type: 'save' }`
- `{ type: 'resume-save' }`
- `{ type: 'use-item'; itemId: string }`
- `{ type: 'equip-item'; itemId: string }`
- `{ type: 'unequip-slot'; slot: EquipmentSlot }`

HUD state should include enough item data for the Svelte overlay to render without importing Phaser state:

- inventory stacks with item display metadata
- owned equipment with item display metadata and equipped state
- key items with display metadata
- equipped slot summary
- effective stat summary
- existing HP, XP, level, attack, resume, and status values

## Testing

Add or update tests for:

- inventory add, stack, remove, and use rules
- equipment slot validation, replacement, and unequip behavior
- effective stat calculation from base stats plus equipment
- loot resolution with guaranteed drops, chance drops, and deterministic test RNG
- save `version: 2` validation and rejection of old saves
- map pickup definitions with stable ids and valid item ids
- `WorldScene` pickup rendering and collection
- `WorldScene` encounter drop awarding and save state integration
- HUD state publishing for inventory and equipment
- Svelte overlay open/close pause behavior and item command dispatch

If Svelte files are edited, run the required Svelte autofixer before completing implementation work.

## Scope Guardrails

This pass should produce one complete playable loop:

1. The player collects placed items in the world.
2. The player defeats encounters and receives guaranteed or rolled drops.
3. The player opens a paused inventory/equipment overlay.
4. The player uses consumables and equips gear.
5. Effective stats update immediately.
6. Save/load preserves the item state.

Do not expand beyond this loop until it is implemented and verified.
