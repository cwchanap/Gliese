# Tauri Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace SvelteKit + Cloudflare Workers with Tauri v2 wrapping plain Svelte + Vite, ship the JRPG as a desktop app for macOS and Windows, and move save state to a JSON file in the OS app-data directory.

**Architecture:** Tauri v2 thin Rust shell + system webview, hosting a Vite-built Svelte 5 (runes) frontend with Phaser 4. SvelteKit and Cloudflare are removed entirely; the only route (`/game`) collapses to a single `App.svelte` mounted at `index.html`. Save storage gets an in-memory cache hydrated once at boot from disk via the Tauri `fs` plugin, exposing the existing synchronous `SaveStorage` interface so `WorldScene` and `ui-bridge/store.ts` need no async refactor. When Tauri APIs aren't present (browser dev / Playwright), the adapter falls back to `localStorage`.

**Tech Stack:** Tauri v2, Rust (Cargo, `tauri`, `tauri-plugin-fs`), Vite, Svelte 5 (runes mode), `@sveltejs/vite-plugin-svelte` (without SvelteKit), Phaser 4, TypeScript, Vitest (unit + browser), Playwright (e2e), bun.

**Spec:** `docs/superpowers/specs/2026-05-07-tauri-migration-design.md`

---

## File Inventory

**New files:**

