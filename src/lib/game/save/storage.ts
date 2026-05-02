import { parseSaveState, serializeSaveState, type SaveState } from '$lib/game/save/save-state';

export const SAVE_STORAGE_KEY = 'gliese.save.v2';

type SaveStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export type StoredSaveResult =
	| { status: 'missing'; saveState: null }
	| { status: 'invalid'; saveState: null }
	| { status: 'loaded'; saveState: SaveState };

export function loadStoredSaveState(
	storage: SaveStorage | undefined = globalThis.localStorage
): SaveState | null {
	const result = loadStoredSaveResult(storage);
	return result.status === 'loaded' ? result.saveState : null;
}

export function loadStoredSaveResult(
	storage: SaveStorage | undefined = globalThis.localStorage
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
	storage: SaveStorage | undefined = globalThis.localStorage
): void {
	resolveStorage(storage)?.setItem(SAVE_STORAGE_KEY, serializeSaveState(saveState));
}

export function saveGameState(
	saveState: SaveState,
	storage: SaveStorage | undefined = globalThis.localStorage
): void {
	storeSaveState(saveState, storage);
}

export function clearStoredSaveState(
	storage: SaveStorage | undefined = globalThis.localStorage
): void {
	resolveStorage(storage)?.removeItem(SAVE_STORAGE_KEY);
}

function resolveStorage(storage: SaveStorage | undefined): SaveStorage | undefined {
	if (hasStorageMethods(storage)) {
		return storage;
	}

	return hasStorageMethods(globalThis.localStorage) ? globalThis.localStorage : undefined;
}

function hasStorageMethods(value: unknown): value is SaveStorage {
	return (
		typeof value === 'object' &&
		value !== null &&
		'getItem' in value &&
		typeof value.getItem === 'function' &&
		'removeItem' in value &&
		typeof value.removeItem === 'function' &&
		'setItem' in value &&
		typeof value.setItem === 'function'
	);
}
