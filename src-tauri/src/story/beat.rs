use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoryBeat {
    pub id: String,
    pub chapter: String,
    pub map_id: String,
    pub primary_npc_id: String,
    pub dialogues: Vec<BeatDialogue>,
    pub unsupported_hooks: Vec<UnsupportedHook>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatDialogue {
    pub npc_id: String,
    pub branch: String,
    pub speaker: String,
    pub choices: Vec<String>,
    pub completion_intent: Option<String>,
    pub lines: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnsupportedHook {
    pub id: String,
    pub kind: String,
    pub reason: String,
}

pub fn parse_beat_markdown(source: &str) -> Result<StoryBeat, String> {
    let lines: Vec<&str> = source.lines().collect();
    let mut story: Option<StoryFields> = None;
    let mut dialogues = Vec::new();
    let mut unsupported_hooks = Vec::new();
    let mut active_dialogue: Option<usize> = None;
    let mut line_index = 0;

    while line_index < lines.len() {
        let trimmed = lines[line_index].trim();

        if let Some(directive) = trimmed.strip_prefix(":::") {
            let directive = directive.trim();
            if directive.is_empty() {
                return Err(format!(
                    "unexpected directive terminator at line {}",
                    line_index + 1
                ));
            }

            let fields = parse_directive_fields(&lines, &mut line_index)?;
            match directive {
                "story" => {
                    if story.is_some() {
                        return Err("duplicate story directive".to_string());
                    }
                    story = Some(StoryFields {
                        id: required_field(&fields, "id", "story")?,
                        chapter: required_field(&fields, "chapter", "story")?,
                        map_id: required_field(&fields, "map", "story")?,
                        primary_npc_id: required_field(&fields, "primaryNpc", "story")?,
                    });
                    active_dialogue = None;
                }
                "dialogue" => {
                    let choices = required_field(&fields, "choices", "dialogue")?
                        .split(',')
                        .map(str::trim)
                        .filter(|choice| !choice.is_empty())
                        .map(ToString::to_string)
                        .collect();
                    dialogues.push(BeatDialogue {
                        npc_id: required_field(&fields, "npc", "dialogue")?,
                        branch: required_field(&fields, "branch", "dialogue")?,
                        speaker: required_field(&fields, "speaker", "dialogue")?,
                        choices,
                        completion_intent: fields.get("completionIntent").cloned(),
                        lines: Vec::new(),
                    });
                    active_dialogue = Some(dialogues.len() - 1);
                }
                "unsupported-hook" => {
                    unsupported_hooks.push(UnsupportedHook {
                        id: required_field(&fields, "id", "unsupported-hook")?,
                        kind: required_field(&fields, "kind", "unsupported-hook")?,
                        reason: required_field(&fields, "reason", "unsupported-hook")?,
                    });
                    active_dialogue = None;
                }
                _ => {
                    return Err(format!("unknown directive {}", directive));
                }
            }
        } else {
            if trimmed.starts_with('#') {
                active_dialogue = None;
            } else if !trimmed.is_empty() {
                if let Some(dialogue_index) = active_dialogue {
                    dialogues[dialogue_index].lines.push(trimmed.to_string());
                }
            }
            line_index += 1;
        }
    }

    let story = story.ok_or_else(|| "missing story directive".to_string())?;
    Ok(StoryBeat {
        id: story.id,
        chapter: story.chapter,
        map_id: story.map_id,
        primary_npc_id: story.primary_npc_id,
        dialogues,
        unsupported_hooks,
    })
}

#[derive(Debug)]
struct StoryFields {
    id: String,
    chapter: String,
    map_id: String,
    primary_npc_id: String,
}

fn parse_directive_fields(
    lines: &[&str],
    line_index: &mut usize,
) -> Result<HashMap<String, String>, String> {
    let start_line = *line_index + 1;
    *line_index += 1;
    let mut fields = HashMap::new();

    while *line_index < lines.len() {
        let trimmed = lines[*line_index].trim();
        *line_index += 1;

        if trimmed == ":::" {
            return Ok(fields);
        }

        if trimmed.is_empty() {
            continue;
        }

        let (key, value) = trimmed
            .split_once(':')
            .ok_or_else(|| format!("invalid directive field at line {}", *line_index))?;
        fields.insert(key.trim().to_string(), value.trim().to_string());
    }

    Err(format!(
        "unterminated directive starting at line {}",
        start_line
    ))
}

fn required_field(
    fields: &HashMap<String, String>,
    field: &str,
    directive: &str,
) -> Result<String, String> {
    fields
        .get(field)
        .filter(|value| !value.is_empty())
        .cloned()
        .ok_or_else(|| format!("missing {} field in {} directive", field, directive))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_dialogue_blocks_from_markdown() {
        let beat = parse_beat_markdown(
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

Go to the ruins.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.id, "prologue.guild-master");
        assert_eq!(beat.dialogues.len(), 1);
        assert_eq!(beat.dialogues[0].npc_id, "guild-master");
        assert_eq!(
            beat.dialogues[0].lines,
            vec!["You made it.", "Go to the ruins."]
        );
    }

    #[test]
    fn parses_unsupported_hooks() {
        let beat = parse_beat_markdown(
            r#"# Hook

::: story
id: prologue.hook
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: unsupported-hook
id: cutscene.guild-master-points-to-map
kind: camera-pan
reason: Need a short camera movement.
:::
"#,
        )
        .expect("beat should parse");

        assert_eq!(
            beat.unsupported_hooks[0].id,
            "cutscene.guild-master-points-to-map"
        );
    }

    #[test]
    fn parses_multiple_dialogue_blocks() {
        let beat = parse_beat_markdown(
            r#"# Scene

::: story
id: prologue.scene
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::

::: dialogue
npc: guild-master
branch: briefing
speaker: Guild Master Arlen
choices: quest
:::

First line.

::: dialogue
npc: shopkeeper-mira
branch: greeting
speaker: Mira
choices: shop, leave
:::

Second line.

# Next Heading

This should be ignored.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.dialogues.len(), 2);
        assert_eq!(beat.dialogues[0].lines, vec!["First line."]);
        assert_eq!(beat.dialogues[1].choices, vec!["shop", "leave"]);
        assert_eq!(beat.dialogues[1].lines, vec!["Second line."]);
    }
}
