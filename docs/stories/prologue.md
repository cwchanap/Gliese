# Prologue — "The Last Quiet Day"

> Scene-level outline for the goblin prologue. The world and cast are in
> [`high_level_plan.md`](./high_level_plan.md). Names marked _(working)_ there are
> placeholders here too.

## Goal

Over two in-game days the player should come to love Sundrop and then lose it. Day 1 is
a full, playable slice of ordinary goblin life: a hunt, a homecoming and a family meal.
Day 2 takes all of it away in one morning. The prologue ends the moment Grik decides on
revenge.

The prologue also teaches the game: moving, talking, quests, field and turn-based combat,
items and saving, all before the raid.

## Scene list

### Day 1

**P1. Morning in Sundrop** (map `hero-house`, then the village)

- Grik wakes late. Tikka scolds him because today is his first hunt as a full hunter and
  Father is already at the Lodge. Drogg is gone too.
- Old Mott, by the fire, gives him a charm "for luck, from the old days."
- Grik walks through the village. Neighbours wish him luck, and the smith and the herb
  hut offer starting gear.
- Teaches: movement, talking, shops, the bag.

**P2. The Hunt Lodge** (map `guild-hall`)

- Borak, the Hunt Chief, gives Grik his first hunt: bring down the thornback boars
  _(working)_ that have been tearing through the village snares in the Wildwood.
- Drogg teases him that he'll come back with a rabbit.
- Quest starts: **"Grik's First Hunt"** _(working)_, with a talk-to objective for Borak,
  a defeat objective for the boars, and a return to Borak.
- Teaches: quests and the journal.

**P3. The Wildwood** (Wildwood region, the forest edge of the hub)

- Lirra is waiting at the treeline because she "happened" to be gathering herbs there.
  She tracks better than Grik and enjoys pointing it out.
- Field and turn-based battles against Wildwood animals, ending with a bigger alpha boar
  _(working)_ as the prologue's first tough fight.
- **Foreshadowing.** Lirra finds a snapped arrow with iron fletching and a small sun
  stamp, which no goblin would make. Grik shrugs it off ("orc traders, probably"). Lirra
  pockets it.
- Teaches: combat, loot, healing.

**P4. Homecoming and the family evening** (maps `guild-hall`, then `hero-house`)

- Back at the Lodge, Borak looks at the kill for a long moment and then names Grik a
  hunter of Sundrop. He hands Grik his first hunter's knife (key item or starter
  weapon). Drogg, quietly, is proud.
- Dinner at home is the emotional anchor of the prologue. Talk to each family member at
  the table: Tikka bossing everyone about, Drogg's teasing turning into real advice, and
  Borak saying little but meaning it.
- Old Mott tells the story of the Long Peace, when goblins were the largest people on
  the island and lived alongside elves, orcs and demons. Then he tells of the Hero who
  came across the sea, the demons who fell, and the hunts that followed. Borak cuts him
  off ("not tonight") because he doesn't want to frighten Tikka.
- Grik walks Lirra home. It is a quiet moment where they promise something small for
  tomorrow, such as a river spot she wants to show him.
- Grik sleeps, and the screen fades to Day 2. Save prompt.

### Day 2

**P5. The raid** (a raided variant of Sundrop)

- Grik wakes to war horns and smoke. The village is burning, and human soldiers are
  everywhere.
- He fights through one or two soldier battles. These are winnable: he can hurt them,
  but they are bigger and better armoured.
- Story beats as he moves through the village, cutting away rather than showing the
  violence:
  - Borak holds the village gate with the hunters and falls.
  - Drogg breaks toward the house to reach Tikka and falls.
  - Grik reaches the square to find Tikka and Lirra bound, and the **Sun-Crest Captain**
    overseeing the captives.
- **Forced loss.** Grik attacks the Captain and loses. The Captain looks down at him and
  says something dismissive along the lines of "Leave it. The small ones don't last out
  here anyway." That line comes back in the vow.

**P6. The escape** (maps `shrine-of-aurora-interior`, then `ruins-threshold` and
`ruins-core`)

- Old Mott drags the half-conscious Grik into the shrine and opens the old goblin
  tunnels from the Long Peace beneath it.
- Mott stays behind to seal the way: "Live. Remember us. That is the hunt now." The
  tunnel collapses behind Grik.
- A short, dark crawl through the ancestral ruins. There is optional exploration, and
  carvings of goblins, orcs, elves and demons together reinforce the lost peace. There is
  at most one encounter.

**P7. The vow** (ridge exit, or the Wildwood edge at dawn)

- Grik comes out on a ridge above Sundrop. Smoke is rising, and a column of soldiers is
  marching south with the captives. He can just make out Tikka's and Lirra's shapes.
- Lirra's sun-stamped arrow is on the ground where she dropped it, or he finds it in his
  bag.
- Grik makes his vow: "They hunted us like animals. Now I hunt them."
- Title card: **Chapter 1**.

## Reusing the current vertical slice

