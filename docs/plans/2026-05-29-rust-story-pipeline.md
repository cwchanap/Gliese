# Rust Story Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Rust-owned story authoring pipeline where YAML + Markdown story source compiles into Rust runtime data and the frontend requests only the current story fragment on demand.

**Architecture:** Story source lives under `story/` as a strict YAML manifest plus Markdown beat files. Rust owns parsing, validation, generated story data, draft/strict checks, and Tauri story lookup commands. TypeScript keeps rendering and gameplay intent execution, using a story client boundary so release Tauri builds do not bundle full story prose in frontend assets.

**Tech Stack:** Rust 2021, Tauri v2 commands, `serde`, `serde_yaml`, Bun scripts, Vite modes, Svelte 5, Phaser 4, Vitest, Playwright.

---

## Task 1: Add Story Source Fixtures

**Files:**
- Create: `story/manifest.yaml`
- Create: `story/beats/prologue/guild-master.md`
- Create: `story/beats/prologue/guild-quartermaster.md`
- Create: `story/beats/prologue/shopkeeper-mira.md`
- Create: `story/reports/.gitkeep`
- Create: `story/schema/directives.md`
- Create: `story/examples/dialogue-beat.md`

**Step 1: Create the story package files**

Use the approved source layout. The first fixture should cover all current NPC dialogue prose so later tasks can remove frontend-bundled dialogue text.

`story/manifest.yaml`:

```yaml
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
      - id: prologue.guild-quartermaster
        file: beats/prologue/guild-quartermaster.md
      - id: prologue.shopkeeper-mira
        file: beats/prologue/shopkeeper-mira.md
requiredContent:
  maps:
    - guild-hall
    - item-shop
  npcs:
    - guild-master
    - guild-quartermaster
    - shopkeeper-mira
  quests:
    - investigate-the-ruins
    - thin-village-slimes
    - thin-ruins-slimes
    - recover-ruins-relics
  shops:
    - guild-quartermaster
    - miras-item-shop
  enemies:
    - slime-scout
    - ruins-warden
```

`story/beats/prologue/guild-master.md`:

```md
# Guild Master

Guild Master Arlen briefs Liam on the ruins and offers Guild work.

::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: mainQuestNeedsGuildBriefing
speaker: Guild Master Arlen
choices: quest
completionIntent: recordNpcTalk:guild-master
:::

You made it. The eastern ruins are stirring again, and the village road is no longer safe.

Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.

::: dialogue
npc: guild-master
branch: hasActiveSideQuest
speaker: Guild Master Arlen
choices: quest
:::

The Guild board is yours to work through, but do not lose sight of the warden.

Report progress through your journal. I will keep new work here at the counter.

::: dialogue
npc: guild-master
branch: hasCompletedQuest
speaker: Guild Master Arlen
choices: quest
:::

Good work out there. The village notices when a hunter keeps the roads clear.

::: dialogue
npc: guild-master
branch: guildBriefingComplete
speaker: Guild Master Arlen
choices: quest
:::

The ruins route is open. Steel yourself before you enter the core.

::: dialogue
npc: guild-master
branch: always
speaker: Guild Master Arlen
choices: quest
:::

The Guild keeps watch over the old road. Speak plainly and choose your work.
```

Add similar beat files for `guild-quartermaster` and `shopkeeper-mira` using the current English lines and `choices: shop`.

**Step 2: Document the supported directive subset**

`story/schema/directives.md` should define:

- `::: story`
- `::: dialogue`
- `choices: quest`
- `choices: shop`
- `completionIntent: recordNpcTalk:<npcId>`
- `::: unsupported-hook`

Keep this file short and aligned with what the parser will implement.

**Step 3: Verify files are visible to git**

Run:

```sh
git status --short story
```

Expected: new story files are listed.

**Step 4: Commit**

```sh
git add story
git commit -m "feat: add story source fixtures"
```

---

## Task 2: Add Rust Story Domain Types

