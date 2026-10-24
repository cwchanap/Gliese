use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoryBeat {
    pub id: String,
    pub chapter: String,
    pub dialogues: Vec<BeatDialogue>,
    pub scenes: Vec<BeatScene>,
    pub unsupported_hooks: Vec<UnsupportedHook>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatDialogue {
    pub npc_id: String,
    /// Resolved from the dialogue's own `map` field or the story directive's default.
    pub map_id: String,
    pub branch: String,
    pub speaker: String,
    pub choices: Vec<String>,
    pub shop: Option<String>,
    pub lines: Vec<BeatLine>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatScene {
    pub id: String,
    pub speaker: Option<String>,
    pub lines: Vec<BeatLine>,
}

/// A paragraph of prose. A leading `[Name] ` overrides the block's speaker.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BeatLine {
    pub speaker: Option<String>,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct UnsupportedHook {
    pub id: String,
    pub kind: String,
    pub reason: String,
}

#[derive(Debug, Clone, Copy)]
enum ActiveBlock {
    None,
    Dialogue(usize),
    Scene(usize),
}

pub fn parse_beat_markdown(source: &str) -> Result<StoryBeat, String> {
    let lines: Vec<&str> = source.lines().collect();
    let mut story: Option<StoryFields> = None;
    let mut dialogues = Vec::new();
    let mut scenes = Vec::new();
    let mut unsupported_hooks = Vec::new();
    let mut active = ActiveBlock::None;
    let mut paragraph_parts: Vec<String> = Vec::new();
    let mut line_index = 0;

    while line_index < lines.len() {
        let trimmed = lines[line_index].trim();

        if let Some(directive) = trimmed.strip_prefix(":::") {
            flush_paragraph(&mut dialogues, &mut scenes, active, &mut paragraph_parts);

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
                    validate_directive_fields(&fields, &["id", "chapter", "map"], "story")?;
                    story = Some(StoryFields {
                        id: required_field(&fields, "id", "story")?,
                        chapter: required_field(&fields, "chapter", "story")?,
                        map_id: fields.get("map").cloned(),
                    });
                    active = ActiveBlock::None;
                }
                "dialogue" => {
                    validate_directive_fields(
                        &fields,
                        &["npc", "branch", "speaker", "map", "choices", "shop"],
                        "dialogue",
                    )?;
                    let story = story
                        .as_ref()
                        .ok_or_else(|| "dialogue directive before story directive".to_string())?;
                    let npc_id = required_field(&fields, "npc", "dialogue")?;
                    let map_id = fields
                        .get("map")
                        .or(story.map_id.as_ref())
                        .cloned()
                        .ok_or_else(|| {
                            format!(
                                "dialogue for npc {} has no map; set map on the dialogue or story directive",
                                npc_id
                            )
                        })?;
                    let choices = match fields.get("choices") {
                        Some(source) => parse_choices(source)?,
                        None => Vec::new(),
                    };
                    dialogues.push(BeatDialogue {
                        npc_id,
                        map_id,
                        branch: required_field(&fields, "branch", "dialogue")?,
                        speaker: required_field(&fields, "speaker", "dialogue")?,
                        choices,
                        shop: fields.get("shop").cloned(),
                        lines: Vec::new(),
                    });
                    active = ActiveBlock::Dialogue(dialogues.len() - 1);
                }
                "scene" => {
                    validate_directive_fields(&fields, &["id", "speaker"], "scene")?;
                    scenes.push(BeatScene {
                        id: required_field(&fields, "id", "scene")?,
                        speaker: fields.get("speaker").cloned(),
                        lines: Vec::new(),
                    });
                    active = ActiveBlock::Scene(scenes.len() - 1);
                }
                "unsupported-hook" => {
                    validate_directive_fields(
                        &fields,
                        &["id", "kind", "reason"],
                        "unsupported-hook",
                    )?;
                    unsupported_hooks.push(UnsupportedHook {
                        id: required_field(&fields, "id", "unsupported-hook")?,
                        kind: required_field(&fields, "kind", "unsupported-hook")?,
                        reason: required_field(&fields, "reason", "unsupported-hook")?,
                    });
                    active = ActiveBlock::None;
                }
                _ => {
                    return Err(format!("unknown directive {}", directive));
                }
            }
        } else {
            if trimmed.is_empty() {
                flush_paragraph(&mut dialogues, &mut scenes, active, &mut paragraph_parts);
            } else if trimmed.starts_with('#') {
                flush_paragraph(&mut dialogues, &mut scenes, active, &mut paragraph_parts);
                active = ActiveBlock::None;
            } else if !matches!(active, ActiveBlock::None) {
                paragraph_parts.push(trimmed.to_string());
            }
            line_index += 1;
        }
    }

    flush_paragraph(&mut dialogues, &mut scenes, active, &mut paragraph_parts);

    let story = story.ok_or_else(|| "missing story directive".to_string())?;
    Ok(StoryBeat {
        id: story.id,
        chapter: story.chapter,
        dialogues,
        scenes,
        unsupported_hooks,
    })
}

