# Expansion Brief: Complete Eight Village Interiors

## Player-facing outcome

Sundrop Village has eight enterable, visually distinct interiors. Villager House 3 and the Shrine
of Aurora receive their planned coordinate-first redesigns and painted backgrounds. The existing
Blacksmith exterior becomes a functional destination with a dedicated workshop interior, a named
live smith, and an equipment shop.

This delivery closes the current mismatch where five interiors are painted, Villager House 3 and
the Shrine remain graybox, and the Blacksmith door has no transition.

## Classification

- Villager House 3 and Shrine of Aurora: `revision` of existing direct-map interiors.
- Blacksmith: `new-content` implemented through the existing direct-map and village-interior
  package pipelines.
- Painted package wiring after layout and art approval: `frozen-integration`.

## Story basis

The Blacksmith is a practical village service, not a new quest line. `blacksmith-oren` is a named
merchant whose short dialogue opens `sundrop-forge`. The story package gains only the map/NPC/shop
references and the minimal merchant beat required by the existing dialogue runtime.

Oren sells one finite copy each of the existing `training-sword`, `iron-cap`, `grip-wraps`, and
`traveler-vest`. No new equipment, crafting system, upgrade mechanic, quest, reward, or progression
gate is introduced.

Villager Io and the existing Shrine story contracts remain unchanged.

## Existing content affected

The following IDs and behavior remain valid:

- maps: `meadow-entry`, `hero-house`, `guild-hall`, `item-shop`, `villager-house-1`,
  `villager-house-2`, `villager-house-3`, `shrine-of-aurora-interior`, `ruins-threshold`, and
  `ruins-core`;
- exterior landmarks: `blacksmith`, `villager-house-3-exterior`, and `shrine-of-aurora`;
- NPCs: `villager-io` and every currently registered village/interior NPC;
- shops: `miras-item-shop` and `guild-quartermaster`;
- exterior lots, footprints, doors, approach corridors, and return arrivals for existing
  destinations;
- all quest, encounter, pickup, discovery, and reward state.

New stable IDs are:

- map: `blacksmith-interior`;
- transitions: `meadow-to-blacksmith` and `blacksmith-to-meadow`;
- NPC/dialogue: `blacksmith-oren`;
- shop: `sundrop-forge`;
- painted package: `blacksmith-interior-painted`.

## Spatial design

### Blacksmith

The interior is `896x704` pixels. A centered south entrance opens into a public showroom. A clear
96px primary route runs from the entrance to Oren's customer approach at the service counter.
Secondary routes remain at least 64px wide and connect these functional zones:

- west forge and anvil floor;
- central counter and Oren work position;
- east weapon and armor display;
- rear coal, material, and finished-stock storage;
- south showroom and entrance aisle.

The hot forge, anvil, counter, racks, and storage receive live collision aligned to their painted
silhouettes. Oren remains outside collision with a reachable interaction approach. The exit returns
the player to the existing Blacksmith exterior approach in Sundrop.

### Villager House 3

The redesigned scholar/traveler home is `1024x704` pixels. The archive and study occupy the west,
the bedroom and travel storage occupy the east, and the sitting room plus entrance hall occupy the
south. A 96px primary entrance/reading route and 64px private/archive routes keep Io, the reading
table, archive shelves, bedroom, sitting area, and neighbor activity anchor reachable.

### Shrine of Aurora

The redesigned Shrine is `1024x896` pixels and may scroll lightly under the existing camera. A
96px central processional route connects the south entrance, nave, altar approach, and northern
luminous focal area. At least 64px side circulation reaches the west preparation alcove and east
archive. Benches, altar, archive, and preparation fixtures remain visually clear without creating
inaccessible decorative pockets.

## Ownership

- Layout definitions, direct map literals, generated navigation grids, collisions, transitions,
  actors, dialogue, shop state, and save state remain live and authoritative.
- Rich floors, walls, furniture, forge equipment, shelving, devotional details, lighting, soot,
  textiles, books, travel storage, and small clutter may be baked into opaque base images.
- Legacy interior props remain `fallback-only` visual owners and return atomically if any required
  painted texture is unavailable.
