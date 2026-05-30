use std::collections::BTreeMap;

use super::beat::{BeatDialogue, StoryBeat};
use super::types::{
    NpcStoryDialogue, StoryBranchCondition, StoryCatalog, StoryDialogueAction, StoryDialogueBranch,
    StoryIntent,
};

pub fn compile_catalog(
    package_id: &str,
    default_locale: &str,
    beats: &[StoryBeat],
) -> Result<StoryCatalog, String> {
    let mut dialogues_by_npc: BTreeMap<String, Vec<StoryDialogueBranch>> = BTreeMap::new();

    for beat in beats {
        for dialogue in &beat.dialogues {
            let branch = compile_dialogue(dialogue)?;
            dialogues_by_npc
                .entry(dialogue.npc_id.clone())
                .or_default()
                .push(branch);
        }
    }

    Ok(StoryCatalog {
        package_id: package_id.to_string(),
        default_locale: default_locale.to_string(),
        npc_dialogues: dialogues_by_npc
            .into_iter()
            .map(|(npc_id, branches)| NpcStoryDialogue { npc_id, branches })
            .collect(),
    })
}

fn compile_dialogue(dialogue: &BeatDialogue) -> Result<StoryDialogueBranch, String> {
    Ok(StoryDialogueBranch {
        condition: compile_branch_condition(&dialogue.branch)?,
        speaker: dialogue.speaker.clone(),
        lines: dialogue.lines.clone(),
        actions: dialogue
            .choices
            .iter()
            .map(|choice| compile_action(choice, &dialogue.npc_id))
            .collect::<Result<Vec<_>, _>>()?,
        completion_intent: dialogue
            .completion_intent
            .as_deref()
            .map(compile_completion_intent)
            .transpose()?,
    })
}

fn compile_branch_condition(branch: &str) -> Result<StoryBranchCondition, String> {
    match branch {
        "always" => Ok(StoryBranchCondition::Always),
        "mainQuestNeedsGuildBriefing" => Ok(StoryBranchCondition::MainQuestNeedsGuildBriefing),
        "guildBriefingComplete" => Ok(StoryBranchCondition::GuildBriefingComplete),
        "hasActiveSideQuest" => Ok(StoryBranchCondition::HasActiveSideQuest),
        "hasCompletedQuest" => Ok(StoryBranchCondition::HasCompletedQuest),
        _ => Err(format!("unknown dialogue branch condition {}", branch)),
    }
}

