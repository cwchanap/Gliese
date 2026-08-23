# Task 6 — Bind the Complete Package in Review Mode

Status: DONE

## Implementation

- Added the frozen `meadow-entry-painted-v2-complete` package and four generated
  3200×3200 base descriptors to the Meadow runtime registry.
- Added the `complete` runtime selection mode. The complete package is selected
  only by the exact generic review ID; the legacy `meadowPaintedPilot=on` alias
  still selects the legacy package and is rejected when combined with the
  complete package request.
- Bound complete selections through the existing generic map-package transform.
  Full-map success now suppresses all static presentation collections through the
  shared renderer policy; collision, NPC, encounter, transition, pickup,
  discovery, and landmark state remains live. Existing transaction rollback
  restores the legacy presentation when any required texture fails.
- Added `paintedMode: 'complete'` diagnostics while retaining `pilot` and
  `fallback` classification.
- Updated the generic full-map renderer assertions to match the approved
  full-map suppression contract.

## RED evidence

- `meadow-entry-painted-v2-runtime.test.ts`: 3 failures before implementation;
  the complete selection was undefined, the exact complete request fell back,
  and the simultaneous legacy/complete request incorrectly selected pilot.
- `meadow-entry-painted-backgrounds.test.ts`: 1 failure before implementation;
  the complete selection was unavailable to the map transform.
- `scenes.test.ts`: 2 failures before implementation;
  complete assets were not preloaded and the complete selection was unavailable
  to the scene.

## GREEN evidence

- `bun run test:unit -- --run src/lib/game/content/backgrounds/meadow-entry-painted-v2-runtime.test.ts src/lib/game/content/maps/meadow-entry-painted-backgrounds.test.ts src/lib/game/phaser/regional-background-plane-render-diagnostics.test.ts`
  — 3 files, 26 tests passed.
- `bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts`
  — 1 file, 225 tests passed.
- Complete scene cases cover all four required textures independently for
  missing-texture, invalid-dimensions, and render-failed faults (12 cases),
  asserting zero active package images and complete legacy restoration.
- `bun run test:unit -- --run src/lib/game/content/backgrounds/map-background-package.test.ts src/lib/game/content/assets.test.ts`
  — 2 files, 53 tests passed.
- `bun run test:unit -- --run src/lib/game/phaser/world-render-options.test.ts`
  — 17 tests passed.
- `bun run art:validate:meadow-entry-complete` — complete controls, master,
  review manifest, exports, approval, generated runtime, and 13 art contract
  tests passed; 4 complete control approval tests passed within the command.
- `bun run check` — 0 errors, 0 warnings.
- Targeted ESLint — passed.
- Targeted Prettier check — passed.
- `git diff --check` — passed.

## Concerns

None. Existing untracked visual evidence and workspace artifacts were preserved
and are not part of this task's commit.
