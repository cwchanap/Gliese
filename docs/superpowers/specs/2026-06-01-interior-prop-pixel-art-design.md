# Interior Prop Pixel Art Design

## Goal

Replace the current placeholder-like `public/game/assets/interior-props.png` with a cohesive pixel-art sprite sheet for the village interior decorations. The replacement should make the hero house, Guild, item shop, and villager homes feel warmer and more alive without changing map layouts, collision rules, story content, or the Phaser rendering contract.

## Approved Direction

Use a cozy SNES JRPG style: warm woods, simple cloth colors, readable silhouettes, modest outline contrast, and top-down/three-quarter prop shapes that remain legible at the current runtime sizes. The mood should fit a small village rather than ruins-heavy or toy-like styling.

## Asset Contract

Keep the existing runtime contract:

- Path: `public/game/assets/interior-props.png`
- Sheet size: `512x512`
- Cell size: `128x128`
- Grid: `4` columns by `4` rows
- Background: true transparent PNG alpha, no baked checkerboard, matte, shadow, or room floor
- Existing frame names and crop rectangles remain authoritative in `src/lib/game/content/assets.ts`

The generated sheet must preserve these cell positions:

| Cell | Frame |
| --- | --- |
| row 1 col 1 | `bed` |
| row 1 col 2 | `table` |
| row 1 col 3 | `bench` |
| row 1 col 4 | `bookshelf` |
| row 2 col 1 | `shopCounter` |
| row 2 col 2 | `noticeBoard` |
| row 2 col 3 | `rug` |
| row 2 col 4 | `crateStack` |
| row 3 col 1 | `barrel` |
| row 3 col 2 | `displayShelf` |
| row 3 col 3 | `papers` |
| row 3 col 4 | `weaponRack` |
| row 4 col 1 | `hearthLamp` |
| row 4 col 2 | `plant` |
| row 4 col 3 | unused transparent cell |
| row 4 col 4 | unused transparent cell |

## Generation Strategy

Generate one full replacement sheet rather than many independent images. A single sheet gives the props a consistent palette, lighting direction, outline weight, and scale relationship. The prompt should require a fixed 4x4 grid, clean padding inside every cell, no text labels, no room background, and no use of the chroma-key color inside the art if local background removal is needed.

If the first generated sheet has frame drift, opaque background, labels, or mismatched perspective, regenerate once with a stricter prompt before considering manual cleanup. If transparency cannot be trusted from generation, use the local chroma-key removal workflow and validate alpha before importing.

## Runtime Integration

Prefer a same-path asset replacement only. Do not change map prop ids, frame names, collision rectangles, story beats, browser fixture prose, or scene rendering unless the generated sheet proves impossible to crop cleanly with the current frame layout.

If crop changes become necessary, keep them centralized in `src/lib/game/content/assets.ts` and update the asset tests. No crop coordinates should be added to `WorldScene`.

## Verification

Verification must include:

- PNG alpha inspection confirms RGBA, `alpha_min` is `0`, and `transparent_pixels` is greater than `0`.
- Visual inspection of the sheet and in-game interiors checks for wrong crops, opaque backgrounds, unreadable props, and UI overlap.
- Focused tests for asset metadata and scene rendering pass.
- `bun run check` and `bun run build` pass before completion.

The browser smoke should revisit the decorated interiors and confirm the art reads correctly in hero house, Guild, item shop, and all villager homes.
