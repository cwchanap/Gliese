# Gliese

A JRPG vertical slice: a [Phaser 4](https://phaser.io/) game embedded in a
[Svelte 5](https://svelte.dev/) UI, shipped as a [Tauri v2](https://tauri.app/)
desktop app for macOS and Windows.

The game world — a village hub, its interiors, a layered overworld, and a two-stage
ruins dungeon — is authored as data under `src/lib/game/content/`. Story prose lives
separately in `story/` and is compiled by Rust, so it never ships inside the frontend
bundle.

## Prerequisites

- [Bun](https://bun.sh/)
- A [Rust toolchain](https://rustup.rs/) (1.77.2+) and the
  [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your platform —
  needed for the desktop shell, but not for browser-only development.

## Running it

```sh
bun install
```

There are two ways to run the game, and they differ in more than just the window:

```sh
bun run dev          # browser only, http://localhost:5173 — saves go to localStorage
bun run tauri dev    # full desktop app — saves go to a JSON file in the OS app-data dir
```

`bun run dev` is the fast loop and needs no Rust toolchain. It serves story dialogue from
a browser fixture rather than the Rust story runtime, which is fine for gameplay work but
means it is not a faithful preview of a release build.

## Building

```sh
bun run build        # browser bundle → dist/
bun run tauri build  # desktop release: installers for the current platform
```

`bun run tauri build` is the real release path. It runs a strict story check, builds the
frontend in Tauri mode, and verifies no story prose leaked into the bundle before packaging.

## Testing

```sh
bun run test                   # unit + e2e
bun run test:unit -- --run     # unit only, one-shot (omit --run to watch)
bun run test:e2e               # Playwright, against a preview build
bun run check                  # svelte-check
bun run lint                   # prettier + eslint
```

Rust tests live in `src-tauri/` and run with `cargo test` from that directory.

## Editing the story

Dialogue is authored as Markdown beats under `story/beats/`, indexed by `story/manifest.yaml`.
After changing anything there, regenerate the compiled Rust catalog and commit the result:

```sh
bun run story:check
```

Skipping this fails CI and `bun run tauri build`, both of which check that the generated
catalog matches the source.

## More

- `CLAUDE.md` — architecture reference: the Phaser↔Svelte bridge, save format, story
  pipeline, and content model. The most detailed map of the codebase.
- `docs/plans/` — implementation plans, including the original vertical slice and the
  Rust story pipeline.
