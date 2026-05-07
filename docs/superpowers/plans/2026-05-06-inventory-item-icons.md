# Inventory Item Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an image-first player inventory with unique `96x96` item icons, double-click use/equip actions, and hover tooltips.

**Architecture:** Item icon metadata belongs in `content/items.ts` and flows through `WorldScene` into the HUD bridge. `GameShell.svelte` remains the only inventory renderer: it shows icon tiles, handles double-click actions, and owns tooltip positioning. Generated item PNGs live under `static/game/assets/items/` and are validated by tests.

**Tech Stack:** SvelteKit, Svelte 5 runes, TypeScript, Phaser HUD bridge, Vitest, Playwright, bun.

---

## File Structure

- Create `static/game/assets/items/*.png`: one transparent `96x96` icon per existing item.
- Modify `src/lib/game/content/items.ts`: add `iconPath` to the base item definition and each item record.
- Modify `src/lib/game/content/items.test.ts`: assert icon metadata, file existence, PNG size, and alpha.
- Modify `src/lib/game/ui-bridge/events.ts`: add `iconPath` to inventory HUD item payload types.
- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: publish `iconPath` in consumable, equipment, and key item HUD payloads.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: assert HUD inventory entries include icon paths.
- Modify `src/lib/game/GameShell.svelte`: render image-first inventory slots, remove `Use`/`Equip` buttons, wire double-click actions, and add hover tooltip.
- Modify `src/routes/game/page.svelte.e2e.ts`: verify icons, tooltip descriptions, no slot action buttons, and double-click use/equip behavior.

## Task 1: Icon Metadata And Asset Contract

**Files:**
- Modify: `src/lib/game/content/items.ts`
- Modify: `src/lib/game/content/items.test.ts`
- Create: `static/game/assets/items/*.png`

- [ ] **Step 1: Write the failing item icon contract test**

Add imports to `src/lib/game/content/items.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
```

Add this test inside `describe('item content', () => { ... })`:

```ts
	it('defines a 96x96 transparent PNG icon for every item', () => {
		for (const item of itemList) {
			expect(item.iconPath).toBe(`/game/assets/items/${item.id}.png`);

			const iconPath = resolve('static', item.iconPath.replace('/game/', 'game/'));
			expect(existsSync(iconPath), `${item.id} icon should exist`).toBe(true);

			const bytes = readFileSync(iconPath);
			expect(bytes.subarray(0, 8)).toEqual(
				Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
			);
			expect(bytes.readUInt32BE(16), `${item.id} icon width`).toBe(96);
			expect(bytes.readUInt32BE(20), `${item.id} icon height`).toBe(96);
			expect(bytes[25], `${item.id} icon color type`).toBe(6);
		}
	});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```sh
bun run test:unit -- src/lib/game/content/items.test.ts --run
```

Expected: FAIL because `iconPath` does not exist on item definitions.

- [ ] **Step 3: Generate/import the item icons**

Generate a consistent pixel-art icon source for the 16 current items. Save final runtime files as:

```text
static/game/assets/items/field-potion.png
static/game/assets/items/greater-field-potion.png
static/game/assets/items/ember-tonic.png
static/game/assets/items/ruin-draught.png
static/game/assets/items/sunleaf-salve.png
static/game/assets/items/training-sword.png
static/game/assets/items/ruin-blade.png
static/game/assets/items/iron-cap.png
static/game/assets/items/warden-crown.png
static/game/assets/items/traveler-vest.png
static/game/assets/items/stone-mail.png
static/game/assets/items/grip-wraps.png
static/game/assets/items/meadow-charm.png
static/game/assets/items/meadow-token.png
static/game/assets/items/threshold-rune.png
static/game/assets/items/warden-sigil.png
```

If the generated source is larger than `96x96`, downscale the final cropped/exported icons to `96x96`. Validate each file has PNG color type `6` so alpha is present.

- [ ] **Step 4: Add `iconPath` to item definitions**

Update `BaseItemDefinition` in `src/lib/game/content/items.ts`:

```ts
type BaseItemDefinition = {
	id: string;
	name: string;
	description: string;
	iconPath: string;
	stackable: boolean;
};
```

Add `iconPath: '/game/assets/items/<item-id>.png'` to every item record.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run:

```sh
bun run test:unit -- src/lib/game/content/items.test.ts --run
```

Expected: PASS.

## Task 2: HUD Bridge Icon Paths

**Files:**
- Modify: `src/lib/game/ui-bridge/events.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