**Files:**
- Create: `src-tauri/src/story/mod.rs`
- Create: `src-tauri/src/story/types.rs`
- Create: `src-tauri/src/story/reference.rs`
- Create: `src-tauri/src/story/generated.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add dependencies**

In `src-tauri/Cargo.toml`, add YAML parsing:

```toml
[dependencies]
serde_json = "1.0"
serde_yaml = "0.9"
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "2.11.1" }
tauri-plugin-fs = "2"
```

**Step 2: Add the story module**

`src-tauri/src/story/mod.rs`:

```rust
pub mod generated;
pub mod reference;
pub mod types;
```

`src-tauri/src/story/types.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryCatalog {
    pub package_id: String,
    pub default_locale: String,
    pub npc_dialogues: Vec<NpcStoryDialogue>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcStoryDialogue {
    pub npc_id: String,
    pub branches: Vec<StoryDialogueBranch>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueBranch {
    pub condition: StoryBranchCondition,
    pub speaker: String,
    pub lines: Vec<String>,
    pub actions: Vec<StoryDialogueAction>,
    pub completion_intent: Option<StoryIntent>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StoryBranchCondition {
    #[serde(rename = "always")]
    Always,
    #[serde(rename = "mainQuestNeedsGuildBriefing")]
    MainQuestNeedsGuildBriefing,
    #[serde(rename = "guildBriefingComplete")]
    GuildBriefingComplete,
    #[serde(rename = "hasActiveSideQuest")]
    HasActiveSideQuest,
    #[serde(rename = "hasCompletedQuest")]
    HasCompletedQuest,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueAction {
    pub id: String,
    pub label: String,
    pub intent: StoryIntent,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum StoryIntent {
    ShowQuestList { giver_npc_id: String },
    OpenShop { shop_id: String },
    RecordNpcTalk { npc_id: String },
    Close,
}
```

`src-tauri/src/story/reference.rs`:

```rust
pub const MAP_IDS: &[&str] = &["guild-hall", "item-shop", "meadow-entry", "ruins-threshold", "ruins-core"];
pub const NPC_IDS: &[&str] = &["guild-master", "guild-quartermaster", "shopkeeper-mira"];
pub const QUEST_IDS: &[&str] = &[
    "investigate-the-ruins",
    "thin-village-slimes",
    "thin-ruins-slimes",
    "recover-ruins-relics",
];
pub const SHOP_IDS: &[&str] = &["guild-quartermaster", "miras-item-shop"];
pub const ENEMY_IDS: &[&str] = &["slime-scout", "ruins-warden"];
```

`src-tauri/src/story/generated.rs` starts with an empty checked-in catalog:

```rust
use super::types::StoryCatalog;

pub fn story_catalog() -> StoryCatalog {
    StoryCatalog {
        package_id: "empty".to_string(),
        default_locale: "en".to_string(),
        npc_dialogues: Vec::new(),
    }
}
```

**Step 3: Register the module**

In `src-tauri/src/lib.rs`, add:

```rust
mod story;
```

above `pub fn run()`.

**Step 4: Compile Rust**

Run:

```sh
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: PASS.

**Step 5: Commit**

```sh
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/src/story
git commit -m "feat: add rust story domain types"
```

---

## Task 3: Parse And Validate The YAML Manifest

**Files:**
- Create: `src-tauri/src/story/manifest.rs`
- Modify: `src-tauri/src/story/mod.rs`
- Test: `src-tauri/src/story/manifest.rs`

**Step 1: Write failing manifest tests**

At the bottom of `src-tauri/src/story/manifest.rs`, add tests first:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_valid_manifest() {
        let manifest = parse_manifest(
            r#"
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
  maps: [guild-hall]
  npcs: [guild-master]
  quests: [investigate-the-ruins]
"#,
        )
        .expect("manifest should parse");

        assert_eq!(manifest.id, "sundrop-ruins");
        assert_eq!(manifest.entry_beat, "prologue.guild-master");
        assert_eq!(manifest.chapters[0].beats[0].file, "beats/prologue/guild-master.md");
    }

    #[test]
    fn rejects_duplicate_beat_ids() {
        let manifest = parse_manifest(
            r#"
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
      - id: prologue.guild-master
        file: beats/prologue/duplicate.md
requiredContent: {}
"#,
        )
        .expect("yaml parses");

        let errors = validate_manifest(&manifest);
        assert!(errors.iter().any(|error| error.contains("duplicate beat id")));
    }
}
```

**Step 2: Run the failing tests**

Run:

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::manifest -- --nocapture
```

Expected: FAIL because `parse_manifest` and types do not exist.

**Step 3: Implement manifest parsing**

Add:

```rust
use serde::Deserialize;
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryManifest {
    pub id: String,
    pub title: String,
    pub entry_beat: String,
    pub default_locale: String,
    pub chapters: Vec<StoryManifestChapter>,
    #[serde(default)]
    pub required_content: RequiredContent,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryManifestChapter {
    pub id: String,
    pub title: String,
    pub beats: Vec<StoryManifestBeat>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct StoryManifestBeat {
    pub id: String,
    pub file: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
pub struct RequiredContent {
    #[serde(default)]
    pub maps: Vec<String>,
    #[serde(default)]
    pub npcs: Vec<String>,
    #[serde(default)]
    pub quests: Vec<String>,
    #[serde(default)]
    pub shops: Vec<String>,
    #[serde(default)]
    pub enemies: Vec<String>,
}

pub fn parse_manifest(source: &str) -> Result<StoryManifest, serde_yaml::Error> {
    serde_yaml::from_str(source)
}

pub fn validate_manifest(manifest: &StoryManifest) -> Vec<String> {
    let mut errors = Vec::new();
    let mut beat_ids = HashSet::new();

    if manifest.default_locale != "en" {
        errors.push(format!("unsupported defaultLocale {}", manifest.default_locale));
    }

    for chapter in &manifest.chapters {
        for beat in &chapter.beats {
            if !beat_ids.insert(beat.id.clone()) {
                errors.push(format!("duplicate beat id {}", beat.id));
            }
        }
    }

    if !beat_ids.contains(&manifest.entry_beat) {
        errors.push(format!("entryBeat {} is not listed in chapters", manifest.entry_beat));
    }

    errors
}
```

Export from `src-tauri/src/story/mod.rs`:

```rust
pub mod manifest;
```

**Step 4: Run tests**

Run:

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::manifest -- --nocapture
```

Expected: PASS.

**Step 5: Commit**

```sh
git add src-tauri/src/story/mod.rs src-tauri/src/story/manifest.rs
git commit -m "feat: parse story manifest"
```

---

## Task 4: Parse Markdown Beat Directives

**Files:**
- Create: `src-tauri/src/story/beat.rs`
- Modify: `src-tauri/src/story/mod.rs`
- Test: `src-tauri/src/story/beat.rs`

**Step 1: Write failing parser tests**

Add tests that parse one `::: story` block, multiple `::: dialogue` blocks, dialogue lines, and unsupported hooks.

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_dialogue_blocks_from_markdown() {
        let beat = parse_beat_markdown(
            r#"# Guild Master

::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: mainQuestNeedsGuildBriefing
speaker: Guild Master Arlen
choices: quest
completionIntent: recordNpcTalk:guild-master
:::

You made it.

Go to the ruins.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.id, "prologue.guild-master");
        assert_eq!(beat.dialogues.len(), 1);
        assert_eq!(beat.dialogues[0].npc_id, "guild-master");
        assert_eq!(beat.dialogues[0].lines, vec!["You made it.", "Go to the ruins."]);
    }

    #[test]
    fn parses_unsupported_hooks() {
        let beat = parse_beat_markdown(
            r#"# Hook

::: story
id: prologue.hook
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: unsupported-hook
id: cutscene.guild-master-points-to-map
kind: camera-pan
reason: Need a short camera movement.
:::
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.unsupported_hooks[0].id, "cutscene.guild-master-points-to-map");
    }
}
```

**Step 2: Run failing tests**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::beat -- --nocapture
```

Expected: FAIL because parser does not exist.

**Step 3: Implement a conservative line parser**

Implement only the approved Markdown subset. Do not implement general Markdown parsing.

Required structs:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoryBeat {
    pub id: String,
    pub chapter: String,
    pub map_id: String,
    pub primary_npc_id: String,
    pub dialogues: Vec<BeatDialogue>,
    pub unsupported_hooks: Vec<UnsupportedHook>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatDialogue {
    pub npc_id: String,
    pub branch: String,
    pub speaker: String,
    pub choices: Vec<String>,
    pub completion_intent: Option<String>,
    pub lines: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnsupportedHook {
    pub id: String,
    pub kind: String,
    pub reason: String,
}
```

Implementation rules:

- Directive blocks start with `::: story`, `::: dialogue`, or `::: unsupported-hook`.
- Directive blocks end with `:::`.
- `key: value` pairs inside directives are trimmed.
- Non-empty Markdown paragraphs after a `::: dialogue` block become lines for that dialogue until the next directive or heading.
- Headings and blank lines are ignored for line collection.
- Unknown directives return an error.
- Missing required directive fields return an error.

**Step 4: Run parser tests**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::beat -- --nocapture
```

Expected: PASS.

**Step 5: Commit**

```sh
git add src-tauri/src/story/mod.rs src-tauri/src/story/beat.rs
git commit -m "feat: parse story beat markdown"
```

---

## Task 5: Compile Story Beats Into A Catalog

**Files:**
- Create: `src-tauri/src/story/compiler.rs`
- Modify: `src-tauri/src/story/mod.rs`
- Modify: `src-tauri/src/story/types.rs`
- Test: `src-tauri/src/story/compiler.rs`

**Step 1: Write failing compiler tests**

Test that parsed beat dialogues become `StoryCatalog` entries with action intents.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::story::types::{StoryBranchCondition, StoryIntent};

    #[test]
    fn compiles_quest_choice_and_record_talk_intent() {
        let beat = crate::story::beat::parse_beat_markdown(
            r#"# Guild Master

::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: mainQuestNeedsGuildBriefing
speaker: Guild Master Arlen
choices: quest
completionIntent: recordNpcTalk:guild-master
:::

You made it.
"#,
        )
        .unwrap();

        let catalog = compile_catalog("sundrop-ruins", "en", &[beat]).expect("compile");
        let guild = catalog.npc_dialogues.iter().find(|dialogue| dialogue.npc_id == "guild-master").unwrap();
        let branch = &guild.branches[0];

        assert_eq!(branch.condition, StoryBranchCondition::MainQuestNeedsGuildBriefing);
        assert_eq!(branch.actions[0].id, "quest");
        assert_eq!(branch.actions[0].intent, StoryIntent::ShowQuestList { giver_npc_id: "guild-master".to_string() });
        assert_eq!(branch.completion_intent, Some(StoryIntent::RecordNpcTalk { npc_id: "guild-master".to_string() }));
    }
}
```

**Step 2: Run failing tests**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::compiler -- --nocapture
```

Expected: FAIL.

**Step 3: Implement compiler mapping**

Compiler responsibilities:

- group dialogues by `npc_id`,
- convert branch strings into `StoryBranchCondition`,
- convert `choices: quest` to `ShowQuestList { giver_npc_id: npc_id }`,
- convert `choices: shop` by known NPC:
  - `guild-quartermaster` -> `OpenShop { shop_id: "guild-quartermaster" }`,
  - `shopkeeper-mira` -> `OpenShop { shop_id: "miras-item-shop" }`,
- convert `completionIntent: recordNpcTalk:guild-master` into `RecordNpcTalk`,
- reject unknown branch names, choice names, and completion-intent formats.

**Step 4: Run compiler tests**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::compiler -- --nocapture
```

Expected: PASS.

**Step 5: Commit**

```sh
git add src-tauri/src/story/mod.rs src-tauri/src/story/types.rs src-tauri/src/story/compiler.rs
git commit -m "feat: compile story catalog"
```

---

## Task 6: Add Draft And Strict Story Checker

**Files:**
- Create: `src-tauri/src/bin/story_check.rs`
- Create: `src-tauri/src/story/check.rs`
- Create: `src-tauri/src/story/codegen.rs`
- Modify: `src-tauri/src/story/mod.rs`
- Modify: `src-tauri/src/story/generated.rs`
- Modify: `package.json`
- Modify: `src-tauri/tauri.conf.json`
- Test: `src-tauri/src/story/check.rs`

**Step 1: Write failing check tests**

Add tests for draft report behavior and strict failure:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn draft_allows_unsupported_hooks_but_reports_them() {
        let result = check_story_package_for_test(CheckMode::Draft, true);
        assert!(result.is_ok());
        let report = result.unwrap().integration_report;
        assert!(report.contains("Unsupported hooks"));
    }

    #[test]
    fn strict_rejects_unsupported_hooks() {
        let result = check_story_package_for_test(CheckMode::Strict, true);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("unsupported hook"));
    }
}
```

Use an in-memory helper fixture for this test rather than depending on the real `story/` directory.

**Step 2: Run failing tests**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::check -- --nocapture
```

Expected: FAIL.

**Step 3: Implement package checker**

`check.rs` should:

- read `story/manifest.yaml`,
- read each listed beat file,
- parse beats,
- validate manifest references against `reference.rs`,
- validate beat IDs match manifest entries,
- collect unsupported hooks,
- compile a `StoryCatalog`,
- return a draft report,
- fail strict mode when unsupported hooks exist.

**Step 4: Implement code generation**

`codegen.rs` should emit deterministic Rust for `src-tauri/src/story/generated.rs`.

Generated file shape:

```rust
use super::types::{
    NpcStoryDialogue, StoryBranchCondition, StoryCatalog, StoryDialogueAction,
    StoryDialogueBranch, StoryIntent,
};

pub fn story_catalog() -> StoryCatalog {
    StoryCatalog {
        package_id: "sundrop-ruins".to_string(),
        default_locale: "en".to_string(),
        npc_dialogues: vec![
            // generated entries
        ],
    }
}
```

Add a generated header:

```rust
// @generated by story_check. Do not edit by hand.
```

**Step 5: Implement the binary**

`src-tauri/src/bin/story_check.rs` should parse simple args without adding `clap`:

```rust
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let strict = args.iter().any(|arg| arg == "--mode=strict");
    let write_report = args.iter().any(|arg| arg == "--write-report");
    let write_generated = args.iter().any(|arg| arg == "--write-generated");
    let check_generated = args.iter().any(|arg| arg == "--check-generated");

    if let Err(error) = gliese_lib::story::check::run_story_check(
        if strict { CheckMode::Strict } else { CheckMode::Draft },
        write_report,
        write_generated,
        check_generated,
    ) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
```

If `gliese_lib::story` is not public enough for a bin target, expose `pub mod story;` from `src-tauri/src/lib.rs`.

**Step 6: Add package scripts**

In `package.json`:

```json
"story:check": "cargo run --manifest-path src-tauri/Cargo.toml --bin story_check -- --mode=draft --write-report --write-generated",
"story:check:strict": "cargo run --manifest-path src-tauri/Cargo.toml --bin story_check -- --mode=strict --check-generated",
"build:tauri": "bun run story:check:strict && vite build --mode tauri"
```

In `src-tauri/tauri.conf.json`, change:

```json
"beforeBuildCommand": "bun run build:tauri"
```

**Step 7: Generate current story output**

Run:

```sh
bun run story:check
```

Expected: PASS, updates `src-tauri/src/story/generated.rs`, and writes `story/reports/story-integration-report.md`.

**Step 8: Run strict check**

Run:

```sh
bun run story:check:strict
```

Expected: PASS after removing or resolving any unsupported hooks in the initial fixture.

**Step 9: Commit**

```sh
git add package.json src-tauri/tauri.conf.json src-tauri/src/bin/story_check.rs src-tauri/src/story story/reports
git commit -m "feat: add story checker"
```

---

## Task 7: Add Rust Story Lookup Commands

**Files:**
- Create: `src-tauri/src/story/commands.rs`
- Modify: `src-tauri/src/story/mod.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/story/commands.rs`

**Step 1: Write failing command-selection tests**

Add tests for branch selection:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn selects_guild_briefing_when_main_quest_needs_talk() {
        let response = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            StoryDialogueRequest {
                npc_id: "guild-master".to_string(),
                map_id: "guild-hall".to_string(),
                locale: "en".to_string(),
                quest: StoryQuestSummary {
                    main_quest_needs_guild_briefing: true,
                    guild_briefing_complete: false,
                    has_active_side_quest: false,
                    has_completed_quest: false,
                },
            },
        )
        .expect("dialogue");

        assert_eq!(response.speaker, "Guild Master Arlen");
        assert_eq!(response.lines.len(), 2);
    }
}
```

**Step 2: Run failing tests**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::commands -- --nocapture
```

