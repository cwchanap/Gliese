# Gliese World Authoring

Select the owning source before designing coordinates or art. All current paths produce `WorldMapDefinition`, but they are not interchangeable authoring models.

## Source Selection

| Authoring source                   | Use it for                                                         | First stops                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct map literal                 | Current interiors and ruins-style dungeons                         | `src/lib/game/content/maps.ts`, `src/lib/game/content/maps/types.ts`                                                                                                |
| Hand-authored fragment composition | New or revised Meadow Entry destinations and connectors by default | `src/lib/game/content/maps/regions/types.ts`, the closest file under `src/lib/game/content/maps/regions/`, and `src/lib/game/content/maps/meadow-entry.ts`          |
| Village layered source             | Existing Sundrop Village tile-level geometry                       | `src/lib/game/content/maps/regions/village-layered.ts`, `src/lib/game/content/maps/layered/types.ts`, `src/lib/game/content/maps/layered/compile-layered-region.ts` |

## Direct Maps

Current interiors and the ruins are direct definitions in `src/lib/game/content/maps.ts`.

- Start from the closest current map.
- Interiors commonly use NPCs, transitions, `interiorProps`, ambient NPCs, collision, and optional backgrounds.
- Ruins-style maps commonly use ground patches, blockers, encounters, pickups, and transitions.
- Preserve existing IDs and save/arrival semantics.
- Extend `WorldMapDefinition` only when the real map cannot be represented cleanly.
- Do not pre-build an interior compiler, room graph, or dungeon framework.

## Meadow Entry RegionFragments

Crossroads, Coast, Mistfen, Silverpine, Wildwood, and shared connector paths are hand-authored fragments:

```text
src/lib/game/content/maps/regions/crossroads.ts
src/lib/game/content/maps/regions/coast.ts
src/lib/game/content/maps/regions/mistfen.ts
src/lib/game/content/maps/regions/silverpine.ts
src/lib/game/content/maps/regions/wildwood.ts
src/lib/game/content/maps/regions/paths.ts
```

A new fragment is not active until it is imported and included in `mergeRegions(...)` in `src/lib/game/content/maps/meadow-entry.ts`. IDs must be unique within each merged field.

Default to this pattern for another Meadow Entry region or connector. Do not choose the larger layered declaration model merely because it exists.

## Sundrop Village Layered Source

Only Sundrop Village currently uses:

```text
src/lib/game/content/maps/regions/village-layered.ts
src/lib/game/content/maps/layered/compile-layered-region.ts
src/lib/game/content/maps/regions/village.ts
```

Edit `village-layered.ts` for village tile-level geometry. `village.ts` is the thin compiler/background wrapper. Use this path for a future region only after a real delivery demonstrates that tile-level layers are worth the larger source surface.

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
src/lib/game/content/dialogue.ts
src/lib/game/content/shops.ts
src/lib/game/content/quests.ts
src/lib/game/content/enemies.ts
src/lib/game/content/maps.ts
tools/export-story-content-references.ts
```

`dialogue.ts` owns action and intent shells, not prose. NPC placement belongs to the owning map. After story or story-referenced content IDs change, run `bun run story:check`.

Use `::: unsupported-hook` for unsupported story needs, or record the owning runtime gap. Do not hide unsupported behavior in coordinates, art, or dialogue text.

## Art Handoffs

Meadow Entry package work remains map-specific. When its controls or approved package change, use:

```sh
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

Generic props, sprites, sheets, transparency, frame manifests, and Phaser wiring use `.agents/skills/2d-game-asset-workflow/SKILL.md`. Runtime art belongs under `public/game/assets/`; frame metadata belongs in `src/lib/game/content/assets.ts`; Phaser preload and frame use belong in `src/lib/game/phaser/scenes/BootScene.ts` and `src/lib/game/phaser/scenes/WorldScene.ts`.

A new map does not inherit Meadow Entry's adapter, crop contract, provenance inventory, or approval machinery. Record the concrete need and build only the smallest asset path the real map requires.
