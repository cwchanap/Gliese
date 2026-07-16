# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri v2 desktop app shipping a Phaser 4 JRPG vertical slice. The
frontend is plain Svelte 5 (runes mode) + Vite, with Phaser dynamically
imported. Saves are written to a JSON file in the OS app-data directory
via Tauri's `fs` plugin.

- **Language**: TypeScript (Svelte 5 runes mode enforced project-wide via `svelte.config.js`)
- **Package Manager**: bun
- **Frontend**: Vite + Svelte 5; single mounted `App.svelte` (no router, no SvelteKit). Despite the `sv create` lineage, there is no SvelteKit and no `/game` route — the game mounts at the app root.
- **Desktop shell**: Tauri v2 (`src-tauri/` Rust crate)
- **Targets**: macOS, Windows
- **`AGENTS.md` is a symlink to this file** — both Claude and other agents read the same instructions; edit `CLAUDE.md` only.

## Image Generation

If the user asks to generate an image, always use the `imagegen` skill and
built-in image generation tool when they are available. If image generation is
not available in the current environment, tell the user to run the request in
the Codex app.

## Commands

```sh
bun run dev          # Vite dev server (browser only, http://localhost:5173). Saves go to localStorage.
bun run tauri dev    # Tauri window + Vite dev server. Saves go to the on-disk file.
bun run build        # vite build → dist/. BROWSER mode: bundles the story fixture, prose inlined.
bun run build:tauri  # release frontend: strict story check → vite build --mode tauri → prose assertion
bun run preview      # vite preview on :4173
bun run tauri build  # full Tauri release; its beforeBuildCommand runs build:tauri, not build
bun run check        # svelte-check
bun run lint         # prettier + eslint check
bun run format       # auto-format
```

### Story pipeline

```sh
bun run story:check          # draft mode: rewrites src-tauri/src/story/generated.rs + the report
bun run story:check:strict   # strict mode: fails if generated.rs is stale (what CI runs)
```

Run these from the repo root — `story_check` resolves `story/` relative to the current
directory.

### Rust

CI enforces all three; run them from `src-tauri/`.

```sh
cargo fmt --all -- --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test
```

### Tests

```sh
bun run test:unit              # vitest in WATCH mode (all unit + browser-component tests)
bun run test:unit -- --run     # one-shot run, exits when complete
bun run test:e2e               # playwright e2e (uses vite preview against dist/)
bun run test                   # test:unit --run then test:e2e

# Single test file (one-shot)
bun run test:unit -- --run src/lib/game/core/combat.test.ts
# Single e2e test by name
bun run test:e2e -- --grep "game route boots"
```

**Test split in `vite.config.ts`:**

- `*.svelte.{test,spec}.ts` → `client` project, runs in Chromium via vitest-browser-svelte
- `*.{test,spec}.ts` (non-svelte) → `server` project, runs in node
- `tests/e2e/*.e2e.ts` → Playwright, runs against `vite preview` on :4173 (auto-spun by `playwright.config.ts`)

`vite.config.ts` sets `expect: { requireAssertions: true }` — any test that runs without calling `expect()` will fail.

## Architecture

### Top-level layout

```
index.html             Vite entry HTML, hosts <div id="app">
src/
  main.ts              Async bootstrap: hydrate save storage → mount(App)
  App.svelte           Renders <GameShell />
  app.css              Global styles (Tailwind import)
  lib/                 Game code — see below
src-tauri/             Rust shell: fs plugin, window config, packaging, story pipeline
story/                 Story source: manifest.yaml + Markdown beats — see Story Pipeline below
tools/                 Build-time guards (assert-no-frontend-story-prose.ts)
public/                Static assets served at root (sprite sheets, etc.)
tests/e2e/             Playwright e2e suite
```

### Save storage

`src/lib/game/save/storage.ts` exposes a synchronous `SaveStorage`
interface. The active adapter is module-level state, swapped at boot
via `setSaveStorage(...)`. `main.ts` calls
`hydrateTauriStorage()` (in `src/lib/game/save/tauri-storage.ts`)
which:

- In Tauri: reads `gliese-save.json` from `$APPDATA/com.gliese.app/`
  via `@tauri-apps/plugin-fs`, returns an in-memory adapter that
  coalesces and atomically rewrites (tmp + rename) on every setItem.
- In a plain browser: returns `globalThis.localStorage` so dev and
  Playwright work unchanged.

