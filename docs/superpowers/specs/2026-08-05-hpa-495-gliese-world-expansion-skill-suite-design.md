# HPA-495 Gliese World Expansion Skill Suite Design

**Status:** Revised after repository-backed review; ready for implementation  
**Linear:** HPA-495  
**Repository:** `cwchanap/Gliese`  
**Date:** 2026-08-05

## 1. Purpose

Build and verify a small reusable skill suite for future story-driven Gliese outdoor expansion without rediscovering repository-specific map, control, and art-package rules.

The suite contains three skills:

- `gliese-world-expansion`: entry-point orchestrator for genuine multi-concern outdoor expansion;
- `gliese-layered-map-designer`: outdoor logical geometry and control-design specialist;
- `gliese-environment-art-producer`: control-aligned baked-environment-art specialist.

The governing boundary is:

```text
Skills decide and orchestrate.
Tools calculate, export deterministic artifacts, approve machine-owned contracts, and verify.
```

The suite must remain smaller than the systems it coordinates. It does not create a workflow engine, packet database, story-integration platform, LLM judge, or replacement for existing repository commands.

## 2. Repository contracts to reuse

### 2.1 Story and content IDs

Story source remains:

```text
story/manifest.yaml
story/beats/**/*.md
```

`gliese-story-writer` remains the only story-authoring skill. HPA-514 now generates Rust references from the existing TypeScript registries and validates the current `(map, primaryNpc)` invariant; it does not provide a Story Integration Catalog or story-to-world fingerprint.

HPA-495 therefore consumes:

- `story/manifest.yaml` and only explicitly relevant beats;
- current map, NPC, quest, shop, enemy, transition, encounter, and asset registries;
- `bun run story:check:strict`;
- `collectStoryContentReferences()` from `tools/export-story-content-references.ts` for current map/NPC/quest/shop/enemy IDs.

It must not recreate an HPA-514 catalog, fingerprint, stale-consumer report, or requirement taxonomy.

### 2.2 Outdoor runtime and art packages

HPA-398, HPA-399, and HPA-496 already own:

- baked base/foreground runtime rendering and live fallback ownership;
- Meadow Entry source ownership, controls, crops, overlaps, runtime coverage, approvals, fingerprints, and storage;
- canonical master finalization, deterministic regional export, proofs, provenance, package approval, and validation;
- the fail-closed `art:map-package` adapter entry point.

HPA-495 references these commands and manifests. It never copies their geometry, crop, encoder, fingerprint, or validation algorithms into prose.

### 2.3 Skill discovery

Canonical project skills live under:

```text
.agents/skills/<skill-name>/
```

Claude Code discovers them through repository symlink adapters:

```text
.claude/skills/<skill-name> -> ../../.agents/skills/<skill-name>
```

Each new skill receives both paths. `CLAUDE.md` names the routing boundary, while the canonical skill body remains in `.agents/skills/`.

The repository also contains `.codex/scripts/validate_skill.py`, but that validator targets Codex skill directories that include `agents/openai.yaml`. The HPA-495 suite uses the lighter existing `.agents` convention, so its repository-specific structural and packet checks remain in one TypeScript validator rather than changing the Codex contract.

## 3. Goals

HPA-495 must:

1. make the correct skill discoverable from concrete triggers;
2. require a reviewed Area Expansion Packet before implementation or image production for genuine multi-concern outdoor expansion;
3. skip the orchestrator for isolated dialogue, placement-only, and other single-registry work;
4. distinguish new geometry, legacy-region edits, and frozen integration;
5. bind environment-art work to `art:map-package` and machine-owned approvals;
6. keep packet intent separate from execution history;
7. validate committed packets against current canonical IDs where such IDs exist;
8. observe one real failing baseline before authoring each new skill;
9. verify the complete suite through compact application, variation, pressure, and missing-contract scenarios;
10. close HPA-495 when the independently reviewable skill-suite implementation passes its checks.

## 4. Non-goals

- No new map, renderer, story, NPC, quest, shop, encounter, image, or audio runtime feature.
- No Story Integration Catalog, story-to-world fingerprint, stale-consumer validator, or automatic packet generator.
- No generic workflow engine, packet service, or LLM evaluation harness.
- No `gliese-interior-designer` before HPA-400 proves the interior framework.
- No standalone NPC or audio-generation skill.
- No independent per-region art generation for one shared map.
- No automatic subjective approval of story, geometry, or visual quality.
- No requirement to treat external story plans as Gliese canon unless explicitly adopted into `story/`.
- No HPA-406 checkpoint as a completion blocker for HPA-495.

