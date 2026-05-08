# Tauri Migration Design

**Date:** 2026-05-07
**Status:** Approved (design)
**Goal:** Replace SvelteKit + Cloudflare Workers with Tauri v2 to ship the JRPG as a downloadable desktop app for macOS and Windows.

## Motivation

The Gliese JRPG vertical slice is currently delivered as a SvelteKit app deployed to Cloudflare Workers. There is no server-side logic — Workers just serves static SvelteKit output. The user wants to distribute the game as a desktop binary (installer, app icon, offline play) instead of a web URL, so the web hosting layer is no longer needed.

This migration:

- Replaces the SvelteKit + Cloudflare stack with Tauri v2 wrapping a plain Svelte + Vite frontend.
- Drops the web build entirely (no parallel browser deployment is preserved).
- Moves save state from `localStorage` to a real JSON file in the OS app-data directory, accessed via Tauri's `fs` plugin.
- Targets macOS and Windows. Linux is out of scope.
- Keeps the existing Vitest unit suite and Playwright e2e suite, both running against the Vite dev server (Tauri-WebDriver-based e2e is explicitly not adopted).

## Architecture

**Stack:**

- **Tauri v2** — Rust shell + system webview (WKWebView on macOS, WebView2 on Windows).
- **Vite + Svelte 5 (runes mode)** — frontend build and component framework. SvelteKit is removed.
- **Phaser 4** — unchanged, dynamically imported by `createGame.ts` as today.
- **Single window**, opens directly to `<GameShell />`. No router, no landing page.

**Repo layout after migration:**

```
src/
  main.ts              # Vite entry: hydrate save storage, then mount(App)
  App.svelte           # Renders <GameShell />
  app.css              # Global styles (lifted from src/routes/layout.css)
  lib/
    assets/favicon.svg # Unchanged
    game/              # Unchanged surface, except save module additions
      content/
      core/
      phaser/
      ui-bridge/
      GameShell.svelte
      save/
        save-state.ts        # Unchanged
        save-state.test.ts   # Unchanged
        storage.ts           # Modified: module-level setSaveStorage(...)
        storage.test.ts      # Updated to cover the setter
        tauri-storage.ts     # NEW: in-memory adapter, hydrated from disk at boot
src-tauri/
  Cargo.toml
  tauri.conf.json
  src/main.rs          # Default Tauri scaffold + fs plugin registration
  icons/               # macOS .icns + Windows .ico (Tauri default placeholders)
public/                # Replaces static/ — Phaser sprite sheet lives here
  game/assets/starter-pack.png
index.html             # Replaces app.html
vite.config.ts         # Trimmed: no SvelteKit plugin, no Cloudflare adapter
playwright.config.ts   # webServer points at Vite (vite preview / vite dev)
tests/                 # Existing Vitest + Playwright (Playwright targets :5173)
```

**Removed:** `svelte.config.js` (SvelteKit form), `wrangler.jsonc`, `worker-configuration.d.ts`, `.svelte-kit/`, `src/routes/`, `src/app.d.ts`, `src/app.html`, `static/robots.txt`, dev deps `@sveltejs/kit`, `@sveltejs/adapter-cloudflare`, `wrangler`.

**Added:** `@tauri-apps/cli` (devDep), `@tauri-apps/api` (dep), `@tauri-apps/plugin-fs` (dep), `src-tauri/` Rust crate with `tauri` and `tauri-plugin-fs` Cargo dependencies.

The Tauri shell is a thin wrapper. All game logic, all UI, all events stay in TS/Svelte. The Rust side does only what the webview cannot: file I/O for saves and binary packaging.

## Save state on disk

The current `SaveStorage` interface in `src/lib/game/save/storage.ts` is synchronous (`getItem`/`setItem`/`removeItem`) and is invoked synchronously from three call sites: `src/lib/game/ui-bridge/store.ts` (module-init), and `src/lib/game/phaser/scenes/WorldScene.ts` at boot (line 751), on resume-save (line 1492), and on save (line 1508). Tauri's `fs` API is async. Refactoring these call sites to async would touch `WorldScene` heavily and is rejected.

**Approach: in-memory cache, async-hydrated once at boot.**