- [ ] **Step 1: Write the failing HUD payload test**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update an existing HUD inventory assertion or add a focused assertion after a scene publishes inventory:

```ts
expect(lastHudState?.inventory.consumables).toEqual(
	expect.arrayContaining([
		expect.objectContaining({
			itemId: 'field-potion',
			iconPath: '/game/assets/items/field-potion.png'
		})
	])
);
expect(lastHudState?.inventory.equipment).toEqual(
	expect.arrayContaining([
		expect.objectContaining({
			itemId: 'training-sword',
			iconPath: '/game/assets/items/training-sword.png'
		})
	])
);
```

Add a key-item assertion in a test save that contains `meadow-token`:

```ts
expect(lastHudState?.inventory.keyItems).toEqual(
	expect.arrayContaining([
		expect.objectContaining({
			itemId: 'meadow-token',
			iconPath: '/game/assets/items/meadow-token.png'
		})
	])
);
```

- [ ] **Step 2: Run the focused scene tests and verify RED**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: FAIL because HUD inventory entries do not include `iconPath`.

- [ ] **Step 3: Add `iconPath` to HUD event types**

Update `src/lib/game/ui-bridge/events.ts`:

```ts
export type HudInventoryStack = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	quantity: number;
};

export type HudEquipmentItem = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	slot: EquipmentSlot;
	equipped: boolean;
	modifiers: StatModifiers;
};

export type HudKeyItem = {
	itemId: string;
	name: string;
	description: string;
	iconPath: string;
	quantity: number;
};
```

- [ ] **Step 4: Publish `iconPath` from `WorldScene`**

In `buildHudInventory()` inside `src/lib/game/phaser/scenes/WorldScene.ts`, add `iconPath: item.iconPath` to each consumable, equipment, and key-item object.

- [ ] **Step 5: Run the focused scene tests and verify GREEN**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS.

## Task 3: Inventory UI Images, Double-Click, And Tooltip

**Files:**
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/routes/game/page.svelte.e2e.ts`

- [ ] **Step 1: Write failing e2e coverage for image-first inventory**

In `src/routes/game/page.svelte.e2e.ts`, update `inventory overlay opens from the menu` to assert:

```ts
const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
await expect(fieldPotionSlot.getByRole('img', { name: 'Field Potion' })).toBeVisible();
await expect(fieldPotionSlot.getByText('Restores 8 HP.')).toHaveCount(0);
await expect(fieldPotionSlot.getByRole('button', { name: 'Use' })).toHaveCount(0);
```

After switching to the equipment tab, assert:

```ts
const trainingSwordSlot = inventoryDialog.getByLabel('Training Sword');
await expect(trainingSwordSlot.getByRole('img', { name: 'Training Sword' })).toBeVisible();
await expect(trainingSwordSlot.getByRole('button', { name: /Equip|Equipped/ })).toHaveCount(0);
```

- [ ] **Step 2: Write failing e2e coverage for tooltip and double-click use/equip**

Update `full hp potions explain why they cannot be consumed`:

```ts
await page.getByRole('button', { name: 'Inventory' }).click();
const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
const fieldPotionSlot = inventoryDialog.getByLabel('Field Potion');
await fieldPotionSlot.hover();
await expect(page.getByRole('tooltip')).toContainText('Restores 8 HP.');
await fieldPotionSlot.dblclick();
await expect(page.getByText('HP already full')).toBeVisible();
```

Add an equipment double-click assertion in the inventory overlay test after opening the Equipment tab:

```ts
await trainingSwordSlot.dblclick();
await expect(trainingSwordSlot.getByText('Equipped')).toBeVisible();
```

- [ ] **Step 3: Run e2e inventory tests and verify RED**

Run:

```sh
bun run test:e2e -- --grep "inventory|full hp"
```

Expected: FAIL because current slots have inline descriptions and `Use`/`Equip` buttons instead of icons and double-click behavior.

- [ ] **Step 4: Implement Svelte inventory slot helpers**

In `src/lib/game/GameShell.svelte`, add tooltip state and helpers:

```ts
	let hoveredInventoryItem = $state<InventorySlotItem | null>(null);

	function showInventoryTooltip(slot: InventorySlotItem) {
		hoveredInventoryItem = slot;
	}

	function hideInventoryTooltip() {
		hoveredInventoryItem = null;
	}

	function getInventoryTooltipMeta(slot: InventorySlotItem): string {
		if (slot.kind === 'consumable') return `x${slot.item.quantity}`;
		if (slot.kind === 'keyItem') return slot.item.quantity > 1 ? `Key x${slot.item.quantity}` : 'Key item';

		const modifiers = Object.entries(slot.item.modifiers)
			.filter(([, value]) => value !== undefined && value !== 0)
			.map(([stat, value]) => `${stat.toUpperCase()} +${value}`)
			.join(' / ');

		return modifiers ? `${slot.item.slot} / ${modifiers}` : slot.item.slot;
	}

	function activateInventorySlot(slot: InventorySlotItem) {
		if (!$hudState.ready) return;
		if (slot.kind === 'consumable') requestUseItem(slot.item.itemId);
		if (slot.kind === 'equipment' && !slot.item.equipped) requestEquipItem(slot.item.itemId);
	}
