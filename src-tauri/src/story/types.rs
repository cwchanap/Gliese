use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryCatalog {
    pub package_id: String,
    pub default_locale: String,
    pub npc_dialogues: Vec<NpcStoryDialogue>,
    pub scenes: Vec<StoryScene>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NpcStoryDialogue {
    pub npc_id: String,
    pub map_id: String,
    pub branches: Vec<StoryDialogueBranch>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryDialogueBranch {
    pub beat_id: String,
    pub condition: StoryBranchCondition,
    pub lines: Vec<StoryLine>,
    pub actions: Vec<StoryDialogueAction>,
}

/// One spoken line. The speaker is resolved at compile time: a `[Name]` line
/// prefix wins over the block's default speaker; narration has an empty speaker.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryLine {
    pub speaker: String,
    pub text: String,
}

/// A scripted system dialogue (opening, fades, the vow) played by quest effects
/// rather than by talking to an NPC.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoryScene {
    pub id: String,
    pub beat_id: String,
    pub lines: Vec<StoryLine>,
}

/// When an NPC branch applies. Selection prefers the current main objective,
/// then the current main quest, then the `always` fallback.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", content = "id", rename_all = "camelCase")]
pub enum StoryBranchCondition {
    Always,
    Quest(String),
    Objective(String),
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
    OpenShop {
        #[serde(rename = "shopId")]
        shop_id: String,
    },
    Close,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn story_catalog_uses_camel_case_fields_and_tagged_conditions() {
        let catalog = StoryCatalog {
            package_id: "gliese-core".to_string(),
            default_locale: "en".to_string(),
            npc_dialogues: vec![NpcStoryDialogue {
                npc_id: "borak".to_string(),
                map_id: "guild-hall".to_string(),
                branches: vec![StoryDialogueBranch {
                    beat_id: "prologue.morning".to_string(),
                    condition: StoryBranchCondition::Objective("meet-borak".to_string()),
                    lines: vec![StoryLine {
                        speaker: "Borak".to_string(),
                        text: "You are late.".to_string(),
                    }],
                    actions: vec![StoryDialogueAction {
                        id: "shop".to_string(),
                        label: "Shop".to_string(),
                        intent: StoryIntent::OpenShop {
                            shop_id: "lodge-stores".to_string(),
                        },
                    }],
                }],
            }],
            scenes: vec![StoryScene {
                id: "opening".to_string(),
                beat_id: "prologue.morning".to_string(),
                lines: vec![StoryLine {
                    speaker: String::new(),
                    text: "Morning.".to_string(),
                }],
            }],
        };

        let value = serde_json::to_value(catalog).expect("catalog should serialize");

        assert_eq!(value["packageId"], "gliese-core");
        assert_eq!(value["npcDialogues"][0]["npcId"], "borak");
        assert_eq!(value["npcDialogues"][0]["mapId"], "guild-hall");
        let branch = &value["npcDialogues"][0]["branches"][0];
        assert_eq!(branch["beatId"], "prologue.morning");
        assert_eq!(branch["condition"]["type"], "objective");
        assert_eq!(branch["condition"]["id"], "meet-borak");
        assert_eq!(branch["lines"][0]["speaker"], "Borak");
        assert_eq!(branch["actions"][0]["intent"]["type"], "openShop");
        assert_eq!(branch["actions"][0]["intent"]["shopId"], "lodge-stores");
        assert_eq!(value["scenes"][0]["id"], "opening");
    }

    #[test]
    fn always_condition_serializes_without_an_id() {
        let value = serde_json::to_value(StoryBranchCondition::Always).expect("serialize");

        assert_eq!(value, serde_json::json!({ "type": "always" }));
    }
}
