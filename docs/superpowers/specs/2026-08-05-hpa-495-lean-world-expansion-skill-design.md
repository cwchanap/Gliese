# HPA-495 Lean Gliese World Expansion Skill Design

**Status:** Revised after path-level repository review; ready for implementation planning  
**Linear:** HPA-495  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-05

## 1. Purpose

Future Gliese content expansion is a first-class project goal. The repository should contain a practical agent skill that helps an agent turn story intent into playable regions, dungeons, settlements, interiors, NPC and encounter content, and integrated environment work without rediscovering repository-specific rules.

The chosen V1 is one skill:

```text
.agents/skills/gliese-world-expansion/
```

It uses one short Markdown Expansion Brief and four focused reference pages. It is intentionally not a workflow platform, packet database, story-integration system, or suite of specialist skills.

The governing boundary is:

```text
The skill decides, routes, and guides.
Repository sources and tools remain authoritative.
```

The skill is valuable only when it names the correct repository paths, commands, and adjacent skill owners. General principles that merely restate `CLAUDE.md` are insufficient.

## 2. Why this design

Three alternatives were considered.

### 2.1 No reusable skill

This minimizes immediate work but fails an explicit project goal: future content expansion should become easier and more consistent for agents. It also leaves repository-specific rules scattered across code, old plans, and operator knowledge.

### 2.2 Three specialist skills plus a structured packet workflow

The previous design proposed:

- `gliese-world-expansion`;
- `gliese-layered-map-designer`;
- `gliese-environment-art-producer`;
- a structured Area Expansion Packet;
- seven recorded workflow gates;
- packet validation and a broader scenario/evidence program.

That design addressed real concerns but generalized too early. The repository currently has one bespoke Meadow Entry art package and no repeated evidence that three separately routed skills or a packet platform are needed.

### 2.3 One orchestrating skill with references — chosen

One skill gives future agents a stable entry point while keeping V1 small. Reference pages hold concrete outdoor, interior, story/content, art-handoff, and validation navigation without becoming independent routing surfaces.

A specialist skill should be extracted later only when repeated real deliveries show that one reference is independently invoked, large, and error-prone.

## 3. Repository facts that shape V1

### 3.1 Story ownership

Story prose and beat metadata live under:

```text
story/manifest.yaml
story/beats/**/*.md
```

`gliese-story-writer` remains the only story-authoring skill. `gliese-world-expansion` may identify that a story change is needed, but it must invoke or hand off to `gliese-story-writer` instead of duplicating its format and compiler guidance.

HPA-514 provides generated content references and map-local dialogue validation through:

```text
tools/export-story-content-references.ts
bun run story:check
bun run story:check:strict
```

It does not provide a Story Integration Catalog, story-to-world fingerprint, requirement taxonomy, or automatic expansion packet.

### 3.2 Three current map authoring patterns

All three patterns converge on `WorldMapDefinition`, but agents must start from the correct authoring source.

| Content kind | Current authoring source | V1 routing |
|---|---|---|
| Village and multi-zone interiors | Direct `WorldMapDefinition` objects in `src/lib/game/content/maps.ts`, using NPCs, transitions, `interiorProps`, ambient NPCs, shops, collision, and optional backgrounds | Read `interiors.md`; extend the current model in place |
| Meadow Entry outdoor regions and settlements | `src/lib/game/content/maps/meadow-entry.ts`, `src/lib/game/content/maps/regions/*`, and layered sources compiled through `src/lib/game/content/maps/layered/compile-layered-region.ts` | Read `outdoor-areas.md`; edit the owning source, never a generated or compiled output |
| Ruins-style dungeons and large one-off maps | Direct large `WorldMapDefinition` objects such as `ruinsThresholdMap` and `ruinsCoreMap` in `src/lib/game/content/maps.ts`, using ground patches, blockers, encounters, pickups, and transitions | Read the thin dungeon/hand-authored-map section in `outdoor-areas.md`; copy the current pattern until a second dungeon proves a helper is needed |

