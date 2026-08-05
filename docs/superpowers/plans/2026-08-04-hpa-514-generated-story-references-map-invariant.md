# HPA-514 Generated Story References and Map Invariant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace copied Rust story-reference arrays with deterministic TypeScript-derived Rust generation, validate each beat's `(map, primaryNpc)` placement, and enforce the existing map-local NPC invariant at the Tauri dialogue boundary.

**Architecture:** A Bun CLI executes the authoritative TypeScript registries and renders `src-tauri/src/story/reference.rs` directly, reusing the repository's committed generated-Rust pattern instead of adding JSON or Serde. The current NPC-first Rust catalog remains; `NpcStoryDialogue` gains one `beat_id` and `map_id`, and Tauri verifies the request map before applying the unchanged branch-priority logic.

**Tech Stack:** Bun, TypeScript 6, Vitest 4 node project, Rust 1.77.2, Serde, Tauri 2, Cargo.

## Global Constraints

- Deliver all implementation work in one implementation PR after the design PR is approved.
- Preserve the Markdown → Rust → Tauri prose-secrecy boundary.
- Do not add a JSON content catalog, Serde adapter, Story Integration Catalog, fingerprint, requirement directive, HPA-495 story input, or Area Expansion Packet support.
- Do not change story Markdown, dialogue prose, `StoryDialogueRequest`, `StoryDialogueResponse`, quest-summary booleans, branch names, branch priority, intent variants, session IDs, `MapNpc`, or save data.
- Generate only map, NPC, quest, shop, enemy IDs and `(mapId, dialogueId)` NPC placements.
- Treat wrong-map rejection as command-boundary invariant hardening; normal `WorldScene` interactions must remain unchanged.
- Keep the current NPC-first runtime catalog. Reject multi-beat or multi-map reuse of one story NPC instead of generalizing the runtime model.
- Draft generation writes atomically. Strict freshness checks perform no writes.
- Follow TDD for every behavior change: red test, confirm failure, minimal implementation, confirm pass, commit.

---

## File Structure

### Create

- `tools/export-story-content-references.ts` — collect current TypeScript-owned IDs/placements, render deterministic Rust, and implement write/`--check` behavior.
- `src/lib/game/content/story-content-references-export.test.ts` — node-side Vitest coverage for rendering, duplicate rejection, escaping, exact-byte checks, and atomic publication.

### Modify

- `package.json` — prepend the exporter to the existing draft and strict story commands.
- `src-tauri/src/story/reference.rs` — generated Rust output; never hand-edit after the exporter lands.
- `src-tauri/src/story/check.rs` — consume `NPC_PLACEMENTS`, retain beat source paths, and validate `(map, primaryNpc)`.
- `src-tauri/src/story/types.rs` — add `beat_id` and `map_id` once to `NpcStoryDialogue`.
- `src-tauri/src/story/compiler.rs` — accumulate one beat/map identity per NPC and reject conflicting reuse.
- `src-tauri/src/story/codegen.rs` — emit the two new group fields.
- `src-tauri/src/story/generated.rs` — regenerate through `bun run story:check`; never edit directly.
- `src-tauri/src/story/commands.rs` — enforce the exact map invariant before current branch selection.

### Intentionally unchanged

- `story/manifest.yaml` and `story/beats/**/*.md`.
- `src/lib/game/content/maps/types.ts` and the `MapNpc` shape.
- Story client request/response adapters and save schemas.
- `story/reports/story-integration-report.md` format.
- HPA-495 art-map adapter files.

---

### Task 1: Generate `reference.rs` directly from TypeScript content

**Files:**
- Create: `tools/export-story-content-references.ts`
- Create: `src/lib/game/content/story-content-references-export.test.ts`
- Modify: `package.json`
- Modify (generated): `src-tauri/src/story/reference.rs`

**Interfaces:**

