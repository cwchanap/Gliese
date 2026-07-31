# Guild Master

Guild Master Arlen briefs Liam on the ruins and offers Guild work.

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

You made it. The eastern ruins are stirring again, and the village road is no longer safe.

Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.

::: dialogue
npc: guild-master
branch: hasActiveSideQuest
speaker: Guild Master Arlen
choices: quest
:::

The Guild board is yours to work through, but do not lose sight of the warden.

Report progress through your journal. I will keep new work here at the counter.

::: dialogue
npc: guild-master
branch: hasCompletedQuest
speaker: Guild Master Arlen
choices: quest
:::

Good work out there. The village notices when a hunter keeps the roads clear.

::: dialogue
npc: guild-master
branch: guildBriefingComplete
speaker: Guild Master Arlen
choices: quest
:::

The ruins route is open. Steel yourself before you enter the core.

::: dialogue
npc: guild-master
branch: always
speaker: Guild Master Arlen
choices: quest
:::

The Guild keeps watch over the old road. Speak plainly and choose your work.
