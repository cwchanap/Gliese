# Village Hedge Look + Smaller Houses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the village's repeated-tree maze walls with a dedicated garden-hedge look, and shrink village building footprints to ~80% so the village reads as a settlement (not a forest) with breathing room.

**Architecture:** A new `garden-hedge` blocker kind renders via the existing `renderBlockerSegments` path backed by a new single-frame `village-hedge.png` asset. The village's ~60 internal `town-hedge` walls switch kind (4 meadow boundaries stay `town-hedge`). Eight village landmarks scale to 80% (centers fixed) and their seven door transitions re-align to the new south edges. Building sprites + collision both derive from the landmark rect, so a single rect edit shrinks them consistently.

**Tech Stack:** TypeScript, Phaser 3 (scenes/mocked in tests), Svelte 5, Vitest, bun. Image generation via `agy` CLI + `remove_chroma_key.py`; vision QA via Claude Sonnet 4.6 through `agy`.

## Global Constraints

- Art style: **painted digital 2D illustration** (NOT pixel art), soft outlines, warm medieval-Japanese palette, orthographic, soft top-left light, transparent background — matching `village-dressing.png` / `crossroads-dressing.png`.
- `#00ff00` chroma-key background for generated sprites; strip with `remove_chroma_key.py`.
- Image-gen model: `agy --print --model "Gemini 3.5 Flash (Medium)"`. Vision-QA model: `agy --print --model "Claude Sonnet 4.6 (Thinking)"`.
- Only the village's **internal** walls become `garden-hedge`. The 4 meadow boundary blockers and the ocean blocker in `village.ts` stay `town-hedge` / `ocean`.
- Other regions (silverpine, crossroads, coast, mistfen, wildwood) are untouched.
- `sundrop-well` landmark is NOT resized.
- Two `blocker.kind` switches exist in `WorldScene.ts` (`renderBlockers` ~1833, `getBlockerFrameName` ~1891), both with `blocker.kind satisfies never` exhaustiveness checks — adding a kind requires handling both.
- No commits unless green: `bun run test:unit -- --run`, `bun run check`, `bun run lint`.
- Commit policy: only commit when the user explicitly asks. Each task's "Commit" step is executed only on explicit user request.
- Scratch directory for generated art: `/private/tmp/gliese-village-art/` (already exists).

## Exact Resize + Door Map (reference for all tasks)

80% scale, centers fixed. New door y = `center.y + round(0.4 × currentHeight)`.

| Landmark | Center (x,y) | Size now | Size @80% | Door coord now | Door coord @80% |
|---|---|---|---|---|---|
| hero-house-exterior | (700, 5450) | 294×307 | **235×246** | (700, 5600) | **(700, 5573)** |
| guild-hall-exterior | (1400, 4900) | 384×346 | **307×277** | (1400, 5070) | **(1400, 5038)** |
| item-shop-exterior | (600, 4800) | 307×294 | **246×235** | (600, 4945) | **(600, 4918)** |
| villager-house-1-exterior | (900, 4750) | 282×256 | **226×205** | (900, 4880) | **(900, 4852)** |
| villager-house-2-exterior | (1200, 4700) | 422×326 | **338×261** | (1200, 4870) | **(1200, 4830)** |
| villager-house-3-exterior | (1450, 5400) | 230×416 | **184×333** | (1450, 5610) | **(1450, 5566)** |
| blacksmith | (500, 5200) | 294×282 | **235×226** | (no door) | — |
| shrine-of-aurora | (1000, 5400) | 307×416 | **246×333** | (1000, 5610) | **(1000, 5566)** |
| sundrop-well | (1000, 5100) | 141×160 | unchanged | — | — |

Label-text y = `center.y − round(newHeight/2) + 4`. Updated label y values used by tests:
- hero-house: 5450 − 123 + 4 = **5331** (was 5300.5)
- blacksmith: 5200 − 113 + 4 = **5091**
- shrine-of-aurora: 5400 − 167 + 4 = **5237**

---

### Task 1: Add the `villageHedgeAsset` and generate the hedge sprite