```ts
export interface StoryContentReferences {
	readonly mapIds: readonly string[];
	readonly npcIds: readonly string[];
	readonly questIds: readonly string[];
	readonly shopIds: readonly string[];
	readonly enemyIds: readonly string[];
	readonly npcPlacements: readonly (readonly [mapId: string, dialogueId: string])[];
}

export function collectStoryContentReferences(): StoryContentReferences;
export function normalizeStoryContentReferences(
	input: StoryContentReferences
): StoryContentReferences;
export function renderStoryContentReferences(input: StoryContentReferences): string;
export function syncGeneratedStoryContentReferences(
	source: string,
	destinationPath: string,
	check: boolean
): void;
export function runStoryContentReferenceExporter(
	args: readonly string[],
	repositoryRoot?: string
): void;
```

Generated Rust contract:

```rust
pub const MAP_IDS: &[&str];
pub const NPC_IDS: &[&str];
pub const QUEST_IDS: &[&str];
pub const SHOP_IDS: &[&str];
pub const ENEMY_IDS: &[&str];
pub const NPC_PLACEMENTS: &[(&str, &str)];
```

- [ ] **Step 1: Write failing renderer, escaping, and duplicate tests**

Create `src/lib/game/content/story-content-references-export.test.ts`:

```ts
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
	collectStoryContentReferences,
	normalizeStoryContentReferences,
	renderStoryContentReferences,
	syncGeneratedStoryContentReferences,
	type StoryContentReferences
} from '../../../../tools/export-story-content-references';

const temporaryRoots: string[] = [];
const FIXTURE: StoryContentReferences = {
	mapIds: ['z-map', 'a-map'],
	npcIds: ['npc-z', 'npc-a'],
	questIds: ['quest-z', 'quest-a'],
	shopIds: ['shop-z', 'shop-a'],
	enemyIds: ['enemy-z', 'enemy-a'],
	npcPlacements: [
		['z-map', 'npc-z'],
		['a-map', 'npc-a']
	]
};

afterEach(() => {
	for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('story content reference generation', () => {
	it('renders sorted deterministic Rust with a generated header', () => {
		const source = renderStoryContentReferences(FIXTURE);
		expect(source).toMatch(
			/^\/\/ @generated by tools\/export-story-content-references\.ts\. Do not edit by hand\./
		);
		expect(source.indexOf('"a-map"')).toBeLessThan(source.indexOf('"z-map"'));
		expect(source.indexOf('("a-map", "npc-a")')).toBeLessThan(
			source.indexOf('("z-map", "npc-z")')
		);
		expect(source).toContain('pub const NPC_PLACEMENTS: &[(&str, &str)] = &[');
		expect(source.endsWith('\n')).toBe(true);
		expect(source.endsWith('\n\n')).toBe(false);
		expect(renderStoryContentReferences(FIXTURE)).toBe(source);
	});

	it('escapes Rust string literals', () => {
		const source = renderStoryContentReferences({
			...FIXTURE,
			mapIds: ['map\\path'],
			npcIds: ['npc"quoted'],
			npcPlacements: [['map\\path', 'npc"quoted']]
		});
		expect(source).toContain('"map\\\\path"');
		expect(source).toContain('"npc\\"quoted"');
	});

	it('rejects duplicate IDs and placements', () => {
		expect(() =>
			normalizeStoryContentReferences({ ...FIXTURE, mapIds: ['same', 'same'] })
		).toThrow(/duplicate map id same/);
		expect(() =>
			normalizeStoryContentReferences({
				...FIXTURE,
				npcPlacements: [
					['guild-hall', 'guild-master'],
					['guild-hall', 'guild-master']
				]
			})
		).toThrow(/duplicate npc placement guild-hall\/guild-master/);
	});
});
```

- [ ] **Step 2: Run the focused test and confirm the red state**

```bash
bun run test:unit -- --run src/lib/game/content/story-content-references-export.test.ts
```

Expected: FAIL because `tools/export-story-content-references.ts` does not exist.

- [ ] **Step 3: Implement registry collection and normalization**

Start `tools/export-story-content-references.ts` with:

```ts
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { npcDialogueList } from '../src/lib/game/content/dialogue';
import { enemies } from '../src/lib/game/content/enemies';
import { maps } from '../src/lib/game/content/maps';
import { questList } from '../src/lib/game/content/quests';
import { shopList } from '../src/lib/game/content/shops';
```

Use this uniqueness helper for each ID list:

```ts
function sortedUnique(label: string, values: readonly string[]): readonly string[] {
	const sorted = [...values].sort();
	for (let index = 1; index < sorted.length; index += 1) {
		if (sorted[index] === sorted[index - 1]) {
			throw new Error(`duplicate ${label} ${sorted[index]}`);
		}
	}
	return sorted;
}
```

Normalize placements lexicographically by map then dialogue ID and reject an adjacent duplicate with:

```ts
throw new Error(`duplicate npc placement ${mapId}/${dialogueId}`);
```

Collect only the locked V1 surface:

```ts
export function collectStoryContentReferences(): StoryContentReferences {
	const mapList = Object.values(maps);
	return normalizeStoryContentReferences({
		mapIds: mapList.map((map) => map.id),
		npcIds: npcDialogueList.map((dialogue) => dialogue.id),
		questIds: questList.map((quest) => quest.id),
		shopIds: shopList.map((shop) => shop.id),
		enemyIds: Object.values(enemies).map((enemy) => enemy.id),
		npcPlacements: mapList.flatMap((map) =>
			(map.npcs ?? []).map((npc) => [map.id, npc.dialogueId] as const)
		)
	});
}
```

- [ ] **Step 4: Implement deterministic Rust rendering**

Escape strings exactly:

```ts
function rustString(value: string): string {
	return `"${value
		.replaceAll('\\', '\\\\')
		.replaceAll('"', '\\"')
		.replaceAll('\n', '\\n')
		.replaceAll('\r', '\\r')
		.replaceAll('\t', '\\t')}"`;
}
```

Render each ID list as:

```rust
pub const MAP_IDS: &[&str] = &[
    "first-id",
    "second-id",
];
```

Render placements as:

```rust
pub const NPC_PLACEMENTS: &[(&str, &str)] = &[
    ("guild-hall", "guild-master"),
];
```

The full file starts with exactly:

```text
// @generated by tools/export-story-content-references.ts. Do not edit by hand.
```

It ends with exactly one newline. Do not emit source paths, coordinates, transitions, encounters, presentation data, prose, or art metadata.

- [ ] **Step 5: Run the renderer tests and confirm green**

```bash
bun run test:unit -- --run src/lib/game/content/story-content-references-export.test.ts
```

Expected: the renderer, escaping, and duplicate tests PASS.

- [ ] **Step 6: Add failing exact-byte, collection, and atomic-write tests**

Append:

```ts
it('checks exact bytes without writing missing or stale output', () => {
	const root = mkdtempSync(join(tmpdir(), 'gliese-story-references-'));
	temporaryRoots.push(root);
	const destination = join(root, 'reference.rs');
	const source = renderStoryContentReferences(FIXTURE);

	expect(() => syncGeneratedStoryContentReferences(source, destination, true)).toThrow(
		/generated story references are missing/
	);
	writeFileSync(destination, 'stale\n');
	expect(() => syncGeneratedStoryContentReferences(source, destination, true)).toThrow(
		/generated story references are stale/
	);
	expect(readFileSync(destination, 'utf8')).toBe('stale\n');
});

it('publishes complete output and passes exact-byte check mode', () => {
	const root = mkdtempSync(join(tmpdir(), 'gliese-story-references-'));
	temporaryRoots.push(root);
	const destination = join(root, 'nested', 'reference.rs');
	const source = renderStoryContentReferences(FIXTURE);

	syncGeneratedStoryContentReferences(source, destination, false);
	expect(readFileSync(destination, 'utf8')).toBe(source);
	expect(() => syncGeneratedStoryContentReferences(source, destination, true)).not.toThrow();
});

it('does not replace an existing destination when publication fails', () => {
	const root = mkdtempSync(join(tmpdir(), 'gliese-story-references-'));
	temporaryRoots.push(root);
	const destination = join(root, 'reference.rs');
	// Make the destination an existing non-empty directory so renameSync fails
	// with ENOTEMPTY after the temporary file has been written but before the
	// destination is replaced.
	mkdirSync(destination);
	writeFileSync(join(destination, 'marker'), 'previous\n');
	const source = renderStoryContentReferences(FIXTURE);

	expect(() => syncGeneratedStoryContentReferences(source, destination, false)).toThrow();

	// Original destination content is preserved.
	expect(readFileSync(join(destination, 'marker'), 'utf8')).toBe('previous\n');
	// The temporary file is cleaned up: no `.tmp` siblings remain under root.
	expect(readdirSync(root).filter((name) => name.endsWith('.tmp'))).toEqual([]);
});