#[derive(Debug)]
struct StoryFields {
    id: String,
    chapter: String,
    map_id: Option<String>,
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

        if trimmed.starts_with(":::") {
            return Err(format!(
                "unterminated directive starting at line {}; nested directive at line {}",
                start_line, *line_index
            ));
        }

        if trimmed.is_empty() {
            continue;
        }

        let (key, value) = trimmed
            .split_once(':')
            .ok_or_else(|| format!("invalid directive field at line {}", *line_index))?;
        let key = key.trim();
        if key.is_empty() {
            return Err(format!("invalid directive field at line {}", *line_index));
        }
        if fields.contains_key(key) {
            return Err(format!("duplicate field {}", key));
        }
        fields.insert(key.to_string(), value.trim().to_string());
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

fn validate_directive_fields(
    fields: &HashMap<String, String>,
    allowed: &[&str],
    directive: &str,
) -> Result<(), String> {
    for key in fields.keys() {
        if !allowed.contains(&key.as_str()) {
            return Err(format!(
                "unknown field '{}' in {} directive; allowed fields: {}",
                key,
                directive,
                allowed.join(", ")
            ));
        }
    }
    Ok(())
}

fn parse_choices(source: &str) -> Result<Vec<String>, String> {
    let choices: Vec<String> = source
        .split(',')
        .map(str::trim)
        .map(|choice| {
            if choice.is_empty() {
                Err("empty choices in dialogue directive".to_string())
            } else {
                Ok(choice.to_string())
            }
        })
        .collect::<Result<Vec<_>, _>>()?;

    if choices.is_empty() {
        return Err("empty choices in dialogue directive".to_string());
    }

    Ok(choices)
}

fn flush_paragraph(
    dialogues: &mut [BeatDialogue],
    scenes: &mut [BeatScene],
    active: ActiveBlock,
    paragraph_parts: &mut Vec<String>,
) {
    if paragraph_parts.is_empty() {
        return;
    }

    let line = parse_line(&paragraph_parts.join(" "));
    match active {
        ActiveBlock::Dialogue(index) => dialogues[index].lines.push(line),
        ActiveBlock::Scene(index) => scenes[index].lines.push(line),
        ActiveBlock::None => {}
    }

    paragraph_parts.clear();
}

fn parse_line(paragraph: &str) -> BeatLine {
    if let Some(rest) = paragraph.strip_prefix('[') {
        if let Some((speaker, text)) = rest.split_once("] ") {
            let speaker = speaker.trim();
            if !speaker.is_empty() && !speaker.contains('[') {
                return BeatLine {
                    speaker: Some(speaker.to_string()),
                    text: text.trim().to_string(),
                };
            }
        }
    }

    BeatLine {
        speaker: None,
        text: paragraph.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(text: &str) -> BeatLine {
        BeatLine {
            speaker: None,
            text: text.to_string(),
        }
    }

    #[test]
    fn parses_dialogue_blocks_with_the_story_map_as_default() {
        let beat = parse_beat_markdown(
            r#"# Borak

::: story
id: prologue.morning
chapter: prologue
map: guild-hall
:::

::: dialogue
npc: borak
branch: objective:meet-borak
speaker: Borak
:::

You made it.

Go to the forest.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.id, "prologue.morning");
        assert_eq!(beat.dialogues.len(), 1);
        assert_eq!(beat.dialogues[0].npc_id, "borak");
        assert_eq!(beat.dialogues[0].map_id, "guild-hall");
        assert_eq!(beat.dialogues[0].branch, "objective:meet-borak");
        assert!(beat.dialogues[0].choices.is_empty());
        assert_eq!(
            beat.dialogues[0].lines,
            vec![line("You made it."), line("Go to the forest.")]
        );
    }

    #[test]
    fn dialogue_map_overrides_the_story_map() {
        let beat = parse_beat_markdown(
            r#"::: story
id: prologue.trial
chapter: prologue
map: guild-hall
:::

::: dialogue
npc: lirra-forest-edge
branch: always
speaker: Lirra
map: meadow-entry
:::

Took you long enough.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.dialogues[0].map_id, "meadow-entry");
    }

    #[test]
    fn rejects_dialogue_without_any_map() {
        let error = parse_beat_markdown(
            r#"::: story
id: prologue.trial
chapter: prologue
:::

::: dialogue
npc: lirra
branch: always
speaker: Lirra
:::

Hi.
"#,
        )
        .expect_err("dialogue needs a map");

        assert!(error.contains("dialogue for npc lirra has no map"));
    }

    #[test]
    fn parses_scenes_and_per_line_speakers() {
        let beat = parse_beat_markdown(
            r#"::: story
id: prologue.evening
chapter: prologue
:::

::: scene
id: scene.dinner
speaker: Old Mott
:::

Long ago, we shared this island.

[Borak] Not tonight, Father.

[Narration without a closing bracket keeps the text.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.scenes.len(), 1);
        assert_eq!(beat.scenes[0].id, "scene.dinner");
        assert_eq!(beat.scenes[0].speaker.as_deref(), Some("Old Mott"));
        assert_eq!(
            beat.scenes[0].lines,
            vec![
                line("Long ago, we shared this island."),
                BeatLine {
                    speaker: Some("Borak".to_string()),
                    text: "Not tonight, Father.".to_string(),
                },
                line("[Narration without a closing bracket keeps the text."),
            ]
        );
    }

    #[test]
    fn parses_unsupported_hooks() {
        let beat = parse_beat_markdown(
            r#"::: story
id: prologue.hook
chapter: prologue
:::

::: unsupported-hook
id: cutscene.borak-points-to-map
kind: camera-pan
reason: Need a short camera movement.
:::
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.unsupported_hooks[0].id, "cutscene.borak-points-to-map");
    }

    #[test]
    fn parses_choices_and_ignores_prose_after_a_heading() {
        let beat = parse_beat_markdown(
            r#"::: story
id: prologue.scene
chapter: prologue
map: item-shop
:::

::: dialogue
npc: mira
branch: always
speaker: Mira
choices: shop, close
shop: herb-hut
:::

First line.

# Next Heading

This should be ignored.
"#,
        )
        .expect("beat should parse");

        assert_eq!(beat.dialogues[0].choices, vec!["shop", "close"]);
        assert_eq!(beat.dialogues[0].shop.as_deref(), Some("herb-hut"));
        assert_eq!(beat.dialogues[0].lines, vec![line("First line.")]);
    }

    #[test]
    fn joins_wrapped_markdown_paragraphs_into_lines() {
        let beat = parse_beat_markdown(
            r#"::: story
id: prologue.wrapped
chapter: prologue
map: guild-hall
:::

::: dialogue
npc: borak
branch: always
speaker: Borak
:::

The forest is quiet
today.
"#,
        )
        .expect("beat should parse");

        assert_eq!(
            beat.dialogues[0].lines,
            vec![line("The forest is quiet today.")]
        );
    }

    #[test]
    fn rejects_missing_terminator_before_another_directive() {
        let error = parse_beat_markdown(
            r#"::: story
id: prologue.broken
chapter: prologue

::: dialogue
npc: borak
:::
"#,
        )
        .expect_err("nested directive should fail");

        assert!(error.contains("unterminated"));
    }

    #[test]
    fn rejects_empty_and_sparse_choices() {
        for choices in ["", " , close", "close,"] {
            let error = parse_beat_markdown(&format!(
                "::: story\nid: a\nchapter: prologue\nmap: guild-hall\n:::\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\nchoices: {choices}\n:::\n\nHi.\n"
            ))
            .expect_err("bad choices should fail");

            assert!(error.contains("choices"), "{choices:?} -> {error}");
        }
    }

    #[test]
    fn rejects_duplicate_fields_and_unknown_directives() {
        let duplicate =
            parse_beat_markdown("::: story\nid: a\nid: b\nchapter: prologue\n:::\n").unwrap_err();
        assert!(duplicate.contains("duplicate field id"));

        let unknown = parse_beat_markdown(
            "::: story\nid: a\nchapter: prologue\n:::\n\n::: camera\nid: pan\n:::\n",
        )
        .unwrap_err();
        assert!(unknown.contains("unknown directive camera"));
    }

    #[test]
    fn rejects_missing_required_and_unknown_fields() {
        let missing = parse_beat_markdown("::: story\nid: a\n:::\n").unwrap_err();
        assert!(missing.contains("missing chapter field"));

        let unknown_story =
            parse_beat_markdown("::: story\nid: a\nchapter: prologue\ntypoField: x\n:::\n")
                .unwrap_err();
        assert!(unknown_story.contains("unknown field 'typoField' in story directive"));

        let unknown_dialogue = parse_beat_markdown(
            "::: story\nid: a\nchapter: prologue\nmap: guild-hall\n:::\n\n::: dialogue\nnpc: borak\nbranch: always\nspeaker: Borak\ncompletionIntent: x\n:::\n",
        )
        .unwrap_err();
        assert!(unknown_dialogue.contains("unknown field 'completionIntent' in dialogue directive"));

        let unknown_scene = parse_beat_markdown(
            "::: story\nid: a\nchapter: prologue\n:::\n\n::: scene\nid: s\nnpc: x\n:::\n",
        )
        .unwrap_err();
        assert!(unknown_scene.contains("unknown field 'npc' in scene directive"));
    }
}
