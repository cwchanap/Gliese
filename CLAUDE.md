# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SvelteKit app deployed to Cloudflare Workers, with a Phaser 4 JRPG vertical slice accessible at `/game`.

- **Language**: TypeScript (Svelte 5 runes mode enforced project-wide via `svelte.config.js`)
- **Package Manager**: bun
- **Deployment**: Cloudflare Workers via `@sveltejs/adapter-cloudflare` + `wrangler`

## Commands

```sh
bun run dev          # start dev server (http://localhost:5173)
bun run build        # wrangler types check then vite build
bun run preview      # preview production build via wrangler on port 4173
bun run check        # svelte-check type checking
bun run lint         # prettier + eslint check
bun run format       # auto-format all files
bun run gen          # regenerate Cloudflare env types from wrangler.jsonc
```

### Tests

```sh
bun run test:unit              # vitest (all unit + browser-component tests)
bun run test:e2e               # playwright e2e (requires running dev server or uses one)
bun run test                   # test:unit --run then test:e2e

# Single test file
bun run test:unit -- src/lib/game/core/combat.test.ts
# Single e2e test by name
bun run test:e2e -- --grep "game route boots"
```

**Test split in `vite.config.ts`:**
- `*.svelte.{test,spec}.ts` → `client` project, runs in Chromium via vitest-browser-svelte
- `*.{test,spec}.ts` (non-svelte) → `server` project, runs in node
- `*.e2e.ts` → Playwright, needs dev server on port 4173 (`playwright.config.ts` spins one up automatically)

## Architecture

### Game Layer (`src/lib/game/`)

```
content/     Static game definitions (assets, enemies, maps, player)
core/        Pure TS game logic — no Phaser, no DOM (combat, boss, progression, input, types)
phaser/      Phaser integration
  scenes/
    BootScene.ts    Loads the sprite sheet asset, then hands off to WorldScene
    WorldScene.ts   Main game loop: movement, combat, transitions, save/load
  createGame.ts     Dynamic-imports Phaser, instantiates the Game object
save/        SaveState type, serialize/parse/validate, localStorage wrapper
ui-bridge/   Phaser ↔ SvelteKit communication
  events.ts   Custom DOM events: gliese:hud-state (Phaser → UI) and gliese:hud-command (UI → Phaser)
  store.ts    Svelte readable store wrapping onHudState; exposes requestSave/Heal/Resume helpers
GameShell.svelte   Mounts the Phaser canvas via onMount, renders the HUD overlay
```

### Phaser ↔ SvelteKit Bridge

Phaser and SvelteKit communicate exclusively through custom `window` events (defined in `ui-bridge/events.ts`), keeping the two runtimes fully decoupled:

- `WorldScene` calls `emitHudState(...)` after every meaningful state change
- The Svelte HUD reads `$hudState` (a readable store backed by `onHudState`)
- The Svelte HUD dispatches `emitHudCommand('heal' | 'resume' | 'save')`, which `WorldScene` receives via `onHudCommand`

### Content / Data Model

- **Maps**: `meadow-entry` → `ruins-threshold` → `ruins-core` (linear). Each `WorldMapDefinition` carries spawn point, tile dimensions, transitions, and an optional single encounter.
- **Enemies**: `slime-scout` (normal), `ruins-warden` (boss with a phase-2 enrage at ≤50% HP)
- **Sprites**: Single sprite sheet at `static/game/assets/starter-pack.png`; frame coordinates are declared in `content/assets.ts` and registered at runtime in `WorldScene.registerStarterPackFrames()`
- **Save**: JSON serialized to `localStorage` under key `gliese.save.v1`; version-gated via `isSaveState` validator

### Routing

| Path | Description |
|---|---|
| `/` | SvelteKit home page |
| `/game` | Game route — renders `GameShell.svelte` |
| `/demo/playwright` | Playwright smoke test fixture |

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
