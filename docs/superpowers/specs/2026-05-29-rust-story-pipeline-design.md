# Rust Story Pipeline Design

## Summary

Add a story authoring and build pipeline where writer agents author a story package as a YAML manifest plus human-reviewable Markdown beat files. The build step validates that package and compiles supported story content into Rust-owned runtime data.

The frontend should not ship readable story Markdown, JSON, or generated TypeScript prose. Svelte and Phaser remain the presentation and gameplay client, but story prose is requested from Rust on demand through narrow Tauri commands.

This is casual spoiler resistance, not perfect anti-reverse-engineering. A determined person can still inspect a desktop binary, observe runtime payloads, or read displayed text. The goal is to avoid placing the full story in obvious frontend assets.

## Goals

- Make Markdown beat files the human and writer-agent authoring surface.
- Use a YAML manifest for package structure, ordering, and strict machine-readable references.
- Compile supported story content into Rust-owned data at build time.
- Keep full story prose out of the frontend bundle.
- Return only the currently needed story fragment to TypeScript at runtime.
- Support draft validation for writer iteration and strict validation for release builds.
- Emit a story integration report for unsupported story hooks during draft work.
- Provide a tool-agnostic writer-agent skill under `.agents/skills`.
- Keep the existing Phaser, Svelte, dialogue, quest, and HUD bridge boundaries intact where possible.

## Non-Goals

- No DRM, encryption, or claim of perfect content secrecy.
- No runtime loading of external story mods.
- No full cutscene scripting engine in the first slice.
- No broad story-variable system beyond allowlisted quest, map, NPC, item, enemy, gate, and story-hook references.
- No localization authoring pipeline beyond stable IDs and English source text in the first slice.
- No generated frontend story data containing the full story package.
- No writer-agent edits to generated Rust output.
- No rewrite of the existing dialogue panel, quest system, map system, or save system unless a contract boundary requires it.

## Current Context

Gliese currently stores story-adjacent content as TypeScript definitions under `src/lib/game/content`. Dialogue, quests, maps, items, enemies, shops, and i18n message keys are consumed by pure TypeScript core rules and coordinated by `WorldScene`.

The Rust side currently acts as the Tauri shell and filesystem plugin host. It does not own gameplay content yet. This design intentionally moves story content authority into Rust while keeping TypeScript responsible for rendering, UI commands, gameplay intent execution, save state, and Phaser scene coordination.

Existing runtime boundaries should remain recognizable:

- Content definitions become Rust-owned story data where story prose and story beats are involved.
- Pure TypeScript gameplay rules still validate and apply quest, shop, inventory, combat, and save mutations.
- `WorldScene` still coordinates runtime context and applies gameplay effects.
- Svelte still renders HUD and dialogue payloads.
- The Tauri boundary becomes the story lookup boundary.

## Architecture

The story system has three layers.

### Authoring Layer

Writers edit files under a new `story/` package. The package contains:

- `story/manifest.yaml` for machine-readable structure.
- Markdown beat files for human-reviewable story content.
- Optional examples and schema documentation for writer agents.
- Generated reports, not generated runtime code.

The manifest owns package identity, chapter ordering, beat file references, and required content IDs. Markdown beat files own prose, dialogue, choices, quest beats, gate copy, and unsupported engine-hook requests.

### Build Layer

A Rust story parser reads the manifest and beat files during development and release builds. It extracts supported story directives, validates references, and generates compiled Rust story data.

The build layer supports two modes:

- Draft mode: parses the story package, generates supported content, and writes a story integration report for unsupported hooks.
- Strict mode: fails on unsupported hooks, invalid references, duplicate IDs, missing beats, malformed directives, or incomplete runtime contracts.

Strict validation must run before packaging the Tauri app.

### Runtime Layer

Rust exposes narrow Tauri commands that return only the story fragment needed for the current player moment. TypeScript sends context such as NPC ID, map ID, quest-state summary, selected choice ID, and locale. Rust selects the correct story fragment and returns a render-ready payload.

Rust should not send the complete story package to TypeScript. Frontend-visible IDs are acceptable, but full prose should cross the boundary only when the player reaches it.

## Story Package Layout

Use this starting layout:

```text
story/
  manifest.yaml
  beats/
    prologue/
      guild-summons.md
      ruins-gate.md
  reports/
    story-integration-report.md
  schema/
    manifest.schema.yaml
    directives.md
  examples/
    dialogue-beat.md
    quest-beat.md
    gate-beat.md
```

For the first implementation, `story/schema/` contains directive documentation and parser fixtures. The parser is the source of validation truth.

## Manifest Format

The manifest is strict YAML. It should not contain dialogue prose. It defines package structure and references that the parser can validate against the game.

Example:

