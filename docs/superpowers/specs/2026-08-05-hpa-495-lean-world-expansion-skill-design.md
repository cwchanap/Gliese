# HPA-495 Lean Gliese World Expansion Skill Design

**Status:** Revised after source-routing review; ready for final design review  
**Linear:** HPA-495  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-05

## 1. Purpose

Future Gliese content expansion is a first-class project goal. The repository should contain one practical agent skill that helps an agent turn story intent into playable maps and content without rediscovering repository-specific authoring sources, ownership boundaries, commands, and adjacent skills.

The V1 entry point is:

```text
.agents/skills/gliese-world-expansion/
```

It uses one short Markdown Expansion Brief and two focused references. It is not a workflow platform, packet database, story-integration system, or suite of specialist skills.

The governing boundary is:

```text
The skill classifies, routes, and guides.
Repository sources and tools remain authoritative.
```

## 2. Chosen scope

V1 deliberately keeps:

- one skill;
- one short Markdown brief template;
- explicit non-invocation for story-only, placement-only, asset-only, and frozen-integration work;
- source-level routing for the current map authoring patterns;
- story and art handoffs;
- collision/live/baked ownership;
- focused commands and one controller walkthrough;
- real refinement through HPA-406, HPA-400, and HPA-414 Batch 1.

V1 deliberately excludes:

- a three-skill suite;
- YAML Area Expansion Packets or packet databases;
- seven recorded gates or an approval workflow;
- a Story Integration Catalog, story fingerprint, or stale-consumer protocol;
- an LLM judge or synthetic scenario corpus;
- a generic map-art package lifecycle for maps that do not have one;
- a new interior compiler or `LayeredInteriorSource`;
- a documentation dashboard, status database, or evidence tree.

## 3. Verified repository routing

All current map authoring patterns converge on `WorldMapDefinition`, but they start from three different source locations. The skill must route by **where the content is authored**, not by whether the space is called an interior, region, settlement, or dungeon.

### 3.1 Direct `WorldMapDefinition` literals

Use for current interiors and large hand-authored maps such as the ruins:

```text
src/lib/game/content/maps.ts
src/lib/game/content/maps/types.ts
```

Examples include:

- `heroHouseMap`;
- `guildHallMap`;
- `itemShopMap`;
- `ruinsThresholdMap`;
- `ruinsCoreMap`.

Interiors and ruins differ in scale and fields used, but not in authoring location or final source shape. Start from the closest existing direct map and extend `WorldMapDefinition` in place.

Do not add an interior compiler, room-graph engine, or dungeon framework until repeated completed maps expose the same concrete defect.

### 3.2 Hand-authored `RegionFragment` composition — default Meadow Entry pattern

Five destination regions and shared paths are hand-authored `RegionFragment` objects:

```text
src/lib/game/content/maps/regions/crossroads.ts
src/lib/game/content/maps/regions/coast.ts
src/lib/game/content/maps/regions/mistfen.ts
src/lib/game/content/maps/regions/silverpine.ts
src/lib/game/content/maps/regions/wildwood.ts
src/lib/game/content/maps/regions/paths.ts
src/lib/game/content/maps/regions/types.ts
```

They are registered and composed through:

```text
src/lib/game/content/maps/meadow-entry.ts
mergeRegions(...)
```

This is the default starting pattern for a new Meadow Entry region or connector unless a demonstrated requirement needs tile-level layered authoring.

A new fragment is not active merely because its file exists. It must be imported and included in `mergeRegions(...)`, and its IDs must remain unique across composed fields.

### 3.3 Layered source plus compiler — village-specific pattern

Only Sundrop Village currently uses the layered compiler:

```text
src/lib/game/content/maps/regions/village-layered.ts
src/lib/game/content/maps/layered/types.ts
src/lib/game/content/maps/layered/compile-layered-region.ts
src/lib/game/content/maps/regions/village.ts
```

The owning authoring source is `village-layered.ts`. `village.ts` is the thin compilation/background wrapper.

Use this pattern when editing the existing village or when a future real delivery proves that tile-level layered control is worth its larger declaration surface. Do not route a normal new region into the layered compiler by default.

### 3.4 Background and gameplay ownership

Current contracts live in:

```text
src/lib/game/content/maps/types.ts
src/lib/game/content/maps/background-ownership.ts
```

