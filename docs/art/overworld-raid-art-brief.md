# Overworld raid art brief (batch `overworld-raid`)

Art for the raid on Sundrop (晴滴村), the last piece the raid overlay is missing: the palisade
where the humans broke through. The fire, smoke and burning hut come from the approved Sundrop
batch (`fx-fire-sheet.png`, `bld-hut-burning.png`), so this batch is only the wrecked wall. It
is cut into one slice per tile and drawn in place of the intact palisade, so it must match
`strip-palisade.png` exactly in scale, angle and style.

Generate **two variants** (`-a` and `-b`), so the best one can be picked.

## Shared style

- **HD pixel-art JRPG style**, matching the attached references from the Sundrop batch
  (`strip-palisade.png`, `bld-hut-burning.png`, `fx-fire-sheet.png`): crisp pixel clusters, rich
  warm palette, soft shading. Think Octopath Traveler / Sea of Stars overworld props, flat 2D.
- **Light from the upper left**, short soft shadows falling to the lower right.
- **No text, no labels, no frames, no UI, no characters, no animals, no buildings.**

## Broken palisade strip (on magenta)

A single flat pure magenta (#FF00FF) background, no gradient, no ground plane, no cast shadow on
the background. The subject spans the full image width and never touches the top or bottom edge.

| File | Size | Content |
| --- | --- | --- |
| `strip-palisade-broken-a.png`, `strip-palisade-broken-b.png` | 2048x512 | The same wooden palisade as `strip-palisade.png`, after the raid smashed through it, seen 3/4 from the south at the same scale. Some sharpened logs still stand at full height, but most are snapped off halfway with charred black tops, a few lean sharply, and some lie fallen and crossed at the foot of the wall. Torn rope lashings, scorched wood, glowing embers and grey ash on the ground. It is still a barrier, a heap of wreckage nobody could walk through, not an open gap. **Seamless left to right**, with the logs spaced like the reference so one slice per log lines up with the intact wall. |
