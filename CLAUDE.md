# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri v2 desktop app shipping a Phaser 4 JRPG vertical slice. The
frontend is plain Svelte 5 (runes mode) + Vite, with Phaser dynamically
imported. Saves are written to a JSON file in the OS app-data directory
via Tauri's `fs` plugin.

- **Language**: TypeScript (Svelte 5 runes mode enforced project-wide via `svelte.config.js`)
- **Package Manager**: bun
- **Frontend**: Vite + Svelte 5; single mounted `App.svelte` (no router, no SvelteKit)
- **Desktop shell**: Tauri v2 (`src-tauri/` Rust crate)
- **Targets**: macOS, Windows
- **`AGENTS.md` is a symlink to this file** — both Claude and other agents read the same instructions; edit `CLAUDE.md` only.

## Commands

```sh
bun run dev          # Vite dev server (browser only, http://localhost:5173). Saves go to localStorage.
bun run tauri dev    # Tauri window + Vite dev server. Saves go to the on-disk file.
bun run build        # vite build → dist/
bun run preview      # vite preview on :4173
bun run tauri build  # full Tauri release: builds frontend + Cargo release + bundles installers
bun run check        # svelte-check
bun run lint         # prettier + eslint check
bun run format       # auto-format
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
src-tauri/             Rust shell: fs plugin, window config, packaging
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

### Game Layer (`src/lib/game/`)

```
content/     Static game definitions (assets, enemies, items, maps, player, shops)
core/        Pure TS game logic — no Phaser, no DOM
             (combat, boss, progression, input, types, inventory, equipment, shop, stats, loot)
phaser/      Phaser integration
  scenes/
    BootScene.ts    Loads the sprite sheet asset, then hands off to WorldScene
    WorldScene.ts   Main game loop: movement, combat, transitions, save/load, NPC + shop interaction
  createGame.ts     Dynamic-imports Phaser, instantiates the Game object
save/        SaveState type, serialize/parse/validate, localStorage wrapper
ui-bridge/   Phaser ↔ Svelte communication
  events.ts   Custom DOM events: gliese:hud-state (Phaser → UI) and gliese:hud-command (UI → Phaser)
  store.ts    Svelte readable store wrapping onHudState; exposes request helpers
GameShell.svelte   Mounts the Phaser canvas via onMount, renders the HUD overlay
```

### Phaser ↔ Svelte Bridge

Phaser and Svelte communicate exclusively through custom `window` events (defined in `ui-bridge/events.ts`), keeping the two runtimes fully decoupled:

- `WorldScene` calls `emitHudState(...)` after every meaningful state change
- The Svelte HUD reads `$hudState` (a readable store backed by `onHudState`)
- The Svelte HUD dispatches commands via `emitHudCommand(...)`, which `WorldScene` receives via `onHudCommand`. The `HudCommand` union currently covers: `heal`, `save`, `resume-save`, `pause-game`, `resume-game`, `use-item`, `equip-item`, `unequip-slot`, `open-shop`, `close-shop`, `buy-shop-item`, `sell-inventory-item`. When adding a new command, update the union in `ui-bridge/events.ts` and handle it in both `WorldScene` and the HUD.

### Content / Data Model

- **Maps**: `meadow-entry` is the hub, with interior maps (`hero-house`, `guild-hall`, `item-shop`, `villager-house-1/2/3`) and the dungeon chain `ruins-threshold` → `ruins-core`. A `WorldMapDefinition` may carry transitions, encounters, pickups, NPCs (with optional `shopId`), and landmark rectangles.
- **Enemies**: `slime-scout` (normal), `ruins-warden` (boss with a phase-2 enrage at ≤50% HP)
- **Items / shops**: Items are defined in `content/items.ts` (consumables, equipment with `StatModifiers`, key items). Shops in `content/shops.ts` reference item IDs with per-shop stock and pricing. Wallet/coin state lives in `core/shop.ts`.
- **Sprites**: Single sprite sheet at `public/game/assets/starter-pack.png`; frame coordinates are declared in `content/assets.ts` and registered at runtime in `WorldScene.registerStarterPackFrames()`
- **Save**: JSON serialized via the active `SaveStorage` adapter under key `gliese.save.v3` (`SAVE_STORAGE_KEY` in `src/lib/game/save/storage.ts`). In Tauri the adapter persists to `gliese-save.json` in the app-data directory; in a plain browser it falls back to `localStorage`. The payload's `version` field tracks the schema and is currently `3`; bump it and update `isSaveState` whenever `SaveState` changes shape.

### Repo-level docs

- `docs/plans/` — implementation plans (e.g. `2026-04-27-phaser-jrpg-vertical-slice.md`). Read the relevant plan before working on a feature it covers.
- `docs/superpowers/{plans,specs}/` — superpowers workflow artifacts.

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