- `index.html` — Vite entry HTML
- `src/main.ts` — async bootstrap
- `src/App.svelte` — single component rendering `<GameShell />`
- `src/app.css` — global styles (replaces `src/routes/layout.css`)
- `src/lib/game/save/tauri-storage.ts` — Tauri-backed `SaveStorage` adapter
- `src/lib/game/save/tauri-storage.test.ts` — unit tests for the adapter
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/build.rs`
- `src-tauri/icons/*` — Tauri default placeholder icons
- `src-tauri/.gitignore`
- `tests/e2e/game.e2e.ts` — moved from `src/routes/game/page.svelte.e2e.ts`, URL updated

**Modified files:**

- `package.json` — scripts, deps
- `vite.config.ts` — drop SvelteKit plugin, add `$lib` alias
- `playwright.config.ts` — `testMatch` updated
- `svelte.config.js` — collapse to bare Svelte config (runes)
- `tsconfig.json` — drop SvelteKit reference
- `src/lib/game/save/storage.ts` — module-level `currentStorage` + `setSaveStorage()`
- `src/lib/game/save/storage.test.ts` — add coverage for the setter
- `CLAUDE.md` — Commands and Architecture sections rewritten
- `.gitignore` — add `src-tauri/target/`, `dist/`, drop `.svelte-kit/`

**Deleted files:**

- `src/routes/` (entire directory)
- `src/app.d.ts`, `src/app.html`
- `wrangler.jsonc`, `worker-configuration.d.ts`
- `static/` (contents moved to `public/`)
- `.svelte-kit/` (build artifact, never committed but listed for clarity)

---

## Task 1: Add Tauri scaffold (Rust shell, no frontend changes yet)

**Why first?** Get the Rust side compiling and the Tauri CLI working with the _current_ SvelteKit dev server. We can verify a Tauri window opens and renders the existing app before we touch any frontend code. Bisects risk: if a later task breaks something, we know the scaffold itself is fine.

**Files:**

- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/build.rs`
- Create: `src-tauri/src/main.rs`
- Create: `src-tauri/src/lib.rs`
- Create: `src-tauri/.gitignore`
- Create: `src-tauri/icons/` (Tauri defaults)
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1.1: Verify prerequisites**

Run:

```sh
rustc --version
cargo --version
```

Expected: Rust toolchain present. If missing, install via `rustup` (https://rustup.rs/) — required for Tauri.

```sh
cd /Users/chanwaichan/workspace/Gliese
bun --version
node --version
```

Expected: bun present.

- [ ] **Step 1.2: Add Tauri JS dependencies**

Run:

```sh
bun add -D @tauri-apps/cli@^2
bun add @tauri-apps/api@^2 @tauri-apps/plugin-fs@^2
```

Expected: `package.json` shows new dependencies; `bun.lock` updated. No code changes yet.

- [ ] **Step 1.3: Initialize Tauri scaffold via CLI**

Run:

```sh
bunx tauri init \
  --app-name "Gliese" \
  --window-title "Gliese" \
  --frontend-dist "../dist" \
  --dev-url "http://localhost:5173" \
  --before-dev-command "bun run dev" \
  --before-build-command "bun run build" \
  --ci
```

Expected: `src-tauri/` directory created with `Cargo.toml`, `tauri.conf.json`, `src/main.rs`, `src/lib.rs`, `build.rs`, `icons/`, `capabilities/`. Default placeholder icons are populated.

If the CLI runs interactively despite `--ci`, accept defaults at every prompt (Rust as backend language, no plugins yet).

- [ ] **Step 1.4: Verify default Tauri scaffold contents**

Run:

```sh
ls src-tauri
cat src-tauri/tauri.conf.json
```

Expected to see:

- `src-tauri/Cargo.toml` with a `[package]` and `[dependencies]` block referencing `tauri` v2.
- `src-tauri/tauri.conf.json` with `productName`, `identifier`, `build`, `app`, `bundle` keys.
- `src-tauri/src/main.rs` and `src-tauri/src/lib.rs` containing default `tauri::Builder::default().run(...)` code.

Do not modify the scaffold's identifier yet — it is updated in step 1.7.

- [ ] **Step 1.5: Add `tauri-plugin-fs` to Cargo and Tauri builder**

Edit `src-tauri/Cargo.toml`. Under `[dependencies]`, add:

```toml
tauri-plugin-fs = "2"
```

Edit `src-tauri/src/lib.rs`. Replace the existing `pub fn run()` body to register the plugin:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .setup(|_app| Ok(()))
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 1.6: Configure capabilities for save-file access**

Edit `src-tauri/capabilities/default.json`. Replace its contents with:

```json
{
	"$schema": "../gen/schemas/desktop-schema.json",
	"identifier": "default",
	"description": "Capabilities for the desktop window",
	"windows": ["main"],
	"permissions": [
		"core:default",
		{
			"identifier": "fs:scope",
			"allow": [{ "path": "$APPDATA/com.gliese.app/*" }]
		},
		"fs:allow-read-text-file",
		"fs:allow-write-text-file",
		"fs:allow-exists",
		"fs:allow-rename",
		"fs:allow-mkdir",
		"fs:allow-app-data-read-recursive",
		"fs:allow-app-data-write-recursive"
	]
}
```

The schema path may differ slightly between Tauri patch versions; if `cargo build` later complains, run `bun run tauri dev` once to regenerate `gen/schemas/` and then re-check.

- [ ] **Step 1.7: Set identifier, version, window size, and Windows webview install mode**

Edit `src-tauri/tauri.conf.json`. Set or update the following keys (leave unrelated keys at their defaults):

```json
{
	"$schema": "https://schema.tauri.app/config/2",
	"productName": "Gliese",
	"version": "0.0.1",
	"identifier": "com.gliese.app",
	"build": {
		"beforeDevCommand": "bun run dev",
		"beforeBuildCommand": "bun run build",
		"devUrl": "http://localhost:5173",
		"frontendDist": "../dist"
	},
	"app": {
		"windows": [
			{
				"title": "Gliese",
				"width": 1280,
				"height": 720,
				"resizable": true,
				"fullscreen": false
			}
		],
		"security": {
			"csp": null
		}
	},
	"bundle": {
		"active": true,
		"targets": ["app", "dmg", "msi", "nsis"],
		"icon": [
			"icons/32x32.png",
			"icons/128x128.png",
			"icons/128x128@2x.png",
			"icons/icon.icns",
			"icons/icon.ico"
		],
		"windows": {
			"webviewInstallMode": {
				"type": "downloadBootstrapper"
			}
		}
	}
}
```

- [ ] **Step 1.8: Add the `tauri` script to `package.json`**

Edit `package.json`. In the `scripts` object, add:

```json
"tauri": "tauri"
```

Place it after `"gen"`. Do not change other scripts in this task.

- [ ] **Step 1.9: Update `.gitignore`**

Edit `.gitignore`. Append:

```
src-tauri/target/
src-tauri/gen/
dist/
```

- [ ] **Step 1.10: Verify Cargo build compiles**

Run:

```sh
cd src-tauri
cargo check
cd ..
```

Expected: Cargo downloads dependencies and reports `Finished` with no errors. Warnings about unused imports are acceptable.

- [ ] **Step 1.11: Verify Tauri dev launches with the existing SvelteKit app**

Run:

```sh
bun run tauri dev
```

Expected: a Tauri window opens displaying the _current_ SvelteKit home page (the "Gliese — Open game" launcher). Click the "Open game" link; the Phaser canvas should render in the Tauri webview.

If the canvas does not render, this is the WKWebView/Phaser smoke test risk identified in the spec — stop and triage before continuing. Likely culprits: WebGL fallback, missing canvas styles, or asset path issues.

Quit the dev session with `Ctrl+C`.

- [ ] **Step 1.12: Commit**

```sh
git add src-tauri/ package.json bun.lock .gitignore
git commit -m "Add Tauri v2 scaffold with fs plugin

Wraps the current SvelteKit dev server in a Tauri window and registers
tauri-plugin-fs with capabilities scoped to \$APPDATA/com.gliese.app/*.
Frontend is unchanged in this task; the next tasks remove SvelteKit and
add the on-disk save storage adapter."
```

---

## Task 2: Refactor `storage.ts` to support a swappable storage adapter

**Why now?** Before introducing the Tauri-backed storage we need a setter that the bootstrap can call. Doing this against the current SvelteKit-based tests gives confidence the refactor is correct _before_ we tear out the framework.

**Files:**

- Modify: `src/lib/game/save/storage.ts`
- Modify: `src/lib/game/save/storage.test.ts`

- [ ] **Step 2.1: Write a new failing test for `setSaveStorage`**

Edit `src/lib/game/save/storage.test.ts`. Append the following inside the existing `describe('save storage', () => { ... })` block (just before the closing `});`):

```ts
it('uses the storage adapter set via setSaveStorage when no explicit storage is passed', async () => {
	const { setSaveStorage } = await import('$lib/game/save/storage');
	const storage = createStorage();
	setSaveStorage(storage);

	const save = createNewSaveState();
	saveGameState(save);

	expect(storage.getItem('gliese.save.v3')).toContain('"version":3');
	expect(loadStoredSaveResult()).toEqual({ status: 'loaded', saveState: save });

	setSaveStorage(globalThis.localStorage);
});
```

- [ ] **Step 2.2: Run the test and confirm it fails**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/storage.test.ts
```

Expected: the new test fails with `TypeError: setSaveStorage is not a function` (or `not exported`). The other tests in the file still pass.

- [ ] **Step 2.3: Refactor `storage.ts` to expose a module-level adapter**

Replace the contents of `src/lib/game/save/storage.ts` with:

```ts
import { parseSaveState, serializeSaveState, type SaveState } from '$lib/game/save/save-state';

export const SAVE_STORAGE_KEY = 'gliese.save.v3';

export type SaveStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type StoredSaveResult =
	| { status: 'missing'; saveState: null }
	| { status: 'invalid'; saveState: null }
	| { status: 'loaded'; saveState: SaveState };

let currentStorage: SaveStorage | undefined =
	typeof globalThis !== 'undefined' && hasStorageMethods(globalThis.localStorage)
		? globalThis.localStorage
		: undefined;

export function setSaveStorage(storage: SaveStorage | undefined): void {
	currentStorage = storage;
}

export function loadStoredSaveState(
	storage: SaveStorage | undefined = currentStorage
): SaveState | null {
	const result = loadStoredSaveResult(storage);
	return result.status === 'loaded' ? result.saveState : null;
}

export function loadStoredSaveResult(
	storage: SaveStorage | undefined = currentStorage
): StoredSaveResult {
	const encoded = resolveStorage(storage)?.getItem(SAVE_STORAGE_KEY);

	if (!encoded) {
		return { status: 'missing', saveState: null };
	}

	const saveState = parseSaveState(encoded);

	if (saveState) {
		return { status: 'loaded', saveState };
	}

	if (import.meta.env?.DEV) {
		console.warn(`Invalid save data found in ${SAVE_STORAGE_KEY}; starting a new run instead.`);
	}

	return { status: 'invalid', saveState: null };
}

export function storeSaveState(
	saveState: SaveState,
	storage: SaveStorage | undefined = currentStorage
): void {
	resolveStorage(storage)?.setItem(SAVE_STORAGE_KEY, serializeSaveState(saveState));
}

export function saveGameState(
	saveState: SaveState,
	storage: SaveStorage | undefined = currentStorage
): void {
	storeSaveState(saveState, storage);
}

export function clearStoredSaveState(storage: SaveStorage | undefined = currentStorage): void {
	resolveStorage(storage)?.removeItem(SAVE_STORAGE_KEY);
}

function resolveStorage(storage: SaveStorage | undefined): SaveStorage | undefined {
	if (hasStorageMethods(storage)) {
		return storage;
	}

	return hasStorageMethods(currentStorage) ? currentStorage : undefined;
}

function hasStorageMethods(value: unknown): value is SaveStorage {
	return (
		typeof value === 'object' &&
		value !== null &&
		'getItem' in value &&
		typeof (value as SaveStorage).getItem === 'function' &&
		'removeItem' in value &&
		typeof (value as SaveStorage).removeItem === 'function' &&
		'setItem' in value &&
		typeof (value as SaveStorage).setItem === 'function'
	);
}
```

Notes:

- The default fallback is now `currentStorage` (initially `globalThis.localStorage`) instead of reading `globalThis.localStorage` at every call. Behavior is identical for existing call sites that pass an explicit `storage` argument; behavior is also identical for call sites that pass nothing (they now go through `currentStorage`, which defaults to `localStorage`).
- The `SaveStorage` type is now exported (the new `tauri-storage.ts` module will need it).

- [ ] **Step 2.4: Run the full storage test file and confirm all tests pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/storage.test.ts
```

Expected: all 4 tests pass (3 existing + the new `setSaveStorage` test).

- [ ] **Step 2.5: Run the full unit suite to confirm no regressions**

Run:

```sh
bun run test:unit -- --run
```

Expected: all unit tests pass.

- [ ] **Step 2.6: Commit**

```sh
git add src/lib/game/save/storage.ts src/lib/game/save/storage.test.ts
git commit -m "Add setSaveStorage to swap the save storage adapter

Introduces a module-level currentStorage variable defaulting to
globalThis.localStorage, with a setSaveStorage(...) entry point so the
boot sequence can install a custom adapter (e.g. the upcoming Tauri
file-backed adapter) before any save call site runs. Existing callers
that pass an explicit storage argument or rely on the localStorage
default behave identically."
```

---

## Task 3: Implement `tauri-storage.ts` adapter (with full unit tests)

**Files:**

- Create: `src/lib/game/save/tauri-storage.ts`
- Create: `src/lib/game/save/tauri-storage.test.ts`

The adapter has three responsibilities:

1. **Hydrate once at boot** — async-read the JSON file from disk, return a sync `SaveStorage`.
2. **Coalesce writes** — `setItem`/`removeItem` update an in-memory `Map` immediately and enqueue a single async write (latest-wins).
3. **Detect environment** — when `window.__TAURI_INTERNALS__` is undefined, return a `localStorage`-backed adapter unchanged.

The atomic write is: write to `gliese-save.json.tmp` → `rename` to `gliese-save.json`. If the temp write or rename fails, the previous on-disk save is preserved.

- [ ] **Step 3.1: Write the failing tests**

Create `src/lib/game/save/tauri-storage.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	BaseDirectory: { AppData: 'AppData' },
	exists: vi.fn(),
	mkdir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	rename: vi.fn()
}));

import * as fs from '@tauri-apps/plugin-fs';
import {
	flushPendingWrites,
	hydrateTauriStorage,
	SAVE_FILE_DIR,
	SAVE_FILE_NAME,
	SAVE_FILE_TMP_NAME
} from '$lib/game/save/tauri-storage';
import { SAVE_STORAGE_KEY } from '$lib/game/save/storage';

const mockedFs = vi.mocked(fs);

function setTauriPresent(present: boolean) {
	if (present) {
		(globalThis as unknown as { window: { __TAURI_INTERNALS__: object } }).window = {
			__TAURI_INTERNALS__: {}
		};
	} else {
		delete (globalThis as unknown as { window?: object }).window;
	}
}

describe('tauri storage adapter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedFs.exists.mockResolvedValue(false);
		mockedFs.mkdir.mockResolvedValue(undefined);
		mockedFs.readTextFile.mockResolvedValue('');
		mockedFs.writeTextFile.mockResolvedValue(undefined);
		mockedFs.rename.mockResolvedValue(undefined);
	});

	afterEach(() => {
		setTauriPresent(false);
	});

	it('falls back to localStorage when Tauri is not present', async () => {
		setTauriPresent(false);
		const localStorageMock: Storage = {
			length: 0,
			clear: vi.fn(),
			getItem: vi.fn().mockReturnValue('seed'),
			key: vi.fn(),
			removeItem: vi.fn(),
			setItem: vi.fn()
		};
		const original = globalThis.localStorage;
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			value: localStorageMock
		});

		const adapter = await hydrateTauriStorage();
		expect(adapter.getItem('any-key')).toBe('seed');
		adapter.setItem('k', 'v');
		expect(localStorageMock.setItem).toHaveBeenCalledWith('k', 'v');

		Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
	});

	it('hydrates from disk when the save file exists', async () => {
		setTauriPresent(true);
		mockedFs.exists.mockResolvedValueOnce(true);
		mockedFs.readTextFile.mockResolvedValueOnce('{"version":3,"foo":"bar"}');

		const adapter = await hydrateTauriStorage();

		expect(mockedFs.readTextFile).toHaveBeenCalledWith(`${SAVE_FILE_DIR}/${SAVE_FILE_NAME}`, {
			baseDir: fs.BaseDirectory.AppData
		});
		expect(adapter.getItem(SAVE_STORAGE_KEY)).toBe('{"version":3,"foo":"bar"}');
	});

	it('returns an empty adapter when no save file exists', async () => {
		setTauriPresent(true);
		mockedFs.exists.mockResolvedValueOnce(false);

		const adapter = await hydrateTauriStorage();

		expect(adapter.getItem(SAVE_STORAGE_KEY)).toBeNull();
		expect(mockedFs.readTextFile).not.toHaveBeenCalled();
	});

	it('treats unreadable / corrupted file content as empty (does not overwrite eagerly)', async () => {
		setTauriPresent(true);
		mockedFs.exists.mockResolvedValueOnce(true);
		mockedFs.readTextFile.mockRejectedValueOnce(new Error('eof'));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const adapter = await hydrateTauriStorage();

		expect(adapter.getItem(SAVE_STORAGE_KEY)).toBeNull();
		expect(mockedFs.writeTextFile).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalled();
	});

	it('writes atomically: tmp then rename', async () => {
		setTauriPresent(true);
		const adapter = await hydrateTauriStorage();

		adapter.setItem(SAVE_STORAGE_KEY, '{"version":3}');
		await flushPendingWrites();

		expect(mockedFs.writeTextFile).toHaveBeenCalledWith(
			`${SAVE_FILE_DIR}/${SAVE_FILE_TMP_NAME}`,
			'{"version":3}',
			{ baseDir: fs.BaseDirectory.AppData }
		);
		expect(mockedFs.rename).toHaveBeenCalledWith(
			`${SAVE_FILE_DIR}/${SAVE_FILE_TMP_NAME}`,
			`${SAVE_FILE_DIR}/${SAVE_FILE_NAME}`,
			{ oldPathBaseDir: fs.BaseDirectory.AppData, newPathBaseDir: fs.BaseDirectory.AppData }
		);
	});

	it('coalesces consecutive writes to a single flushed value', async () => {
		setTauriPresent(true);
		const adapter = await hydrateTauriStorage();

		adapter.setItem(SAVE_STORAGE_KEY, 'v1');
		adapter.setItem(SAVE_STORAGE_KEY, 'v2');
		adapter.setItem(SAVE_STORAGE_KEY, 'v3');
		await flushPendingWrites();

		const calls = mockedFs.writeTextFile.mock.calls.filter(
			([path]) => path === `${SAVE_FILE_DIR}/${SAVE_FILE_TMP_NAME}`
		);
		expect(calls.length).toBeGreaterThanOrEqual(1);
		expect(calls.length).toBeLessThanOrEqual(2);
		expect(calls[calls.length - 1][1]).toBe('v3');
	});

	it('removeItem deletes the save file via writing an empty marker then rename, leaving rename as the final atomic step', async () => {
		setTauriPresent(true);
		mockedFs.exists.mockResolvedValueOnce(true);
		mockedFs.readTextFile.mockResolvedValueOnce('seed');
		const adapter = await hydrateTauriStorage();

		adapter.removeItem(SAVE_STORAGE_KEY);
		await flushPendingWrites();

		expect(adapter.getItem(SAVE_STORAGE_KEY)).toBeNull();
		// We expect a write of "" then a rename — a "best-effort delete" approach.
		const writes = mockedFs.writeTextFile.mock.calls;
		expect(writes[writes.length - 1][1]).toBe('');
	});

	it('creates the app data directory before writing if missing', async () => {
		setTauriPresent(true);
		mockedFs.exists.mockResolvedValueOnce(false); // initial existence check (no save file)

		const adapter = await hydrateTauriStorage();
		adapter.setItem(SAVE_STORAGE_KEY, 'value');
		await flushPendingWrites();

		expect(mockedFs.mkdir).toHaveBeenCalledWith(SAVE_FILE_DIR, {
			baseDir: fs.BaseDirectory.AppData,
			recursive: true
		});
	});
});
```

- [ ] **Step 3.2: Run the tests and confirm they fail**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/tauri-storage.test.ts
```

Expected: all 7 tests fail with module-not-found errors (`Cannot find module '$lib/game/save/tauri-storage'`).

- [ ] **Step 3.3: Implement the adapter**

Create `src/lib/game/save/tauri-storage.ts`:

```ts
import {
	BaseDirectory,
	exists,
	mkdir,
	readTextFile,
	writeTextFile,
	rename
} from '@tauri-apps/plugin-fs';

import { SAVE_STORAGE_KEY, type SaveStorage } from '$lib/game/save/storage';

export const SAVE_FILE_DIR = 'com.gliese.app';
export const SAVE_FILE_NAME = 'gliese-save.json';
export const SAVE_FILE_TMP_NAME = 'gliese-save.json.tmp';

const APP_DATA = { baseDir: BaseDirectory.AppData } as const;
const APP_DATA_RENAME = {
	oldPathBaseDir: BaseDirectory.AppData,
	newPathBaseDir: BaseDirectory.AppData
} as const;

let pendingWrite: Promise<void> = Promise.resolve();
let queuedValue: string | null | undefined;

function isTauriRuntime(): boolean {
	return (
		typeof globalThis !== 'undefined' &&
		typeof (globalThis as { window?: { __TAURI_INTERNALS__?: unknown } }).window !== 'undefined' &&
		typeof (globalThis as { window: { __TAURI_INTERNALS__?: unknown } }).window
			.__TAURI_INTERNALS__ !== 'undefined'
	);
}

export async function hydrateTauriStorage(): Promise<SaveStorage> {
	if (!isTauriRuntime()) {
		return globalThis.localStorage;
	}

	const cache = new Map<string, string>();

	try {
		if (await exists(`${SAVE_FILE_DIR}/${SAVE_FILE_NAME}`, APP_DATA)) {
			const text = await readTextFile(`${SAVE_FILE_DIR}/${SAVE_FILE_NAME}`, APP_DATA);
			cache.set(SAVE_STORAGE_KEY, text);
		}
	} catch (error) {
		console.warn(
			'Failed to read existing save file; starting with an empty cache. The corrupt file is preserved.',
			error
		);
	}

	return {
		getItem(key) {
			return cache.get(key) ?? null;
		},
		setItem(key, value) {
			cache.set(key, value);
			if (key === SAVE_STORAGE_KEY) {
				scheduleWrite(value);
			}
		},
		removeItem(key) {
			cache.delete(key);
			if (key === SAVE_STORAGE_KEY) {
				scheduleWrite('');
			}
		}
	};
}

function scheduleWrite(value: string): void {
	queuedValue = value;
	pendingWrite = pendingWrite.then(async () => {
		// Drain coalesced writes: keep flushing while a newer queued value arrived during the prior await.
		while (queuedValue !== undefined) {
			const next = queuedValue;
			queuedValue = undefined;
			await performAtomicWrite(next);
		}
	});
}

async function performAtomicWrite(value: string): Promise<void> {
	try {
		await mkdir(SAVE_FILE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
		await writeTextFile(`${SAVE_FILE_DIR}/${SAVE_FILE_TMP_NAME}`, value, APP_DATA);
		await rename(
			`${SAVE_FILE_DIR}/${SAVE_FILE_TMP_NAME}`,
			`${SAVE_FILE_DIR}/${SAVE_FILE_NAME}`,
			APP_DATA_RENAME
		);
	} catch (error) {
		console.error('Failed to persist save file; previous on-disk value preserved.', error);
	}
}

export async function flushPendingWrites(timeoutMs = 3000): Promise<void> {
	await Promise.race([
		pendingWrite,
		new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
	]);
}
```

- [ ] **Step 3.4: Run the tests and verify all pass**

Run:

```sh
bun run test:unit -- --run src/lib/game/save/tauri-storage.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 3.5: Run the whole unit suite**

Run:

```sh
bun run test:unit -- --run
```

Expected: all unit tests pass.

- [ ] **Step 3.6: Commit**

```sh
git add src/lib/game/save/tauri-storage.ts src/lib/game/save/tauri-storage.test.ts
git commit -m "Add tauri-storage adapter for on-disk save state

Implements hydrateTauriStorage(): loads gliese-save.json from
\$APPDATA/com.gliese.app on boot, exposes a synchronous SaveStorage
backed by an in-memory cache, and writes back atomically (tmp + rename)
on every setItem. Writes are coalesced — only the latest queued value
is flushed. When Tauri APIs are absent (browser dev / Playwright),
falls back to localStorage so existing tests keep working unchanged."
```

---

## Task 4: Replace SvelteKit shell with plain Svelte + Vite frontend

**This is the largest task.** It removes SvelteKit and Cloudflare entirely. Verification relies on the existing test suite continuing to pass against the new setup.

**Files:**

- Create: `index.html`
- Create: `src/main.ts`
- Create: `src/App.svelte`
- Create: `src/app.css`
- Create: `tests/e2e/game.e2e.ts`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `playwright.config.ts`
- Modify: `svelte.config.js`
- Modify: `tsconfig.json`
- Modify: `.gitignore`
- Move: `static/game/` → `public/game/`
- Delete: `src/routes/`, `src/app.html`, `src/app.d.ts`, `static/`, `wrangler.jsonc`, `worker-configuration.d.ts`

- [ ] **Step 4.1: Move static assets to `public/`**

Run:

```sh
mkdir -p public
git mv static/game public/game
rm -f static/robots.txt
rmdir static
```

Expected: `public/game/assets/starter-pack.png` exists; `static/` is gone. Phaser asset URLs (e.g. `/game/assets/starter-pack.png`) are unchanged because Vite serves `public/` at root, identical to SvelteKit's `static/`.

- [ ] **Step 4.2: Create `index.html`**

Create `index.html` at the repo root:

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="text-scale" content="scale" />
		<title>Gliese</title>
	</head>
	<body>
		<div id="app"></div>
		<script type="module" src="/src/main.ts"></script>
	</body>
</html>
```

- [ ] **Step 4.3: Create `src/app.css`**

Create `src/app.css`:

```css
@import 'tailwindcss';
```

This is the only content of the existing `src/routes/layout.css`.

- [ ] **Step 4.4: Create `src/App.svelte`**

Create `src/App.svelte`:

```svelte
<script lang="ts">
	import GameShell from '$lib/game/GameShell.svelte';
	import favicon from '$lib/assets/favicon.svg';
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<GameShell />
```

- [ ] **Step 4.5: Create `src/main.ts`**

Create `src/main.ts`:

```ts
import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

import { hydrateTauriStorage, flushPendingWrites } from '$lib/game/save/tauri-storage';
import { setSaveStorage } from '$lib/game/save/storage';

async function bootstrap() {
	const storage = await hydrateTauriStorage();
	setSaveStorage(storage);

	if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const win = getCurrentWindow();
		await win.onCloseRequested(async (event) => {
			event.preventDefault();
			await flushPendingWrites();
			await win.destroy();
		});
	}

	mount(App, { target: document.getElementById('app')! });
}

bootstrap().catch((error) => {
	document.body.innerHTML = `<pre style="padding:2rem;font-family:monospace;color:#b00;">Couldn't start Gliese:\n\n${(error as Error).message}</pre>`;
	console.error(error);
});
```

Notes:

- `mount` from Svelte 5 (runes) is the standard mount function (not the old `new App({...})`).
- Tauri's `onCloseRequested` is registered only when running inside Tauri. In browser dev / Playwright, this code path is skipped.

- [ ] **Step 4.6: Replace `vite.config.ts`**

Replace the entire contents of `vite.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
import path from 'node:path';

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	resolve: {
		alias: {
			$lib: path.resolve(__dirname, 'src/lib')
		}
	},
	server: {
		port: 5173,
		strictPort: true
	},
	preview: {
		port: 4173,
		strictPort: true
	},
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
```

- [ ] **Step 4.7: Replace `svelte.config.js`**

Replace the entire contents of `svelte.config.js` with:

```js
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	}
};

export default config;
```

- [ ] **Step 4.8: Replace `tsconfig.json`**

Replace the entire contents of `tsconfig.json` with:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ESNext",
		"moduleResolution": "bundler",
		"lib": ["ES2022", "DOM", "DOM.Iterable"],
		"strict": true,
		"esModuleInterop": true,
		"forceConsistentCasingInFileNames": true,
		"resolveJsonModule": true,
		"skipLibCheck": true,
		"sourceMap": true,
		"allowJs": true,
		"checkJs": false,
		"verbatimModuleSyntax": true,
		"isolatedModules": true,
		"paths": {
			"$lib": ["./src/lib"],
			"$lib/*": ["./src/lib/*"]
		},
		"types": ["vite/client", "node", "@tauri-apps/api"]
	},
	"include": ["src/**/*", "tests/**/*", "vite.config.ts", "playwright.config.ts"]
}
```

- [ ] **Step 4.9: Move and update the e2e test file**

Run:

```sh
mkdir -p tests/e2e
git mv src/routes/game/page.svelte.e2e.ts tests/e2e/game.e2e.ts
```

Edit `tests/e2e/game.e2e.ts`. Replace every `await page.goto('/game');` with `await page.goto('/');`. There are five occurrences (one per test). After editing, the file's first test should read:

```ts
test('game route boots', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
});
```

- [ ] **Step 4.10: Update `playwright.config.ts`**

Replace `playwright.config.ts` with:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
	workers: 1,
	use: {
		baseURL: 'http://127.0.0.1:4173'
	},
	webServer: {
		command: 'bun run preview -- --host 127.0.0.1 --port 4173',
		port: 4173,
		reuseExistingServer: true
	},
	testDir: 'tests/e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
```

