# HPA-495 Lean Gliese World Expansion Skill Design

**Status:** Approved direction, ready for implementation planning  
**Linear:** HPA-495  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-05

## 1. Purpose

Future Gliese content expansion is a first-class project goal. The repository should contain a practical agent skill that helps an agent turn story intent into playable regions, dungeons, settlements, interiors, NPC and encounter content, and integrated environment work without rediscovering repository-specific rules.

The chosen V1 is one skill:

```text
.agents/skills/gliese-world-expansion/
```

It uses one short Markdown Expansion Brief and a few focused reference pages. It is intentionally not a workflow platform, packet database, story-integration system, or suite of specialist skills.

The governing boundary is:

```text
The skill decides, routes, and guides.
Repository sources and tools remain authoritative.
```

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

One skill gives future agents a stable entry point while keeping V1 small. Reference pages can hold outdoor, interior, story/content, and validation guidance without becoming independent routing surfaces.

A specialist skill should be extracted later only when repeated real deliveries show that one reference is independently invoked, large, and error-prone.

## 3. Repository facts that shape V1

### 3.1 Story ownership

Story prose and beat metadata live under:

```text
story/manifest.yaml
story/beats/**/*.md
```

`gliese-story-writer` remains the only story-authoring skill. `gliese-world-expansion` may identify that a story change is needed, but it must invoke or hand off to `gliese-story-writer` instead of duplicating its format and compiler guidance.

HPA-514 provides generated content references and map-local dialogue validation. It does not provide a Story Integration Catalog, story-to-world fingerprint, requirement taxonomy, or automatic expansion packet.

### 3.2 Map and content ownership

Current runtime truth remains in existing TypeScript definitions:

- `WorldMapDefinition` and map types;
- `content/maps.ts` for interiors and map registry composition;
- layered outdoor sources and existing `RegionFragment` modules;
- transitions, NPCs, shops, quests, encounters, pickups, discoveries, and saves;
- HPA-398 base/foreground rendering and fallback ownership.

The skill must inspect and modify the owning source rather than create a parallel world model.

### 3.3 Meadow Entry art ownership

HPA-399 and HPA-496 already own Meadow Entry controls, crops, masters, exports, and validation commands.

The skill may call those commands when Meadow Entry geometry or art actually changes. It must not copy their geometry, crop tables, fingerprints, proof inventory, or adapter assumptions into general guidance for future maps.

### 3.4 Existing skill convention

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
- handoff to `gliese-story-writer`;
- the rule that the smallest playable vertical slice comes first;
- the rule that real consumer gaps may refine the skill.

It should remain concise enough to load routinely.

### 4.2 Reference pages

Reference pages contain repository-specific guidance that is useful only for certain expansion types.

`outdoor-areas.md` covers:

- new geometry versus existing-region revision versus frozen integration;
- authoritative layered or `RegionFragment` source selection;
- collision-first design;
- routes, thresholds, side pockets, gates, encounters, rewards, and handoffs;
- baked/live ownership and when Meadow Entry-specific tooling applies.

`interiors.md` covers:

- functional zones and player activities;
- dimensions, entrances, exits, interaction approaches, and camera readability;
- props, walls, furniture collision, base/foreground art, and stateful ownership;
- direct migration and deletion of replaced one-room data;
- extracting a helper only after demonstrated repetition.

`story-npcs-and-encounters.md` covers:

- reading only relevant beats and registries;
- preserving IDs and runtime semantics;
- handing story prose changes to `gliese-story-writer`;
- NPC, shop, quest, encounter, reward, discovery, and evidence ownership;
- recording unsupported needs instead of inventing runtime behavior.

`validation.md` covers:

- focused automated checks;
- a short controller acceptance route;
- representative save/reload and fallback checks;
- web and Tauri build expectations;
- when a failure belongs to story, geometry, runtime, or art ownership.

## 5. Routing model

Loading the skill for every content edit would create bureaucracy. V1 must make correct non-invocation explicit.

| Request | Route |
|---|---|
| Story beat, dialogue, or manifest metadata only | `gliese-story-writer`; no Expansion Brief |
| Small bug fix or placement-only move inside approved geometry | Edit the owning source and focused tests; no full brief |
| Direct integration of already-approved geometry and art | Load `gliese-world-expansion`, classify as frozen integration, skip design and art production |
| New or substantially revised outdoor area | Load `gliese-world-expansion`; create an Expansion Brief; read `outdoor-areas.md` |
| New or substantially revised interior | Load `gliese-world-expansion`; create an Expansion Brief; read `interiors.md` |
| Coordinated NPC, encounter, reward, or story-location expansion | Load `gliese-world-expansion`; read only relevant references; hand prose changes to `gliese-story-writer` |
| Standalone image or sprite cleanup with no world/content semantics | Use the focused asset workflow; no world-expansion brief |
| Unsupported audio, story hook, or runtime behavior | Record the unsupported need and stop at the owning boundary |

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