A `tauri://close-requested` handler in `main.ts` flushes pending writes
(3s timeout) before the window closes.

The same `SaveStorage` adapter also backs **non-save** preferences (language: key `gliese.preferences.v1`), so anything written through `getSaveStorage()` lands in the same backing store as the main save.

### Game Layer (`src/lib/game/`)

```
content/     Static game definitions (assets, dialogue, enemies, items, player, quests, shops)
  maps/      meadow-entry + interiors (maps.ts), plus regions/ (layered overworld) built
             through layered/compile-layered-region.ts
core/        Pure TS game logic — no Phaser, no DOM
             (combat, battle, boss, progression, input, types, inventory, equipment, shop,
              stats, loot, dialogue runtime, quests, area-map, map-exploration)
phaser/      Phaser integration
  scenes/
    BootScene.ts    Loads the sprite sheet asset, then hands off to WorldScene
    WorldScene.ts   Main game loop: movement, transitions, save/load, NPC + shop +
                    dialogue + quest interaction
    BattleScene.ts  Turn-based battle UI, driven by core/battle.ts
  createGame.ts     Dynamic-imports Phaser, instantiates the Game with
                    [BootScene, WorldScene, BattleScene]
save/        SaveState type, serialize/parse/validate, storage adapter swapping
story/       Story client boundary: client.ts routes to the Tauri command or browser fixture
i18n/        Locale-aware UI text: locales registry (en, ja, zh-Hant), translate()/content
             helpers, preferences persistence, and a Svelte-readable `locale` store. Boot
             calls `initializeLocale()` from `main.ts` after the save storage is wired up.
ui-bridge/   Phaser ↔ Svelte communication
  events.ts   Custom DOM events: gliese:hud-state (Phaser → UI) and gliese:hud-command (UI → Phaser)
  store.ts    Svelte readable store wrapping onHudState; exposes request helpers
GameShell.svelte    Mounts the Phaser canvas via onMount, renders the HUD overlay
DialoguePanel.svelte NPC / system dialogue UI driven by `HudState.dialogue`
```

### Phaser ↔ Svelte Bridge

Phaser and Svelte communicate exclusively through custom `window` events (defined in `ui-bridge/events.ts`), keeping the two runtimes fully decoupled:

- `WorldScene` calls `emitHudState(...)` after every meaningful state change
- The Svelte HUD reads `$hudState` (a readable store backed by `onHudState`)
- The Svelte HUD dispatches commands via `emitHudCommand(...)`, which `WorldScene` receives via `onHudCommand`. The `HudCommand` union currently covers: `heal`, `save`, `resume-save`, `pause-game`, `resume-game`, `use-item`, `equip-item`, `unequip-slot`, `open-shop`, `close-shop`, `buy-shop-item`, `sell-inventory-item`, `accept-quest`, `dialogue-advance`, `dialogue-close`, `dialogue-choose`, `dismiss-battle-summary`. When adding a new command, update the union in `ui-bridge/events.ts` and handle it in both `WorldScene` and the HUD.

### Content / Data Model

- **Maps**: `meadow-entry` is the hub, with interior maps (`hero-house`, `guild-hall`, `item-shop`, `villager-house-1/2/3`, `shrine-of-aurora-interior`) and the dungeon chain `ruins-threshold` → `ruins-core`. A `WorldMapDefinition` may carry transitions, encounters, pickups, NPCs (with optional `shopId` and/or `dialogueId`), and landmark rectangles. The overworld beyond the hub is authored as **layered regions** under `content/maps/regions/` (coast, crossroads, mistfen, silverpine, wildwood, village) — these are declared as tile layers and compiled into `WorldMapDefinition`s by `content/maps/layered/compile-layered-region.ts`, so edit the region source, not a compiled grid.
- **Enemies**: `slime-scout` (normal), `ruins-warden` (boss with a phase-2 enrage at ≤50% HP)
- **Items / shops**: Items are defined in `content/items.ts` (consumables, equipment with `StatModifiers`, key items). Shops in `content/shops.ts` reference item IDs with per-shop stock and pricing. Wallet/coin state lives in `core/shop.ts`.
- **Dialogue**: NPC **prose lives in `story/`, not in TypeScript** (see Story Pipeline). `content/dialogue.ts` holds only the per-NPC action/intent definitions and their localized labels. Runtime traversal/state lives in `core/dialogue.ts` and is surfaced to the HUD as `HudState.dialogue` (modes: `conversation`, `choice`, `system`). The HUD drives it with the `dialogue-advance` / `dialogue-close` / `dialogue-choose` commands.
- **Quests**: Definitions in `content/quests.ts` (including `mainQuestId`); runtime state machine in `core/quests.ts`. `QuestState` is part of `SaveState`; HUD surfaces it as `HudState.quests` and accepts via `accept-quest`.
- **i18n**: Locales are `en` (default), `ja`, `zh-Hant`. `initializeLocale()` resolves preference order: persisted preference (key `gliese.preferences.v1` via `SaveStorage`) → first supported `navigator.languages` match → `defaultLocale`. Use `translate(...)` for UI strings and `content(...)` for content-derived text; new UI strings must be added to every locale file under `i18n/messages/`.
- **Sprites**: Single sprite sheet at `public/game/assets/starter-pack.png`; frame coordinates are declared in `content/assets.ts` and registered at runtime in `WorldScene.registerStarterPackFrames()`
- **Save**: JSON serialized via the active `SaveStorage` adapter under key `gliese.save.v8` (`SAVE_STORAGE_KEY` in `src/lib/game/save/storage.ts`). In Tauri the adapter persists to `gliese-save.json` in the app-data directory; in a plain browser it falls back to `localStorage`. The payload's `version` field tracks the schema and is currently `8`; bump both `SAVE_STORAGE_KEY` and `version` and update `isSaveState` whenever `SaveState` changes shape.

