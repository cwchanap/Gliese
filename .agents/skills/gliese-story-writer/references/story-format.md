# Gliese Story Beat Format

Story source is manifest-referenced Markdown compiled by Rust at build time.
Writers own prose and semantic engine metadata; the compiler owns generated Rust output.

## Source Of Truth

- `story/manifest.yaml` lists chapters, beat IDs, file paths, and required game content IDs.
- `story/beats/**/*.md` contains human-reviewed story prose.
- `story/schema/directives.md` is the parser contract.

## Supported Directives

Use one `::: story` block per beat:

```md
::: story
id: prologue.guild-master
chapter: prologue
map: guild-hall
primaryNpc: guild-master
:::
```

Use `::: dialogue` blocks for NPC dialogue branches:

```md
::: dialogue
npc: guild-master
branch: mainQuestNeedsGuildBriefing
speaker: Guild Master Arlen
choices: quest
completionIntent: recordNpcTalk:guild-master
:::
```

Plain Markdown paragraphs after a dialogue directive become dialogue lines until the next directive or heading.

Supported choices:

- `choices: quest`
- `choices: shop`

Supported completion intent:

- `completionIntent: recordNpcTalk:<npcId>`

When a story needs an unsupported engine behavior, document it instead of inventing syntax:

```md
::: unsupported-hook
id: prologue-camera-pan
kind: camera
reason: The current parser cannot trigger camera movement.
:::
```

## Validation

Run `bun run story:check` after editing story source. Fix parser errors in the Markdown source, not in generated Rust.