## 5. Routing and correct non-invocation

Loading the largest skill by default is a failure. Use the smallest owning workflow.

| Request | Required routing |
|---|---|
| Dialogue, beat metadata, or manifest reference only | `gliese-story-writer` only; no Area Expansion Packet |
| Existing NPC placement move inside approved geometry, with no story/art/geometry change | Edit the owning map/content registry and focused tests; no orchestrator |
| Standalone interior request | Stop at HPA-400; no outdoor orchestrator |
| New or revised multi-concern outdoor area | `gliese-world-expansion` and a reviewed packet |
| Approved packet requires new/changed outdoor geometry | Add `gliese-layered-map-designer` |
| Approved geometry requires new/revised baked environment art | Add `gliese-environment-art-producer` |
| Frozen HPA-399 geometry and HPA-496 art are being integrated | Orchestrator may record the integration plan, but it must skip both specialists and consume approved artifacts directly |
| Audio is requested without registry/playback/provenance contracts | Record the explicit cue and unsupported dependency; do not generate or register audio |

Correct non-invocation is part of verification.

## 6. Skill designs

### 6.1 `gliese-layered-map-designer`

#### Trigger

Use when an approved area brief or Area Expansion Packet requires new or changed outdoor routes, thresholds, collision intent, semantic placement zones, or deterministic map-authoring controls.

Do not use for interiors, story-only edits, visual-only revisions, or frozen integration.

#### Repository geometry classification

The skill must classify the affected geometry before proposing work:

| Intent | Authoritative geometry | Deterministic checks | Control/art consequence |
|---|---|---|---|
| New outdoor region, preferred path | `LayeredRegionSource` compiled through `compileLayeredRegion` | focused source/compiler tests and compile invariants | Materialize room intent in `layers.regions` and stable IDs. If part of Meadow Entry, amend the HPA-399 whole-map control sources and rerun `art:validate:meadow-entry-controls`. A different map needs its own deterministic control and adapter contract before art. |
| Existing Meadow Entry region edit | Its current TypeScript representation: layered source where present, otherwise the existing `RegionFragment` file such as `regions/crossroads.ts` | focused region/map tests using the current representation | HPA-399 owns whole-map controls and fingerprint. Do not invent a per-region exporter or silently migrate representation. |
| Frozen Meadow Entry integration | No geometry edit | existing approved validation | Skip this skill and consume HPA-399/HPA-496 artifacts. |

`layers.regions` is the existing authoring-only room-label layer for layered sources. The packet's `world.routeGraph` is planning intent; approval requires that intent to materialize as `layers.regions` IDs/glyphs or stable existing `RegionFragment` IDs and focused tests. A free-floating graph that never reaches repository geometry is not an approved result.

#### Required decisions

1. narrative/gameplay rooms;
2. route graph, thresholds, forks, side pockets, gates, rewards, encounters, and handoffs;
3. collision-first geometry;
4. region/path/entrance/foreground/protected-live/semantic-anchor controls;
5. deterministic export or explicit missing-contract stop;
6. muted-path review;
7. controller traversal;
8. control approval.

The skill rejects coordinate soup, path carpets, micro-blockers, art-led collision edits, hidden coordinate catalogs, and live/stateful objects treated as baked geometry.

### 6.2 `gliese-environment-art-producer`

#### Trigger

Use when approved outdoor geometry and controls require a new or revised baked base/foreground package or controlled refinement of canonical masters.

Do not use merely to register or render approved exports.

#### Adjacent skill boundary

```text
sprites, sprite sheets, HUD assets, alpha cleanup
→ .codex/skills/2d-game-asset-workflow

outdoor baked base/foreground masters and regional packages
→ gliese-environment-art-producer + art:map-package
```

#### Required production order

```text
approved geometry and controls
→ supported adapter
→ production declaration
→ coherent global base/foreground masters
→ finalize
→ global/native review
→ export
→ seam/alignment/native proofs
→ approve
→ validate and verify storage
```

Canonical command boundary:

```sh
bun run art:map-package -- \
  --adapter art-map-adapters/<map-id>.v1.json \
  --operation <finalize|export|proof|approve|validate>
```

The skill must preserve base/foreground ownership, keep buildings/NPCs/encounters/rewards/gates/transitions/stateful objects live, record prompt or manual production and provenance, and stop on unsupported adapters or control-fingerprint mismatches. Geometry defects route back to their control owner.

