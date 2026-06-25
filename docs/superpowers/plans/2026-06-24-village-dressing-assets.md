# Village Dressing & Ground Tile Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Image generation MUST follow the `generating-images-with-cli` skill (the `agy` path).

**Goal:** Give Sundrop Village a distinct visual identity by adding a dedicated `village-dressing.png` sheet (village-styled variants of the 8 decor frames the village currently borrows from crossroads/shrine, plus 4 new props) and 3 new ground tiles. Today the village reuses `crossroadsDressingAsset` and `shrineDressingAsset` frames verbatim, so its plaza/lanes look identical to other regions.

**Why this matters / root cause:** Every region has a dedicated dressing sheet (`coast-`, `crossroads-`, `marsh-`, `shrine-`, `forest-dressing`) EXCEPT the village. Village `mapDecor` points its `textureKey` at the crossroads and shrine sheets. Variety requires village-specific art.

**Architecture:** Same-path additive asset work.
- `src/lib/game/content/assets.ts` remains the source of truth. Add a `villageDressingAsset` (256×256 cells) and 3 new terrain tile frames appended to `terrainTilesAsset`.
- The village variants REUSE the exact borrowed frame names (`marketStall`, `festivalBanner`, `flowerBed`, `poleLantern`, `hangingLantern`, `stoneLantern`, `offeringStand`, `autumnMaple`), so wiring is a pure `textureKey` swap in `village.ts` — zero frameName changes. Crossroads/shrine keep their own art untouched.
- The tileset canvas builder (`WorldScene.ensureTerrainTilesetTexture`) is fully dynamic over `terrainFrameOrder.length` (verified: `canvas.width = terrainFrames.length * tileSize`; index map built from `terrainFrameOrder`), so appending tiles is safe.

**Art style (locked via agy vision of `crossroads-dressing.png`):** painted digital 2D illustration, orthographic front-facing 3/4 RPG projection, warm medieval-Japanese palette (stone greys, wood browns, cream, brass/gold, crimson, with vibrant pops in goods/flowers), soft thin dark outlines defining edges, high detail (brickwork/wood grain/fabric drape), soft directional light from top-left casting subtle shadows to bottom-right, fully transparent background. NOT pixel art. Must visually match `crossroads-dressing.png`/`shrine-dressing.png`.

**Tech Stack:** `agy` CLI (Gemini, multimodal — owns generate + visual QA), `remove_chroma_key.py` for #00ff00 transparency, PIL for normalize/composite/contact-sheet, Bun/Vitest, svelte-check, Vite build.

---

## Style anchor & generation rules (apply to every image task)

- **Style anchor:** pass the existing reference sheet path to `agy` so it looks at it and matches the painted style (e.g. `crossroads-dressing.png` for props, `terrain-tiles.png` for tiles). Do NOT rely on text-only style descriptions.
- **Chroma background:** every generated sheet uses a perfectly flat solid `#00ff00` background, no checkerboard, no shadows, no labels, no room/ground. Do not use `#00ff00` inside the props.
- **Forbid code-drawn placeholders:** every prompt contains: "Use your built-in image-generation tool to make a genuine AI raster. Do NOT draw it with Python/PIL/SVG/canvas. If you have no real image tool, print NO IMAGE TOOL and stop."
- **Layout fidelity:** request the exact grid (columns × rows of Npx cells). Generators ignore exact pixels, so after generation agy MUST visually verify cell alignment; PIL normalizes to the exact runtime size afterward.
- **agy invocation shape:** `printf '%s' "<prompt>" | agy --print --print-timeout 8m --add-dir <dir> --model "Gemini 3.5 Flash (Medium)"`. Tell agy the absolute output path inside `--add-dir`; it saves there directly.
- **Transparency pipeline:** agy/Gemini output is opaque RGB → strip the #00ff00 key with `python3 "$HOME/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py" --input <src> --out <alpha> --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill`.
- **Visual QA (agy, after chroma removal):** a SEPARATE `agy --print` call opens the final asset and returns a per-cell text verdict: style match (vs reference), chroma fully removed (no green fringe), no prop bleed across cells, every named cell present + centered + readable, transparent borders. Act on the text: regenerate failing cells or accept.

