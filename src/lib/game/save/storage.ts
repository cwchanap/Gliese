import { parseSaveState, serializeSaveState, type SaveState } from '$lib/game/save/save-state';

export const SAVE_STORAGE_KEY = 'gliese.save.v1';

type SaveStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

export function loadStoredSaveState(storage: SaveStorage | undefined = globalThis.localStorage): SaveState | null {
	const encoded = storage?.getItem(SAVE_STORAGE_KEY);
	return encoded ? parseSaveState(encoded) : null;
}

export function storeSaveState(
	saveState: SaveState,
	storage: SaveStorage | undefined = globalThis.localStorage
): void {
	storage?.setItem(SAVE_STORAGE_KEY, serializeSaveState(saveState));
}

export function clearStoredSaveState(storage: SaveStorage | undefined = globalThis.localStorage): void {
	storage?.removeItem(SAVE_STORAGE_KEY);
}
