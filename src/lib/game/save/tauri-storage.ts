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
			await performAtomicWrite(next ?? '');
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