fn compile_action(choice: &str, npc_id: &str) -> Result<StoryDialogueAction, String> {
    let (label, intent) = match choice {
        "quest" => (
            "Quest",
            StoryIntent::ShowQuestList {
                giver_npc_id: npc_id.to_string(),
            },
        ),
        "shop" => (
            "Shop",
            StoryIntent::OpenShop {
                shop_id: shop_id_for_npc(npc_id)?,
            },
        ),
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

fn shop_id_for_npc(npc_id: &str) -> Result<String, String> {
    match npc_id {
        "guild-quartermaster" => Ok("guild-quartermaster".to_string()),
        "shopkeeper-mira" => Ok("miras-item-shop".to_string()),
        _ => Err(format!("no shop mapping for npc {}", npc_id)),
    }
}

fn compile_completion_intent(intent: &str) -> Result<StoryIntent, String> {
    let Some(npc_id) = intent.strip_prefix("recordNpcTalk:") else {
        return Err(format!("unknown completion intent {}", intent));
    };

    if npc_id.is_empty() {
        return Err(format!("invalid completion intent {}", intent));
    }

    Ok(StoryIntent::RecordNpcTalk {
        npc_id: npc_id.to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::story::types::{StoryBranchCondition, StoryIntent};

    #[test]
    fn compiles_quest_choice_and_record_talk_intent() {
        let beat = crate::story::beat::parse_beat_markdown(
            r#"# Guild Master

::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: mainQuestNeedsGuildBriefing
speaker: Guild Master Arlen
choices: quest
completionIntent: recordNpcTalk:guild-master
:::

You made it.
"#,
        )
        .unwrap();

        let catalog = compile_catalog("sundrop-ruins", "en", &[beat]).expect("compile");
        let guild = catalog
            .npc_dialogues
            .iter()
            .find(|dialogue| dialogue.npc_id == "guild-master")
            .unwrap();
        let branch = &guild.branches[0];

        assert_eq!(
            branch.condition,
            StoryBranchCondition::MainQuestNeedsGuildBriefing
        );
        assert_eq!(branch.actions[0].id, "quest");
        assert_eq!(branch.actions[0].label, "Quest");
        assert_eq!(
            branch.actions[0].intent,
            StoryIntent::ShowQuestList {
                giver_npc_id: "guild-master".to_string()
            }
        );
        assert_eq!(
            branch.completion_intent,
            Some(StoryIntent::RecordNpcTalk {
                npc_id: "guild-master".to_string()
            })
        );
    }

    #[test]
    fn compiles_shop_choice_by_known_npc_mapping() {
        let beat = crate::story::beat::parse_beat_markdown(
            r#"# Shopkeeper Mira

::: story
id: prologue.shopkeeper-mira
chapter: prologue
map: item-shop
primaryNpc: shopkeeper-mira
:::

::: dialogue
npc: shopkeeper-mira
branch: always
speaker: Mira
choices: shop
:::

Need supplies?
"#,
        )
        .unwrap();

        let catalog = compile_catalog("sundrop-ruins", "en", &[beat]).expect("compile");
        let branch = &catalog.npc_dialogues[0].branches[0];

        assert_eq!(branch.actions[0].id, "shop");
        assert_eq!(branch.actions[0].label, "Shop");
        assert_eq!(
            branch.actions[0].intent,
            StoryIntent::OpenShop {
                shop_id: "miras-item-shop".to_string()
            }
        );
    }

    #[test]
    fn compiles_guild_quartermaster_shop_choice() {
        let beat = crate::story::beat::parse_beat_markdown(
            r#"# Guild Quartermaster

::: story
id: prologue.guild-quartermaster
chapter: prologue
map: guild-hall
primaryNpc: guild-quartermaster
:::

::: dialogue
npc: guild-quartermaster
branch: always
speaker: Quartermaster
choices: shop
:::

Stock up before you go.
"#,
        )
        .unwrap();

        let catalog = compile_catalog("sundrop-ruins", "en", &[beat]).expect("compile");
        let branch = &catalog.npc_dialogues[0].branches[0];

        assert_eq!(
            branch.actions[0].intent,
            StoryIntent::OpenShop {
                shop_id: "guild-quartermaster".to_string()
            }
        );
    }

    #[test]
    fn rejects_shop_choice_for_unmapped_npc() {
        let beat = crate::story::beat::parse_beat_markdown(
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
choices: shop
:::

No shop here.
"#,
        )
        .unwrap();

        let error = compile_catalog("sundrop-ruins", "en", &[beat]).unwrap_err();

        assert!(error.contains("guild-master"));
        assert!(error.contains("no shop mapping"));
    }

    #[test]
    fn groups_dialogues_by_npc_in_deterministic_order() {
        let guild_master = crate::story::beat::parse_beat_markdown(
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

First briefing.

::: dialogue
npc: shopkeeper-mira
branch: always
speaker: Mira
choices: shop
:::

Fresh stock.
"#,
        )
        .unwrap();
        let guild_followup = crate::story::beat::parse_beat_markdown(
            r#"# Guild Followup

::: story
id: prologue.guild-followup
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: guildBriefingComplete
speaker: Guild Master Arlen
choices: quest
:::

Second briefing.
"#,
        )
        .unwrap();

        let catalog = compile_catalog("sundrop-ruins", "en", &[guild_master, guild_followup])
            .expect("compile");

        assert_eq!(catalog.npc_dialogues[0].npc_id, "guild-master");
        assert_eq!(catalog.npc_dialogues[0].branches.len(), 2);
        assert_eq!(
            catalog.npc_dialogues[0].branches[0].lines,
            ["First briefing."]
        );
        assert_eq!(
            catalog.npc_dialogues[0].branches[1].condition,
            StoryBranchCondition::GuildBriefingComplete
        );
        assert_eq!(catalog.npc_dialogues[1].npc_id, "shopkeeper-mira");
    }

    #[test]
    fn rejects_unknown_branch_choice_and_completion_intent() {
        let mut beat = crate::story::beat::parse_beat_markdown(
            r#"# Guild Master

::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: mainQuestNeedsGuildBriefing
speaker: Guild Master Arlen
choices: quest
completionIntent: recordNpcTalk:guild-master
:::

You made it.
"#,
        )
        .unwrap();

        beat.dialogues[0].branch = "missingBranch".to_string();
        let error = compile_catalog("sundrop-ruins", "en", &[beat.clone()]).unwrap_err();
        assert!(error.contains("unknown dialogue branch condition"));

        beat.dialogues[0].branch = "mainQuestNeedsGuildBriefing".to_string();
        beat.dialogues[0].choices = vec!["missingChoice".to_string()];
        let error = compile_catalog("sundrop-ruins", "en", &[beat.clone()]).unwrap_err();
        assert!(error.contains("unknown dialogue choice"));

        beat.dialogues[0].choices = vec!["quest".to_string()];
        beat.dialogues[0].completion_intent = Some("markSomethingElse:guild-master".to_string());
        let error = compile_catalog("sundrop-ruins", "en", &[beat]).unwrap_err();
        assert!(error.contains("unknown completion intent"));
    }
}
