# Prologue item icons

Replace the five borrowed inventory icons with distinct art. The existing item paths
remain in use by Gear, Bag, and shops; no gameplay or UI changes are needed.

## Shared direction

- 96 × 96 RGBA PNG, transparent background, one centered object with clear margins.
- Match the existing item icons: detailed JRPG pixel art, dark outlines, earthy colors,
  and highlights from the upper left. Weapons run diagonally from lower left to upper right.
- No frame, text, checkerboard, or ground plane. Keep each silhouette legible at UI size.

## Subjects

| File | Subject |
| --- | --- |
| `practice-spear.png` | Light wooden first-hunt spear with a small stone head lashed with cord. |
| `hunters-knife.png` | Short goblin hunting knife with a steel blade and wrapped leather and bone grip. |
| `ancestral-amulet.png` | Weathered carved bone pendant on a rustic cord, with an ancient spiral. |
| `moonmoss.png` | Clump of pale silvery blue-green moss with a faint glow. |
| `sun-stamped-arrow.png` | Broken arrow with an iron point and a clearly visible golden sun on its fletching. |

## Production

Generated separately with Codex's built-in image generation, using existing item icons as
style references and the subject descriptions above as prompts. The generations supplied
real transparency directly, so no magenta background key was needed. Each generation was
resized to 96 × 96 with alpha preserved and saved over its existing runtime path in
`public/game/assets/items/`.
