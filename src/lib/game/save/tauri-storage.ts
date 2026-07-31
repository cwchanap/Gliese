import {
	BaseDirectory,
	exists,
	mkdir,
	readTextFile,
	writeTextFile,
	rename
} from '@tauri-apps/plugin-fs';

import { LANGUAGE_PREFERENCE_STORAGE_KEY } from '$lib/game/i18n/preferences';
import { SAVE_STORAGE_KEY, type SaveStorage } from '$lib/game/save/storage';

export const SAVE_FILE_DIR = 'com.gliese.app';
export const SAVE_FILE_NAME = 'gliese-save.json';
export const SAVE_FILE_TMP_NAME = 'gliese-save.json.tmp';
export const PREFERENCES_FILE_NAME = 'gliese-preferences.json';
export const PREFERENCES_FILE_TMP_NAME = 'gliese-preferences.json.tmp';

const APP_DATA = { baseDir: BaseDirectory.AppData } as const;
const APP_DATA_RENAME = {
	oldPathBaseDir: BaseDirectory.AppData,
	newPathBaseDir: BaseDirectory.AppData
} as const;

type WriteQueue = {
	fileName: string;
	pendingWrite: Promise<void>;
	queuedValue: string | undefined;
	tmpName: string;
};

const saveWriteQueue = createWriteQueue(SAVE_FILE_NAME, SAVE_FILE_TMP_NAME);
const preferencesWriteQueue = createWriteQueue(PREFERENCES_FILE_NAME, PREFERENCES_FILE_TMP_NAME);

function isTauriRuntime(): boolean {
	const win = (globalThis as { window?: { __TAURI_INTERNALS__?: unknown } }).window;
	return typeof win !== 'undefined' && typeof win.__TAURI_INTERNALS__ !== 'undefined';
}

export async function hydrateTauriStorage(): Promise<SaveStorage> {
	if (!isTauriRuntime()) {
		return globalThis.localStorage;
	}

	const cache = new Map<string, string>();

	await readStorageFile(cache, SAVE_STORAGE_KEY, SAVE_FILE_NAME);
	await readStorageFile(cache, LANGUAGE_PREFERENCE_STORAGE_KEY, PREFERENCES_FILE_NAME);

	return {
		getItem(key) {
			return cache.get(key) ?? null;
		},
		setItem(key, value) {
			cache.set(key, value);
			if (key === SAVE_STORAGE_KEY) {
				scheduleWrite(saveWriteQueue, value);
			}
			if (key === LANGUAGE_PREFERENCE_STORAGE_KEY) {
				scheduleWrite(preferencesWriteQueue, value);
			}
		},
		removeItem(key) {
			cache.delete(key);
			if (key === SAVE_STORAGE_KEY) {
				scheduleWrite(saveWriteQueue, '');
			}
			if (key === LANGUAGE_PREFERENCE_STORAGE_KEY) {
				scheduleWrite(preferencesWriteQueue, '');
			}
		}
	};
}

async function readStorageFile(
	cache: Map<string, string>,
	storageKey: string,
	fileName: string
): Promise<void> {
	try {
		if (await exists(`${SAVE_FILE_DIR}/${fileName}`, APP_DATA)) {
			const text = await readTextFile(`${SAVE_FILE_DIR}/${fileName}`, APP_DATA);
			cache.set(storageKey, text);
		}
	} catch (error) {
		console.warn(
			`Failed to read existing ${fileName}; starting with an empty cache. The corrupt file is preserved.`,
			error
		);
	}
}

function createWriteQueue(fileName: string, tmpName: string): WriteQueue {
	return {
		fileName,
		pendingWrite: Promise.resolve(),
		queuedValue: undefined,
		tmpName
	};
}

function scheduleWrite(queue: WriteQueue, value: string): void {
	queue.queuedValue = value;
	queue.pendingWrite = queue.pendingWrite.then(async () => {
		// Drain coalesced writes: keep flushing while a newer queued value arrived during the prior await.
		while (queue.queuedValue !== undefined) {
			const next = queue.queuedValue;
			queue.queuedValue = undefined;
			await performAtomicWrite(queue, next);
		}
	});
}

async function performAtomicWrite(queue: WriteQueue, value: string): Promise<void> {
	try {
		await mkdir(SAVE_FILE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
		await writeTextFile(`${SAVE_FILE_DIR}/${queue.tmpName}`, value, APP_DATA);
		await rename(
			`${SAVE_FILE_DIR}/${queue.tmpName}`,
			`${SAVE_FILE_DIR}/${queue.fileName}`,
			APP_DATA_RENAME
		);
	} catch (error) {
		console.error(`Failed to persist ${queue.fileName}; previous on-disk value preserved.`, error);
	}
}

export async function flushPendingWrites(timeoutMs = 3000): Promise<void> {
	await Promise.race([
		Promise.all([saveWriteQueue.pendingWrite, preferencesWriteQueue.pendingWrite]),
		new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
	]);
}

/**
 * Reset module-level write state. For tests only.
 */
export function __resetTauriStorageForTests(): void {
	resetWriteQueue(saveWriteQueue);
	resetWriteQueue(preferencesWriteQueue);
}

function resetWriteQueue(queue: WriteQueue): void {
	queue.pendingWrite = Promise.resolve();
	queue.queuedValue = undefined;
}
