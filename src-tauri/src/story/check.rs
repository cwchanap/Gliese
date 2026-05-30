use std::collections::{BTreeSet, HashSet};
use std::error::Error;
use std::fmt;
use std::fs;
use std::path::Path;

use super::beat::{parse_beat_markdown, StoryBeat, UnsupportedHook};
use super::codegen::generate_story_catalog_source;
use super::compiler::compile_catalog;
use super::manifest::{parse_manifest, validate_manifest, StoryManifest};
use super::reference::{ENEMY_IDS, MAP_IDS, NPC_IDS, QUEST_IDS, SHOP_IDS};
use super::types::StoryCatalog;

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
pub struct StoryCheckError {
    message: String,
}

impl fmt::Display for StoryCheckError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for StoryCheckError {}

pub fn run_story_check(
    mode: CheckMode,
    write_report: bool,
    write_generated: bool,
    check_generated: bool,
) -> Result<StoryCheckResult, StoryCheckError> {
    let root = std::env::current_dir().map_err(|error| {
        StoryCheckError::new(format!("failed to determine current directory: {error}"))
    })?;
    let result = check_story_package(mode, &root)?;

    if write_report {
        let report_path = root.join("story/reports/story-integration-report.md");
        if let Some(parent) = report_path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                StoryCheckError::new(format!(
                    "failed to create report directory {}: {error}",
                    parent.display()
                ))
            })?;
        }
        fs::write(&report_path, &result.integration_report).map_err(|error| {
            StoryCheckError::new(format!(
                "failed to write report {}: {error}",
                report_path.display()
            ))
        })?;
    }

    let generated_source = generate_story_catalog_source(&result.catalog);
    let generated_path = root.join("src-tauri/src/story/generated.rs");

    if write_generated {
        fs::write(&generated_path, &generated_source).map_err(|error| {
            StoryCheckError::new(format!(
                "failed to write generated catalog {}: {error}",
                generated_path.display()
            ))
        })?;
    }

    if check_generated {
        let current_source = fs::read_to_string(&generated_path).map_err(|error| {
            StoryCheckError::new(format!(
                "failed to read generated catalog {}: {error}",
                generated_path.display()
            ))
        })?;
        if current_source != generated_source {
            return Err(StoryCheckError::new(format!(
                "{} is out of date; run bun run story:check",
                generated_path.display()
            )));
        }
    }

    println!("{}", result.integration_report);
    Ok(result)
}

fn check_story_package(mode: CheckMode, root: &Path) -> Result<StoryCheckResult, StoryCheckError> {
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

    check_story_package_sources(mode, manifest_source, beat_sources)
}

fn check_story_package_sources(
    mode: CheckMode,
    manifest_source: String,
    beat_sources: Vec<(String, String, String)>,
) -> Result<StoryCheckResult, StoryCheckError> {
    let mut errors = Vec::new();
    let manifest = match parse_manifest(&manifest_source) {
        Ok(manifest) => manifest,
        Err(error) => {
            return Err(StoryCheckError::new(format!(
                "failed to parse story manifest: {error}"
            )))
        }
    };

    errors.extend(validate_manifest(&manifest));
    errors.extend(validate_required_content(&manifest));

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
                beats.push(beat);
            }
            Err(error) => errors.push(format!("{}: {}", path, error)),
        }
    }

    errors.extend(validate_manifest_beat_references(&manifest, &beats));
    errors.extend(validate_beat_content_references(&beats));

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
    let integration_report = build_integration_report(&manifest, &beats, &unsupported_hooks);

    Ok(StoryCheckResult {
        integration_report,
        catalog,
    })
}

