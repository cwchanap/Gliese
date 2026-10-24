# Gliese Story Beat Format

Story source is manifest-referenced Markdown compiled by Rust at build time.
Writers own prose and semantic engine metadata; the compiler owns generated Rust output.

## Source Of Truth

- `story/manifest.yaml` lists chapters, beat IDs, file paths, and required game content IDs.
- `story/beats/**/*.md` contains human-reviewed story prose.
- `story/schema/directives.md` is the parser contract.
- `src/lib/game/content/quests.ts` defines the main quest chain, its objectives, and the
  scenes each objective plays. Branch conditions must name real quest and objective IDs.

## Supported Directives

Use one `::: story` block per beat. `map` is the default map for its dialogue blocks:

```md
::: story
id: prologue.proving-morning
chapter: prologue
map: hero-house
:::
```

Use `::: dialogue` blocks for NPC dialogue branches:

```md
::: dialogue
npc: mott-hearth
branch: objective:talk-to-mott
speaker: Old Mott
:::
```

- `branch` is `always`, `quest:<questId>`, or `objective:<objectiveId>`. The current
  objective wins over the current quest, which wins over `always`.
- Every NPC placed on a map needs an `always` branch.
- Add `map:` to a dialogue block when the NPC lives on a different map than the beat.
- A `talk-to-npc` objective completes when its dialogue opens.

Use `::: scene` blocks for scripted scenes the game plays (quest effects, discoveries):

```md
::: scene
id: prologue.opening
:::
```

Plain Markdown paragraphs after a dialogue or scene directive become lines until the next
directive or heading. Start a paragraph with `[Name] ` to set that line's speaker.

Supported choices:

- `choices: shop` — requires a matching `shop` field with a known shop ID
- `choices: close` — adds a Close action

When a story needs an unsupported engine behavior, document it instead of inventing syntax:

```md
::: unsupported-hook
id: prologue-camera-pan
kind: camera
reason: The current parser cannot trigger camera movement.
:::
```

## Validation

Run `bun run story:check` after editing story source. Fix parser errors in the Markdown source, not in generated Rust.