Expected: FAIL.

**Step 3: Implement request/response types and lookup**

`commands.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueRequest {
    pub npc_id: String,
    pub map_id: String,
    pub locale: String,
    pub quest: StoryQuestSummary,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryQuestSummary {
    pub main_quest_needs_guild_briefing: bool,
    pub guild_briefing_complete: bool,
    pub has_active_side_quest: bool,
    pub has_completed_quest: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueResponse {
    pub session_id: String,
    pub speaker: String,
    pub lines: Vec<String>,
    pub actions: Vec<super::types::StoryDialogueAction>,
    pub completion_intent: Option<super::types::StoryIntent>,
}
```

Add:

```rust
#[tauri::command]
pub fn get_npc_dialogue(request: StoryDialogueRequest) -> Result<StoryDialogueResponse, String> {
    get_npc_dialogue_from_catalog(&super::generated::story_catalog(), request)
        .map_err(|error| error.to_string())
}
```

Branch priority should mirror the current TypeScript behavior:

1. `mainQuestNeedsGuildBriefing`
2. `hasActiveSideQuest`
3. `hasCompletedQuest`
4. `guildBriefingComplete`
5. `always`

**Step 4: Register the command**

In `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![story::commands::get_npc_dialogue])
```

**Step 5: Run tests and cargo check**

