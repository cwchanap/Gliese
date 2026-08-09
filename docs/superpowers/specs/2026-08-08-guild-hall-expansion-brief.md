# HPA-400 Guild Hall Expansion Brief

Linear: HPA-400

Classification: `revision`

## Decision

Expand the existing `guild-hall` direct `WorldMapDefinition` from a 16×12 decorated room into a 24×18 connected headquarters with readable functional zones. Keep the implementation in `src/lib/game/content/maps.ts`, reuse the existing interior prop sheet and runtime renderer, and add no interior compiler, room graph, background package, or new authoring abstraction.

The only shared runtime behavior gap justified by the current code audit is save-position normalization for `interiorProps` collision. `WorldScene` already treats those props as movement collision, but save normalization currently considers blockers, fences, map decor, and landmarks only. The old Guild Hall spawn `{ x: 256, y: 288 }` would land inside the planned common-table collision, so the generic normalization fix is materially required rather than decorative compatibility work.

The implementation should also centralize the existing NPC collision/interaction radii in `core/collision.ts`. That changes no behavior; it prevents map tests from restating private `WorldScene` numbers while validating the same movement/interaction contract.

## Player-facing outcome

The Guild Hall should feel like the village headquarters rather than a decorated rectangle. From one entrance, the player can immediately read and reach:

- a reception / quest area;
- a common or meeting area;
- Guild Master Arlen's office/alcove;
- Quartermaster Vale's gear counter with a comfortable customer approach;
- a records/training area that reinforces the Guild's ruins-facing role.

The building remains one connected map. The zones are created through scale, furniture placement, floor dressing, and circulation space rather than hard internal walls.

## Story basis

Use only the current repository story behavior for this slice.

- `prologue.guild-master` is on `guild-hall`; Guild Master Arlen briefs Liam on the eastern ruins, offers Guild work, and says new work remains available at the counter.
- `prologue.guild-quartermaster` is on `guild-hall`; Quartermaster Vale supplies Guild-approved field gear for ruins assignments through shop `guild-quartermaster`.

The spatial design should reinforce those existing functions. HPA-400 does not add dialogue, quests, lore, or new story beats.

## Existing content affected

Preserve these runtime identities and semantics:

- map: `guild-hall`;
- NPC: `guild-master` with dialogue `guild-master`;
- NPC: `guild-quartermaster` with dialogue `guild-quartermaster` and shop `guild-quartermaster`;
- ambient NPCs: `guild-hall-member-west`, `guild-hall-member-east`;
- outbound transition: `guild-hall-to-meadow`;
- inbound transition: `meadow-to-guild-hall`;
- exterior return arrival: `{ x: 1656, y: 5040, facing: 'down' }`;
- current quest/dialogue/shop IDs and save schema.

The interior coordinates may change. There is no backward-compatibility requirement for the old 16×12 layout or its prop coordinates. Tests that exercise Guild Hall behavior must follow the new coordinates rather than accidentally treating the old NPC positions as part of the identity contract.

## Current source audit

The current implementation already has the pieces needed for the player-facing result:

- interiors are direct `WorldMapDefinition` literals in `src/lib/game/content/maps.ts`;
- `WorldMapDefinition` supports dimensions, spawn, transitions, NPCs, `interiorProps`, ambient NPCs, and optional backgrounds;
- `interiorProps` already support floor/furniture/foreground depth and per-prop collision;
- non-opening maps automatically receive the current interior/ruins floor plus an outer stone border from `WorldScene`;
- the existing interior prop sheet includes tables, benches, bookshelves, a shop counter, notice board, rug, crates, barrels, shelves, papers, weapon racks, lamps, and plants;
- the village-side `meadow-to-guild-hall` transition is owned by `src/lib/game/content/maps/regions/village-layered.ts`;
- interactive `map.npcs` participate in movement collision, while `ambientNpcs` are presentation-only sprites and do not participate in movement collision;
- `maps.test.ts` already has a route-clearance helper and a generic transition-arrival loop; HPA-400 should strengthen those instead of adding Guild-Hall-only equivalents;
- the exhaustive Meadow Entry transition snapshot pins the Guild Hall inbound arrival and must move with the seam;
- the existing explicit arrival test does not currently pin Guild Hall, so HPA-400 should extend it with a generic interior-arrival-equals-spawn invariant rather than inventing another one-map literal;
- existing `maps.test.ts`, `scenes.test.ts`, and the Guild quest E2E fixture contain old Guild Hall coordinate assumptions that must move with the layout.

No missing representation requires `LayeredInteriorSource`, a compiler, a room graph, or a new renderer.

## Approaches considered

### A. Larger direct map with strongly readable connected zones — selected