fn validate_required_content(manifest: &StoryManifest) -> Vec<String> {
    let mut errors = Vec::new();
    errors.extend(validate_known_ids(
        "requiredContent.maps",
        &manifest.required_content.maps,
        MAP_IDS,
    ));
    errors.extend(validate_known_ids(
        "requiredContent.npcs",
        &manifest.required_content.npcs,
        NPC_IDS,
    ));
    errors.extend(validate_known_ids(
        "requiredContent.quests",
        &manifest.required_content.quests,
        QUEST_IDS,
    ));
    errors.extend(validate_known_ids(
        "requiredContent.shops",
        &manifest.required_content.shops,
        SHOP_IDS,
    ));
    errors.extend(validate_known_ids(
        "requiredContent.enemies",
        &manifest.required_content.enemies,
        ENEMY_IDS,
    ));
    errors
}

fn validate_known_ids(field: &str, ids: &[String], known_ids: &[&str]) -> Vec<String> {
    let known = known_ids.iter().copied().collect::<HashSet<_>>();
    ids.iter()
        .filter(|id| !known.contains(id.as_str()))
        .map(|id| format!("unknown {} id {}", field, id))
        .collect()
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

fn validate_beat_content_references(beats: &[StoryBeat]) -> Vec<String> {
    let maps = MAP_IDS.iter().copied().collect::<HashSet<_>>();
    let npcs = NPC_IDS.iter().copied().collect::<HashSet<_>>();
    let mut errors = Vec::new();

    for beat in beats {
        if !maps.contains(beat.map_id.as_str()) {
            errors.push(format!(
                "beat {} references unknown map {}",
                beat.id, beat.map_id
            ));
        }
        if !npcs.contains(beat.primary_npc_id.as_str()) {
            errors.push(format!(
                "beat {} references unknown primaryNpc {}",
                beat.id, beat.primary_npc_id
            ));
        }
        for dialogue in &beat.dialogues {
            if !npcs.contains(dialogue.npc_id.as_str()) {
                errors.push(format!(
                    "beat {} dialogue references unknown npc {}",
                    beat.id, dialogue.npc_id
                ));
            }
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
    let mut hooks = Vec::new();
    for beat in beats {
        for hook in &beat.unsupported_hooks {
            hooks.push(UnsupportedHookReport {
                beat_id: &beat.id,
                hook,
            });
        }
    }
    hooks
}

fn build_integration_report(
    manifest: &StoryManifest,
    beats: &[StoryBeat],
    unsupported_hooks: &[UnsupportedHookReport<'_>],
) -> String {
    let dialogue_count = beats.iter().map(|beat| beat.dialogues.len()).sum::<usize>();
    let mut report = String::new();
    report.push_str("# Story Integration Report\n\n");
    report.push_str(&format!("- Package: `{}`\n", manifest.id));
    report.push_str(&format!(
        "- Default locale: `{}`\n",
        manifest.default_locale
    ));
    report.push_str(&format!("- Beats checked: {}\n", beats.len()));
    report.push_str(&format!(
        "- Dialogue blocks compiled: {}\n\n",
        dialogue_count
    ));
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

impl StoryCheckError {
    fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
        }
    }
}

#[cfg(test)]
fn check_story_package_for_test(
    mode: CheckMode,
    include_unsupported_hook: bool,
) -> Result<StoryCheckResult, StoryCheckError> {
    let hook = if include_unsupported_hook {
        r#"
::: unsupported-hook
id: cutscene.guild-master-points
kind: camera-pan
reason: Needs camera support.
:::
"#
    } else {
        ""
    };
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
  maps: [guild-hall]
  npcs: [guild-master]
  quests: [investigate-the-ruins]
  shops: []
  enemies: []
"#
    .to_string();
    let beat_source = format!(
        r#"# Guild Master

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

Take this work.
{hook}
"#
    );

    check_story_package_sources(
        mode,
        manifest_source,
        vec![(
            "beats/prologue/guild-master.md".to_string(),
            "prologue.guild-master".to_string(),
            beat_source,
        )],
    )
}

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

    #[test]
    fn rejects_beat_id_that_does_not_match_manifest_entry() {
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
requiredContent: {}
"#
        .to_string();
        let beat_source = r#"# Guild Master

::: story
id: prologue.other
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::
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
        .unwrap_err();

        assert!(error.to_string().contains("does not match manifest id"));
    }
}
