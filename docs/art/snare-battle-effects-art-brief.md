# Snare, Flank, Loose battle effects art brief

Replaces the drawn shapes in the Snare, Flank, Loose prototype (`SnareBattleScene`) with
effect sprites: the snare rope, the rope coil on a snared enemy, the Bound ring, the thrown
spear, hit sparks, the Boar King's stun, and the ground telegraphs for enemy attacks.

Generated with Codex image generation. Raw generations go to
`~/workspace/Gliese-art-raw/snare-effects/` on the generating machine. Keying, slicing and
resizing to the runtime files below happen afterwards, so the raw images only need the
subject on a clean magenta background.

## Shared style

- Match the field sprites in `public/game/assets/animation-pack.png`: detailed SNES-era
  pixel art, dark 1px outline, warm earthy palette, light from the upper left. Attach that
  sheet as the style reference.
- The camera is the same 3/4 top-down view as the field sprites. Anything that lies on the
  ground (rope coil, Bound ring, telegraphs) is a flattened ellipse or flattened shape, about
  2.75 times wider than tall.
- Grik's gear is goblin hunter craft: twisted plant-fibre cord, rawhide, wood, bone, small
  feathers. Nothing metal or polished.
- **Every image:** one flat pure magenta (#FF00FF) background, no gradient, no ground plane,
  no drop shadow, no text, no frame, no checkerboard. The subject never touches the image
  edge.
- Never use magenta, pink or purple in the art itself; the background key removes them.
- Effects use hard pixel edges. No soft airbrushed glow or semi-transparent haze: the game
  sets transparency and blend at draw time.

## Deliverables

One raw image per row. File names are the raw names Codex saves.

| # | Raw file | Subject |
| --- | --- | --- |
| 1 | `raw-rope.png` | One long straight horizontal snare rope crossing the whole image, wide landscape (about 4:1). Two-ply twisted plant-fibre cord, tan and straw colours with darker brown twists, dark outline. Even thickness, no knots, no loose ends, so a short piece of it can repeat seamlessly along its length. |
| 2 | `raw-rope-coil-small.png` | Seen from 3/4 above: a snare rope pulled tight into a flattened oval loop lying on the ground, as if cinched around a wolf's four feet. Two wraps of the same cord, one small knot at the front with a short loose tail. The middle of the oval is empty magenta. |
| 3 | `raw-rope-coil-large.png` | The same as #2 for a huge boar: a wider flattened oval of three heavier wraps, two knots, and two short wooden stakes driven in at the left and right ends holding it down. The middle is empty magenta. |
| 4 | `raw-bound-ring.png` | A single "Bound ring": a flattened oval ring lying on the ground, made of braided golden-yellow cord with three small bone charms tied on it at even spacing. Brighter and more ceremonial than the rope coils, but still hunter craft. The middle is empty magenta. |
| 5 | `raw-spears.png` | Two thrown spears, horizontal, tips pointing right, one above the other with clear space between. Top: Grik's light hunting spear, a straight wooden shaft, a pale bone tip lashed with cord, one small feather near the tail. Bottom: the same spear on a Focus throw, with a golden-yellow cord wrap and three short straight golden speed streaks trailing behind the tail. |
| 6 | `raw-hit-sparks.png` | Two rows of four animation frames, evenly spaced, each frame centred in its own square cell. Row 1, a normal spear hit: a small white and pale-yellow impact star that bursts open, spreads into sharp shards, then breaks into a few fading specks. Row 2, a back hit: the same idea about twice the size, golden yellow and orange with white hot centre, more and longer shards, and a ring of gold chips in frame 3. |
| 7 | `raw-stun.png` | Top row: four animation frames of a dust and grass burst where a huge boar slams into the arena edge, evenly spaced in wide cells: a low puff, a big billow with flying earth clods and grass bits, a spreading cloud, thinning wisps. Earth brown and khaki dust, dark outline. Bottom row: three separate small dizzy stars, bright yellow with a darker gold outline, five-pointed, slightly different angles. |
| 8 | `raw-telegraph-lane.png` | A horizontal warning band seen from above, wide landscape (about 4:1), crossing the whole image: a straight strip with a bold dashed border along its top and bottom edges and a row of evenly spaced chevrons pointing right down its middle, like a painted ground marking. Draw it in white and light grey only (the game tints it red). Even spacing so a piece of it repeats seamlessly along its length. |
| 9 | `raw-telegraph-cone.png` | A fan-shaped warning marking seen from above: a 120 degree wedge whose point is at the left middle of the image and which opens to the right, with a bold dashed border and two curved chevron arcs inside pointing outward. White and light grey only (the game tints it red). |

## Runtime files

Saved to `public/game/assets/snare-battle/`. Stored at twice the drawn size so they stay crisp
on high-DPI screens, and drawn at half scale.

| File | Stored size | Drawn size | Source |
| --- | --- | --- | --- |
| `rope.png` | 64 × 16, repeats along x | 32 × 8 | #1 |
| `rope-coil-wolf.png` | 160 × 72 | 80 × 36 | #2 |
| `rope-coil-boar.png` | 320 × 128 | 160 × 64 | #3 |
| `bound-ring.png` | 320 × 120 | 160 × 60, then ×1.22 and ×1.44 for rings 2 and 3 | #4 |
| `spear.png` | 96 × 24, tip at the right | 48 × 12 | #5 top |
| `spear-focus.png` | 96 × 24, tip at the right | 48 × 12 | #5 bottom |
| `hit-spark.png` | 4 frames of 96 × 96 in a row | 48 × 48 | #6 row 1 |
| `back-hit-spark.png` | 4 frames of 160 × 160 in a row | 80 × 80 | #6 row 2 |
| `stun-dust.png` | 4 frames of 192 × 128 in a row | 96 × 64 | #7 top |
| `stun-star.png` | 32 × 32 | 16 × 16 | #7 bottom, one star |
| `telegraph-lane.png` | 128 × 64, repeats along x | 64 long, stretched to the lane width (44 for a lunge, 80 for a charge) | #8 |
| `telegraph-cone.png` | 180 × 312, point at the left middle | 90 × 156 (gore: reach 90, 60 degrees each side) | #9 |

The drawn sizes follow the prototype's numbers: wolf foot radius 28 and Boar King 60
(feet ellipse 2.2 by 0.8 times the radius), lunge lane 44 wide, charge lane 80 wide, gore
reach 90 with a 60 degree half angle.

## How the game uses them

- **Rope:** the snare line is drawn as the rope texture repeated along Grik's path, fading
  toward its oldest end as today.
- **Rope coil:** under a snared wolf's feet for its snare time, and under the Boar King's feet
  while it is brought down. The back half draws under the sprite and the front half over it.
- **Bound ring:** one per ring on the Boar King, each 22% larger than the one inside it.
- **Spear:** rotated to its flight direction. The Focus spear on every 4th planted throw.
- **Hit sparks:** played once at the hit point, about 24 frames per second. The gold one on a
  back hit (×3).
- **Stun:** the dust burst plays once at the edge where the charge stops, then three stars
  circle above the Boar King's head for the stun time.
- **Telegraphs:** tinted red, drawn faint over the whole attack area during the wind-up, with
  a stronger copy that grows with the wind-up progress, as the drawn shapes do today.
