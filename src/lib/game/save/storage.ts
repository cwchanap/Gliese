import { parseSaveState, serializeSaveState, type SaveState } from '$lib/game/save/save-state';

export const SAVE_STORAGE_KEY = 'gliese.save.v1';

type SaveStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export function loadStoredSaveState(storage: SaveStorage | undefined = globalThis.localStorage): SaveState | null {
	const encoded = resolveStorage(storage)?.getItem(SAVE_STORAGE_KEY);
	return encoded ? parseSaveState(encoded) : null;
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

export function clearStoredSaveState(storage: SaveStorage | undefined = globalThis.localStorage): void {
	resolveStorage(storage)?.removeItem(SAVE_STORAGE_KEY);
}

function resolveStorage(storage: SaveStorage | undefined): SaveStorage | undefined {
	if (hasStorageMethods(storage)) {
		return storage;
	}

	if (!hasStorageMethods(globalThis.localStorage)) {
		Object.defineProperty(globalThis, 'localStorage', {
			value: createMemoryStorage(),
			configurable: true
		});
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

function createMemoryStorage(): SaveStorage {
	const store = new Map<string, string>();

	return {
		getItem: (key) => store.get(key) ?? null,
		removeItem: (key) => {
			store.delete(key);
		},
		setItem: (key, value) => {
			store.set(key, value);
		}
	};
}