**Files:**
- Create: `public/game/assets/village-hedge.png`
- Modify: `src/lib/game/content/assets.ts` (add `villageHedgeAsset` near `villageDressingAsset`, ~line 303)
- Modify: `src/lib/game/phaser/scenes/BootScene.ts` (add `load.image`, near line 51)
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts` (import + `registerAssetFrames`, near lines 25 and 466)
- Test: `src/lib/game/content/assets.test.ts`

**Interfaces:**
- Produces: `villageHedgeAsset` (`{ key: 'village-hedge', path: '/game/assets/village-hedge.png', frames: { hedgeSegment: { x: 0, y: 0, w: 64, h: 64 } } }` as const). Consumed by Task 2's renderer.

- [ ] **Step 1: Generate the hedge sprite**

From the workspace root, generate a single clipped-boxwood hedge segment:

```sh
mkdir -p /private/tmp/gliese-village-art
agy --print --add-dir /private/tmp/gliese-village-art \
  --model "Gemini 3.5 Flash (Medium)" \
  "Generate ONE painted digital 2D illustration of a clipped boxwood garden hedge segment, roughly square, warm green foliage with soft top-left lighting, orthographic front view, matching a medieval-Japanese village aesthetic (NOT pixel art). The sprite fills a 64x64 cell on a solid #00ff00 chroma-key background. Save it to /private/tmp/gliese-village-art/hedge-raw.png. Do NOT draw with Python/PIL/SVG — use your real image tool. Confirm the saved file exists and its byte size."
```

Then strip the chroma key and place it:

```sh
python3 "$HOME/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  /private/tmp/gliese-village-art/hedge-raw.png \
  /private/tmp/gliese-village-art/hedge-clean.png
cp /private/tmp/gliese-village-art/hedge-clean.png public/game/assets/village-hedge.png
```

Expected: `public/game/assets/village-hedge.png` exists, transparent background, opaque green hedge.

- [ ] **Step 2: Vision-QA the sprite**

```sh
agy --print --add-dir /private/tmp/gliese-village-art \
  --model "Claude Sonnet 4.6 (Thinking)" \
  "Inspect hedge-clean.png. Is it a clean clipped boxwood hedge segment, painted 2D (not pixel art), transparent background (no green matte bleeding), fully filling a roughly square cell with no crop drift? Reply ACCEPT or list specific defects."
```

Expected: ACCEPT. If defects, regenerate (Step 1) before continuing.

- [ ] **Step 3: Write the failing test**

In `src/lib/game/content/assets.test.ts`, add a describe block (mirror the existing `village-dressing` block's style):

```ts
describe('villageHedgeAsset', () => {
	it('exposes a hedgeSegment frame for the garden-hedge blocker renderer', () => {
		expect(villageHedgeAsset.key).toBe('village-hedge');
		expect(villageHedgeAsset.path).toBe('/game/assets/village-hedge.png');
		expect(villageHedgeAsset.frames.hedgeSegment).toEqual({ x: 0, y: 0, w: 64, h: 64 });
	});
});
```

Add the import: `import { villageHedgeAsset } from '$lib/game/content/assets';` (extend the existing import list).

- [ ] **Step 4: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/assets.test.ts`
Expected: FAIL — `villageHedgeAsset is not defined` / import error.

- [ ] **Step 5: Add the asset definition**

In `src/lib/game/content/assets.ts`, immediately after `villageDressingAsset` (after line 301, before `export type VillageDressingFrameName`):

```ts
export const villageHedgeAsset = {
	key: 'village-hedge',
	path: '/game/assets/village-hedge.png',
	frames: {
		hedgeSegment: { x: 0, y: 0, w: 64, h: 64 }
	}
} as const;

export type VillageHedgeFrameName = keyof typeof villageHedgeAsset.frames;
```

- [ ] **Step 6: Run test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/assets.test.ts`
Expected: PASS.

- [ ] **Step 7: Wire BootScene load + WorldScene register**

In `src/lib/game/phaser/scenes/BootScene.ts`:
- Add `villageHedgeAsset` to the import from `$lib/game/content/assets` (line 17 area).
- After `this.load.image(villageDressingAsset.key, villageDressingAsset.path);` (line 51), add:
```ts
		this.load.image(villageHedgeAsset.key, villageHedgeAsset.path);
```

In `src/lib/game/phaser/scenes/WorldScene.ts`:
- Add `villageHedgeAsset` to the import from `$lib/game/content/assets` (line 25 area).
- After `this.registerAssetFrames(villageDressingAsset);` (line 466), add:
```ts
		this.registerAssetFrames(villageHedgeAsset);
```

- [ ] **Step 8: Verify check + lint**

Run: `bun run check && bun run lint`
Expected: 0 errors, lint clean.

- [ ] **Step 9: Commit (only if the user asks)**

```sh
git add public/game/assets/village-hedge.png src/lib/game/content/assets.ts \
  src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/BootScene.ts \
  src/lib/game/phaser/scenes/WorldScene.ts
