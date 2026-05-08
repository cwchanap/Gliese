# Phaser JRPG Vertical Slice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a desktop-first Phaser-powered 2D action JRPG vertical slice inside the existing SvelteKit app, including top-down movement, field combat, light leveling, and anywhere save.

**Architecture:** SvelteKit owns the page shell and non-loop UI, while Phaser owns rendering, input, map simulation, enemies, combat, and camera. Pure gameplay rules live in engine-agnostic TypeScript modules so progression, saves, and combat formulas can be tested without depending on the canvas runtime.

**Tech Stack:** Svelte 5, SvelteKit, TypeScript, Phaser, Vitest, Playwright, bun

---

### Task 1: Install Phaser And Lay Down Domain Types

**Files:**

- Modify: `package.json`
- Create: `src/lib/game/core/types.ts`
- Create: `src/lib/game/content/player.ts`
- Create: `src/lib/game/content/enemies.ts`
- Create: `src/lib/game/content/maps.ts`
- Test: `src/lib/game/core/types.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { startingPlayer } from '$lib/game/content/player';
import { slimeScout } from '$lib/game/content/enemies';
import { meadowEntryMap } from '$lib/game/content/maps';

describe('game content scaffolding', () => {
	it('exposes a valid starting player id', () => {
		expect(startingPlayer.id).toBe('hero');
	});

	it('defines the first enemy archetype', () => {
		expect(slimeScout.id).toBe('slime-scout');
	});

	it('defines the opening map id', () => {
		expect(meadowEntryMap.id).toBe('meadow-entry');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/core/types.test.ts`
Expected: FAIL with module-not-found errors for the new content files.

**Step 3: Write minimal implementation**

```ts
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerDefinition {
	id: string;
	baseHp: number;
	baseAttack: number;
	moveSpeed: number;
}

export const startingPlayer: PlayerDefinition = {
	id: 'hero',
	baseHp: 20,
	baseAttack: 3,
	moveSpeed: 120
};
```

Add matching minimal enemy and map definitions and install Phaser with:

```bash
bun add phaser
```

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/core/types.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add package.json bun.lock src/lib/game/core/types.ts src/lib/game/content/player.ts src/lib/game/content/enemies.ts src/lib/game/content/maps.ts src/lib/game/core/types.test.ts
git commit -m "feat: add initial phaser game domain types"
```

### Task 2: Add Progression Formulas

**Files:**

- Create: `src/lib/game/core/progression.ts`
- Test: `src/lib/game/core/progression.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { applyExperienceGain, getXpForLevel } from '$lib/game/core/progression';

