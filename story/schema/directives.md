# Story Directives

Beats are Markdown files with a small directive subset. Rust parses and validates them
(`bun run story:check`); TypeScript only renders the compiled lines.

## `::: story`

Required once per beat. Declares `id`, `chapter`, and an optional `map`, which is the
default map for every dialogue block in the beat.

## `::: dialogue`

Declares one NPC dialogue branch. Fields:

- `npc` — the NPC id, which must be placed on the map.
- `branch` — when the branch plays (see below).
- `speaker` — the default speaker for the branch's lines.
- `map` — optional. Overrides the beat's map. One NPC id lives on exactly one map.
- `choices` and `shop` — optional actions (see below).

`branch` takes one of three conditions:

- `always` — the fallback. Every placed NPC needs one, so it can be talked to at any
  point of the story.
- `quest:<questId>` — while that main quest is the active one.
- `objective:<objectiveId>` — while that objective is the current one.

The current objective wins over the current quest, which wins over `always`. An NPC can
have at most one branch per condition. A `talk-to-npc` objective completes as soon as
its dialogue opens, so the `objective:` branch is the conversation that counts.

## `::: scene`

Declares a scripted scene with an `id` and an optional default `speaker` (empty means
narration). Game content plays scenes through quest effects (`play-scene`) and
discoveries (`sceneId`). Every scene the game plays must be defined by a beat.

## Lines

Each non-empty paragraph after a dialogue or scene directive is one line, until the next
directive or heading. A leading `[Name] ` sets that line's speaker, for example
`[Grik] I will, Grandfather.`

## `choices: shop`

Adds a shop action to the branch. Requires a `shop` field with a known shop ID.

## `choices: close`

Adds a Close action that dismisses the dialogue. Combine choices with commas:
`choices: shop, close`.

## `shop: <shopId>`

Required when `choices` includes `shop`. Declares which shop the NPC opens. The shop ID
is validated against the manifest's required content.

## `::: unsupported-hook`

Documents a requested engine behavior that the current parser should report rather than
generate.

Required fields are `id`, `kind`, and `reason`.
