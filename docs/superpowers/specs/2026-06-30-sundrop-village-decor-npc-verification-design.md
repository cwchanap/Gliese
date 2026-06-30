# Sundrop Village Decor And NPC Verification Design

## Summary

HPA-110 asks to simplify Sundrop Village decor and NPCs into a smaller role-based
set for the six named village spaces. The current checked-out `village.ts`
already contains the requested reduced decor set and the four route-guiding
ambient NPCs, while `village-layout.test.ts` already assigns explicit roles to
every village decor object. This task should be handled as verification rather
than another decor or NPC edit.

Create a standalone report proving the current decor and NPC layout satisfies
HPA-110 before moving to the next HPA-105 child task.

## Scope

Create `docs/superpowers/reports/2026-06-30-sundrop-village-decor-npc-verification.md`.

Review `src/lib/game/content/maps/regions/village.ts`, the existing
`src/lib/game/content/maps/regions/village-layout.test.ts`, and the map-level
ambient NPC validation in `src/lib/game/content/maps.test.ts`.

Do not change gameplay content, decor ids, decor coordinates, decor dimensions,
NPC ids, NPC coordinates, frame names, transitions, blockers, ground patches,
tests, systems, assets, or Svelte files.

## Report Content

The report will include three evidence sections:

- a table of the 17 HPA-110 role-based decor objects, showing the current
  `village.ts` id and assigned room role from `village-layout.test.ts`
- a table of the four route-guiding ambient NPCs requested by HPA-110, showing
  the current `village.ts` id, position, frame, and route meaning
- a test-coverage note showing that every `village-*` decor object must have an
  assigned role, ambient NPCs must use valid frames and stay in bounds, and
  ambient NPCs must remain reachable from spawn

Every evidence row should match the current source. If an extra village decor
object without a role or an unexpected ambient NPC appears during implementation,
stop and treat that as a blocker instead of editing content under this
verification task.

The report will also state:

- the well/plaza remains the main visual anchor
- market, shrine, and gate each have distinct motifs
- route-guiding NPCs are already placed near the well plaza, market/blacksmith
  side, shrine garden, and east gate
- no layout/content files were modified
- HPA-111 can proceed from this verified reduced decor/NPC baseline

## Verification

Run:

```sh
bun run test:unit -- --run src/lib/game/content/maps/regions/village-layout.test.ts src/lib/game/content/maps.test.ts
```

Also inspect `git diff` to confirm the implementation is report-only.

No full gameplay or e2e test is required unless a non-report file changes, which
is outside this design.
