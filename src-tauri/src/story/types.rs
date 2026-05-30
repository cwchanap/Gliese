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
    ShowQuestList {
        #[serde(rename = "giverNpcId")]
        giver_npc_id: String,
    },
    OpenShop {
        #[serde(rename = "shopId")]
        shop_id: String,
    },
    RecordNpcTalk {
        #[serde(rename = "npcId")]
        npc_id: String,
    },
    Close,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn story_catalog_uses_camel_case_catalog_fields_and_tagged_intents() {
        let catalog = StoryCatalog {
            package_id: "gliese-core".to_string(),
            default_locale: "en".to_string(),
            npc_dialogues: vec![NpcStoryDialogue {
                npc_id: "guild-master".to_string(),
                branches: vec![StoryDialogueBranch {
                    condition: StoryBranchCondition::MainQuestNeedsGuildBriefing,
                    speaker: "Guild Master".to_string(),
                    lines: vec!["The ruins are stirring.".to_string()],
                    actions: vec![StoryDialogueAction {
                        id: "briefing".to_string(),
                        label: "Brief me".to_string(),
                        intent: StoryIntent::ShowQuestList {
                            giver_npc_id: "guild-master".to_string(),
                        },
                    }],
                    completion_intent: Some(StoryIntent::RecordNpcTalk {
                        npc_id: "guild-master".to_string(),
                    }),
                }],
            }],
        };

        let value = serde_json::to_value(catalog).expect("catalog should serialize");

        assert_eq!(value["packageId"], "gliese-core");
        assert_eq!(value["defaultLocale"], "en");
        assert_eq!(value["npcDialogues"][0]["npcId"], "guild-master");
        assert_eq!(
            value["npcDialogues"][0]["branches"][0]["condition"],
            "mainQuestNeedsGuildBriefing"
        );
        assert_eq!(
            value["npcDialogues"][0]["branches"][0]["actions"][0]["intent"]["type"],
            "showQuestList"
        );
        assert_eq!(
            value["npcDialogues"][0]["branches"][0]["actions"][0]["intent"]["giverNpcId"],
            "guild-master"
        );
    }

    #[test]
    fn story_intent_payloads_use_camel_case_fields() {
        let show_quest_list = serde_json::to_value(StoryIntent::ShowQuestList {
            giver_npc_id: "guild-master".to_string(),
        })
        .expect("show quest list intent should serialize");
        let open_shop = serde_json::to_value(StoryIntent::OpenShop {
            shop_id: "miras-item-shop".to_string(),
        })
        .expect("open shop intent should serialize");
        let record_npc_talk = serde_json::to_value(StoryIntent::RecordNpcTalk {
            npc_id: "shopkeeper-mira".to_string(),
        })
        .expect("record npc talk intent should serialize");

        assert_eq!(show_quest_list["type"], "showQuestList");
        assert_eq!(show_quest_list["giverNpcId"], "guild-master");
        assert!(show_quest_list.get("giver_npc_id").is_none());

        assert_eq!(open_shop["type"], "openShop");
        assert_eq!(open_shop["shopId"], "miras-item-shop");
        assert!(open_shop.get("shop_id").is_none());

        assert_eq!(record_npc_talk["type"], "recordNpcTalk");
        assert_eq!(record_npc_talk["npcId"], "shopkeeper-mira");
        assert!(record_npc_talk.get("npc_id").is_none());
    }
}
