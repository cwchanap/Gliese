# Sundrop Village Layout Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce committed screenshot artifacts and a final validation report for the deterministic Sundrop Village relayout.

**Architecture:** Keep runtime content unchanged. Capture deterministic canvas screenshots from the built preview app by seeding browser `localStorage` saves at the authored village coordinates, then write a Markdown report that embeds the screenshots, answers the HPA-115 review questions, and records validation output.

**Tech Stack:** TypeScript/Svelte/Vite preview app, Phaser canvas, Playwright automation through Bun, Markdown report artifacts, Vitest, Playwright e2e, Prettier/ESLint.

---

## File Structure

- Create: `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md`
  - Responsibility: final human-readable HPA-115 screenshot review, acceptance status, follow-up list, and validation log.
- Create: `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/*.png`
  - Responsibility: committed reviewable screenshots for the seven required village views.
- Temporary only: `/private/tmp/gliese-capture-sundrop.mjs`
  - Responsibility: Playwright capture helper. Do not commit this file.
- Verify unchanged: `src/lib/game/content/maps/regions/village.ts`
  - Runtime village content should not change for HPA-115 unless the review discovers a real defect.
- Verify unchanged: `src/lib/game/content/maps/regions/rooms.ts`
  - Source of screenshot coordinates.
- Verify unchanged: `src/lib/game/content/maps/regions/route-scenes.ts`
  - Source of the route-to-Crossroads screenshot coordinate.
- Verify unchanged: `src/lib/game/content/maps/regions/village-layout.test.ts`
- Verify unchanged: `src/lib/game/content/maps/regions/soft-maze.test.ts`
- Verify unchanged: `src/lib/game/content/maps.test.ts`

## Task 1: Capture Reviewable Screenshots

**Files:**
- Create directory: `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/`
- Create images in that directory:
  - `01-spawn-home-yard.png`
  - `02-well-plaza.png`
  - `03-market-yard.png`
  - `04-north-residences-guild.png`
  - `05-shrine-garden.png`
  - `06-east-gate.png`
  - `07-route-to-crossroads.png`
- Temporary: `/private/tmp/gliese-capture-sundrop.mjs`

- [ ] **Step 1: Build the preview app**

Run:

```sh
rtk bun run build
```

Expected: PASS and `dist/` is refreshed for `vite preview`.

- [ ] **Step 2: Start preview**

Run:

```sh
rtk bun run preview -- --host 127.0.0.1 --port 4173
```

Expected: Vite preview serves `http://127.0.0.1:4173/`. Keep this process
running until screenshots are captured.

- [ ] **Step 3: Create the temporary screenshot script**

Create `/private/tmp/gliese-capture-sundrop.mjs` with this exact script:

```js
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const SAVE_KEY = 'gliese.save.v7';
const URL = 'http://127.0.0.1:4173/';
const OUT = '/Users/chanwaichan/workspace/Gliese/docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets';

const points = [
	['01-spawn-home-yard', 700, 5585],
	['02-well-plaza', 1000, 5160],
	['03-market-yard', 650, 5045],
	['04-north-residences-guild', 1050, 4860],
	['05-shrine-garden', 1200, 5660],
	['06-east-gate', 1660, 4430],
	['07-route-to-crossroads', 2120, 4440]
];

function saveAt(x, y) {
	return {
		version: 7,
		mapExploration: {},
		mapId: 'meadow-entry',
		player: { level: 1, xp: 0, hp: 20, attack: 3, x, y, facing: 'down' },
		flags: {
			clearedEncounters: [],
			clearedEncounterUnitCounts: {},
			collectedPickups: [],
			resolvedEncounterDrops: {}
		},
		inventory: { stacks: [{ itemId: 'field-potion', quantity: 1 }], equipment: ['training-sword'] },
		equipment: { weapon: 'training-sword', head: null, body: null, hands: null, accessory: null },
		wallet: { coins: 30 },
		shops: {
			stock: {
				'guild-quartermaster': {
					'iron-cap': 1,
					'grip-wraps': 1,
					'traveler-vest': 1
				}
			}
		},
		quests: { entries: {}, completedObjectives: {} },
		seenDiscoveries: []
	};
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [slug, x, y] of points) {
	const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
	await page.addInitScript(
		({ key, save }) => {
			window.__glieseLastHudState = undefined;
			window.addEventListener('gliese:hud-state', (event) => {
				window.__glieseLastHudState = event.detail;
			});
			window.localStorage.setItem(key, JSON.stringify(save));
		},
		{ key: SAVE_KEY, save: saveAt(x, y) }
	);

	await page.goto(URL);
	await page.locator('canvas').waitFor({ state: 'visible' });
	await page.getByRole('button', { name: 'Menu' }).click();
	await page.getByRole('region', { name: 'Command' }).getByRole('button', { name: 'Resume Save' }).click();
	await page.waitForFunction(
		({ expectedX, expectedY }) => {
			const state = window.__glieseLastHudState;
			return (
				state?.ready &&
				state.mapId === 'meadow-entry' &&
				Math.abs(state.areaMap.player.x - expectedX) < 2 &&
				Math.abs(state.areaMap.player.y - expectedY) < 2
			);
		},
		{ expectedX: x, expectedY: y }
	);
	await page.waitForTimeout(2000);
	await page.evaluate(() =>
		window.dispatchEvent(new CustomEvent('gliese:hud-command', { detail: { type: 'pause-game' } }))
	);
	await page.locator('canvas').screenshot({ path: `${OUT}/${slug}.png` });
	await page.close();
}

await browser.close();
console.log(OUT);
```