git commit -m "feat: add villageHedgeAsset + hedge sprite"
```

---

### Task 2: Add the `garden-hedge` kind + renderer, and switch the village walls

This task adds the kind, wires both renderer switches, and flips the village's internal walls — bound together because the kind is meaningless until walls use it, and the strong render assertion needs all three.

**Files:**
- Modify: `src/lib/game/content/maps/types.ts` (extend the `MapBlocker` union)
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts` (`renderBlockers` ~1838, `getBlockerFrameName` ~1904)
- Modify: `src/lib/game/content/maps/regions/village.ts` (lines ~516–676: every `kind: 'town-hedge'` AFTER the meadow boundaries)
- Test: `src/lib/game/content/maps.test.ts`
- Test: `src/lib/game/phaser/scenes/scenes.test.ts`

**Interfaces:**
- Consumes: `villageHedgeAsset.key` + frame `'hedgeSegment'` from Task 1.
- Produces: a `garden-hedge` member of the `MapBlocker` `kind` union, rendered via `renderBlockerSegments`; a village whose internal walls render as hedges while meadow boundaries remain forest `treeCluster`.

- [ ] **Step 1: Write the failing map test**

In `src/lib/game/content/maps.test.ts`, add a test in the village describe block (place it near the landmark test at ~line 1077):

```ts
it('renders village-internal walls as garden-hedge and keeps meadow boundaries as town-hedge', () => {
	const internal = meadowEntryMap.blockers?.filter((b) => b.kind === 'garden-hedge') ?? [];
	const meadowBoundaries = meadowEntryMap.blockers?.filter(
		(b) => b.kind === 'town-hedge' && b.id.startsWith('meadow-')
	) ?? [];

	// The ~60 village-internal walls (perimeter, ring-road, junction noses, exit corridor)
	expect(internal.length).toBeGreaterThan(50);
	// The 4 world-edge boundaries stay forest tree-cluster
	expect(meadowBoundaries).toHaveLength(4);
	expect(meadowBoundaries.map((b) => b.id)).toEqual(
		expect.arrayContaining([
			'meadow-north-boundary',
			'meadow-south-boundary',
			'meadow-west-boundary',
			'meadow-east-boundary'
		])
	);
	// No ocean blocker changed kind
	expect(meadowEntryMap.blockers?.some((b) => b.id === 'sundrop-southwest-ocean' && b.kind === 'ocean')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails (type error first)**

Run: `bun run check`
Expected: FAIL — `'garden-hedge'` is not assignable to the `MapBlocker` kind union (the test references it). This confirms the union must be extended.

- [ ] **Step 3: Add the kind to the union**

In `src/lib/game/content/maps/types.ts`, find the `MapBlocker` `kind` union (the type listing `'town-hedge' | 'ocean' | 'city-wall' | 'future-gate' | 'ruin-wall'`; run `rg -n "town-hedge" src/lib/game/content/maps/types.ts` to locate it) and add `'garden-hedge'`.

- [ ] **Step 4: Handle the new kind in both WorldScene switches**

In `src/lib/game/phaser/scenes/WorldScene.ts`:

(a) `renderBlockers` switch (~line 1838), add a case immediately after `case 'town-hedge':`:

```ts
			case 'garden-hedge':
				this.renderBlockerSegments(blocker, villageHedgeAsset.key, 'hedgeSegment');
				break;
```

(b) `getBlockerFrameName` switch (~line 1904), add a case (runtime-unreachable, mirrors `ocean`):

```ts
			case 'garden-hedge':
				throw new Error(
					'garden-hedge blockers render via renderBlockerSegments and should not request an orientation frame'
				);
```

- [ ] **Step 5: Run check to confirm exhaustiveness passes**

Run: `bun run check`
Expected: 0 errors (both `blocker.kind satisfies never` checks now covered).

- [ ] **Step 6: Switch the village-internal walls**

In `src/lib/game/content/maps/regions/village.ts`, change `kind: 'town-hedge'` → `kind: 'garden-hedge'` for every blocker from the `// === Village perimeter ===` comment (line ~511) through the end of the `blockers` array (the `corridor-wall-10b` entry, line ~675). **Do NOT change** the four `meadow-*-boundary` entries (lines ~472–502) or the `sundrop-southwest-ocean` entry (lines ~503–510) — those stay `town-hedge` / `ocean`.

Confirm the scope is exact:

```sh
rg -n "kind: 'town-hedge'" src/lib/game/content/maps/regions/village.ts
```

Expected output: exactly the 4 `meadow-*-boundary` lines and nothing else.

