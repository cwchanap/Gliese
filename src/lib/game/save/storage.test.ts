import { describe, expect, it, vi } from 'vitest';

import { createNewSaveState } from '$lib/game/save/save-state';
import {
	loadStoredSaveResult,
	saveGameState,
	SAVE_STORAGE_KEY,
	setSaveStorage
} from '$lib/game/save/storage';

describe('save storage', () => {
	function createStorage() {
		const store = new Map<string, string>();

		return {
			getItem(key: string) {
				return store.get(key) ?? null;
			},
			removeItem(key: string) {
				store.delete(key);
			},
			setItem(key: string, value: string) {
				store.set(key, value);
			}
		};
	}

	it('writes the serialized save to the provided storage adapter', () => {
		const storage = createStorage();
		const save = createNewSaveState();

		saveGameState(save, storage);

		expect(storage.getItem(SAVE_STORAGE_KEY)).toContain('"mapId":"meadow-entry"');
		expect(storage.getItem(SAVE_STORAGE_KEY)).toContain('"version":9');
		expect(loadStoredSaveResult(storage)).toEqual({ status: 'loaded', saveState: save });
		expect(loadStoredSaveResult(storage).saveState?.wallet).toEqual({ coins: 30 });
		expect(loadStoredSaveResult(storage).saveState?.inventory.stacks).toEqual([
			{ itemId: 'field-potion', quantity: 1 }
		]);
	});

	it('reports invalid saved payloads separately from missing saves', () => {
		const storage = createStorage();
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		storage.setItem(SAVE_STORAGE_KEY, '{"version":4,"bad":true}');

		expect(loadStoredSaveResult(storage)).toEqual({ status: 'invalid', saveState: null });
		expect(warnSpy).toHaveBeenCalled();
	});

	it('does not read obsolete v4 save slots', () => {
		const storage = createStorage();
		storage.setItem('gliese.save.v4', JSON.stringify({ ...createNewSaveState(), version: 4 }));

		expect(loadStoredSaveResult(storage)).toEqual({ status: 'missing', saveState: null });
	});

	it('uses the storage adapter set via setSaveStorage when no explicit storage is passed', () => {
		const storage = createStorage();
		setSaveStorage(storage);
		try {
			const save = createNewSaveState();
			saveGameState(save);

			expect(storage.getItem(SAVE_STORAGE_KEY)).toContain('"version":9');
			expect(loadStoredSaveResult()).toEqual({ status: 'loaded', saveState: save });
		} finally {
			setSaveStorage(globalThis.localStorage);
		}
	});

	it('migrates a v8 save from the previous key and writes new saves at v9', () => {
		const storage = createStorage();
		const legacySave = {
			...createNewSaveState(),
			version: 8,
			shops: {
				stock: {
					'guild-quartermaster': {
						'iron-cap': 1,
						'grip-wraps': 1,
						'traveler-vest': 1
					}
				}
			}
		};
		storage.setItem('gliese.save.v8', JSON.stringify(legacySave));

		expect(SAVE_STORAGE_KEY).toBe('gliese.save.v9');
		expect(loadStoredSaveResult(storage)).toMatchObject({
			status: 'loaded',
			saveState: {
				version: 9,
				shops: {
					stock: {
						'sundrop-forge': {
							'training-sword': 1,
							'iron-cap': 1,
							'grip-wraps': 1,
							'traveler-vest': 1
						}
					}
				}
			}
		});

		const currentSave = createNewSaveState();
		saveGameState(currentSave, storage);
		expect(storage.getItem('gliese.save.v9')).toContain('"version":9');
	});
});