it('collects the current authoritative registries', () => {
	const references = collectStoryContentReferences();
	expect(references.mapIds).toContain('guild-hall');
	expect(references.npcIds).toContain('guild-master');
	expect(references.questIds).toContain('investigate-the-ruins');
	expect(references.shopIds).toContain('miras-item-shop');
	expect(references.enemyIds).toContain('ruins-warden');
	expect(references.npcPlacements).toContainEqual(['guild-hall', 'guild-master']);
});
```

- [ ] **Step 7: Run the focused test and confirm the new red state**

```bash
bun run test:unit -- --run src/lib/game/content/story-content-references-export.test.ts
```

Expected: FAIL because file synchronization is not implemented.

- [ ] **Step 8: Implement write and `--check` behavior**

Use no writes in check mode:

```ts
export function syncGeneratedStoryContentReferences(
	source: string,
	destinationPath: string,
	check: boolean
): void {
	if (check) {
		if (!existsSync(destinationPath)) {
			throw new Error(`generated story references are missing: ${destinationPath}`);
		}
		if (readFileSync(destinationPath, 'utf8') !== source) {
			throw new Error(`generated story references are stale: ${destinationPath}`);
		}
		return;
	}

	mkdirSync(dirname(destinationPath), { recursive: true });
	const temporaryPath = `${destinationPath}.${process.pid}.${randomUUID()}.tmp`;
	try {
		writeFileSync(temporaryPath, source, { encoding: 'utf8', flag: 'wx' });
		renameSync(temporaryPath, destinationPath);
	} finally {
		if (existsSync(temporaryPath)) rmSync(temporaryPath);
	}
}
```

Accept only zero arguments or `--check`:

```ts
function parseCheckMode(args: readonly string[]): boolean {
	if (args.length === 0) return false;
	if (args.length === 1 && args[0] === '--check') return true;
	throw new Error('Usage: bun tools/export-story-content-references.ts [--check]');
}
```

Implement the CLI:

```ts
export function runStoryContentReferenceExporter(
	args: readonly string[],
	repositoryRoot = process.cwd()
): void {
	const check = parseCheckMode(args);
	const destination = resolve(repositoryRoot, 'src-tauri/src/story/reference.rs');
	const source = renderStoryContentReferences(collectStoryContentReferences());
	syncGeneratedStoryContentReferences(source, destination, check);
	console.log(check ? 'story content references are current' : 'wrote story content references');
}

if (import.meta.main) runStoryContentReferenceExporter(process.argv.slice(2));
```

- [ ] **Step 9: Run all exporter tests**

```bash
bun run test:unit -- --run src/lib/game/content/story-content-references-export.test.ts
```

Expected: all exporter tests PASS.

- [ ] **Step 10: Wire the existing story commands and generate the Rust file**

Replace only the two scripts in `package.json`:

```json
"story:check": "bun tools/export-story-content-references.ts && cargo run --manifest-path src-tauri/Cargo.toml --bin story_check -- --mode=draft --write-report --write-generated",
"story:check:strict": "bun tools/export-story-content-references.ts --check && cargo run --manifest-path src-tauri/Cargo.toml --bin story_check -- --mode=strict --check-generated"
```

Run:

```bash
bun tools/export-story-content-references.ts
bun tools/export-story-content-references.ts --check
bun run story:check
bun run story:check:strict
```

Expected:
- `reference.rs` starts with the generated header.
- Existing five ID sets contain the same current IDs in sorted order.
- `NPC_PLACEMENTS` contains current `(mapId, dialogueId)` pairs.
- Check mode does not modify the file.
- Both story commands PASS.

- [ ] **Step 11: Commit the exporter slice**

```bash
git add tools/export-story-content-references.ts \
  src/lib/game/content/story-content-references-export.test.ts \
  package.json \
  src-tauri/src/story/reference.rs
