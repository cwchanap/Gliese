use serde::{Deserialize, Serialize};

use super::types::{
    StoryBranchCondition, StoryCatalog, StoryDialogueAction, StoryDialogueBranch, StoryIntent,
};

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
    pub actions: Vec<StoryDialogueAction>,
    pub completion_intent: Option<StoryIntent>,
}

#[tauri::command]
pub fn get_npc_dialogue(request: StoryDialogueRequest) -> Result<StoryDialogueResponse, String> {
    get_npc_dialogue_from_catalog(&super::generated::story_catalog(), request)
        .map_err(|error| error.to_string())
}

pub fn get_npc_dialogue_from_catalog(
    catalog: &StoryCatalog,
    request: StoryDialogueRequest,
) -> Result<StoryDialogueResponse, String> {
    if request.locale != catalog.default_locale {
        return Err(format!("unsupported story locale: {}", request.locale));
    }

    // Task 7 carries map_id as caller context only; NPC placement is enforced later.
    let _map_id = &request.map_id;

    let dialogue = catalog
        .npc_dialogues
        .iter()
        .find(|dialogue| dialogue.npc_id == request.npc_id)
        .ok_or_else(|| format!("unknown story npc: {}", request.npc_id))?;

    let (condition, branch) = branch_priority()
        .iter()
        .filter(|condition| branch_condition_matches(**condition, &request.quest))
        .find_map(|condition| {
            dialogue
                .branches
                .iter()
                .find(|branch| branch.condition == *condition)
                .map(|branch| (*condition, branch))
        })
        .ok_or_else(|| format!("no story dialogue branch for npc: {}", request.npc_id))?;

    Ok(response_from_branch(&request, condition, branch))
}

fn branch_priority() -> [StoryBranchCondition; 5] {
    [
        StoryBranchCondition::MainQuestNeedsGuildBriefing,
        StoryBranchCondition::HasActiveSideQuest,
        StoryBranchCondition::HasCompletedQuest,
        StoryBranchCondition::GuildBriefingComplete,
        StoryBranchCondition::Always,
    ]
}

fn branch_condition_matches(condition: StoryBranchCondition, quest: &StoryQuestSummary) -> bool {
    match condition {
        StoryBranchCondition::MainQuestNeedsGuildBriefing => quest.main_quest_needs_guild_briefing,
        StoryBranchCondition::HasActiveSideQuest => quest.has_active_side_quest,
        StoryBranchCondition::HasCompletedQuest => quest.has_completed_quest,
        StoryBranchCondition::GuildBriefingComplete => quest.guild_briefing_complete,
        StoryBranchCondition::Always => true,
    }
}

fn response_from_branch(
    request: &StoryDialogueRequest,
    condition: StoryBranchCondition,
    branch: &StoryDialogueBranch,
) -> StoryDialogueResponse {
    StoryDialogueResponse {
        session_id: format!("npc:{}:{}", request.npc_id, branch_condition_key(condition)),
        speaker: branch.speaker.clone(),
        lines: branch.lines.clone(),
        actions: branch.actions.clone(),
        completion_intent: branch.completion_intent.clone(),
    }
}

