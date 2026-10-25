# Goblin prologue art brief

Replaces the borrowed placeholder art (Liam, the slime, the ruins warden, the human
villager busts and NPC sprites) with the goblin prologue cast. Generated with Codex
image generation. Village exteriors/interiors and the burning village are out of scope
(separate follow-up).

Raw generations go to `art-raw/goblin-prologue/` on the generating machine (not committed).
Post-processing (background keying, slicing, packing, resizing) happens afterwards.

## Shared style

- **Field sprites:** chunky SNES-era pixel art, 3/4 top-down front view, chibi proportions
  (big head, ~2.5 heads tall), dark 1px outline, soft drop shadow under the feet. Match the
  existing `public/game/assets/animation-pack.png` and `npc-pack.png`.
- **Busts / portraits / plates:** painterly anime JRPG illustration, warm soft lighting,
  clean edges. Match the earlier human bust art (`heroic-ui/busts/mira.png` before this PR).
- **Every image:** a single flat pure magenta (#FF00FF) background, no gradient, no
  ground plane, no text, no frame, no checkerboard. Subject never touches the image edge.
- **Goblins:** green to olive skin, long pointed ears, yellow-amber eyes, small sharp teeth,
  forest-hunter clothing (leather, fur, bone, woven cord, feathers). Warm and likeable,
  never monstrous; they are the protagonists.
- **Humans:** steel plate and mail, white tabards with a silver/gold sun crest. Cold,
  imposing.

## Cast notes

| Id | Who | Look |
| --- | --- | --- |
| grik | Hero. Young goblin hunter, lean and quick. | Messy dark hair tied back, fur-trimmed leather vest, wrapped forearms, bone-tipped spear, small satchel, a single feather. |
| borak | Father, hunt leader. Big, proud, gruff. | Broad, grey-streaked topknot, scarred, bear-fur mantle, bone necklace, heavy hand axe. |
| drogg | Older brother, strongest young warrior, teasing grin. | Muscular, shaved sides, war paint stripe, leather harness, short bow and quiver. |
| mott | Grandfather, village elder, shrine keeper. | Stooped, wispy white hair and beard, hooded patched robe, gnarled walking staff with charms and feathers. |
| tikka | Younger sister, cheerful and bossy. | Small, twin braids with beads, apron over a tunic, wooden ladle tucked in the belt. |
| lirra | Grik's girlfriend, herbalist and best tracker. | Slim, hood of leaf-green cloth, herb pouches, braided hair with a flower, sharp confident smile. |
| villager-a..h | Eight generic Sundrop goblins. | (a) shopkeeper woman with apron, (b) quartermaster with ledger, (c) elder in robe, (d) fisher with net, (e) wanderer with backpack, (f) pilgrim with prayer beads, (g) woodcutter with axe, (h) crier with bell. |
| forest-wolf | Beast. | Grey-brown lean wolf, bared fangs. |
| mist-toad | Beast. | Large pale blue-green toad wreathed in faint mist, glowing eyes. |
| thornback-boar | Beast. | Bristly brown boar with a ridge of thorny spines down its back, tusks. |
| boar-king | Boss. | Huge dark boar, scarred, enormous curved tusks, thorn-spine mane, bone trophies tied in its hair. Clearly bigger and grander than the thornback boar. |
| tunnel-crawler | Beast. | Pale segmented cave centipede, many legs, mandibles. |
| human-soldier | Human. | Helmeted human soldier, mail and half plate, white tabard with a sun crest, spear and kite shield. |
| sun-crest-captain | Human boss. | Tall human officer, full plate, crested great helm with a silver sun emblem on the brow, red cape, longsword. |

## Deliverables

### A. Field animation sheets (one PNG per actor)

Actors: grik, forest-wolf, mist-toad, thornback-boar, boar-king, tunnel-crawler,
human-soldier, sun-crest-captain.

Each sheet is a 4x4 grid of equal square cells, one actor, consistent size and position in
every cell. Row 1 idle (gentle breathing), row 2 walk cycle, row 3 attack (wind-up to
strike), row 4 dead (collapse to lying down). Facing the viewer / slightly toward the
right. File: `sheet-<id>.png`.

### B. Field NPC sprites

One PNG per goblin: borak, drogg, mott, tikka, lirra, villager-a..h. A single standing
idle pose, same scale and style as the field sprites. File: `npc-<id>.png`.
(These can be generated as one or two lineup images instead, evenly spaced on magenta.)

### C. Dialogue busts

Waist-up, 3/4 view, neutral friendly expression, portrait orientation (about 8:9).
borak, drogg, mott, tikka, lirra, plus three goblin merchants: shopkeeper (villager-a,
the item-shop woman with apron), quartermaster (villager-b, hunting-lodge quartermaster
with ledger), smith (burly goblin blacksmith with leather apron and hammer).
File: `bust-<id>.png`.

### D. Grik HUD art

- `portrait-grik.png`: square head-and-shoulders, looking slightly left.
- `paper-doll-grik.png`: full body, standing straight, arms slightly away from the
  body, front view, tall portrait orientation (about 7:12).

### E. Battle enemy plates

Full-body painterly cut-out of each enemy, square: forest-wolf, mist-toad,
thornback-boar, boar-king, tunnel-crawler, human-soldier, sun-crest-captain.
File: `plate-<id>.png`.
