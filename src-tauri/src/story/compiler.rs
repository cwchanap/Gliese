use std::collections::{btree_map::Entry, BTreeMap, BTreeSet};

use super::beat::{BeatDialogue, BeatLine, BeatScene, StoryBeat};
use super::types::{
    NpcStoryDialogue, StoryBranchCondition, StoryCatalog, StoryDialogueAction, StoryDialogueBranch,
    StoryIntent, StoryLine, StoryScene,
};

struct NpcDialogueAccumulator {
    map_id: String,
    branches: Vec<StoryDialogueBranch>,
}

pub fn compile_catalog(
    package_id: &str,
    default_locale: &str,
    beats: &[StoryBeat],
) -> Result<StoryCatalog, String> {
    let mut dialogues_by_npc: BTreeMap<String, NpcDialogueAccumulator> = BTreeMap::new();
    let mut scenes = Vec::new();
    let mut scene_ids = BTreeSet::new();

    for beat in beats {
        for dialogue in &beat.dialogues {
            let branch = compile_dialogue(&beat.id, dialogue)?;
            match dialogues_by_npc.entry(dialogue.npc_id.clone()) {
                Entry::Vacant(entry) => {
                    entry.insert(NpcDialogueAccumulator {
                        map_id: dialogue.map_id.clone(),
                        branches: vec![branch],
                    });
                }
                Entry::Occupied(mut entry) => {
                    let existing = entry.get_mut();
                    if existing.map_id != dialogue.map_id {
                        return Err(format!(
                            "story npc {} has dialogue on maps {} and {}; an npc id belongs to exactly one map",
                            dialogue.npc_id, existing.map_id, dialogue.map_id
                        ));
                    }
                    if existing
                        .branches
                        .iter()
                        .any(|candidate| candidate.condition == branch.condition)
                    {
                        return Err(format!(
                            "story npc {} has more than one {} branch",
                            dialogue.npc_id, dialogue.branch
                        ));
                    }
                    existing.branches.push(branch);
                }
            }
        }

        for scene in &beat.scenes {
            if !scene_ids.insert(scene.id.clone()) {
                return Err(format!("duplicate scene id {}", scene.id));
            }
            scenes.push(compile_scene(&beat.id, scene)?);
        }
    }

    Ok(StoryCatalog {
        package_id: package_id.to_string(),
        default_locale: default_locale.to_string(),
        npc_dialogues: dialogues_by_npc
            .into_iter()
            .map(|(npc_id, dialogue)| NpcStoryDialogue {
                npc_id,
                map_id: dialogue.map_id,
                branches: dialogue.branches,
            })
            .collect(),
        scenes,
    })
}

pub fn parse_branch_condition(branch: &str) -> Result<StoryBranchCondition, String> {
    if branch == "always" {
        return Ok(StoryBranchCondition::Always);
    }
    if let Some(quest_id) = branch.strip_prefix("quest:") {
        return non_empty_id(quest_id, branch).map(StoryBranchCondition::Quest);
    }
    if let Some(objective_id) = branch.strip_prefix("objective:") {
        return non_empty_id(objective_id, branch).map(StoryBranchCondition::Objective);
    }
    Err(format!(
        "unknown dialogue branch condition {}; use always, quest:<questId>, or objective:<objectiveId>",
        branch
    ))
}

fn non_empty_id(id: &str, branch: &str) -> Result<String, String> {
    let id = id.trim();
    if id.is_empty() {
        Err(format!(
            "dialogue branch condition {} has an empty id",
            branch
        ))
    } else {
        Ok(id.to_string())
    }
}

fn compile_dialogue(beat_id: &str, dialogue: &BeatDialogue) -> Result<StoryDialogueBranch, String> {
    if dialogue.lines.is_empty() {
        return Err(format!(
            "dialogue for npc {} has no dialogue lines",
            dialogue.npc_id
        ));
    }

    Ok(StoryDialogueBranch {
        beat_id: beat_id.to_string(),
        condition: parse_branch_condition(&dialogue.branch)?,
        lines: compile_lines(&dialogue.lines, &dialogue.speaker),
        actions: dialogue
            .choices
            .iter()
            .map(|choice| compile_action(choice, dialogue))
            .collect::<Result<Vec<_>, _>>()?,
    })
}

fn compile_scene(beat_id: &str, scene: &BeatScene) -> Result<StoryScene, String> {
    if scene.lines.is_empty() {
        return Err(format!("scene {} has no lines", scene.id));
    }

    Ok(StoryScene {
        id: scene.id.clone(),
        beat_id: beat_id.to_string(),
        lines: compile_lines(&scene.lines, scene.speaker.as_deref().unwrap_or("")),
    })
}

fn compile_lines(lines: &[BeatLine], default_speaker: &str) -> Vec<StoryLine> {
    lines
        .iter()
        .map(|line| StoryLine {
            speaker: line
                .speaker
                .clone()
                .unwrap_or_else(|| default_speaker.to_string()),
            text: line.text.clone(),
        })
        .collect()
}