git commit -m "build(story): generate Rust content references"
```

---

### Task 2: Validate `(map, primaryNpc)` against generated placements

**Files:**
- Modify: `src-tauri/src/story/check.rs:1-12`
- Modify: `src-tauri/src/story/check.rs:190-238`
- Modify: `src-tauri/src/story/check.rs:293-335`
- Test: `src-tauri/src/story/check.rs` inline test module

**Interfaces:**
- Consumes: `NPC_PLACEMENTS: &[(&str, &str)]` from generated `reference.rs`.
- Produces: placement validation inside `validate_beat_content_references` with beat-file diagnostics.
- Preserves: all current unknown-ID errors.

- [ ] **Step 1: Write the failing placement-mismatch test**

Add to `story::check::tests`:

```rust
#[test]
fn rejects_primary_npc_not_placed_on_declared_map() {
    let manifest_source = r#"
id: sundrop-ruins
title: Sundrop Ruins
entryBeat: prologue.guild-master
defaultLocale: en
chapters:
  - id: prologue
    title: Prologue
    beats:
      - id: prologue.guild-master
        file: beats/prologue/guild-master.md
requiredContent:
  maps: [item-shop]
  npcs: [guild-master]
"#
    .to_string();
    let beat_source = r#"# Guild Master

::: story
id: prologue.guild-master
chapter: prologue
map: item-shop
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: always
speaker: Guild Master Arlen
choices: quest
:::

Take this work.
"#
    .to_string();

    let error = check_story_package_sources(
        CheckMode::Draft,
        manifest_source,
        vec![(
            "beats/prologue/guild-master.md".to_string(),
            "prologue.guild-master".to_string(),
            beat_source,
        )],
    )
    .unwrap_err()
    .to_string();

    assert!(error.contains("beats/prologue/guild-master.md"));
    assert!(error.contains("beat prologue.guild-master"));
    assert!(error.contains("primaryNpc guild-master"));
    assert!(error.contains("not placed on map item-shop"));
}
```

- [ ] **Step 2: Run the exact test and confirm the red state**

```bash
cargo test --manifest-path src-tauri/Cargo.toml \
  story::check::tests::rejects_primary_npc_not_placed_on_declared_map -- --exact
```

Expected: FAIL because map and NPC are currently checked independently.

- [ ] **Step 3: Retain parsed beat source paths**

Change the import:

```rust
use std::collections::{BTreeSet, HashMap, HashSet};
```

In `check_story_package_sources`, add `beat_source_paths: HashMap<String, String>`. After a successful parse and ID-mismatch diagnostic, insert:

```rust
beat_source_paths.insert(beat.id.clone(), path);
beats.push(beat);
```

Pass `&beat_source_paths` to `validate_beat_content_references`.

- [ ] **Step 4: Implement placement validation without duplicate unknown-ID noise**

Import:

```rust
use super::reference::{ENEMY_IDS, MAP_IDS, NPC_IDS, NPC_PLACEMENTS, QUEST_IDS, SHOP_IDS};
```

Use this signature:

```rust
fn validate_beat_content_references(
    beats: &[StoryBeat],
    source_paths: &HashMap<String, String>,
) -> Vec<String>
```

Build `maps`, `npcs`, and `placements` `HashSet`s once. Add the pair diagnostic only when both individual IDs are already known:

```rust
let map_known = maps.contains(beat.map_id.as_str());
let primary_npc_known = npcs.contains(beat.primary_npc_id.as_str());
if map_known
    && primary_npc_known
    && !placements.contains(&(beat.map_id.as_str(), beat.primary_npc_id.as_str()))
{
    let source_prefix = source_paths
        .get(&beat.id)
        .map(|path| format!("{}: ", path))
        .unwrap_or_default();
    errors.push(format!(
        "{}beat {} primaryNpc {} is not placed on map {}",
        source_prefix, beat.id, beat.primary_npc_id, beat.map_id
    ));
}
```

Continue validating dialogue-block NPC IDs through `NPC_IDS` only; do not add dialogue placement rules in this ticket.

- [ ] **Step 5: Run focused checker tests**

```bash
cargo test --manifest-path src-tauri/Cargo.toml \
  story::check::tests::rejects_primary_npc_not_placed_on_declared_map -- --exact
