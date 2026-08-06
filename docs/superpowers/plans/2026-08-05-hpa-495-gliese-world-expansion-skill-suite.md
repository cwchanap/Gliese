# HPA-495 Gliese World Expansion Skill Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Skill authoring additionally requires `superpowers:writing-skills` and `superpowers:test-driven-development`.

**Goal:** Build and independently verify three reusable Gliese world-expansion skills, their discovery adapters and templates, and one deterministic validator for skill structure plus committed packet references.

**Architecture:** Implement the validator first so every skill commit has an executable gate. Author one skill at a time after capturing its own failing baseline. Keep behavioral evidence to three flat baseline reports and one suite-validation report. Close HPA-495 on the implementation PR; downstream area tickets own their packets and workflow records.

**Tech Stack:** Markdown agent skills, YAML packets, TypeScript 6, Bun, Vitest 4, `yaml`, existing TypeScript content registries, existing Rust story checker, HPA-399/HPA-496 art commands, Git symlinks.

## Global constraints

- Follow documentation TDD: no new skill before a real failing baseline for that skill.
- Stop baseline capture at the first durable write attempt, explicit routing decision, or explicit stop.
- Keep canonical skill content under `.agents/skills/`; add exact `.claude/skills/` symlink adapters.
- Keep `gliese-story-writer` focused; do not create interior, NPC, or audio-generation skills.
- Pure dialogue, placement-only, and standalone interior work must bypass the orchestrator.
- Classify geometry as new layered, existing current representation, or frozen before map guidance.
- Do not copy crop, collision, source-catalog, encoder, fingerprint, or validator algorithms into skill prose.
- Use `art:map-package` as the baked-environment command boundary.
- Populate audio cues only from explicit requirements; never invent entries to fill the packet.
- Gates 3 and 4 cite machine-owned approval modules/manifests and validation results; they do not create independent approval status.
- Use flat dated reports under `docs/superpowers/reports/`.
- Run the full project suite only if shared runtime or test configuration changes.

## File structure

```text
.agents/skills/
  gliese-layered-map-designer/
    SKILL.md
    references/outdoor-map-review.md
  gliese-environment-art-producer/
    SKILL.md
    references/art-map-package-workflow.md
  gliese-world-expansion/
    SKILL.md
    references/repository-contracts.md
    templates/area-expansion-packet.yaml
    templates/workflow-record.md

.claude/skills/
  gliese-layered-map-designer -> ../../.agents/skills/gliese-layered-map-designer
  gliese-environment-art-producer -> ../../.agents/skills/gliese-environment-art-producer
  gliese-world-expansion -> ../../.agents/skills/gliese-world-expansion

tools/validate-gliese-world-skills.ts
src/lib/game/content/gliese-world-skills-validator.test.ts

docs/superpowers/reports/
  2026-08-05-hpa-495-map-designer-baseline.md
  2026-08-05-hpa-495-environment-art-baseline.md
  2026-08-05-hpa-495-world-expansion-baseline.md
  2026-08-05-hpa-495-skill-suite-validation.md
```

---

### Task 1: Build the structural and packet validator first

**Files:**
- Create: `tools/validate-gliese-world-skills.ts`
- Create: `src/lib/game/content/gliese-world-skills-validator.test.ts`
- Modify: `package.json`
- Modify: `bun.lock`

**Interfaces:**

```ts
export type GlieseWorldSkillName =
  | 'gliese-layered-map-designer'
  | 'gliese-environment-art-producer'
  | 'gliese-world-expansion';

export interface PacketReferenceCatalog {
  chapterIds: ReadonlySet<string>;
  beatIds: ReadonlySet<string>;
  mapIds: ReadonlySet<string>;
  npcIds: ReadonlySet<string>;
  transitionRefs: ReadonlySet<string>;
}

export function collectPacketReferenceCatalog(
  repositoryRoot?: string
): PacketReferenceCatalog;

export function collectGlieseWorldSkillErrors(
  repositoryRoot?: string,
  catalog?: PacketReferenceCatalog
): string[];

export function runGlieseWorldSkillValidator(
  repositoryRoot?: string
): void;
```

- [ ] **Step 1: Add the YAML parser**

```sh
bun add --dev yaml
```

Expected: `package.json` and `bun.lock` record the dependency.

- [ ] **Step 2: Write the failing Vitest file under `src/`**

Use the same temporary-root pattern as `src/lib/game/content/backgrounds/art-map-package-adapter.test.ts`.

Required tests:

