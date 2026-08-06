# HPA-495 Lean Gliese World-Expansion Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one lean, cross-agent `gliese-world-expansion` skill that routes future content work to the correct Gliese authoring source, adjacent skill, and validation command without introducing a second world model or workflow platform.

**Architecture:** Canonical project skills live under `.agents/skills/`; Claude and legacy Codex discovery use symlinks to those canonical directories. `gliese-world-expansion` stays concise and delegates path-heavy guidance to `authoring.md` and command-heavy guidance to `validation.md`. One focused Vitest server test protects named repository paths, package scripts, skill frontmatter, and discovery symlinks from drift.

**Tech Stack:** Markdown agent skills, Git symlinks, TypeScript 6, Vitest 4 server project, Node.js `fs`/`path`, Bun package scripts, Python helper scripts already owned by `2d-game-asset-workflow`.

## Global Constraints

- Execute from a fresh worktree based on `main` after PR #24 merges.
- Deliver one `gliese-world-expansion` skill, one Expansion Brief template, and exactly two references: `authoring.md` and `validation.md`.
- Route map work by owning source: direct `maps.ts` definitions, hand-authored `RegionFragment` composition through `mergeRegions(...)`, or the village-only layered source.
- Keep story prose owned by `gliese-story-writer`.
- Keep generic sprite, prop, sheet, transparency, frame-manifest, and Phaser wiring guidance owned by one canonical `2d-game-asset-workflow` skill.
- Keep collision and live/stateful gameplay data authoritative; backgrounds remain presentation.
- Do not add a YAML packet, packet database, seven-gate workflow, Story Integration Catalog, fingerprint protocol, LLM judge, synthetic scenario corpus, evidence tree, or generic map-art package framework.
- Do not add runtime map content, generated art, a new interior compiler, a dungeon framework, or `LayeredInteriorSource` in this implementation.
- Committed Expansion Briefs use `docs/superpowers/specs/YYYY-MM-DD-<scope>-expansion-brief.md`; this implementation creates only the template, not a consumer brief.
- HPA-406, HPA-400, and HPA-414 remain separate implementation efforts. This plan ships the initial skill they consume; it does not pre-write their content changes or speculate about feedback that has not occurred.

---

## File Structure

### Create

- `.agents/skills/gliese-world-expansion/SKILL.md` — concise trigger, classification, routing, workflow, and handoff rules.
- `.agents/skills/gliese-world-expansion/templates/expansion-brief.md` — reusable eight-section planning template.
- `.agents/skills/gliese-world-expansion/references/authoring.md` — exact source-routing, ownership, story/content, and art handoff reference.
- `.agents/skills/gliese-world-expansion/references/validation.md` — scope-based commands, walkthrough expectations, and failure attribution.
- `.claude/skills/gliese-world-expansion` — symlink to the canonical world-expansion skill.
- `.claude/skills/2d-game-asset-workflow` — symlink to the canonical asset skill.
- `src/lib/game/content/agent-skills.test.ts` — focused server-project integrity test for project skill paths, scripts, frontmatter, symlinks, and stale `CLAUDE.md` map guidance.

### Move and retain as one canonical copy

- Move `.codex/skills/2d-game-asset-workflow/SKILL.md` to `.agents/skills/2d-game-asset-workflow/SKILL.md`.
- Move `.codex/skills/2d-game-asset-workflow/agents/openai.yaml` to `.agents/skills/2d-game-asset-workflow/agents/openai.yaml`.
- Move `.codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py` to `.agents/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py`.
- Move `.codex/skills/2d-game-asset-workflow/scripts/remove_border_background.py` to `.agents/skills/2d-game-asset-workflow/scripts/remove_border_background.py`.
- Replace `.codex/skills/2d-game-asset-workflow` with a symlink to `../../.agents/skills/2d-game-asset-workflow`.

### Modify

- `.agents/skills/2d-game-asset-workflow/SKILL.md` — correct SvelteKit and `static/game/assets/` drift and update helper-script paths to the canonical directory.
- `CLAUDE.md` — correct the false “all regions are layered” claim and document the three source patterns plus project skill routing.
- PR #24 description — link the implementation plan and replace the statement that the plan is still pending.

### Preserve

- `.agents/skills/gliese-story-writer/**` remains unchanged.
- `docs/superpowers/specs/hpa-495-art-map-package-adapter-v1.md` keeps the historical-name notice already added in PR #24.
- `package.json` requires no new script; the focused test runs through the existing `test:unit` command.

---

### Task 1: Canonicalize `2d-game-asset-workflow` for all agents