```sh
cargo test --manifest-path src-tauri/Cargo.toml story::commands -- --nocapture
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: PASS.

**Step 6: Commit**

```sh
git add src-tauri/src/lib.rs src-tauri/src/story
git commit -m "feat: expose story dialogue command"
```

---

## Task 8: Add Frontend Story Client Boundary

**Files:**
- Create: `src/lib/game/story/client.ts`
- Create: `src/lib/game/story/browser-fixture.ts`
- Create: `src/lib/game/story/client.test.ts`
- Modify: `vite.config.ts`

**Step 1: Write failing client tests**

`src/lib/game/story/client.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { createDialogueSessionFromStory } from '$lib/game/story/client';

describe('story client', () => {
	it('adapts Rust story payloads into dialogue sessions', () => {
		const session = createDialogueSessionFromStory({
			sessionId: 'npc:guild-master:prologue.guild-master',
			speaker: 'Guild Master Arlen',
			lines: ['You made it.', 'Go to the ruins.'],
			actions: [{ id: 'quest', label: 'Quest', intent: { type: 'showQuestList', giverNpcId: 'guild-master' } }],
			completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' }
		});

		expect(session).toMatchObject({
			id: 'npc:guild-master:prologue.guild-master',
			speaker: 'Guild Master Arlen',
			line: 'You made it.',
			lineCount: 2,
			mode: 'conversation'
		});
		expect(session.choices.map((choice) => choice.id)).toEqual(['quest']);
	});
});
```

**Step 2: Run failing test**

```sh
bun run test:unit -- --run src/lib/game/story/client.test.ts
```

Expected: FAIL.

**Step 3: Implement story client types and adapter**

`client.ts` should define TypeScript mirrors of the Rust payload without importing story prose:

```ts
import type { DialogueIntent, DialogueSession } from '$lib/game/core/dialogue';