`bun run preview` becomes `vite preview` (set in step 4.12), which serves the production `dist/` build. Vite dev would also work but `preview` matches the existing port (4173) without a `--port` flag conflict, and exercises the actual built output.

- [ ] **Step 4.11: Delete legacy SvelteKit / Cloudflare files**

Run:

```sh
rm -rf src/routes
rm -f src/app.d.ts src/app.html
rm -f wrangler.jsonc worker-configuration.d.ts
rm -rf .svelte-kit
```

- [ ] **Step 4.12: Update `package.json` scripts and dependencies**

Edit `package.json`. Replace the `scripts` block with:

```json
"scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "prepare": "playwright install || echo ''",
    "check": "svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-check --tsconfig ./tsconfig.json --watch",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write .",
    "test:unit": "vitest",
    "test": "npm run test:unit -- --run && npm run test:e2e",
    "test:e2e": "playwright test",
    "tauri": "tauri"
}
```

Then remove these from `devDependencies`:

- `@sveltejs/adapter-cloudflare`
- `@sveltejs/kit`
- `wrangler`

Run:

```sh
bun remove @sveltejs/adapter-cloudflare @sveltejs/kit wrangler
```

(`@sveltejs/vite-plugin-svelte` stays — it works without SvelteKit.)

- [ ] **Step 4.13: Update `.gitignore`**