```

- [ ] **Step 5: Replace occupied slot markup**

For each occupied inventory slot article:

- render `<img src={slot.item.iconPath} alt={slot.item.name} ...>`
- remove inline description `<p>` elements
- remove visible `Use` and `Equip` buttons
- add `ondblclick={() => activateInventorySlot(slot)}`
- add `onmouseenter={() => showInventoryTooltip(slot)}`
- add `onmouseleave={hideInventoryTooltip}`
- keep badges for quantity, slot, equipped state, and key-item marker

Add a floating tooltip near the inventory grid:

```svelte
{#if hoveredInventoryItem}
	<div role="tooltip" class="pointer-events-none absolute right-4 bottom-4 z-20 max-w-[18rem] rounded-[0.95rem] border border-white/12 bg-slate-950/95 px-3 py-2 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
		<p class="text-[0.68rem] font-black tracking-[0.2em] text-cyan-100/72 uppercase">
			{hoveredInventoryItem.item.name}
		</p>
		<p class="mt-1 text-slate-100/88">{hoveredInventoryItem.item.description}</p>
		<p class="mt-1 text-[0.62rem] font-black tracking-[0.18em] text-slate-300/70 uppercase">
			{getInventoryTooltipMeta(hoveredInventoryItem)}
		</p>
	</div>
{/if}
```

- [ ] **Step 6: Run Svelte autofixer**

Run the configured Svelte autofixer against `src/lib/game/GameShell.svelte`. Fix all reported issues before continuing.

- [ ] **Step 7: Run e2e inventory tests and verify GREEN**

Run:

```sh
bun run test:e2e -- --grep "inventory|full hp"
```

Expected: PASS.

## Task 4: Final Verification

**Files:**
- Verify all touched files.

- [ ] **Step 1: Run focused unit tests**

Run:

```sh
bun run test:unit -- src/lib/game/content/items.test.ts src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS.

- [ ] **Step 2: Run focused e2e tests**

Run:

```sh
bun run test:e2e -- --grep "inventory|full hp"
```

Expected: PASS.

- [ ] **Step 3: Run project check**

Run:

```sh
bun run check
```

Expected: PASS. If generated Cloudflare types are stale, run `bun run gen` and then rerun `bun run check`.

- [ ] **Step 4: Run full test suite**

Run:

```sh
bun run test
```

Expected: PASS.

- [ ] **Step 5: Review final diff**

Run:

```sh
git status --short
git diff --stat
```

Expected: only the inventory icon plan, item assets, item metadata, HUD bridge, Svelte inventory UI, and targeted tests changed.