fn compile_action(choice: &str, dialogue: &BeatDialogue) -> Result<StoryDialogueAction, String> {
    let npc_id = &dialogue.npc_id;
    let (label, intent) = match choice {
        "shop" => {
            let shop_id = dialogue
                .shop
                .as_deref()
                .ok_or_else(|| format!("missing shop field for npc {}", npc_id))?;
            (
                "Shop",
                StoryIntent::OpenShop {
                    shop_id: shop_id.to_string(),
                },
            )
        }
        "close" => ("Close", StoryIntent::Close),
        _ => {
            return Err(format!(
                "unknown dialogue choice {} for npc {}",
                choice, npc_id
            ));
        }
    };

    Ok(StoryDialogueAction {
        id: choice.to_string(),
        label: label.to_string(),
        intent,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::story::beat::parse_beat_markdown;

    fn beat(source: &str) -> StoryBeat {
        parse_beat_markdown(source).expect("beat should parse")
    }

    #[test]
    fn groups_branches_by_npc_across_beats_and_resolves_speakers() {
        let morning = beat(
            r#"::: story
id: prologue.morning
chapter: prologue
map: guild-hall
:::

::: dialogue
npc: borak
branch: objective:meet-borak
speaker: Borak
:::

You are late.

[Drogg] He overslept.
"#,
        );
        let evening = beat(
            r#"::: story
id: prologue.evening
chapter: prologue
map: guild-hall
:::

::: dialogue
npc: borak
branch: always
speaker: Borak
choices: close
:::

Go home.

::: scene
id: scene.dusk
:::

The sun sets.
"#,
        );

        let catalog = compile_catalog("gliese", "en", &[morning, evening]).expect("compile");

        assert_eq!(catalog.npc_dialogues.len(), 1);
        let borak = &catalog.npc_dialogues[0];
        assert_eq!(borak.map_id, "guild-hall");
        assert_eq!(borak.branches.len(), 2);
        assert_eq!(borak.branches[0].beat_id, "prologue.morning");
        assert_eq!(
            borak.branches[0].condition,
            StoryBranchCondition::Objective("meet-borak".to_string())
        );
        assert_eq!(
            borak.branches[0].lines,
            vec![
                StoryLine {
                    speaker: "Borak".to_string(),
                    text: "You are late.".to_string()
                },
                StoryLine {
                    speaker: "Drogg".to_string(),
                    text: "He overslept.".to_string()
                }
            ]
        );
        assert_eq!(borak.branches[1].actions[0].intent, StoryIntent::Close);
        assert_eq!(catalog.scenes[0].id, "scene.dusk");
        assert_eq!(catalog.scenes[0].lines[0].speaker, "");
    }

    #[test]
    fn parses_branch_conditions() {
        assert_eq!(
            parse_branch_condition("always"),
            Ok(StoryBranchCondition::Always)
        );
        assert_eq!(
            parse_branch_condition("quest:prologue-raid"),
            Ok(StoryBranchCondition::Quest("prologue-raid".to_string()))
        );
        assert!(parse_branch_condition("objective:")
            .unwrap_err()
            .contains("empty id"));
        assert!(parse_branch_condition("briefing")
            .unwrap_err()
            .contains("unknown dialogue branch condition briefing"));
    }

    #[test]
    fn rejects_an_npc_spread_over_two_maps() {
        let first = beat(
            "::: story\nid: a\nchapter: prologue\nmap: guild-hall\n:::\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\n:::\n\nHi.\n",
        );
        let second = beat(
            "::: story\nid: b\nchapter: prologue\nmap: hero-house\n:::\n\n::: dialogue\nnpc: borak\nbranch: quest:q\nspeaker: Borak\n:::\n\nHi.\n",
        );

        let error = compile_catalog("gliese", "en", &[first, second]).unwrap_err();

        assert!(error.contains("story npc borak has dialogue on maps guild-hall and hero-house"));
    }

    #[test]
    fn rejects_duplicate_conditions_scenes_and_unknown_choices() {
        let duplicate_branch = beat(
            "::: story\nid: a\nchapter: prologue\nmap: guild-hall\n:::\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\n:::\n\nHi.\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\n:::\n\nAgain.\n",
        );
        assert!(compile_catalog("gliese", "en", &[duplicate_branch])
            .unwrap_err()
            .contains("more than one always branch"));

        let duplicate_scene = beat(
            "::: story\nid: a\nchapter: prologue\n:::\n\n::: scene\nid: s\n:::\n\nOne.\n\n::: scene\nid: s\n:::\n\nTwo.\n",
        );
        assert!(compile_catalog("gliese", "en", &[duplicate_scene])
            .unwrap_err()
            .contains("duplicate scene id s"));

        let unknown_choice = beat(
            "::: story\nid: a\nchapter: prologue\nmap: guild-hall\n:::\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\nchoices: quest\n:::\n\nHi.\n",
        );
        assert!(compile_catalog("gliese", "en", &[unknown_choice])
            .unwrap_err()
            .contains("unknown dialogue choice quest"));

        let missing_shop = beat(
            "::: story\nid: a\nchapter: prologue\nmap: item-shop\n:::\n\n::: dialogue\nnpc: mira\nbranch: always\nspeaker: Mira\nchoices: shop\n:::\n\nHi.\n",
        );
        assert!(compile_catalog("gliese", "en", &[missing_shop])
            .unwrap_err()
            .contains("missing shop field for npc mira"));
    }

    #[test]
    fn rejects_empty_dialogue_and_scene_lines() {
        let empty_dialogue = beat(
            "::: story\nid: a\nchapter: prologue\nmap: guild-hall\n:::\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\n:::\n",
        );
        assert!(compile_catalog("gliese", "en", &[empty_dialogue])
            .unwrap_err()
            .contains("dialogue for npc borak has no dialogue lines"));

        let empty_scene =
            beat("::: story\nid: a\nchapter: prologue\n:::\n\n::: scene\nid: s\n:::\n");
        assert!(compile_catalog("gliese", "en", &[empty_scene])
            .unwrap_err()
            .contains("scene s has no lines"));
    }
}
