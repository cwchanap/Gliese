# Overworld terrain gaps art brief (batch `overworld-terrain-gaps`)

Art for the gaps the map review of 2026-11-27 found in the overworld: a Whispering Cave with no
cave, sealed gates drawn as fence pieces, and a raid smoke plume drawn in much coarser pixels
than everything around it. The images are cut into object sprites and baked into the grid object
sheet next to the approved Sundrop, Wildwood and Silverpine art, so they must match it.

The lone trees need no new art: they are re-cut from the approved `props-sheet.png` at one shared
scale instead of three unrelated ones.

Generate **two variants of each file** (`-a` and `-b`), so the best one can be picked.

## Shared style (all images)

- **HD pixel-art JRPG style**, matching the attached references (`strip-cliff.png`,
  `strip-palisade.png`, `bld-hut-a.png`, `tex-grass.png`, `tex-mountain.png`): crisp pixel
  clusters, rich warm palette, soft shading. Think Octopath Traveler / Sea of Stars overworld
  tiles and props, flat 2D.
- **Light from the upper left**, short soft shadows falling to the lower right.
- **No text, no labels, no frames, no UI, no characters, no animals, no buildings** (except the
  gate and cave, which are the subject).

## A. Cave mouth (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane, no cast shadow on
the background. The subject fills most of the image, centred, with a magenta margin on every
side and never touching the edge. Seen 3/4 from the south, like the Sundrop buildings, at the
same scale as `bld-hut-a.png` (a person is about one fifth of the opening's height).

| File | Size | Content |
| --- | --- | --- |
| `prop-cave-mouth-a.png`, `prop-cave-mouth-b.png` | 1024x1024 | The Whispering Cave **by day**, a hunters' landmark: a rugged outcrop of grey-brown rock with an arched dark opening at the bottom centre, about a third of the outcrop's width, its floor level with the ground so a path can run straight in. Rough old stonework around the mouth (a crude lintel with a few worn carved marks, wedged stones), thick hanging roots and ivy over the top of the opening, moss on the sunlit side, a small cairn of stacked stones beside it as a warning marker, loose rocks and a little scree at the foot. The inside is near black, no glow. The foot of the outcrop breaks up into scree and tufts of grass, so it sits on the ground, and its sides taper into rubble so it can sit in a cliff line. Warm earth and grey rock, a little dark and eerie. |
| `prop-cave-mouth-open-a.png`, `prop-cave-mouth-open-b.png` | 1024x1024 | **The same cave on the night of the escape**, an edit of the chosen day image: identical outcrop, framing, scale and silhouette, so the two swap in place. The hanging roots and ivy are torn aside, the wedged stones and the cairn have been knocked over and scattered, and a faint cold blue-green glow from old runes comes up from the depths of the opening and spills a little onto the ground in front of it. Nothing else changes. |

## B. Sealed gate (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane, no cast shadow on
the background.

| File | Size | Content |
| --- | --- | --- |
| `prop-gate-a.png`, `prop-gate-b.png` | 1024x1024 | A **closed, barred gate in the goblin palisade**, seen straight on from the south at the same scale, angle and style as `strip-palisade.png` (same sharpened logs, same rope lashings, same bone and feather charms), and about as wide as it is tall. Two heavy double doors of lashed logs with dark iron straps, a thick horizontal locking beam across them held in two brackets, and a rope and a bone charm knotted round the beam to show it is shut on purpose. Taller gate posts on either side with a crossbar, topped with a skull or horns. On the left and right edges it ends in ordinary palisade logs, standing at full height, so it joins the plain wall on both sides. The subject fills the image width with a magenta margin above and below. |

## C. Raid smoke (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane, no cast shadow on
the background.

| File | Size | Content |
| --- | --- | --- |
| `prop-smoke-a.png`, `prop-smoke-b.png` | 1024x1024 | **Two separate tall plumes of black-grey smoke** rising from a burning hut, side by side with a wide magenta gap between them, each different: a billowing column that starts as a narrow stem of smoke and embers at the bottom and swells into soft rounded clouds at the top, lit warm orange from below and cool grey on top. The pixel clusters must be **fine**, the same size as the pixels in `bld-hut-a.png` (about 1/200 of the image width), not the large square blocks of a low-resolution sprite, with soft dithered shading inside the clouds and a few glowing embers. Each plume is about 1/3 of the image wide and 4/5 of it tall, and neither touches the edge. |
