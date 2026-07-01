# Sundrop Village Layout Review Design

## Summary

HPA-115 is the final manual validation pass for the deterministic Sundrop
Village relayout. The task should produce reviewable screenshot artifacts and a
Markdown report that explains whether the seven required village views are
readable without relying on the old hedge-grid structure.

No runtime map, gameplay, Svelte, asset, or test source changes are planned. If
the visual review finds a real layout defect, list it in the report as a
follow-up patch instead of changing runtime content inside this validation task.

## Scope

Create:

- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review.md`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/01-spawn-home-yard.png`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/02-well-plaza.png`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/03-market-yard.png`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/04-north-residences-guild.png`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/05-shrine-garden.png`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/06-east-gate.png`
- `docs/superpowers/reports/2026-06-21-sundrop-village-layout-review-assets/07-route-to-crossroads.png`

Verify but do not modify unless a real issue is discovered:

- `src/lib/game/content/maps/regions/village.ts`
- `src/lib/game/content/maps/regions/rooms.ts`
- `src/lib/game/content/maps/regions/route-scenes.ts`
- `src/lib/game/content/maps/regions/village-layout.test.ts`
- `src/lib/game/content/maps/regions/soft-maze.test.ts`
- `src/lib/game/content/maps.test.ts`

## Screenshot Strategy

Use the existing browser-save path rather than adding new debug hooks. A
temporary Playwright script should seed `gliese.save.v7` in browser
`localStorage`, open the built preview app, click **Menu -> Resume Save**, wait
for the HUD state to report the expected `meadow-entry` player coordinate, and
capture the Phaser canvas.

Capture only the canvas so HUD overlays do not obscure the village geometry.
Use a stable desktop viewport of `1280x720` with `deviceScaleFactor: 1`.

The screenshot points are the current authoring-manifest centers:

| Screenshot | Coordinate source | Player coordinate |
| --- | --- | --- |
| Spawn / Home Yard | `village-home-yard-room` | `(700, 5585)` |
| Well Plaza | `village-well-plaza-room` | `(1000, 5160)` |
| Market Yard | `village-market-yard-room` | `(650, 5045)` |
| North Residences / Guild | `village-north-residences-room` | `(1050, 4860)` |
| Shrine Garden | `village-shrine-garden-room` | `(1200, 5660)` |
| East Gate | `village-east-gate-room` | `(1660, 4430)` |
| Route to Crossroads | `crossroads-road-breadcrumb` | `(2120, 4440)` |

This path is deterministic by saved player position and HUD-state confirmation.
The app does not currently expose a dedicated camera-freeze or teleport debug
API, so the report should mention that screenshots are captured from preview via
save fixtures rather than a bespoke screenshot subsystem.

## Report Design

The report should embed each screenshot and answer the five HPA-115 review
questions for that view:

- What is the main anchor?
- What are the available exits?
- What is the optional detour?
- What object has no purpose?
- Does this still feel like a hedge grid?

Each section should be concrete enough that a reviewer can understand the
village from the report alone. If a view has no optional detour or no purposeless
object, say so directly rather than leaving the answer implicit.

The report should end with acceptance-criteria status and a validation-command
log. If any screenshot still looks visually messy, record the specific follow-up
patch with location, symptom, and likely owning map element.

## Validation

Run the commands listed in HPA-115 with the repository's `rtk` prefix:

```sh
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps/regions/soft-maze.test.ts
rtk bun run test:unit -- --run src/lib/game/content/maps.test.ts
rtk bun run test:unit -- --run
rtk bun run check
rtk bun run lint
rtk bun run test:e2e
```

Also run `rtk git diff --stat` and `rtk git status --short --branch` so the
final report can distinguish committed artifacts from runtime source changes.
