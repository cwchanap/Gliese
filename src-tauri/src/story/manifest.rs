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
}