**Files:**

- Create: `src/lib/game/content/agent-skills.test.ts`
- Move: `.codex/skills/2d-game-asset-workflow/**` → `.agents/skills/2d-game-asset-workflow/**`
- Modify: `.agents/skills/2d-game-asset-workflow/SKILL.md`
- Create symlink: `.codex/skills/2d-game-asset-workflow`
- Create symlink: `.claude/skills/2d-game-asset-workflow`

**Interfaces:**

- Produces canonical directory: `.agents/skills/2d-game-asset-workflow`
- Produces discovery links:
  - `.codex/skills/2d-game-asset-workflow -> ../../.agents/skills/2d-game-asset-workflow`
  - `.claude/skills/2d-game-asset-workflow -> ../../.agents/skills/2d-game-asset-workflow`
- Preserves `agents/openai.yaml` and both Python helper scripts inside the canonical directory.
- Later tasks reference `.agents/skills/2d-game-asset-workflow/SKILL.md` as the single owner of generic 2D asset guidance.

- [ ] **Step 1: Write the failing canonical-discovery test**

Create `src/lib/game/content/agent-skills.test.ts` with the repository helpers and the first test:

```ts
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

function repositoryPath(path: string): string {
	return resolve(repositoryRoot, path);
}

function readRepositoryFile(path: string): string {
	return readFileSync(repositoryPath(path), 'utf8');
}

function expectSymlinkTo(linkPath: string, targetPath: string): void {
	const absoluteLink = repositoryPath(linkPath);
	const absoluteTarget = repositoryPath(targetPath);

	expect(existsSync(absoluteLink)).toBe(true);
	expect(lstatSync(absoluteLink).isSymbolicLink()).toBe(true);
	expect(realpathSync(absoluteLink)).toBe(realpathSync(absoluteTarget));
}

describe('project agent skills', () => {
	it('keeps 2d-game-asset-workflow in one canonical cross-agent directory', () => {
		const canonicalRoot = '.agents/skills/2d-game-asset-workflow';
		const requiredFiles = [
			`${canonicalRoot}/SKILL.md`,
			`${canonicalRoot}/agents/openai.yaml`,
			`${canonicalRoot}/scripts/inspect_png_alpha.py`,
			`${canonicalRoot}/scripts/remove_border_background.py`
		];

		for (const path of requiredFiles) {
			expect(existsSync(repositoryPath(path)), path).toBe(true);
		}

		expectSymlinkTo('.codex/skills/2d-game-asset-workflow', canonicalRoot);
		expectSymlinkTo('.claude/skills/2d-game-asset-workflow', canonicalRoot);

		const skill = readRepositoryFile(`${canonicalRoot}/SKILL.md`);
		expect(skill).toContain('Vite + Svelte');
		expect(skill).toContain('public/game/assets/');
		expect(skill).toContain(
			'.agents/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py'
		);
		expect(skill).not.toContain('SvelteKit');
		expect(skill).not.toContain('static/game/assets/');
	});
});
```

- [ ] **Step 2: Run the focused test and verify the baseline failure**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "keeps 2d-game-asset-workflow"
```

Expected: FAIL because `.agents/skills/2d-game-asset-workflow` and the `.claude` symlink do not exist yet.

- [ ] **Step 3: Move the asset skill and create discovery symlinks**

Run from the repository root:

```bash
mkdir -p .agents/skills .claude/skills
git mv .codex/skills/2d-game-asset-workflow .agents/skills/2d-game-asset-workflow
ln -s ../../.agents/skills/2d-game-asset-workflow .codex/skills/2d-game-asset-workflow
ln -s ../../.agents/skills/2d-game-asset-workflow .claude/skills/2d-game-asset-workflow
```

Verify the tracked shape before editing text:

```bash
git status --short
readlink .codex/skills/2d-game-asset-workflow
readlink .claude/skills/2d-game-asset-workflow
```

Expected symlink target for both links:

```text
../../.agents/skills/2d-game-asset-workflow
```

- [ ] **Step 4: Correct the canonical asset skill text**

In `.agents/skills/2d-game-asset-workflow/SKILL.md`, make these exact replacements:

```diff
-description: Use when generating, regenerating, importing, or wiring 2D game art in this project, especially for sprite sheets, tiles, HUD art, transparent PNG requests, Phaser frame manifests, or replacing placeholder visuals in the SvelteKit plus Phaser game.
+description: Use when generating, regenerating, importing, or wiring 2D game art in this Vite, Svelte, and Phaser project, especially for sprite sheets, tiles, HUD art, transparent PNG requests, frame manifests, or replacing placeholder visuals.
```

```diff
-python3 .codex/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py static/game/assets/starter-pack.png
+python3 .agents/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py public/game/assets/starter-pack.png
```

```diff
-python3 .codex/skills/2d-game-asset-workflow/scripts/remove_border_background.py input.png output.png
+python3 .agents/skills/2d-game-asset-workflow/scripts/remove_border_background.py input.png output.png
```

```diff
-Place runtime art in `static/game/assets/`.
+Place runtime art in `public/game/assets/`.
```

```diff
-- Keep runtime assets under `static/game/assets/`.
+- Keep runtime assets under `public/game/assets/`.
```

Do not rewrite its alpha-removal algorithms, frame-manifest guidance, prompt examples, or Phaser integration workflow.

- [ ] **Step 5: Run the focused test and compile the retained Python helpers**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "keeps 2d-game-asset-workflow"
python3 -m py_compile \
  .agents/skills/2d-game-asset-workflow/scripts/inspect_png_alpha.py \
  .agents/skills/2d-game-asset-workflow/scripts/remove_border_background.py
```