describe('progression rules', () => {
	it('keeps the hero at level 1 below threshold', () => {
		expect(applyExperienceGain({ level: 1, xp: 0, hp: 20, attack: 3 }, 4).level).toBe(1);
	});

	it('levels the hero once when threshold is crossed', () => {
		const result = applyExperienceGain({ level: 1, xp: 4, hp: 20, attack: 3 }, 2);
		expect(result.level).toBe(2);
		expect(result.hp).toBeGreaterThan(20);
	});

	it('returns deterministic thresholds', () => {
		expect(getXpForLevel(2)).toBe(5);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/core/progression.test.ts`
Expected: FAIL because `progression.ts` does not exist yet.

**Step 3: Write minimal implementation**

```ts
export function getXpForLevel(level: number) {
	return Math.max(0, (level - 1) * 5);
}

export function applyExperienceGain(
	state: { level: number; xp: number; hp: number; attack: number },
	gainedXp: number
) {
	const xp = state.xp + gainedXp;
	if (xp < getXpForLevel(2)) return { ...state, xp };
	return { level: 2, xp, hp: state.hp + 4, attack: state.attack + 1 };
}
```

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/core/progression.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game/core/progression.ts src/lib/game/core/progression.test.ts
git commit -m "feat: add jrpg progression rules"
```

### Task 3: Add Save State Model And Local Storage Adapter

**Files:**

- Create: `src/lib/game/save/save-state.ts`
- Create: `src/lib/game/save/storage.ts`
- Test: `src/lib/game/save/save-state.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createNewSaveState, serializeSaveState, parseSaveState } from '$lib/game/save/save-state';

describe('save state', () => {
	it('creates a level 1 starting save', () => {
		expect(createNewSaveState().player.level).toBe(1);
	});

	it('round-trips a valid save payload', () => {
		const encoded = serializeSaveState(createNewSaveState());
		expect(parseSaveState(encoded)?.mapId).toBe('meadow-entry');
	});

	it('rejects invalid payloads', () => {
		expect(parseSaveState('{"bad":true}')).toBeNull();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/save/save-state.test.ts`
Expected: FAIL because the save modules do not exist yet.

**Step 3: Write minimal implementation**

```ts
export function createNewSaveState() {
	return {
		version: 1,
		mapId: 'meadow-entry',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x: 64, y: 64, facing: 'down' },
		flags: { clearedEncounters: [] as string[] }
	};
}
```

Implement `serializeSaveState` with `JSON.stringify`, `parseSaveState` with runtime shape checks, and a storage adapter with a single key such as `gliese.save.v1`.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/save/save-state.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game/save/save-state.ts src/lib/game/save/storage.ts src/lib/game/save/save-state.test.ts
git commit -m "feat: add browser save state model"
```

### Task 4: Add The Svelte Game Route And Phaser Mount Shell

**Files:**

- Modify: `src/routes/+page.svelte`
- Create: `src/routes/game/+page.svelte`
- Create: `src/lib/game/GameShell.svelte`
- Create: `src/lib/game/phaser/createGame.ts`
- Test: `src/lib/game/phaser/createGame.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it, vi } from 'vitest';
import { createGame } from '$lib/game/phaser/createGame';

describe('createGame', () => {
	it('returns a destroyable browser game wrapper', async () => {
		const mountNode = document.createElement('div');
		const instance = await createGame(mountNode);
		expect(instance.destroy).toBeTypeOf('function');
		instance.destroy();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/phaser/createGame.test.ts`
Expected: FAIL because `createGame.ts` does not exist.

**Step 3: Write minimal implementation**

```ts
import { browser } from '$app/environment';

export async function createGame(target: HTMLElement) {
	if (!browser) throw new Error('createGame must run in the browser');
	const Phaser = await import('phaser');
	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: target,
		width: 640,
		height: 360,
		backgroundColor: '#1a1f2b',
		scene: []
	});
	return { destroy: () => game.destroy(true) };
}
```

Mount it from `GameShell.svelte` with `onMount`, and replace the welcome page with a simple landing page that links to `/game`.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/phaser/createGame.test.ts`
Expected: PASS

Also run: `bun run check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/+page.svelte src/routes/game/+page.svelte src/lib/game/GameShell.svelte src/lib/game/phaser/createGame.ts src/lib/game/phaser/createGame.test.ts
git commit -m "feat: add phaser game route shell"
```

### Task 5: Bootstrap BootScene And WorldScene

**Files:**

- Create: `src/lib/game/phaser/scenes/BootScene.ts`
- Create: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/phaser/createGame.ts`
- Test: `src/lib/game/content/maps.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { meadowEntryMap } from '$lib/game/content/maps';

describe('opening map content', () => {
	it('declares a spawn point and hostile exit', () => {
		expect(meadowEntryMap.spawn).toEqual({ x: 64, y: 64 });
		expect(meadowEntryMap.transitions[0]?.toMapId).toBe('ruins-threshold');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/content/maps.test.ts`
Expected: FAIL because the map shape is not rich enough yet.

**Step 3: Write minimal implementation**

```ts
export const meadowEntryMap = {
	id: 'meadow-entry',
	spawn: { x: 64, y: 64 },
	transitions: [{ x: 304, y: 96, toMapId: 'ruins-threshold' }]
};
```

Then add `BootScene` and `WorldScene` that render placeholder ground, spawn the player position, and switch on `mapId` using content definitions instead of hard-coded scene branches.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/content/maps.test.ts`
Expected: PASS

Manual verification:

Run: `bun run dev`
Expected: Visiting `/game` shows a Phaser canvas with a visible placeholder map.

**Step 5: Commit**

```bash
git add src/lib/game/content/maps.ts src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/BootScene.ts src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/phaser/createGame.ts
git commit -m "feat: add boot and world scenes"
```

### Task 6: Add Player Movement, Camera, And Collision

**Files:**

- Create: `src/lib/game/core/input.ts`
- Create: `src/lib/game/core/input.test.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { resolveMovementVector } from '$lib/game/core/input';

describe('movement input', () => {
	it('normalizes diagonal input', () => {
		const vector = resolveMovementVector({ left: true, up: true, right: false, down: false });
		expect(vector.x).toBeLessThan(0);
		expect(vector.y).toBeLessThan(0);
		expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1, 5);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/core/input.test.ts`
Expected: FAIL because `input.ts` does not exist.

**Step 3: Write minimal implementation**

```ts
export function resolveMovementVector(input: {
	left: boolean;
	right: boolean;
	up: boolean;
	down: boolean;
}) {
	const x = Number(input.right) - Number(input.left);
	const y = Number(input.down) - Number(input.up);
	const length = Math.hypot(x, y) || 1;
	return { x: x / length, y: y / length };
}
```

Wire the helper into `WorldScene`, add camera follow, and add collision against world bounds or placeholder blockers.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/core/input.test.ts`
Expected: PASS

Manual verification:

Run: `bun run dev`
Expected: The hero moves smoothly with keyboard input and the camera follows.

**Step 5: Commit**

```bash
git add src/lib/game/core/input.ts src/lib/game/core/input.test.ts src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: add player movement and camera"
```

### Task 7: Add Enemy Combat And XP Rewards

**Files:**

- Create: `src/lib/game/core/combat.ts`
- Create: `src/lib/game/core/combat.test.ts`
- Modify: `src/lib/game/content/enemies.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/core/progression.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { resolveHit, canReceiveHit } from '$lib/game/core/combat';

describe('combat rules', () => {
	it('applies attack damage to an enemy hp pool', () => {
		expect(resolveHit({ hp: 6, defense: 0 }, { power: 3 }).hp).toBe(3);
	});

	it('blocks hits during invulnerability frames', () => {
		expect(canReceiveHit({ invulnerableUntil: 1000 }, 999)).toBe(false);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/core/combat.test.ts`
Expected: FAIL because the combat module does not exist.

**Step 3: Write minimal implementation**

```ts
export function resolveHit(target: { hp: number; defense: number }, attack: { power: number }) {
	return { hp: Math.max(0, target.hp - Math.max(1, attack.power - target.defense)) };
}

export function canReceiveHit(target: { invulnerableUntil: number }, now: number) {
	return now >= target.invulnerableUntil;
}
```

Then hook enemy definitions into `WorldScene`, add one melee attack window for the hero, award XP on enemy defeat, and reuse `applyExperienceGain` for level-up changes.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/core/combat.test.ts src/lib/game/core/progression.test.ts`
Expected: PASS

Manual verification:

Run: `bun run dev`
Expected: The hero can defeat visible enemies and gain XP.

**Step 5: Commit**

```bash
git add src/lib/game/core/combat.ts src/lib/game/core/combat.test.ts src/lib/game/content/enemies.ts src/lib/game/core/progression.ts src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: add field combat and xp rewards"
```

### Task 8: Add HUD Bridge, Consumable, And Anywhere Save

**Files:**

- Create: `src/lib/game/ui-bridge/events.ts`
- Create: `src/lib/game/ui-bridge/store.ts`
- Create: `src/lib/game/save/storage.test.ts`
- Modify: `src/lib/game/GameShell.svelte`
- Modify: `src/routes/game/+page.svelte`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/save/storage.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { saveGameState } from '$lib/game/save/storage';
import { createNewSaveState } from '$lib/game/save/save-state';

describe('save storage', () => {
	it('writes the serialized save to localStorage', () => {
		saveGameState(createNewSaveState());
		expect(localStorage.getItem('gliese.save.v1')).toContain('"mapId":"meadow-entry"');
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/save/storage.test.ts`
Expected: FAIL because the write helper is missing.

**Step 3: Write minimal implementation**

```ts
export function saveGameState(state: SaveState) {
	localStorage.setItem('gliese.save.v1', serializeSaveState(state));
}
```

Expose HUD state from Phaser through a tiny event/store bridge, add one heal consumable action, and add save/resume controls in the Svelte shell around the canvas.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/save/storage.test.ts`
Expected: PASS

Also run: `bun run check`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/game/ui-bridge/events.ts src/lib/game/ui-bridge/store.ts src/lib/game/save/storage.test.ts src/lib/game/GameShell.svelte src/routes/game/+page.svelte src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/save/storage.ts
git commit -m "feat: add hud bridge and anywhere save"
```

### Task 9: Add Boss Encounter And End-Of-Slice State

**Files:**

- Modify: `src/lib/game/content/enemies.ts`
- Modify: `src/lib/game/content/maps.ts`
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Create: `src/lib/game/core/boss.test.ts`
- Create: `src/lib/game/core/boss.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createBossPhaseState, advanceBossPhase } from '$lib/game/core/boss';

describe('boss phase rules', () => {
	it('starts in phase 1', () => {
		expect(createBossPhaseState().phase).toBe(1);
	});

	it('switches phase after the hp threshold', () => {
		expect(advanceBossPhase({ phase: 1, hp: 4, maxHp: 10 }).phase).toBe(2);
	});
});
```

**Step 2: Run test to verify it fails**

Run: `bun x vitest run src/lib/game/core/boss.test.ts`
Expected: FAIL because `boss.ts` does not exist.

**Step 3: Write minimal implementation**

```ts
export function createBossPhaseState() {
	return { phase: 1, hp: 10, maxHp: 10 };
}

export function advanceBossPhase(state: { phase: number; hp: number; maxHp: number }) {
	if (state.phase === 1 && state.hp <= state.maxHp / 2) return { ...state, phase: 2 };
	return state;
}
```

Then add a single boss encounter area, a tougher enemy pattern, and a simple completion flag or victory overlay when the boss is defeated.

**Step 4: Run test to verify it passes**

Run: `bun x vitest run src/lib/game/core/boss.test.ts`
Expected: PASS

Manual verification:

Run: `bun run dev`
Expected: The slice can be completed by defeating the boss and the victory state is obvious.

**Step 5: Commit**

```bash
git add src/lib/game/core/boss.ts src/lib/game/core/boss.test.ts src/lib/game/content/enemies.ts src/lib/game/content/maps.ts src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: add boss encounter finale"
```

### Task 10: Add Playwright Smoke Coverage And Final Cleanup

**Files:**

- Create: `src/routes/game/+page.svelte.e2e.ts`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
import { expect, test } from '@playwright/test';

test('game route boots', async ({ page }) => {
	await page.goto('/game');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: /save/i })).toBeVisible();
});
```

**Step 2: Run test to verify it fails**

Run: `bun x playwright test src/routes/game/+page.svelte.e2e.ts`
Expected: FAIL because the route does not yet expose the expected game UI or test file.

**Step 3: Write minimal implementation**

```md
## Game prototype

Run `bun run dev` and open `/game` to launch the Phaser JRPG vertical slice.
```

Add the smoke test and any final route-level selectors needed for stable verification.

**Step 4: Run test to verify it passes**

Run: `bun x playwright test src/routes/game/+page.svelte.e2e.ts`
Expected: PASS

Also run:

```bash
bun run test:unit -- --run
bun run check
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/routes/game/+page.svelte.e2e.ts README.md
git commit -m "test: add phaser game smoke coverage"
```
