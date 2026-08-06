---
name: gliese-world-expansion
description: Use when adding or substantially revising Gliese maps, regions, dungeons, interiors, settlements, NPC or encounter placements, or integrating approved world art across multiple gameplay systems.
---

# Gliese World Expansion

Use this skill for multi-concern world content. Keep repository sources and tools authoritative.

## Do Not Use

- Story prose or beat metadata only: use `gliese-story-writer`.
- A small bug fix or placement-only move: edit the owning source and run focused tests.
- A standalone prop, sprite, or sheet: use `2d-game-asset-workflow`.

## Classify First

Choose one: `new-content`, `revision`, `frozen-integration`, `story-only`, `placement-only`, `asset-only`, or `unsupported`.

- `frozen-integration`: consume approved geometry and art; skip redesign and production.
- `unsupported`: record the owning subsystem gap; do not hide it in coordinates, art, prose, or a generic field.

## Required Workflow

1. Read `CLAUDE.md` and classify the request.
2. Use `references/authoring.md` to select the owning source and adjacent skill.
3. Read only relevant story, map, content, asset, and test files.
4. Create or confirm the smallest useful Expansion Brief for genuine multi-concern work.
5. Implement the smallest playable vertical slice.
6. Use `references/validation.md`; feed back only reusable gaps observed in real delivery.

## Boundaries

- Collision, transitions, NPCs, encounters, rewards, evidence, gates, and other stateful objects remain live.
- Base and foreground backgrounds are presentation.
- Do not copy registries, crop tables, fingerprints, proof inventories, or deterministic algorithms into skill prose.
- Do not create a new authoring framework before repeated completed work proves the need.

## Expansion Brief

Use `templates/expansion-brief.md`. Committed briefs follow `docs/superpowers/specs/YYYY-MM-DD-<scope>-expansion-brief.md`. Frozen integration and sufficiently small work may use the PR description instead.
