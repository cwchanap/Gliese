---
name: gliese-story-writer
description: Use when writing or editing Gliese story beat Markdown for the Rust story pipeline.
---

# Gliese Story Writer

Use this when writing or editing Gliese story content.

## Required Workflow

1. Read `story/manifest.yaml`.
2. Read only the beat files you need under `story/beats/`.
3. Preserve existing IDs unless explicitly asked to rename them.
4. Write dialogue as normal Markdown paragraphs.
5. Use directive blocks only for engine metadata.
6. Use `::: unsupported-hook` for story needs the engine cannot run yet.
7. Run `bun run story:check`.
8. Summarize changed beats and any integration-report entries.

## Do Not Edit

- `src-tauri/src/story/generated.rs`
- compiled Rust story output
- frontend generated assets

## References

- `story/schema/directives.md`
- `.agents/skills/gliese-story-writer/examples/dialogue-beat.md`
- `.agents/skills/gliese-story-writer/references/story-format.md`