- [ ] **Step 4: Capture screenshots**

Run:

```sh
rtk bun /private/tmp/gliese-capture-sundrop.mjs
```

Expected: all seven PNG files are created under
`docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/`.

- [ ] **Step 5: Inspect screenshots**

Use image inspection for all seven files. Verify each screenshot is nonblank,
centered on its named view, and reviewable without HUD obstruction.

- [ ] **Step 6: Commit screenshot artifacts**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets
rtk git commit -m "docs: add sundrop village review screenshots"
```

Expected: one commit containing the seven PNG files only.

## Task 2: Write The Layout Review Report

**Files:**
- Create: `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md`

- [ ] **Step 1: Write the report**

Create `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md`
with these sections:

- `# Sundrop Village Layout Review`
- `## Summary`, explaining that screenshots were captured from the built preview
  app by seeding browser localStorage saves at the authored coordinates,
  resuming each save, and screenshotting the Phaser canvas.
- `## Screenshot Review`, with one subsection for each of the seven screenshots.
  Embed the matching PNG and answer, in prose bullets, the main anchor,
  available exits, optional detour, purposeless object check, and hedge-grid
  feel. Every answer must be concrete; if the screenshot has no optional detour
  or no purposeless object, state that directly.
- `## Acceptance Criteria`, with a table where every HPA-115 criterion is marked
  `Pass`, `Follow-up`, or `Fail` and backed by screenshot or validation evidence.
- `## Follow-Up Patches`, listing `None.` only if the screenshot pass finds no
  remaining visual mess.
- `## Validation Commands`, populated with the exact commands and pass/fail
  counts from Task 3.

- [ ] **Step 2: Inspect for unresolved placeholders**

Run:

```sh
rtk rg -n "Main anchor:$|Available exits:$|Optional detour:$|Object with no purpose:$|Hedge-grid feel:$|\\|  \\|  \\||T[B]D|T[O]DO" docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md
```

Expected: no output.

- [ ] **Step 3: Commit the report**

Run:

```sh
rtk git add docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md
rtk git commit -m "docs: add sundrop village layout review"
```

Expected: one commit containing the Markdown report only.

## Task 3: Run Final HPA-115 Validation

**Files:**
- Verify: `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md`
- Verify: `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/*.png`
- Verify unchanged: runtime and test source files listed in this plan.

- [ ] **Step 1: Run focused village-layout test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused soft-maze test**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run map-content tests**

Run:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run all unit/browser tests**

Run:

```sh
rtk bun run test:unit -- --run
```

Expected: PASS.

- [ ] **Step 5: Run Svelte check**

Run:

```sh
rtk bun run check
```

Expected: PASS with `0 errors` and `0 warnings`.

- [ ] **Step 6: Run lint**

Run:

```sh
rtk bun run lint
```

Expected: PASS.

- [ ] **Step 7: Run e2e tests**

Run:

```sh
rtk bun run test:e2e
```

Expected: PASS with `12 passed`.

- [ ] **Step 8: Verify diff scope**

Run:

```sh
rtk git diff --name-status HEAD~2..HEAD
rtk git diff -- src/lib/game/content/maps/regions/village.ts src/lib/game/content/maps/regions/rooms.ts src/lib/game/content/maps/regions/route-scenes.ts src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps/regions/soft-maze.test.ts src/lib/game/content/maps.test.ts
rtk git status --short --branch
```

Expected: only the report and screenshot artifacts changed in the HPA-115
commits, no runtime/test source diff, and a clean branch.
