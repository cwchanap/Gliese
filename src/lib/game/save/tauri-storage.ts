import {
	BaseDirectory,
	exists,
	mkdir,
	readTextFile,
	writeTextFile,
	rename
} from '@tauri-apps/plugin-fs';

import { PREFERENCES_STORAGE_KEY } from '$lib/game/i18n/preferences';
import {
	SAVE_SLOTS_BACKUP_STORAGE_KEY,
	SAVE_SLOTS_STORAGE_KEY,
	markSaveStorageUnreadable,
	saveSlotBackupStorageKey,
	type SaveSlotIndex
} from '$lib/game/save/slots';
import type { SaveStorage } from '$lib/game/save/storage';

export const SAVE_FILE_DIR = 'com.gliese.app';
export const SAVE_FILE_NAME = 'gliese-save.json';
export const SAVE_FILE_TMP_NAME = 'gliese-save.json.tmp';
export const SAVE_BACKUP_FILE_NAME = 'gliese-save-backup.json';
export const SAVE_BACKUP_FILE_TMP_NAME = 'gliese-save-backup.json.tmp';
export const SAVE_SLOT_BACKUP_FILE_NAMES = [
	'gliese-save-backup-slot0.json',
	'gliese-save-backup-slot1.json',
	'gliese-save-backup-slot2.json'
] as const;
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
	/** The most recent value handed to the queue — the retry source for forensic backups. */
	lastValue: string | undefined;
	tmpName: string;
	/** Set by the last disk write; `flush` reports it so callers never claim success over a failed write. */
	lastWriteFailed: boolean;
};

type PersistedFileSpec = {
	fileName: string;
	tmpName: string;
	queue: WriteQueue;
};

function createPersistedFileSpec(fileName: string, tmpName: string): PersistedFileSpec {
	return { fileName, tmpName, queue: createWriteQueue(fileName, tmpName) };
}

// The authoritative key-to-file routing table: only keys listed here reach
// disk; every other key stays cache-only inside the adapter.
const persistedFiles = new Map<string, PersistedFileSpec>([
	[SAVE_SLOTS_STORAGE_KEY, createPersistedFileSpec(SAVE_FILE_NAME, SAVE_FILE_TMP_NAME)],
	[
		SAVE_SLOTS_BACKUP_STORAGE_KEY,
		createPersistedFileSpec(SAVE_BACKUP_FILE_NAME, SAVE_BACKUP_FILE_TMP_NAME)
	],
	...([0, 1, 2] as SaveSlotIndex[]).map((index) => {
		const fileName = SAVE_SLOT_BACKUP_FILE_NAMES[index];
		return [
			saveSlotBackupStorageKey(index),
			createPersistedFileSpec(fileName, `${fileName}.tmp`)
		] as [string, PersistedFileSpec];
	}),
	[
		PREFERENCES_STORAGE_KEY,
		createPersistedFileSpec(PREFERENCES_FILE_NAME, PREFERENCES_FILE_TMP_NAME)
	]
]);

// The save file's writes are gated on every forensic backup queue: the
// original payload's only durable copy lives in those files, so the save
// file must never be replaced while a backup is still pending or failed
// (review: failed backup permits save replacement).
const saveFileQueue = persistedFiles.get(SAVE_SLOTS_STORAGE_KEY)!.queue;
const forensicBackupQueues = [
	persistedFiles.get(SAVE_SLOTS_BACKUP_STORAGE_KEY)!.queue,
	...([0, 1, 2] as SaveSlotIndex[]).map(
		(index) => persistedFiles.get(saveSlotBackupStorageKey(index))!.queue
	)
];

function isTauriRuntime(): boolean {
	const win = (globalThis as { window?: { __TAURI_INTERNALS__?: unknown } }).window;
	return typeof win !== 'undefined' && typeof win.__TAURI_INTERNALS__ !== 'undefined';
}

/**
 * Resolves the active save-storage adapter at boot.
 * @returns Promise<SaveStorage> — in Tauri, an in-memory adapter hydrated
 *   from the on-disk save files that coalesces writes; in a plain browser,
 *   `localStorage`.
 */
