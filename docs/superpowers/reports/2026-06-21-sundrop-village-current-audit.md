# Sundrop Village Current Audit

## Summary

HPA-106 audits the current checked-out Sundrop Village state before later HPA-105 relayout tasks make any more changes. This branch is already ahead of the original HPA-105 problem statement: the village now uses a deterministic six-space layout, side-pocket rewards, room/lane ground patch names, and place-named boundaries instead of the older ring/spoke hedge grid.

No gameplay or layout data changes are part of this audit.

## Current Target Spaces

The current village reads as the intended six-space structure:

- **Home Yard**: player origin and safety pocket around Hero House.
- **Well Plaza**: central navigation anchor around `sundrop-well` and plaza decor.
- **Market Yard**: west detour for Item Shop, Blacksmith, market stall, and market cache.
- **North Residences**: north/east residence row and Guild Hall approach.
- **Shrine Garden**: southeast optional pocket with shrine decor and shrine cache.
- **East Gate**: northeast exit threshold toward the Crossroads dogleg.

## Keep

- Keep the compact southwest village footprint.
- Keep the spawn near Hero House at the south side of the village.
- Keep the well/plaza center as the main navigation anchor.
- Keep Item Shop and Blacksmith west of the plaza as a market-side detour.
- Keep residences and Guild Hall north/east of the plaza.
- Keep Shrine Garden southeast of the plaza as an optional spiritual pocket.
- Keep East Gate as the exit toward Crossroads.
- Keep `village-market-cache` and `village-shrine-cache` as side-pocket rewards.
- Keep place-named boundaries such as `village-home-yard-*`, `village-plaza-*`, `village-market-*`, `village-north-*`, `village-east-*`, and `village-shrine-*`.

## Already Removed Or Replaced

- The old `vp-*`, `vn-*`, `vw-*`, `ve-*`, and `vs-*` technical micro-hedge ids are absent from `village.ts`.
- The old ring/spoke ground-patch ids are absent from `village.ts`.
- The main-corridor reward has already been replaced by market and shrine side-pocket rewards.
- Village decor now has explicit room roles guarded by `src/lib/game/content/maps/regions/village-layout.test.ts`.

## Remaining Visual Risks

- The preserved `corridor-wall-*` dogleg is still dense. Keep it only as the load-bearing village-to-crossroads route; do not treat it as a model for the village interior.
- Later relayout work should avoid recreating hedge-grid clutter under new place names.
- Screenshots should continue to read as `Home Yard -> Well Plaza -> side spaces -> East Gate` without requiring test knowledge.
- New decor should have a clear room role before it is added.
- New rewards should stay in side pockets rather than on the main route.

## Stale Comment Review

`src/lib/game/content/maps/regions/village.ts` already describes the village as a deterministic six-space layout. The comments no longer describe a temporarily open village or require HPA-106 cleanup.

The `corridor-wall-*` comment is intentionally preserved because it explains why those remaining technical-looking ids are load-bearing for the route from the village gate to Crossroads.

## Source Evidence

- `src/lib/game/content/maps/regions/village.ts` owns the current village region.
- `src/lib/game/content/maps/regions/village-layout.test.ts` locks the six named spaces, side reward placement, visible route boundaries, and village decor roles.
- Linear issue `HPA-106` asks for a current audit, no gameplay/content layout changes, and stale comment cleanup only if needed.

## Follow-Up Use

Later HPA-105 child tasks should cite this audit when deciding whether to preserve, remove, or rename village elements. The guiding rule is: keep the six-space readable village, avoid resurrecting the hedge-grid, and only preserve dense corridor geometry where it is load-bearing for the Crossroads route.