### Story Pipeline (Rust-owned)

Story prose is authored in `story/` and **compiled by Rust**, so the release frontend
never bundles it. Rust owns parsing, validation, and runtime lookup; TypeScript only
renders and executes intents.

```
story/manifest.yaml          Strict YAML: chapters → beats, plus requiredContent (maps,
                             npcs, quests, shops, enemies) that the checker cross-validates
story/beats/<chapter>/*.md   Markdown beat files — the actual dialogue prose
story/schema/directives.md   Beat directive reference
story/reports/               Generated integration report (story:check --write-report)
src-tauri/src/story/         Rust: manifest → beat → compiler → codegen → commands
src-tauri/src/story/generated.rs   @generated catalog — COMMITTED, never hand-edit
src/lib/game/story/client.ts       Frontend boundary; browser-fixture.ts is the dev stand-in
```

**The workflow that bites:** `generated.rs` is checked into git and CI runs
`story_check --mode=strict --check-generated`. After editing anything under `story/`, run
`bun run story:check` to regenerate it and commit the result — otherwise CI and
`bun run tauri build` both fail with "generated.rs is out of date".

**Runtime split** is driven by `VITE_STORY_RUNTIME` (set to `tauri` in `.env.tauri`, applied
by `vite build --mode tauri`):

- `tauri` → `client.ts` invokes the Rust `get_npc_dialogue` command; no prose in the bundle.
- unset (plain `bun run dev` / `bun run build`) → falls back to `story/browser-fixture.ts`,
  which **does** inline prose. That's fine for dev, but it means `bun run build` output is
  not shippable — `build:tauri` runs `tools/assert-no-frontend-story-prose.ts` against
  `dist/` to enforce this.

When writing or editing beats, use the `gliese-story-writer` skill (`.claude/skills/`).

### Repo-level docs

- `docs/plans/` — implementation plans. Read the relevant plan before working on a feature it covers:
  - `2026-04-27-phaser-jrpg-vertical-slice.md` — the base game
  - `2026-05-29-rust-story-pipeline.md` — the story pipeline described above
- `docs/superpowers/{plans,specs}/` — superpowers workflow artifacts.
- `docs/stories/high_level_plan.md` — narrative direction.

### Hooks

`.husky/pre-commit` runs `lint-staged` (prettier + eslint --fix on staged JS/TS/Svelte).

---

## Svelte MCP Tools

You have access to comprehensive Svelte 5 and SvelteKit documentation via the Svelte MCP server.

### 1. `list-sections`

Use this **first** to discover all available documentation sections. When asked about Svelte or SvelteKit topics, always call this at the start to find relevant sections.

### 2. `get-documentation`

After calling `list-sections`, analyze the `use_cases` field and fetch **all** relevant sections.

### 3. `svelte-autofixer`

Analyzes Svelte code for issues. **Must** be called whenever you write Svelte code before sending it to the user. Keep calling until no issues are returned.

### 4. `playground-link`

Generates a Svelte Playground link. Only call after user confirmation, and **never** when code was written to project files.
