# Interior Prop Pixel Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `interior-props.png` with a cohesive cozy SNES-style pixel-art sprite sheet while preserving the existing Phaser frame contract.

**Architecture:** This is a same-path asset replacement. `src/lib/game/content/assets.ts` remains the source of truth for the 4x4 `128x128` frame grid, and `WorldScene` continues to register and render frames from that manifest. Runtime verification focuses on alpha correctness, crop alignment, and in-game readability.

**Tech Stack:** Built-in image generation, local PNG alpha inspection, Bun/Vitest, Svelte check, Vite build, Phaser runtime smoke.

---

## File Structure

- Modify: `public/game/assets/interior-props.png`
  - Production runtime prop sheet consumed by `interiorPropAsset`.
- Verify only: `src/lib/game/content/assets.ts`
  - Must keep the existing `512x512`, `4x4`, `128x128` frame layout unless generated art cannot crop cleanly.
- Verify only: `src/lib/game/content/assets.test.ts`
  - Existing metadata test proves the frame contract.
- Verify only: `src/lib/game/phaser/scenes/scenes.test.ts`
  - Existing scene test proves prop frame registration and rendering.
- Optional generated scratch only: `/private/tmp/gliese-interior-prop-art/`
  - Temporary generated sources, alpha-cleaned variants, crop sheets, and smoke screenshots.

## Task 1: Generate Same-Layout Pixel Art Sheet

**Files:**
- Modify: `public/game/assets/interior-props.png`
- Scratch: `/private/tmp/gliese-interior-prop-art/`

- [ ] **Step 1: Capture the exact frame contract**

Run:

```sh
file public/game/assets/interior-props.png
sed -n '76,100p' src/lib/game/content/assets.ts
```

Expected:

```text
public/game/assets/interior-props.png: PNG image data, 512 x 512, 8-bit/color RGBA, non-interlaced
cellWidth: 128
cellHeight: 128
columns: 4
```

- [ ] **Step 2: Generate a source sheet**

Use the built-in image generation tool with this prompt:

```text
Use case: stylized-concept
Asset type: 2D game sprite sheet
Primary request: Create a 512x512 pixel-art sprite sheet for cozy SNES-inspired JRPG village interior decorations.
Style/medium: crisp hand-painted pixel art, top-down three-quarter JRPG props, warm wood and cloth palette, readable silhouettes, modest dark outline, no text.
Composition/framing: exact 4x4 grid, each cell is 128x128 pixels, one centered prop per cell with generous transparent padding.
Required cell order, left to right and top to bottom:
row 1: bed, table, bench, bookshelf
row 2: shop counter, notice board, rug, crate stack
row 3: barrel, display shelf, scattered papers, weapon rack
row 4: hearth lamp, potted plant, empty transparent cell, empty transparent cell
Background: perfectly flat solid #00ff00 chroma-key background for removal, no room floor, no checkerboard, no shadows or labels.
Constraints: Do not use #00ff00 in the props. Keep every prop fully inside its cell. Make the unused cells empty except for the same flat chroma-key background. No watermarks, no UI text, no perspective room scene.
```

Expected: one generated source image with the requested 4x4 layout.

- [ ] **Step 3: Move the generated source into scratch**

Copy the chosen generated image to:

```sh
/private/tmp/gliese-interior-prop-art/interior-props-source.png
```

Expected: the source file exists and is not referenced by project code.

- [ ] **Step 4: Remove chroma key if needed**

If the generated image is not already transparent, run:

```sh
python3 /Users/chanwaichan/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py \
  --input /private/tmp/gliese-interior-prop-art/interior-props-source.png \
  --out /private/tmp/gliese-interior-prop-art/interior-props-alpha.png \
  --auto-key border \
  --soft-matte \
  --transparent-threshold 12 \
  --opaque-threshold 220 \
  --despill
```

Expected: `interior-props-alpha.png` has transparent borders and no green matte.

- [ ] **Step 5: Resize or pad to exact runtime dimensions**

If needed, normalize the accepted alpha image to exactly `512x512`:

```sh
python3 - <<'PY'
from PIL import Image
src = Image.open('/private/tmp/gliese-interior-prop-art/interior-props-alpha.png').convert('RGBA')
if src.size != (512, 512):
    src = src.resize((512, 512), Image.Resampling.NEAREST)
src.save('/private/tmp/gliese-interior-prop-art/interior-props-final.png')
PY
```

Expected: `interior-props-final.png` is `512x512` RGBA.

- [ ] **Step 6: Replace the runtime asset**