### 6.3 `gliese-world-expansion`

#### Trigger

Use for a new or revised story-driven outdoor area that crosses multiple concerns such as story purpose, routes, buildings, NPC cast, encounters, environmental art, or coordinated integration.

Do not use for an isolated beat/dialogue edit, placement-only move, standalone interior request, or another clearly owned single-registry change.

#### Responsibilities

1. read `CLAUDE.md`, `story/manifest.yaml`, only relevant beats, and affected registries;
2. classify the request and record non-invoked skills;
3. produce and obtain approval for the Area Expansion Packet;
4. sequence the map, art, story, and repository command boundaries;
5. enforce the seven gates without duplicating machine-owned approvals;
6. keep unsupported needs explicit;
7. produce the workflow record;
8. close after playable acceptance and provenance/archive completion for the owning area task.

## 7. Area Expansion Packet

### 7.1 Files

Template:

```text
.agents/skills/gliese-world-expansion/templates/area-expansion-packet.yaml
```

Approved packets:

```text
docs/world-expansion/packets/<area-id>.yaml
```

The packet is reviewed planning input, not runtime source data.

### 7.2 V1 schema

```yaml
version: 1
areaId:
changeMode: new-area | revision | frozen-integration

storyRefs:
  manifest: story/manifest.yaml
  chapters: []
  beats: []

narrative:
  purpose:
  playerMotivation:
  emotionalArc:
  visibleMysteries: []
  spoilerConstraints: []

world:
  mapType:
  entrances:
    existing: []
    planned: []
  exits:
    existing: []
    planned: []
  routeGraph: []
  gates: []
  rewards: []
  encounters: []
  handoffs: []

buildings:
  existing: []
  required: []
  interiorNeeds: []

npcs:
  existing: []
  required: []
  storyRoles: []
  placementRoles: []

visual:
  motifs: []
  materialProfiles: []
  lighting:
  baseForegroundOwnership:
  protectedLive: []

audioCues:
  bgm:
  ambience:
  environmentalSfx: []
  interactionSfx: []
  storyStingers: []
  unsupportedDependencies: []

validation:
  routeChecks: []
  storyChecks: []
  assetChecks: []
  walkthroughs: []
```

### 7.3 Canonical reference rules

Only existing references with real repository identities are machine-validated:

- `storyRefs.chapters`: chapter IDs from `story/manifest.yaml`;
- `storyRefs.beats`: beat IDs from `story/manifest.yaml`;
- `world.entrances.existing` and `world.exits.existing`: qualified transition references in `<map-id>/<transition-id>` form;
- `buildings.existing`: current map IDs representing existing building/interior maps;
- `npcs.existing`: current NPC dialogue IDs.

Planned entrances/exits, required buildings/NPCs, route intent, motifs, and other proposals remain reviewed planning content until their owning implementation creates canonical IDs.

Additional rules:

- `areaId` must match the packet filename and use lowercase hyphen-case;
- empty arrays are explicit decisions, not prompts to invent content;
- `changeMode: frozen-integration` makes geometry and approved art immutable inputs;
- populate audio only from explicit user or adopted story requirements;
- missing audio/interior/runtime support goes in the appropriate unsupported/deferred field;
- packets do not copy fingerprints, source catalogs, crop manifests, or asset inventories.

## 8. Workflow record and gates

Template:

```text
.agents/skills/gliese-world-expansion/templates/workflow-record.md
```

Execution records belong to the area-owning work item, for example:

```text
docs/world-expansion/workflows/<area-id>-<checkpoint>.md
```

The seven gates remain:

1. Story intake
2. Area Expansion Packet approval
3. Logical map/control approval
4. Visual production approval
5. Content integration
6. Playable acceptance
7. Provenance/archive completion

Manual gates 1, 2, 5, 6, and 7 record status, reviewer, evidence, deviations, and residual risks.

Gates 3 and 4 do not restate an independent approval decision. They record the machine-owned source of truth:

```text
approval module/manifest path
validation command
validated commit SHA
result summary
```

For Meadow Entry these resolve through the adapter's `manifests.controlApproval` and `manifests.packageApproval` plus the existing control/art validation commands.

## 9. Documentation TDD and evidence

Each new skill requires one real failing baseline before its `SKILL.md` is authored:

