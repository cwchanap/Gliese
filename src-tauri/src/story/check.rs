use std::collections::{BTreeSet, HashSet};
use std::error::Error;
use std::fmt;
use std::fs;
use std::path::Path;

use super::beat::{parse_beat_markdown, StoryBeat, UnsupportedHook};
use super::codegen::{generate_browser_catalog_json, generate_story_catalog_source};
use super::compiler::{compile_catalog, parse_branch_condition};
use super::manifest::{parse_manifest, validate_manifest, StoryManifest};
use super::reference;
use super::types::{StoryBranchCondition, StoryCatalog};

const GENERATED_RUST_PATH: &str = "src-tauri/src/story/generated.rs";
const GENERATED_BROWSER_PATH: &str = "src/lib/game/story/browser-catalog.generated.json";
const REPORT_PATH: &str = "story/reports/story-integration-report.md";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckMode {
    Draft,
    Strict,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoryCheckResult {
    pub integration_report: String,
    pub catalog: StoryCatalog,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoryCheckArgs {
    pub mode: CheckMode,
    pub write_report: bool,
    pub write_generated: bool,
    pub check_generated: bool,
}

/// Game content ids the story may reference, exported from TypeScript into `reference.rs`.
#[derive(Debug, Clone, Copy)]
pub struct ContentReferences {
    pub quest_ids: &'static [&'static str],
    pub objective_ids: &'static [&'static str],
    pub shop_ids: &'static [&'static str],
    /// `(mapId, dialogueId)` for every NPC placed in the world.
    pub npc_placements: &'static [(&'static str, &'static str)],
    /// Scene ids that quest content plays; each must be defined by a beat.
    pub scene_ids: &'static [&'static str],
}

impl ContentReferences {
    pub fn generated() -> Self {
        Self {
            quest_ids: reference::QUEST_IDS,
            objective_ids: reference::OBJECTIVE_IDS,
            shop_ids: reference::SHOP_IDS,
            npc_placements: reference::NPC_PLACEMENTS,
            scene_ids: reference::SCENE_IDS,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoryCheckError {
    message: String,
}

impl fmt::Display for StoryCheckError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for StoryCheckError {}

impl StoryCheckError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

pub fn parse_story_check_args<I, S>(args: I) -> Result<StoryCheckArgs, StoryCheckError>
where
    I: IntoIterator<Item = S>,
    S: AsRef<str>,
{
    let mut mode = None;
    let mut write_report = false;
    let mut write_generated = false;
    let mut check_generated = false;

    for arg in args {
        match arg.as_ref() {
            "--mode=draft" => {
                if mode.replace(CheckMode::Draft).is_some() {
                    return Err(StoryCheckError::new("mode specified more than once"));
                }
            }
            "--mode=strict" => {
                if mode.replace(CheckMode::Strict).is_some() {
                    return Err(StoryCheckError::new("mode specified more than once"));
                }
            }
            arg if arg.starts_with("--mode=") => {
                return Err(StoryCheckError::new(format!("invalid mode argument {arg}")));
            }
            "--write-report" => write_report = true,
            "--write-generated" => write_generated = true,
            "--check-generated" => check_generated = true,
            arg => {
                return Err(StoryCheckError::new(format!("unknown argument {arg}")));
            }
        }
    }

    if write_generated && check_generated {
        return Err(StoryCheckError::new(
            "cannot combine --write-generated with --check-generated",
        ));
    }

    Ok(StoryCheckArgs {
        mode: mode.unwrap_or(CheckMode::Draft),
        write_report,
        write_generated,
        check_generated,
    })
}

pub fn run_story_check(
    mode: CheckMode,
    write_report: bool,
    write_generated: bool,
    check_generated: bool,
) -> Result<StoryCheckResult, StoryCheckError> {
    let root = std::env::current_dir().map_err(|error| {
        StoryCheckError::new(format!("failed to determine current directory: {error}"))
    })?;
    let result = check_story_package(mode, &root, ContentReferences::generated())?;

    if write_report {
        write_file(&root.join(REPORT_PATH), &result.integration_report)?;
    }

    let generated = [
        (
            GENERATED_RUST_PATH,
            generate_story_catalog_source(&result.catalog),
        ),
        (
            GENERATED_BROWSER_PATH,
            generate_browser_catalog_json(&result.catalog),
        ),
    ];
    for (relative_path, contents) in &generated {
        let path = root.join(relative_path);
        if write_generated {
            write_file(&path, contents)?;
        }
        if check_generated {
            let current = fs::read_to_string(&path).map_err(|error| {
                StoryCheckError::new(format!("failed to read {}: {error}", path.display()))
            })?;
            if &current != contents {
                return Err(StoryCheckError::new(format!(
                    "{} is out of date; run bun run story:check",
                    path.display()
                )));
            }
        }
    }

    println!("{}", result.integration_report);
    Ok(result)
}

fn write_file(path: &Path, contents: &str) -> Result<(), StoryCheckError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            StoryCheckError::new(format!(
                "failed to create directory {}: {error}",
                parent.display()
            ))
        })?;
    }
    fs::write(path, contents).map_err(|error| {
        StoryCheckError::new(format!("failed to write {}: {error}", path.display()))
    })
}