- Foreground images are omitted by default. They are added only when runtime review proves a real
  occluder needs depth; decorative overlays are not added.
- Art must follow approved geometry. Collision is never moved to accommodate an accidental image
  silhouette.

## Runtime and save flow

`SUNDROP_VILLAGE_V2_BUILDINGS.blacksmith` gains the new map and transition IDs while retaining its
current lot, footprint, door, approach, and landmark identity. The village transition composer then
creates the Blacksmith entrance through the same path used by the seven existing interiors.

`blacksmith-interior` joins the existing map registry, complete-world inventory, interior layout
registry, navigation source generator, background manifest/package registry, default production
selection, proof renderer, and art validator. No Blacksmith-specific runtime branch is introduced.

Adding finite forge stock changes the persisted shop-stock shape. The save schema advances from v8
to v9. The v8-to-v9 migration copies all existing save state and shop quantities, adds only the
default `sundrop-forge` stock when absent, and preserves the current map and player position. The
storage key advances to `gliese.save.v9` with `gliese.save.v8` as its migration fallback.

## Reuse and genuinely new work

Reuse:

- `VILLAGE_INTERIOR_LAYOUTS` and direct maps in `src/lib/game/content/maps.ts`;
- village transition composition from `SUNDROP_VILLAGE_V2_BUILDINGS`;
- 16px navigation generation and freshness checks;
- `buildVillageInteriorPackage`, generic map-background registry/default selection, atomic
  fallback, art validator, and complete-world proof renderer;
- existing shop, dialogue, localization, story, inventory, and save-migration patterns;
- the current `woodcutterNpc` live frame for Oren so no new actor sheet is required;
- the approved House 3 and Shrine functional programs in the painted-interiors plan.

Genuinely new work is limited to one direct interior data entry, one named merchant and shop, one
story beat, one save migration, three coordinate slices that must pass layout approval, and three
painted packages. No new authoring framework or gameplay subsystem is created.

## Error and fallback behavior

- An unknown or malformed Blacksmith map/save payload follows the existing invalid-save handling.
- A missing required painted texture selects the full legacy graybox presentation for that map;
  partial painted composition is forbidden.
- Invalid or exhausted forge stock uses the existing shop failure states.
- The v8 migration validates the exact legacy finite-stock shape before adding the forge defaults;
  malformed existing shop state is rejected rather than silently reset.

## Non-goals

- crafting, tempering, repair, item upgrades, recipes, or resource gathering;
- new equipment definitions or item icons;
- Blacksmith quests, combat, rewards, or progression locks;
- changing existing exterior geometry or the Meadow camera;
- redesigning the five already approved painted interiors;
- decorative foreground overlays without a demonstrated occlusion need;
- merging or pushing the implementation without separate authorization.

## Acceptance walkthrough

1. Start from a valid v8 save and load it as v9 with existing inventory, equipment, shop purchases,
   quests, map exploration, and position preserved.
2. Enter Villager House 3 from Meadow, reach Io and every functional zone, exit, re-enter, save,
   reload, and repeat once with its required image unavailable to prove full fallback.
3. Enter the Shrine, walk the nave to the altar/focal area and both side rooms, exit, re-enter,
   save, reload, and prove full fallback.
4. Walk to the existing Blacksmith door, enter `blacksmith-interior`, reach Oren and every workshop
   zone, open `sundrop-forge`, buy one available equipment item, verify stock and wallet persistence,
   exit to the authored exterior approach, re-enter, save, and reload.
5. Block the Blacksmith base image and repeat the critical route and Oren interaction in the atomic
   graybox fallback.
6. Run the data-driven all-eight regression and confirm every painted package/default is registered
   exactly once with current manifest/image/navigation parity.

## Verification

The completion gate includes focused layout/map/navigation/package/asset/shop/dialogue/story/save
unit tests, current navigation and art-validator checks, proof renders for all three maps, targeted
painted and fallback browser tests, the all-eight browser walkthrough, type checking, linting, build,
and final aggregate suites. Runtime screenshots must show current-camera painted and fallback views;
source assertions alone are insufficient.
