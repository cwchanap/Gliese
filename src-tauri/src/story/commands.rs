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
    let dialogue = catalog
        .npc_dialogues
        .iter()
        .find(|dialogue| dialogue.npc_id == request.npc_id)
        .ok_or_else(|| format!("unknown story npc: {}", request.npc_id))?;

    let branch = branch_priority()
        .iter()
        .filter(|condition| branch_condition_matches(**condition, &request.quest))
        .find_map(|condition| {
            dialogue
                .branches
                .iter()
                .find(|branch| branch.condition == *condition)
        })
        .ok_or_else(|| format!("no story dialogue branch for npc: {}", request.npc_id))?;

    Ok(response_from_branch(&request, branch))
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
    branch: &StoryDialogueBranch,
) -> StoryDialogueResponse {
    StoryDialogueResponse {
        session_id: format!("npc:{}", request.npc_id),
        speaker: branch.speaker.clone(),
        lines: branch.lines.clone(),
        actions: branch.actions.clone(),
        completion_intent: branch.completion_intent.clone(),
    }
}

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