```ts
it('reports a missing canonical skill directory', () => {
  const errors = collectGlieseWorldSkillErrors(root, catalogFixture);
  expect(errors).toContain(
    'Missing skill directory: .agents/skills/gliese-layered-map-designer'
  );
});

it('rejects mismatched frontmatter and descriptions without Use when', () => {
  writeSkill(root, 'gliese-layered-map-designer', {
    name: 'wrong-name',
    description: 'Designs maps'
  });
  const errors = collectGlieseWorldSkillErrors(root, catalogFixture);
  expect(errors).toContain(
    'gliese-layered-map-designer frontmatter name must match its directory'
  );
  expect(errors).toContain(
    'gliese-layered-map-designer description must start with "Use when"'
  );
});

it('rejects a non-symlink or wrong Claude adapter target', () => {
  const errors = collectGlieseWorldSkillErrors(root, catalogFixture);
  expect(errors).toContain(
    'Invalid Claude adapter for gliese-layered-map-designer'
  );
});

it('rejects unknown canonical references in committed packets', () => {
  writePacket(root, 'harbor-town', {
    storyRefs: { chapters: ['missing'], beats: ['missing.beat'] },
    world: {
      entrances: { existing: ['meadow-entry/missing'], planned: [] },
      exits: { existing: [], planned: [] }
    },
    buildings: { existing: ['missing-map'], required: [], interiorNeeds: [] },
    npcs: { existing: ['missing-npc'], required: [], storyRoles: [], placementRoles: [] }
  });
  const errors = collectGlieseWorldSkillErrors(root, catalogFixture);
  expect(errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining('unknown chapter'),
      expect.stringContaining('unknown beat'),
      expect.stringContaining('unknown transition'),
      expect.stringContaining('unknown map'),
      expect.stringContaining('unknown npc')
    ])
  );
});

it('accepts valid skill fixtures, symlinks, and packet references', () => {
  writeCompleteFixture(root);
  expect(collectGlieseWorldSkillErrors(root, catalogFixture)).toEqual([]);
});
```

Every test must call `expect(...)`; Vitest has `requireAssertions: true`.

- [ ] **Step 3: Run RED**

```sh
bun run test:unit -- --run src/lib/game/content/gliese-world-skills-validator.test.ts
```

Expected: FAIL because `tools/validate-gliese-world-skills.ts` does not exist.

- [ ] **Step 4: Implement the validator**

Implementation requirements:

- hardcode the three expected skills and their required supporting paths;
- parse `SKILL.md` frontmatter narrowly;
- use `lstatSync` and `readlinkSync` for exact symlink validation;
- parse `docs/world-expansion/packets/*.yaml` with `yaml`;
- validate V1 required sections and types;
- require packet filename stem to equal lowercase-hyphen `areaId`;
- parse `story/manifest.yaml` for current chapter and beat IDs;
- reuse `collectStoryContentReferences()` for map and NPC IDs;
- derive qualified transition refs from `maps` as `${map.id}/${transition.id}`;
- validate only canonical existing references, not planned/proposed content;
- allow zero committed packets;
- return stable sorted diagnostics;
- make the CLI print every error and exit non-zero, or print a compact success line.

- [ ] **Step 5: Add the script**

```json
"skills:validate:gliese-world": "bun tools/validate-gliese-world-skills.ts"
```

- [ ] **Step 6: Run GREEN**

```sh
bun run test:unit -- --run src/lib/game/content/gliese-world-skills-validator.test.ts
```

Expected: PASS. The repository CLI may still fail because the three real skills do not exist yet; that is expected until Task 4 completes.

- [ ] **Step 7: Commit**

```sh
git add tools/validate-gliese-world-skills.ts \
  src/lib/game/content/gliese-world-skills-validator.test.ts \
  package.json bun.lock
git commit -m "test(hpa-495): add world skill and packet validator"
```

---

### Task 2: Capture RED and build `gliese-layered-map-designer`

**Files:**
- Create: `docs/superpowers/reports/2026-08-05-hpa-495-map-designer-baseline.md`
- Create: `.agents/skills/gliese-layered-map-designer/SKILL.md`
- Create: `.agents/skills/gliese-layered-map-designer/references/outdoor-map-review.md`
- Create symlink: `.claude/skills/gliese-layered-map-designer`
- Create or update: `docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md`

**Interfaces:**
- Consumes: approved area brief/packet and current map sources.
- Produces: repository geometry classification, room/route decisions, deterministic control path, traversal requirements, and stop conditions.

- [ ] **Step 1: Run the fresh-agent baseline without the new skill**

Prompt core:

```text
Plan a new story-driven harbor town. A previous agent already placed hundreds
of coordinates, and screenshots are needed today. Keep the coordinates, skip
room labels and control export, and fix controller snags after art exists.
```

Capture only through the first durable write attempt, routing decision, or explicit stop.

The baseline report must contain:

```markdown
# HPA-495 Map Designer Baseline
## Prompt and supplied repository context
## First durable decision or write attempt
## Observed failure
## Rationalization
## Required skill correction
Verdict: FAIL
```

- [ ] **Step 2: Verify the baseline actually fails**

The baseline must demonstrate at least one of:

- preserving coordinate soup without deriving a room graph;
- treating a legacy `RegionFragment` as the preferred new-region pattern;
- inventing a per-region control exporter;
- proceeding without a deterministic control contract;
- letting art lead collision.

If it does not, strengthen the pressure before authoring the skill.

- [ ] **Step 3: Write `SKILL.md`**

Frontmatter:

```yaml
---
name: gliese-layered-map-designer
description: Use when an approved Gliese area brief requires new or changed outdoor routes, thresholds, collision intent, semantic placement zones, or deterministic map-authoring controls.
---
```

Keep the body concise. It must include:

- use/do-not-use triggers;
- new layered vs existing current representation vs frozen classification;
- `layers.regions` as the materialized room-authoring layer for layered sources;
- room/route/collision/control/traversal order;
- HPA-399 whole-map ownership for Meadow Entry;
- missing-contract stop;
- red flags and the actual baseline rationalization.

- [ ] **Step 4: Write `references/outdoor-map-review.md`**

Include the classification table, repository paths, current commands, muted-path checklist, controller traversal checklist, and the rule that a planning graph must materialize into repository IDs.

Do not copy geometry algorithms or coordinate catalogs.

- [ ] **Step 5: Add the Claude symlink**

```sh
ln -s ../../.agents/skills/gliese-layered-map-designer \
  .claude/skills/gliese-layered-map-designer
```

- [ ] **Step 6: Run the scenario with the skill**

Expected decisions:

- classify a new region as the preferred layered path;
- reject the existing coordinate dump as unreviewed input;
- require room labels and stable IDs before art;
- use existing compiler/tests and Meadow Entry whole-map controls when applicable;
- stop rather than write manual control math when the required contract is absent.

Record the concise outcome in the single suite-validation report.

- [ ] **Step 7: Run executable checks**

```sh
bun run test:unit -- --run src/lib/game/content/gliese-world-skills-validator.test.ts
```

Expected: focused tests pass. The repository CLI still reports the other two missing skills.

- [ ] **Step 8: Commit**

```sh
git add .agents/skills/gliese-layered-map-designer \
  .claude/skills/gliese-layered-map-designer \
  docs/superpowers/reports/2026-08-05-hpa-495-map-designer-baseline.md \
  docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md
git commit -m "docs(hpa-495): add layered map designer skill"
```

---

### Task 3: Capture RED and build `gliese-environment-art-producer`

**Files:**
- Create: `docs/superpowers/reports/2026-08-05-hpa-495-environment-art-baseline.md`
- Create: `.agents/skills/gliese-environment-art-producer/SKILL.md`
- Create: `.agents/skills/gliese-environment-art-producer/references/art-map-package-workflow.md`
- Create symlink: `.claude/skills/gliese-environment-art-producer`
- Modify: `docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md`

**Interfaces:**
- Consumes: approved geometry/controls and a supported art-map adapter.
- Produces: correct package lifecycle, provenance requirements, live-object protection, review gates, and fail-closed decisions.

- [ ] **Step 1: Run the fresh-agent baseline without the new skill**

Prompt core:

```text
Generate separate final images for five neighboring outdoor regions now.
Skip the global master and adapter checks; seams and ownership can be repaired
afterward.
```

Capture the first durable image-production decision or explicit stop.

- [ ] **Step 2: Verify the baseline fails**

Require evidence of at least one failure:

- independent regional generation;
- bypassing `art:map-package`;
- baking live/stateful objects;
- inventing provenance or seed values;
- changing geometry during art production;
- modifying the generic dispatcher for an unsupported fixture.

- [ ] **Step 3: Write `SKILL.md`**

Frontmatter:

```yaml
---
name: gliese-environment-art-producer
description: Use when approved Gliese outdoor geometry and controls require a new or revised baked base/foreground package or controlled master refinement.
---
```

Include:

- use/do-not-use triggers;
- sprite/HUD workflow disambiguation;
- approved geometry and supported adapter prerequisites;
- global-master-first rule;
- base/foreground and live-object ownership;
- prompt/manual-production and provenance requirements;
- exact lifecycle order `finalize → review → export → proof → approve → validate`;
- unsupported-adapter and fingerprint-mismatch stops;
- geometry defect routing.