Edit `.gitignore`. Remove the line `.svelte-kit/` if present (it's no longer relevant; the directory is deleted).

- [ ] **Step 4.14: Verify dev server boots cleanly (no Tauri)**

Run:

```sh
bun run dev
```

Expected: Vite reports listening on `http://localhost:5173/`. Open the URL in a browser. The Phaser canvas should mount immediately (no launcher page) and the HUD's "Menu" button should be visible. Saves go to `localStorage` (Tauri APIs absent in the browser).

Quit with `Ctrl+C`.

- [ ] **Step 4.15: Run unit tests**

Run:

```sh
bun run test:unit -- --run
```

Expected: all unit tests pass, including the new `tauri-storage.test.ts` and refactored `storage.test.ts`. The Vitest browser project (Chromium) and node project both run.

- [ ] **Step 4.16: Run a production build and Playwright e2e against it**

Run:

```sh
bun run build
bun run test:e2e
```

Expected: `vite build` produces `dist/`. Playwright spins up `vite preview` on :4173 and runs all 6 e2e tests against it. All pass.

- [ ] **Step 4.17: Run `svelte-check`**

Run:

```sh
bun run check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4.18: Run lint**

Run:

```sh
bun run lint
```

Expected: 0 errors. If formatting drifted, run `bun run format` and re-check.

- [ ] **Step 4.19: Commit**

```sh
git add -A
git commit -m "Replace SvelteKit shell with plain Svelte + Vite

Drops SvelteKit, the Cloudflare adapter, and Workers config in favor of
a single Vite-built Svelte 5 SPA. The only route (/game) collapses into
src/App.svelte mounted from src/main.ts. main.ts performs the async
hydration of the Tauri save storage adapter (falling back to
localStorage when Tauri APIs are absent) before mounting the app, and
registers a close-requested handler that flushes pending saves before
the window closes.

Removes: src/routes, src/app.html, src/app.d.ts, wrangler.jsonc,
worker-configuration.d.ts. Moves static/game to public/game.
Relocates the e2e suite to tests/e2e/, retargets it from /game to /."
```

---

## Task 5: Verify the full Tauri pipeline end-to-end

This is a manual smoke test on macOS — the platform the dev machine runs. Windows verification is a follow-up when a Windows host is available.

- [ ] **Step 5.1: Launch in Tauri dev mode**

Run:

```sh
bun run tauri dev
```

Expected: Vite starts on :5173, Cargo compiles `src-tauri`, a Tauri window opens at 1280x720 showing the Phaser canvas. The HUD's "Menu" button is visible. No errors in either the Vite terminal or the Tauri webview console (open with right-click → Inspect Element if needed).

- [ ] **Step 5.2: Verify save round-trip**

In the running app:

1. Click "Menu" → "Save" (or whichever action triggers a save in the current HUD).
2. Quit the Tauri app (Cmd+Q).
3. Verify the save file exists:
   ```sh
   ls -la "$HOME/Library/Application Support/com.gliese.app/"
   cat "$HOME/Library/Application Support/com.gliese.app/gliese-save.json" | head -c 200
   ```
   Expected: `gliese-save.json` exists, content begins with `{"version":3,...`. No `gliese-save.json.tmp` left over.
4. Relaunch via `bun run tauri dev`.
5. The HUD should show "Resume Save" enabled (proving `loadStoredSaveResult()` saw the file at boot).
6. Click "Resume Save". The previously saved state restores.

- [ ] **Step 5.3: Verify error handling — corrupted file**

With the dev session quit:

```sh
echo "{not valid json" > "$HOME/Library/Application Support/com.gliese.app/gliese-save.json"
```

Run `bun run tauri dev` again. Expected:

- The app boots as a fresh game (no resume option, or resume disabled).
- The webview console shows a `console.warn` from `loadStoredSaveResult` about invalid save data (or from `tauri-storage.ts` if the file unreadable for I/O reasons, depending on which path triggered).
- The corrupt file on disk is **unchanged** (verify with `cat`) — it should NOT have been overwritten until an explicit save happens.

Save once in the app, quit, and verify the corrupt file is now replaced with a valid save.

- [ ] **Step 5.4: Verify production bundle builds**

Run:

```sh
bun run tauri build
```

Expected: Cargo builds release, Tauri produces `.app` and `.dmg` artifacts under `src-tauri/target/release/bundle/`. List them:

```sh
ls src-tauri/target/release/bundle/macos
ls src-tauri/target/release/bundle/dmg
```

Open the `.app` (Right-click → Open to bypass Gatekeeper warning on first launch). The packaged app runs and produces a save file in the same `~/Library/Application Support/com.gliese.app/` location.

- [ ] **Step 5.5: Manual checklist outcome**

Update or remove the corrupt-file test artifact:

```sh
rm -f "$HOME/Library/Application Support/com.gliese.app/gliese-save.json.tmp"
```

Document the build output sizes (for future bundle-size regression checks):

```sh
du -sh dist
du -sh src-tauri/target/release/bundle/macos/Gliese.app
```

Record the numbers in the PR description. No code commit for this task — it's a verification gate.

---

## Task 6: Update CLAUDE.md / AGENTS.md

`CLAUDE.md` is load-bearing for future sessions; the Architecture section now describes a stack that no longer exists.

**Files:**

- Modify: `CLAUDE.md` (and via symlink, `AGENTS.md`)

- [ ] **Step 6.1: Rewrite the Project Overview section**

Edit `CLAUDE.md`. Replace the "Project Overview" section (everything between `## Project Overview` and `## Commands`) with:

```markdown
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
```

- [ ] **Step 6.2: Rewrite the Commands section**

Replace the "## Commands" section with:

````markdown
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
````

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

````

- [ ] **Step 6.3: Rewrite the Architecture section**

Replace the "## Architecture" section's first two paragraphs (everything before the "### Game Layer" subsection) with:

```markdown
## Architecture

### Top-level layout

````

index.html Vite entry HTML, hosts <div id="app">
src/
main.ts Async bootstrap: hydrate save storage → mount(App)
App.svelte Renders <GameShell />
app.css Global styles (Tailwind import)
lib/ Game code — see below
src-tauri/ Rust shell: fs plugin, window config, packaging
public/ Static assets served at root (sprite sheets, etc.)
tests/e2e/ Playwright e2e suite

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
```

The "### Game Layer" subsection and below stay as-is. The "### Routing" section should be deleted entirely (there is no router anymore — `App.svelte` is the sole entry).

- [ ] **Step 6.4: Verify CLAUDE.md is internally consistent**

Read through the updated `CLAUDE.md` end-to-end. Check that:

- No mentions of SvelteKit remain (except possibly in `docs/plans/` historical notes — ignore).
- No mentions of Cloudflare or Workers remain.
- No references to the deleted `wrangler` script (`bun run gen`).
- No references to `/game` route or `static/` directory.

If any stragglers exist, fix them.

- [ ] **Step 6.5: Commit**

```sh
git add CLAUDE.md
git commit -m "Update CLAUDE.md for Tauri stack

Rewrites Project Overview, Commands, and Architecture to reflect the
Tauri v2 + plain Svelte + Vite stack that replaces SvelteKit and
Cloudflare. Documents the new save-storage hydration flow and the
test split against vite preview."
```

---

## Self-Review Notes

Spec coverage check:

- ✅ Architecture (spec §"Architecture") → Tasks 1, 4
- ✅ Save state on disk (spec §"Save state on disk") → Tasks 2, 3, 4 (main.ts wiring), 5 (verification)
- ✅ Build, dev, packaging (spec §"Build, dev, and packaging") → Task 1 (tauri.conf), Task 4 (package.json scripts), Task 5 (release build)
- ✅ Routing/layout/deletions (spec §"Routing, layout, deletions") → Task 4
- ✅ Error handling (spec §"Error handling") → Task 3 (boot error paths in tauri-storage), Task 4 (main.ts catch block + close-requested)
- ✅ Testing strategy (spec §"Testing strategy") → Tasks 2, 3 (new unit tests), Task 4 (e2e relocation), Task 5 (manual smoke)
- ✅ Risks (spec §"Risks") → Task 1.11 (Phaser-in-webview smoke), Task 5.4 (bundle size record)
- ✅ Out-of-scope items not implemented (signing, auto-update, custom icons, Linux, Windows-from-mac CI, Tauri-WebDriver)

Type/identifier consistency check:

- `SaveStorage`, `setSaveStorage`, `hydrateTauriStorage`, `flushPendingWrites`, `SAVE_STORAGE_KEY`, `SAVE_FILE_DIR`, `SAVE_FILE_NAME`, `SAVE_FILE_TMP_NAME` — all referenced consistently across Tasks 2, 3, 4.
- `com.gliese.app` identifier used consistently (tauri.conf.json, capabilities, fs paths, save dir).
- File paths quoted explicitly throughout.

No placeholders, no TBDs, no "similar to" references.
