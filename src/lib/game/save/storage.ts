export type SaveStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'> & {
	/** Optional durability hook: await queued asynchronous writes (disk adapters)
	 * and report whether they all reached storage. Synchronous adapters omit it. */
	flush?: () => Promise<boolean>;
};

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

/**
 * Await any asynchronous persistence behind the active adapter. Returns true
 * for synchronous adapters (localStorage, test doubles) — their setItem
 * already completed or threw before returning.
 */
export async function flushSaveStorage(): Promise<boolean> {
	return (await getSaveStorage()?.flush?.()) ?? true;
}

export function hasStorageMethods(value: unknown): value is SaveStorage {
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
