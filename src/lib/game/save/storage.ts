export type SaveStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

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
