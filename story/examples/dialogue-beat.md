# Dialogue Beat Example

A compact example of the supported dialogue directive subset.

::: story
id: prologue.example
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

This is one dialogue paragraph.

This is a second dialogue paragraph in the same branch.

::: dialogue
npc: guild-quartermaster
branch: always
speaker: Quartermaster Vale
choices: shop
shop: guild-quartermaster
:::

This branch would show shop choices.

::: unsupported-hook
id: example-camera-pan
kind: camera
reason: Camera scripting is not supported by the first parser.
:::
