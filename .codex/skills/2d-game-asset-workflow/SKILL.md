---
name: 2d-game-asset-workflow
description: Use when generating, regenerating, importing, or wiring 2D game art in this project, especially for sprite sheets, tiles, HUD art, transparent PNG requests, Phaser frame manifests, or replacing placeholder visuals in the SvelteKit plus Phaser game.
---

# 2D Game Asset Workflow

## Overview

Generate 2D game assets as production-ready runtime files, not just concept art. Verify real transparency, import assets into the project, centralize frame metadata, and wire the result into Phaser before calling the work done.

## Workflow

### 1. Scope the asset batch

Clarify these decisions before generating anything:

- Asset type: characters, enemies, tiles, pickups, UI, or mixed starter pack
- Packaging: single sheet, per-category sheet, or individual PNGs
- Art direction: pixel art vs non-pixel, palette, camera angle, mood
- Runtime constraints: transparency, cell size, expected scaling, desktop vs mobile readability

Default to a coherent sheet when several related assets ship together. Default to square cells around `96x96` unless the user asks for a different size.

### 2. Generate assets deliberately

Use the image generation tool for new art.

Write prompts that specify:

- transparent background
- fixed grid or predictable sheet layout
- readable top-down or side-view silhouettes
- limited palette if the project is pixel-art driven
- no matte background, no checkerboard baked into the image

When generating a sheet, keep categories visually separated enough that crop rectangles are straightforward to author.

### 3. Verify real alpha before wiring

Never assume a generated PNG is actually transparent just because it looks transparent in a viewer.

Inspect every asset that is supposed to have transparency:

```bash
python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py static/game/assets/starter-pack.png
```

Require all of these before accepting the file:

- the image has an alpha channel
- `alpha_min` is `0` when true transparency was requested
- `transparent_pixels` is greater than `0`

If the file is still fully opaque:

- regenerate with a stricter prompt, or
- perform deterministic cleanup before import, then re-run alpha inspection

For flat opaque backgrounds around the sheet, use:

```bash
python3 .codex/skills/2d-game-asset-workflow/scripts/remove_border_background.py input.png output.png
```

This helper removes border-connected pixels whose RGB values stay within a configurable tolerance of the sampled edge colors. Use it for generated art that should have been transparent but arrived as an opaque PNG.

Do not wire opaque faux-transparent art into Phaser and hope it looks fine later.

### 4. Import into project runtime paths

Place runtime art in `static/game/assets/`.

Prefer stable, descriptive names:

- `characters-sheet.png`
- `environment-sheet.png`
- `ui-sheet.png`
- `starter-pack.png`

If replacing an existing asset, keep the path stable unless there is a good reason to split or rename the file.

### 5. Centralize frame metadata

Store crop coordinates in `src/lib/game/content/assets.ts`.

Keep this module responsible for:

- asset keys
- public asset paths
- frame rectangles
- helper lookups such as enemy or terrain frame selection

Avoid hardcoding ad hoc crop rectangles inside scene code.

### 6. Wire assets into Phaser

Preload sheets in `src/lib/game/phaser/scenes/BootScene.ts`.

Register or consume frames from scene code, currently centered in `src/lib/game/phaser/scenes/WorldScene.ts`.

When replacing placeholder art:

- swap primitive shapes for image objects
- keep sizing explicit with `setDisplaySize(...)`
- preserve gameplay semantics while changing visuals
- update tints, frame selection, and state changes to work with image-based objects

### 7. Verify both code and runtime behavior

Run targeted tests for touched gameplay files. For the current project, prefer focused runs around:

- `src/lib/game/phaser/scenes/scenes.test.ts`
- `src/lib/game/phaser/createGame.test.ts`
- any content tests affected by asset metadata changes

Then inspect the running game in the in-app browser and look for:

- opaque backgrounds
- crop drift
- wrong frame names
- scaling distortion
- sprite overlap with UI
- unreadable tiles at runtime size

### 8. Iterate on layout, not just art

If wiring feels fragile, improve the asset packaging:

- split oversized mixed sheets
- regularize the grid
- rename frames for clarity
- tighten the manifest contract

Prefer making sheet layout easier to integrate over compensating with messy crop math.

## Project Conventions

- Keep runtime assets under `static/game/assets/`.
- Keep frame definitions centralized in `src/lib/game/content/assets.ts`.
- Keep Phaser preload in `src/lib/game/phaser/scenes/BootScene.ts`.
- Keep gameplay-facing image usage in scene modules such as `src/lib/game/phaser/scenes/WorldScene.ts`.
- When editing project files, use `apply_patch` for manual changes.

## Prompt Checklist

Use wording like this when the user has not supplied a better prompt:

```text
SNES-inspired pixel art sprite sheet for a 2D action JRPG, transparent background, clean top-down readability, fixed grid layout, no baked checkerboard, no background matte, production-ready game asset sheet.
```

Add the specific asset list, palette, and cell sizing for the current request.

## Common Failure Modes

- The PNG has an alpha channel but every pixel is still fully opaque.
- A viewer's transparency checkerboard is mistaken for real transparent pixels.
- Crop rectangles are authored directly in scene code and drift out of sync.
- A single sheet mixes unrelated assets so tightly that frame maintenance becomes brittle.
- Placeholder gameplay objects are replaced visually, but tests still assume primitive shapes.
- Background cleanup removes interior art because the tolerance is too loose. Start with a tighter tolerance and verify the output before wiring it into the game.
