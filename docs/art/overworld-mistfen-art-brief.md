# Overworld Mistfen art brief (batch `overworld-mistfen`)

Art for the Mistfen basin (霧沼), which still borrows the Wildwood's river water and forest:
marsh water, a reed thicket, and dead trees standing in the bog. The images are cut into
tile-ready pieces and baked into the grid tileset next to the approved Sundrop art (grass,
dirt, water, forest), so they must match it.

Generate **two variants of each file** (`-a` and `-b`), so the best one can be picked.

## Shared style (all images)

- **HD pixel-art JRPG style**, matching the attached reference textures from `art/overworld/`
  (`tex-grass.png`, `tex-water.png`, `tex-forest.png`): crisp pixel clusters, rich palette,
  soft shading. Think Octopath Traveler / Sea of Stars overworld tiles, flat 2D.
- The Mistfen is a gloomy, misty bog: cooler and more muted than the sunny Wildwood, olive
  greens, murky browns and grey-greens, but still clearly readable next to the bright grass.
- **Light from the upper left**, short soft shadows falling to the lower right.
- **No text, no labels, no frames, no UI, no characters, no animals, no buildings.**

## A. Ground textures (no magenta, full-bleed)

Straight top-down (no perspective), **seamless and tileable on all four edges**, 1024x1024,
even detail with no single standout feature. They are shown at about a quarter of their size,
so keep the detail bold.

| File | Content |
| --- | --- |
| `tex-marsh-a.png`, `tex-marsh-b.png` | Still, murky marsh water seen from straight above: dark olive-green and brown water, drifting patches of green duckweed and algae, a few small lily pads and floating dead leaves. Darker, greener and stiller than the clear blue river in `tex-water.png`. It must read as "deep bog water, can't walk here". |
| `tex-reeds-a.png`, `tex-reeds-b.png` | A dense reed bed seen from straight above: tightly packed tall reeds and cattails in sage greens and straw yellows, a few brown cattail heads, deep shadow between the clumps. It must read as an impassable thicket, the way `tex-forest.png` reads as dense forest. |

## B. Dead trees (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane, no cast
shadow on the background.

| File | Size | Content |
| --- | --- | --- |
| `props-dead-trees-a.png`, `props-dead-trees-b.png` | 2048x2048 | A 2x2 grid of four separate dead trees standing in the bog, each seen 3/4 from the south like the Sundrop props, centred in its quarter with a wide magenta margin, never touching another tree or the image edge. Bare grey-brown trunks and twisted leafless branches: (1) a gnarled tree with grey moss hanging from its branches, (2) a broken snag with a split top, (3) a leaning tree with a crooked crown, (4) a smaller forked tree. Each trunk ends at the bottom in a few exposed roots and a little dark water ring, as if standing in shallow marsh water. Tall and slender: about twice as tall as wide. |