fn check_story_package(
    mode: CheckMode,
    root: &Path,
    references: ContentReferences,
) -> Result<StoryCheckResult, StoryCheckError> {
    let story_root = root.join("story");
    let manifest_path = story_root.join("manifest.yaml");
    let manifest_source = fs::read_to_string(&manifest_path).map_err(|error| {
        StoryCheckError::new(format!(
            "failed to read manifest {}: {error}",
            manifest_path.display()
        ))
    })?;

    let manifest = parse_manifest(&manifest_source).map_err(|error| {
        StoryCheckError::new(format!(
            "failed to parse manifest {}: {error}",
            manifest_path.display()
        ))
    })?;

    let mut beat_sources = Vec::new();
    for manifest_beat in manifest_beats(&manifest) {
        let beat_path = story_root.join(&manifest_beat.file);
        let source = fs::read_to_string(&beat_path).map_err(|error| {
            StoryCheckError::new(format!(
                "failed to read beat {}: {error}",
                beat_path.display()
            ))
        })?;
        beat_sources.push((manifest_beat.file.clone(), manifest_beat.id.clone(), source));
    }

    check_story_package_sources(mode, &manifest_source, beat_sources, references)
}

fn check_story_package_sources(
    mode: CheckMode,
    manifest_source: &str,
    beat_sources: Vec<(String, String, String)>,
    references: ContentReferences,
) -> Result<StoryCheckResult, StoryCheckError> {
    let manifest = parse_manifest(manifest_source).map_err(|error| {
        StoryCheckError::new(format!("failed to parse story manifest: {error}"))
    })?;

    let mut errors = validate_manifest(&manifest);
    let mut beats = Vec::new();
    for (path, expected_id, source) in beat_sources {
        match parse_beat_markdown(&source) {
            Ok(beat) => {
                if beat.id != expected_id {
                    errors.push(format!(
                        "{}: beat id {} does not match manifest id {}",
                        path, beat.id, expected_id
                    ));
                }
                errors.extend(
                    validate_beat_references(&beat, &references)
                        .into_iter()
                        .map(|error| format!("{}: {}", path, error)),
                );
                beats.push(beat);
            }
            Err(error) => errors.push(format!("{}: {}", path, error)),
        }
    }
    errors.extend(validate_manifest_beat_references(&manifest, &beats));

    if !errors.is_empty() {
        return Err(StoryCheckError::new(format_errors(
            "story check failed",
            &errors,
        )));
    }

    let unsupported_hooks = collect_unsupported_hooks(&beats);
    if mode == CheckMode::Strict && !unsupported_hooks.is_empty() {
        let errors = unsupported_hooks
            .iter()
            .map(|hook| {
                format!(
                    "unsupported hook {} in beat {} ({})",
                    hook.hook.id, hook.beat_id, hook.hook.reason
                )
            })
            .collect::<Vec<_>>();
        return Err(StoryCheckError::new(format_errors(
            "strict story check failed",
            &errors,
        )));
    }

    let catalog =
        compile_catalog(&manifest.id, &manifest.default_locale, &beats).map_err(|error| {
            StoryCheckError::new(format!("failed to compile story catalog: {error}"))
        })?;

    let catalog_errors = validate_catalog_coverage(&catalog, &references);
    if !catalog_errors.is_empty() {
        return Err(StoryCheckError::new(format_errors(
            "story check failed",
            &catalog_errors,
        )));
    }

    let integration_report = build_integration_report(&manifest, &catalog, &unsupported_hooks);
    Ok(StoryCheckResult {
        integration_report,
        catalog,
    })
}