- The brief is reviewed planning input, not runtime data.
- It references current IDs but does not copy complete registries.
- It does not copy fingerprints, crop tables, source catalogs, or asset inventories.
- Empty or unsupported needs remain explicit; the agent must not invent canon or engine behavior.
- The brief should be short enough to read in one sitting.
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
- `unsupported`.

Classification determines whether a brief and which reference pages are needed.

### 7.2 Inspect

Read:

- `CLAUDE.md`;
- relevant map/content modules;
- relevant story beats only;
- current tests and assets for the affected area;
- the smallest relevant skill reference pages.

Do not read the full story corpus or every map when the scope is narrower.

### 7.3 Brief

Create a brief for genuine multi-concern new content or revision. Frozen integration may record the same decisions in the PR description.

The brief must be approved before generating final art or making broad map changes.

### 7.4 Vertical slice

Prefer one complete route, room sequence, interaction, or encounter loop over a broad framework.

Examples:

- Guild Hall entrance to quartermaster, guild master, records area, and exit;
- one Crossroads connector with base/foreground/fallback behavior;
- one dungeon room chain with encounter, reward, and return transition.

### 7.5 Validate

Use focused tests and one concrete walkthrough. Do not create exhaustive screenshot or evidence matrices unless a real failure requires them.

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

The first genuinely new future region or dungeon will provide full outdoor-design validation. It is not required to close HPA-495 V1 because the skill already includes outdoor guidance and is field-tested through frozen integration plus two real interior expansion deliveries.

If that future delivery reveals independent repeated complexity, it may justify extracting one specialist skill.

## 10. Delivery shape

### 10.1 Initial skill PR

Deliver:

- `SKILL.md`;
- four reference pages;
- Expansion Brief template;
- `.claude` symlink;
- concise `CLAUDE.md` routing guidance;
- a small structural verification appropriate to the repository convention.

Do not include runtime code, map content, art, or a synthetic scenario corpus.

### 10.2 Consumer PR refinements

HPA-406, HPA-400, and HPA-414 consumer PRs may update the skill when they expose a reusable gap.

Each PR should state:

- which skill route was used;
- any concrete gap observed;
- the smallest correction made;
- why the correction generalizes.

### 10.3 Final validation note

Commit one concise note after HPA-414 Batch 1 summarizing:

- frozen-integration behavior;
- Guild Hall observations;
- Batch 1 observations;
- skill changes made;
- remaining known limits.

No per-scenario evidence tree is required.

## 11. Structural verification

V1 should use the smallest objective checks that fit existing repository conventions:

- `SKILL.md` exists and has matching `name` and a concrete `Use when` description;
- required reference/template files exist;
- `.claude/skills/gliese-world-expansion` points to the canonical `.agents` directory;
- Markdown formatting and links are valid;
- the skill does not duplicate full registries or generated artifacts.

Do not create a generic workflow engine, packet validator, or LLM evaluator for subjective skill quality.

Behavioral quality is established through HPA-406, HPA-400, and HPA-414 real use.

## 12. Non-goals

- No three-skill suite in V1.
- No `gliese-layered-map-designer`, `gliese-environment-art-producer`, or `gliese-interior-designer` yet.
- No YAML Area Expansion Packet schema or packet database.
- No seven-gate workflow system or duplicated approval records.
- No Story Integration Catalog, story fingerprint, stale-consumer report, or automatic canon generation.
- No standalone NPC or audio skill.
- No copied Meadow Entry geometry, crop, fingerprint, or proof logic in prose.
- No generic scenario runner, LLM judge, or large synthetic pressure-test corpus.
- No requirement to keep old map/interior authoring formats after migration.

## 13. Acceptance criteria

- One discoverable `gliese-world-expansion` skill exists under `.agents/skills/` with the repository discovery symlink.
- Trigger and non-trigger guidance routes story-only, placement-only, frozen-integration, outdoor, and interior work correctly.
- The Markdown Expansion Brief is concise enough for routine use and prevents direct story-to-coordinate or story-to-image jumps.
- The skill preserves current repository sources and tools as authoritative.
- HPA-406 demonstrates correct frozen-integration non-invocation.
- HPA-400 uses the skill for a real larger Guild Hall and feeds back observed reusable improvements.
- HPA-414 Batch 1 proves the revised skill across home, shop, and shrine content.
- No hidden mandatory operator knowledge remains for the demonstrated workflows.
- A future agent can begin a new region, dungeon, settlement, or interior with a clear player outcome, content boundary, ownership model, and acceptance walkthrough.
- V1 introduces no speculative workflow platform or duplicated source of truth.