export type StoryDialogueResponse = {
	sessionId: string;
	speaker: string;
	lines: string[];
	actions: Array<{ id: string; label: string; intent: DialogueIntent }>;
	completionIntent: DialogueIntent | null;
};

export function createDialogueSessionFromStory(response: StoryDialogueResponse): DialogueSession {
	return {
		id: response.sessionId,
		npcId: null,
		speaker: response.speaker,
		lines: response.lines,
		line: response.lines[0] ?? '',
		lineIndex: 0,
		lineCount: response.lines.length,
		mode: response.lines.length <= 1 && response.actions.length > 0 ? 'choice' : 'conversation',
		choices: response.actions.map((action) => ({
			id: action.id,
			label: action.label,
			intent: action.intent
		})),
		completionIntent: response.completionIntent,
		canClose: true
	};
}
```

Then add async lookup:

```ts
export async function getNpcStoryDialogue(request: StoryDialogueRequest): Promise<DialogueSession> {
	if (import.meta.env.VITE_STORY_RUNTIME === 'tauri') {
		const { invoke } = await import('@tauri-apps/api/core');
		return createDialogueSessionFromStory(
			await invoke<StoryDialogueResponse>('get_npc_dialogue', { request })
		);
	}

	const fixture = await import('$lib/game/story/browser-fixture');
	return createDialogueSessionFromStory(fixture.getBrowserNpcDialogue(request));
}
```

`browser-fixture.ts` can import no prose from content files once the migrated story prose is removed. It may load a tiny test fixture used only in browser mode.

**Step 4: Add Vite mode guard**

In `vite.config.ts`, make sure `import.meta.env.VITE_STORY_RUNTIME` is available normally; no special plugin should be needed. Add `.env.tauri` later if missing.

**Step 5: Run tests**

```sh
bun run test:unit -- --run src/lib/game/story/client.test.ts
```

Expected: PASS.

**Step 6: Commit**

```sh
git add src/lib/game/story vite.config.ts
git commit -m "feat: add frontend story client"
```

---

## Task 9: Integrate Story Dialogue Into WorldScene

**Files:**
- Modify: `src/lib/game/phaser/scenes/WorldScene.ts`
- Modify: `src/lib/game/core/dialogue.ts`
- Modify: `src/lib/game/core/dialogue.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Step 1: Write failing WorldScene test**