- [ ] **Step 7: Run the map test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts -t "garden-hedge"`
Expected: PASS.

- [ ] **Step 8: Add a scene-level render assertion for the hedge**

In `src/lib/game/phaser/scenes/scenes.test.ts`, find the existing village landmark render test (the one around line 2260 that asserts `village-buildings` images) and add, inside it after the building assertions:

```ts
	// Village-internal walls now render as hedge segments, not tree clusters
	expect(
		scene.add.image.mock.calls.some(
			([, , texture, frame]) => texture === 'village-hedge' && frame === 'hedgeSegment'
		)
	).toBe(true);
```

- [ ] **Step 9: Run the full scene test for the village**

Run: `bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit (only if the user asks)**

```sh
git add src/lib/game/content/maps/types.ts src/lib/game/phaser/scenes/WorldScene.ts \
  src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: render village maze walls as garden-hedge"
```

---

### Task 3: Shrink the 8 village buildings to 80% and re-align doors

**Files:**
- Modify: `src/lib/game/content/maps/regions/village.ts` (8 landmark rects lines ~18–89; 7 transition `y` values lines ~331–385)
- Test: `src/lib/game/content/maps.test.ts` (landmark size assertions ~1081–1159)
- Test: `src/lib/game/phaser/scenes/scenes.test.ts` (setDisplaySize ~2321–2334; rectangle-not-called ~2290–2294; doorwayTile-not-called ~2299–2304; label-text y ~2295; door-trigger player positions ~3052, ~5631, ~5693)

**Interfaces:**
- Consumes: the resize + door map in the plan header.
- Produces: smaller building footprints with doors flush to the new south edges; all assertions updated.

- [ ] **Step 1: Update the landmark size assertions first (TDD — pin the new contract)**

In `src/lib/game/content/maps.test.ts`, update the `width`/`height` in each `expect.objectContaining` block (~lines 1081–1159) per the header table. Apply these exact replacements:

| id | old width×height | new width×height |
|---|---|---|
| hero-house-exterior | 294×307 | 235×246 |
| guild-hall-exterior | 384×346 | 307×277 |
| item-shop-exterior | 307×294 | 246×235 |
| villager-house-1-exterior | 282×256 | 226×205 |
| villager-house-2-exterior | 422×326 | 338×261 |
| villager-house-3-exterior | 230×416 | 184×333 |
| blacksmith | 294×282 | 235×226 |
| shrine-of-aurora | 307×416 | 246×333 |

`sundrop-well` (141×160) and `whispering-cave` (256×224) stay unchanged.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts -t "exterior building landmarks"`
Expected: FAIL — sizes still old.

- [ ] **Step 3: Resize the landmark rects in village.ts**

In `src/lib/game/content/maps/regions/village.ts`, update the `width`/`height` of the 8 landmark entries (lines ~18–89) to the new values from the table. Leave `(x, y)` centers and `labelKey` unchanged. Leave `sundrop-well` untouched.

- [ ] **Step 4: Re-align the 7 door transitions**

In `src/lib/game/content/maps/regions/village.ts` `transitions` array (lines ~329–386), update only the `y` of each door per the header table:

| transition id | old y | new y |
|---|---|---|
| meadow-to-hero-house | 5_600 | 5_573 |
| meadow-to-guild-hall | 5_070 | 5_038 |
| meadow-to-item-shop | 4_945 | 4_918 |
| meadow-to-villager-house-1 | 4_880 | 4_852 |
| meadow-to-villager-house-2 | 4_870 | 4_830 |
| meadow-to-villager-house-3 | 5_610 | 5_566 |
| meadow-to-shrine-of-aurora | 5_610 | 5_566 |

Leave `x`, `toMapId`, `showMarker`, `arrival` unchanged.

- [ ] **Step 5: Run the landmarks test to verify it passes**

Run: `bun run test:unit -- --run src/lib/game/content/maps.test.ts -t "exterior building landmarks"`
Expected: PASS.

- [ ] **Step 6: Update the scene rendering assertions**

In `src/lib/game/phaser/scenes/scenes.test.ts`:

(a) `setDisplaySize` assertions (~lines 2321–2334) — replace with the new sizes:

```ts
		expect(heroHouseMarker?.setDisplaySize).toHaveBeenCalledWith(235, 246);
		expect(guildHallMarker?.setDisplaySize).toHaveBeenCalledWith(307, 277);
		expect(itemShopMarker?.setDisplaySize).toHaveBeenCalledWith(246, 235);
		expect(villagerHouseMarkers).toHaveLength(3);
		expect(
			villagerHouseMarkers.every((marker) =>
				[226, 338, 184].includes(marker.setDisplaySize.mock.calls[0]![0] as number)
			)
		).toBe(true);
		expect(
			villagerHouseMarkers.every((marker) =>
				[205, 261, 333].includes(marker.setDisplaySize.mock.calls[0]![1] as number)
			)
		).toBe(true);