V1 does not invent a fourth authoring model or a `LayeredInteriorSource`. HPA-400 must first prove any missing interior capability through the Guild Hall.

### 3.3 Background and collision ownership

Current runtime truth remains in:

```text
src/lib/game/content/maps/types.ts
src/lib/game/content/maps/background-ownership.ts
```

HPA-398 established that:

- collision remains authoritative independently of art;
- background planes are presentation;
- `fallback-only` blocker visuals return when their owning background is unavailable;
- live and stateful objects are not baked into static art.

The skill must reference these contracts rather than restate or replace them.

### 3.4 Meadow Entry art ownership

HPA-399 and HPA-496 own Meadow Entry controls, crops, masters, exports, and map-specific validation commands.

The skill may call those commands when Meadow Entry geometry or art actually changes. It must not copy their geometry, crop tables, fingerprints, proof inventory, or adapter assumptions into general guidance for future maps.

Current first-stop commands are:

```sh
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

The current `art:map-package` wrapper is a Meadow Entry compatibility facade, not evidence that every future map has or needs a package adapter.

### 3.5 HPA-495 name disambiguation

From this design onward:

- **HPA-495** means this `gliese-world-expansion` skill and its field validation.
- `docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md` is a historically HPA-495-labeled Meadow Entry adapter document created before this issue was repurposed.
- `art-map-adapters/*`, `tools/art-map-package.ts`, and `bun run art:map-package` remain Meadow Entry-specific until another implementation actually exists.

The implementation plan must rename, footer, or delete the legacy adapter document and stale references so agents are not presented with two peer meanings of “HPA-495.” This cleanup must not block delivery of the minimal skill.

### 3.6 Existing skill convention

Canonical project skills live in:

```text
.agents/skills/<skill-name>/
```

Claude discovery uses a repository symlink:

```text
.claude/skills/<skill-name> -> ../../.agents/skills/<skill-name>
```

`CLAUDE.md` should document when to use the new skill and preserve `gliese-story-writer` as the story-only route.

## 4. V1 file layout

```text
.agents/skills/gliese-world-expansion/
├── SKILL.md
├── templates/
│   └── expansion-brief.md
└── references/
    ├── outdoor-areas.md
    ├── interiors.md
    ├── story-npcs-and-encounters.md
    └── validation.md

.claude/skills/gliese-world-expansion
  -> ../../.agents/skills/gliese-world-expansion
```

No V1 file is a runtime source of truth.

### 4.1 `SKILL.md`

`SKILL.md` owns:

- concrete trigger and non-trigger descriptions;
- request classification;
- the short required workflow;
- reference-page selection;
- story and art handoffs;
- the rule that the smallest playable vertical slice comes first;
- the rule that real consumer gaps may refine the skill.

It should stay short enough to load routinely and point to reference pages for path-level detail.

### 4.2 `outdoor-areas.md` required content

V1 outdoor guidance is deliberately thin and navigational because no greenfield outdoor area is required to close V1.

It must point agents first to:

```text
src/lib/game/content/maps/meadow-entry.ts
src/lib/game/content/maps/regions/village.ts
src/lib/game/content/maps/regions/crossroads.ts
src/lib/game/content/maps/regions/coast.ts
src/lib/game/content/maps/regions/mistfen.ts
src/lib/game/content/maps/regions/silverpine.ts
src/lib/game/content/maps/regions/wildwood.ts
src/lib/game/content/maps/regions/types.ts
src/lib/game/content/maps/layered/types.ts
src/lib/game/content/maps/layered/compile-layered-region.ts
src/lib/game/content/maps/background-ownership.ts
```

It must cover only:

- choosing among a layered source, an existing `RegionFragment`, and a direct large hand-authored map;
- editing source rather than compiled output;
- collision-first routes, thresholds, side pockets, gates, encounters, rewards, and handoffs;
- live, baked, fallback, collision, and stateful ownership;
- frozen integration: register approved descriptors and assets directly, and route defects back to their geometry or art owner;
- Meadow Entry-specific validation only when Meadow Entry controls or art actually change;
- the current ruins maps as the one existing large dungeon example.

It must not include generalized crop tables, proof inventories, adapter schemas, aesthetic doctrine, or a future-map framework. The first real greenfield region or dungeon may thicken this reference from observed gaps.

### 4.3 `interiors.md` required content

It must point agents first to:

```text
src/lib/game/content/maps.ts
src/lib/game/content/maps/types.ts
src/lib/game/content/assets.ts
src/lib/game/phaser/scenes/WorldScene.ts
```

It must cover:

- starting from the current `WorldMapDefinition` interior model;
- player activities and 2–4 functional zones before coordinates;
- dimensions, entrance/exit placement, interaction approaches, and camera readability;
- preserving NPC, dialogue, shop, transition, respawn, quest, and save IDs;
- props, walls, furniture collision, base/foreground art, and stateful ownership;
- direct migration and deletion of replaced one-room data;
- HPA-400’s rule: extend in place and extract a helper only after real repetition;
- no `LayeredInteriorSource`, compiler, or compatibility bridge until Guild Hall demonstrates a concrete need.

### 4.4 `story-npcs-and-encounters.md` required content

It must point agents first to:

```text
story/manifest.yaml
story/beats/
src/lib/game/content/dialogue.ts
src/lib/game/content/shops.ts
src/lib/game/content/quests.ts
src/lib/game/content/enemies.ts
src/lib/game/content/maps.ts
tools/export-story-content-references.ts
```

It must cover:

- prose and beat metadata: invoke `gliese-story-writer`;
- `content/dialogue.ts`: action and intent shells only, never prose;
- NPC placement on owning maps;
- shop, quest, enemy, encounter, reward, discovery, and evidence ownership;
- preserving existing IDs and runtime semantics;
- running `bun run story:check` after story or story-referenced content IDs change;
- using `::: unsupported-hook` or recording the unsupported owning subsystem rather than hiding unsupported behavior in coordinates, art, or dialogue text.

### 4.5 `validation.md` required content

It must name commands rather than say only “run focused checks.” Select commands based on touched scope:

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

It must cover:

- affected map/content tests and scene tests when rendering changes;
- one concrete controller walkthrough derived from the brief;
- representative save/reload and fallback checks;
- web and Tauri build expectations based on scope;
- attributing failures to story, geometry, runtime, art, or asset ownership;
- no screenshot matrix or new evidence system unless a concrete failure requires it.

## 5. Routing model

Loading the skill for every content edit would create bureaucracy. V1 must make correct non-invocation explicit.

| Request | Route |
|---|---|
| Story beat, dialogue prose, or manifest metadata only | `gliese-story-writer`; no Expansion Brief |
| Small bug fix or placement-only move inside approved geometry | Edit the owning source and focused tests; no full brief |
| Direct integration of already-approved geometry and art | Load `gliese-world-expansion`, classify as frozen integration, skip design and art production |
| New or substantially revised Meadow Entry outdoor area | Load `gliese-world-expansion`; create an Expansion Brief; read `outdoor-areas.md`; use Meadow Entry-owned commands only as required |
| New large dungeon or one-off map | Load `gliese-world-expansion`; create an Expansion Brief; use the direct ruins-map pattern until repetition proves a helper |
| New or substantially revised interior | Load `gliese-world-expansion`; create an Expansion Brief; read `interiors.md` |
| Coordinated NPC, encounter, reward, or story-location expansion | Load `gliese-world-expansion`; read only relevant references; hand prose changes to `gliese-story-writer` |
| Meadow Entry control, crop, master, or export change | Use the existing Meadow Entry-owned art commands; load world expansion only when map semantics also change |
| New prop, sprite, or sprite sheet outside the Meadow Entry package | Use `.codex/skills/2d-game-asset-workflow`; do not duplicate its alpha, frame, import, or Phaser wiring guidance |
| A new map requests a reusable art-package adapter | Record the concrete need; do not invent a second package lifecycle before a real implementation exists |
| Unsupported audio, story hook, or runtime behavior | Record the unsupported need and stop at the owning boundary |

### 5.1 Existing asset-skill correction

The current `2d-game-asset-workflow` is the intended owner for sprite, sheet, prop, and transparency work, but its checked-in text contains stale project assumptions such as SvelteKit and `static/game/assets/`.

Before the new skill relies on it, the initial implementation plan must make the smallest correction to the existing asset skill so it matches the current Vite/Svelte project and `public/game/assets/` runtime path. Do not copy the asset workflow into `gliese-world-expansion`.

## 6. Expansion Brief

### 6.1 Location

Template:

```text
.agents/skills/gliese-world-expansion/templates/expansion-brief.md
```

Committed briefs:

```text
docs/world-expansion/briefs/<scope>.md
```

Examples:

```text
docs/world-expansion/briefs/guild-hall.md
docs/world-expansion/briefs/village-interiors-batch-1.md
```

Frozen integration may use a concise PR-description record instead of a separate file.

The `docs/world-expansion/` tree remains briefs only. Do not add packet catalogs, indexes, dashboards, status databases, or a parallel documentation platform. The single final validation note described later is the only additional historical artifact.

### 6.2 Required shape

```md
# Expansion Brief

## Player-facing outcome
What becomes newly playable or meaningfully improved?

## Story basis
Which current beats, characters, mysteries, building functions, or spoiler limits matter?

## Existing content affected
Maps, transitions, NPCs, dialogue IDs, shops, quests, encounters, rewards, assets, and saves.

## Spatial design
Entrances, exits, critical route, optional route, functional zones, gates, rewards, and encounters.

## Ownership
What stays live, what may be baked, what owns collision, and what is stateful?

## Reuse and genuinely new work
Which existing sources, helpers, assets, and commands are reused? What new capability is actually required?

## Non-goals
What is deliberately not being built?

## Acceptance walkthrough
What shortest concrete route proves the expansion works?
```

### 6.3 Brief rules

- The brief is planning input reviewed with the PR, not runtime data or a separate approval system.
- Write or update it before broad map edits or final art for genuine multi-concern work.
- It references current IDs but does not copy complete registries.
- It does not copy fingerprints, crop tables, source catalogs, or asset inventories.
- Empty or unsupported needs remain explicit; the agent must not invent canon or engine behavior.
- It should be short enough to read in one sitting.
- A batch may share one brief when the buildings or areas form one delivery and still retain distinct player purposes.

## 7. Required skill workflow

```text
1. Classify the request.
2. Read only relevant repository and story context.
3. Create or confirm the smallest useful Expansion Brief.
4. Implement the smallest playable vertical slice.
5. Run focused automated and controller validation.
6. Feed only reusable observed gaps back into the skill.
```

### 7.1 Classify

Choose one:

- `new-content`;
- `revision`;
- `frozen-integration`;
- `story-only`;
- `placement-only`;
- `asset-only`;
- `unsupported`.

Classification determines whether a brief and which reference pages or adjacent skills are needed.

### 7.2 Inspect

Read:

- `CLAUDE.md`;
- the authoring source selected from Section 3.2;
- relevant story beats only;
- current tests and assets for the affected area;
- the smallest relevant skill reference pages.

Do not read the full story corpus or every map when the scope is narrower.

### 7.3 Brief

Create or update a brief for genuine multi-concern new content or revision. Frozen integration may record the same decisions in the PR description.

The brief is the planning artifact for the PR. It does not create a separate status, reviewer, or approval gate.

### 7.4 Vertical slice

Prefer one complete route, room sequence, interaction, or encounter loop over a broad framework.

Examples:

- Guild Hall entrance to quartermaster, guild master, records area, and exit;
- one Crossroads connector with base/foreground/fallback behavior;
- one dungeon room chain with encounter, reward, and return transition.

### 7.5 Validate

Use the commands relevant to the touched scope and one concrete walkthrough. Do not create exhaustive screenshot or evidence matrices unless a real failure requires them.

### 7.6 Learn

Change the skill only when a real delivery demonstrates:

- missing repository guidance;
- incorrect routing;
- hidden operator knowledge;
- repeated avoidable mistakes;
- unnecessary workflow steps.

The correction must be the smallest general change and must not encode one building or region as a universal rule.

## 8. Boundary and error handling

### 8.1 Missing canon

If the requested expansion depends on undeclared story facts, the skill must ask for or route a story decision. It must not infer canon from a high-level plan and silently commit it as runtime truth.

### 8.2 Unsupported runtime behavior

Record the need and owning subsystem. Do not hide an unsupported story hook inside map coordinates, art, dialogue text, or a generic field.

### 8.3 Geometry and art conflict

Collision and gameplay geometry remain authoritative. Art must be corrected or re-exported rather than moving collision to match a visual accident.

### 8.4 Frozen input mismatch

For frozen integration, stop and route the defect to the existing geometry or art owner. Do not create a translation layer or regenerate one region independently.

### 8.5 Stale references

If a brief references a missing current ID, update the brief or owning content source explicitly. V1 does not add a separate stale-consumer fingerprint protocol.

### 8.6 Unsupported art lifecycle

If a new map needs coherent baked-art production but no supported map-specific lifecycle exists, record that concrete need and deliver only the smallest asset workflow the real map requires. Do not clone Meadow Entry’s adapter, crop contract, or proof inventory by default.

## 9. Field validation plan

### 9.1 HPA-406 — frozen integration

Purpose:

- prove the skill recognizes approved geometry and art;
- skip outdoor map design and environment-art production;
- preserve live/stateful ownership;
- guide a concise acceptance route.

This is routing evidence, not proof of new outdoor-area design.

### 9.2 HPA-400 — first player-facing expansion proof

Use the skill and `interiors.md` to create `guild-hall.md` and deliver the larger multi-zone Guild Hall.

This proves:

- story and building-purpose intake;
- functional-zone design;
- preservation of NPC, shop, transition, and save semantics;
- minimal extension of the current interior model;
- focused validation and skill refinement.

### 9.3 HPA-414 Batch 1 — second generalization proof

Use the revised skill for Hero House, Item Shop, and Shrine of Aurora in one batch brief.

This proves generalization across:

- residential use;
- commercial circulation;
- ceremonial and story-loaded space;
- existing respawn, shop, NPC, and transition semantics.

HPA-495 may close after Batch 1 feedback is incorporated and a concise final validation note is committed.

### 9.4 Future new outdoor area or dungeon

The first genuinely new future region or dungeon will provide full outdoor-design validation. It is not required to close HPA-495 V1 because outdoor V1 is intentionally limited to path navigation, ownership, frozen-integration routing, and existing examples.

If that future delivery reveals independent repeated complexity, it may thicken `outdoor-areas.md` or justify extracting one specialist skill.

The accepted V1 risk is explicit: interiors receive two real content-expansion validations; greenfield outdoor design remains unproven and therefore stays thin.

## 10. Delivery shape and implementation-plan constraints

### 10.1 Initial skill PR

Deliver first:

- concise `SKILL.md`;
- four thin path-oriented reference pages;
- Expansion Brief template;
- `.claude` symlink;
- concise `CLAUDE.md` routing guidance;
- the small correction to the existing 2D asset skill;
- minimal structural verification.

This initial PR must land before HPA-406 runtime integration and HPA-400 broad Guild Hall implementation begin. It should be runnable early rather than waiting for perfect outdoor guidance.

Do not include runtime map code, playable content, generated art, or a synthetic scenario corpus.

### 10.2 Parallel consumer work

After the minimal skill exists:

```text
HPA-406 frozen integration ─┐
                            ├─ may proceed in parallel
HPA-400 Guild Hall ─────────┘
              ↓
HPA-414 Batch 1
```

Skill refinements found by one consumer must not stall unrelated work unless the current guidance would cause a concrete incorrect implementation.

### 10.3 Consumer PR refinements

HPA-406, HPA-400, and HPA-414 consumer PRs may update the skill when they expose a reusable gap.

Each PR should state concisely:

- which skill route was used;
- any concrete gap observed;
- the smallest correction made;
- why the correction generalizes.

### 10.4 Final validation note

Commit one concise note after HPA-414 Batch 1 summarizing:

- frozen-integration behavior;
- Guild Hall observations;
- Batch 1 observations;
- skill changes made;
- remaining known limits.

No per-scenario evidence tree is required.

## 11. Structural verification

V1 uses only objective mechanical checks:

- `SKILL.md` exists and has matching `name` plus a concrete `Use when` description;
- required reference and template files exist;
- `.claude/skills/gliese-world-expansion` points to the canonical `.agents` directory.

The current `.codex/scripts/validate_skill.py` requires a Codex-oriented `agents/openai.yaml` and therefore cannot be reused unchanged for the existing `.agents` skill convention. The implementation may either extend an existing focused test or add a tiny dedicated check for file existence, frontmatter, and symlink target.

Do not add a Markdown link crawler, packet validator, workflow engine, LLM evaluator, or scenario harness. Behavioral quality is established through HPA-406, HPA-400, and HPA-414 real use.

## 12. Non-goals

- No three-skill suite in V1.
- No `gliese-layered-map-designer`, `gliese-environment-art-producer`, or `gliese-interior-designer` yet.
- No YAML Area Expansion Packet schema or packet database.
- No seven-gate workflow system or duplicated approval records.
- No Story Integration Catalog, story fingerprint, stale-consumer report, or automatic canon generation.
- No standalone NPC or audio skill.
- No copied Meadow Entry geometry, crop, fingerprint, adapter, or proof logic in prose.
- No generic scenario runner, LLM judge, or large synthetic pressure-test corpus.
- No new documentation index, dashboard, or workflow database around Expansion Briefs.
- No requirement to keep old map or interior authoring formats after migration.
- No generalized greenfield outdoor doctrine before a real new region or dungeon exists.

## 13. Acceptance criteria

- One discoverable `gliese-world-expansion` skill exists under `.agents/skills/` with the repository discovery symlink.
- Trigger and non-trigger guidance routes story-only, placement-only, asset-only, frozen-integration, outdoor, dungeon, and interior work correctly.
- The three current map authoring patterns and their first-stop paths are explicit.
- The Markdown Expansion Brief is concise enough for routine use and prevents direct story-to-coordinate or story-to-image jumps without creating approval theatre.
- The four references name concrete repository paths, commands, adjacent skill owners, and stopping boundaries without copying algorithms or registries.
- HPA-495 world-expansion work is clearly disambiguated from the historically labeled Meadow Entry art adapter.
- The existing 2D asset skill is corrected and remains the owner of sprite, sheet, prop, alpha, and Phaser wiring guidance.
- HPA-406 demonstrates correct frozen-integration non-invocation.
- HPA-400 uses the skill for a real larger Guild Hall and feeds back observed reusable improvements.
- HPA-414 Batch 1 proves the revised skill across home, shop, and shrine content.
- No hidden mandatory operator knowledge remains for the demonstrated workflows.
- A future agent can begin a new region, dungeon, settlement, or interior with a clear player outcome, correct authoring source, ownership model, and acceptance walkthrough.
- V1 introduces no speculative workflow platform or duplicated source of truth.