- [ ] **Step 4: Write the art-package reference**

Reference:

```sh
bun run art:map-package -- \
  --adapter art-map-adapters/<map-id>.v1.json \
  --operation <finalize|export|proof|approve|validate>
```

Document manifest roles and review points without reproducing map-specific math.

- [ ] **Step 5: Add the Claude symlink**

```sh
ln -s ../../.agents/skills/gliese-environment-art-producer \
  .claude/skills/gliese-environment-art-producer
```

- [ ] **Step 6: Rerun the baseline and variations**

Also test:

- manual production with no seed;
- unsupported future-map adapter;
- frozen approved exports that should skip the skill;
- request for a sprite sheet that should route to `2d-game-asset-workflow`.

Record outcomes in the single validation report.

- [ ] **Step 7: Run checks and commit**

```sh
bun run test:unit -- --run src/lib/game/content/gliese-world-skills-validator.test.ts

git add .agents/skills/gliese-environment-art-producer \
  .claude/skills/gliese-environment-art-producer \
  docs/superpowers/reports/2026-08-05-hpa-495-environment-art-baseline.md \
  docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md
git commit -m "docs(hpa-495): add environment art producer skill"
```

---

### Task 4: Capture RED and build `gliese-world-expansion`

**Files:**
- Create: `docs/superpowers/reports/2026-08-05-hpa-495-world-expansion-baseline.md`
- Create: `.agents/skills/gliese-world-expansion/SKILL.md`
- Create: `.agents/skills/gliese-world-expansion/references/repository-contracts.md`
- Create: `.agents/skills/gliese-world-expansion/templates/area-expansion-packet.yaml`
- Create: `.agents/skills/gliese-world-expansion/templates/workflow-record.md`
- Create symlink: `.claude/skills/gliese-world-expansion`
- Modify: `CLAUDE.md`
- Modify: `docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md`

**Interfaces:**
- Consumes: genuine multi-concern outdoor request and repository state.
- Produces: approved packet, minimum routing, seven-gate workflow, and explicit unsupported/deferred needs.

- [ ] **Step 1: Run the fresh-agent baseline without the new skill**

Prompt core:

```text
Add a complex guild archive interior now and create whatever reusable interior
skill is needed. Skip waiting for HPA-400 because this is only a hobby project.
```

The desired correction is non-invocation and an HPA-400 stop, not a mostly empty Area Expansion Packet.

- [ ] **Step 2: Verify the baseline fails**

The baseline must attempt at least one of:

- loading/creating an outdoor orchestrator for standalone interior work;
- inventing `gliese-interior-designer`;
- writing interior geometry or art before HPA-400;
- creating a packet as process theater for an isolated request.

- [ ] **Step 3: Write `SKILL.md`**

Frontmatter:

```yaml
---
name: gliese-world-expansion
description: Use when planning or executing a new or revised story-driven Gliese outdoor area that crosses multiple world-content concerns.
---
```

Include:

- exact trigger and bypass counter-examples;
- narrow story intake;
- request classification;
- packet approval before implementation/image generation;
- minimum skill routing;
- seven gates with machine-backed gate handling;
- unsupported need routing;
- workflow record and closure requirements.

- [ ] **Step 4: Write `references/repository-contracts.md`**

Include concise pointers to:

- story manifest/beats and `story:check:strict`;
- current content registries;
- layered/current/frozen geometry classification;
- HPA-399 controls and approvals;
- HPA-496 adapter/manifests and package lifecycle;
- `2d-game-asset-workflow` boundary;
- HPA-400 boundary.

- [ ] **Step 5: Write the packet template**

Use the approved V1 shape. Explicitly document:

- `world.entrances.existing` / `world.exits.existing` use `<map-id>/<transition-id>`;
- `buildings.existing` uses current map IDs;
- `npcs.existing` uses current dialogue IDs;
- planned/required values are not canonical until implemented;
- audio fields stay empty unless explicitly required.

- [ ] **Step 6: Write the workflow template**

Manual gates 1, 2, 5, 6, and 7 include status/reviewer/evidence/deviations/risks.

Gates 3 and 4 include only:

```text
approval module/manifest
validation command
validated commit SHA
result summary
```

- [ ] **Step 7: Add discovery**

```sh
ln -s ../../.agents/skills/gliese-world-expansion \
  .claude/skills/gliese-world-expansion
```

Add a short `CLAUDE.md` section:

```markdown
### World expansion skills

- Multi-concern outdoor area: `gliese-world-expansion`.
- New/changed outdoor geometry: `gliese-layered-map-designer`.
- Baked outdoor base/foreground package: `gliese-environment-art-producer`.
- Dialogue-only: `gliese-story-writer` directly.
- Sprite sheets/HUD assets: `.codex/skills/2d-game-asset-workflow`.
```

- [ ] **Step 8: Rerun routing scenarios**

Required variations:

- dialogue only → story writer only;
- existing NPC placement only → registry/tests directly;
- standalone interior → HPA-400 stop;
- frozen integration → orchestrator may record work, specialists skipped;
- multi-concern new area → packet and relevant specialists;
- audio without runtime contract → record unsupported dependency, do not generate.

Append concise outcomes to the suite-validation report.

- [ ] **Step 9: Run the full validator and commit**

```sh
bun run test:unit -- --run src/lib/game/content/gliese-world-skills-validator.test.ts
bun run skills:validate:gliese-world
```

Expected: PASS.

```sh
git add .agents/skills/gliese-world-expansion \
  .claude/skills/gliese-world-expansion \
  CLAUDE.md \
  docs/superpowers/reports/2026-08-05-hpa-495-world-expansion-baseline.md \
  docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md
git commit -m "docs(hpa-495): add world expansion orchestrator"
```

---

### Task 5: Complete suite verification and publish the implementation PR

**Files:**
- Modify: `docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md`

**Produces:** One reviewable HPA-495 implementation PR that closes the ticket without runtime feature work.

- [ ] **Step 1: Review the behavioral report for all required categories**

The single report must cover:

- pressure: skip room/control structure; skip global master/adapter;
- application: new multi-concern outdoor area;
- variation: dialogue-only, placement-only, manual art with no seed, sprite request;
- missing information: unsupported adapter, missing control contract, audio without runtime contract;
- counter-examples: standalone interior and frozen integration.

For each, record prompt summary, skills available, expected decision, observed decision, verdict, and any minimal skill change. Do not paste full multi-turn transcripts unless needed to explain a failure.

- [ ] **Step 2: Run deterministic checks**

```sh
bun run test:unit -- --run src/lib/game/content/gliese-world-skills-validator.test.ts
bun run skills:validate:gliese-world
bun run story:check:strict
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
bun run art:map-package -- \
  --adapter art-map-adapters/meadow-entry.v1.json \
  --operation validate
bun run check
bun run lint
```

Interpretation:

- skill validator/test: verifies the new suite and future committed packets;
- story strict: story/reference non-regression;
- Meadow Entry commands: existing HPA-399/HPA-496 non-regression smoke only, not field proof of the new specialists;
- check/lint: repository static quality.

- [ ] **Step 3: Run the spec and plan self-review**

Check:

- one real failing baseline precedes each skill;
- every skill has the exact Claude symlink;
- packet validator tests canonical existing references;
- no `scenarios.json`, `verified/` tree, LLM judge, workflow engine, or field-evidence task was introduced;
- gates 3/4 cite machine approvals;
- HPA-406 is described only as downstream consumption;
- packet audio fields forbid invention;
- no placeholder text remains.

- [ ] **Step 4: Commit final evidence**

```sh
git add docs/superpowers/reports/2026-08-05-hpa-495-skill-suite-validation.md
git commit -m "docs(hpa-495): record skill suite validation"
```

- [ ] **Step 5: Open the implementation PR**

Title:

```text
feat(hpa-495): build reusable world expansion skill suite
```

The PR body must state:

- three skills and discovery adapters added;
- validator test correctly lives under `src/`;
- committed packet references are validated;
- three RED baselines and one validation report are committed;
- HPA-406 is downstream and owns its packet/workflow;
- specialist production field proof is deferred to real geometry/art consumers;
- no runtime feature, story content, or art asset changed.

## Plan self-review

- **Spec coverage:** discovery, routing, geometry classification, art lifecycle, packet schema/reference validation, gate ownership, documentation TDD, delivery, and acceptance all map to Tasks 1–5.
- **Executable order:** the validator and its collected Vitest file land before the first skill; every subsequent skill commit runs the focused validator tests.
- **YAGNI:** three baselines, one validation report, one validator, no scenario index or evidence tree, no field-evidence PR.
- **Type consistency:** `PacketReferenceCatalog`, `collectPacketReferenceCatalog`, `collectGlieseWorldSkillErrors`, and `runGlieseWorldSkillValidator` are defined once and reused.
- **No placeholders:** every file, command, interface, and decision boundary is explicit.
