# Gliese World Validation

Choose checks from the touched scope. Do not create an evidence matrix.

## Focused Commands

Skill routing or references:

```sh
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
```

Map definitions, transitions, encounters, shops, or content IDs:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Renderer, background planes, preload, or Phaser world behavior:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Story prose, beat metadata, or story-referenced content IDs:

```sh
bun run story:check
```

Meadow Entry controls or art package:

```sh
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

Repository checks:

```sh
bun run check
bun run lint
```

Use `bun run build` when browser bundling or runtime assets change. Use `bun run build:tauri` when the Tauri story boundary or release asset path changes.

## Controller Walkthrough

Derive one shortest route from the Expansion Brief. Cover only relevant behavior:

1. enter through the intended spawn or transition;
2. traverse every new critical zone and one optional route;
3. approach each changed NPC, shop, quest object, encounter, reward, door, or discovery;
4. cross every changed transition in both directions;
5. perform one representative save/reload when save position or progression is affected;
6. exercise one representative missing-background fallback when background ownership changes;
7. run one normal web session and one packaged Tauri session when the delivered scope requires both.

## Failure Ownership

- Story text, beat metadata, or generated references: story owner.
- Route, blocker, transition, or collision mismatch: map geometry owner.
- Loading, depth, fallback, or scene behavior: runtime renderer owner.
- Meadow Entry crop/master/export mismatch: Meadow Entry art-package owner.
- Generic sprite alpha, sheet layout, frame metadata, or preload mismatch: `2d-game-asset-workflow` owner.

Fix the defect at its owner. Do not add a translation layer, duplicate source, or broad framework to hide it.
