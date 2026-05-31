# Story Directives

The first parser supports a small Markdown directive subset.

## `::: story`

Required once per beat. Declares `id`, `chapter`, `map`, and `primaryNpc`.

## `::: dialogue`

Declares one NPC dialogue branch. Supported fields are `npc`, `branch`, `speaker`, `choices`, and optional `completionIntent`.

`branch` is enum-restricted. Allowed values:

- `always` — unconditionally shown
- `mainQuestNeedsGuildBriefing` — player has not yet completed the main quest guild briefing
- `guildBriefingComplete` — player has completed the guild briefing
- `hasActiveSideQuest` — player has at least one active non-main quest
- `hasCompletedQuest` — player has completed at least one non-main quest

Non-empty paragraphs after a dialogue directive become dialogue lines until the next directive or heading.

## `choices: quest`

Marks a dialogue branch whose action list should expose quest choices. Use this for quest-giver NPCs.

## `choices: shop`

Marks a dialogue branch whose action list should expose shop choices. The NPC must resolve to a known shop.

## `completionIntent: recordNpcTalk:<npcId>`

Records that the named NPC was spoken to when the branch completes.

## `::: unsupported-hook`

Documents a requested engine behavior that the current parser should report rather than generate.

Required fields are `id`, `kind`, and `reason`.