- map designer: new story-driven town pressured toward coordinates before room/control structure;
- environment art producer: multi-region art pressured toward independent images before a global master and adapter checks;
- world-expansion orchestrator: building/interior request pressured toward inventing an interior skill instead of stopping at HPA-400.

Baseline evidence uses the existing flat reports convention:

```text
docs/superpowers/reports/2026-08-05-hpa-495-map-designer-baseline.md
docs/superpowers/reports/2026-08-05-hpa-495-environment-art-baseline.md
docs/superpowers/reports/2026-08-05-hpa-495-world-expansion-baseline.md
```

Capture only through the first durable write attempt, explicit routing decision, or explicit stop. Preserve the failure and rationalization; do not archive an entire failed vertical-slice implementation.

All post-skill reruns and variation/missing-contract checks are summarized in one report:

```text
docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md
```

No mandatory `scenarios.json`, per-scenario `verified/` tree, verdict-string validator, or LLM judge is added.

## 10. Deterministic validator

Module and CLI:

```text
tools/validate-gliese-world-skills.ts
```

Vitest file, under the configured server-project include path:

```text
src/lib/game/content/gliese-world-skills-validator.test.ts
```

The validator performs only checks that can fail objectively:

1. each required `.agents/skills/<name>/SKILL.md` exists;
2. frontmatter `name` matches the directory and `description` starts with `Use when`;
3. required supporting files for each skill exist;
4. each `.claude/skills/<name>` is a symlink to `../../.agents/skills/<name>`;
5. every committed `docs/world-expansion/packets/*.yaml` matches the V1 schema and its existing references resolve to the current chapter, beat, map, NPC, and qualified transition catalogs.

The tool uses a YAML parser and reuses `collectStoryContentReferences()` plus current `maps` data. Tests use temporary fixture roots and injectable reference catalogs, following the existing `art-map-package-adapter.test.ts` pattern. Every test contains explicit `expect(...)` assertions because Vitest enables `requireAssertions`.

The validator does not evaluate prose quality, approval quality, or whether a fresh-agent run was genuine.

## 11. Delivery

HPA-495 uses two PRs total:

1. this documentation PR;
2. one implementation PR containing the validator, three baseline reports, three skills, symlinks, templates, `CLAUDE.md` routing note, one validation report, and verification evidence.

The implementation PR closes HPA-495 when its acceptance checks pass.

HPA-406 is a downstream consumer, not an HPA-495 completion blocker. It consumes the merged suite and owns its own packet/workflow record. Its frozen-integration checkpoint can verify orchestrator routing, but it is not represented as production proof of either specialist.

The map and art specialists receive production field proof from the first later task that actually changes geometry or creates/revises a baked package. Any field-discovered gap must first become a failing regression scenario before the smallest skill/reference change is made.

## 12. Acceptance criteria

HPA-495 is complete when:

- all three canonical skills and Claude symlink adapters exist and are discoverable;
- one failing baseline was captured before each skill was authored;
- pure dialogue, placement-only, standalone interior, and frozen-integration requests route without unnecessary skills;
- the map skill encodes layered, legacy-fragment, and frozen geometry paths;
- the art skill uses `art:map-package`, global-master-first production, live-object protection, and fail-closed adapters;
- the orchestrator produces the packet and workflow templates without creating new runtime contracts;
- the structural/packet validator passes from both focused Vitest and the CLI;
- committed packets, when present, validate their canonical existing references;
- the single suite-validation report covers pressure, application, variation, and missing-contract scenarios;
- `gliese-story-writer` remains focused and compatible;
- existing story and Meadow Entry control/art validation commands pass as non-regression smoke, not as claimed field proof of the new specialist skills;
- the implementation PR is reviewable and contains no runtime feature work.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Agents choose the wrong geometry representation | Mandatory three-way geometry classification before map work |
| Claude cannot discover the skills | Exact symlink adapters, validator, and `CLAUDE.md` routing note |
| Packet references rot | Scan every committed packet and validate canonical existing IDs |
| Packet becomes a tax on trivial edits | Explicit dialogue/placement/interior bypass rules |
| Evidence becomes form-filling ceremony | Three RED baselines and one flat validation report only |
| Workflow record forks machine approvals | Gates 3/4 cite approval modules and command results instead of duplicating status |
| HPA-495 blocks on a frozen downstream checkpoint | Close on the independently verified implementation PR; HPA-406 owns downstream consumption |
| Skills absorb deterministic math | Keep commands/manifests authoritative and fail closed when contracts are missing |