1. **New module** `src/lib/game/save/tauri-storage.ts` exposes:
   - `hydrateTauriStorage(): Promise<SaveStorage>` — reads `gliese-save.json` from `app_data_dir` via `@tauri-apps/plugin-fs`. If the file doesn't exist, returns an empty cache. If JSON parse fails, returns an empty cache and logs a warning (the corrupt file is left in place for manual recovery — it is _not_ overwritten until the next explicit save).
   - The returned object implements the existing `SaveStorage` shape (sync `getItem`/`setItem`/`removeItem`) backed by an in-memory `Map<string, string>`.
   - On `setItem` / `removeItem`: update the map immediately, then enqueue an async write of the full JSON file. Writes are serialized internally (latest-wins, no torn writes); the queue collapses pending writes so only the most recent value is flushed.
   - Writes are atomic: write to `gliese-save.json.tmp`, then rename to `gliese-save.json`. If a write fails, the previous on-disk value is preserved.
   - When Tauri APIs are unavailable (`window.__TAURI_INTERNALS__` is undefined — i.e. running in a plain browser via `bun run dev` or Playwright), `hydrateTauriStorage()` returns an adapter that delegates straight to `globalThis.localStorage`. This keeps browser-based dev iteration and existing Vitest/Playwright tests working.

2. **`storage.ts` minimal change.** Replace the `globalThis.localStorage` default in each function signature with a module-level `currentStorage` variable, initialized to `globalThis.localStorage` for backward compatibility, and add `setSaveStorage(storage: SaveStorage): void`. Existing callers that pass an explicit `storage` argument keep working unchanged. Tests that rely on the localStorage default keep working.

3. **`main.ts` bootstrap:**

   ```ts
   import { mount } from 'svelte';
   import App from './App.svelte';
   import './app.css';
   import { hydrateTauriStorage } from '$lib/game/save/tauri-storage';
   import { setSaveStorage } from '$lib/game/save/storage';

   const storage = await hydrateTauriStorage();
   setSaveStorage(storage);
   mount(App, { target: document.getElementById('app')! });
   ```

   The order is load-bearing: `setSaveStorage` runs before `mount`, so when `ui-bridge/store.ts` evaluates its module-level `loadStoredSaveResult()` call during component import, it sees the hydrated storage.

**File location and shape:**

- macOS: `~/Library/Application Support/com.gliese.app/gliese-save.json`
- Windows: `%APPDATA%\com.gliese.app\gliese-save.json`
- The file's content is the same string the existing code stores under `localStorage` key `gliese.save.v3` — the JSON-encoded `SaveState`. Schema versioning continues to use the existing `version: 3` field inside the JSON; bumping the schema follows the same path as today.
- The on-disk filename does _not_ embed the schema version. The schema version lives inside the JSON.

**Flush on quit:** `main.ts` registers a `tauri://close-requested` listener that:

1. Prevents default close.
2. Awaits the in-flight write (max 3s).
3. Calls `appWindow.close()`.

If the 3s timeout elapses, the window closes anyway; the previous save on disk is intact thanks to the atomic rename.

**Permissions:** `tauri.conf.json` allowlists only `fs:read-text-file`, `fs:write-text-file`, `fs:exists`, and `fs:rename` scoped to `$APPDATA/com.gliese.app/*`. Nothing else.

## Build, dev, and packaging

**Dev workflow:**

```sh
bun run tauri dev      # spawns Vite on :5173 + opens Tauri window
bun run dev            # plain Vite (browser only) — fast UI iteration, localStorage saves
```

`tauri.conf.json`:

- `build.devUrl` = `http://localhost:5173`
- `build.beforeDevCommand` = `bun run dev`
- `build.beforeBuildCommand` = `bun run build`
- `build.frontendDist` = `dist/`

In dev, the Tauri webview hits Vite directly (HMR works). In a plain `bun run dev` browser session, `hydrateTauriStorage()` falls back to localStorage.

**Production build:**

```sh
bun run tauri build    # vite build → bundle → cargo build --release → installer
```

Output artifacts in `src-tauri/target/release/bundle/`:

- macOS: `.app` and `.dmg`
- Windows: `.msi` (WiX) and `.exe`

