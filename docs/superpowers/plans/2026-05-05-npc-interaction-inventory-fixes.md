# NPC Interaction And Inventory Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add explicit keyboard NPC interaction, prevent walking through NPCs, and prove purchased shop items appear in the inventory UI.

**Architecture:** Keep runtime ownership in `WorldScene`: it binds interact keys, resolves NPC proximity, blocks NPC body overlap, and publishes updated HUD state. Keep Svelte as the overlay renderer, adding only the small bridge behavior needed when Phaser opens a shop from the keyboard. Existing pure inventory and shop rules remain in `src/lib/game/core`.

**Tech Stack:** TypeScript, Svelte 5 runes, Phaser 4, Vitest, Playwright, Bun.

---

## File Structure

- Modify `src/lib/game/phaser/scenes/WorldScene.ts`: add interact key tracking, nearby NPC lookup, key-triggered dialogue/shop opening, and NPC collision-aware movement.
- Modify `src/lib/game/phaser/scenes/scenes.test.ts`: extend the Phaser mock for interact keys and add scene-level interaction, HUD inventory, and collision tests.
- Modify `src/lib/game/GameShell.svelte`: open the existing Shop overlay when `WorldScene` publishes an open shop from keyboard interaction.
- Modify `src/routes/game/page.svelte.e2e.ts`: add a browser regression for pressing interact, buying an item, closing the shop, and seeing the item quantity in Inventory.

## Task 1: Interact Key Opens Dialogue And Shops

**Files:**
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/GameShell.svelte`

- [ ] **Step 1: Extend the Phaser scene test mock for interact keys**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add interact key state beside `cursorKeys` and `wasdKeys`:

```ts
	const interactKeys = {
		e: { isDown: false, justDown: false },
		space: { isDown: false, justDown: false },
		enter: { isDown: false, justDown: false }
	};

	function getInteractKey(code: string) {
		if (code === 'E') return interactKeys.e;
		if (code === 'SPACE') return interactKeys.space;
		if (code === 'ENTER') return interactKeys.enter;

		throw new Error(`Unexpected key code ${code}`);
	}
```

Change the keyboard mock in `SceneMock` to return those keys:

```ts
		input = {
			keyboard: {
				createCursorKeys: vi.fn(() => cursorKeys),
				addKeys: vi.fn(() => wasdKeys),
				addKey: vi.fn((code: string) => getInteractKey(code))
			}
		};
```

Expose `interactKeys` from `phaserState`:

```ts
		interactKeys,
```

Extend the mocked Phaser keyboard API:

```ts
				KeyCodes: {
					A: 'A',
					D: 'D',
					W: 'W',
					S: 'S',
					E: 'E',
					SPACE: 'SPACE',
					ENTER: 'ENTER'
				},
				JustDown: vi.fn((key: { justDown?: boolean }) => {
					const result = Boolean(key.justDown);
					key.justDown = false;
					return result;
				})
```

Reset interact key state in the `WorldScene` `beforeEach` block:

```ts
		Object.assign(phaserState.interactKeys.e, { isDown: false, justDown: false });
		Object.assign(phaserState.interactKeys.space, { isDown: false, justDown: false });
		Object.assign(phaserState.interactKeys.enter, { isDown: false, justDown: false });
```

- [ ] **Step 2: Add failing tests for key registration and key-triggered interaction**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update `sets up camera follow and keyboard controls for the player marker` with these assertions:

```ts
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('E');
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('SPACE');
		expect(scene.input.keyboard?.addKey).toHaveBeenCalledWith('ENTER');