cargo test --manifest-path src-tauri/Cargo.toml story::check::tests
```

Expected: both commands PASS and current unknown-reference behavior remains intact.

- [ ] **Step 6: Validate the real package in draft and strict modes**

```bash
bun run story:check
bun run story:check:strict
```

Expected: both commands PASS, proving every current beat's primary NPC is placed on its declared map.

- [ ] **Step 7: Commit placement validation**

```bash
git add src-tauri/src/story/check.rs
git commit -m "feat(story): validate primary NPC map placement"
```

---

### Task 3: Retain one beat and map identity per NPC dialogue group

**Files:**
- Modify: `src-tauri/src/story/types.rs:10-16`
- Modify: `src-tauri/src/story/compiler.rs:1-38`
- Modify: `src-tauri/src/story/codegen.rs:30-52`
- Modify (generated): `src-tauri/src/story/generated.rs`
- Test: inline modules in `types.rs`, `compiler.rs`, and `codegen.rs`

**Interfaces:**

```rust
pub struct NpcStoryDialogue {
    pub npc_id: String,
    pub beat_id: String,
    pub map_id: String,
    pub branches: Vec<StoryDialogueBranch>,
}
```

All dialogue blocks grouped under one `npc_id` must come from exactly one beat ID and one map ID.

- [ ] **Step 1: Add failing type and serialization expectations**

In the existing `NpcStoryDialogue` fixture in `types.rs`, insert immediately after `npc_id`:

```rust
beat_id: "prologue.guild-master".to_string(),
map_id: "guild-hall".to_string(),
```

Add:

```rust
assert_eq!(value["npcDialogues"][0]["beatId"], "prologue.guild-master");
assert_eq!(value["npcDialogues"][0]["mapId"], "guild-hall");
```

- [ ] **Step 2: Add failing compiler metadata and conflict tests**

In `compiles_quest_choice_and_record_talk_intent`, add:

```rust
assert_eq!(guild.beat_id, "prologue.guild-master");
assert_eq!(guild.map_id, "guild-hall");
```

Add:

```rust
#[test]
fn rejects_one_npc_across_multiple_beats_or_maps() {
    let first = crate::story::beat::parse_beat_markdown(
        r#"# First

::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: always
speaker: Guild Master Arlen
choices: quest
:::

First.
"#,
    )
    .unwrap();
    let second = crate::story::beat::parse_beat_markdown(
        r#"# Second

::: story
id: prologue.guild-master-followup
chapter: prologue
map: item-shop
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: guildBriefingComplete
speaker: Guild Master Arlen
choices: quest
:::

Second.
"#,
    )
    .unwrap();

    let error = compile_catalog("sundrop-ruins", "en", &[first, second])
        .unwrap_err();
    assert!(error.contains("guild-master"));
    assert!(error.contains("prologue.guild-master@guild-hall"));
    assert!(error.contains("prologue.guild-master-followup@item-shop"));
    assert!(error.contains("separate runtime model"));
}
```

Rewrite `groups_dialogues_by_npc_in_deterministic_order` so its two Guild Master branches are two dialogue directives in one Guild Master beat, while Mira comes from a separate Mira beat. The test must no longer merge one NPC across two beat IDs.

- [ ] **Step 3: Add failing code-generation expectations**

In the existing codegen test fixture, insert after `npc_id`:

```rust
beat_id: "prologue.guild-master".to_string(),
map_id: "guild-hall".to_string(),
```

Add:

```rust
assert!(source.contains("beat_id: \"prologue.guild-master\".to_string(),"));
assert!(source.contains("map_id: \"guild-hall\".to_string(),"));
```

- [ ] **Step 4: Run focused Rust tests and confirm the red state**

```bash
cargo test --manifest-path src-tauri/Cargo.toml story::types::tests
cargo test --manifest-path src-tauri/Cargo.toml story::compiler::tests
cargo test --manifest-path src-tauri/Cargo.toml story::codegen::tests
```

Expected: compilation/test failures because the fields and compiler invariant do not exist yet.

- [ ] **Step 5: Add the two fields to `NpcStoryDialogue`**

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcStoryDialogue {
    pub npc_id: String,
    pub beat_id: String,
    pub map_id: String,
    pub branches: Vec<StoryDialogueBranch>,
}
```

Do not add metadata to `StoryDialogueBranch`.

- [ ] **Step 6: Compile through a metadata-aware accumulator**

Import:

```rust
use std::collections::{btree_map::Entry, BTreeMap};
```

Add:

```rust
struct NpcDialogueAccumulator {
    beat_id: String,
    map_id: String,
    branches: Vec<StoryDialogueBranch>,
}
```

Use `BTreeMap<String, NpcDialogueAccumulator>`. For every compiled branch:

```rust
match dialogues_by_npc.entry(dialogue.npc_id.clone()) {
    Entry::Vacant(entry) => {
        entry.insert(NpcDialogueAccumulator {
            beat_id: beat.id.clone(),
            map_id: beat.map_id.clone(),
            branches: vec![branch],
        });
    }
    Entry::Occupied(mut entry) => {
        let existing = entry.get_mut();
        if existing.beat_id != beat.id || existing.map_id != beat.map_id {
            return Err(format!(
                "story npc {} appears in multiple beats or maps: {}@{} and {}@{}; multi-beat or multi-map NPC dialogue requires a separate runtime model",
                dialogue.npc_id,
                existing.beat_id,
                existing.map_id,
                beat.id,
                beat.map_id
            ));
        }
        existing.branches.push(branch);
    }
}
```

Map each accumulator into:

```rust
NpcStoryDialogue {
    npc_id,
    beat_id: dialogue.beat_id,
    map_id: dialogue.map_id,
    branches: dialogue.branches,
}
```

- [ ] **Step 7: Emit group metadata in generated Rust**

In `push_npc_dialogue`, emit directly after `npc_id`:

```rust
push_string_field(source, indent + 4, "beat_id", &dialogue.beat_id);
push_string_field(source, indent + 4, "map_id", &dialogue.map_id);
```

Do not change branch emission or session ID generation.

- [ ] **Step 8: Format and run focused Rust tests**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml story::types::tests
cargo test --manifest-path src-tauri/Cargo.toml story::compiler::tests
cargo test --manifest-path src-tauri/Cargo.toml story::codegen::tests
```

Expected: all focused tests PASS, including the conflict diagnostic.

- [ ] **Step 9: Regenerate the runtime catalog and verify strict freshness**

```bash
bun run story:check
bun run story:check:strict
```

Expected:
- `generated.rs` contains one `beat_id` and `map_id` per `NpcStoryDialogue`.
- Branches do not duplicate beat/map metadata.
- Both commands PASS.

- [ ] **Step 10: Commit runtime metadata**

```bash
git add src-tauri/src/story/types.rs \
  src-tauri/src/story/compiler.rs \
  src-tauri/src/story/codegen.rs \
  src-tauri/src/story/generated.rs
git commit -m "refactor(story): retain NPC beat and map identity"
```

---

### Task 4: Enforce exact map context at the Tauri boundary

**Files:**
- Modify: `src-tauri/src/story/commands.rs:34-66`
- Test: `src-tauri/src/story/commands.rs` inline test module

**Interfaces:**
- Consumes: `NpcStoryDialogue.map_id` from Task 3.
- Produces: explicit wrong-map error before branch selection.
- Preserves: request/response serialization, branch priority, intents, prose payload, and session ID format.

- [ ] **Step 1: Replace the context-only test with a failing wrong-map test**

Replace `treats_map_id_as_context_only_for_now` with:

```rust
#[test]
fn rejects_story_npc_requested_from_the_wrong_map() {
    let error = get_npc_dialogue_from_catalog(
        &crate::story::generated::story_catalog(),
        StoryDialogueRequest {
            map_id: "meadow-entry".to_string(),
            ..request_for_guild_master(no_quest_flags())
        },
    )
    .expect_err("wrong-map request should fail");

    assert_eq!(
        error,
        "story npc guild-master is not available on map meadow-entry"
    );
}
```

Add a correct-map Mira compatibility test:

```rust
#[test]
fn selects_shopkeeper_mira_on_item_shop_map() {
    let response = get_npc_dialogue_from_catalog(
        &crate::story::generated::story_catalog(),
        StoryDialogueRequest {
            npc_id: "shopkeeper-mira".to_string(),
            map_id: "item-shop".to_string(),
            locale: "en".to_string(),
            quest: no_quest_flags(),
        },
    )
    .expect("Mira dialogue");

    assert_eq!(response.speaker, "Mira");
    assert_eq!(response.session_id, "npc:shopkeeper-mira:always");
}
```

- [ ] **Step 2: Run the exact wrong-map test and confirm the red state**

```bash
cargo test --manifest-path src-tauri/Cargo.toml \
  story::commands::tests::rejects_story_npc_requested_from_the_wrong_map -- --exact