Code signing, notarization, and Authenticode are _not_ in scope. Builds are unsigned. macOS Gatekeeper will show a warning on first launch; this is documented for the user, not worked around.

**Updated `package.json` scripts:**

```
dev          → vite                                   (was: vite dev)
build        → vite build                             (was: wrangler types --check && vite build)
preview      → vite preview                           (was: wrangler dev ...)
check        → svelte-check --tsconfig ./tsconfig.json  (drops wrangler types & svelte-kit sync)
tauri        → tauri                                  (NEW)
test:unit    → vitest                                 (unchanged)
test:e2e     → playwright test                        (unchanged)
test         → npm run test:unit -- --run && npm run test:e2e   (unchanged)
prepare      → playwright install                     (drops svelte-kit sync)
lint         → prettier --check . && eslint .         (unchanged)
format       → prettier --write .                     (unchanged)
```

`gen` is removed (was `wrangler types`).

**`vite.config.ts`** is trimmed: drop the SvelteKit-specific plugin configuration in favor of a direct `@sveltejs/vite-plugin-svelte` setup (the package keeps working without SvelteKit). The Vitest workspace structure is preserved unchanged — the existing `client` (browser, Chromium) and `server` (node) projects continue to route tests by filename pattern as today. The `expect: { requireAssertions: true }` setting is preserved. `$lib` alias is defined explicitly via `resolve.alias` since SvelteKit no longer provides it.

**`playwright.config.ts`** `webServer` is updated from `bun run preview` (which previously hit wrangler) to `bun run dev` running Vite on :5173 (or `vite preview` on the same port post-build, for CI). The `/game` URL in tests becomes `/`.

**App identity:** `tauri.conf.json` sets:

- `identifier` = `com.gliese.app`
- `productName` = `Gliese`
- `version` = `0.0.1`
- Default window size 1280x720 (2x the Phaser canvas of 640x360); resizable
- Icons: placeholder default Tauri icons committed in `src-tauri/icons/`. Final art is a follow-up task.
- Windows `webviewInstallMode` = `downloadBootstrapper` so older Win10 systems can install WebView2.

## Routing, layout, deletions

**Frontend collapse.** `src/routes/` is removed entirely. Replaced with:

- `index.html` at repo root: `<div id="app"></div>`, `<title>Gliese</title>`, favicon `<link>`, plus the `<script type="module" src="/src/main.ts">` Vite expects.
- `src/main.ts`: async bootstrap (`hydrateTauriStorage` → `setSaveStorage` → `mount(App)`).
- `src/App.svelte`: single component, renders `<GameShell />`. No props.
- `src/app.css`: global styles lifted from `src/routes/layout.css`, imported once in `main.ts`.

**No router.** Tauri opens directly into the game. The current "Open game" launcher button at `/` is dead weight in a desktop app and is dropped.

**Things deleted in this migration:**

- `src/routes/` (entire directory, including `+page.svelte`, `+layout.svelte`, `layout.css`, `demo/`, `game/`, plus the `*.e2e.ts` files inside it)
- `src/app.html`, `src/app.d.ts`
- `svelte.config.js` (SvelteKit form; if `@sveltejs/vite-plugin-svelte` requires a config file, a minimal new one is added with only `compilerOptions.runes`)
- `wrangler.jsonc`, `worker-configuration.d.ts`, `.svelte-kit/`
- `static/` directory (contents move to `public/`)
- E2E tests for the Playwright demo route (`src/routes/demo/playwright/page.svelte.e2e.ts`)

**Things kept verbatim:**

- All of `src/lib/game/` _except_ the modifications to `save/storage.ts` and the new `save/tauri-storage.ts`
- `src/lib/game/GameShell.svelte`
- `src/lib/game/save/save-state.ts` and its tests
- `src/lib/assets/favicon.svg`
- All Phaser scene code, all `content/`, all `core/`, all `ui-bridge/`
- Existing Vitest unit tests in `src/lib/game/`

**Imports:** `$lib/...` aliases continue to resolve via `vite.config.ts` `resolve.alias` (`$lib` → `src/lib`). No source changes required for existing import statements.