---

## File Structure

- Modify: `public/game/assets/village-dressing.png` (NEW runtime dressing sheet).
- Modify: `public/game/assets/terrain-tiles.png` (extend 2304×256 → 3072×256, preserve existing 9 tiles).
- Modify: `src/lib/game/content/assets.ts` (add `villageDressingAsset`; add 3 tile frames + update `terrainTilesAsset.columns`).
- Modify: `src/lib/game/content/maps/regions/village.ts` (repoint `textureKey` → `villageDressingAsset.key`; add 4 new prop decor entries; swap select ground-patch tiles).
- Modify: `src/lib/game/content/maps/regions/decor-roles.ts` (roles for 4 new props).
- Modify: `src/lib/game/phaser/scenes/BootScene.ts` (load `villageDressingAsset`).
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts` (register `villageDressingAsset` frames).
- Scratch only: `/private/tmp/gliese-village-art/` (generated sources, alpha-cleaned, contact sheets, smoke screenshots).

## village-dressing.png frame contract (4 columns × 3 rows, 256×256 cells, 1024×768)

| cell | frameName | source |
| --- | --- | --- |
| r1c1 | `marketStall` | variant of crossroads `marketStall` |
| r1c2 | `festivalBanner` | variant of crossroads `festivalBanner` |
| r1c3 | `flowerBed` | variant of crossroads `flowerBed` |
| r1c4 | `poleLantern` | variant of crossroads `poleLantern` |
| r2c1 | `hangingLantern` | variant of crossroads `hangingLantern` |
| r2c2 | `stoneLantern` | variant of shrine `stoneLantern` |
| r2c3 | `offeringStand` | variant of shrine `offeringStand` |
| r2c4 | `autumnMaple` | variant of shrine `autumnMaple` |
| r3c1 | `gateArch` | NEW — wooden village gate arch (NE exit landmark) |
| r3c2 | `fountain` | NEW — small stone plaza fountain |
| r3c3 | `scarecrow` | NEW — straw scarecrow on a post |
| r3c4 | `hedgeTopiary` | NEW — clipped round hedge topiary (maze identity) |

## New ground tiles (append to terrain-tiles.png, 256×256 each)

- `gardenGrassTile` — grassy garden tile with small blooms
- `packedEarthTile` — worn packed-earth lane floor
- `mossyCobbleTile` — mossy cobblestone

Append at x = 2304, 2560, 2816 (strip becomes 3072×256). `terrainFrameOrder` gains them in this order.

---

## Task 1: Generate + QA village-dressing.png

**Files:** Modify `public/game/assets/village-dressing.png`; scratch `/private/tmp/gliese-village-art/`.

- [ ] **Step 1: Generate the source sheet.** `agy --print` with the style anchor reference (`crossroads-dressing.png` + `shrine-dressing.png`), the 4×3 / 256px grid layout, the 12-cell contents in order, flat `#00ff00` background, the forbid-code-drawing clause. Save to `/private/tmp/gliese-village-art/village-dressing-source.png`.
- [ ] **Step 2: Strip chroma.** `remove_chroma_key.py` → `village-dressing-alpha.png`.
- [ ] **Step 3: Normalize.** PIL resize (NEAREST) to exactly `1024×768` → `village-dressing-final.png`.
- [ ] **Step 4: Visual QA (agy).** agy opens the final file, returns per-cell verdict (style match, no green, no bleed, all 12 cells present + readable, transparent borders).
- [ ] **Step 5: Install.** `cp` final → `public/game/assets/village-dressing.png`.
- [ ] **Gate:** if any cell fails QA, regenerate the whole sheet (or fall back to per-cell generation + PIL composite) before proceeding.