In `src/lib/game/phaser/scenes/scenes.test.ts`, mock the story client and assert interaction uses it:

```ts
vi.mock('$lib/game/story/client', () => ({
	getNpcStoryDialogue: vi.fn(async () => ({
		id: 'npc:guild-master:prologue.guild-master',
		npcId: null,
		speaker: 'Guild Master Arlen',
		lines: ['You made it.'],
		line: 'You made it.',
		lineIndex: 0,
		lineCount: 1,
		mode: 'choice',
		choices: [{ id: 'quest', label: 'Quest', intent: { type: 'showQuestList', giverNpcId: 'guild-master' } }],
		completionIntent: { type: 'recordNpcTalk', npcId: 'guild-master' },
		canClose: true
	}))
}));
```

Add or update the existing `starts Guild Master dialogue instead of status-only NPC text` test to expect the mock was called with:

```ts
expect(storyClient.getNpcStoryDialogue).toHaveBeenCalledWith(
	expect.objectContaining({
		npcId: 'guild-master',
		mapId: 'guild-hall',
		locale: 'en'
	})
);
```

**Step 2: Run failing focused tests**

```sh
bun run test:unit -- --run src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: FAIL because `WorldScene` still calls `startNpcDialogue` synchronously.

**Step 3: Add quest summary builder**

In `WorldScene.ts`, add a private method:

```ts
private buildStoryQuestSummary() {
	return {
		mainQuestNeedsGuildBriefing: !hasCompletedQuestObjective(
			this.quests,
			mainQuestId,
			'talk-to-guild-master'
		),
		guildBriefingComplete: hasCompletedQuestObjective(
			this.quests,
			mainQuestId,
			'talk-to-guild-master'
		),
		hasActiveSideQuest: Object.values(this.quests.entries).some(
			(entry) => entry.status === 'active'
		),
		hasCompletedQuest: Object.values(this.quests.entries).some(
			(entry) => entry.status === 'completed'
		)
	};
}
```

Use existing imports from `core/quests` and `content/quests`.

**Step 4: Make NPC interaction async-safe**

Replace the direct `startNpcDialogue` call in `interactWithNearbyNpc` with an async helper:

```ts
private interactWithNearbyNpc(nearbyNpc = this.findNearbyNpc()) {
	// existing no-NPC and re-entry checks remain
	void this.startNearbyNpcStoryDialogue(nearbyNpc);
}