Keep one direct map and use existing props/collision to shape circulation. This is the smallest change, matches the HPA-495 authoring guidance, and produces a useful pattern HPA-414 can copy.

### B. Direct map plus a new interior partition/wall contract — deferred

This could make literal separate rooms more obvious, but HPA-400 does not require hard rooms. Adding a wall type, doorway semantics, renderer changes, and related tests before a real layout needs them would be speculative.

### C. Generic layered interior source/compiler — rejected

This recreates the architecture explicitly removed from the roadmap. It increases authoring surface before any completed migration has demonstrated a repeated need.

## Spatial design

Use a 24×18 map, or 768×576 px at the existing 32 px tile scale.

The circulation model is intentionally simple:

```text
                 NORTH

  Guild Master       Records / Training       Quartermaster
  office/alcove          reference area         gear counter
        \                    |                    /
         \                   |                   /
          +---------- Common / Meeting --------+
                           |
                    Reception / Quest
                           |
                        Entrance

                 SOUTH
```

### Entrance and main circulation

Move the Guild Hall's interior door to the bottom-center of the larger map:

- outbound transition anchor: `{ x: 384, y: 528 }`;
- spawn / inbound arrival: `{ x: 384, y: 480, facing: 'up' }`.

Keep a central circulation spine around `x = 384` readable from the entrance into the building. The implementation plan publishes a concrete route that branches at `y = 384`, west via `x = 192`, and east via `x = 560`. The route test must use the runtime collision contract for bounds, blockers, collidable interior furniture, and interactive NPC bodies rather than checking furniture alone.

The exterior Guild Hall door, building footprint, and exterior return arrival do not need to move. Only the village transition's interior arrival changes to the new spawn.

### Reception / quest area

Use the southern third as the first readable Guild function. Reuse the notice board, one or two benches, and an ambient member. Leave the entrance and central path visibly open. The west ambient member is presentation-only but must still be visually clear of furniture; the implementation baseline places it at `{ x: 128, y: 416 }`, away from the notice-board sprite and common-area props.

### Common / meeting area

Place a rug, table, and seating off the central spine. A floor-depth rug may intentionally share the table's anchor because it is visual dressing beneath the table. Collidable furniture must remain outside the published circulation corridors.

### Guild Master office / alcove

Place `guild-master` in the northwest side with records/bookshelf dressing. Use `{ x: 208, y: 176 }` as the planned player approach point for the baseline NPC position `{ x: 176, y: 176 }`.

### Records / training area

Use the north-center band for papers/bookshelves and a weapon-rack/training cue. This is environmental identity, not a new interaction system.

### Quartermaster counter

Place `guild-quartermaster` in the northeast/east side. Use the existing `shopCounter`, weapon rack/crates, or equivalent existing props while deliberately leaving a customer approach gap. Use `{ x: 560, y: 176 }` as the planned approach point for the baseline NPC position `{ x: 592, y: 176 }`.

For both main NPCs, the planned approach separation is 32 px. With the shared runtime constants, NPC-pack body collision is `PLAYER_COLLISION_RADIUS + NPC_PACK_COLLISION_RADIUS = 29` px and interaction range is `PLAYER_COLLISION_RADIUS + NPC_INTERACTION_RADIUS = 48` px. Tests should enforce both sides of that interval rather than a one-sided magic-number budget.

The Quartermaster anchor intentionally meets the west edge of the counter visual so Vale reads as stationed at the counter; the counter collision is offset east so the NPC anchor and west-side customer approach remain playable.

## Transition and save behavior

The exterior-to-interior transition in `village-layered.ts` must arrive at the new Guild Hall spawn. The interior-to-exterior transition keeps the same ID and exterior arrival.

Do not add a Guild-Hall-only assertion for that relation. Extend the existing map tests so every village-interior inbound arrival equals that target interior's `spawn` + `spawnDirection`, and every transition arrival is checked against collidable interior props. HPA-414 then inherits the same contract automatically.

Do not bump the save version and do not create an old-layout migration table. Make existing generic position normalization also consider collidable `interiorProps` when deciding whether a loaded position should be moved to a nearby walkable tile. This mirrors the existing treatment of escape-aware landmark collision: even when movement outward would be possible, loading embedded in an opaque object is a bad saved position.

## Ownership

- `maps.ts` owns Guild Hall dimensions, props, NPC placement, collision, spawn, and outbound transition.
- `village-layered.ts` owns the village-side transition and its arrival into the Guild Hall.
- `core/collision.ts` owns shared player/NPC body and interaction radius constants.
- `save-state.ts` owns generic loaded-position normalization and the inclusive collision predicate reused by tests.
- `maps.test.ts` owns reusable map-route and transition-arrival invariants.
- `scenes.test.ts` owns scene-level Guild NPC rendering, collision, interaction, shop, and quest-flow expectations.
- `tests/e2e/game.e2e.ts` owns the browser fixture that must start from a valid near-Guild-Master position after the layout moves.
- NPCs, dialogue, shop state, quest state, transitions, and collision remain live runtime data.
- Existing prop sprites remain live rendered furniture.
- No Guild Hall base/foreground background is added in this slice, so regional-background fallback ownership is not part of HPA-400 acceptance.