```

Add these tests near the existing NPC/shop tests:

```ts
	it('repeats nearby NPC dialogue when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.e.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenCalledOnce();
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status:
					'Guild Clerk: Morning. The ruins survey is posted; take the east road when you are ready.'
			})
		);
	});

	it('opens a nearby shop when an interact key is pressed', async () => {
		const events = await import('$lib/game/ui-bridge/events');
		const emitHudStateSpy = vi.spyOn(events, 'emitHudState');
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'item-shop' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 144 });
		scene.update(0, 16);
		emitHudStateSpy.mockClear();

		phaserState.interactKeys.space.justDown = true;
		scene.update(16, 16);

		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Shop opened',
				shop: expect.objectContaining({
					shopId: 'miras-item-shop',
					merchantName: 'Mira'
				})
			})
		);
	});
```

- [ ] **Step 3: Run the scene tests to verify the interaction tests fail**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: FAIL because `WorldScene` does not bind `E`/`Space`/`Enter`, does not call `Phaser.Input.Keyboard.JustDown`, and does not handle explicit NPC interaction.

- [ ] **Step 4: Implement interact key handling in `WorldScene`**

In `src/lib/game/phaser/scenes/WorldScene.ts`, extend the maps import:

```ts
	type MapNpc,
	type MapTransition,
	type WorldMapDefinition
```

Add the interact key field near the movement key fields:

```ts
	private interactKeys: Phaser.Input.Keyboard.Key[] = [];
```

In `create`, after `this.wasdKeys = ...`, add:

```ts
		const keyboard = this.input?.keyboard;
		this.interactKeys = keyboard
			? [
					keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
					keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
					keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
				]
			: [];
```

In `update`, after `this.updateNpcDialogue();`, add:

```ts
		this.handleInteractInput();
```

Add these methods near `updateNpcDialogue`:

```ts
	private handleInteractInput() {
		if (!this.interactKeys.some((key) => Phaser.Input.Keyboard.JustDown(key))) {
			return;
		}

		this.interactWithNearbyNpc();
	}

	private interactWithNearbyNpc() {
		const nearbyNpc = this.findNearbyNpc();

		if (!nearbyNpc) {
			this.publishHudState('No one nearby');
			return;
		}

		this.currentNearbyNpcId = nearbyNpc.id;
		this.nearbyShopId = nearbyNpc.shopId ?? null;

		if (nearbyNpc.shopId) {
			this.openNearbyShop(nearbyNpc.shopId);
			return;
		}

		this.publishHudState(`${nearbyNpc.name}: ${nearbyNpc.dialogue}`);
	}

	private findNearbyNpc(): MapNpc | undefined {
		if (!this.player) {
			return undefined;
		}

		const map = this.resolveMap(this.mapId);

		return (map.npcs ?? [])
			.map((npc) => ({
				npc,
				distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, npc.x, npc.y)
			}))
			.filter(
				({ distance }) => distance <= WorldScene.playerRadius + WorldScene.npcInteractionRadius
			)
			.sort((left, right) => left.distance - right.distance)[0]?.npc;
	}
```

Replace the duplicated nearby NPC search in `updateNpcDialogue`:

```ts
		const map = this.resolveMap(this.mapId);
		const nearbyNpc = (map.npcs ?? [])
			.map((npc) => ({
				npc,
				distance: Phaser.Math.Distance.Between(this.player!.x, this.player!.y, npc.x, npc.y)
			}))
			.filter(
				({ distance }) => distance <= WorldScene.playerRadius + WorldScene.npcInteractionRadius
			)
			.sort((left, right) => left.distance - right.distance)[0]?.npc;
```

with:

```ts
		const nearbyNpc = this.findNearbyNpc();
```

- [ ] **Step 5: Let Svelte open the existing Shop overlay when Phaser opens a shop**

In `src/lib/game/GameShell.svelte`, add this effect after `closeShop`:

```svelte
	$effect(() => {
		if (!$hudState.shop || shopOpen) return;

		rememberShopFocus();
		settingsOpen = false;
		inventoryOpen = false;
		shopOpen = true;
		activeShopTab = 'buy';
		pauseForOverlay('shop');
		void focusShopDialog();
	});
