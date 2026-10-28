# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tauri v2 desktop app shipping a Phaser 4 JRPG vertical slice. The
frontend is plain Svelte 5 (runes mode) + Vite, with Phaser dynamically
imported. Saves are written to a JSON file in the OS app-data directory
via Tauri's `fs` plugin.

The story follows Grik, a goblin hunter whose village is raided by humans (see
`docs/stories/prologue.md` and the high-level story plan on Notion). Sundrop is his
village, and the playable slice is the prologue main quest (stand-in art for now).

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

### Overworld grid maps

```sh
bun run map:preview                    # whole continent, 4px tiles → .artifacts/previews/overworld.png
bun run map:preview -- --chunk sundrop # one chunk at 16px (add --overlay all for story terrain)
bun run map:tileset                    # regenerates the placeholder grid tileset
```

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

The same `SaveStorage` adapter also backs **non-save** preferences: a `UiPreferences`
record (locale, textSpeed, motion, promptMode) persisted under key
`gliese.preferences.v1` (`PREFERENCES_STORAGE_KEY` in `src/lib/game/i18n/preferences.ts`).
In Tauri the adapter routes each key through the `persistedFiles` table to its own
file — `gliese.saves.v1` → `gliese-save.json`, `gliese.saves.v1.backup` →
`gliese-save-backup.json`, `gliese.preferences.v1` → `gliese-preferences.json`;
keys not in the table stay cache-only. In a plain browser each key lands in
`localStorage` under its own entry.

### Game Layer (`src/lib/game/`)

```
content/     Static game definitions (assets, dialogue, enemies, items, player, quests, shops)
  maps.ts    direct maps (interiors and ruins WorldMapDefinition literals)
  maps/      the meadow-entry composition
    regions/ hand-authored RegionFragment modules; village.ts alone wraps village-layered.ts
    layered/ the village tile-layer compiler and related authoring helpers
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
             helpers, UiPreferences persistence, and Svelte-readable `preferences`/`locale`
             stores. Boot calls `initializePreferences()` from `main.ts` after the save
             storage is wired up.
ui-bridge/   Phaser ↔ Svelte communication
  events.ts   Custom DOM events: gliese:hud-state (Phaser → UI) and gliese:hud-command (UI → Phaser)
  store.ts    Svelte readable store wrapping onHudState; exposes request helpers
GameShell.svelte    Mounts the Phaser canvas in a $effect once play starts (Continue /
                    New Run / direct boot), renders the HUD overlay
DialoguePanel.svelte NPC / system dialogue UI driven by `HudState.dialogue`
```

### Phaser ↔ Svelte Bridge

Phaser and Svelte communicate exclusively through custom `window` events (defined in `ui-bridge/events.ts`), keeping the two runtimes fully decoupled:

- `WorldScene` calls `emitHudState(...)` after every meaningful state change
- The Svelte HUD reads `$hudState` (a readable store backed by `onHudState`)
- The Svelte HUD dispatches commands via `emitHudCommand(...)`, which `WorldScene` receives via `onHudCommand`. The `HudCommand` union currently covers: `heal`, `save-slot`, `pause-game`, `resume-game`, `use-item`, `equip-item`, `unequip-slot`, `open-shop`, `close-shop`, `buy-shop-item`, `sell-inventory-item`, `dialogue-advance`, `dialogue-close`, `dialogue-choose`, `battle-cycle-target`, `battle-select-target`, `battle-flee`, `dismiss-battle-summary`. When adding a new command, update the union in `ui-bridge/events.ts` and handle it in both `WorldScene` and the HUD (`battle-cycle-target` / `battle-select-target` / `battle-flee` / `dismiss-battle-summary` are battle-scoped: `BattleScene` handles them and `WorldScene` ignores them).

### Content / Data Model