Expected: the Vitest case passes and Python compilation exits `0`.

Remove any generated `__pycache__` directory before committing:

```bash
rm -rf .agents/skills/2d-game-asset-workflow/scripts/__pycache__
```

- [ ] **Step 6: Commit the shared asset-skill migration**

```bash
git add \
  .agents/skills/2d-game-asset-workflow \
  .codex/skills/2d-game-asset-workflow \
  .claude/skills/2d-game-asset-workflow \
  src/lib/game/content/agent-skills.test.ts
git commit -m "refactor: share the 2D asset skill across agents"
```

---

### Task 2: Add the concise world-expansion entry skill and brief template

**Files:**

- Modify: `src/lib/game/content/agent-skills.test.ts`
- Create: `.agents/skills/gliese-world-expansion/SKILL.md`
- Create: `.agents/skills/gliese-world-expansion/templates/expansion-brief.md`
- Create symlink: `.claude/skills/gliese-world-expansion`

**Interfaces:**

- Produces skill name: `gliese-world-expansion`
- Produces classifications:
  - `new-content`
  - `revision`
  - `frozen-integration`
  - `story-only`
  - `placement-only`
  - `asset-only`
  - `unsupported`
- Consumes references created in Task 3:
  - `references/authoring.md`
  - `references/validation.md`
- Delegates prose to `gliese-story-writer` and generic asset work to `2d-game-asset-workflow`.

- [ ] **Step 1: Add a failing test for the world-expansion skill contract**

Append these helpers above the `describe` block in `src/lib/game/content/agent-skills.test.ts`:

```ts
interface SkillFrontmatter {
	name: string;
	description: string;
}

function readSkillFrontmatter(skillPath: string): SkillFrontmatter {
	const markdown = readRepositoryFile(skillPath);
	const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(markdown);
	expect(match, `${skillPath} frontmatter`).not.toBeNull();

	const entries = new Map<string, string>();
	for (const line of match![1].split('\n')) {
		const separator = line.indexOf(':');
		if (separator === -1) continue;
		entries.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
	}

	return {
		name: entries.get('name') ?? '',
		description: entries.get('description') ?? ''
	};
}
```

Append this test inside `describe('project agent skills', ...)`:

```ts
it('defines the lean gliese-world-expansion entry skill', () => {
	const canonicalRoot = '.agents/skills/gliese-world-expansion';
	const requiredFiles = [
		`${canonicalRoot}/SKILL.md`,
		`${canonicalRoot}/templates/expansion-brief.md`,
		`${canonicalRoot}/references/authoring.md`,
		`${canonicalRoot}/references/validation.md`
	];

	for (const path of requiredFiles) {
		expect(existsSync(repositoryPath(path)), path).toBe(true);
	}

	const frontmatter = readSkillFrontmatter(`${canonicalRoot}/SKILL.md`);
	expect(frontmatter.name).toBe('gliese-world-expansion');
	expect(frontmatter.description.startsWith('Use when ')).toBe(true);
	expect(frontmatter.description.length).toBeLessThanOrEqual(500);

	expectSymlinkTo('.claude/skills/gliese-world-expansion', canonicalRoot);
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "defines the lean gliese-world-expansion"
```

Expected: FAIL because the skill files do not exist.

- [ ] **Step 3: Create the skill directory and Claude discovery link**

Run:

```bash
mkdir -p \
  .agents/skills/gliese-world-expansion/references \
  .agents/skills/gliese-world-expansion/templates
ln -s ../../.agents/skills/gliese-world-expansion .claude/skills/gliese-world-expansion
```

- [ ] **Step 4: Create the exact concise `SKILL.md`**

Create `.agents/skills/gliese-world-expansion/SKILL.md` with:

```markdown
---
name: gliese-world-expansion
description: Use when adding or substantially revising Gliese maps, regions, dungeons, interiors, settlements, NPC or encounter placements, or integrating approved world art across multiple gameplay systems.
---

# Gliese World Expansion

Use this skill for multi-concern world content. Keep repository sources and tools authoritative.

## Do Not Use

- Story prose or beat metadata only: use `gliese-story-writer`.
- A small bug fix or placement-only move: edit the owning source and run focused tests.
- A standalone prop, sprite, or sheet: use `2d-game-asset-workflow`.

## Classify First

Choose one: `new-content`, `revision`, `frozen-integration`, `story-only`, `placement-only`, `asset-only`, or `unsupported`.

- `frozen-integration`: consume approved geometry and art; skip redesign and production.
- `unsupported`: record the owning subsystem gap; do not hide it in coordinates, art, prose, or a generic field.

## Required Workflow

1. Read `CLAUDE.md` and classify the request.
2. Use `references/authoring.md` to select the owning source and adjacent skill.
3. Read only relevant story, map, content, asset, and test files.
4. Create or confirm the smallest useful Expansion Brief for genuine multi-concern work.
5. Implement the smallest playable vertical slice.
6. Use `references/validation.md`; feed back only reusable gaps observed in real delivery.

## Boundaries

- Collision, transitions, NPCs, encounters, rewards, evidence, gates, and other stateful objects remain live.
- Base and foreground backgrounds are presentation.
- Do not copy registries, crop tables, fingerprints, proof inventories, or deterministic algorithms into skill prose.
- Do not create a new authoring framework before repeated completed work proves the need.

## Expansion Brief

Use `templates/expansion-brief.md`. Committed briefs follow `docs/superpowers/specs/YYYY-MM-DD-<scope>-expansion-brief.md`. Frozen integration and sufficiently small work may use the PR description instead.
```

- [ ] **Step 5: Create the exact Expansion Brief template**

Create `.agents/skills/gliese-world-expansion/templates/expansion-brief.md` with:

```markdown
# Expansion Brief: <scope>

## Player-facing outcome

State what becomes newly playable or meaningfully improved.

## Story basis

List only the relevant current beats, characters, location purpose, mystery constraints, and spoiler limits. Route prose changes to `gliese-story-writer`.

## Existing content affected

List current map, transition, NPC, dialogue, shop, quest, enemy, encounter, reward, discovery, asset, and save IDs that must remain valid.

## Spatial design

Describe entrances, exits, critical route, optional route, functional zones, gates, encounters, rewards, and interaction approaches before writing coordinates.

## Ownership

State what remains live, what may be baked, what owns collision, and what is stateful.

## Reuse and genuinely new work

Name existing authoring sources, helpers, assets, commands, and adjacent skills. State the smallest new capability actually required.

## Non-goals

List work deliberately excluded from this delivery.

## Acceptance walkthrough

Write the shortest controller route that proves navigation, interactions, transitions, one representative save/reload, and relevant fallback behavior.
```

The literal `<scope>` is intentional template text. Do not commit a filled consumer brief in this task.

- [ ] **Step 6: Add temporary reference stubs so the structural contract can pass**

Create `.agents/skills/gliese-world-expansion/references/authoring.md`:

```markdown
# Authoring Reference

This reference is completed in Task 3.
```

Create `.agents/skills/gliese-world-expansion/references/validation.md`:

```markdown
# Validation Reference

This reference is completed in Task 3.
```

These stubs are allowed only inside this task and must be replaced before the Task 3 commit.

- [ ] **Step 7: Run the focused skill-contract test**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "defines the lean gliese-world-expansion"
```

Expected: PASS.

- [ ] **Step 8: Commit the entry skill and template**

```bash
git add \
  .agents/skills/gliese-world-expansion \
  .claude/skills/gliese-world-expansion \
  src/lib/game/content/agent-skills.test.ts