## Task 2: Generate + composite 3 ground tiles

**Files:** Modify `public/game/assets/terrain-tiles.png`; scratch.

- [ ] **Step 1: Capture tile style.** `agy` describes `terrain-tiles.png` (style + per-tile contents) so the new tiles match and tile seamlessly.
- [ ] **Step 2: Generate 3 tiles.** One `agy` call for a 768×256 strip (3 cells side by side: gardenGrass, packedEarth, mossyCobble) with `#00ff00` gutters removed afterward, OR 3 separate square generations + composite. Style anchor = `terrain-tiles.png`. Save to scratch.
- [ ] **Step 3: Strip chroma + normalize each to 256×256.**
- [ ] **Step 4: Composite.** PIL: load existing `terrain-tiles.png` (2304×256), paste 3 new tiles at x=2304/2560/2816, save as 3072×256 over `public/game/assets/terrain-tiles.png`. Verify the original 9 tiles are byte-for-byte intact on the left (crop + compare hash).
- [ ] **Step 5: Visual QA (agy).** agy verifies the extended strip: original 9 unchanged, 3 new tiles seamless + style-matched.

## Task 3: Wire village-dressing sheet

**Files:** `assets.ts`, `BootScene.ts`, `WorldScene.ts`, `village.ts`, `decor-roles.ts`.

- [ ] **Step 1: Add manifest.** `villageDressingAsset` in `assets.ts` (key `village-dressing`, path `/game/assets/village-dressing.png`, cellWidth/Height 256, columns 4, the 12 frames at grid coords). Add type `VillageDressingFrameName`.
- [ ] **Step 2: Load + register.** BootScene `load.image`; WorldScene `registerAssetFrames`.
- [ ] **Step 3: Repoint village.ts.** Replace every `crossroadsDressingAsset.key` and `shrineDressingAsset.key` in the village `mapDecor` with `villageDressingAsset.key` (frameNames unchanged). Drop now-unused crossroads/shrine imports if no other refs remain.
- [ ] **Step 4: Add 4 new prop decor entries.** Place `gateArch` at the NE gate (≈ x1650 y4400), `fountain` in the plaza (≈ x1000 y5100 clear of sundrop-well), `scarecrow` in a field dead-end, `hedgeTopiary` at a maze junction. Give each appropriate `collision` where it should block (gateArch/fountain/topiary block; scarecrow optional). Add roles in `decor-roles.ts`.
- [ ] **Step 5: Check no collision regresses connectivity.** Run the village maze goal tests + critical-routes test; any new collision that blocks a lane must be moved/removed (recall: market-stall has no collision by design).

## Task 4: Wire ground tiles

**Files:** `assets.ts`, `village.ts`.

- [ ] **Step 1: Manifest.** Add 3 frames to `terrainTilesAsset.frames` at x=2304/2560/2816; bump `columns` to 12. Append the 3 names to `terrainFrameOrder`.
- [ ] **Step 2: Use in village.** Swap select village `groundPatches` tiles: ring road/spokes → `packedEarthTile`; plaza → `mossyCobbleTile`; a couple dead-end pockets → `gardenGrassTile`. Keep `pathTile`/`ruinsFloorTile` where the soft-maze/connectivity tests depend on them (verify by running tests).

## Task 5: Verify

**Files:** verify only.

- [ ] **Step 1:** `bun run test:unit -- --run` (assets test, scene frame-registration test, soft-maze goal tests, critical routes).
- [ ] **Step 2:** `bun run check` + `bun run build`.
- [ ] **Step 3:** Browser smoke. Start `bun run dev`; agy (or screenshot) captures the village plaza + gate + a maze lane; confirms new art renders, no missing-texture purple, no green matte, no crop drift.

## Task 6: Human gate

- [ ] The user visually reviews `village-dressing.png`, the extended `terrain-tiles.png`, and an in-game screenshot (agent cannot view images; agy QA verdict + the user's eyes are the gate). Approve or request regenerations before commit.