The existing Sundrop slice maps onto the prologue almost one to one, so the prologue is
mostly a re-skin plus new scripting, not new world building.

| Today                                        | In the prologue                                                         |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `meadow-entry` hub (Sundrop Meadows)         | Sundrop, the goblin village, and its surroundings                       |
| `hero-house`                                 | Grik's family home (P1 and P4)                                          |
| `guild-hall`: Guild Master Arlen             | Hunt Lodge: Hunt Chief Borak                                            |
| `guild-hall`: Quartermaster Vale             | Lodge stores keeper (hunting gear shop)                                 |
| `item-shop`: Mira                            | Herb hut keeper, Lirra's mentor                                         |
| `blacksmith-interior`: Oren                  | Sundrop's bone-and-iron smith                                           |
| `villager-house-1/2/3`: Lynn, Toma, Io       | Neighbours. One house becomes Lirra's family home                      |
| Wildwood region                              | The hunting grounds (P3)                                                |
| `slime-scout` enemy                          | Replaced in the prologue by Wildwood animals                            |
| `shrine-of-aurora-interior`                  | Sundrop's shrine, Old Mott's post, and the tunnel entrance (P6)         |
| `ruins-threshold` and `ruins-core`           | The old goblin tunnels, the escape route (P6)                           |
| `ruins-warden` boss                          | Not needed in the prologue. Keep it for later or retire it              |
| Main quest `investigate-the-ruins`           | Replaced by "Grik's First Hunt" and the prologue progression            |

The village keeps the name Sundrop, so map ids, region ids and most content stay as they
are.

## Engine gaps

These are things the prologue needs that the game can't do today. Each one is solved in
its own follow-up task. None of them is solved by this document.

1. **Story progression.** Dialogue branches only know five quest and guild conditions
   (see `story/schema/directives.md`). The prologue needs to know which step the story
   is at (morning, hunting, hunt done, evening, raid, escape). The simplest approach is
   probably one prologue step value in the save, plus branch conditions keyed on it.
2. **Scripted scenes.** There is no cutscene support: camera and actor scripting is an
   `unsupported-hook` today. Fades, a chain of system dialogue and moving the player
   between maps are enough for the prologue. Choreographed actors are not needed.
3. **Raided village.** P5 needs Sundrop in a different state, with fires, soldiers and
   empty houses. The simplest approach is a separate map that reuses the village layout
   with its own background, NPCs and enemies.
4. **Forced-loss battle.** Today a defeated hero simply stays down. The Captain fight has
   to end in a scripted loss that moves the story on to P6.
5. **New enemies.** Wildwood animals (boars and an alpha), human soldiers, and the
   Sun-Crest Captain.
6. **Audio.** The game has no audio playback yet, so SFX can't be added until it does.

## Follow-up tasks

Each task below is one PR. Following the repo's "structure before art" rule, the code
tasks use the current art as stand-ins, and the art tasks replace those stand-ins
afterwards.

### Code and story

1. **Goblin re-skin of Sundrop.** Rename and recast the current NPCs and beats per the
   table above, covering the beat prose, speaker names, i18n names (Guild Hall becomes
   the Hunt Lodge, and so on) and test fixtures.
2. **Prologue Day 1.** Add the "Grik's First Hunt" quest, the Wildwood animal enemies
   (with stand-in sprites), the arrow foreshadowing pickup, and the hunter's knife
   reward.
3. **Prologue progression and the family evening.** Add the prologue step state, the new
   branch conditions in the Rust story pipeline and the TS runtime, the dinner scene, and
   the sleep transition to Day 2.
4. **The raid.** Add the raided Sundrop map, the soldier and Captain enemies, the scripted
   beats, and the forced-loss battle.
5. **Escape and vow.** Add the shrine-to-tunnels sequence, the tunnel collapse, the ridge
   vow scene, and the Chapter 1 title card.
6. **Audio playback.** Add a minimal SFX and ambience player. This has to land before
   the SFX task below.

### Art (generated with Codex)

1. **Grik.** Field sprite sheet (idle, walk, attack, dead), HUD portrait, dialogue bust
   and bag paper doll. This replaces the `liam-*` heroic-UI assets.
2. **Goblin cast.** Field sprites and busts for Borak, Drogg, Old Mott, Tikka and Lirra,
   plus the re-skinned village NPCs.
3. **Wildwood animals.** Thornback boar and the alpha boar, as field and battle sprites.
4. **Humans.** A soldier, and the Sun-Crest Captain with a bust.
5. **Goblin Sundrop.** A repaint of the village exterior and interiors in a goblin style.
   This is the biggest art task, and it can be split further when it is scheduled.
6. **Raided Sundrop.** A burning and aftermath variant of the village background.

### SFX (generated with ElevenLabs)

1. **Prologue SFX pack.** Village ambience, hunt sounds (boar, bow, brush), raid sounds
   (war horn, fire, clashes), the tunnel collapse, and a short sting for the vow. This
   depends on the audio playback task above.
