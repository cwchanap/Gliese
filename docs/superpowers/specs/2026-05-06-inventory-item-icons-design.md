# Inventory Item Icons Design

## Summary

Replace the current text-heavy player inventory slots with image-first item tiles. Each existing item gets a small unique pixel-art icon, the inventory uses double-click for consumable use and equipment equip actions, and descriptions move into a floating hover tooltip.

This is a focused presentation and interaction change for the player inventory. It should preserve the current item rules, save schema, HUD bridge command names, and shop behavior.

## Goals

- Create a unique inventory icon for every current item.
- Keep item icon assets small, targeting `96x96` PNG files.
- Store runtime item icons under `static/game/assets/items/`.
- Add item icon metadata to the item display model.
- Render image-first inventory slots in `GameShell.svelte`.
- Remove visible `Use` and `Equip` buttons from inventory slots.
- Trigger consumable use and equipment equip by double-clicking the occupied slot.
- Move item descriptions out of slots and into a floating tooltip.
- Keep key items visible but non-actionable.

## Non-Goals

- No shop UI redesign.
- No save schema change.
- No legacy save migration.
- No keyboard fallback for use or equip actions.
- No new item types, item rules, stats, quests, or crafting.
- No Phaser runtime use of these icons unless a future feature needs it.

## Asset Direction

Generate one transparent pixel-art PNG per current item. Icons should match the JRPG sprite direction already used in the game: readable silhouettes, simple fantasy materials, strong contrast, and no baked text.

The target runtime size is `96x96` pixels per icon. If the generation tool produces a larger source, the implementation should downscale or export the final project asset as `96x96` before wiring it into the app.

Expected paths:

- `static/game/assets/items/field-potion.png`
- `static/game/assets/items/greater-field-potion.png`
- `static/game/assets/items/ember-tonic.png`
- `static/game/assets/items/ruin-draught.png`
- `static/game/assets/items/sunleaf-salve.png`
- `static/game/assets/items/training-sword.png`
- `static/game/assets/items/ruin-blade.png`
- `static/game/assets/items/iron-cap.png`
- `static/game/assets/items/warden-crown.png`
- `static/game/assets/items/traveler-vest.png`
- `static/game/assets/items/stone-mail.png`
- `static/game/assets/items/grip-wraps.png`
- `static/game/assets/items/meadow-charm.png`
- `static/game/assets/items/meadow-token.png`
- `static/game/assets/items/threshold-rune.png`
- `static/game/assets/items/warden-sigil.png`

Every transparent PNG should be validated for a real alpha channel before it is accepted into the project.

## Data Model

Add an `iconPath` field to the base item definition in `src/lib/game/content/items.ts`. Keeping the icon path beside the existing `name`, `description`, and type metadata makes the Svelte inventory rendering data-driven without adding a separate lookup table.

`WorldScene` should include `iconPath` in all HUD inventory payloads for consumables, equipment, and key items so `GameShell.svelte` can render from bridge state without importing item content directly. The bridge payloads should stay display-oriented and should not expose Phaser internals.

## Inventory UI

Occupied inventory slots become image-first tiles:

- Center the item icon as the primary content.
- Show quantity as a small badge for stackable items.
- Show equipment slot and equipped state as compact badges for equipment.
- Show a small key-item badge for key items.
- Keep the item name available as the slot label for browser querying and screen-reader text, but do not make text the primary visual content.
- Remove inline description text from the slot.
- Keep empty slots stable so the grid does not shift.

The current inventory tabs can remain:

- Consumables
- Equipment
- Key Items

The current equipped panel can remain, including the explicit `Remove` action for unequipping slots.

## Interaction Behavior

Double-click is the only inventory slot action for use/equip:

- Double-clicking a consumable slot calls `requestUseItem(itemId)`.
- Double-clicking an unequipped equipment slot calls `requestEquipItem(itemId)`.
- Double-clicking equipped equipment does nothing and leaves the equipped badge visible.
- Double-clicking a key item does nothing.
- Double-clicking an empty slot does nothing.

The implementation should preserve the existing scene-side validation and feedback. For example, using a potion at full HP should still route through the current command path so the game can report that HP is already full.

## Tooltip Behavior

Descriptions move to a floating tooltip shown when the pointer hovers an occupied inventory slot. The tooltip should include:

- item name
- item description
- quantity for stackable items
- equipment slot and modifiers for equipment
- key-item marker for key items

The tooltip should float over the inventory overlay rather than taking space inside the grid tile. It should avoid clipping near the dialog edges where practical and should not block double-click interaction.

## Testing

Add or update coverage for:

- every item definition has an `iconPath`
- every referenced icon file exists under `static/game/assets/items/`
- project item icons are `96x96` PNG files with transparency where expected
- HUD inventory payloads include icon paths for consumables, equipment, and key items
- inventory slots render item images instead of inline descriptions
- visible `Use` and `Equip` buttons are removed from the inventory grid
- double-clicking a consumable uses the existing item command path
- double-clicking unequipped equipment uses the existing equip command path
- key items remain visible and non-actionable

Focused verification should include the Svelte inventory e2e coverage plus the relevant content and scene tests. Because `GameShell.svelte` will be edited, the Svelte autofixer must be run before implementation is considered complete.

## Scope Guardrails

This pass should stop once the player inventory is image-first, double-click actions work, and item descriptions live in the tooltip. Shops, world pickups, Phaser item sprites, and broader item behavior should stay unchanged unless they need a small metadata thread-through for the approved inventory UI.
