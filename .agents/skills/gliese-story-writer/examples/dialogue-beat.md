# Dialogue Beat Example

A compact example of the supported directive subset.

::: story
id: prologue.example
chapter: prologue
map: guild-hall
:::

::: dialogue
npc: borak
branch: objective:report-to-borak
speaker: Borak
:::

This branch plays while the current objective is report-to-borak.

[Grik] A line with its own speaker.

::: dialogue
npc: borak
branch: always
speaker: Borak
:::

The fallback when no quest or objective branch matches.

::: dialogue
npc: lodge-keeper
branch: always
speaker: Lodge Keeper
choices: shop, close
shop: guild-quartermaster
:::

This branch shows the shop and Close actions.

::: scene
id: prologue.example-scene
:::

Narration has no speaker unless a line sets one.

::: unsupported-hook
id: example-camera-pan
kind: camera
reason: Camera scripting is not supported by the parser.
:::
