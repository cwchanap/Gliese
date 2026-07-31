use std::collections::BTreeMap;

use super::beat::{BeatDialogue, StoryBeat};
use super::reference::{NPC_IDS, SHOP_IDS};
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
    if dialogue.lines.is_empty() {
        return Err(format!(
            "dialogue for npc {} has no dialogue lines",
            dialogue.npc_id
        ));
    }

    Ok(StoryDialogueBranch {
        condition: compile_branch_condition(&dialogue.branch)?,
        speaker: dialogue.speaker.clone(),
        lines: dialogue.lines.clone(),
        actions: dialogue
            .choices
            .iter()
            .map(|choice| compile_action(choice, dialogue))
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

fn compile_action(choice: &str, dialogue: &BeatDialogue) -> Result<StoryDialogueAction, String> {
    let npc_id = &dialogue.npc_id;
    let (label, intent) = match choice {
        "quest" => {
            quest_npc_id(npc_id)?;
            (
                "Quest",
                StoryIntent::ShowQuestList {
                    giver_npc_id: npc_id.to_string(),
                },
            )
        }
        "shop" => {
            let shop_id = dialogue
                .shop
                .as_deref()
                .ok_or_else(|| format!("missing shop field for npc {}", npc_id))?;
            if !SHOP_IDS.contains(&shop_id) {
                return Err(format!("unknown shop id {} for npc {}", shop_id, npc_id));
            }
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

fn quest_npc_id(npc_id: &str) -> Result<(), String> {
    match npc_id {
        "guild-master" => Ok(()),
        _ => Err(format!(
            "quest choice not supported for npc {}; only guild-master can give quests",
            npc_id
        )),
    }
}

fn compile_completion_intent(intent: &str) -> Result<StoryIntent, String> {
    let Some(npc_id) = intent.strip_prefix("recordNpcTalk:") else {
        return Err(format!("unknown completion intent {}", intent));
    };

    if npc_id.is_empty() {
        return Err(format!("invalid completion intent {}", intent));
    }

    if !NPC_IDS.contains(&npc_id) {
        return Err(format!("unknown completion intent npc {}", npc_id));
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
    fn compiles_shop_choice_by_explicit_shop_field() {
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
shop: miras-item-shop
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
shop: guild-quartermaster
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
    fn compiles_close_choice_to_close_intent() {
        let beat = crate::story::beat::parse_beat_markdown(
            r#"# Villager House

::: story
id: prologue.villager-house-1-family
chapter: prologue
map: villager-house-1
primaryNpc: villager-house-1-family
:::

::: dialogue
npc: villager-house-1-family
branch: always
speaker: Villager
choices: close
:::

Make yourself at home.
"#,
        )
        .unwrap();

        let catalog = compile_catalog("sundrop-ruins", "en", &[beat]).expect("compile");
        let branch = &catalog.npc_dialogues[0].branches[0];

        assert_eq!(branch.actions[0].id, "close");
        assert_eq!(branch.actions[0].label, "Close");
        assert_eq!(branch.actions[0].intent, StoryIntent::Close);
    }

    #[test]
    fn rejects_shop_choice_with_missing_or_unknown_shop() {
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
branch: always
speaker: Guild Master Arlen
choices: shop
:::

No shop here.
"#,
        )
        .unwrap();

        let error = compile_catalog("sundrop-ruins", "en", &[beat.clone()]).unwrap_err();
        assert!(error.contains("guild-master"));
        assert!(error.contains("missing shop field"));

        beat.dialogues[0].shop = Some("unknown-shop".to_string());
        let error = compile_catalog("sundrop-ruins", "en", &[beat]).unwrap_err();
        assert!(error.contains("unknown-shop"));
        assert!(error.contains("unknown shop id"));
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
shop: miras-item-shop
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
        let error = compile_catalog("sundrop-ruins", "en", &[beat.clone()]).unwrap_err();
        assert!(error.contains("unknown completion intent"));

        beat.dialogues[0].completion_intent = Some("recordNpcTalk:guild-mastre".to_string());
        let error = compile_catalog("sundrop-ruins", "en", &[beat]).unwrap_err();
        assert!(error.contains("unknown completion intent npc guild-mastre"));
    }

    #[test]
    fn rejects_empty_dialogue_lines() {
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
branch: always
speaker: Guild Master Arlen
choices: quest
:::

Some text.
"#,
        )
        .unwrap();

        beat.dialogues[0].lines.clear();
        let error = compile_catalog("sundrop-ruins", "en", &[beat]).unwrap_err();
        assert!(error.contains("no dialogue lines"));
        assert!(error.contains("guild-master"));
    }

    #[test]
    fn rejects_quest_choice_for_non_guild_master_npc() {
        let mut beat = crate::story::beat::parse_beat_markdown(
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

        beat.dialogues[0].choices = vec!["quest".to_string()];
        let error = compile_catalog("sundrop-ruins", "en", &[beat]).unwrap_err();
        assert!(error.contains("quest choice not supported"));
        assert!(error.contains("shopkeeper-mira"));
    }
}