export async function hydrateTauriStorage(): Promise<SaveStorage> {
	if (!isTauriRuntime()) {
		return globalThis.localStorage;
	}

	const cache = new Map<string, string>();
	let saveFileUnreadable = false;

	for (const [storageKey, spec] of persistedFiles) {
		const readOk = await readStorageFile(cache, storageKey, spec.fileName);
		// An existing save file that could not be read is not "missing" — flag
		// the adapter so writes stay blocked until the player confirms a
		// discard, instead of silently overwriting the unreadable file.
		if (!readOk && storageKey === SAVE_SLOTS_STORAGE_KEY) {
			saveFileUnreadable = true;
		}
	}

	const adapter: SaveStorage = {
		getItem(key) {
			return cache.get(key) ?? null;
		},
		setItem(key, value) {
			cache.set(key, value);
			const spec = persistedFiles.get(key);
			if (spec) {
				scheduleWrite(spec.queue, value);
			}
		},
		removeItem(key) {
			cache.delete(key);
			const spec = persistedFiles.get(key);
			if (spec) {
				scheduleWrite(spec.queue, '');
			}
		},
		// Durability check for callers that must know a write reached the disk.
		flush() {
			return flushSaveWrites();
		}
	};
	if (saveFileUnreadable) markSaveStorageUnreadable(adapter);
	return adapter;
}

/**
 * Hydrates one persisted file into the cache.
 * @returns true when the file is definitively absent or was read; false when
 *   it may exist on disk but could not be read (callers must treat the
 *   payload as unreadable, not missing).
 */
async function readStorageFile(
	cache: Map<string, string>,
	storageKey: string,
	fileName: string
): Promise<boolean> {
	try {
		if (await exists(`${SAVE_FILE_DIR}/${fileName}`, APP_DATA)) {
			const text = await readTextFile(`${SAVE_FILE_DIR}/${fileName}`, APP_DATA);
			cache.set(storageKey, text);
		}
		return true;
	} catch (error) {
		console.warn(
			`Failed to read existing ${fileName}; starting with an empty cache. The corrupt file is preserved.`,
			error
		);
		return false;
	}
}

function createWriteQueue(fileName: string, tmpName: string): WriteQueue {
	return {
		fileName,
		pendingWrite: Promise.resolve(),
		queuedValue: undefined,
		lastValue: undefined,
		tmpName,
		lastWriteFailed: false
	};
}

function scheduleWrite(queue: WriteQueue, value: string): void {
	queue.queuedValue = value;
	queue.lastValue = value;
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
	// Forensic gate: before the save file is replaced on disk, every backup
	// write must be durable. Wait for pending backups, retry failed ones once
	// more, and refuse the destructive write entirely if any backup still
	// fails — the original payload must never be destroyed unsecured.
	if (queue === saveFileQueue) {
		for (const backupQueue of forensicBackupQueues) {
			// `queuedValue` is consumed before the backup's await resolves, so
			// only the chain's completion proves the backup reached disk.
			if (backupQueue.lastValue !== undefined) {
				await backupQueue.pendingWrite;
			}
			if (backupQueue.lastWriteFailed && backupQueue.lastValue) {
				await performAtomicWrite(backupQueue, backupQueue.lastValue);
			}
			if (backupQueue.lastWriteFailed) {
				queue.lastWriteFailed = true;
				console.error(
					`Refusing to persist ${queue.fileName}: its forensic backup ${backupQueue.fileName} could not be secured; the original file is preserved.`
				);
				return;
			}
		}
	}
	try {
		await mkdir(SAVE_FILE_DIR, { baseDir: BaseDirectory.AppData, recursive: true });
		await writeTextFile(`${SAVE_FILE_DIR}/${queue.tmpName}`, value, APP_DATA);
		await rename(
			`${SAVE_FILE_DIR}/${queue.tmpName}`,
			`${SAVE_FILE_DIR}/${queue.fileName}`,
			APP_DATA_RENAME
		);
		queue.lastWriteFailed = false;
	} catch (error) {
		queue.lastWriteFailed = true;
		console.error(`Failed to persist ${queue.fileName}; previous on-disk value preserved.`, error);
	}
}

export async function flushPendingWrites(timeoutMs = 3000): Promise<void> {
	if (!(await flushSaveWrites(timeoutMs))) {
		console.error('Save storage writes did not complete cleanly before the wait ended.');
	}
}

/**
 * Await every queued disk write and report whether they all succeeded.
 * Returns false when any write failed or the drain timed out — callers must
 * not report a save as successful on `false` (review: critical).
 */
export async function flushSaveWrites(timeoutMs = 3000): Promise<boolean> {
	const drained = await Promise.race([
		Promise.all([...persistedFiles.values()].map((spec) => spec.queue.pendingWrite)).then(
			() => true
		),
		new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs))
	]);
	if (!drained) return false;
	return ![...persistedFiles.values()].some((spec) => spec.queue.lastWriteFailed);
}

/**
 * Reset module-level write state. For tests only.
 */
export function __resetTauriStorageForTests(): void {
	for (const spec of persistedFiles.values()) {
		resetWriteQueue(spec.queue);
	}
}

function resetWriteQueue(queue: WriteQueue): void {
	queue.pendingWrite = Promise.resolve();
	queue.queuedValue = undefined;
	queue.lastValue = undefined;
	queue.lastWriteFailed = false;
}
