# Gliese World Authoring

Select the owning source before designing coordinates or art. All current paths produce `WorldMapDefinition`, but they are not interchangeable authoring models.

## Source Selection

| Authoring source     | Use it for                                                                    | First stops                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overworld text grid  | Every outdoor area: terrain, buildings, anchors, story terrain                | `CLAUDE.md` ("Overworld grid maps"), `src/lib/game/content/maps/overworld/world.ts`, the closest chunk under `src/lib/game/content/maps/overworld/chunks/` |
| Overworld placements | Doors, caches, ambient NPCs, signs, and story placements on overworld anchors | `src/lib/game/content/maps/overworld/places.ts`, `src/lib/game/content/maps/overworld/prologue.ts`, `src/lib/game/content/maps/overworld/map.ts`           |
| Direct map literal   | Interiors and ruins-style dungeons                                            | `src/lib/game/content/maps.ts`, `src/lib/game/content/maps/types.ts`                                                                                       |

## Overworld Text Grid

The continent is one text-grid map, `overworld`, and the opening map. Sundrop, the Wildwood,
Silverpine, and the Mistfen basin are built; the rest of the Mistfen and the later chapters'
regions are outline chunks to replace in place. The format, legend, anchors, buildings, and story
overlays are documented in `CLAUDE.md`; the compiler lives in
`src/lib/game/content/maps/grid/compile.ts`.

- Edit terrain as text; place spawns, doors, NPCs, and story content on named anchors.
- Keep corridors at least 2 tiles wide.
- Keep a free tile between an anchor and any blocking tile to its south or east.
- Put placements in `places.ts` (everyday) or `prologue.ts` (story-gated) with `anchorPoint(name)`.
- Run `bun run map:preview` (or `-- --chunk <id>`) and look at the PNG before calling geometry done.

## Direct Maps

Current interiors and the ruins are direct definitions in `src/lib/game/content/maps.ts`.

- Start from the closest current map.
- Interiors commonly use NPCs, transitions, `interiorProps`, ambient NPCs, collision, and optional backgrounds.
- Ruins-style maps commonly use ground patches, blockers, encounters, pickups, and transitions.
- Preserve existing IDs and save/arrival semantics.
- Extend `WorldMapDefinition` only when the real map cannot be represented cleanly.
- Do not pre-build an interior compiler, room graph, or dungeon framework.

## Structure Before Art

For a substantial spatial revision, define and review functional bounds, lots,
rooms, corridors, walls, doors, routes, transition approaches, and NPC approaches
before generating final art or placing decorative content. Prove the geometry with
a walkable graybox first.

## Gameplay and Background Ownership

Read `src/lib/game/content/maps/background-ownership.ts` and `src/lib/game/content/maps/types.ts` before changing baked backgrounds.

- Collision remains authoritative independently of art.
- Base and foreground backgrounds are presentation.
- `fallback-only` visuals return when their owning background is unavailable.
- NPCs, transitions, encounters, pickups, rewards, discoveries, evidence, doors, gates, and other stateful content remain live.
- Correct or re-export art rather than moving collision to match an accidental image.

## Story and Content Handoffs

Story prose and beat metadata live in `story/manifest.yaml` and `story/beats/`. Use `gliese-story-writer` for those edits.

Runtime content remains in:

```text
src/lib/game/content/shops.ts
src/lib/game/content/quests.ts
src/lib/game/content/enemies.ts
src/lib/game/content/maps.ts
tools/export-story-content-references.ts
```

Dialogue choices (shop, close) live in the beats, not TypeScript. NPC placement belongs to the owning map, and story-gated placements use `activeDuring` / `hiddenDuring`. After story or story-referenced content IDs change, run `bun run story:check`.

Use `::: unsupported-hook` for unsupported story needs, or record the owning runtime gap. Do not hide unsupported behavior in coordinates, art, or dialogue text.

## Art Handoffs

Generic props, sprites, sheets, transparency, frame manifests, and Phaser wiring use `.agents/skills/2d-game-asset-workflow/SKILL.md`. Runtime art belongs under `public/game/assets/`; frame metadata belongs in `src/lib/game/content/assets.ts`; Phaser preload and frame use belong in `src/lib/game/phaser/scenes/BootScene.ts` and `src/lib/game/phaser/scenes/WorldScene.ts`.

The overworld renders from the grid tileset (`public/game/assets/overworld/tiles.png`). Record the concrete need and build only the smallest asset path the real map requires.