private async startNearbyNpcStoryDialogue(nearbyNpc: MapNpc) {
	try {
		const session = await getNpcStoryDialogue({
			npcId: nearbyNpc.dialogueId,
			mapId: this.mapId,
			locale: this.getLocale(),
			quest: this.buildStoryQuestSummary()
		});

		this.dialogueSession = {
			...session,
			npcId: nearbyNpc.dialogueId
		};
		this.publishHudState(this.status('status.npcNearby', { npcName: this.getNpcName(nearbyNpc) }));
	} catch {
		this.dialogueSession = buildDialogueFallback(
			this.getTravelerSpeaker(),
			this.status('content.dialogue.system.noDialogueAvailable')
		);
		this.publishHudState(this.status('status.dialogueUpdated'));
	}
}
```

Guard against stale responses by capturing `const requestNpcId = nearbyNpc.id` and discarding the response if `this.currentNearbyNpcId` changed.

**Step 5: Keep existing choice execution**

The returned story actions already use existing `DialogueIntent` shapes. `chooseDialogueOption` can continue to handle current in-session choices. If `chooseDialogueOption` still depends on static content for `showQuestList`, leave that path in TypeScript for now because it is mechanical quest UI, not authored story prose.

**Step 6: Run focused tests**

```sh
bun run test:unit -- --run src/lib/game/story/client.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS.

**Step 7: Commit**

```sh
git add src/lib/game/story src/lib/game/phaser/scenes/WorldScene.ts src/lib/game/core/dialogue.ts src/lib/game/core/dialogue.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "feat: load npc dialogue from rust story"
```

---

## Task 10: Remove Migrated Frontend Dialogue Prose

**Files:**
- Modify: `src/lib/game/content/dialogue.ts`
- Modify: `src/lib/game/content/dialogue.test.ts`
- Modify: `src/lib/game/i18n/content.ts`
- Modify: `src/lib/game/i18n/messages/en.ts`
- Modify: `src/lib/game/i18n/messages/ja.ts`
- Modify: `src/lib/game/i18n/messages/zh-Hant.ts`
- Modify: `src/lib/game/i18n/messages/types.ts`
- Modify: `src/lib/game/core/dialogue.test.ts`
- Modify: `src/lib/game/phaser/scenes/scenes.test.ts`

**Step 1: Write failing prose-removal test**

Add a test that prevents migrated English story prose from staying in frontend messages:

```ts
it('does not keep migrated NPC story prose in frontend dialogue definitions', () => {
	const serialized = JSON.stringify(npcDialogueList);
	expect(serialized).not.toContain('The eastern ruins are stirring again');
	expect(serialized).not.toContain('Fresh tonics are on the shelf');
});
```

Run:

```sh
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts
```

Expected: FAIL before prose is removed.

**Step 2: Convert `content/dialogue.ts` to mechanical dialogue metadata**

Keep:

- `NpcDialogueId`
- `DialogueBranchCondition`
- `DialogueActionIntent`
- action definitions if needed for quest/shop mechanical flows

Remove `lineKeys`, `lines`, and speaker text from static frontend definitions for migrated NPC story dialogue. The Rust story response owns speaker and lines.

**Step 3: Remove migrated dialogue prose from i18n message files**

Delete current prose under:

- `content.dialogue.guild-master.lines`
- `content.dialogue.guild-quartermaster.lines`
- `content.dialogue.shopkeeper-mira.lines`

Keep system labels and UI actions that are not story prose:

- `content.dialogue.actions`
- `content.dialogue.speakers.traveler`
- `content.dialogue.speakers.guildNotice`
- `content.dialogue.system`

For Japanese and Traditional Chinese, story dialogue can fall back to English from Rust in this first slice. Update tests to expect localized UI and English story dialogue where appropriate.

**Step 4: Update TypeScript helpers**

Update `src/lib/game/i18n/content.ts` so `getDialogueText` is no longer responsible for NPC authored prose. Keep helper functions needed by quest details and system messages.

**Step 5: Run focused tests**

```sh
bun run test:unit -- --run src/lib/game/content/dialogue.test.ts src/lib/game/core/dialogue.test.ts src/lib/game/i18n/content.test.ts src/lib/game/phaser/scenes/scenes.test.ts
```

Expected: PASS after updating expectations.

**Step 6: Build release frontend and inspect for migrated strings**

Run:

```sh
bun run build:tauri
rg "The eastern ruins are stirring again|Fresh tonics are on the shelf" dist
```

Expected: `bun run build:tauri` PASS. `rg` returns no matches in `dist`.

**Step 7: Commit**

```sh
git add src/lib/game/content/dialogue.ts src/lib/game/content/dialogue.test.ts src/lib/game/i18n src/lib/game/core/dialogue.test.ts src/lib/game/phaser/scenes/scenes.test.ts
git commit -m "refactor: move npc story prose out of frontend"
```

---

## Task 11: Add Browser Fixture Mode For Dev And E2E

**Files:**
- Modify: `src/lib/game/story/browser-fixture.ts`
- Create: `.env.tauri`
- Modify: `package.json`
- Modify: `tests/e2e/game.e2e.ts`

**Step 1: Add `.env.tauri`**

Create:

```env
VITE_STORY_RUNTIME=tauri
```