git commit -m "feat: add the Gliese world-expansion skill entrypoint"
```

---

### Task 3: Implement source routing, validation guidance, and drift detection

**Files:**

- Modify: `src/lib/game/content/agent-skills.test.ts`
- Replace: `.agents/skills/gliese-world-expansion/references/authoring.md`
- Replace: `.agents/skills/gliese-world-expansion/references/validation.md`

**Interfaces:**

- `authoring.md` produces the authoritative navigation contract for:
  - direct `WorldMapDefinition` authoring in `src/lib/game/content/maps.ts`;
  - default hand-authored `RegionFragment` composition through `mergeRegions(...)`;
  - village-only layered authoring through `village-layered.ts`.
- `validation.md` produces the command-selection and walkthrough contract.
- The test scans only world-expansion Markdown for exact repository paths and `bun run <script>` commands.

- [ ] **Step 1: Add failing path and package-script checks**

Add these helpers above the `describe` block in `src/lib/game/content/agent-skills.test.ts`:

```ts
const worldExpansionMarkdownFiles = [
	'.agents/skills/gliese-world-expansion/SKILL.md',
	'.agents/skills/gliese-world-expansion/references/authoring.md',
	'.agents/skills/gliese-world-expansion/references/validation.md',
	'.agents/skills/gliese-world-expansion/templates/expansion-brief.md'
] as const;

function worldExpansionMarkdown(): string {
	return worldExpansionMarkdownFiles.map(readRepositoryFile).join('\n');
}

