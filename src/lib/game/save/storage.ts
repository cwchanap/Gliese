import { parseSaveState, serializeSaveState, type SaveState } from '$lib/game/save/save-state';

export const SAVE_STORAGE_KEY = 'gliese.save.v6';
const PREVIOUS_SAVE_STORAGE_KEY = 'gliese.save.v5';

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

export function getSaveStorage(): SaveStorage | undefined {
	return currentStorage;
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
	const resolved = resolveStorage(storage);
	const encoded =
		resolved?.getItem(SAVE_STORAGE_KEY) ?? resolved?.getItem(PREVIOUS_SAVE_STORAGE_KEY);

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
	const resolved = resolveStorage(storage);
	if (resolved) {
		resolved.removeItem(SAVE_STORAGE_KEY);
		resolved.removeItem(PREVIOUS_SAVE_STORAGE_KEY);
	}
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