Default browser builds can use `browser-fixture`; Tauri release builds use `tauri` mode and tree-shake the browser fixture branch.

**Step 2: Keep browser fixture small and test-only**

`browser-fixture.ts` should contain only the minimal prose needed for browser dev and Playwright e2e. Add a file comment:

```ts
// Browser-only fixture for Vite dev and Playwright. Tauri release builds use VITE_STORY_RUNTIME=tauri and must tree-shake this module.
```

**Step 3: Add release-bundle string test**

In `package.json`, add:

```json
"story:assert-no-frontend-prose": "rg \"The eastern ruins are stirring again|Fresh tonics are on the shelf\" dist && exit 1 || exit 0"
```

If shell portability becomes a concern, implement this as a small Node or Bun script in `tools/assert-no-frontend-story-prose.ts` instead of using shell operators.

**Step 4: Update e2e if needed**

The current Playwright setup uses `vite preview` against `dist`. If `bun run build` defaults to browser fixture mode, the existing e2e dialogue flow can keep working. Update the Guild Master e2e test only if selectors or timing changed because story dialogue now loads asynchronously.

Use:

```ts
const guildMasterDialog = page.getByRole('dialog', { name: 'Guild Master Arlen' });
await expect(guildMasterDialog).toBeVisible({ timeout: 10_000 });
```

**Step 5: Run e2e dialogue flow**

```sh
bun run test:e2e -- --grep "accepts a Guild side quest"
```

Expected: PASS.

**Step 6: Run release build prose assertion**

```sh
bun run build:tauri
bun run story:assert-no-frontend-prose
```

Expected: PASS.

**Step 7: Commit**

```sh
git add .env.tauri package.json src/lib/game/story/browser-fixture.ts tests/e2e/game.e2e.ts
git commit -m "test: add story runtime bundle gates"
```

---

## Task 12: Add Shared Writer Skill

**Files:**
- Create: `.agents/skills/gliese-story-writer/SKILL.md`
- Create: `.agents/skills/gliese-story-writer/examples/dialogue-beat.md`
- Create: `.agents/skills/gliese-story-writer/references/story-format.md`
- Create symlink: `.claude/skills/gliese-story-writer`

**Step 1: Create the shared skill**

`.agents/skills/gliese-story-writer/SKILL.md`:

```md
---
name: gliese-story-writer
description: Write Gliese story beats as manifest-referenced Markdown for the Rust story pipeline.
---

# Gliese Story Writer

Use this when writing or editing Gliese story content.

## Required Workflow

1. Read `story/manifest.yaml`.
2. Read only the beat files you need under `story/beats/`.
3. Preserve existing IDs unless explicitly asked to rename them.
4. Write dialogue as normal Markdown paragraphs.
5. Use directive blocks only for engine metadata.
6. Use `::: unsupported-hook` for story needs the engine cannot run yet.
7. Run `bun run story:check`.
8. Summarize changed beats and any integration-report entries.

## Do Not Edit

- `src-tauri/src/story/generated.rs`
- compiled Rust story output
- frontend generated assets

## References

- `story/schema/directives.md`
- `.agents/skills/gliese-story-writer/examples/dialogue-beat.md`
```

**Step 2: Add Claude symlink**

Run:

```sh
mkdir -p .claude/skills
ln -s ../../.agents/skills/gliese-story-writer .claude/skills/gliese-story-writer
```

If `ln -s` is not portable for the user's target environment, use a small checked-in adapter `SKILL.md` under `.claude/skills/gliese-story-writer/` that points to `.agents/skills/gliese-story-writer/SKILL.md`.

**Step 3: Verify symlink**

Run:

```sh
ls -l .claude/skills
```

Expected: `gliese-story-writer` points to `../../.agents/skills/gliese-story-writer`.

**Step 4: Commit**

```sh
git add .agents .claude
git commit -m "docs: add gliese story writer skill"
```

---

## Task 13: Final Verification

**Files:**
- Modify only files needed by failures found during verification.

**Step 1: Run full unit tests**

```sh
bun run test:unit -- --run
```

Expected: PASS.

**Step 2: Run Rust checks**

```sh
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Expected: PASS.

**Step 3: Run story checks**

```sh
bun run story:check
bun run story:check:strict
```

Expected: PASS. Draft report exists and strict mode has no unresolved unsupported hooks.

**Step 4: Run frontend checks**

```sh
bun run check
bun run build:tauri
bun run story:assert-no-frontend-prose
```

Expected: PASS. Release frontend does not contain migrated NPC story prose.

**Step 5: Run e2e**

```sh
bun run test:e2e
```

Expected: PASS.

**Step 6: Inspect final status**

```sh
git status --short
```

Expected: clean worktree.

**Step 7: Commit any verification fixes**

If verification required fixes, inspect `git status --short`, stage only the files changed by those fixes, and commit them:

```sh
git commit -m "test: verify rust story pipeline"
```

If no fixes were required, do not create an empty commit.