fn branch_condition_key(condition: StoryBranchCondition) -> &'static str {
    match condition {
        StoryBranchCondition::Always => "always",
        StoryBranchCondition::MainQuestNeedsGuildBriefing => "mainQuestNeedsGuildBriefing",
        StoryBranchCondition::GuildBriefingComplete => "guildBriefingComplete",
        StoryBranchCondition::HasActiveSideQuest => "hasActiveSideQuest",
        StoryBranchCondition::HasCompletedQuest => "hasCompletedQuest",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request_for_guild_master(quest: StoryQuestSummary) -> StoryDialogueRequest {
        StoryDialogueRequest {
            npc_id: "guild-master".to_string(),
            map_id: "guild-hall".to_string(),
            locale: "en".to_string(),
            quest,
        }
    }

    fn no_quest_flags() -> StoryQuestSummary {
        StoryQuestSummary {
            main_quest_needs_guild_briefing: false,
            guild_briefing_complete: false,
            has_active_side_quest: false,
            has_completed_quest: false,
        }
    }

    #[test]
    fn selects_guild_briefing_when_main_quest_needs_talk() {
        let response = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            request_for_guild_master(StoryQuestSummary {
                main_quest_needs_guild_briefing: true,
                guild_briefing_complete: false,
                has_active_side_quest: false,
                has_completed_quest: false,
            }),
        )
        .expect("dialogue");

        assert_eq!(response.speaker, "Guild Master Arlen");
        assert_eq!(response.lines.len(), 2);
    }

    #[test]
    fn rejects_unsupported_locale() {
        let error = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            StoryDialogueRequest {
                locale: "ja".to_string(),
                ..request_for_guild_master(no_quest_flags())
            },
        )
        .expect_err("unsupported locale should fail");

        assert_eq!(error, "unsupported story locale: ja");
    }

    #[test]
    fn treats_map_id_as_context_only_for_now() {
        let response = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            StoryDialogueRequest {
                map_id: "meadow-entry".to_string(),
                ..request_for_guild_master(no_quest_flags())
            },
        )
        .expect("dialogue");

        assert_eq!(response.speaker, "Guild Master Arlen");
        assert_eq!(response.session_id, "npc:guild-master:always");
    }

    #[test]
    fn chooses_highest_priority_when_multiple_quest_flags_match() {
        let response = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            request_for_guild_master(StoryQuestSummary {
                main_quest_needs_guild_briefing: true,
                guild_briefing_complete: true,
                has_active_side_quest: true,
                has_completed_quest: true,
            }),
        )
        .expect("dialogue");

        assert_eq!(
            response.session_id,
            "npc:guild-master:mainQuestNeedsGuildBriefing"
        );
        assert_eq!(response.lines.len(), 2);
    }

    #[test]
    fn falls_back_to_always_when_no_quest_flags_match() {
        let response = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            request_for_guild_master(no_quest_flags()),
        )
        .expect("dialogue");

        assert_eq!(response.session_id, "npc:guild-master:always");
        assert_eq!(
            response.lines,
            vec![
                "The Guild keeps watch over the old road. Speak plainly and choose your work."
                    .to_string()
            ]
        );
    }

    #[test]
    fn returns_error_for_unknown_npc() {
        let error = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            StoryDialogueRequest {
                npc_id: "unknown-npc".to_string(),
                ..request_for_guild_master(no_quest_flags())
            },
        )
        .expect_err("unknown npc should fail");

        assert_eq!(error, "unknown story npc: unknown-npc");
    }

    #[test]
    fn response_serializes_with_camel_case_fields_and_tagged_intents() {
        let response = get_npc_dialogue_from_catalog(
            &crate::story::generated::story_catalog(),
            request_for_guild_master(StoryQuestSummary {
                main_quest_needs_guild_briefing: true,
                guild_briefing_complete: false,
                has_active_side_quest: false,
                has_completed_quest: false,
            }),
        )
        .expect("dialogue");

        let value = serde_json::to_value(response).expect("response should serialize");

        assert_eq!(
            value["sessionId"],
            "npc:guild-master:mainQuestNeedsGuildBriefing"
        );
        assert!(value.get("session_id").is_none());
        assert_eq!(value["completionIntent"]["type"], "recordNpcTalk");
        assert_eq!(value["completionIntent"]["npcId"], "guild-master");
        assert!(value.get("completion_intent").is_none());
        assert_eq!(value["actions"][0]["intent"]["type"], "showQuestList");
        assert_eq!(value["actions"][0]["intent"]["giverNpcId"], "guild-master");
        assert!(value["actions"][0]["intent"].get("giver_npc_id").is_none());
    }
}