The skill must preserve these rules:

- collision remains authoritative independently of art;
- base and foreground backgrounds are presentation;
- `fallback-only` visuals return when their owning background is unavailable;
- NPCs, transitions, encounters, pickups, rewards, doors, evidence, gates, and other stateful elements remain live;
- art defects are fixed or re-exported rather than moving collision to match an accidental image.

### 3.5 Story and content ownership

Story prose and beat metadata live in:

```text
story/manifest.yaml
story/beats/
```

`gliese-story-writer` remains the story-authoring owner.

Runtime content stays in its current registries:

```text
src/lib/game/content/dialogue.ts
src/lib/game/content/shops.ts
src/lib/game/content/quests.ts
src/lib/game/content/enemies.ts
src/lib/game/content/maps.ts
tools/export-story-content-references.ts
```

Rules:

- `content/dialogue.ts` owns action and intent shells, not prose;
- NPC placement belongs to the owning map;
- shops, quests, enemies, encounters, rewards, and discoveries stay in their existing registries;
- after story or story-referenced content IDs change, run `bun run story:check`;
- unsupported story behavior uses `::: unsupported-hook` or is recorded against the owning subsystem rather than hidden in coordinates or dialogue text.

### 3.6 Art ownership

Meadow Entry controls, masters, exports, and validation remain map-specific HPA-399/HPA-496 work. First-stop commands are:

```sh
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

The current `art:map-package` wrapper supports the exact Meadow Entry capability. It is not a general promise that every map has a package adapter.

Generic props, sprites, sheets, transparency, frame manifests, and Phaser wiring belong to `2d-game-asset-workflow`.

The initial skill PR must make that skill cross-agent:

```text
.agents/skills/2d-game-asset-workflow/
.claude/skills/2d-game-asset-workflow
```

It must correct stale SvelteKit and `static/game/assets/` text to the current Vite/Svelte project and `public/game/assets/` path. Remove the old `.codex` duplicate or replace it with a symlink so there is one authoritative copy.

A new map requesting a reusable art-package lifecycle records the concrete need. It does not clone Meadow Entry’s adapter, crop contract, provenance inventory, or approval machinery by default.

### 3.7 HPA-495 name disambiguation

From this design onward:

- **HPA-495** means `gliese-world-expansion` and its field validation.
- The existing `hpa-495-art-map-package-adapter-v1.md` describes a Meadow Entry compatibility adapter created under an older HPA-495 meaning.
- `art-map-adapters/*`, `tools/art-map-package.ts`, and `bun run art:map-package` remain Meadow Entry-specific until another real implementation exists.

The legacy adapter document is retitled and footered on this design branch. Its remaining file path is historical only and must not be treated as a peer “HPA-495 design.” A later cleanup may rename the file path or remove the compatibility wrapper when HPA-406 confirms no consumer needs it.

### 3.8 Existing skill convention

Canonical project skills live in:

```text
.agents/skills/<skill-name>/
```

Claude discovery uses:

```text
.claude/skills/<skill-name> -> ../../.agents/skills/<skill-name>
```

`CLAUDE.md` must describe the three source patterns accurately and preserve story-only routing to `gliese-story-writer`.

## 4. V1 file layout

```text
.agents/skills/gliese-world-expansion/
├── SKILL.md
├── templates/
│   └── expansion-brief.md
└── references/
    ├── authoring.md
    └── validation.md

.claude/skills/gliese-world-expansion
  -> ../../.agents/skills/gliese-world-expansion
```

Two references are enough for V1. Split them later only when real use makes one independently large, frequently loaded, or error-prone.

### 4.1 `SKILL.md`

Keep `SKILL.md` concise. It owns:

- trigger and non-trigger descriptions;
- request classification;
- the six-step workflow;
- the routing table;
- brief rules;
- story and art handoffs;
- the smallest-playable-slice rule;
- the learn-from-real-gaps rule.

It points to references rather than duplicating path tables.

### 4.2 `authoring.md`

This is the single first-stop path reference. It contains:

- the three source patterns from Section 3;
- `RegionFragment` registration through `mergeRegions(...)`;
- direct-map guidance for interiors and ruins;
- the village-only layered source rule;
- background/collision/live/stateful ownership;
- story and content registry ownership;
- Meadow Entry versus generic 2D art routing;
- clear stopping boundaries for unsupported behavior.

It links paths and commands but does not copy registries, algorithms, crop tables, or full asset inventories.

### 4.3 `validation.md`

It names scope-based commands and acceptance behavior:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
bun run check
bun run lint
bun run build
bun run build:tauri
bun run story:check
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

It covers:

- affected map/content tests;
- scene tests when rendering changes;
- one walkthrough derived from the brief;
- representative save/reload and fallback checks;
- web/Tauri build selection based on scope;
- failure attribution to story, map geometry, runtime, art package, or generic asset ownership;
- no screenshot matrix or evidence system.

## 5. Routing model

Loading the skill for every content edit would create bureaucracy.

| Request | Route |
|---|---|
| Story beat, dialogue prose, or manifest metadata only | `gliese-story-writer`; no Expansion Brief |
| Small bug fix or placement-only move | Edit the owning source and focused tests; no full brief |
| Direct integration of approved geometry and art | Load `gliese-world-expansion`, classify `frozen-integration`, skip design and art production |
| Interior or ruins-style dungeon authored in `maps.ts` | Load the skill for substantial work; use the closest direct `WorldMapDefinition` |
| New Meadow Entry region or connector | Default to a hand-authored `RegionFragment`; register through `mergeRegions(...)` |
| Existing village tile-level change | Edit `village-layered.ts`; compile through the existing wrapper |
| Coordinated NPC, encounter, reward, or story-location expansion | Load the skill; use current registries; hand prose to `gliese-story-writer` |
| Meadow Entry control, crop, master, or export change | Use Meadow Entry-owned commands; load world expansion only when map semantics also change |
| New prop, sprite, or sprite sheet | Use shared `2d-game-asset-workflow` |
| New map asks for a reusable package adapter | Record the need; do not invent another lifecycle before a real implementation exists |
| Unsupported audio, story hook, or runtime behavior | Record the owning gap and stop at that boundary |

Classifications are:

```text
new-content
revision
frozen-integration
story-only
placement-only
asset-only
unsupported
```

## 6. Expansion Brief

Use a brief for genuine multi-concern new content or substantial revision.

Template:

```text
.agents/skills/gliese-world-expansion/templates/expansion-brief.md
```

Committed briefs reuse the existing design-spec tree and date convention:

```text
docs/superpowers/specs/YYYY-MM-DD-<scope>-expansion-brief.md
```

Frozen integration and sufficiently small work may record the same decisions in the PR description instead of creating a file.

Required shape:

```md
# Expansion Brief

## Player-facing outcome
## Story basis
## Existing content affected
## Spatial design
## Ownership
## Reuse and genuinely new work
## Non-goals
## Acceptance walkthrough
```

Rules:

- the brief is planning input reviewed with the PR, not runtime data or a separate approval gate;
- write or update it before broad map edits or final art;
- reference current IDs without copying full registries;
- do not copy fingerprints, crop tables, source catalogs, or asset inventories;
- keep unsupported needs explicit;
- one batch may share one brief when individual player purposes remain distinct.

Do not create a new brief index, dashboard, packet catalog, or status database.

## 7. Required workflow

```text
1. Classify the request.
2. Select the owning authoring source.
3. Read only relevant story, content, map, and asset context.
4. Create or confirm the smallest useful brief.
5. Implement the smallest playable vertical slice.
6. Run focused validation and feed back only reusable observed gaps.
```

### Missing canon

Do not infer undeclared canon from the high-level story plan and silently commit it as runtime truth. Route the story decision.

### Unsupported runtime behavior

Record the need and owning subsystem. Do not hide unsupported behavior in coordinates, art, dialogue prose, or generic fields.

### Frozen input mismatch

Route a defect back to its current geometry or art owner. Do not introduce a translation layer or independently regenerate one region.

### Skill refinement

Change the skill only when a real delivery exposes:

- incorrect routing;
- missing repository guidance;
- hidden operator knowledge;
- repeated avoidable mistakes;
- unnecessary steps.

Make the smallest general correction. Do not encode one building or region as a universal rule.

## 8. Focused structural verification

The core deliverable is repository navigation, so renamed paths and commands should fail mechanically.

Add one focused server-project Vitest check that scans only the world-expansion skill’s Markdown files for:

- backticked repository paths beginning with approved roots such as `src/`, `story/`, `tools/`, `public/`, `.agents/`, or `.claude/`;
- fenced `bun run <script>` commands.

The test asserts:

- each referenced path exists as a file or directory;
- each named script exists in `package.json`;
- required skill files exist;
- frontmatter name/description are valid;
- discovery symlinks resolve to the canonical skill directories.

This is not a general Markdown link crawler. Do not validate external URLs, subjective prose quality, or hypothetical scenarios.

The test catches renames and stale commands. It does not replace technical review of whether a real but semantically wrong file was selected.

## 9. Field validation

### HPA-406 — frozen integration

Proves that the skill recognizes approved geometry/art, skips unnecessary production workflows, preserves live ownership, and guides direct runtime integration.

It does not prove greenfield outdoor design.

### HPA-400 — first content-expansion proof

Uses the direct `maps.ts` path to create a larger multi-zone Guild Hall and validates:

- functional-zone design;
- current NPC/shop/transition/save semantics;
- minimal model extension;
- generic asset handoff;
- focused tests and walkthrough.

If HPA-400 naturally changes the exterior door, footprint, or arrival seam, it must edit the actual village owning source and validate the round trip. Do not manufacture an unrelated region edit solely to claim outdoor validation.

### HPA-414 Batch 1 — second content-expansion proof

Uses the revised skill for Hero House, Item Shop, and Shrine of Aurora, proving generalization across residential, commercial, and ceremonial/story-loaded interiors.

### Accepted V1 limit

Greenfield `RegionFragment` and dungeon design remain behaviorally unproven in V1. The skill provides accurate source navigation and thin ownership guidance only. The first real new region or dungeon must update the skill from observed gaps.

HPA-495 may close after HPA-406, HPA-400, and HPA-414 Batch 1 feedback is incorporated because it does not claim proven greenfield outdoor quality.

## 10. Delivery sequence

### Initial skill PR

Deliver first:

- concise `SKILL.md`;
- `authoring.md` and `validation.md`;
- Expansion Brief template;
- `.claude` discovery symlink;
- correction of `CLAUDE.md` map-source guidance;
- canonical cross-agent migration and stale-path fix for `2d-game-asset-workflow`;
- the focused path/script/frontmatter/symlink test.

Do not include runtime map implementation, playable content, generated art, or a synthetic scenario corpus.

### Consumer work

After the minimal skill lands:

```text
HPA-406 frozen integration ─┐
                            ├─ may proceed in parallel
HPA-400 Guild Hall ─────────┘
              ↓
HPA-414 Batch 1
```

A skill refinement must not stall unrelated work unless current guidance would cause an incorrect implementation.

### Final validation note

After HPA-414 Batch 1, add one concise dated note under `docs/superpowers/specs/` summarizing:

- routing exercised;
- concrete gaps observed;
- smallest corrections made;
- remaining greenfield outdoor limits.

No per-scenario evidence tree is required.

## 11. Acceptance criteria

- One discoverable `gliese-world-expansion` skill exists under `.agents/skills/`.
- The routing table selects the correct owning source among:
  - direct `maps.ts` `WorldMapDefinition`;
  - hand-authored `RegionFragment` plus `mergeRegions(...)`;
  - village layered source plus compiler.
- Story-only, placement-only, asset-only, frozen-integration, and unsupported work avoid unnecessary skill/process steps.
- `authoring.md` names concrete paths, registration points, ownership boundaries, and adjacent skill owners without copying their data or algorithms.
- The brief is concise, uses the existing `docs/superpowers/specs/` convention when committed, and creates no separate approval system.
- Generic asset work is reachable by Claude and other agents through one canonical skill copy.
- The stale `CLAUDE.md` layered-overworld claim is removed before the initial skill merges; the legacy adapter document is already disambiguated on this branch.
- The focused mechanical test catches missing repository paths, missing package scripts, invalid frontmatter, and broken skill symlinks.
- HPA-406 proves frozen-integration routing.
- HPA-400 and HPA-414 Batch 1 prove real direct-map content expansion and feed back only reusable changes.
- Greenfield region/dungeon behavior is explicitly unproven and not represented as accepted V1 evidence.
- V1 introduces no workflow platform, duplicate runtime truth, specialist skill suite, or speculative map framework.
