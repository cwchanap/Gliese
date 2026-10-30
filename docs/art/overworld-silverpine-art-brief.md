# Overworld Silverpine art brief (batch `overworld-silverpine`)

Art for the Silverpine (銀松林), the pine forest north of the Wildwood, which still borrows the
Wildwood's broadleaf forest: a pine canopy, the rock terraces of the upper tier, and a waterfall
where the river drops over a cliff band. The images are cut into tile-ready pieces and baked into
the grid tileset next to the approved Sundrop art (grass, dirt, water, forest, cliff), so they
must match it.

Generate **two variants of each file** (`-a` and `-b`), so the best one can be picked.

## Shared style (all images)

- **HD pixel-art JRPG style**, matching the attached reference textures from `art/overworld/`
  (`tex-grass.png`, `tex-forest.png`, `tex-water.png`, `cliff-face.png`): crisp pixel clusters,
  rich palette, soft shading. Think Octopath Traveler / Sea of Stars overworld tiles, flat 2D.
- The Silverpine is a cool, high mountain forest: deep blue-greens and slate greys with silvery
  highlights, crisper and colder than the warm Wildwood, but still clearly readable next to the
  bright grass.
- **Light from the upper left**, short soft shadows falling to the lower right.
- **No text, no labels, no frames, no UI, no characters, no animals, no buildings.**

## A. Ground textures (no magenta, full-bleed)

Straight top-down (no perspective), **seamless and tileable on all four edges**, 1024x1024,
even detail with no single standout feature. They are shown at about a quarter of their size,
so keep the detail bold.

| File | Content |
| --- | --- |
| `tex-pines-a.png`, `tex-pines-b.png` | A dense pine forest canopy seen from straight above: tightly packed conifer crowns, each a star of dark blue-green needles with silvery frost-like highlights on the sunlit side, deep shadow between the crowns. It must read as an impassable forest the way `tex-forest.png` does, but clearly pines, not broadleaf trees. |
| `tex-ledge-a.png`, `tex-ledge-b.png` | A flat, walkable rock terrace seen from straight above: broad pale grey granite slabs with fine cracks, patches of moss and lichen, scattered brown pine needles and a few small pebbles. Calm and even, lighter than the cliff, so a path across it reads as open ground. |

## B. Waterfall (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane, no cast shadow on
the background.

| File | Size | Content |
| --- | --- | --- |
| `prop-waterfall-a.png`, `prop-waterfall-b.png` | 1024x1024 | A short, wide waterfall seen 3/4 from the south, like the Sundrop props: a mountain stream pours over a dark grey rock lip at the top, falls straight down as a sheet of white and pale blue water about as wide as it is tall, and ends at the bottom in a churning pool of white foam and spray. Rocky edges on both sides frame the falling water. The subject fills most of the image, centred, with a magenta margin on every side and never touching the edge. |