```yaml
id: sundrop-ruins
title: Sundrop Ruins
entryBeat: prologue.guild-summons
defaultLocale: en
chapters:
  - id: prologue
    title: Prologue
    beats:
      - id: prologue.guild-summons
        file: beats/prologue/guild-summons.md
      - id: prologue.ruins-gate
        file: beats/prologue/ruins-gate.md
requiredContent:
  maps:
    - guild-hall
    - ruins-threshold
  npcs:
    - guild-master
  quests:
    - investigate-the-ruins
  enemies:
    - ruins-warden
```

Manifest validation should catch:

- duplicate package, chapter, or beat IDs,
- beat IDs listed without matching files,
- beat files declaring an ID different from the manifest entry,
- unknown required maps, NPCs, quests, items, enemies, shops, or gates,
- unsupported locales for the first slice,
- malformed ordering or missing entry beat.

## Markdown Beat Format

Beat files are narrative-first Markdown. Writer agents and humans should be able to review dialogue without reading generated code or config-heavy blocks.

Use small directive blocks for engine metadata and structured intent. Keep prose as normal Markdown paragraphs.

Example:

```md
# Guild Summons

Liam arrives at the Guild Hall after hearing that the ruins are stirring.

::: story
id: prologue.guild-summons
chapter: prologue
map: guild-hall
primaryNpc: guild-master
branch: mainQuestNeedsGuildBriefing
:::

## Dialogue: Guild Master Briefing

**Guild Master Arlen**

You made it. The eastern ruins are stirring again, and the village road is no longer safe.

Go through the forest path, reach the old core, and defeat the warden before it wakes the rest.

### Choices

- **I will handle it.**
  - id: accept-duty
  - intent: completeObjective
  - quest: investigate-the-ruins
  - objective: talk-to-guild-master
```

The parser should support enough Markdown structure to avoid turning every line into YAML. A first parser can enforce a conservative subset:

- one top-level beat title,
- one required `::: story` directive,
- dialogue sections with speaker names in bold,
- paragraph lines as dialogue text,
- choice lists with required stable IDs,
- directive blocks for quest beats, gates, rewards, and unsupported hooks.

## Supported Story Content

The first slice should support a full story package shape but a narrow runtime contract.

Supported content types:

- NPC dialogue branches.
- Dialogue choices with stable IDs.
- Quest beat references to existing quest IDs and objective IDs.
- Gate responses for existing map transitions or story gates.
- Reward and completion copy tied to existing reward application rules.
- Story hook declarations for engine work that does not exist yet.

Gameplay-affecting choices must use allowlisted intents. Initial intents can include:

- `completeObjective`
- `showQuestDetails`
- `acceptQuest`
- `openShop`
- `close`
- `storyHook`

These names are the first serialized intent contract. Implementation may add fields to an intent only when validation and runtime handling are updated together.

## Unsupported Hooks

Writer agents can ask for engine behavior that does not exist yet, but it must be explicit. Unsupported hooks are not generated as active gameplay content.

Example:

```md
::: unsupported-hook
id: cutscene.guild-master-points-to-map
kind: camera-pan
reason: Need a short camera movement before the ruins gate unlocks.
blockingForRelease: true
:::
```

Draft mode should include unsupported hooks in `story/reports/story-integration-report.md`.

Strict mode fails if any unsupported hook remains unresolved. Cosmetic story ideas that do not require engine work should stay in normal Markdown notes instead of `unsupported-hook` blocks.

## Build And Validation

Add story commands with these intended roles:

```sh
bun run story:check
bun run story:check:strict
```

`story:check` runs draft validation and writes the integration report.

`story:check:strict` runs release validation and fails on unresolved runtime contracts.

`bun run tauri build` should run strict story validation before producing distributable bundles.

Validation rules should include:

- all manifest and beat IDs are unique,
- all manifest beat files exist,
- all beat files declare matching IDs,
- all referenced maps, NPCs, quests, quest objectives, items, enemies, shops, and gates exist,
- all choices have stable IDs,
- all gameplay intents match the allowlisted schema,
- all branches have deterministic conditions,
- all generated Rust story records are reachable through a defined lookup path,
- all unsupported hooks are reported in draft mode,
- strict mode fails unresolved unsupported hooks.

## Generated Rust Data

The generated Rust artifact should be treated like compiled content, not authoring source. The first implementation emits generated Rust source included by the Tauri crate. A later optimization can switch that internal representation to compact data included through `include_bytes!` if generated source becomes unwieldy.

The design preference is generated Rust types owned by the Rust crate, because the goal is to avoid readable frontend story assets.

Generated data should not be edited by writers or gameplay implementers. It should be reproducible from `story/manifest.yaml` and Markdown beats.

## Runtime Tauri Commands

Expose narrow story commands rather than a full package dump.

