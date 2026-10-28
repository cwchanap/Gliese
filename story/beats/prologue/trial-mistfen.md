# Quest 3: The Second Trial, Mistfen

Mira needs moonmoss for the winter stores. Lirra meets Grik at the Mistfen
bridge, and by the pond in the fog she asks him to come to the river tomorrow.

::: story
id: prologue.trial-mistfen
chapter: prologue
map: overworld
:::

::: dialogue
npc: mira
map: item-shop
branch: objective:ask-mira-about-stores
speaker: Mira
:::

Borak sent you? Good. A hunter who asks the herb-wife what the village needs. Your father taught him well, and he is teaching you.

The winter stores are short on moonmoss. It keeps fever away when the snow comes, and it grows only in the deep Mistfen.

Four clumps will see us through. Lirra knows the marsh better than anyone. She'll meet you at the Mistfen bridge, west of the village.

Mind the toads. They puff up when they're angry, and they are always angry.

::: dialogue
npc: mira
map: item-shop
branch: quest:prologue-trial-mistfen
speaker: Mira
choices: shop, close
shop: miras-item-shop
:::

Four clumps of moonmoss, from the deep Mistfen. Do you need anything for the road?

::: dialogue
npc: lirra-mistfen
branch: objective:meet-lirra-mistfen
speaker: Lirra
:::

Second trial already? You're getting faster.

Moonmoss glows faintly in the fog. Look for pale green light near the water. There are clumps scattered all through the basin.

The marsh flowers are pretty. Don't smell them. I'm serious.

::: dialogue
npc: lirra-mistfen
branch: objective:gather-moonmoss
speaker: Lirra
:::

Four clumps. Follow the glow and stay on the firm ground.

If the toads swell up, that's your cue to hit them first.

::: dialogue
npc: lirra-mistfen
branch: objective:rest-at-the-pond
speaker: Lirra
:::

That's all four? Then come and sit by the pond with me before we go back. Just for a moment. I'll meet you there.

::: dialogue
npc: lirra-mistfen
branch: always
speaker: Lirra
:::

The fog hides everything out here. I like that, sometimes.

::: scene
id: prologue.mistfen-pond-rest
:::

The fog lies thick over the still water. For a while neither of them says anything.

[Lirra] Do you ever think about later? After you're a hunter, I mean.

[Grik] I'll hunt. I'll fill the stores. I'll get old and tell bad stories like Grandfather.

[Lirra] That's not later. That's just more of today.

[Lirra] Tomorrow, after all this, come to the river with me. There's a place I want to show you. Just you.

[Grik] What kind of place?

[Lirra] The kind you have to see. Now come on. Mira will think the toads ate us.

::: dialogue
npc: drogg-lodge
map: guild-hall
branch: quest:prologue-trial-mistfen
speaker: Drogg
:::

Picking moss! The fearsome hunter! I'll warn the village to lock up its mushrooms.

Fine, fine. Winter is long and fevers are worse. It matters. Don't tell Father I said that.

::: dialogue
npc: borak
map: guild-hall
branch: quest:prologue-trial-mistfen
speaker: Borak
:::

A hunter feeds the village, not his pride. Bring Mira what she needs.

::: dialogue
npc: mira
map: item-shop
branch: objective:deliver-moonmoss
speaker: Mira
:::

Four clumps, and not a leaf bruised. The village will sleep easier this winter.

And Lirra came back smiling, which she does not do for moss.

Borak stopped by while you were out. The third trial is the Boar King of Silverpine. Drogg is waiting for you at the north gate.

He told me to say it plainly, so I will: be careful, Grik.