**Tests:**

- Vitest unit tests in `src/lib/game/core/`, `src/lib/game/save/`, and `src/lib/game/phaser/` are unchanged.
- `*.svelte.test.ts` browser-component tests remain in the Chromium browser project.
- `src/routes/game/page.svelte.e2e.ts` moves to `tests/e2e/game.e2e.ts` and its target URL changes from `/game` to `/`.
- The Playwright demo fixture test is deleted along with the demo route.

**Documentation update:** `CLAUDE.md` (and the symlinked `AGENTS.md`) is updated as part of this migration — Commands, Architecture, and Routing sections are rewritten. This is in scope; it is not deferred. `docs/plans/2026-04-27-phaser-jrpg-vertical-slice.md` historical notes are left intact.

## Error handling

The error surface is small and explicit:

- **Boot — missing save file:** treat as fresh game. Existing "missing" path in `loadStoredSaveResult` is reused.
- **Boot — corrupted JSON:** log to console, return empty cache, surface a one-shot HUD warning via `emitHudState`. The corrupt file is _not_ overwritten until the user explicitly saves, preserving manual recovery.
- **Boot — fs permission denied or other thrown error:** fatal. Render a static error screen (`<div>Couldn't access save directory: <path></div>`) instead of mounting the game. The game does not boot in a degraded state.
- **Runtime — async write failure (disk full, permission lost mid-session):** logged, surfaced via the existing HUD save-state machinery. The save command effectively becomes a no-op + warning rather than silently succeeding. The in-memory cache stays consistent; gameplay continues.
- **Close — flush timeout:** 3s cap. If the final write hangs, the window closes anyway. Worst case is loss of the most recent save; the previous save on disk is intact.

## Testing strategy

- **Unit tests (Vitest, node):** Existing tests under `src/lib/game/core/`, `src/lib/game/save/`, etc. continue to run as today. New unit tests added for `tauri-storage.ts` covering: hydration when file is missing, hydration when file is valid, hydration when file is corrupted, write coalescing, atomic rename behavior (mocking the `fs` plugin), and fallback to localStorage when Tauri APIs are absent.
- **Browser-component tests (Vitest, Chromium):** unchanged.
- **E2E (Playwright, Chromium against Vite dev server):** unchanged in test logic. Config updates: `webServer` command and the home-URL change from `/game` to `/`. The game-route smoke test (`page.svelte.e2e.ts`) keeps verifying the Phaser canvas mounts and the HUD renders.
- **Manual smoke test (required, documented in the implementation plan):** run `bun run tauri dev` on macOS, verify the canvas mounts in WKWebView, verify save-on-quit and load-on-launch, verify the save file appears at the expected path. The Windows equivalent runs on a Windows machine when one is available; not a blocker for the macOS-first PR.

## Risks

- **Phaser 4 + system webview compatibility.** Phaser 4 is recent. WKWebView and WebView2 should both handle WebGL2, but a smoke test very early in implementation is required. Mitigation: implementation plan front-loads "render an empty Phaser scene in Tauri" as a verification step before any other work.
- **Bundle size regression.** Phaser is ~1MB gzipped. The dynamic import in `createGame.ts` already keeps it out of the initial chunk. A quick `du -sh dist/` after the first successful Vite build catches any surprise. No regression expected.
- **WebView2 on older Windows.** Modern Windows ships WebView2; older Win10 may need the bootstrapper. Addressed via `windows.webviewInstallMode = downloadBootstrapper`.
- **Unsigned macOS app.** First launch shows a Gatekeeper warning. Documented for users; not worked around.

## Out of scope

These are explicitly _not_ part of this migration. Each is a candidate follow-up:

- Code signing and notarization (macOS) and Authenticode (Windows).
- Tauri auto-updater plugin.
- Custom app icon art (placeholder Tauri defaults are used).
- CI builds for Windows from a non-Windows host. Initial Windows builds are local on a Windows machine or via a future GitHub Actions setup.
- Migrating any existing `localStorage` save into the new file (user explicitly opted out — option B, not C).
- Linux desktop target.
- Tauri-WebDriver-based e2e (the existing Playwright + Vite setup is kept instead).
