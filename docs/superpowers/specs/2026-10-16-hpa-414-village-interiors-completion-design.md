# HPA-414 Village Interiors Completion Design

## Problem

HPA-414 was written when Hero House, Item Shop, Shrine of Aurora, and Villager Houses 1-3 were still compact one-room interiors. Its intended outcome remains valid: those six maps should be distinct, explorable direct maps that preserve their existing gameplay semantics and provide a second real field validation of `gliese-world-expansion`.

The implementation premise is no longer current. HPA-586 and the follow-on painted-interior work already re-authored these maps around coordinate-first multi-zone layouts, generated navigation, direct `WorldMapDefinition` content, and production painted packages. Later work also completed Villager House 3, the Shrine, and an eighth Blacksmith interior.

Re-running the original two migration batches would duplicate shipped work and risk regressing the newer V2 geometry.

## Decision

Treat HPA-414 as a **completion and acceptance slice**, not another interior migration.

The HPA-414 PR will:

1. preserve the current V2 layouts and painted packages as the implementation baseline;
2. prove the six originally named interiors against HPA-414's player-facing and semantic acceptance criteria;
3. fix only concrete gaps found by that acceptance pass;
4. record the result as HPA-495's second real interior field-validation outcome;
5. close HPA-414 and, if all other children remain complete, allow HPA-397 to close.

Do not manufacture retroactive Batch 1 / Batch 2 migration code or duplicate the newer HPA-586 / painted-interior design documents. The two original batches remain useful only as an acceptance grouping.

## Current baseline to preserve

The current repository already owns the relevant behavior through existing sources:

- `src/lib/game/content/maps/layouts/village-interiors-v2.ts` owns room, corridor, wall, door, spawn, exit, NPC approach, prop-zone, and prop-collision geometry;
- `src/lib/game/content/maps.ts` owns the direct map definitions and live fallback content;
- `src/lib/game/content/maps/layouts/meadow-entry-v2.ts` plus `src/lib/game/content/maps/regions/village.ts` own the exterior/interior round-trip seam;
- `src/lib/game/content/backgrounds/village-interior-navigation-sources.ts` and the generated navigation grid own pathing inputs;
- `src/lib/game/content/backgrounds/village-interior-packages.ts`, manifests, and `map-background-registry.ts` own painted production presentation and atomic fallback;
- existing dialogue, shop, story, save, and scene code remain authoritative for functional semantics.

There is no reason to add an interior compiler, room graph, generic building framework, compatibility layer, or second map source.

## Acceptance groups

### Group A — original HPA-414 Batch 1

#### Hero House

Keep the current bedroom, study, living/kitchen, and hall program. Prove that the player can enter from Meadow Entry, traverse the meaningful zones, exit to the authored exterior return, and save/reload without losing a valid position or home-state behavior.

#### Item Shop

Keep the current sales floor, stockroom/office, service circulation, and entrance program. Prove that Mira remains reachable, the existing shop opens with the existing inventory/state rules, and round-trip plus save/reload behavior remains valid.

#### Shrine of Aurora

Keep the current larger ceremonial layout and painted package. Prove the entrance-to-nave/sanctum route and both side areas remain reachable, the existing shrine/story/respawn semantics are unchanged, and the exterior return plus save/reload behavior is valid.

This group is the HPA-495 field-validation sample because it spans residential, commercial, and ceremonial/story-loaded interiors without requiring a new authoring abstraction.

### Group B — original HPA-414 Batch 2

#### Villager House 1

Preserve its larger residence program and existing NPC/story identities. Validate circulation, interaction approaches, exterior round trip, and save/reload.

#### Villager House 2

Preserve its distinct workshop/residential program rather than normalizing it into House 1. Validate the same runtime contracts without cloning House 1 geometry or furnishing logic.

#### Villager House 3

Preserve the scholar/traveler archive-study identity, current Io interaction/story contract, painted package, exterior round trip, and save/reload behavior.

The three houses must remain visibly and spatially distinct. Shared runtime helpers are acceptable; shared copy-pasted layouts are not.

## Validation strategy

Prefer the tests and tools already created by HPA-586 and the painted-interior work. HPA-414 should not add a second acceptance harness just to carry its issue number.

The implementation pass should first run the existing structural, navigation, package, asset, scene, story/shop, save, and browser journeys. Add or change a test only when an original HPA-414 invariant is not already covered or a real regression is found.

The minimum durable contracts are:

- all six map IDs remain registered direct maps;
- each map's inbound Meadow arrival follows its current interior spawn contract and each exit returns to its authored exterior arrival;
- named functional zones and interaction approaches remain navigation-reachable without collision traps;
- Hero House home behavior, Item Shop merchant/stock behavior, Shrine story/respawn behavior, and House 3 Io behavior remain live;
- saves on each interior normalize to a valid playable point and reload successfully;
- each map has one production painted package with a valid atomic fallback path;
- the three villager houses remain distinct layouts;
- controller walkthroughs cover both web and packaged Tauri for the six-map route.

## HPA-495 field-validation result

If the existing authoring/validation guidance routes the completion pass to the correct sources and commands without ambiguity, HPA-414 records **no skill change required**.

Only edit `.agents/skills/gliese-world-expansion/` when the real pass exposes a reusable guidance defect. Do not change the skill merely to mention HPA-414 or to codify a one-off interior detail.

## Art boundary

No new art generation is planned in HPA-414. Existing painted packages are the baseline.

If acceptance uncovers a visual defect that genuinely requires new generated art rather than wiring/collision/layout correction, keep that art production out of this implementation slice and track it as a separate art task. HPA-414 may consume approved replacement art later, but should not mix new art generation into the code/acceptance work.

## Non-goals

- redoing HPA-586 coordinate design;
- recreating the original one-room-to-multi-room migration sequence;
- changing map IDs, NPC IDs, shop IDs, dialogue IDs, story beats, or save schema without a demonstrated defect;
- adding quests, economy, crafting, new dialogue, shrine underground content, or additional buildings;
- creating a generic interior framework or compatibility layer;
- creating a second navigation, painted-package, or acceptance system;
- changing the eight-interior Blacksmith work except where a shared regression is proven to affect an HPA-414 map.

## Delivery shape

Use one PR for HPA-414. This initial draft contains the design and implementation plan; after plan review, implementation continues on the same branch and PR.

A successful implementation may be deliberately small. If the existing code and tests already satisfy an acceptance item, the task is to prove it, not rewrite it.