```

This keeps Menu -> Shop working because that path sets `shopOpen = true` before it sends `open-shop`.

- [ ] **Step 6: Run focused tests for interaction**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS.

- [ ] **Step 7: Commit interaction work**

Run:

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts src/lib/game/GameShell.svelte
git commit -m "Add keyboard NPC interaction"
```

## Task 2: NPC Collision

**Files:**
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`

- [ ] **Step 1: Add failing collision tests**

In `src/lib/game/phaser/scenes/scenes.test.ts`, add these tests near the movement tests:

```ts
	it('blocks player movement through NPC bodies', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 256, y: 185 });
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBe(256);
		expect(phaserState.playerMarker.y).toBe(185);
	});

	it('slides along an NPC when only one movement axis is blocked', async () => {
		const { WorldScene } = await import('./WorldScene');
		const scene = new WorldScene();

		scene.create({ mapId: 'guild-hall' });
		Object.assign(phaserState.playerMarker, { x: 220, y: 180 });
		phaserState.cursorKeys.right.isDown = true;
		phaserState.cursorKeys.up.isDown = true;

		scene.update(0, 250);

		expect(phaserState.playerMarker.x).toBeGreaterThan(220);
		expect(phaserState.playerMarker.y).toBe(180);
	});
```

- [ ] **Step 2: Run the scene tests to verify collision tests fail**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: FAIL because player movement currently applies the target X/Y position without checking NPC blockers.

- [ ] **Step 3: Implement NPC collision-aware movement**

In `src/lib/game/phaser/scenes/WorldScene.ts`, add a collision scale constant near the NPC constants:

```ts
	private static readonly npcCollisionScale = 0.7;
```

Replace direct player assignment in `update`:

```ts
		this.player.x = Math.min(Math.max(this.player.x + direction.x * step, min), maxX);
		this.player.y = Math.min(Math.max(this.player.y + direction.y * step, min), maxY);
```

with:

```ts
		const targetX = Math.min(Math.max(this.player.x + direction.x * step, min), maxX);
		const targetY = Math.min(Math.max(this.player.y + direction.y * step, min), maxY);
		const resolvedPosition = this.resolvePlayerNpcCollision(
			this.player.x,
			this.player.y,
			targetX,
			targetY
		);

		this.player.x = resolvedPosition.x;
		this.player.y = resolvedPosition.y;
```

Add these methods near `resolveFacing`:

```ts
	private resolvePlayerNpcCollision(currentX: number, currentY: number, targetX: number, targetY: number) {
		let x = targetX;
		let y = targetY;

		if (this.isPlayerPositionBlockedByNpc(x, currentY)) {
			x = currentX;
		}

		if (this.isPlayerPositionBlockedByNpc(x, y)) {
			y = currentY;
		}

		return { x, y };
	}

	private isPlayerPositionBlockedByNpc(x: number, y: number): boolean {
		const map = this.resolveMap(this.mapId);

		return (map.npcs ?? []).some((npc) => {
			const distance = Phaser.Math.Distance.Between(x, y, npc.x, npc.y);

			return distance < WorldScene.playerRadius + this.getNpcCollisionRadius(npc);
		});
	}

	private getNpcCollisionRadius(npc: MapNpc): number {
		const displaySize = isNpcPackFrameName(npc.frameName)
			? WorldScene.npcPackDisplaySize
			: WorldScene.starterNpcDisplaySize;

		return (Math.min(displaySize.width, displaySize.height) / 2) * WorldScene.npcCollisionScale;
	}
```

- [ ] **Step 4: Run focused scene tests**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS.

- [ ] **Step 5: Commit collision work**

Run:

```sh
git add src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "Add NPC collision blocking"
```

## Task 3: Buy-To-Inventory Regression

**Files:**
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Modify: `src/routes/game/page.svelte.e2e.ts`

- [ ] **Step 1: Strengthen the scene-level purchase assertion**

In `src/lib/game/phaser/scenes/scenes.test.ts`, update `buys shop items, updates wallet, and persists finite stock` by adding these expectations after `const saveState = sceneState.buildSaveState();`:

```ts
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({
				status: 'Bought Iron Cap',
				wallet: { coins: 5 },
				inventory: expect.objectContaining({
					equipment: expect.arrayContaining([
						expect.objectContaining({ itemId: 'iron-cap', equipped: false })
					])
				}),
				shop: expect.objectContaining({
					sell: expect.arrayContaining([
						expect.objectContaining({ itemId: 'iron-cap', quantity: 1, price: 17 })
					])
				})
			})
		);