- **Maps**: `meadow-entry` is the hub, with interior maps (`hero-house`, `guild-hall`, `item-shop`, `villager-house-1/2/3`, `shrine-of-aurora-interior`) and the old tunnel `ruins-threshold` → `ruins-core` (the prologue's escape route). Interiors and ruins are direct `WorldMapDefinition` literals in `src/lib/game/content/maps.ts`. Most Meadow Entry destinations and connectors are hand-authored `RegionFragment` modules under `content/maps/regions/` and become active only when imported and included in `mergeRegions(...)` in `content/maps/meadow-entry.ts`. Sundrop Village is the one layered exception: `village-layered.ts` owns terrain, path, collision, neutral region-label, and tile-decor grids; `village.ts` composes those with pixel-positioned landmarks, transitions, pickups, ambient NPCs, and eventual background planes from shared coordinate constants. Do not force pixel-positioned objects through the layered compiler's tile-centre object contract.

## Sundrop Village Ownership

`village-layered.ts` owns Sundrop terrain, path, collision, neutral region-label,
and tile-decor grids. `village.ts` composes the resulting fragment with
pixel-positioned landmarks, transitions, pickups, ambient NPCs, and eventual
background planes from shared coordinate constants. Do not force pixel-positioned
objects through the layered compiler's tile-centre object contract.

## Structure Before Art

For a substantial spatial revision, define and review functional bounds, lots,
rooms, corridors, walls, doors, routes, transition approaches, and NPC approaches
before generating final art or placing decorative content. Prove the geometry with
a walkable graybox first.

- **Story gates**: map NPCs, encounters, pickups, discoveries, blockers, transitions, and grid-map tile overlays can carry `activeDuring` / `hiddenDuring` (quest ids, objective ids, or the shared `storyWindows` in `content/quests.ts`). `core/story-gates.ts` filters a map by the current story progress, so one Meadow Entry plays the proving day, the raid, and the escape. The prologue's story placements live in `content/maps/regions/prologue.ts`.
- **Enemies**: prologue beasts `forest-wolf`, `mist-toad`, `thornback-boar`, `tunnel-crawler`; humans `human-soldier`, `sun-crest-captain`; boss `boar-king` (phase-2 enrage at ≤50% HP). Each enemy has its own actor block in `animation-pack.png` and its own battle plate under `heroic-ui/enemies/<enemy-id>.png` (`content/assets.ts`).
- **Items / shops**: Items are defined in `content/items.ts` (consumables, equipment with `StatModifiers`, key items). Shops in `content/shops.ts` reference item IDs with per-shop stock and pricing. Wallet/coin state lives in `core/shop.ts`.
- **Dialogue**: NPC **prose and choices live in `story/`, not in TypeScript** (see Story Pipeline). Scripted scenes (`::: scene`) are played by quest effects and discoveries. Runtime traversal/state lives in `core/dialogue.ts` and is surfaced to the HUD as `HudState.dialogue` (modes: `conversation`, `choice`, `system`). The HUD drives it with the `dialogue-advance` / `dialogue-close` / `dialogue-choose` commands.
- **Quests**: The prologue is one chain of main quests (`mainQuestIds` in `content/quests.ts`); each quest is an ordered list of objectives (`talk-to-npc`, `defeat-enemy`, `collect-item`, `inspect`, `lose-battle`). Finishing the last objective completes the quest and starts the next one; there is no accept step. Objectives and quests can queue presentation effects (`play-scene`, `move-player`) that `WorldScene` plays in order. Runtime state machine in `core/quests.ts`; `QuestState` is part of `SaveState`, and the HUD surfaces it as `HudState.quests` (`main` plus `completed`).
- **i18n**: Locales are `en` (default), `ja`, `zh-Hant`. `initializePreferences()` resolves preference order: persisted preference (key `gliese.preferences.v1` via `SaveStorage`) → first supported `navigator.languages` match → `defaultLocale`. Use `translate(...)` for UI strings and `content(...)` for content-derived text; new UI strings must be added to every locale file under `i18n/messages/`.
- **Audio**: Sound effects and ambience loops are MP3s in `public/game/audio/`, generated with ElevenLabs (prompts in `docs/audio/sfx-sources.md`). Keys, the story-scene cues, and the per-map ambience rule (`ambienceFor`) live in `content/audio.ts`; `phaser/audio.ts` preloads them in `BootScene` and exposes `playSfx` / `setAmbience`, which no-op when a sound is not loaded. The `sound` preference (System → Audio) mutes the game-wide Phaser sound manager from `createGame`.
- **Sprites**: Single sprite sheet at `public/game/assets/starter-pack.png`; frame coordinates are declared in `content/assets.ts` and registered at runtime in `WorldScene.registerStarterPackFrames()`
- **Save**: Slots persist through the active `SaveStorage` adapter as one envelope under
  key `gliese.saves.v1` (`SAVE_SLOTS_STORAGE_KEY` in `src/lib/game/save/slots.ts`): a
  `SaveSlotsState` holding three `SaveSlotRecord` slots — slot 0 is the autosave, written
  at durable-mutation points; slots 1–2 are manual. In Tauri the adapter persists to
  `gliese-save.json` in the app-data directory; in a plain browser it falls back to
  `localStorage`. Three distinct load outcomes: (1) a missing envelope yields an empty slot
  state (after checking the legacy keys below); (2) a payload that is neither a v1 envelope
  nor a parseable legacy save is first copied under `gliese.saves.v1.backup`, and the envelope
  reads as empty only once that backup is secured — otherwise writes stay blocked until the
  player confirms a discard from New Run; (3) pre-slots legacy data (`gliese.save.v9`/
  `gliese.save.v8` keys, or a bare `SaveState` written to `gliese-save.json` by older desktop
  builds) migrates into the autosave slot. Manual saves additionally await the Tauri disk
  flush and report `status.saveFailed` when the file write fails.
  Each slot's `state` payload is a `SaveState` whose `version` field
  (currently `10`) tracks the schema; bump it and update `isSaveState` in
  `save/save-state.ts` whenever `SaveState` changes shape.

### Overworld grid maps

The continent is being rebuilt as one text-grid map, `overworld`, 384×384 tiles (plan: the Notion
page 「地圖重新設計企劃」). Until it replaces `meadow-entry` it is reachable only through the dev
link `?startMap=overworld` (e.g. `http://localhost:5173/?startMap=overworld`), which boots a
fresh save on Grik's door in Sundrop. A dev-link run never writes save slots, so it cannot
overwrite real progress. The grid code lives in `content/maps/grid/`;
`content/maps/overworld/world.ts` places the chunks from `overworld/chunks/`.

Sundrop, the Wildwood (`wildwood-north`, `wildwood-east`), Silverpine (`silverpine`), and the
Mistfen basin (the south-east corner of `mistfen`, ringed by reed thicket) are built in detail.
Every other chunk,
and the rest of `mistfen`, is an **outline** (coast, mountains, region borders, solid interiors)
that a later map PR replaces in place, keeping the same rectangle:

|      | W (cols 0–128) | C (cols 128–256)                             | E (cols 256–384) |
| ---- | -------------- | -------------------------------------------- | ---------------- |
| N    | `elven-wood`   | `demon-highlands`                            | `orc-highlands`  |
| midN | `mistfen`      | `silverpine`                                 | `orc-highlands`  |
| mid  | `mistfen`      | `wildwood-north`, `sundrop`, `wildwood-east` | `east-mountains` |
| S    | `west-coast`   | `southern-frontier`                          | `east-coast`     |
| farS | open sea       | `valcrest`                                   | open sea         |

Sundrop's east gate opens into the Wildwood hunting grounds, which climb north to the Whispering
Cave and the ridge and loop back to the north gate's corridor. That corridor climbs on into
Silverpine, three tiers split by cliff bands, up past the falls to the boar king's clearing. The
west gate crosses Lirra's bridge into the Mistfen basin, which loops through the reeds past the
pond. The other routes end at a sealed gate (`gate-south-road`, `gate-east-mountains` off the
hunting grounds, `gate-witchwood` at the north end of the Mistfen basin, and `gate-silver-shrine`
at the top of Silverpine). The region PR behind a gate replaces its outline chunk and removes the gate,
or opens it with a story overlay if the story keeps it shut for a while;
`overworld/world.test.ts` keeps the player inside the built regions and those corridors.

- **Chunks** (`GridChunkSource`): `terrain` is a text block with one glyph per 32px tile and
  every row the same width. A chunk is about 64×64 tiles and is placed at a tile offset in
  `world.ts`; chunks may not overlap, and tiles no chunk covers get the world's `fill`.
- **Anchors**: a lowercase letter declared in `anchors` (`{ d: 'sundrop-elder-door' }`) marks a
  named point. It must appear exactly once, and names are unique across the world. The
  compiler replaces it with the ground around it; `overworldAnchors[name]` gives its tile and
  pixel centre. Place spawns, transitions, NPCs, and story content on anchors, not on raw
  pixel coordinates. Leave one free tile between an anchor and any blocking tile (a building
  wall, a tree) to its south or east: the collision grid samples the half-tile cell below and
  right of a tile centre, so an anchor flush against such a wall sits in a blocked cell.
- **Buildings**: a non-terrain, non-lowercase glyph declared in `buildings`
  (`{ A: 'goblin-hut' }`; types in `grid/buildings.ts`). Each solid rectangle of that glyph is
  one building whose footprint blocks movement. Put its door anchor just outside it, with the
  free tile above.
- **Story overlays**: `overlays: [{ id, activeDuring / hiddenDuring, rows }]`, the same size as
  the terrain. `-` keeps the tile underneath and any legend glyph replaces it (fire during the
  raid, a gate that opens). `applyStoryGates` decides which overlays are live.
- **Walkability**: corridors and gaps must be at least 2 tiles wide. A 1-tile gap is closed,
  because the player keeps 12px of clearance.
- **Check your work**: run `bun run map:preview` for the continent, or `-- --chunk <id>` for one
  chunk, and look at the PNG (add `--overlay all` for story terrain). Chunks are outlined and
  named, anchors are magenta dots, and chunk views label every 16th tile `col,row`. The base
  map exits non-zero when an anchor is unreachable from spawn; `overworld/world.test.ts`
  checks the same, plus the raid state.

| Glyph | Terrain       | Blocks | Notes                              |
| ----- | ------------- | ------ | ---------------------------------- |
| `.`   | grass         | no     | base ground                        |
| `,`   | dirt path     | no     | autotile, joins `=` and `H`        |
| `:`   | sand          | no     | autotile                           |
| `=`   | bridge        | no     | autotile, joins `,`; lay it on `~` |
| `H`   | stairs        | no     | cuts through `#` cliffs            |
| `T`   | dense forest  | yes    | autotile, drawn above actors       |
| `Y`   | lone tree     | yes    | drawn above actors                 |
| `~`   | water         | yes    | autotile, joins `=`                |
| `#`   | cliff         | yes    | autotile, joins `H`                |
| `^`   | mountain      | yes    | autotile; the default world fill   |
| `P`   | palisade      | yes    | autotile, joins `!`                |
| `!`   | sealed gate   | yes    | open it with a story overlay       |
| `%`   | fenced garden | yes    | autotile                           |
| `R`   | rock          | yes    |                                    |
| `O`   | well          | yes    | autotile                           |
| `*`   | fire pit      | yes    |                                    |
| `I`   | totem         | yes    |                                    |
| `X`   | drying rack   | yes    |                                    |
| `&`   | fire          | yes    | for raid overlays                  |

The tileset image is `public/game/assets/overworld/tiles.png` (a generated placeholder until
art replaces it). `grid/tileset.ts` fixes every tile id: row 0 holds the single tiles, and each
autotile terrain owns one row of 16 tiles indexed by its N=1/E=2/S=4/W=8 edge mask. Both glyph
lists are append-only, because art is drawn against those positions. To add a glyph: add it to
`TERRAIN_LEGEND` in `grid/legend.ts`, append it to one list in `grid/tileset.ts`, give it a
colour in `tools/generate-grid-tileset.ts`, run `bun run map:tileset`, and add a row to the
table above (`grid/tileset.test.ts` checks the table).

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

- `tauri` → `client.ts` invokes the Rust `get_npc_dialogue` and `get_story_scene` commands; no prose in the bundle.
- unset (plain `bun run dev` / `bun run build`) → falls back to `story/browser-fixture.ts`,
  which **does** inline prose. That's fine for dev, but it means `bun run build` output is
  not shippable — `build:tauri` runs `tools/assert-no-frontend-story-prose.ts` against
  `dist/` to enforce this.

When writing or editing beats, use the `gliese-story-writer` skill (`.claude/skills/`).

### Project skills

- Use `gliese-world-expansion` for substantial multi-concern map, region, dungeon, interior, NPC/encounter, or approved world-art integration work. It routes by owning source and uses a brief only when the scope warrants one.
- Use `gliese-story-writer` for story prose and beat metadata.
- Use `2d-game-asset-workflow` for generic props, sprites, sheets, transparency, frame manifests, and Phaser asset wiring.

### Repo-level docs

- `docs/plans/` — implementation plans. Read the relevant plan before working on a feature it covers:
  - `2026-04-27-phaser-jrpg-vertical-slice.md` — the base game
  - `2026-05-29-rust-story-pipeline.md` — the story pipeline described above
- `docs/superpowers/{plans,specs}/` — superpowers workflow artifacts.
- High-level story plan (world, peoples, cast, story arc) lives on Notion, not in the repo, under
  the Gliese — Game Wiki (https://app.notion.com/p/403586265aa981339355e26a3593de2f). Plan page:
  https://app.notion.com/p/403586265aa9813c9adbdd7f93a4df56. Story planning is written in
  Traditional Chinese.
- `docs/stories/prologue.md` — scene-by-scene goblin prologue, how it reuses the current slice, engine gaps, and follow-up tasks.

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