fn validate_beat_references(beat: &StoryBeat, references: &ContentReferences) -> Vec<String> {
    let placements = references
        .npc_placements
        .iter()
        .copied()
        .collect::<HashSet<_>>();
    let mut errors = Vec::new();

    for dialogue in &beat.dialogues {
        if !placements.contains(&(dialogue.map_id.as_str(), dialogue.npc_id.as_str())) {
            errors.push(format!(
                "beat {} dialogue npc {} is not placed on map {}",
                beat.id, dialogue.npc_id, dialogue.map_id
            ));
        }
        if let Some(shop_id) = &dialogue.shop {
            if !references.shop_ids.contains(&shop_id.as_str()) {
                errors.push(format!(
                    "beat {} dialogue npc {} references unknown shop {}",
                    beat.id, dialogue.npc_id, shop_id
                ));
            }
        }
        match parse_branch_condition(&dialogue.branch) {
            Ok(StoryBranchCondition::Quest(id)) if !references.quest_ids.contains(&id.as_str()) => {
                errors.push(format!(
                    "beat {} dialogue npc {} branch references unknown quest {}",
                    beat.id, dialogue.npc_id, id
                ));
            }
            Ok(StoryBranchCondition::Objective(id))
                if !references.objective_ids.contains(&id.as_str()) =>
            {
                errors.push(format!(
                    "beat {} dialogue npc {} branch references unknown objective {}",
                    beat.id, dialogue.npc_id, id
                ));
            }
            // Malformed conditions are reported by the compiler.
            _ => {}
        }
    }

    errors
}

/// Every placed NPC must be talkable at any point of the story, and every scene the
/// quest content plays must exist.
fn validate_catalog_coverage(
    catalog: &StoryCatalog,
    references: &ContentReferences,
) -> Vec<String> {
    let mut errors = Vec::new();

    for (map_id, npc_id) in references.npc_placements {
        let has_fallback = catalog.npc_dialogues.iter().any(|dialogue| {
            dialogue.npc_id == *npc_id
                && dialogue
                    .branches
                    .iter()
                    .any(|branch| branch.condition == StoryBranchCondition::Always)
        });
        if !has_fallback {
            errors.push(format!(
                "npc {} placed on map {} has no always dialogue branch",
                npc_id, map_id
            ));
        }
    }

    let scene_ids = catalog
        .scenes
        .iter()
        .map(|scene| scene.id.as_str())
        .collect::<HashSet<_>>();
    for scene_id in references.scene_ids {
        if !scene_ids.contains(scene_id) {
            errors.push(format!(
                "scene {} is played by game content but no beat defines it",
                scene_id
            ));
        }
    }

    errors
}

fn validate_manifest_beat_references(manifest: &StoryManifest, beats: &[StoryBeat]) -> Vec<String> {
    let manifest_ids = manifest_beats(manifest)
        .iter()
        .map(|beat| beat.id.as_str())
        .collect::<BTreeSet<_>>();
    let parsed_ids = beats
        .iter()
        .map(|beat| beat.id.as_str())
        .collect::<BTreeSet<_>>();
    let mut errors = Vec::new();

    for missing_id in manifest_ids.difference(&parsed_ids) {
        errors.push(format!("manifest beat {} was not parsed", missing_id));
    }

    for extra_id in parsed_ids.difference(&manifest_ids) {
        errors.push(format!("beat {} is not listed in manifest", extra_id));
    }

    for beat in beats {
        if !manifest
            .chapters
            .iter()
            .any(|chapter| chapter.id == beat.chapter)
        {
            errors.push(format!(
                "beat {} references unknown chapter {}",
                beat.id, beat.chapter
            ));
        }
    }

    errors
}

#[derive(Debug)]
struct UnsupportedHookReport<'a> {
    beat_id: &'a str,
    hook: &'a UnsupportedHook,
}