```

Expected: FAIL because lookup still ignores `request.map_id`.

- [ ] **Step 3: Enforce the invariant after NPC lookup**

Remove:

```rust
// Task 7 carries map_id as caller context only; NPC placement is enforced later.
let _map_id = &request.map_id;
```

After finding `dialogue`, add:

```rust
if dialogue.map_id != request.map_id {
    return Err(format!(
        "story npc {} is not available on map {}",
        request.npc_id, request.map_id
    ));
}
```

Keep locale validation before NPC lookup and leave all branch-priority code unchanged.

- [ ] **Step 4: Run command and frontend adapter tests**

```bash
cargo test --manifest-path src-tauri/Cargo.toml story::commands::tests
bun run test:unit -- --run \
  src/lib/game/story/client.test.ts \
  src/lib/game/story/browser-fixture.test.ts
```

Expected: all tests PASS; Guild Master/Mira session IDs and public payloads remain unchanged.

- [ ] **Step 5: Commit the Tauri invariant**

```bash
git add src-tauri/src/story/commands.rs
git commit -m "fix(story): enforce map-scoped dialogue lookup"
```

---

### Task 5: Run complete regression and release validation

**Files:**
- Verify only; no new file is expected.
- Stage a generated file only when the change is explained by Tasks 1–3.

**Interfaces:**
- Consumes all prior task outputs.
- Produces a clean, reproducible branch suitable for the one implementation PR.

- [ ] **Step 1: Verify generated files are reproducible and strict mode is write-free**

```bash
bun run story:check
git diff --exit-code -- \
  src-tauri/src/story/reference.rs \
  src-tauri/src/story/generated.rs \
  story/reports/story-integration-report.md
bun run story:check:strict
git diff --exit-code -- \
  src-tauri/src/story/reference.rs \
  src-tauri/src/story/generated.rs \
  story/reports/story-integration-report.md
```

Expected: all commands exit `0`. If a diff remains, stop and fix determinism; do not commit unexplained output.

- [ ] **Step 2: Run Rust formatting, linting, and all Rust tests**

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: zero formatting failures, Clippy warnings, or test failures.

- [ ] **Step 3: Run focused story/exporter TypeScript tests**

```bash
bun run test:unit -- --run \
  src/lib/game/content/story-content-references-export.test.ts \
  src/lib/game/story/client.test.ts \
  src/lib/game/story/browser-fixture.test.ts
```

Expected: all focused tests PASS.

- [ ] **Step 4: Run complete unit and static checks**

```bash
bun run test:unit -- --run
bun run check
bun run lint
```

Expected: all unit projects pass; TypeScript/Svelte checks and lint have no errors.

- [ ] **Step 5: Run web and Tauri release builds**

```bash
bun run build
bun run build:tauri
```

Expected:
- web build exits `0`;
- Tauri-mode build exits `0`;
- `build:tauri` reruns strict story freshness and frontend-prose exclusion.

- [ ] **Step 6: Inspect the final branch**

```bash
git diff --check
git status --short
git diff --stat main...HEAD
git log --oneline --decorate main..HEAD
```

Expected:
- no whitespace errors;
- clean working tree;
- four implementation commits matching Tasks 1–4;
- no story-integration JSON, fingerprint, directive, HPA-495 adapter, or unrelated map/art change.

- [ ] **Step 7: Open the implementation PR as draft**

Use title:

```text
feat(hpa-514): generate story references and enforce map context
```

The PR body must state:

- generated Rust replaces copied IDs;
- `(map, primaryNpc)` is validated;
- one beat/map identity is retained per NPC dialogue group;
- wrong-map rejection is invariant hardening;
- request/response/session/save contracts are unchanged;
- Story Integration Catalogs, fingerprints, directives, and HPA-495 story inputs remain deferred;
- exact validation commands and results.

Do not mark ready for review until Steps 1–6 have fresh passing output.