```

Remove the older final assertion in the same test:

```ts
		expect(emitHudStateSpy).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'Bought Iron Cap' })
		);
```

- [ ] **Step 2: Run the focused scene tests**

Run:

```sh
bun run test:unit -- src/lib/game/phaser/scenes/scenes.test.ts --run
```

Expected: PASS when `WorldScene` publishes HUD state after assigning `this.wallet`, `this.inventory`, and `this.shopStockState`.

- [ ] **Step 3: Add a browser regression for key interaction and visible inventory**

In `src/routes/game/page.svelte.e2e.ts`, add this test after the existing shop overlay test:

```ts
test('interact key shop purchase appears in inventory', async ({ page }) => {
	const save = {
		version: 3,
		mapId: 'item-shop',
		player: {
			level: 1,
			xp: 0,
			hp: 20,
			attack: 3,
			x: 256,
			y: 144,
			facing: 'up'
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
		},
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		}
	};

	await page.addInitScript((encoded) => {
		const probeWindow = window as GlieseProbeWindow;
		probeWindow.__glieseLastHudState = undefined;
		window.addEventListener('gliese:hud-state', (event) => {
			probeWindow.__glieseLastHudState = (event as CustomEvent<HudStateSnapshot>).detail;
		});
		window.localStorage.setItem('gliese.save.v3', encoded);
	}, JSON.stringify(save));
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(() => {
		const state = (window as GlieseProbeWindow).__glieseLastHudState;

		return state?.nearbyShop?.shopId === 'miras-item-shop' || state?.status?.startsWith('Mira:');
	});

	await page.locator('canvas').click();
	await page.keyboard.press('KeyE');

	const shopDialog = page.getByRole('dialog', { name: "Mira's Item Shop" });
	await expect(shopDialog).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Buy Field Potion', exact: true }).click();
	await expect(shopDialog.getByText('Coins: 20')).toBeVisible();
	await shopDialog.getByRole('button', { name: 'Close' }).click();

	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('button', { name: 'Inventory' }).click();

	const inventoryDialog = page.getByRole('dialog', { name: 'Inventory' });
	await expect(inventoryDialog.getByRole('heading', { name: 'Field Potion' })).toBeVisible();
	await expect(inventoryDialog.getByText('x2')).toBeVisible();
});
```

- [ ] **Step 4: Run the shop e2e tests**

Run:

```sh
bun run test:e2e -- --grep "shop"
```

Expected: PASS. Playwright starts the configured dev server automatically on port `4173`.

- [ ] **Step 5: Commit the inventory regression**

Run:

```sh
git add src/lib/game/phaser/scenes/scenes.test.ts src/routes/game/page.svelte.e2e.ts
git commit -m "Cover shop purchases in inventory"
```

## Task 4: Final Verification

**Files:**
- Verify: full working tree

- [ ] **Step 1: Run Svelte and TypeScript checks**

Run:

```sh
bun run check
```

Expected: PASS. If this fails with stale `worker-configuration.d.ts` output, run:

```sh
bun run gen
bun run check
```

Expected after regeneration: PASS.

- [ ] **Step 2: Run the full test suite**

Run:

```sh
bun run test
```

Expected: PASS for unit and e2e tests.

- [ ] **Step 3: Review changed files**

Run:

```sh
git status --short
git diff --stat
```

Expected: only the approved implementation files are modified after the task commits, and there are no unrelated generated files unless `bun run gen` was required for `bun run check`.

