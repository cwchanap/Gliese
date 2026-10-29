# Overworld mountain and sand art brief (batch `overworld-mountain-sand`)

Art for the two overworld terrains that still bake as flat placeholder colours: mountain (`^`,
the world fill and every region border) and sand (`:`, beaches and the southern dunes). The
images are cut into tile-ready pieces and baked into the grid tileset next to the approved
Sundrop art (grass, dirt, water, forest, cliff), so they must match it.

Generate **two variants of each file** (`-a` and `-b`), so the best one can be picked.

## Shared style (all images)

- **HD pixel-art JRPG style**, matching the attached reference textures from `art/overworld/`
  (`tex-grass.png`, `tex-forest.png`, `cliff-face.png`): crisp pixel clusters, rich warm
  palette, soft shading. Think Octopath Traveler / Sea of Stars overworld tiles, flat 2D.
- **Light from the upper left**, short soft shadows falling to the lower right.
- **No text, no labels, no frames, no UI, no characters, no animals, no buildings.**

## A. Ground textures (no magenta, full-bleed)

Straight top-down (no perspective), **seamless and tileable on all four edges**, 1024x1024,
even detail with no single standout feature. They are shown at about a quarter of their size,
so keep the detail bold.

| File | Content |
| --- | --- |
| `tex-mountain-a.png`, `tex-mountain-b.png` | Impassable rugged mountain range seen from straight above: grey-brown granite crags and sharp ridges, deep shadowed crevices, scree, sparse moss and a few stunted pines. No snow. It must read clearly as "mountains, can't walk here" next to the grass and forest. |
| `tex-sand-a.png`, `tex-sand-b.png` | Warm golden beach sand: fine wind ripples, a few small pebbles and shell fragments. Calm and even, lighter than the dirt path. |

## B. Mountain foot strip (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane. The subject
spans the full image width and never touches the top or bottom edge.

| File | Size | Content |
| --- | --- | --- |
| `strip-mountain-foot-a.png`, `strip-mountain-foot-b.png` | 2048x512 | The foot of a steep mountain wall seen 3/4 from the south: a jagged grey rock face whose craggy top edge rises toward the top of the image, ending at the bottom in a band of scree and boulders with a little moss. **Seamless left to right.** Same palette as the mountain texture. |