Run:

```sh
cp /private/tmp/gliese-interior-prop-art/interior-props-final.png public/game/assets/interior-props.png
```

Expected: only `public/game/assets/interior-props.png` is modified.

## Task 2: Validate Alpha And Crop Readability

**Files:**
- Verify: `public/game/assets/interior-props.png`
- Scratch: `/private/tmp/gliese-interior-prop-art/interior-props-contact-sheet.png`

- [ ] **Step 1: Inspect alpha**

Run:

```sh
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py public/game/assets/interior-props.png
```

Expected:

```text
"mode": "RGBA"
"size": [512, 512]
"has_alpha": true
"alpha_min": 0
"transparent_pixels": greater than 0
```

- [ ] **Step 2: Create a labeled crop contact sheet**

Run:

```sh
python3 - <<'PY'
from PIL import Image, ImageDraw
frames = [
    'bed', 'table', 'bench', 'bookshelf',
    'shopCounter', 'noticeBoard', 'rug', 'crateStack',
    'barrel', 'displayShelf', 'papers', 'weaponRack',
    'hearthLamp', 'plant', 'unused', 'unused'
]
sheet = Image.open('public/game/assets/interior-props.png').convert('RGBA')
out = Image.new('RGBA', (640, 720), (24, 28, 38, 255))
draw = ImageDraw.Draw(out)
for index, name in enumerate(frames):
    sx = (index % 4) * 128
    sy = (index // 4) * 128
    cell = sheet.crop((sx, sy, sx + 128, sy + 128)).resize((128, 128), Image.Resampling.NEAREST)
    dx = (index % 4) * 160 + 16
    dy = (index // 4) * 170 + 24
    out.alpha_composite(cell, (dx, dy))
    draw.text((dx, dy + 132), name, fill=(255, 255, 255, 255))
out.save('/private/tmp/gliese-interior-prop-art/interior-props-contact-sheet.png')
PY
```

Expected: the contact sheet shows each named prop in the correct cell and row 4 columns 3-4 are transparent/empty.

- [ ] **Step 3: Visually inspect the contact sheet**

Open or view:

```sh
/private/tmp/gliese-interior-prop-art/interior-props-contact-sheet.png
```

Expected:

- no green background remains
- no labels are baked into the asset
- no prop crosses into another cell
- props are readable at `128x128` and after map display scaling

## Task 3: Run Focused Verification

**Files:**
- Verify: `src/lib/game/content/assets.test.ts`
- Verify: `src/lib/game/phaser/scenes/scenes.test.ts`
- Verify: Svelte/Vite project checks

- [ ] **Step 1: Run focused asset and scene tests**

Run:

```sh
bun run test:unit -- --run src/lib/game/content/assets.test.ts src/lib/game/phaser/scenes/scenes.test.ts --testNamePattern "interior prop|solid interior furniture|villager flavor dialogue|preloads"
```

Expected: PASS.

- [ ] **Step 2: Run project checks**

Run:

```sh
bun run check
bun run build
```

Expected: both PASS. `bun run build` may emit the existing large Phaser chunk warning.

## Task 4: Browser Smoke And Commit

**Files:**
- Verify: running app at `http://127.0.0.1:5173/`
- Scratch: `/private/tmp/gliese-interior-prop-art/browser-smoke.png`

- [ ] **Step 1: Start or reuse the Vite dev server**

Run if no server is listening on port `5173`:

```sh
bun run dev -- --host 127.0.0.1
```

Expected: the app is available at `http://127.0.0.1:5173/`.

- [ ] **Step 2: Smoke the decorated interiors**

Use browser automation or the in-app browser to visit the app, reload if needed, and inspect:

- Hero house shows bed, rug, table, bookshelf, crates, and plant with the new art.
- Guild hall shows notice board, desks, benches, papers, weapon rack, and ambient members with the new art.
- Item shop shows counter, display shelves, rug, crates, and barrel with the new art.
- Villager homes show distinct table/bed/shelf/rug/papers/lamp/plant combinations with the new art.
- Lynn interaction still opens a Close dialogue.

Expected: no crop drift, no green/opaque matte, no UI overlap, and no missing texture.

- [ ] **Step 3: Check git status**

Run:

```sh
git status --short
```

Expected:

```text
 M public/game/assets/interior-props.png
```

- [ ] **Step 4: Commit**

Run:

```sh
git add public/game/assets/interior-props.png
git commit -m "art: replace interior prop pixel sheet"
```

Expected: commit succeeds with only the runtime asset changed.