```

(b) The opaque-fallback `rectangle` not-called assertions (~lines 2290–2294) carry the OLD sizes. Since the rectangles are never drawn for sprite-backed landmarks regardless, update them to the NEW sizes so the assertion stays meaningful:

```ts
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(700, 5_450, 235, 246, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(500, 5_200, 235, 226, 0x5b4636, 0.9);
		expect(scene.add.rectangle).not.toHaveBeenCalledWith(1_000, 5_400, 246, 333, 0x5b4636, 0.9);
```

(Leave the whispering-cave `5_960, 1_800, 256, 224` and sundrop-well `1_000, 5_100, 141, 160` lines unchanged.)

(c) The hero-house label-text y (~line 2295):

```ts
		expect(scene.add.text).toHaveBeenCalledWith(700, 5_331, "Hero's House", {
			color: '#f8fafc',
			fontSize: '12px'
		});
```

(d) The doorwayTile-not-called door coordinates (~lines 2299–2304) — update to the new door coords:

```ts
		expect(scene.add.image).not.toHaveBeenCalledWith(700, 5_573, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(1_400, 5_038, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(600, 4_918, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(900, 4_852, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(1_200, 4_830, 'starter-pack', 'doorwayTile');
		expect(scene.add.image).not.toHaveBeenCalledWith(1_450, 5_566, 'starter-pack', 'doorwayTile');
```

- [ ] **Step 7: Update door-trigger player positions**

Several tests place the player on a door tile to fire a transition. Search and update each:

```sh
rg -n "5_600|5_070|4_945|4_880|4_870|5_610" src/lib/game/phaser/scenes/scenes.test.ts
```

Known locations that set the hero-house door player position to `(700, 5_600)` → change to `(700, 5_573)`:
- ~line 3052 (`keeps the hero house exterior doorway reachable`)
- ~line 5631 (the second hero-house transition test)

Known location that sets the shrine door player position to `(1_000, 5_610)` → change to `(1_000, 5_566)`:
- ~line 5693

For each, change only the `y` in `Object.assign(phaserState.playerMarker, { x, y })`. Re-run the grep after editing to confirm no remaining old door coordinates in door-trigger contexts (the `5_600`/`960` hits around lines 2976/5967 are unrelated north-boundary positions — leave them).

- [ ] **Step 8: Run the full scene suite**

Run: `bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts`
Expected: PASS. If any test asserts the player is blocked at a now-exposed building edge, update that assertion to reflect the smaller footprint (smaller collision only widens passable space).

- [ ] **Step 9: Commit (only if the user asks)**

```sh
git add src/lib/game/content/maps/regions/village.ts \
  src/lib/game/content/maps.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: shrink village buildings to 80% and re-align doors"
```

---

### Task 4: Full verification + human gate

**Files:** none (verification only)

- [ ] **Step 1: Run the complete unit + browser-component suite**

Run: `bun run test:unit -- --run`
Expected: all green (was 616 tests; +3 new asserts in Tasks 1–3 → expect ~619).

- [ ] **Step 2: Type-check + lint + build**

Run: `bun run check && bun run lint && bun run build`
Expected: 0 errors, lint clean, build succeeds.

- [ ] **Step 3: Connectivity sanity**

Confirm the maze connectivity / critical-route tests in the above run are green (smaller buildings can only widen gaps, never close them). If any connectivity test failed, it indicates an over-large shrink — revisit the 80% ratio in the header table.

- [ ] **Step 4: Human gate**

Present to the user for visual review:
- `public/game/assets/village-hedge.png` (the new sprite).
- The in-game village (start `bun run tauri dev` or `bun run dev` on request) — confirm the maze walls read as hedges, the dressing (stalls, fountain, lanterns) is now visible, and the smaller houses give the streets breathing room.

Do not commit until the user approves and explicitly asks.

---

## Self-Review Notes

- **Spec coverage:** hedge asset (Task 1), hedge kind + renderer + village kind-switch with meadow boundaries preserved (Task 2), 8 landmarks @80% + 7 doors re-aligned (Task 3), tests updated (Tasks 2–3), Sonnet QA (Task 1 Step 2), connectivity preserved (Task 4 Step 3). All spec sections covered.
- **No placeholders:** every code/number step carries exact values from the header table; the earlier anemic garden-hedge test was folded into Task 2's strong render assertion.
- **Type consistency:** `villageHedgeAsset.key === 'village-hedge'`, frame `'hedgeSegment'`, kind `'garden-hedge'` — used identically across Tasks 1–3.
