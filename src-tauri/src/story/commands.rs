use serde::{Deserialize, Serialize};

use super::types::{
    StoryBranchCondition, StoryCatalog, StoryDialogueAction, StoryDialogueBranch, StoryLine,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueRequest {
    pub npc_id: String,
    pub map_id: String,
    pub locale: String,
    pub progress: StoryProgress,
}

/// The player's current main-quest position, as the frontend quest runtime sees it.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryProgress {
    pub quest_id: Option<String>,
    pub objective_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueResponse {
    pub session_id: String,
    pub lines: Vec<StoryLine>,
    pub actions: Vec<StoryDialogueAction>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorySceneRequest {
    pub scene_id: String,
    pub locale: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorySceneResponse {
    pub session_id: String,
    pub lines: Vec<StoryLine>,
}

#[tauri::command]
pub fn get_npc_dialogue(request: StoryDialogueRequest) -> Result<StoryDialogueResponse, String> {
    get_npc_dialogue_from_catalog(&super::generated::story_catalog(), request)
}

#[tauri::command]
pub fn get_story_scene(request: StorySceneRequest) -> Result<StorySceneResponse, String> {
    get_story_scene_from_catalog(&super::generated::story_catalog(), request)
}

pub fn get_npc_dialogue_from_catalog(
    catalog: &StoryCatalog,
    request: StoryDialogueRequest,
) -> Result<StoryDialogueResponse, String> {
    ensure_locale(catalog, &request.locale)?;

    let dialogue = catalog
        .npc_dialogues
        .iter()
        .find(|dialogue| dialogue.npc_id == request.npc_id)
        .ok_or_else(|| format!("unknown story npc: {}", request.npc_id))?;

    if dialogue.map_id != request.map_id {
        return Err(format!(
            "story npc {} is not available on map {}",
            request.npc_id, request.map_id
        ));
    }

    let branch = select_branch(&dialogue.branches, &request.progress)
        .ok_or_else(|| format!("no story dialogue branch for npc: {}", request.npc_id))?;

    Ok(StoryDialogueResponse {
        session_id: format!(
            "npc:{}:{}",
            request.npc_id,
            branch_condition_key(&branch.condition)
        ),
        lines: branch.lines.clone(),
        actions: branch.actions.clone(),
    })
}

pub fn get_story_scene_from_catalog(
    catalog: &StoryCatalog,
    request: StorySceneRequest,
) -> Result<StorySceneResponse, String> {
    ensure_locale(catalog, &request.locale)?;

    let scene = catalog
        .scenes
        .iter()
        .find(|scene| scene.id == request.scene_id)
        .ok_or_else(|| format!("unknown story scene: {}", request.scene_id))?;

    Ok(StorySceneResponse {
        session_id: format!("scene:{}", scene.id),
        lines: scene.lines.clone(),
    })
}

fn ensure_locale(catalog: &StoryCatalog, locale: &str) -> Result<(), String> {
    if locale == catalog.default_locale {
        Ok(())
    } else {
        Err(format!("unsupported story locale: {}", locale))
    }
}

/// The current objective wins over the current quest, which wins over `always`.
fn select_branch<'a>(
    branches: &'a [StoryDialogueBranch],
    progress: &StoryProgress,
) -> Option<&'a StoryDialogueBranch> {
    let find = |condition: StoryBranchCondition| {
        branches.iter().find(|branch| branch.condition == condition)
    };

    progress
        .objective_id
        .clone()
        .and_then(|id| find(StoryBranchCondition::Objective(id)))
        .or_else(|| {
            progress
                .quest_id
                .clone()
                .and_then(|id| find(StoryBranchCondition::Quest(id)))
        })
        .or_else(|| find(StoryBranchCondition::Always))
}

fn branch_condition_key(condition: &StoryBranchCondition) -> String {
    match condition {
        StoryBranchCondition::Always => "always".to_string(),
        StoryBranchCondition::Quest(id) => format!("quest:{}", id),
        StoryBranchCondition::Objective(id) => format!("objective:{}", id),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::story::types::{NpcStoryDialogue, StoryIntent, StoryScene};

    fn line(speaker: &str, text: &str) -> StoryLine {
        StoryLine {
            speaker: speaker.to_string(),
            text: text.to_string(),
        }
    }

    fn branch(condition: StoryBranchCondition, text: &str) -> StoryDialogueBranch {
        StoryDialogueBranch {
            beat_id: "prologue.test".to_string(),
            condition,
            lines: vec![line("Borak", text)],
            actions: vec![],
        }
    }

    fn catalog() -> StoryCatalog {
        StoryCatalog {
            package_id: "gliese".to_string(),
            default_locale: "en".to_string(),
            npc_dialogues: vec![
                NpcStoryDialogue {
                    npc_id: "borak".to_string(),
                    map_id: "hero-house".to_string(),
                    branches: vec![
                        branch(StoryBranchCondition::Always, "Rest, son."),
                        branch(
                            StoryBranchCondition::Quest("prologue-trials".to_string()),
                            "The trials wait.",
                        ),
                        branch(
                            StoryBranchCondition::Objective("talk-to-borak".to_string()),
                            "Sit down, Grik.",
                        ),
                    ],
                },
                NpcStoryDialogue {
                    npc_id: "mira".to_string(),
                    map_id: "item-shop".to_string(),
                    branches: vec![StoryDialogueBranch {
                        actions: vec![StoryDialogueAction {
                            id: "shop".to_string(),
                            label: "Shop".to_string(),
                            intent: StoryIntent::OpenShop {
                                shop_id: "herb-hut".to_string(),
                            },
                        }],
                        ..branch(StoryBranchCondition::Always, "Herbs?")
                    }],
                },
            ],
            scenes: vec![StoryScene {
                id: "prologue.opening".to_string(),
                beat_id: "prologue.test".to_string(),
                lines: vec![line("", "Dawn over Sundrop.")],
            }],
        }
    }

    fn request(quest_id: Option<&str>, objective_id: Option<&str>) -> StoryDialogueRequest {
        StoryDialogueRequest {
            npc_id: "borak".to_string(),
            map_id: "hero-house".to_string(),
            locale: "en".to_string(),
            progress: StoryProgress {
                quest_id: quest_id.map(str::to_string),
                objective_id: objective_id.map(str::to_string),
            },
        }
    }

    #[test]
    fn prefers_objective_then_quest_then_always() {
        let objective = get_npc_dialogue_from_catalog(
            &catalog(),
            request(Some("prologue-trials"), Some("talk-to-borak")),
        )
        .expect("objective branch");
        assert_eq!(objective.session_id, "npc:borak:objective:talk-to-borak");
        assert_eq!(objective.lines, vec![line("Borak", "Sit down, Grik.")]);

        let quest = get_npc_dialogue_from_catalog(
            &catalog(),
            request(Some("prologue-trials"), Some("find-tracks")),
        )
        .expect("quest branch");
        assert_eq!(quest.session_id, "npc:borak:quest:prologue-trials");

        let fallback =
            get_npc_dialogue_from_catalog(&catalog(), request(Some("prologue-raid"), None))
                .expect("always branch");
        assert_eq!(fallback.session_id, "npc:borak:always");
    }

    #[test]
    fn rejects_unknown_npc_wrong_map_and_unsupported_locale() {
        let unknown = get_npc_dialogue_from_catalog(
            &catalog(),
            StoryDialogueRequest {
                npc_id: "unknown-npc".to_string(),
                ..request(None, None)
            },
        )
        .expect_err("unknown npc");
        assert_eq!(unknown, "unknown story npc: unknown-npc");

        let wrong_map = get_npc_dialogue_from_catalog(
            &catalog(),
            StoryDialogueRequest {
                map_id: "overworld".to_string(),
                ..request(None, None)
            },
        )
        .expect_err("wrong map");
        assert_eq!(
            wrong_map,
            "story npc borak is not available on map overworld"
        );

        let locale = get_npc_dialogue_from_catalog(
            &catalog(),
            StoryDialogueRequest {
                locale: "ja".to_string(),
                ..request(None, None)
            },
        )
        .expect_err("locale");
        assert_eq!(locale, "unsupported story locale: ja");
    }

    #[test]
    fn errors_when_no_branch_matches() {
        let mut catalog = catalog();
        catalog.npc_dialogues[0]
            .branches
            .retain(|branch| branch.condition != StoryBranchCondition::Always);

        let error = get_npc_dialogue_from_catalog(&catalog, request(None, None))
            .expect_err("no matching branch");

        assert_eq!(error, "no story dialogue branch for npc: borak");
    }

    #[test]
    fn returns_scenes_by_id() {
        let scene = get_story_scene_from_catalog(
            &catalog(),
            StorySceneRequest {
                scene_id: "prologue.opening".to_string(),
                locale: "en".to_string(),
            },
        )
        .expect("scene");
        assert_eq!(scene.session_id, "scene:prologue.opening");
        assert_eq!(scene.lines, vec![line("", "Dawn over Sundrop.")]);

        let missing = get_story_scene_from_catalog(
            &catalog(),
            StorySceneRequest {
                scene_id: "nope".to_string(),
                locale: "en".to_string(),
            },
        )
        .expect_err("missing scene");
        assert_eq!(missing, "unknown story scene: nope");
    }

    #[test]
    fn request_and_response_use_camel_case() {
        let request: StoryDialogueRequest = serde_json::from_value(serde_json::json!({
            "npcId": "mira",
            "mapId": "item-shop",
            "locale": "en",
            "progress": { "questId": null, "objectiveId": null }
        }))
        .expect("request deserializes");

        let response = get_npc_dialogue_from_catalog(&catalog(), request).expect("dialogue");
        let value = serde_json::to_value(response).expect("response serializes");

        assert_eq!(value["sessionId"], "npc:mira:always");
        assert_eq!(value["lines"][0]["speaker"], "Borak");
        assert_eq!(value["actions"][0]["intent"]["type"], "openShop");
        assert_eq!(value["actions"][0]["intent"]["shopId"], "herb-hut");
        assert!(value.get("session_id").is_none());
    }
}
