# Quest 2: The First Trial, Tracks

Lirra "happens" to be at the Wildwood edge. Together they read the thornback's
signs, bring it down, and find a broken iron arrow stamped with a sun.

::: story
id: prologue.trial-tracks
chapter: prologue
map: meadow-entry
:::

::: dialogue
npc: lirra-forest
branch: objective:meet-lirra-forest
speaker: Lirra
:::

Oh! Grik. What a surprise. I was just picking herbs. Here. At the edge of the Wildwood. On your proving day.

[Grik] Mira said you'd be here.

Mira says too much.

Well, since I'm here anyway. You're looking for a thornback, aren't you? I saw it cross the mouth of the forest at dawn.

Look for three signs: hoofprints in the mud, a sapling it smashed, and tusk scrapes on the bark. Read all three and you'll know where it sleeps.

I'll keep up. Try not to step on anything that bites.

::: dialogue
npc: lirra-forest
branch: objective:read-boar-signs
speaker: Lirra
:::

Hoofprints in the mud, a broken sapling, and tusk scrapes on the bark. Find all three.

The wolves are restless this morning. If they come at you, don't run. They love it when you run.

::: dialogue
npc: lirra-forest
branch: objective:defeat-thornback-boar
speaker: Lirra
:::

The trail goes north, up past the old cave. It will be bedded down in the high pocket.

Thornbacks charge when they're cornered. Keep a potion close.

::: dialogue
npc: lirra-forest
branch: always
speaker: Lirra
:::

The Wildwood always looks friendlier from the village.

::: scene
id: prologue.boar-sign-hoofprints
:::

Deep, split hoofprints sink into the soft mud beside the trail.

[Grik] Big. Heavy on the front feet.

[Lirra] And fresh. See how the water hasn't filled them yet? It passed here this morning. Heading north.

::: scene
id: prologue.boar-sign-sapling
:::

A young birch lies snapped at knee height, its bark peeled back in long strips.

[Lirra] It didn't go around. It went through.

[Grik] So it's angry.

[Lirra] Or it's something that has never needed to go around anything.

::: scene
id: prologue.boar-sign-tusk-scrape
:::

Pale gouges score an old oak, higher than Grik's head. Sap still weeps from them.

[Grik] It marks its ground up here. The bed is close.

[Lirra] Look at you, reading the land. Borak would almost smile.

::: scene
id: prologue.sun-arrow
:::

The thornback lies still. Grik's hands are shaking, and he lets them.

[Lirra] Grik. Look at its flank.

A broken arrow is buried in the boar's hide, half grown over. The head is iron, the shaft is straight and planed, and the fletching is stamped with a small golden sun.

[Grik] That isn't ours. No goblin fletches like that.

[Lirra] Then who?

[Grik] An orc caravan, probably. They come through the passes sometimes. It's nothing.

Lirra works the arrow free and tucks it into her satchel without a word.

::: dialogue
npc: borak
map: guild-hall
branch: quest:prologue-trial-tracks
speaker: Borak
:::

The thornback beds down in the Wildwood. Read its trail before you chase it.

A hunter who runs in blind comes home carried.

::: dialogue
npc: drogg-lodge
map: guild-hall
branch: quest:prologue-trial-tracks
speaker: Drogg
:::

Still here? The boar won't come to you, little brother. Though if it does, scream. I'd like to see that.

::: dialogue
npc: borak
map: guild-hall
branch: objective:report-first-trial
speaker: Borak
:::

You found it. Tracked it. Brought it down.

[Grik] Lirra helped me read the signs.

Then you also learned to listen. Good.

...

The first trial. Passed.

The second trial is not a fight. A hunter feeds the village, and Mira's winter stores are short. Go and ask her what she needs.