## Reuse and genuinely new work

Reuse:

- direct `WorldMapDefinition` authoring;
- existing `interiorPropAsset` frames;
- current `WorldScene` interior prop renderer and collision behavior;
- current village layered transition source;
- existing map route helper and transition-arrival loop;
- existing `isInsideCollisionRect(...)` predicate;
- existing map, scene, E2E, and save-state tests.

Genuinely new work:

1. the larger Guild Hall content layout;
2. the updated interior arrival for `meadow-to-guild-hall`;
3. a small save-normalization correction so collidable interior props participate in loaded-position rescue;
4. central ownership for the already-existing NPC collision/interaction radii so tests and runtime share one contract;
5. updates to existing Guild Hall coordinate fixtures so they continue testing behavior against the new layout rather than the removed 16×12 coordinates.

No new art is required by the design. If the existing prop set is visually imperfect, accept that for this vertical slice rather than manufacturing an asset pipeline requirement. A later concrete art deficiency can use `2d-game-asset-workflow`.

## HPA-495 field validation

The current `gliese-world-expansion` guidance correctly routes HPA-400 to the direct map source and explicitly says not to pre-build an interior compiler or room graph. No skill change is justified by planning alone.

During implementation, update HPA-495 only if the real consumer work exposes a reusable instruction gap that caused a wrong source choice or unnecessary work. The save-normalization code fix and test-helper reuse are runtime/test correctness, not evidence that another skill or workflow layer is needed.

## Non-goals

- No new questline, dialogue rewrite, economy change, or story beat.
- No `LayeredInteriorSource`, interior compiler, room graph, door graph, or generic interior framework.
- No `gliese-interior-designer` skill.
- No new Guild Hall background package or mandatory new pixel art.
- No Meadow Entry crop/provenance/approval machinery for an interior.
- No compatibility path for old 16×12 coordinates.
- No collision semantics for ambient NPCs; keep their current presentation-only behavior.
- No migration of Hero House, Item Shop, Shrine, or villager houses; HPA-414 owns them.
- No exterior village redesign unless implementation reveals an actual round-trip defect.

## Automated acceptance

Focused tests should prove:

- `guild-hall` is 24×18 with the new bottom-center entry/spawn;
- the six unmoved village interiors remain 16×12 rather than keeping Guild Hall inside a blanket compact-interior assertion;
- the exhaustive Meadow Entry transition snapshot contains the new Guild Hall arrival;
- every village-interior inbound arrival equals that target interior's spawn and direction;
- every transition arrival is inside its target and clear of collidable interior furniture;
- the existing route helper becomes one runtime-aware polyline assertion covering map bounds, blockers, collidable interior props, and interactive NPC bodies;
- representative Guild Hall routes reach reception, Guild Master, records/training, Quartermaster, and the exit using that shared helper;
- `guild-master` and `guild-quartermaster` keep their IDs, dialogue/shop semantics, role, and frame while intentionally changing x/y;
- each main-NPC approach point is outside NPC body collision and inside the actual interaction radius using shared constants;
- scene-level Guild NPC rendering, NPC-body collision tests, dialogue/quest interaction tests, and shop tests use the new positions or explicit approach points;
- the Guild quest E2E fixture starts near the new Guild Master position and still opens the quest flow;
- the existing shop registry resolves `guild-quartermaster`;
- a serialized save located inside a collidable Guild Hall prop is normalized to a walkable position on load;
- existing village-interior registration/bounds tests continue to pass.

Because this design deliberately adds no backgrounds or renderer behavior, do not create a synthetic missing-background test for HPA-400.

## Acceptance walkthrough

Use this shortest controller route:

1. enter the Guild Hall from Sundrop Village and verify arrival at the bottom-center entrance;
2. inspect the reception/quest area;
3. walk through the common area to Guild Master Arlen and complete/open the existing dialogue/quest interaction;
4. visit the records/training area;
5. approach Quartermaster Vale, open the existing shop, and close it normally;
6. return through the same entrance to the unchanged village exterior arrival;
7. save at a representative interior position, reload, and confirm the player remains in a valid walkable position;
8. repeat the happy-path walkthrough in one normal web run and one packaged Tauri run.

The vertical slice is accepted when the Guild Hall reads as an explorable headquarters, all existing behavior survives, the round trip is clean, and no speculative framework was introduced.