function referencedRepositoryPaths(markdown: string): string[] {
	const codeFragments = [
		...[...markdown.matchAll(/`([^`\n]+)`/g)].map((match) => match[1]),
		...[...markdown.matchAll(/```(?:[a-z]+)?\n([\s\S]*?)\n```/g)].flatMap((match) =>
			match[1].split('\n')
		)
	];
	const pathPattern = /(?:^|[\s('"=])((?:src|story|tools|public|\.agents|\.claude)\/[A-Za-z0-9_.\-/]+)/g;
	const paths = new Set<string>();

	for (const fragment of codeFragments) {
		for (const match of fragment.matchAll(pathPattern)) {
			paths.add(match[1]);
		}
	}

	return [...paths].sort();
}

function referencedPackageScripts(markdown: string): string[] {
	return [...new Set([...markdown.matchAll(/\bbun run ([a-z0-9:_-]+)/g)].map((match) => match[1]))].sort();
}
```

Add this test inside the existing `describe` block:

```ts
it('keeps world-expansion repository paths and bun scripts resolvable', () => {
	const markdown = worldExpansionMarkdown();
	const referencedPaths = referencedRepositoryPaths(markdown);
	const referencedScripts = referencedPackageScripts(markdown);
	const packageJson = JSON.parse(readRepositoryFile('package.json')) as {
		scripts?: Record<string, string>;
	};

	expect(referencedPaths.length).toBeGreaterThan(0);
	expect(referencedScripts.length).toBeGreaterThan(0);

	for (const path of referencedPaths) {
		expect(existsSync(repositoryPath(path)), path).toBe(true);
	}

	for (const script of referencedScripts) {
		expect(packageJson.scripts?.[script], `package.json script: ${script}`).toBeTypeOf('string');
	}
});
```

- [ ] **Step 2: Run the new check and verify the reference stubs fail the contract**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "keeps world-expansion repository paths"
```

Expected: FAIL because the stubs name no repository paths or package scripts.

- [ ] **Step 3: Replace `authoring.md` with the exact source-routing reference**

Replace `.agents/skills/gliese-world-expansion/references/authoring.md` with:

```markdown
# Gliese World Authoring

Select the owning source before designing coordinates or art. All current paths produce `WorldMapDefinition`, but they are not interchangeable authoring models.

## Source Selection

| Authoring source | Use it for | First stops |
|---|---|---|
| Direct map literal | Current interiors and ruins-style dungeons | `src/lib/game/content/maps.ts`, `src/lib/game/content/maps/types.ts` |
| Hand-authored fragment composition | New or revised Meadow Entry destinations and connectors by default | `src/lib/game/content/maps/regions/types.ts`, the closest file under `src/lib/game/content/maps/regions/`, and `src/lib/game/content/maps/meadow-entry.ts` |
| Village layered source | Existing Sundrop Village tile-level geometry | `src/lib/game/content/maps/regions/village-layered.ts`, `src/lib/game/content/maps/layered/types.ts`, `src/lib/game/content/maps/layered/compile-layered-region.ts` |

## Direct Maps

Current interiors and the ruins are direct definitions in `src/lib/game/content/maps.ts`.

- Start from the closest current map.
- Interiors commonly use NPCs, transitions, `interiorProps`, ambient NPCs, collision, and optional backgrounds.
- Ruins-style maps commonly use ground patches, blockers, encounters, pickups, and transitions.
- Preserve existing IDs and save/arrival semantics.
- Extend `WorldMapDefinition` only when the real map cannot be represented cleanly.
- Do not pre-build an interior compiler, room graph, or dungeon framework.

## Meadow Entry RegionFragments

Crossroads, Coast, Mistfen, Silverpine, Wildwood, and shared connector paths are hand-authored fragments:

```text
src/lib/game/content/maps/regions/crossroads.ts
src/lib/game/content/maps/regions/coast.ts
src/lib/game/content/maps/regions/mistfen.ts
src/lib/game/content/maps/regions/silverpine.ts
src/lib/game/content/maps/regions/wildwood.ts
src/lib/game/content/maps/regions/paths.ts
```

A new fragment is not active until it is imported and included in `mergeRegions(...)` in `src/lib/game/content/maps/meadow-entry.ts`. IDs must be unique across every merged field.

Default to this pattern for another Meadow Entry region or connector. Do not choose the larger layered declaration model merely because it exists.

## Sundrop Village Layered Source

Only Sundrop Village currently uses:

```text
src/lib/game/content/maps/regions/village-layered.ts
src/lib/game/content/maps/layered/compile-layered-region.ts
src/lib/game/content/maps/regions/village.ts
```

Edit `village-layered.ts` for village tile-level geometry. `village.ts` is the thin compiler/background wrapper. Use this path for a future region only after a real delivery demonstrates that tile-level layers are worth the larger source surface.

## Gameplay and Background Ownership

Read `src/lib/game/content/maps/background-ownership.ts` and `src/lib/game/content/maps/types.ts` before changing baked backgrounds.

- Collision remains authoritative independently of art.
- Base and foreground backgrounds are presentation.
- `fallback-only` visuals return when their owning background is unavailable.
- NPCs, transitions, encounters, pickups, rewards, discoveries, evidence, doors, gates, and other stateful content remain live.
- Correct or re-export art rather than moving collision to match an accidental image.

## Story and Content Handoffs

Story prose and beat metadata live in `story/manifest.yaml` and `story/beats/`. Use `gliese-story-writer` for those edits.

Runtime content remains in:

```text
src/lib/game/content/dialogue.ts
src/lib/game/content/shops.ts
src/lib/game/content/quests.ts
src/lib/game/content/enemies.ts
src/lib/game/content/maps.ts
tools/export-story-content-references.ts
```

`dialogue.ts` owns action and intent shells, not prose. NPC placement belongs to the owning map. After story or story-referenced content IDs change, run `bun run story:check`.

Use `::: unsupported-hook` for unsupported story needs, or record the owning runtime gap. Do not hide unsupported behavior in coordinates, art, or dialogue text.

## Art Handoffs

Meadow Entry package work remains map-specific. When its controls or approved package change, use:

```sh
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

Generic props, sprites, sheets, transparency, frame manifests, and Phaser wiring use `.agents/skills/2d-game-asset-workflow/SKILL.md`. Runtime art belongs under `public/game/assets/`; frame metadata belongs in `src/lib/game/content/assets.ts`; Phaser preload and frame use belong in `src/lib/game/phaser/scenes/BootScene.ts` and `src/lib/game/phaser/scenes/WorldScene.ts`.

A new map does not inherit Meadow Entry's adapter, crop contract, provenance inventory, or approval machinery. Record the concrete need and build only the smallest asset path the real map requires.
```

- [ ] **Step 4: Replace `validation.md` with the exact command and walkthrough reference**

Replace `.agents/skills/gliese-world-expansion/references/validation.md` with:

```markdown
# Gliese World Validation

Choose checks from the touched scope. Do not create an evidence matrix.

## Focused Commands

Skill routing or references:

```sh
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
```

Map definitions, transitions, encounters, shops, or content IDs:

```sh
bun run test:unit -- --run src/lib/game/content/maps.test.ts
```

Renderer, background planes, preload, or Phaser world behavior:

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Story prose, beat metadata, or story-referenced content IDs:

```sh
bun run story:check
```

Meadow Entry controls or art package:

```sh
bun run art:validate:meadow-entry-controls
bun run art:validate:meadow-entry
```

Repository checks:

```sh
bun run check
bun run lint
```

Use `bun run build` when browser bundling or runtime assets change. Use `bun run build:tauri` when the Tauri story boundary or release asset path changes.

## Controller Walkthrough

Derive one shortest route from the Expansion Brief. Cover only relevant behavior:

1. enter through the intended spawn or transition;
2. traverse every new critical zone and one optional route;
3. approach each changed NPC, shop, quest object, encounter, reward, door, or discovery;
4. cross every changed transition in both directions;
5. perform one representative save/reload when save position or progression is affected;
6. exercise one representative missing-background fallback when background ownership changes;
7. run one normal web session and one packaged Tauri session when the delivered scope requires both.

## Failure Ownership

- Story text, beat metadata, or generated references: story owner.
- Route, blocker, transition, or collision mismatch: map geometry owner.
- Loading, depth, fallback, or scene behavior: runtime renderer owner.
- Meadow Entry crop/master/export mismatch: Meadow Entry art-package owner.
- Generic sprite alpha, sheet layout, frame metadata, or preload mismatch: `2d-game-asset-workflow` owner.

Fix the defect at its owner. Do not add a translation layer, duplicate source, or broad framework to hide it.
```

- [ ] **Step 5: Run the path/script test and all project-skill tests**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "keeps world-expansion repository paths"
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
```

Expected: PASS. The path/script test must report at least one referenced path and at least one referenced package script.

- [ ] **Step 6: Commit the routing and validation references**

```bash
git add \
  .agents/skills/gliese-world-expansion/references/authoring.md \
  .agents/skills/gliese-world-expansion/references/validation.md \
  src/lib/game/content/agent-skills.test.ts
git commit -m "docs: encode Gliese world authoring routes"
```

---

### Task 4: Correct repository guidance and complete verification

**Files:**

- Modify: `CLAUDE.md`
- Modify: `src/lib/game/content/agent-skills.test.ts`
- Modify after implementation: PR description only

**Interfaces:**

- `CLAUDE.md` becomes the top-level routing summary.
- `gliese-world-expansion/references/authoring.md` remains the detailed path owner.
- The regression test prevents the stale all-layered description from returning.

- [ ] **Step 1: Add a failing test for the corrected top-level map guidance**

Append this test inside `describe('project agent skills', ...)`:

```ts
it('documents the actual map authoring sources in CLAUDE.md', () => {
	const guidance = readRepositoryFile('CLAUDE.md');

	expect(guidance).toContain('hand-authored `RegionFragment`');
	expect(guidance).toContain('`mergeRegions(...)`');
	expect(guidance).toContain('`village-layered.ts`');
	expect(guidance).toContain('`gliese-world-expansion`');
	expect(guidance).toContain('`2d-game-asset-workflow`');
	expect(guidance).not.toContain('regions/ (layered overworld) built');
	expect(guidance).not.toContain('The overworld beyond the hub is authored as **layered regions**');
});
```

- [ ] **Step 2: Run the new test and verify it fails against current guidance**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "documents the actual map authoring sources"
```

Expected: FAIL because `CLAUDE.md` still describes every outdoor region as layered and does not name the two new/shared skills.

- [ ] **Step 3: Correct the top-level layout description**

Replace this `CLAUDE.md` top-level layout fragment:

```text
content/     Static game definitions (assets, dialogue, enemies, items, player, quests, shops)
  maps/      meadow-entry + interiors (maps.ts), plus regions/ (layered overworld) built
             through layered/compile-layered-region.ts
```

with:

```text
content/     Static game definitions (assets, dialogue, enemies, items, player, quests, shops)
  maps/      direct maps in maps.ts plus the meadow-entry composition
    regions/ hand-authored RegionFragment modules; village.ts alone wraps village-layered.ts
    layered/ the village tile-layer compiler and related authoring helpers
```

- [ ] **Step 4: Replace the stale Maps paragraph with source-accurate guidance**

Replace the existing `### Content / Data Model` Maps bullet with:

```markdown
- **Maps**: `meadow-entry` is the hub, with interior maps (`hero-house`, `guild-hall`, `item-shop`, `villager-house-1/2/3`, `shrine-of-aurora-interior`) and the dungeon chain `ruins-threshold` → `ruins-core`. Interiors and ruins are direct `WorldMapDefinition` literals in `src/lib/game/content/maps.ts`. Most Meadow Entry destinations and connectors are hand-authored `RegionFragment` modules under `content/maps/regions/` and become active only when imported and included in `mergeRegions(...)` in `content/maps/meadow-entry.ts`. Sundrop Village is the one layered exception: edit `village-layered.ts`; `village.ts` is its thin compiler/background wrapper.
```

- [ ] **Step 5: Add a concise Project Skills section**

Add this section immediately before `### Repo-level docs`:

```markdown
### Project skills

- Use `gliese-world-expansion` for substantial multi-concern map, region, dungeon, interior, NPC/encounter, or approved world-art integration work. It routes by owning source and uses a brief only when the scope warrants one.
- Use `gliese-story-writer` for story prose and beat metadata.
- Use `2d-game-asset-workflow` for generic props, sprites, sheets, transparency, frame manifests, and Phaser asset wiring.
```

Do not duplicate the full world-expansion routing table in `CLAUDE.md`.

- [ ] **Step 6: Run the focused guidance test**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts -t "documents the actual map authoring sources"
```

Expected: PASS.

- [ ] **Step 7: Run complete implementation verification**

Run:

```bash
bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts
bun run check
bun run lint
```

Expected: all commands pass.

A browser or Tauri build is not required for this initial skill PR because it changes Markdown, symlinks, and a Node-environment test only. Do not claim HPA-406, HPA-400, HPA-414, greenfield outdoor, or dungeon behavior has been validated here.

- [ ] **Step 8: Inspect the final tracked file shape**

Run:

```bash
git status --short
git diff --check
find .agents/skills/gliese-world-expansion -maxdepth 3 -type f -print | sort
find .agents/skills/2d-game-asset-workflow -maxdepth 3 -type f -print | sort
readlink .claude/skills/gliese-world-expansion
readlink .claude/skills/2d-game-asset-workflow
readlink .codex/skills/2d-game-asset-workflow
```

Expected:

- four world-expansion files;
- canonical asset `SKILL.md`, `agents/openai.yaml`, and two scripts;
- all three symlinks resolve through `../../.agents/skills/...`;
- no `__pycache__`, copied `.codex` directory, or `docs/world-expansion/` tree.

- [ ] **Step 9: Commit repository guidance and verification**

```bash
git add CLAUDE.md src/lib/game/content/agent-skills.test.ts
git commit -m "docs: route agents through current Gliese authoring sources"
```

- [ ] **Step 10: Open the implementation PR and record exact validation**

Open a new draft implementation PR from the execution branch to `main`. Do not implement on the design/plan branch.

Use this PR summary structure:

```markdown
## Summary

- add the lean cross-agent `gliese-world-expansion` skill
- route direct maps, hand-authored RegionFragments, and the village layered source correctly
- canonicalize `2d-game-asset-workflow` under `.agents/skills/`
- correct stale repository map and asset guidance
- add focused path/script/frontmatter/symlink verification

## Validation

- `bun run test:unit -- --run src/lib/game/content/agent-skills.test.ts`
- `bun run check`
- `bun run lint`

## Scope boundary

- no runtime map content or generated art
- no greenfield region/dungeon behavioral claim
- consumer validation remains HPA-406, HPA-400, and HPA-414 Batch 1

Linear: HPA-495
```

---

## Post-Merge Consumer Handoff

After the initial implementation PR merges:

1. HPA-406 and HPA-400 may start in parallel.
2. HPA-406 exercises `frozen-integration`; it must not redesign approved geometry or art.
3. HPA-400 exercises direct `maps.ts` authoring and generic asset handoff. It edits `village-layered.ts` only when the exterior seam naturally changes.
4. HPA-414 Batch 1 follows HPA-400 and tests direct-map guidance across home, shop, and shrine content.
5. Skill edits in consumer PRs are limited to concrete reusable routing gaps found during that delivery.
6. Greenfield `RegionFragment` and new-dungeon guidance remain explicitly unproven until a real future delivery uses them.

The later final validation note belongs under:

```text
docs/superpowers/specs/YYYY-MM-DD-hpa-495-world-expansion-skill-validation.md
```

Do not create that note during the initial implementation; it must summarize actual HPA-406, HPA-400, and HPA-414 Batch 1 observations rather than predictions.

---

## Plan Self-Review

- **Spec coverage:** The plan covers the two-reference skill, Expansion Brief template, three authoring-source routes, story and art handoffs, shared asset-skill migration, stale `CLAUDE.md` correction, focused mechanical validation, symlink discovery, and consumer sequencing.
- **Scope containment:** Runtime content, art generation, generic map infrastructure, and speculative consumer feedback are excluded.
- **Test strategy:** Every implementation task introduces a failing focused test before the corresponding files or guidance are added, then runs the narrow test to green before committing.
- **Type consistency:** Test helper names and paths remain consistent across all tasks: `repositoryPath`, `readRepositoryFile`, `expectSymlinkTo`, `readSkillFrontmatter`, `worldExpansionMarkdown`, `referencedRepositoryPaths`, and `referencedPackageScripts`.
- **No placeholders:** `<scope>` and `YYYY-MM-DD-<scope>` appear only as intentional user-facing template syntax, not as missing implementation decisions.
