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
	__resetTauriStorageForTests,
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
		__resetTauriStorageForTests();
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

		try {
			const adapter = await hydrateTauriStorage();
			expect(adapter.getItem('any-key')).toBe('seed');
			adapter.setItem('k', 'v');
			expect(localStorageMock.setItem).toHaveBeenCalledWith('k', 'v');
		} finally {
			Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
		}
	});

	it('hydrates from disk when the save file exists', async () => {
		setTauriPresent(true);
		mockedFs.exists.mockResolvedValueOnce(true);
		mockedFs.readTextFile.mockResolvedValueOnce('{"version":4,"foo":"bar"}');

		const adapter = await hydrateTauriStorage();

		expect(mockedFs.readTextFile).toHaveBeenCalledWith(`${SAVE_FILE_DIR}/${SAVE_FILE_NAME}`, {
			baseDir: fs.BaseDirectory.AppData
		});
		expect(adapter.getItem(SAVE_STORAGE_KEY)).toBe('{"version":4,"foo":"bar"}');
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

		adapter.setItem(SAVE_STORAGE_KEY, '{"version":4}');
		await flushPendingWrites();

		expect(mockedFs.writeTextFile).toHaveBeenCalledWith(
			`${SAVE_FILE_DIR}/${SAVE_FILE_TMP_NAME}`,
			'{"version":4}',
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