Initial commands:

- `get_npc_dialogue`
- `choose_story_dialogue_option`
- `get_story_gate_response`
- `get_story_beat_summary`

Example frontend request:

```ts
getNpcDialogue({
	npcId: 'guild-master',
	mapId: 'guild-hall',
	questStateSummary,
	locale: 'en'
});
```

Example response:

```ts
{
	sessionId: 'npc:guild-master:prologue.guild-summons',
	speaker: 'Guild Master Arlen',
	lines: [
		'You made it. The eastern ruins are stirring again.',
		'Reach the old core, and defeat the warden before it wakes the rest.'
	],
	choices: [
		{
			id: 'accept-duty',
			label: 'I will handle it.',
			intent: {
				type: 'completeObjective',
				questId: 'investigate-the-ruins',
				objectiveId: 'talk-to-guild-master'
			}
		}
	]
}
```

Rust selects content. TypeScript renders content and applies intents through existing gameplay rules. Rust should not mutate save state directly in the first slice.

## Frontend Integration

The frontend should replace direct imports of story prose with calls to the Rust story command boundary where practical.

Expected first integration points:

- `WorldScene` requests NPC dialogue from Rust instead of reading full dialogue definitions from TypeScript.
- The existing dialogue panel renders the returned session payload.
- Dialogue choice intents still flow through `WorldScene`.
- Quest, shop, item, and gate effects still use current TypeScript rules.
- TypeScript content may keep non-prose IDs and mechanical definitions as needed during migration.

The migration can be incremental. The first release should prioritize moving story prose and story branch selection out of the frontend bundle.

## Writer Agent Skill Packaging

Use a shared tool-agnostic skill folder:

```text
.agents/skills/gliese-story-writer/
  SKILL.md
  examples/
  references/

.claude/skills/gliese-story-writer -> ../../.agents/skills/gliese-story-writer
```

Do not add `.opencode/skills` or `.codex/skills` adapters by default. OpenCode and Codex can use `.agents/skills`; Claude Code keeps a `.claude/skills` symlink adapter.

The shared `SKILL.md` should instruct writer agents to:

- read `story/manifest.yaml` before editing beat files,
- edit Markdown beat files for story text,
- preserve stable beat, dialogue, choice, quest, and hook IDs,
- keep dialogue human-reviewable,
- use directive blocks only for engine metadata,
- mark unsupported engine needs with `unsupported-hook`,
- avoid editing generated Rust output,
- run the story checker after changes,
- summarize changed beats and integration-report findings.

The skill should include examples for:

- NPC dialogue beat,
- quest beat,
- gate response beat,
- unsupported cutscene hook,
- multi-choice dialogue.

## Testing

Authoring pipeline tests should cover:

- valid manifest and Markdown fixture parsing,
- invalid YAML,
- missing beat files,
- mismatched beat IDs,
- dialogue extraction,
- choice ID extraction,
- quest beat extraction,
- gate response extraction,
- unsupported hook extraction,
- unknown map, NPC, quest, objective, item, enemy, shop, and gate references,
- draft report generation,
- strict-mode failure on unresolved unsupported hooks,
- deterministic generated Rust story lookup.

Runtime tests should cover:

- Tauri command returns only the requested NPC dialogue branch,
- invalid requests return a typed error or safe fallback,
- TypeScript adapter converts Rust story payloads into the existing dialogue session shape,
- `WorldScene` applies returned intents through existing quest, shop, and gate rules,
- no frontend test fixture imports the complete story package as plain prose.

End-to-end coverage should include one focused flow:

- start the app,
- reach a story NPC,
- request and display a Rust-owned story dialogue beat,
- choose a story option,
- verify the expected quest or gate state changes,
- verify that the visible prose was not sourced from frontend story data.

## Error Handling

Build-time validation should prefer hard failures over runtime surprises for supported content.

Runtime command failures should return typed errors or safe fallback payloads for:

- unknown NPC IDs,
- missing beat IDs,
- unsupported locale requests,
- invalid quest-state summaries,
- unavailable choices,
- unresolved story hooks that somehow reach runtime.

The frontend should surface runtime failures as dialogue-style fallback text where possible, matching existing dialogue error behavior.

## Release Criteria

This design is complete when:

- writer agents can author story beats in Markdown and structure them with a YAML manifest,
- draft validation emits a useful integration report,
- strict validation blocks unresolved unsupported hooks,
- supported story content compiles into Rust-owned runtime data,
- the frontend requests story fragments from Rust on demand,
- full story prose is absent from generated frontend assets,
- one NPC dialogue or story beat is proven end to end through the existing dialogue UI,
- the shared `.agents/skills/gliese-story-writer` skill and `.claude/skills` symlink adapter are available for future writing work.
