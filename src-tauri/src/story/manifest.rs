use serde::Deserialize;
use std::collections::HashSet;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
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
#[serde(deny_unknown_fields)]
pub struct StoryManifestChapter {
    pub id: String,
    pub title: String,
    pub beats: Vec<StoryManifestBeat>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct StoryManifestBeat {
    pub id: String,
    pub file: String,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(deny_unknown_fields)]
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
        errors.push(format!(
            "unsupported defaultLocale {}",
            manifest.default_locale
        ));
    }

    for chapter in &manifest.chapters {
        for beat in &chapter.beats {
            if !beat_ids.insert(beat.id.clone()) {
                errors.push(format!("duplicate beat id {}", beat.id));
            }
        }
    }

    if !beat_ids.contains(&manifest.entry_beat) {
        errors.push(format!(
            "entryBeat {} is not listed in chapters",
            manifest.entry_beat
        ));
    }

    errors
}

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
        assert_eq!(
            manifest.chapters[0].beats[0].file,
            "beats/prologue/guild-master.md"
        );
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
        assert!(errors
            .iter()
            .any(|error| error.contains("duplicate beat id")));
    }

    #[test]
    fn rejects_unknown_top_level_or_nested_yaml_key() {
        assert!(parse_manifest(
            r#"
id: sundrop-ruins
title: Sundrop Ruins
entryBeat: prologue.guild-master
defaultLocale: en
unexpected: value
chapters:
  - id: prologue
    title: Prologue
    beats:
      - id: prologue.guild-master
        file: beats/prologue/guild-master.md
requiredContent: {}
"#,
        )
        .is_err());

        assert!(parse_manifest(
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
  npc: [guild-master]
"#,
        )
        .is_err());
    }

    #[test]
    fn reports_unsupported_default_locale() {
        let manifest = parse_manifest(
            r#"
id: sundrop-ruins
title: Sundrop Ruins
entryBeat: prologue.guild-master
defaultLocale: ja
chapters:
  - id: prologue
    title: Prologue
    beats:
      - id: prologue.guild-master
        file: beats/prologue/guild-master.md
requiredContent: {}
"#,
        )
        .expect("yaml parses");

        let errors = validate_manifest(&manifest);
        assert!(errors
            .iter()
            .any(|error| error.contains("unsupported defaultLocale ja")));
    }

    #[test]
    fn reports_entry_beat_missing_from_chapters() {
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
      - id: prologue.villager
        file: beats/prologue/villager.md
requiredContent: {}
"#,
        )
        .expect("yaml parses");

        let errors = validate_manifest(&manifest);
        assert!(errors.iter().any(|error| {
            error.contains("entryBeat prologue.guild-master is not listed in chapters")
        }));
    }
}
