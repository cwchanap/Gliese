# Story Directives

The first parser supports a small Markdown directive subset.

## `::: story`

Required once per beat. Declares `id`, `chapter`, `map`, and `primaryNpc`.

## `::: dialogue`

Declares one NPC dialogue branch. Supported fields are `npc`, `branch`, `speaker`, `choices`, and optional `completionIntent`.

## `choices: quest`

Marks a dialogue branch whose action list should expose quest choices.

## `choices: shop`

Marks a dialogue branch whose action list should expose shop choices.

## `completionIntent: recordNpcTalk:<npcId>`

Records that the named NPC was spoken to when the branch completes.

## `::: unsupported-hook`

Documents a requested engine behavior that the current parser should report rather than generate.