fn collect_unsupported_hooks(beats: &[StoryBeat]) -> Vec<UnsupportedHookReport<'_>> {
    beats
        .iter()
        .flat_map(|beat| {
            beat.unsupported_hooks
                .iter()
                .map(|hook| UnsupportedHookReport {
                    beat_id: &beat.id,
                    hook,
                })
        })
        .collect()
}

fn build_integration_report(
    manifest: &StoryManifest,
    catalog: &StoryCatalog,
    unsupported_hooks: &[UnsupportedHookReport<'_>],
) -> String {
    let branches = catalog
        .npc_dialogues
        .iter()
        .flat_map(|dialogue| dialogue.branches.iter())
        .collect::<Vec<_>>();
    let line_count = branches
        .iter()
        .map(|branch| branch.lines.len())
        .chain(catalog.scenes.iter().map(|scene| scene.lines.len()))
        .sum::<usize>();

    let mut report = String::new();
    report.push_str("# Story Integration Report\n\n");
    report.push_str("<!-- DO NOT EDIT — @generated by story:check -->\n\n");
    report.push_str(&format!("- Package: `{}`\n", manifest.id));
    report.push_str(&format!(
        "- Default locale: `{}`\n",
        manifest.default_locale
    ));
    report.push_str(&format!(
        "- Beats checked: {}\n",
        manifest_beats(manifest).len()
    ));
    report.push_str(&format!(
        "- NPCs with dialogue: {}\n",
        catalog.npc_dialogues.len()
    ));
    report.push_str(&format!("- Dialogue branches: {}\n", branches.len()));
    report.push_str(&format!("- Scenes: {}\n", catalog.scenes.len()));
    report.push_str(&format!("- Lines: {}\n\n", line_count));
    report.push_str("## Unsupported hooks\n\n");

    if unsupported_hooks.is_empty() {
        report.push_str("No unsupported hooks found.\n");
    } else {
        report
            .push_str("Unsupported hooks require runtime support before strict mode can pass:\n\n");
        for hook in unsupported_hooks {
            report.push_str(&format!(
                "- `{}` in `{}` ({}) - {}\n",
                hook.hook.id, hook.beat_id, hook.hook.kind, hook.hook.reason
            ));
        }
    }

    report
}

fn format_errors(title: &str, errors: &[String]) -> String {
    let mut message = title.to_string();
    for error in errors {
        message.push_str("\n- ");
        message.push_str(error);
    }
    message
}

fn manifest_beats(manifest: &StoryManifest) -> Vec<&super::manifest::StoryManifestBeat> {
    manifest
        .chapters
        .iter()
        .flat_map(|chapter| chapter.beats.iter())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const REFERENCES: ContentReferences = ContentReferences {
        quest_ids: &["prologue-morning"],
        objective_ids: &["talk-to-borak"],
        shop_ids: &["herb-hut"],
        npc_placements: &[("hero-house", "borak"), ("item-shop", "mira")],
        scene_ids: &["prologue.opening"],
    };

    const MANIFEST: &str = r#"
id: gliese
title: Gliese
entryBeat: prologue.morning
defaultLocale: en
chapters:
  - id: prologue
    title: Prologue
    beats:
      - id: prologue.morning
        file: beats/prologue/morning.md
"#;

    const VALID_BEAT: &str = r#"::: story
id: prologue.morning
chapter: prologue
map: hero-house
:::

::: scene
id: prologue.opening
:::

Dawn over Sundrop.

::: dialogue
npc: borak
branch: objective:talk-to-borak
speaker: Borak
:::

Sit down, Grik.

::: dialogue
npc: borak
branch: always
speaker: Borak
:::

Rest.

::: dialogue
npc: mira
map: item-shop
branch: always
speaker: Mira
choices: shop, close
shop: herb-hut
:::

Herbs?
"#;

    fn check(mode: CheckMode, beat: &str) -> Result<StoryCheckResult, StoryCheckError> {
        check_story_package_sources(
            mode,
            MANIFEST,
            vec![(
                "beats/prologue/morning.md".to_string(),
                "prologue.morning".to_string(),
                beat.to_string(),
            )],
            REFERENCES,
        )
    }

    fn check_error(beat: &str) -> String {
        check(CheckMode::Draft, beat).unwrap_err().to_string()
    }

    #[test]
    fn compiles_a_valid_package_and_reports_counts() {
        let result = check(CheckMode::Strict, VALID_BEAT).expect("valid package");

        assert_eq!(result.catalog.npc_dialogues.len(), 2);
        assert_eq!(result.catalog.scenes.len(), 1);
        assert!(result.integration_report.contains("- Dialogue branches: 3"));
        assert!(result.integration_report.contains("- Lines: 4"));
    }

    #[test]
    fn draft_reports_unsupported_hooks_and_strict_rejects_them() {
        let beat = format!(
            "{VALID_BEAT}\n::: unsupported-hook\nid: camera.pan\nkind: camera-pan\nreason: Needs camera support.\n:::\n"
        );

        let draft = check(CheckMode::Draft, &beat).expect("draft allows hooks");
        assert!(draft.integration_report.contains("`camera.pan`"));

        let strict = check(CheckMode::Strict, &beat).unwrap_err().to_string();
        assert!(strict.contains("unsupported hook camera.pan"));
    }

    #[test]
    fn rejects_beat_id_that_does_not_match_manifest_entry() {
        let error = check_error(&VALID_BEAT.replace("id: prologue.morning", "id: prologue.other"));

        assert!(error.contains("does not match manifest id"));
    }

    #[test]
    fn rejects_dialogue_npc_not_placed_on_its_map() {
        let error = check_error(&VALID_BEAT.replace("map: item-shop\n", ""));

        assert!(error.contains("beats/prologue/morning.md"));
        assert!(error.contains("dialogue npc mira is not placed on map hero-house"));
    }

    #[test]
    fn rejects_unknown_shop_quest_and_objective_ids() {
        assert!(
            check_error(&VALID_BEAT.replace("shop: herb-hut", "shop: forge"))
                .contains("references unknown shop forge")
        );
        assert!(check_error(
            &VALID_BEAT.replace("objective:talk-to-borak", "objective:talk-to-drogg")
        )
        .contains("branch references unknown objective talk-to-drogg"));
        assert!(
            check_error(&VALID_BEAT.replace("objective:talk-to-borak", "quest:prologue-raid"))
                .contains("branch references unknown quest prologue-raid")
        );
    }

    #[test]
    fn requires_an_always_branch_for_every_placed_npc() {
        let error = check_error(&VALID_BEAT.replace(
            "branch: always\nspeaker: Borak",
            "branch: quest:prologue-morning\nspeaker: Borak",
        ));

        assert!(error.contains("npc borak placed on map hero-house has no always dialogue branch"));
    }

    #[test]
    fn requires_every_referenced_scene_to_be_defined() {
        let error = check_error(&VALID_BEAT.replace("id: prologue.opening", "id: prologue.dusk"));

        assert!(error.contains("scene prologue.opening is played by game content"));
    }

    #[test]
    fn rejects_invalid_mode_arg() {
        let error = parse_story_check_args(["--mode=loose"]).unwrap_err();

        assert!(error.to_string().contains("invalid mode"));
    }

    #[test]
    fn rejects_unknown_flag() {
        let error = parse_story_check_args(["--write-report", "--verbose"]).unwrap_err();

        assert!(error.to_string().contains("unknown argument --verbose"));
    }

    #[test]
    fn rejects_duplicate_or_conflicting_mode_args() {
        let duplicate = parse_story_check_args(["--mode=strict", "--mode=strict"]).unwrap_err();
        let conflicting = parse_story_check_args(["--mode=draft", "--mode=strict"]).unwrap_err();

        assert!(duplicate
            .to_string()
            .contains("mode specified more than once"));
        assert!(conflicting
            .to_string()
            .contains("mode specified more than once"));
    }

    #[test]
    fn rejects_write_and_check_generated_together() {
        let error = parse_story_check_args(["--write-generated", "--check-generated"]).unwrap_err();

        assert!(error
            .to_string()
            .contains("cannot combine --write-generated with --check-generated"));
    }

    #[test]
    fn parses_valid_strict_args() {
        let args = parse_story_check_args(["--mode=strict", "--write-report", "--check-generated"])
            .expect("valid strict args should parse");

        assert_eq!(args.mode, CheckMode::Strict);
        assert!(args.write_report);
        assert!(!args.write_generated);
        assert!(args.check_generated);
    }
}
